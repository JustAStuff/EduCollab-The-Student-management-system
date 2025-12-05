-- Enhanced storage security policies with rate limiting and validation

-- Drop existing policies to recreate with enhanced security
DROP POLICY IF EXISTS "Authenticated users can upload task submissions" ON storage.objects;
DROP POLICY IF EXISTS "Users can view task submissions in their workspaces" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own task submissions" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete task submissions" ON storage.objects;

-- Create function to validate file upload permissions
CREATE OR REPLACE FUNCTION validate_file_upload_permissions(
  bucket_name TEXT,
  object_name TEXT,
  user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  workspace_id UUID;
  task_id UUID;
  file_user_id UUID;
  is_member BOOLEAN := FALSE;
  is_owner BOOLEAN := FALSE;
BEGIN
  -- Extract workspace_id, task_id, and user_id from object path
  -- Expected format: workspace_id/task_id/user_id_timestamp.ext
  BEGIN
    workspace_id := split_part(object_name, '/', 1)::UUID;
    task_id := split_part(object_name, '/', 2)::UUID;
    file_user_id := split_part(split_part(object_name, '/', 3), '_', 1)::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN FALSE; -- Invalid path format
  END;
  
  -- Check if user is the file owner
  IF file_user_id = user_id THEN
    -- Verify user is assigned to the task or is workspace member
    SELECT EXISTS(
      SELECT 1 FROM tasks t
      WHERE t.id = task_id 
      AND t.workspace_id = workspace_id
      AND (t.assigned_to = user_id OR EXISTS(
        SELECT 1 FROM workspace_members wm 
        WHERE wm.workspace_id = workspace_id AND wm.user_id = user_id
      ))
    ) INTO is_member;
    
    RETURN is_member;
  END IF;
  
  -- Check if user is workspace owner
  SELECT EXISTS(
    SELECT 1 FROM workspaces w
    WHERE w.id = workspace_id AND w.created_by = user_id
  ) INTO is_owner;
  
  RETURN is_owner;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check file size limits
CREATE OR REPLACE FUNCTION validate_file_size(
  object_name TEXT,
  file_size BIGINT
) RETURNS BOOLEAN AS $$
DECLARE
  max_size BIGINT := 10 * 1024 * 1024; -- 10MB default
  file_ext TEXT;
BEGIN
  -- Extract file extension
  file_ext := lower(split_part(object_name, '.', array_length(string_to_array(object_name, '.'), 1)));
  
  -- Set size limits based on file type
  CASE file_ext
    WHEN 'jpg', 'jpeg', 'png', 'webp' THEN
      max_size := 5 * 1024 * 1024; -- 5MB for images
    WHEN 'gif' THEN
      max_size := 2 * 1024 * 1024; -- 2MB for GIFs
    WHEN 'pdf', 'doc', 'docx' THEN
      max_size := 10 * 1024 * 1024; -- 10MB for documents
    WHEN 'txt' THEN
      max_size := 1 * 1024 * 1024; -- 1MB for text files
    ELSE
      RETURN FALSE; -- Unknown file type
  END CASE;
  
  RETURN file_size <= max_size;
END;
$$ LANGUAGE plpgsql;

-- Enhanced upload policy with validation
CREATE POLICY "Enhanced file upload validation" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'task-submissions' AND
    auth.uid() IS NOT NULL AND
    validate_file_upload_permissions(bucket_id, name, auth.uid()) AND
    validate_file_size(name, COALESCE((metadata->>'size')::BIGINT, 0))
  );

-- Enhanced view policy with workspace validation
CREATE POLICY "Enhanced file view permissions" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'task-submissions' AND
    auth.uid() IS NOT NULL AND (
      -- File owner can view
      auth.uid()::text = split_part(split_part(name, '/', 3), '_', 1) OR
      -- Workspace members can view files in their workspaces
      EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id::text = split_part(name, '/', 1)
        AND wm.user_id = auth.uid()
      ) OR
      -- Workspace owners can view all files in their workspaces
      EXISTS (
        SELECT 1 FROM workspaces w
        WHERE w.id::text = split_part(name, '/', 1)
        AND w.created_by = auth.uid()
      )
    )
  );

-- Enhanced update policy - only file owners can update
CREATE POLICY "Enhanced file update permissions" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'task-submissions' AND
    auth.uid() IS NOT NULL AND
    auth.uid()::text = split_part(split_part(name, '/', 3), '_', 1) AND
    validate_file_upload_permissions(bucket_id, name, auth.uid())
  );

-- Enhanced delete policy with audit logging
CREATE POLICY "Enhanced file delete permissions" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'task-submissions' AND
    auth.uid() IS NOT NULL AND (
      -- File owner can delete
      auth.uid()::text = split_part(split_part(name, '/', 3), '_', 1) OR
      -- Workspace owner can delete
      EXISTS (
        SELECT 1 FROM workspaces w
        WHERE w.id::text = split_part(name, '/', 1)
        AND w.created_by = auth.uid()
      )
    )
  );

-- Create function to log file operations
CREATE OR REPLACE FUNCTION log_file_operation() RETURNS TRIGGER AS $$
BEGIN
  -- Log file operations to audit table
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (operation, details, user_id)
    VALUES (
      'file_upload',
      jsonb_build_object(
        'bucket', NEW.bucket_id,
        'file_name', NEW.name,
        'file_size', COALESCE((NEW.metadata->>'size')::BIGINT, 0),
        'workspace_id', split_part(NEW.name, '/', 1),
        'task_id', split_part(NEW.name, '/', 2)
      ),
      auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (operation, details, user_id)
    VALUES (
      'file_delete',
      jsonb_build_object(
        'bucket', OLD.bucket_id,
        'file_name', OLD.name,
        'workspace_id', split_part(OLD.name, '/', 1),
        'task_id', split_part(OLD.name, '/', 2)
      ),
      auth.uid()
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for file operation logging
DROP TRIGGER IF EXISTS log_file_operations ON storage.objects;
CREATE TRIGGER log_file_operations
  AFTER INSERT OR DELETE ON storage.objects
  FOR EACH ROW EXECUTE FUNCTION log_file_operation();

-- Create rate limiting table
CREATE TABLE IF NOT EXISTS upload_rate_limits (
  user_id UUID REFERENCES auth.users(id),
  upload_count INTEGER DEFAULT 0,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id)
);

-- RLS for rate limiting table
ALTER TABLE upload_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rate limits" ON upload_rate_limits
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can manage rate limits" ON upload_rate_limits
  FOR ALL USING (true);

-- Function to check and update rate limits
CREATE OR REPLACE FUNCTION check_upload_rate_limit(
  user_uuid UUID,
  max_uploads INTEGER DEFAULT 10
) RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  window_start TIMESTAMP WITH TIME ZONE;
  one_hour_ago TIMESTAMP WITH TIME ZONE := NOW() - INTERVAL '1 hour';
BEGIN
  -- Get current rate limit data
  SELECT upload_count, upload_rate_limits.window_start
  INTO current_count, window_start
  FROM upload_rate_limits
  WHERE user_id = user_uuid;
  
  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO upload_rate_limits (user_id, upload_count, window_start)
    VALUES (user_uuid, 1, NOW());
    RETURN TRUE;
  END IF;
  
  -- If window has expired, reset counter
  IF window_start < one_hour_ago THEN
    UPDATE upload_rate_limits
    SET upload_count = 1, window_start = NOW()
    WHERE user_id = user_uuid;
    RETURN TRUE;
  END IF;
  
  -- Check if under limit
  IF current_count < max_uploads THEN
    UPDATE upload_rate_limits
    SET upload_count = upload_count + 1
    WHERE user_id = user_uuid;
    RETURN TRUE;
  END IF;
  
  -- Rate limit exceeded
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add rate limiting to upload policy
DROP POLICY IF EXISTS "Enhanced file upload validation" ON storage.objects;
CREATE POLICY "Enhanced file upload with rate limiting" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'task-submissions' AND
    auth.uid() IS NOT NULL AND
    check_upload_rate_limit(auth.uid(), 10) AND
    validate_file_upload_permissions(bucket_id, name, auth.uid()) AND
    validate_file_size(name, COALESCE((metadata->>'size')::BIGINT, 0))
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_upload_rate_limits_user_window 
ON upload_rate_limits(user_id, window_start);

-- Add comments
COMMENT ON FUNCTION validate_file_upload_permissions IS 'Validates user permissions for file uploads based on workspace membership and task assignment';
COMMENT ON FUNCTION validate_file_size IS 'Validates file size based on file type restrictions';
COMMENT ON FUNCTION check_upload_rate_limit IS 'Implements rate limiting for file uploads (10 uploads per hour per user)';
COMMENT ON TABLE upload_rate_limits IS 'Tracks upload rate limits per user to prevent abuse';
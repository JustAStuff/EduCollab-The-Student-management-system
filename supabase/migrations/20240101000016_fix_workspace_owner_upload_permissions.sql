-- Fix workspace owner upload permissions for file uploads
-- This migration addresses the issue where workspace owners cannot upload files to tasks

-- Drop existing upload validation function to recreate with proper workspace owner support
DROP FUNCTION IF EXISTS validate_file_upload_permissions(TEXT, TEXT, UUID);

-- Create enhanced function to validate file upload permissions with workspace owner support
CREATE OR REPLACE FUNCTION validate_file_upload_permissions(
  bucket_name TEXT,
  object_name TEXT,
  user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  workspace_id UUID;
  task_id UUID;
  file_user_id UUID;
  is_task_assignee BOOLEAN := FALSE;
  is_workspace_member BOOLEAN := FALSE;
  is_workspace_owner BOOLEAN := FALSE;
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
  
  -- Check if user is workspace owner (highest priority)
  SELECT EXISTS(
    SELECT 1 FROM workspaces w
    WHERE w.id = workspace_id AND w.created_by = user_id
  ) INTO is_workspace_owner;
  
  -- Workspace owners can upload to any task in their workspace
  IF is_workspace_owner THEN
    -- Verify the task exists in the workspace
    SELECT EXISTS(
      SELECT 1 FROM tasks t
      WHERE t.id = task_id AND t.workspace_id = workspace_id
    ) INTO is_task_assignee; -- Reusing variable for existence check
    
    RETURN is_task_assignee;
  END IF;
  
  -- Check if user is assigned to the task
  SELECT EXISTS(
    SELECT 1 FROM tasks t
    WHERE t.id = task_id 
    AND t.workspace_id = workspace_id
    AND t.assigned_to = user_id
  ) INTO is_task_assignee;
  
  -- Task assignees can upload their own files
  IF is_task_assignee AND file_user_id = user_id THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is workspace member (for general access)
  SELECT EXISTS(
    SELECT 1 FROM workspace_members wm 
    WHERE wm.workspace_id = workspace_id AND wm.user_id = user_id
  ) INTO is_workspace_member;
  
  -- Workspace members can upload if they are the file owner and task assignee
  IF is_workspace_member AND is_task_assignee AND file_user_id = user_id THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the upload policy to use the enhanced validation
DROP POLICY IF EXISTS "Enhanced file upload with rate limiting" ON storage.objects;
CREATE POLICY "Workspace owner enhanced file upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'task-submissions' AND
    auth.uid() IS NOT NULL AND
    check_upload_rate_limit(auth.uid(), 10) AND
    validate_file_upload_permissions(bucket_id, name, auth.uid()) AND
    validate_file_size(name, COALESCE((metadata->>'size')::BIGINT, 0))
  );

-- Create a separate policy specifically for workspace owners to upload to any task
CREATE POLICY "Workspace owners can upload to any task" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'task-submissions' AND
    auth.uid() IS NOT NULL AND
    check_upload_rate_limit(auth.uid(), 20) AND -- Higher rate limit for owners
    EXISTS (
      SELECT 1 FROM workspaces w
      WHERE w.id::text = split_part(name, '/', 1)
      AND w.created_by = auth.uid()
    ) AND
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id::text = split_part(name, '/', 2)
      AND t.workspace_id::text = split_part(name, '/', 1)
    ) AND
    validate_file_size(name, COALESCE((metadata->>'size')::BIGINT, 0))
  );

-- Update the view policy to ensure workspace owners can view all files
DROP POLICY IF EXISTS "Enhanced file view permissions" ON storage.objects;
CREATE POLICY "Enhanced file view with workspace owner access" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'task-submissions' AND
    auth.uid() IS NOT NULL AND (
      -- Workspace owners can view all files in their workspaces (highest priority)
      EXISTS (
        SELECT 1 FROM workspaces w
        WHERE w.id::text = split_part(name, '/', 1)
        AND w.created_by = auth.uid()
      ) OR
      -- File owner can view their own files
      auth.uid()::text = split_part(split_part(name, '/', 3), '_', 1) OR
      -- Workspace members can view files in their workspaces
      EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id::text = split_part(name, '/', 1)
        AND wm.user_id = auth.uid()
      )
    )
  );

-- Update the delete policy to allow workspace owners to delete any file
DROP POLICY IF EXISTS "Enhanced file delete permissions" ON storage.objects;
CREATE POLICY "Enhanced file delete with workspace owner access" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'task-submissions' AND
    auth.uid() IS NOT NULL AND (
      -- Workspace owners can delete any file in their workspaces (highest priority)
      EXISTS (
        SELECT 1 FROM workspaces w
        WHERE w.id::text = split_part(name, '/', 1)
        AND w.created_by = auth.uid()
      ) OR
      -- File owner can delete their own files
      auth.uid()::text = split_part(split_part(name, '/', 3), '_', 1)
    )
  );

-- Create a helper function to check if user is workspace owner for a given task
CREATE OR REPLACE FUNCTION is_workspace_owner_for_task(
  task_uuid UUID,
  user_uuid UUID
) RETURNS BOOLEAN AS $$
DECLARE
  workspace_uuid UUID;
BEGIN
  -- Get workspace ID for the task
  SELECT workspace_id INTO workspace_uuid
  FROM tasks
  WHERE id = task_uuid;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user is workspace owner
  RETURN EXISTS (
    SELECT 1 FROM workspaces
    WHERE id = workspace_uuid AND created_by = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a helper function to check if user can upload to a specific task
CREATE OR REPLACE FUNCTION can_upload_to_task(
  task_uuid UUID,
  user_uuid UUID
) RETURNS BOOLEAN AS $$
DECLARE
  workspace_uuid UUID;
  is_owner BOOLEAN := FALSE;
  is_assignee BOOLEAN := FALSE;
BEGIN
  -- Get task details
  SELECT workspace_id, (assigned_to = user_uuid)
  INTO workspace_uuid, is_assignee
  FROM tasks
  WHERE id = task_uuid;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user is workspace owner
  SELECT EXISTS (
    SELECT 1 FROM workspaces
    WHERE id = workspace_uuid AND created_by = user_uuid
  ) INTO is_owner;
  
  -- Workspace owners or task assignees can upload
  RETURN is_owner OR is_assignee;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON FUNCTION validate_file_upload_permissions IS 'Enhanced validation for file uploads with workspace owner support - owners can upload to any task in their workspace';
COMMENT ON FUNCTION is_workspace_owner_for_task IS 'Helper function to check if a user is the workspace owner for a given task';
COMMENT ON FUNCTION can_upload_to_task IS 'Helper function to check if a user can upload files to a specific task (either as owner or assignee)';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_assigned 
ON tasks(workspace_id, assigned_to);

CREATE INDEX IF NOT EXISTS idx_workspaces_created_by 
ON workspaces(created_by);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION validate_file_upload_permissions TO authenticated;
GRANT EXECUTE ON FUNCTION is_workspace_owner_for_task TO authenticated;
GRANT EXECUTE ON FUNCTION can_upload_to_task TO authenticated;
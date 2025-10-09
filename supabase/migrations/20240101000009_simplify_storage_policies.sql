-- Simplify storage policies to avoid path parsing issues during upload

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can upload their task submissions" ON storage.objects;
DROP POLICY IF EXISTS "Users can view task submissions in their workspaces" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their task submissions" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their task submissions" ON storage.objects;

-- Create simpler, more reliable policies

-- Policy for uploading files - allow authenticated users to upload
-- Task assignment validation is handled in the application layer
CREATE POLICY "Authenticated users can upload task submissions" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'task-submissions' AND
    auth.uid() IS NOT NULL
  );

-- Policy for viewing files - users can view files in workspaces they belong to
CREATE POLICY "Users can view task submissions in their workspaces" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'task-submissions' AND
    auth.uid() IS NOT NULL AND (
      -- User can view their own submissions (check if userId is in the filename)
      auth.uid()::text = split_part(split_part(name, '/', 3), '_', 1) OR
      -- Workspace owners can view all submissions in their workspaces
      auth.uid() IN (
        SELECT created_by FROM workspaces 
        WHERE id::text = split_part(name, '/', 1)
      ) OR
      -- Workspace members can view submissions in workspaces they belong to
      auth.uid() IN (
        SELECT user_id FROM workspace_members 
        WHERE workspace_id::text = split_part(name, '/', 1)
      )
    )
  );

-- Policy for updating files - only file owners can update
CREATE POLICY "Users can update their own task submissions" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'task-submissions' AND
    auth.uid()::text = split_part(split_part(name, '/', 3), '_', 1)
  );

-- Policy for deleting files - file owners and workspace owners can delete
CREATE POLICY "Users can delete task submissions" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'task-submissions' AND (
      -- File owner can delete
      auth.uid()::text = split_part(split_part(name, '/', 3), '_', 1) OR
      -- Workspace owner can delete
      auth.uid() IN (
        SELECT created_by FROM workspaces 
        WHERE id::text = split_part(name, '/', 1)
      )
    )
  );
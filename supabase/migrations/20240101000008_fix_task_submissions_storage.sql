-- Fix storage policies for task submissions to allow proper file access

-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload their task submissions" ON storage.objects;
DROP POLICY IF EXISTS "Users can view task submissions in their workspaces" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their task submissions" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their task submissions" ON storage.objects;

-- Create improved storage policies with better file path structure
-- New file path structure: workspaceId/taskId/userId_timestamp.ext

-- Policy for uploading files - users can upload to task-submissions bucket
-- We'll handle task assignment validation in the application layer
CREATE POLICY "Users can upload their task submissions" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'task-submissions' AND
    -- Allow authenticated users to upload files
    auth.uid() IS NOT NULL
  );

-- Policy for viewing files - users can view their own files + workspace owners can view all files in their workspaces
CREATE POLICY "Users can view task submissions in their workspaces" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'task-submissions' AND (
      -- User can view their own submissions (userId is first part of filename before underscore)
      auth.uid()::text = split_part((storage.foldername(name))[3], '_', 1) OR
      -- Workspace owners can view all submissions in their workspaces
      auth.uid() IN (
        SELECT created_by FROM workspaces 
        WHERE id::text = (storage.foldername(name))[1]
      ) OR
      -- Task assignees can view files in tasks assigned to them
      auth.uid() IN (
        SELECT assigned_to FROM tasks 
        WHERE id::text = (storage.foldername(name))[2]
        AND workspace_id::text = (storage.foldername(name))[1]
      )
    )
  );

-- Policy for updating files - only file owners can update
CREATE POLICY "Users can update their task submissions" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'task-submissions' AND
    auth.uid()::text = split_part((storage.foldername(name))[3], '_', 1)
  );

-- Policy for deleting files - file owners and workspace owners can delete
CREATE POLICY "Users can delete their task submissions" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'task-submissions' AND (
      -- File owner can delete
      auth.uid()::text = split_part((storage.foldername(name))[3], '_', 1) OR
      -- Workspace owner can delete
      auth.uid() IN (
        SELECT created_by FROM workspaces 
        WHERE id::text = (storage.foldername(name))[1]
      )
    )
  );
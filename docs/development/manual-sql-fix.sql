-- MANUAL FIX: Run this SQL in your Supabase Dashboard > SQL Editor
-- This will fix the storage permission issue

-- Step 1: Drop existing problematic policies
DROP POLICY IF EXISTS "Users can upload their task submissions" ON storage.objects;
DROP POLICY IF EXISTS "Users can view task submissions in their workspaces" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their task submissions" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their task submissions" ON storage.objects;

-- Step 2: Create simple, working policies
CREATE POLICY "Authenticated users can upload task submissions" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'task-submissions' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can view task submissions in their workspaces" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'task-submissions' AND
    auth.uid() IS NOT NULL AND (
      -- User can view their own submissions
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

CREATE POLICY "Users can update their own task submissions" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'task-submissions' AND
    auth.uid()::text = split_part(split_part(name, '/', 3), '_', 1)
  );

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
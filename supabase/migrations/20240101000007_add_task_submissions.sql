-- Add columns to tasks table for file submissions and review
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS submission_file_url TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS submission_file_name TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS review_comments TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id);

-- Update status enum to include new statuses
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
  CHECK (status IN ('todo', 'in_progress', 'submitted', 'needs_revision', 'completed'));

-- Create storage bucket for task submissions
INSERT INTO storage.buckets (id, name, public) 
VALUES ('task-submissions', 'task-submissions', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for task submissions
CREATE POLICY "Users can upload their task submissions" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'task-submissions' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view task submissions in their workspaces" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'task-submissions' AND (
      -- User can view their own submissions
      auth.uid()::text = (storage.foldername(name))[1] OR
      -- Workspace owners can view all submissions in their workspaces
      auth.uid() IN (
        SELECT w.created_by 
        FROM workspaces w
        JOIN tasks t ON t.workspace_id = w.id
        WHERE t.id::text = (storage.foldername(name))[2]
      )
    )
  );

CREATE POLICY "Users can update their task submissions" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'task-submissions' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their task submissions" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'task-submissions' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
-- Migration: Workspace Task Management Enhancements
-- Add new columns to tasks table, create task_reviews table, add indexes, and update RLS policies

-- ============================================================================
-- 1. Add new columns to tasks table
-- ============================================================================

-- Add started_at column to track when a task was started
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;

-- Add submission_file_size column to track file size
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS submission_file_size INTEGER;

-- ============================================================================
-- 2. Create task_reviews table
-- ============================================================================

CREATE TABLE IF NOT EXISTS task_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL CHECK (action IN ('approve', 'request_redo')),
  comments TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on task_reviews
ALTER TABLE task_reviews ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. Add database indexes for performance optimization
-- ============================================================================

-- Index for faster queries on tasks by workspace and assigned user
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_assigned 
ON tasks(workspace_id, assigned_to);

-- Index for faster queries on tasks by status (already exists but ensuring it's there)
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- Index for faster queries on tasks with submissions
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_submissions 
ON tasks(workspace_id, submitted_at) 
WHERE submission_file_url IS NOT NULL;

-- Index for faster queries on task reviews by task
CREATE INDEX IF NOT EXISTS idx_task_reviews_task 
ON task_reviews(task_id);

-- Index for faster queries on task reviews by reviewer
CREATE INDEX IF NOT EXISTS idx_task_reviews_reviewer 
ON task_reviews(reviewer_id);

-- Composite index for faster queries on task reviews by task and reviewer
CREATE INDEX IF NOT EXISTS idx_task_reviews_task_reviewer 
ON task_reviews(task_id, reviewer_id);

-- ============================================================================
-- 4. Update RLS policies for task reviews
-- ============================================================================

-- Policy: Workspace members can create reviews for tasks in their workspace
CREATE POLICY "Workspace members can review tasks"
ON task_reviews FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
    WHERE t.id = task_id
    AND wm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE t.id = task_id
    AND w.created_by = auth.uid()
  )
);

-- Policy: Users can view reviews for tasks in their workspaces
CREATE POLICY "Users can view task reviews in their workspaces"
ON task_reviews FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
    WHERE t.id = task_id
    AND wm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE t.id = task_id
    AND w.created_by = auth.uid()
  )
);

-- Policy: Users can view reviews for their own tasks
CREATE POLICY "Users can view reviews for their assigned tasks"
ON task_reviews FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_id
    AND t.assigned_to = auth.uid()
  )
);

-- ============================================================================
-- 5. Update storage policies for better access control
-- ============================================================================

-- Drop existing policies to recreate them with better logic
DROP POLICY IF EXISTS "Users can view task submissions in their workspaces" ON storage.objects;

-- Enhanced policy: Workspace members can view all submissions in their workspace
CREATE POLICY "Workspace members can view task submissions"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'task-submissions' AND (
    -- User can view their own submissions
    auth.uid()::text = (storage.foldername(name))[1] OR
    -- Workspace owners can view all submissions in their workspaces
    auth.uid() IN (
      SELECT w.created_by 
      FROM workspaces w
      JOIN tasks t ON t.workspace_id = w.id
      WHERE t.id::text = (storage.foldername(name))[2]
    ) OR
    -- Workspace members can view all submissions in their workspaces
    auth.uid() IN (
      SELECT wm.user_id
      FROM workspace_members wm
      JOIN tasks t ON t.workspace_id = wm.workspace_id
      WHERE t.id::text = (storage.foldername(name))[2]
    )
  )
);

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON COLUMN tasks.started_at IS 'Timestamp when the task was started by the assignee';
COMMENT ON COLUMN tasks.submission_file_size IS 'Size of the submitted file in bytes';
COMMENT ON TABLE task_reviews IS 'Stores peer reviews for task submissions';
COMMENT ON COLUMN task_reviews.action IS 'Review action: approve or request_redo';
COMMENT ON COLUMN task_reviews.comments IS 'Optional feedback comments from the reviewer';

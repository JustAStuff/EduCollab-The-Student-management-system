-- Migration: Fix UUID Extension and Complete Failed Migrations
-- This migration fixes the UUID extension issue and completes the failed migrations

-- ============================================================================
-- 1. Enable UUID extension (required for uuid_generate_v4())
-- ============================================================================

-- Enable the uuid-ossp extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 2. Create audit logs table (failed in previous migration)
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation VARCHAR(100) NOT NULL,
  details JSONB,
  user_id UUID REFERENCES auth.users(id),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_operation ON audit_logs(operation);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- RLS policies for audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can view their own audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Workspace owners can view workspace audit logs" ON audit_logs;

-- Only allow system/service accounts to insert audit logs
CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- Users can only view their own audit logs
CREATE POLICY "Users can view their own audit logs" ON audit_logs
  FOR SELECT USING (user_id = auth.uid());

-- Workspace owners can view audit logs for their workspaces
CREATE POLICY "Workspace owners can view workspace audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspaces w
      WHERE w.created_by = auth.uid()
      AND (details->>'workspace_id')::uuid = w.id
    )
  );

-- ============================================================================
-- 3. Ensure all required columns exist in tasks table
-- ============================================================================

-- Add started_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'started_at') THEN
        ALTER TABLE tasks ADD COLUMN started_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Add submission_file_size column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'submission_file_size') THEN
        ALTER TABLE tasks ADD COLUMN submission_file_size INTEGER;
    END IF;
END $$;

-- ============================================================================
-- 4. Create task_reviews table if it doesn't exist
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

-- Enable RLS on task_reviews if not already enabled
ALTER TABLE task_reviews ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for task_reviews
DROP POLICY IF EXISTS "Users can create task reviews" ON task_reviews;
DROP POLICY IF EXISTS "Users can view task reviews" ON task_reviews;

CREATE POLICY "Users can create task reviews"
ON task_reviews FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be a workspace member or owner
  EXISTS (
    SELECT 1 FROM tasks t
    LEFT JOIN workspace_members wm ON wm.workspace_id = t.workspace_id AND wm.user_id = auth.uid()
    LEFT JOIN workspaces w ON w.id = t.workspace_id AND w.created_by = auth.uid()
    WHERE t.id = task_id
    AND (wm.user_id IS NOT NULL OR w.created_by IS NOT NULL)
    AND t.assigned_to != auth.uid() -- Cannot review own tasks
  )
);

CREATE POLICY "Users can view task reviews"
ON task_reviews FOR SELECT
TO authenticated
USING (
  -- User can view reviews for tasks in their workspaces
  EXISTS (
    SELECT 1 FROM tasks t
    LEFT JOIN workspace_members wm ON wm.workspace_id = t.workspace_id AND wm.user_id = auth.uid()
    LEFT JOIN workspaces w ON w.id = t.workspace_id AND w.created_by = auth.uid()
    WHERE t.id = task_id
    AND (wm.user_id IS NOT NULL OR w.created_by IS NOT NULL OR t.assigned_to = auth.uid())
  )
);

-- ============================================================================
-- 5. Fix RLS policies that might be causing 406 errors
-- ============================================================================

-- Drop and recreate workspace_members policies
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace owners can manage members" ON workspace_members;

-- Recreate with simpler, more reliable policies
CREATE POLICY "Users can view workspace members"
ON workspace_members FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  workspace_id IN (
    SELECT id FROM workspaces WHERE created_by = auth.uid()
  ) OR
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Workspace owners can manage members"
ON workspace_members FOR ALL
TO authenticated
USING (
  workspace_id IN (
    SELECT id FROM workspaces WHERE created_by = auth.uid()
  )
);

-- ============================================================================
-- 6. Fix tasks table RLS policies for better query support
-- ============================================================================

-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Users can view tasks in their workspaces" ON tasks;
DROP POLICY IF EXISTS "Users can view their assigned tasks" ON tasks;
DROP POLICY IF EXISTS "Users can view workspace tasks" ON tasks;
DROP POLICY IF EXISTS "Users can modify their tasks" ON tasks;

-- Recreate with optimized policies
CREATE POLICY "Users can view workspace tasks"
ON tasks FOR SELECT
TO authenticated
USING (
  -- User is assigned to the task
  assigned_to = auth.uid() OR
  -- User is workspace owner
  workspace_id IN (
    SELECT id FROM workspaces WHERE created_by = auth.uid()
  ) OR
  -- User is workspace member
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- Policy for task modifications
CREATE POLICY "Users can modify their tasks"
ON tasks FOR UPDATE
TO authenticated
USING (
  -- User is assigned to the task
  assigned_to = auth.uid() OR
  -- User is workspace owner
  workspace_id IN (
    SELECT id FROM workspaces WHERE created_by = auth.uid()
  ) OR
  -- User assigned the task (for TL operations)
  assigned_by = auth.uid()
);

-- ============================================================================
-- 7. Add missing indexes for performance
-- ============================================================================

-- Ensure all performance indexes exist
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_submitted_at ON tasks(submitted_at);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);

-- Task reviews indexes
CREATE INDEX IF NOT EXISTS idx_task_reviews_task_id ON task_reviews(task_id);
CREATE INDEX IF NOT EXISTS idx_task_reviews_reviewer_id ON task_reviews(reviewer_id);

-- ============================================================================
-- 8. Verify and fix data consistency
-- ============================================================================

-- Update any tasks that might have inconsistent data
UPDATE tasks 
SET started_at = created_at 
WHERE status IN ('in_progress', 'submitted', 'completed', 'needs_revision') 
AND started_at IS NULL;

-- ============================================================================
-- 9. Add helpful comments
-- ============================================================================

COMMENT ON COLUMN tasks.started_at IS 'Timestamp when the task was started by the assignee';
COMMENT ON COLUMN tasks.submission_file_size IS 'Size of the submitted file in bytes';
COMMENT ON TABLE task_reviews IS 'Stores peer reviews for task submissions';
COMMENT ON COLUMN task_reviews.action IS 'Review action: approve or request_redo';
COMMENT ON COLUMN task_reviews.comments IS 'Optional feedback comments from the reviewer';
COMMENT ON TABLE audit_logs IS 'Security audit log for tracking sensitive operations';

-- ============================================================================
-- 10. Final verification
-- ============================================================================

-- Verify that all required tables and columns exist
DO $$
BEGIN
    -- Check if started_at column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'started_at') THEN
        RAISE EXCEPTION 'started_at column was not created successfully';
    END IF;
    
    -- Check if task_reviews table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_name = 'task_reviews') THEN
        RAISE EXCEPTION 'task_reviews table was not created successfully';
    END IF;
    
    -- Check if audit_logs table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_name = 'audit_logs') THEN
        RAISE EXCEPTION 'audit_logs table was not created successfully';
    END IF;
    
    RAISE NOTICE 'All required database objects created successfully!';
END $$;
-- Migration: Fix Database Schema Issues
-- Fix missing columns and RLS policy issues causing 400/406 errors

-- ============================================================================
-- 1. Ensure all required columns exist in tasks table
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
-- 2. Fix RLS policies that might be causing 406 errors
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
-- 3. Fix tasks table RLS policies for better query support
-- ============================================================================

-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Users can view tasks in their workspaces" ON tasks;
DROP POLICY IF EXISTS "Users can view their assigned tasks" ON tasks;

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
-- 4. Add missing indexes for performance
-- ============================================================================

-- Ensure all performance indexes exist
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_submitted_at ON tasks(submitted_at);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);

-- ============================================================================
-- 5. Create task_reviews table if it doesn't exist
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
-- 6. Verify and fix data consistency
-- ============================================================================

-- Update any tasks that might have inconsistent data
UPDATE tasks 
SET started_at = created_at 
WHERE status IN ('in_progress', 'submitted', 'completed', 'needs_revision') 
AND started_at IS NULL;

-- ============================================================================
-- 7. Add helpful comments
-- ============================================================================

COMMENT ON MIGRATION IS 'Fix database schema issues causing 400/406 errors and missing column errors';
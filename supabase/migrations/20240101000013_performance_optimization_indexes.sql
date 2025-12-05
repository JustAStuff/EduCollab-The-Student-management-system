-- Performance optimization indexes for workspace task management
-- Migration: 20240101000013_performance_optimization_indexes.sql

-- Index for faster workspace submissions queries
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_submissions 
ON tasks(workspace_id, submitted_at DESC) 
WHERE submission_file_url IS NOT NULL;

-- Index for faster task status queries
CREATE INDEX IF NOT EXISTS idx_tasks_status_workspace 
ON tasks(status, workspace_id);

-- Index for faster assigned tasks queries
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status 
ON tasks(assigned_to, status, workspace_id);

-- Index for faster task reviews queries
CREATE INDEX IF NOT EXISTS idx_task_reviews_task_reviewer 
ON task_reviews(task_id, reviewer_id, reviewed_at DESC);

-- Index for faster workspace member queries
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_user 
ON workspace_members(workspace_id, user_id);

-- Index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_users_email 
ON users(email);

-- Composite index for task assignment queries
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_assigned_created 
ON tasks(workspace_id, assigned_to, created_at DESC);

-- Index for task file operations
CREATE INDEX IF NOT EXISTS idx_tasks_file_operations 
ON tasks(id, submission_file_url, status) 
WHERE submission_file_url IS NOT NULL;

-- Index for real-time updates
CREATE INDEX IF NOT EXISTS idx_tasks_updated_workspace 
ON tasks(updated_at DESC, workspace_id);

-- Partial index for active tasks only
CREATE INDEX IF NOT EXISTS idx_tasks_active_workspace 
ON tasks(workspace_id, assigned_to, status) 
WHERE status IN ('todo', 'in_progress', 'submitted', 'needs_revision');

-- Index for completed tasks analytics
CREATE INDEX IF NOT EXISTS idx_tasks_completed_workspace 
ON tasks(workspace_id, completed_at DESC) 
WHERE status = 'completed';

-- Add comments for documentation
COMMENT ON INDEX idx_tasks_workspace_submissions IS 'Optimizes submissions gallery queries';
COMMENT ON INDEX idx_tasks_status_workspace IS 'Optimizes task filtering by status';
COMMENT ON INDEX idx_tasks_assigned_status IS 'Optimizes user task queries';
COMMENT ON INDEX idx_task_reviews_task_reviewer IS 'Optimizes review history queries';
COMMENT ON INDEX idx_workspace_members_workspace_user IS 'Optimizes member lookup queries';
COMMENT ON INDEX idx_users_email IS 'Optimizes user authentication queries';
COMMENT ON INDEX idx_tasks_workspace_assigned_created IS 'Optimizes task listing queries';
COMMENT ON INDEX idx_tasks_file_operations IS 'Optimizes file-related task operations';
COMMENT ON INDEX idx_tasks_updated_workspace IS 'Optimizes real-time update queries';
COMMENT ON INDEX idx_tasks_active_workspace IS 'Optimizes active task queries';
COMMENT ON INDEX idx_tasks_completed_workspace IS 'Optimizes completed task analytics';

-- Analyze tables to update statistics
ANALYZE tasks;
ANALYZE task_reviews;
ANALYZE workspace_members;
ANALYZE users;
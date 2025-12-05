-- Test file for workspace task management enhancements migration
-- This file contains SQL queries to verify the migration was successful

-- ============================================================================
-- Test 1: Verify new columns exist in tasks table
-- ============================================================================

-- Check if started_at column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tasks' AND column_name = 'started_at';
-- Expected: 1 row with column_name='started_at', data_type='timestamp with time zone'

-- Check if submission_file_size column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tasks' AND column_name = 'submission_file_size';
-- Expected: 1 row with column_name='submission_file_size', data_type='integer'

-- ============================================================================
-- Test 2: Verify task_reviews table exists with correct schema
-- ============================================================================

-- Check if task_reviews table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'task_reviews';
-- Expected: 1 row with table_name='task_reviews'

-- Check task_reviews columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'task_reviews'
ORDER BY ordinal_position;
-- Expected: id, task_id, reviewer_id, action, comments, reviewed_at, created_at

-- Check task_reviews constraints
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'task_reviews';
-- Expected: PRIMARY KEY, FOREIGN KEYs, CHECK constraint

-- ============================================================================
-- Test 3: Verify indexes exist
-- ============================================================================

-- Check if indexes exist on tasks table
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'tasks' 
AND indexname IN (
  'idx_tasks_workspace_assigned',
  'idx_tasks_status',
  'idx_tasks_workspace_submissions'
);
-- Expected: 3 rows

-- Check if indexes exist on task_reviews table
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'task_reviews' 
AND indexname IN (
  'idx_task_reviews_task',
  'idx_task_reviews_reviewer',
  'idx_task_reviews_task_reviewer'
);
-- Expected: 3 rows

-- ============================================================================
-- Test 4: Verify RLS is enabled
-- ============================================================================

-- Check if RLS is enabled on task_reviews
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'task_reviews';
-- Expected: 1 row with rowsecurity=true

-- ============================================================================
-- Test 5: Verify RLS policies exist
-- ============================================================================

-- Check task_reviews policies
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'task_reviews';
-- Expected: Multiple rows with policies for INSERT and SELECT

-- ============================================================================
-- Test 6: Verify storage policies exist
-- ============================================================================

-- Check storage policies for task-submissions bucket
SELECT policyname 
FROM storage.policies 
WHERE bucket_id = 'task-submissions';
-- Expected: Multiple rows including "Workspace members can view task submissions"

-- ============================================================================
-- Test 7: Test data insertion (rollback after test)
-- ============================================================================

BEGIN;

-- Create test workspace (assuming workspaces table exists)
-- INSERT INTO workspaces (id, name, created_by) 
-- VALUES ('00000000-0000-0000-0000-000000000001', 'Test Workspace', auth.uid());

-- Create test task with new columns
-- INSERT INTO tasks (id, workspace_id, title, started_at, submission_file_size)
-- VALUES (
--   '00000000-0000-0000-0000-000000000002',
--   '00000000-0000-0000-0000-000000000001',
--   'Test Task',
--   NOW(),
--   1024
-- );

-- Create test review
-- INSERT INTO task_reviews (task_id, reviewer_id, action, comments)
-- VALUES (
--   '00000000-0000-0000-0000-000000000002',
--   auth.uid(),
--   'approve',
--   'Looks good!'
-- );

ROLLBACK;

-- ============================================================================
-- Summary
-- ============================================================================

-- If all queries above return expected results, the migration is successful
SELECT 'Migration test completed' AS status;

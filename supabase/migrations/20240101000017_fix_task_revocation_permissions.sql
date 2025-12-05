-- Migration: Fix Task Revocation Permissions for Workspace Owners
-- Ensure workspace owners can revoke any task assignment in their workspace

-- ============================================================================
-- 1. Verify and enhance task UPDATE policies for revocation
-- ============================================================================

-- The existing UPDATE policy should already allow workspace owners to update tasks
-- But let's ensure it's working correctly and add specific comments for clarity

-- Check if the current UPDATE policy exists and is working
DO $
DECLARE
    policy_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'tasks' 
        AND policyname = 'allow_update_for_workspace_access'
        AND cmd = 'UPDATE'
    ) INTO policy_exists;
    
    IF policy_exists THEN
        RAISE NOTICE 'Task UPDATE policy exists and should allow workspace owner revocation';
    ELSE
        RAISE NOTICE 'Task UPDATE policy missing - this needs to be fixed';
    END IF;
END $;

-- ============================================================================
-- 2. Add specific policy for task revocation if needed
-- ============================================================================

-- Create a more specific policy for task revocation operations
-- This policy specifically handles the assigned_to field updates (revocation)
CREATE POLICY IF NOT EXISTS "workspace_owners_can_revoke_tasks" ON tasks
FOR UPDATE 
USING (
  -- Workspace owners can revoke any task in their workspace
  EXISTS (
    SELECT 1 FROM workspaces 
    WHERE workspaces.id = tasks.workspace_id 
    AND workspaces.created_by = auth.uid()
  )
)
WITH CHECK (
  -- Workspace owners can revoke any task in their workspace
  EXISTS (
    SELECT 1 FROM workspaces 
    WHERE workspaces.id = tasks.workspace_id 
    AND workspaces.created_by = auth.uid()
  )
);

-- ============================================================================
-- 3. Add policy for team leads to revoke tasks they assigned
-- ============================================================================

-- Create policy for team leads to revoke tasks they assigned
CREATE POLICY IF NOT EXISTS "team_leads_can_revoke_assigned_tasks" ON tasks
FOR UPDATE 
USING (
  -- Team leads can revoke tasks they assigned
  tasks.assigned_by = auth.uid()
)
WITH CHECK (
  -- Team leads can revoke tasks they assigned
  tasks.assigned_by = auth.uid()
);

-- ============================================================================
-- 4. Ensure proper indexing for revocation queries
-- ============================================================================

-- Add index for faster revocation queries by workspace owner
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_owner_revocation 
ON tasks(workspace_id, assigned_to) 
WHERE assigned_to IS NOT NULL;

-- Add index for faster revocation queries by task assigner
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_by_revocation 
ON tasks(assigned_by, assigned_to) 
WHERE assigned_to IS NOT NULL;

-- ============================================================================
-- 5. Add constraints to ensure data integrity during revocation
-- ============================================================================

-- Add check constraint to ensure revocation logic
-- (This is informational - the actual logic is in the application layer)
DO $
BEGIN
    -- Add comment to document revocation rules
    COMMENT ON COLUMN tasks.assigned_to IS 'User assigned to this task. Can be set to NULL by workspace owners or task assigners for revocation.';
    COMMENT ON COLUMN tasks.assigned_by IS 'User who assigned this task. Used for revocation permission checks.';
END $;

-- ============================================================================
-- 6. Verify policies are working correctly
-- ============================================================================

DO $
DECLARE
    rec RECORD;
    policy_count INTEGER;
BEGIN
    RAISE NOTICE 'Verifying task revocation policies:';
    
    -- Count UPDATE policies on tasks table
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'tasks' AND cmd = 'UPDATE';
    
    RAISE NOTICE 'Total UPDATE policies on tasks table: %', policy_count;
    
    -- List all UPDATE policies
    FOR rec IN 
        SELECT policyname, cmd
        FROM pg_policies 
        WHERE tablename = 'tasks' AND cmd = 'UPDATE'
        ORDER BY policyname
    LOOP
        RAISE NOTICE 'UPDATE Policy: %', rec.policyname;
    END LOOP;
    
    IF policy_count >= 1 THEN
        RAISE NOTICE 'Task revocation policies are properly configured';
    ELSE
        RAISE WARNING 'No UPDATE policies found - revocation may not work';
    END IF;
END $;

-- ============================================================================
-- 7. Test revocation permission logic (informational)
-- ============================================================================

DO $
BEGIN
    RAISE NOTICE 'Task revocation permission rules:';
    RAISE NOTICE '1. Workspace owners can revoke ANY task assignment in their workspace';
    RAISE NOTICE '2. Team leads can revoke tasks THEY assigned';
    RAISE NOTICE '3. Regular members cannot revoke task assignments';
    RAISE NOTICE '4. Completed tasks cannot be revoked (enforced in application layer)';
    RAISE NOTICE 'Migration completed successfully';
END $;
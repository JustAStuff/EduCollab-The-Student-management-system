-- Debug and fix tasks RLS policies
-- First, let's see what policies currently exist and then fix them properly

-- Check current policies (this will show in the logs)
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE 'Current policies on tasks table:';
    FOR rec IN 
        SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
        FROM pg_policies 
        WHERE tablename = 'tasks'
    LOOP
        RAISE NOTICE 'Policy: % | Command: % | Permissive: %', rec.policyname, rec.cmd, rec.permissive;
    END LOOP;
END $$;

-- Drop ALL existing policies on tasks table to start fresh
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'tasks'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON tasks', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- Ensure RLS is enabled on tasks table
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create the INSERT policy for both owners and members
CREATE POLICY "allow_insert_for_workspace_access" ON tasks
FOR INSERT WITH CHECK (
  -- User is workspace owner
  EXISTS (
    SELECT 1 FROM workspaces 
    WHERE workspaces.id = tasks.workspace_id 
    AND workspaces.created_by = auth.uid()
  )
  OR
  -- User is workspace member
  EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.workspace_id = tasks.workspace_id 
    AND workspace_members.user_id = auth.uid()
  )
);

-- Create the SELECT policy for both owners and members
CREATE POLICY "allow_select_for_workspace_access" ON tasks
FOR SELECT USING (
  -- User is workspace owner
  EXISTS (
    SELECT 1 FROM workspaces 
    WHERE workspaces.id = tasks.workspace_id 
    AND workspaces.created_by = auth.uid()
  )
  OR
  -- User is workspace member
  EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.workspace_id = tasks.workspace_id 
    AND workspace_members.user_id = auth.uid()
  )
);

-- Create the UPDATE policy for both owners and members
CREATE POLICY "allow_update_for_workspace_access" ON tasks
FOR UPDATE USING (
  -- User is workspace owner
  EXISTS (
    SELECT 1 FROM workspaces 
    WHERE workspaces.id = tasks.workspace_id 
    AND workspaces.created_by = auth.uid()
  )
  OR
  -- User is workspace member
  EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.workspace_id = tasks.workspace_id 
    AND workspace_members.user_id = auth.uid()
  )
);

-- Create the DELETE policy for both owners and members
CREATE POLICY "allow_delete_for_workspace_access" ON tasks
FOR DELETE USING (
  -- User is workspace owner
  EXISTS (
    SELECT 1 FROM workspaces 
    WHERE workspaces.id = tasks.workspace_id 
    AND workspaces.created_by = auth.uid()
  )
  OR
  -- User is workspace member
  EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.workspace_id = tasks.workspace_id 
    AND workspace_members.user_id = auth.uid()
  )
);

-- Verify the new policies were created
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE 'New policies created on tasks table:';
    FOR rec IN 
        SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
        FROM pg_policies 
        WHERE tablename = 'tasks'
    LOOP
        RAISE NOTICE 'Policy: % | Command: % | Permissive: %', rec.policyname, rec.cmd, rec.permissive;
    END LOOP;
END $$;

-- Test the policy with a sample query (this will show if the policy logic works)
DO $$
BEGIN
    RAISE NOTICE 'Testing policy logic...';
    -- This is just for debugging, actual test will be done from the app
END $$;
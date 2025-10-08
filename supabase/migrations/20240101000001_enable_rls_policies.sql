-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can view their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Workspace creators can update" ON workspaces;
DROP POLICY IF EXISTS "Workspace creators can delete" ON workspaces;
DROP POLICY IF EXISTS "Workspace creators can invite" ON workspace_invitations;
DROP POLICY IF EXISTS "Users can view relevant invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Users can update their invitation status" ON workspace_invitations;
DROP POLICY IF EXISTS "Workspace creators can delete invitations" ON workspace_invitations;

-- Enable RLS on all tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;

-- Workspaces table policies (simplified to avoid recursion)
-- Allow users to create workspaces
CREATE POLICY "Users can create workspaces" ON workspaces
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Allow users to view workspaces they created (simplified - no member check to avoid recursion)
CREATE POLICY "Users can view their workspaces" ON workspaces
  FOR SELECT USING (auth.uid() = created_by);

-- Allow workspace creators to update their workspaces
CREATE POLICY "Workspace creators can update" ON workspaces
  FOR UPDATE USING (auth.uid() = created_by);

-- Allow workspace creators to delete their workspaces
CREATE POLICY "Workspace creators can delete" ON workspaces
  FOR DELETE USING (auth.uid() = created_by);

-- Workspace invitations table policies
-- Allow anyone to create invitations (we'll handle authorization in the function)
CREATE POLICY "Allow invitation creation" ON workspace_invitations
  FOR INSERT WITH CHECK (true);

-- Allow users to view invitations sent to their email
CREATE POLICY "Users can view their invitations" ON workspace_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND email = workspace_invitations.email
    )
  );

-- Allow workspace creators to view invitations for their workspaces
CREATE POLICY "Workspace creators can view invitations" ON workspace_invitations
  FOR SELECT USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE created_by = auth.uid()
    )
  );

-- Allow invited users to update their invitation status
CREATE POLICY "Users can update their invitation status" ON workspace_invitations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND email = workspace_invitations.email
    )
  );

-- Allow workspace creators to delete invitations
CREATE POLICY "Workspace creators can delete invitations" ON workspace_invitations
  FOR DELETE USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE created_by = auth.uid()
    )
  );
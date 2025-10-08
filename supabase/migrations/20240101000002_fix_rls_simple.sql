-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can view their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Workspace creators can update" ON workspaces;
DROP POLICY IF EXISTS "Workspace creators can delete" ON workspaces;
DROP POLICY IF EXISTS "Allow invitation creation" ON workspace_invitations;
DROP POLICY IF EXISTS "Users can view their invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Workspace creators can view invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Users can update their invitation status" ON workspace_invitations;
DROP POLICY IF EXISTS "Workspace creators can delete invitations" ON workspace_invitations;

-- Enable RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;

-- Simple workspaces policies (no recursion)
CREATE POLICY "Users can create workspaces" ON workspaces
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view workspaces they created" ON workspaces
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Anyone can view workspaces for joining" ON workspaces
  FOR SELECT USING (true);

CREATE POLICY "Workspace creators can update" ON workspaces
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Workspace creators can delete" ON workspaces
  FOR DELETE USING (auth.uid() = created_by);

-- Simple workspace_invitations policies (no recursion)
CREATE POLICY "Allow invitation creation" ON workspace_invitations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view all invitations" ON workspace_invitations
  FOR SELECT USING (true);

CREATE POLICY "Users can update invitation status" ON workspace_invitations
  FOR UPDATE USING (true);

CREATE POLICY "Allow invitation deletion" ON workspace_invitations
  FOR DELETE USING (true);
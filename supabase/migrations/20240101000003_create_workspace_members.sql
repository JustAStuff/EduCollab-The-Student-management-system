-- Create workspace_members table if it doesn't exist
CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- Enable RLS on workspace_members
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for workspace_members
CREATE POLICY "Users can join workspaces" ON workspace_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view workspace members" ON workspace_members
  FOR SELECT USING (true);

CREATE POLICY "Users can leave workspaces" ON workspace_members
  FOR DELETE USING (auth.uid() = user_id);
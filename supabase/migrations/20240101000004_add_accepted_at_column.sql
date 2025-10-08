-- Add accepted_at column to workspace_invitations table
ALTER TABLE workspace_invitations 
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE;
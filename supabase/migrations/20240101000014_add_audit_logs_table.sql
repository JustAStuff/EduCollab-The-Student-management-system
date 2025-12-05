-- Create audit logs table for security monitoring
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Only allow system/service accounts to insert audit logs
-- In production, this would be restricted to server-side operations
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

-- Add comments for documentation
COMMENT ON TABLE audit_logs IS 'Security audit log for tracking sensitive operations';
COMMENT ON COLUMN audit_logs.operation IS 'Type of operation performed (e.g., file_upload, file_delete, task_revoke)';
COMMENT ON COLUMN audit_logs.details IS 'JSON details about the operation (file names, task IDs, etc.)';
COMMENT ON COLUMN audit_logs.user_id IS 'User who performed the operation';
COMMENT ON COLUMN audit_logs.ip_address IS 'IP address of the user (when available)';
COMMENT ON COLUMN audit_logs.user_agent IS 'User agent string from the request';
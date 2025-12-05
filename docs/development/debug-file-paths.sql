-- Debug query to check file paths in database
-- Run this in your Supabase SQL Editor to see what file paths are stored

SELECT 
    t.id as task_id,
    t.title,
    t.status,
    t.submission_file_url,
    t.submission_file_name,
    t.workspace_id,
    t.assigned_to,
    w.name as workspace_name,
    u.email as assigned_user_email
FROM tasks t
LEFT JOIN workspaces w ON t.workspace_id = w.id
LEFT JOIN users u ON t.assigned_to = u.id
WHERE t.submission_file_url IS NOT NULL
ORDER BY t.created_at DESC
LIMIT 10;
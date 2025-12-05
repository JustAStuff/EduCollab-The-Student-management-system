# Debug Storage Files

## Step 1: Check Database File Paths
Run this query in your Supabase SQL Editor:

```sql
SELECT 
    t.id,
    t.title,
    t.submission_file_url,
    t.submission_file_name,
    t.workspace_id,
    t.assigned_to
FROM tasks t 
WHERE t.submission_file_url IS NOT NULL 
ORDER BY t.created_at DESC 
LIMIT 5;
```

## Step 2: Check Storage Bucket
1. Go to Supabase Dashboard > Storage > task-submissions
2. Look at the folder structure
3. Compare with the file paths from Step 1

## Expected vs Actual Structure
**Expected:** `workspaceId/taskId/userId_timestamp.ext`
**Example:** `123e4567-e89b-12d3-a456-426614174000/456f7890-e89b-12d3-a456-426614174001/789g0123-e89b-12d3-a456-426614174002_1640995200000.png`

## Step 3: Manual Test
Try downloading a file manually from the Storage UI to see if files exist.
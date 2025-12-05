# File Upload/Download Testing Guide

## Prerequisites
1. Run the new migration: `supabase db reset` or apply the migration manually
2. Have a workspace with at least one team leader and one team member
3. Have at least one task assigned to a team member

## Test Cases

### Test 1: File Upload (Team Member)
1. Login as a team member
2. Navigate to workspace member view
3. Find a task in "todo" or "needs_revision" status
4. Click "Start Task" to move to "in_progress"
5. Click "Upload Result" 
6. Select a file (JPG, PNG, PDF, DOC, or DOCX under 10MB)
7. Verify upload succeeds and task status changes to "submitted"

**Expected Results:**
- File uploads successfully
- Task status changes to "submitted"
- File appears in submitted tasks section
- No error messages

### Test 2: File Download (Team Leader)
1. Login as the workspace owner/team leader
2. Navigate to workspace team leader view
3. Find a member with submitted tasks
4. Expand the member details
5. Find a task with "submitted" status
6. Click "View" button next to the submitted task

**Expected Results:**
- File downloads successfully
- No "unable to view document" error
- File opens/saves correctly
- Loading state shows during download

### Test 3: Error Handling
1. Test file size validation (upload file > 10MB)
2. Test file type validation (upload unsupported file type)
3. Test permission isolation (try to access files from different workspace)

**Expected Results:**
- Appropriate error messages for each scenario
- No system crashes or undefined errors

## File Path Structure Verification
New files should be stored with path: `workspaceId/taskId/userId_timestamp.ext`

Example: `123e4567-e89b-12d3-a456-426614174000/456f7890-e89b-12d3-a456-426614174001/789g0123-e89b-12d3-a456-426614174002_1640995200000.pdf`

## Database Verification
Check that `submission_file_url` in tasks table contains the correct path format.

## Storage Policy Verification
1. Team members should only be able to upload to their assigned tasks
2. Team leaders should be able to view all files in their workspaces
3. Users should not be able to access files from other workspaces
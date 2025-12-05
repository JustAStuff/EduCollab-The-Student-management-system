# Fix Workspace Task Management Critical Bugs - Design

## Overview
This design document outlines the technical approach to fix critical bugs in the workspace task management system that are preventing core functionality from working.

## Root Cause Analysis

### 1. File Upload Issues
**Root Causes:**
- CSRF token validation failing
- Permission checks incorrectly configured
- File upload service not handling owner permissions
- Missing or incorrect authentication headers

**Technical Issues:**
- `validateCSRFToken` function may be too strict
- Permission validation logic doesn't account for workspace owners
- File upload endpoints may have incorrect RLS policies

### 2. File View/Download Issues
**Root Causes:**
- Missing file preview implementation
- View and download actions using same handler
- Browser file handling not properly configured
- File type detection issues

### 3. Task Revocation Permission Issues
**Root Causes:**
- Permission validation logic doesn't recognize workspace owners
- RLS policies may be too restrictive
- Role hierarchy not properly implemented
- Task assignment validation incorrect

### 4. Owner Task Workflow Issues
**Root Causes:**
- Task status validation doesn't handle owner scenarios
- Permission checks fail for self-assigned tasks
- UI state management issues for owner tasks
- Database policies don't account for owner permissions

### 5. Member Re-submission Issues
**Root Causes:**
- UI conditionals showing wrong buttons for different roles
- Re-submission logic has permission validation errors
- State management not properly handling submission modifications

### 6. Workspace Creation CORS Issues
**Root Causes:**
- Server CORS configuration hardcoded to wrong port
- Development environment not properly configured
- Preflight request handling issues

## Technical Solutions

### Solution 1: Fix File Upload System

#### 1.1 Update Permission Validation
```javascript
// Enhanced permission check for file uploads
const validateUploadPermissions = (task, userId, userRole) => {
  // Workspace owners can upload to any task
  if (userRole === 'owner') {
    return { isValid: true };
  }
  
  // Members can only upload to their assigned tasks
  if (task.assigned_to === userId) {
    return { isValid: true };
  }
  
  return { 
    isValid: false, 
    error: 'You can only upload to tasks assigned to you' 
  };
};
```

#### 1.2 Fix CSRF Token Handling
```javascript
// More flexible CSRF validation
const validateCSRFToken = (providedToken, storedToken) => {
  if (!providedToken || !storedToken) {
    // Generate new token if missing
    return generateCSRFToken();
  }
  
  return providedToken === storedToken;
};
```

#### 1.3 Update Database Policies
```sql
-- Allow workspace owners to upload files
CREATE POLICY "workspace_owners_can_upload" ON storage.objects
FOR INSERT TO authenticated
USING (
  bucket_id = 'task-submissions' AND
  (
    -- User is assigned to the task
    auth.uid()::text = (
      SELECT assigned_to FROM tasks 
      WHERE id = (storage.foldername(name))[3]
    ) OR
    -- User is workspace owner
    auth.uid() IN (
      SELECT user_id FROM workspace_members 
      WHERE workspace_id = (storage.foldername(name))[1]::uuid 
      AND role = 'owner'
    )
  )
);
```

### Solution 2: Implement File Preview System

#### 2.1 File Type Detection and Handling
```javascript
const getFileAction = (fileType, fileName) => {
  const viewableTypes = [
    'application/pdf',
    'text/plain',
    'text/markdown',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/svg+xml'
  ];
  
  if (viewableTypes.includes(fileType)) {
    return 'preview';
  }
  
  return 'download';
};
```

#### 2.2 Separate View and Download Actions
```javascript
const handleViewFile = async (submission) => {
  const fileAction = getFileAction(submission.fileType, submission.fileName);
  
  if (fileAction === 'preview') {
    // Open in modal or new tab for preview
    openFilePreview(submission.fileUrl);
  } else {
    // Fallback to download
    handleDownloadFile(submission);
  }
};

const handleDownloadFile = async (submission) => {
  // Always trigger download
  const link = document.createElement('a');
  link.href = submission.fileUrl;
  link.download = submission.fileName;
  link.click();
};
```

### Solution 3: Fix Task Revocation Permissions

#### 3.1 Update Permission Logic
```javascript
const canRevokeTask = (task, userId, userRole, workspaceRole) => {
  // Workspace owners can revoke any task
  if (workspaceRole === 'owner') {
    return { canRevoke: true };
  }
  
  // Team leads can revoke tasks they assigned
  if (userRole === 'tl' && task.assigned_by === userId) {
    return { canRevoke: true };
  }
  
  return { 
    canRevoke: false, 
    reason: 'Only workspace owners or the assigning team lead can revoke tasks' 
  };
};
```

#### 3.2 Update Database Policies
```sql
-- Allow workspace owners to revoke any task
CREATE POLICY "workspace_owners_can_revoke" ON tasks
FOR UPDATE TO authenticated
USING (
  -- User is workspace owner
  auth.uid() IN (
    SELECT user_id FROM workspace_members 
    WHERE workspace_id = tasks.workspace_id 
    AND role = 'owner'
  ) OR
  -- User assigned the task (existing logic)
  assigned_by = auth.uid()
);
```

### Solution 4: Fix Owner Task Workflow

#### 4.1 Update Task Status Validation
```javascript
const validateTaskStatusTransition = (task, action, userId, userRole) => {
  // Special handling for workspace owners
  if (userRole === 'owner') {
    // Owners can perform any action on their tasks
    if (task.assigned_to === userId) {
      return { isValid: true };
    }
  }
  
  // Existing validation logic for other users
  return standardTaskValidation(task, action, userId);
};
```

#### 4.2 Fix UI Conditionals
```jsx
const TaskCard = ({ task, userRole, workspaceRole }) => {
  const canManageTask = workspaceRole === 'owner' || 
                       (task.assigned_to === currentUserId);
  
  const showStartButton = canManageTask && task.status === 'todo';
  const showUploadButton = canManageTask && 
                          ['in_progress', 'needs_revision'].includes(task.status);
  
  return (
    // Render based on proper permissions
  );
};
```

### Solution 5: Fix Member Re-submission

#### 5.1 Correct UI Conditionals
```jsx
const SubmissionActions = ({ task, userRole, workspaceRole, currentUserId }) => {
  const isTaskOwner = task.assigned_to === currentUserId;
  const isWorkspaceOwner = workspaceRole === 'owner';
  const canModifySubmission = isTaskOwner && !isWorkspaceOwner && 
                             task.status === 'submitted';
  
  return (
    <>
      {canModifySubmission && (
        <>
          <Button onClick={handleDeleteSubmission}>Delete Submission</Button>
          <Button onClick={handleReuploadSubmission}>Re-upload</Button>
        </>
      )}
    </>
  );
};
```

#### 5.2 Fix Re-submission Logic
```javascript
const reuploadSubmission = async (taskId, file, workspaceId, csrfToken) => {
  // Ensure only task assignees can re-upload (not owners)
  const task = await getTask(taskId);
  const user = await getCurrentUser();
  
  if (task.assigned_to !== user.id) {
    throw new Error('Only the task assignee can re-upload submissions');
  }
  
  // Proceed with re-upload logic
};
```

### Solution 6: Fix CORS Configuration

#### 6.1 Update Supabase Edge Function CORS
```javascript
// In Supabase Edge Function
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Or specific origins
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

// Handle preflight requests
if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders });
}
```

#### 6.2 Update Local Development Configuration
```javascript
// In vite.config.js or similar
export default {
  server: {
    cors: {
      origin: ['http://localhost:5173', 'http://localhost:5174'],
      credentials: true
    }
  }
};
```

### Solution 7: Fix Data Fetching Issues

#### 7.1 Update API Queries
```javascript
const getWorkspaceSubmissions = async (workspaceId) => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        submission_file_url,
        submission_file_name,
        submission_file_size,
        submitted_at,
        status,
        assigned_to,
        users:assigned_to (
          full_name,
          email
        )
      `)
      .eq('workspace_id', workspaceId)
      .not('submission_file_url', 'is', null)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`Failed to fetch submissions: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching workspace submissions:', error);
    throw error;
  }
};
```

#### 7.2 Improve Error Handling
```javascript
const handleApiError = (error, operation) => {
  console.error(`Error in ${operation}:`, error);
  
  if (error.code === 'PGRST116') {
    throw new Error('No data found');
  }
  
  if (error.code === '42501') {
    throw new Error('Permission denied');
  }
  
  throw new Error(`Operation failed: ${error.message}`);
};
```

## Implementation Architecture

### Component Updates Required

1. **TaskCard.jsx**
   - Fix permission conditionals
   - Update button visibility logic
   - Improve error handling

2. **FileUpload.jsx**
   - Fix CSRF token handling
   - Update permission validation
   - Improve upload error messages

3. **SubmissionDisplay.jsx**
   - Implement file preview functionality
   - Separate view and download actions
   - Add proper file type handling

4. **WorkspaceTL.jsx / WorkspaceTM.jsx**
   - Fix role-based UI rendering
   - Update permission checks
   - Improve state management

5. **CreateWorkspace.jsx**
   - Fix CORS handling
   - Update error messages
   - Improve invite functionality

### Service Updates Required

1. **TaskService.js**
   - Fix permission validation functions
   - Update CSRF token handling
   - Improve error responses

2. **Database Policies**
   - Update RLS policies for workspace owners
   - Fix task and storage permissions
   - Add proper role-based access

### Testing Strategy

1. **Unit Tests**
   - Permission validation functions
   - File handling utilities
   - Error handling logic

2. **Integration Tests**
   - Complete task workflows
   - File upload and download
   - Permission-based access

3. **E2E Tests**
   - Owner task management
   - Member task submission
   - Workspace creation

## Migration Plan

### Phase 1: Critical Fixes (P0)
1. Fix file upload permissions
2. Fix owner task workflow
3. Fix workspace creation CORS

### Phase 2: High Priority (P1)
1. Fix task revocation permissions
2. Fix member re-submission
3. Fix data fetching errors

### Phase 3: Improvements (P2)
1. Implement file preview
2. UI/UX improvements
3. Enhanced error handling

---

*This design provides a comprehensive approach to fixing all identified critical bugs in the workspace task management system.*
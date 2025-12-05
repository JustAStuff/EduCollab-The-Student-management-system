# Fix Workspace Task Management Critical Bugs - Implementation Tasks

## Task List

### Phase 1: Critical Fixes (P0)

- [x] **Task 1: Fix File Upload Functionality**





  - [x] 1.1: Update permission validation in TaskService.js for workspace owners


  - [x] 1.2: Fix CSRF token validation to be more flexible


  - [x] 1.3: Update database RLS policies for file uploads


  - [x] 1.4: Fix FileUpload component error handling


  - [x] 1.5: Test file upload for both members and owners



  - _Requirements: R1.1, R1.2, R1.3, R1.4, T1, T4_

- [x] **Task 2: Fix Owner Task Workflow**






  - [x] 2.1: Update task status validation for workspace owners


  - [x] 2.2: Fix TaskCard component conditionals for owner tasks









  - [x] 2.3: Update WorkspaceTL component for owner task management





  - [x] 2.4: Fix task state transitions for owner-assigned tasks














  - [x] 2.5: Implement TL task review functionality in WorkspaceTM

    - Add TL tasks section to WorkspaceTM interface
    - Show submitted TL tasks that need member review
    - Enable members to approve/reject TL task submissions
    - Update TaskCard to show review buttons for TL tasks
    - Test peer review workflow for TL tasks
  - [x] 2.6: Test complete owner task workflow from start to completion


  - _Requirements: R4.1, R4.2, R4.3, R4.4, T1, T5_

- [x] **Task 3: Fix Workspace Creation CORS Issues**



  - [x] 3.1: Update Supabase Edge Function CORS headers


  - [x] 3.2: Fix local development server CORS configuration


  - [x] 3.3: Update CreateWorkspace component error handling


  - [x] 3.4: Fix invite sending functionality


  - [x] 3.5: Test workspace creation and invitation process


  - _Requirements: R6.1, R6.2, R6.3, R6.4, T3_

### Phase 2: High Priority Fixes (P1)

- [x] **Task 4: Fix Task Revocation Permissions**





  - [x] 4.1: Update revocation permission validation logic


  - [x] 4.2: Fix database policies for workspace owner revocation rights


  - [x] 4.3: Update RevocationDialog component


  - [x] 4.4: Fix TaskCard revocation button visibility


  - [x] 4.5: Test task revocation by workspace owners


  - _Requirements: R3.1, R3.2, R3.3, R3.4, T1_

- [x] **Task 5: Fix Member Re-submission Issues**




  - [x] 5.1: Fix UI conditionals to hide re-submit buttons from owners


  - [x] 5.2: Update submission modification permission checks


  - [x] 5.3: Fix re-upload functionality for members


  - [x] 5.4: Update TaskCard component submission action visibility


  - [x] 5.5: Test member re-submission workflow


  - _Requirements: R5.1, R5.2, R5.3, R5.4, T1, T5_

- [ ] **Task 6: Fix Data Fetching Issues**
  - [ ] 6.1: Debug and fix 400 errors in workspace submissions API
  - [ ] 6.2: Update query parameters and data validation
  - [ ] 6.3: Improve error handling in data fetching functions
  - [ ] 6.4: Fix SubmissionsGallery component error handling
  - [ ] 6.5: Test dashboard and gallery data loading
  - _Requirements: R7.1, R7.2, R7.3, R7.4, T2_

### Phase 3: User Experience Improvements (P2)

- [ ] **Task 7: Implement File Preview System**
  - [ ] 7.1: Create file type detection utility
  - [ ] 7.2: Implement file preview modal component
  - [ ] 7.3: Separate view and download actions in UI
  - [ ] 7.4: Update SubmissionDisplay component
  - [ ] 7.5: Test file viewing and downloading functionality
  - _Requirements: R2.1, R2.2, R2.3, R2.4, T4_

- [ ] **Task 8: Enhanced Error Handling and User Feedback**
  - [ ] 8.1: Improve error messages across all components
  - [ ] 8.2: Add loading states for async operations
  - [ ] 8.3: Implement better user feedback for failed operations
  - [ ] 8.4: Add retry mechanisms for failed requests
  - [ ] 8.5: Test error scenarios and user feedback
  - _Requirements: R1.4, R6.4, R7.3, T2, T5_

### Phase 4: Testing and Validation

- [ ] **Task 9: Comprehensive Testing**
  - [ ] 9.1: Write unit tests for all fixed permission functions
  - [ ] 9.2: Create integration tests for complete workflows
  - [ ] 9.3: Develop E2E tests for critical user journeys
  - [ ] 9.4: Test all user roles and permission scenarios
  - [ ] 9.5: Validate all success criteria are met
  - _Requirements: All SC criteria, Testing Requirements_

- [ ] **Task 10: Documentation and Cleanup**
  - [ ] 10.1: Update user documentation with fixed workflows
  - [ ] 10.2: Document new permission logic and role handling
  - [ ] 10.3: Clean up unused code and imports
  - [ ] 10.4: Update inline help tooltips if needed
  - [ ] 10.5: Create troubleshooting guide for common issues
  - _Requirements: Documentation updates_

## Detailed Task Breakdown

### Task 1: Fix File Upload Functionality

#### Subtask 1.1: Update Permission Validation
```javascript
// File: src/services/TaskService.js
// Update validateUploadPermissions function
const validateUploadPermissions = async (taskId, userId) => {
  const task = await getTask(taskId);
  const userWorkspaceRole = await getUserWorkspaceRole(userId, task.workspace_id);
  
  // Workspace owners can upload to any task in their workspace
  if (userWorkspaceRole === 'owner') {
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

#### Subtask 1.2: Fix CSRF Token Validation
```javascript
// File: src/utils/securityValidation.js
// Make CSRF validation more flexible
export const validateCSRFToken = (providedToken, storedToken) => {
  // Allow missing tokens in development
  if (process.env.NODE_ENV === 'development' && (!providedToken || !storedToken)) {
    return true;
  }
  
  return providedToken === storedToken;
};
```

#### Subtask 1.3: Update Database Policies
```sql
-- File: supabase/migrations/fix_upload_permissions.sql
-- Allow workspace owners to upload files
DROP POLICY IF EXISTS "workspace_owners_can_upload" ON storage.objects;
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

### Task 2: Fix Owner Task Workflow

#### Subtask 2.1: Update Task Status Validation
```javascript
// File: src/utils/errorHandling.js
export const validateTaskStatus = (task, action, userId, userRole) => {
  // Special handling for workspace owners
  if (userRole === 'owner' && task.assigned_to === userId) {
    // Owners can perform any action on their own tasks
    return { isValid: true };
  }
  
  // Existing validation logic
  return standardTaskStatusValidation(task, action);
};
```

#### Subtask 2.2: Fix TaskCard Conditionals
```jsx
// File: src/components/tasks/TaskCard.jsx
const TaskCard = ({ task, userRole, workspaceRole, currentUserId }) => {
  const isTaskAssignee = task.assigned_to === currentUserId;
  const isWorkspaceOwner = workspaceRole === 'owner';
  const canManageTask = isTaskAssignee || (isWorkspaceOwner && isTaskAssignee);
  
  // Show appropriate buttons based on permissions
  const showStartButton = canManageTask && task.status === 'todo';
  const showUploadButton = canManageTask && 
                          ['in_progress', 'needs_revision'].includes(task.status);
  
  // Rest of component logic
};
```

### Task 3: Fix CORS Issues

#### Subtask 3.1: Update Edge Function CORS
```javascript
// File: supabase/functions/send-invite/index.ts
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  // Your existing logic here
  
  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
```

## Testing Checklist

### Critical Functionality Tests
- [ ] Workspace owner can start their own tasks
- [ ] Workspace owner can upload task results
- [ ] Members can upload task results
- [ ] Workspace owner can revoke any task assignment
- [ ] Members can re-submit tasks (but not owners)
- [ ] New workspaces can be created successfully
- [ ] Dashboard loads submissions without errors

### Permission Tests
- [ ] Workspace owners have full task management rights
- [ ] Members can only manage their assigned tasks
- [ ] Re-submission buttons only show for appropriate users
- [ ] File upload works for all authorized users

### Error Handling Tests
- [ ] Proper error messages for permission failures
- [ ] CORS errors are resolved
- [ ] 400 errors in data fetching are fixed
- [ ] User-friendly error feedback is provided

## Success Metrics

1. **Zero Critical Errors**: No more CORS, 400, or permission errors
2. **Complete Workflows**: All user roles can complete their intended workflows
3. **Proper Permissions**: Role-based access control works correctly
4. **User Experience**: Clear feedback and intuitive functionality

---

*This task list provides a systematic approach to fixing all critical bugs in the workspace task management system.*
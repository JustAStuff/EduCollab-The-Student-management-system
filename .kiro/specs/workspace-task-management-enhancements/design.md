# Design Document

## Overview

This feature enhances the workspace task management system to provide comprehensive task lifecycle management for both Team Leads (TLs) and Team Members (TMs). The current system allows TLs to assign tasks to members but lacks several critical features:

1. **TL Task Management**: TLs cannot manage their own tasks with the same workflow as members
2. **Submission Visibility**: Task submissions are not visible in the workspace dashboard
3. **Submission Modification**: Members cannot modify submissions after upload
4. **Task Revocation**: No way to unassign tasks from members
5. **Peer Review**: No mechanism for members to review TL submissions

The solution implements a unified task management interface that provides consistent workflows for all workspace participants, improves transparency through submission visibility, and adds flexibility for task assignment management.

## Architecture

### Component Structure

```
WorkspaceTL
├── TL Tasks Section (NEW)
│   ├── Task List with Status
│   ├── Start Task Button
│   ├── Upload Submission
│   └── Review Status Display
├── Team Members Section (ENHANCED)
│   ├── Member List
│   ├── Member Tasks with Status
│   ├── Task Review Actions
│   └── Revoke Assignment Button (NEW)
└── Shared Components
    ├── TaskCard Component
    ├── FileUpload Component
    └── ReviewDialog Component

WorkspaceTM (ENHANCED)
├── Active Tasks Section
│   ├── Start Task Button
│   ├── Upload Submission
│   ├── Delete Submission Button (NEW)
│   └── Re-upload Submission Button (NEW)
├── Pending Review Section
└── Completed Tasks Section

WorkspaceDashboard (ENHANCED)
├── Workspace Overview
├── Task Management Section
├── Submissions Gallery (NEW)
│   ├── All Member Submissions
│   ├── Download Button
│   └── View Button
└── Team Members Section
```

### Data Flow

```
1. Task Assignment Flow:
   TL → Create Task → Assign to Member/Self → Task appears in assignee's view

2. Task Execution Flow:
   Member/TL → Start Task → Work on Task → Upload Submission → Under Review

3. Review Flow:
   Reviewer → View Submission → Approve/Request Redo → Task Completed/In Progress

4. Submission Modification Flow:
   Member → View Submitted Task → Delete/Re-upload → Task remains Under Review

5. Task Revocation Flow:
   TL → View Assigned Task → Revoke Assignment → Confirmation → Task Unassigned
```

## Components and Interfaces

### 1. TL Tasks Section Component

**Purpose**: Display and manage TL's own assigned tasks

**Props**:
```typescript
interface TLTasksSectionProps {
  workspaceId: string;
  userId: string;
  onTaskUpdate: () => void;
}
```

**State**:
```typescript
interface TLTasksState {
  tlTasks: Task[];
  selectedTask: Task | null;
  uploadDialogOpen: boolean;
  selectedFile: File | null;
}
```

**UI Elements**:
- Section header: "My Tasks"
- Task cards with status badges
- "Start Task" button for todo tasks
- "Upload Result" button for in-progress tasks
- Status indicator for submitted/completed tasks
- Review comments display

### 2. Enhanced Task Card Component

**Purpose**: Reusable task display component with consistent UI

**Props**:
```typescript
interface TaskCardProps {
  task: Task;
  userRole: 'tl' | 'tm';
  onStatusChange: (taskId: string, newStatus: string) => void;
  onUpload: (taskId: string, file: File) => void;
  onReview: (taskId: string, action: 'approve' | 'redo', comments?: string) => void;
  onRevoke?: (taskId: string) => void;
  showRevokeButton?: boolean;
}
```

**Features**:
- Status badge with color coding
- Action buttons based on task status
- File attachment display
- Review comments section
- Revoke button (conditional)

### 3. Submission Management Component

**Purpose**: Handle file uploads, deletions, and re-uploads

**Props**:
```typescript
interface SubmissionManagementProps {
  task: Task;
  onSubmit: (file: File) => Promise<void>;
  onDelete: () => Promise<void>;
  onReupload: (file: File) => Promise<void>;
}
```

**Features**:
- File upload interface with validation
- Current submission display
- Delete submission button (for under review tasks)
- Re-upload submission button (for under review tasks)
- File preview (if supported format)

### 4. Submissions Gallery Component

**Purpose**: Display all workspace submissions in dashboard

**Props**:
```typescript
interface SubmissionsGalleryProps {
  workspaceId: string;
  submissions: Submission[];
  onDownload: (submission: Submission) => void;
  onView: (submission: Submission) => void;
}
```

**UI Layout**:
```
┌─────────────────────────────────────────┐
│ Workspace Submissions                    │
├─────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│ │ [Icon]   │ │ [Icon]   │ │ [Icon]   │ │
│ │ File.pdf │ │ Doc.docx │ │ Img.jpg  │ │
│ │ By: John │ │ By: Jane │ │ By: Bob  │ │
│ │ Task: X  │ │ Task: Y  │ │ Task: Z  │ │
│ │ [View]   │ │ [View]   │ │ [View]   │ │
│ │ [Download│ │ [Download│ │ [Download│ │
│ └──────────┘ └──────────┘ └──────────┘ │
└─────────────────────────────────────────┘
```

### 5. Task Revocation Component

**Purpose**: Handle task unassignment with confirmation

**Props**:
```typescript
interface TaskRevocationProps {
  task: Task;
  member: User;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}
```

**Confirmation Dialog**:
```
┌─────────────────────────────────────┐
│ Revoke Task Assignment?             │
├─────────────────────────────────────┤
│ Task: [Task Title]                  │
│ Assigned to: [Member Name]          │
│                                     │
│ This will unassign the task from    │
│ the member. Any progress will be    │
│ preserved for reference.            │
│                                     │
│ [Cancel]  [Confirm Revocation]      │
└─────────────────────────────────────┘
```

### 6. Review Interface Component

**Purpose**: Allow members to review TL submissions

**Props**:
```typescript
interface ReviewInterfaceProps {
  task: Task;
  submission: Submission;
  reviewer: User;
  onApprove: () => Promise<void>;
  onRequestRedo: (comments: string) => Promise<void>;
}
```

**UI Elements**:
- Submission file display/preview
- Approve button
- Request Redo button
- Comments textarea (for redo requests)
- Reviewer information display

## Data Models

### Enhanced Task Model

```typescript
interface Task {
  id: string;
  workspace_id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'submitted' | 'needs_revision' | 'completed';
  assigned_to: string;
  assigned_by: string;
  created_at: string;
  updated_at: string;
  started_at?: string;
  submitted_at?: string;
  reviewed_at?: string;
  completed_at?: string;
  reviewed_by?: string;
  review_comments?: string;
  submission_file_url?: string;
  submission_file_name?: string;
  submission_file_size?: number;
  can_modify_submission: boolean; // Computed field
}
```

### Submission Model

```typescript
interface Submission {
  id: string;
  task_id: string;
  workspace_id: string;
  submitted_by: string;
  submitter_name: string;
  task_title: string;
  file_url: string;
  file_name: string;
  file_size: number;
  file_type: string;
  submitted_at: string;
  status: 'under_review' | 'approved' | 'needs_revision';
}
```

### Review Model

```typescript
interface Review {
  id: string;
  task_id: string;
  reviewer_id: string;
  reviewer_name: string;
  action: 'approve' | 'request_redo';
  comments?: string;
  reviewed_at: string;
}
```

## Database Schema Changes

### Tasks Table (Enhanced)

```sql
-- Add new columns to existing tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS started_at TIMESTAMP;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS submission_file_size INTEGER;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_assigned 
ON tasks(workspace_id, assigned_to);

CREATE INDEX IF NOT EXISTS idx_tasks_status 
ON tasks(status);
```

### Task Reviews Table (New)

```sql
CREATE TABLE IF NOT EXISTS task_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES auth.users(id),
  action VARCHAR(20) NOT NULL CHECK (action IN ('approve', 'request_redo')),
  comments TEXT,
  reviewed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_task_reviews_task ON task_reviews(task_id);
CREATE INDEX idx_task_reviews_reviewer ON task_reviews(reviewer_id);
```

### RLS Policies

```sql
-- Allow workspace members to review tasks
CREATE POLICY "Workspace members can review tasks"
ON task_reviews FOR INSERT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
    WHERE t.id = task_id
    AND wm.user_id = auth.uid()
  )
);

-- Allow users to view reviews for their workspace tasks
CREATE POLICY "Users can view task reviews in their workspaces"
ON task_reviews FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
    WHERE t.id = task_id
    AND wm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE t.id = task_id
    AND w.created_by = auth.uid()
  )
);
```

## API Functions

### 1. Get TL Tasks

```typescript
async function getTLTasks(workspaceId: string, userId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('assigned_to', userId)
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data;
}
```

### 2. Delete Submission

```typescript
async function deleteSubmission(taskId: string): Promise<void> {
  // Get task to find file path
  const { data: task } = await supabase
    .from('tasks')
    .select('submission_file_url, status')
    .eq('id', taskId)
    .single();
    
  if (task.status !== 'submitted') {
    throw new Error('Can only delete submissions for tasks under review');
  }
  
  // Delete file from storage
  if (task.submission_file_url) {
    await supabase.storage
      .from('task-submissions')
      .remove([task.submission_file_url]);
  }
  
  // Update task status
  await supabase
    .from('tasks')
    .update({
      status: 'in_progress',
      submission_file_url: null,
      submission_file_name: null,
      submission_file_size: null,
      submitted_at: null
    })
    .eq('id', taskId);
}
```

### 3. Re-upload Submission

```typescript
async function reuploadSubmission(
  taskId: string, 
  file: File, 
  workspaceId: string, 
  userId: string
): Promise<void> {
  // Validate file
  const validation = validateFile(file);
  if (!validation.isValid) throw new Error(validation.error);
  
  // Get current submission
  const { data: task } = await supabase
    .from('tasks')
    .select('submission_file_url')
    .eq('id', taskId)
    .single();
  
  // Delete old file
  if (task.submission_file_url) {
    await supabase.storage
      .from('task-submissions')
      .remove([task.submission_file_url]);
  }
  
  // Upload new file
  const fileName = generateFilePath(workspaceId, taskId, userId, file.name);
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('task-submissions')
    .upload(fileName, file);
    
  if (uploadError) throw uploadError;
  
  // Update task
  await supabase
    .from('tasks')
    .update({
      submission_file_url: uploadData.path,
      submission_file_name: file.name,
      submission_file_size: file.size,
      submitted_at: new Date().toISOString()
    })
    .eq('id', taskId);
}
```

### 4. Revoke Task Assignment

```typescript
async function revokeTaskAssignment(taskId: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({
      assigned_to: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', taskId);
    
  if (error) throw error;
}
```

### 5. Get Workspace Submissions

```typescript
async function getWorkspaceSubmissions(workspaceId: string): Promise<Submission[]> {
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
    
  if (error) throw error;
  
  return data.map(task => ({
    id: task.id,
    task_id: task.id,
    workspace_id: workspaceId,
    submitted_by: task.assigned_to,
    submitter_name: task.users?.full_name || task.users?.email,
    task_title: task.title,
    file_url: task.submission_file_url,
    file_name: task.submission_file_name,
    file_size: task.submission_file_size,
    file_type: getFileType(task.submission_file_name),
    submitted_at: task.submitted_at,
    status: task.status === 'completed' ? 'approved' : 
            task.status === 'needs_revision' ? 'needs_revision' : 'under_review'
  }));
}
```

### 6. Submit Review

```typescript
async function submitReview(
  taskId: string,
  action: 'approve' | 'request_redo',
  comments?: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  // Insert review record
  await supabase
    .from('task_reviews')
    .insert({
      task_id: taskId,
      reviewer_id: user.id,
      action,
      comments
    });
  
  // Update task status
  const newStatus = action === 'approve' ? 'completed' : 'needs_revision';
  const updateData: any = {
    status: newStatus,
    reviewed_at: new Date().toISOString(),
    reviewed_by: user.id,
    review_comments: comments || null
  };
  
  if (newStatus === 'completed') {
    updateData.completed_at = new Date().toISOString();
  }
  
  await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', taskId);
}
```

## UI/UX Design

### Task Status Flow Visualization

```
┌─────────┐   Start Task   ┌─────────────┐   Upload    ┌───────────┐
│  To Do  │ ──────────────> │ In Progress │ ──────────> │ Submitted │
└─────────┘                 └─────────────┘             └───────────┘
                                   ↑                          │
                                   │                          │
                                   │                          ↓
                            ┌──────────────┐           ┌──────────┐
                            │    Needs     │ <──────── │  Review  │
                            │   Revision   │  Request  └──────────┘
                            └──────────────┘   Redo         │
                                   │                         │
                                   │ Re-submit               │ Approve
                                   ↓                         ↓
                            ┌─────────────┐           ┌───────────┐
                            │  Submitted  │           │ Completed │
                            └─────────────┘           └───────────┘
```

### Color Scheme

- **To Do**: Gray (#9e9e9e)
- **In Progress**: Orange (#ff9800)
- **Submitted**: Blue (#2196f3)
- **Needs Revision**: Red (#f44336)
- **Completed**: Green (#4caf50)

### Button States

```typescript
const getButtonConfig = (status: string, userRole: string) => {
  switch (status) {
    case 'todo':
      return {
        text: 'Start Task',
        icon: <PlayArrow />,
        color: 'primary',
        disabled: false
      };
    case 'in_progress':
      return {
        text: 'Upload Result',
        icon: <CloudUpload />,
        color: 'primary',
        disabled: false
      };
    case 'submitted':
      return {
        text: 'Under Review',
        icon: <HourglassEmpty />,
        color: 'info',
        disabled: true
      };
    case 'needs_revision':
      return {
        text: 'Re-submit',
        icon: <Refresh />,
        color: 'error',
        disabled: false
      };
    case 'completed':
      return {
        text: 'Completed',
        icon: <CheckCircle />,
        color: 'success',
        disabled: true
      };
  }
};
```

## Error Handling

### File Upload Errors

```typescript
const handleUploadError = (error: Error) => {
  if (error.message.includes('size')) {
    return 'File size exceeds 10MB limit';
  } else if (error.message.includes('type')) {
    return 'File type not supported';
  } else if (error.message.includes('policy')) {
    return 'You do not have permission to upload files';
  } else {
    return 'Upload failed. Please try again';
  }
};
```

### Review Errors

```typescript
const handleReviewError = (error: Error) => {
  if (error.message.includes('permission')) {
    return 'You do not have permission to review this task';
  } else if (error.message.includes('already reviewed')) {
    return 'This task has already been reviewed';
  } else {
    return 'Review submission failed. Please try again';
  }
};
```

### Revocation Errors

```typescript
const handleRevocationError = (error: Error) => {
  if (error.message.includes('permission')) {
    return 'Only team leads can revoke task assignments';
  } else if (error.message.includes('completed')) {
    return 'Cannot revoke assignment for completed tasks';
  } else {
    return 'Revocation failed. Please try again';
  }
};
```

## Testing Strategy

### Unit Tests

1. **Task Status Transitions**
   - Test all valid status transitions
   - Test invalid status transitions are blocked
   - Test status update triggers correct side effects

2. **File Operations**
   - Test file upload validation
   - Test file deletion
   - Test file re-upload
   - Test file download

3. **Review Operations**
   - Test approve action
   - Test request redo action
   - Test review permissions

4. **Revocation Operations**
   - Test task revocation
   - Test revocation permissions
   - Test revocation confirmation

### Integration Tests

1. **TL Task Workflow**
   - TL assigns task to self
   - TL starts task
   - TL uploads submission
   - Member reviews and approves
   - Task marked as completed

2. **Member Task Workflow**
   - TL assigns task to member
   - Member starts task
   - Member uploads submission
   - Member deletes and re-uploads
   - TL reviews and requests redo
   - Member re-submits
   - TL approves

3. **Dashboard Visibility**
   - Submissions appear in dashboard
   - All members can view submissions
   - Download functionality works
   - View functionality works (for supported formats)

4. **Revocation Workflow**
   - TL revokes task from member
   - Task becomes unassigned
   - Task can be reassigned
   - Progress is preserved

### E2E Tests

1. Complete task lifecycle from creation to completion
2. Multi-user collaboration scenarios
3. Error recovery scenarios
4. Permission boundary testing

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading**: Load submissions on demand in dashboard
2. **Pagination**: Paginate task lists for large workspaces
3. **Caching**: Cache workspace member list
4. **Debouncing**: Debounce file upload operations
5. **Optimistic Updates**: Update UI immediately, sync with server

### Query Optimization

```sql
-- Index for faster submission queries
CREATE INDEX idx_tasks_workspace_submissions 
ON tasks(workspace_id, submitted_at) 
WHERE submission_file_url IS NOT NULL;

-- Index for faster review queries
CREATE INDEX idx_task_reviews_task_reviewer 
ON task_reviews(task_id, reviewer_id);
```

## Security Considerations

### Access Control

1. **TL Tasks**: Only TL can view/manage their own tasks
2. **Member Tasks**: Only assigned member can modify their tasks
3. **Reviews**: Any workspace member can review any task
4. **Revocation**: Only TL (workspace owner) can revoke assignments
5. **Submissions**: All workspace members can view all submissions

### File Security

1. **Upload Validation**: Validate file type and size before upload
2. **Storage Policies**: Enforce RLS on storage bucket
3. **Download Authorization**: Verify user is workspace member before allowing download
4. **Malware Scanning**: Consider adding virus scanning for uploaded files

### Data Privacy

1. **Review Comments**: Only visible to task assignee and reviewers
2. **Submission History**: Maintain audit trail of all submissions
3. **Deletion Logs**: Log all file deletions for accountability

## Migration Strategy

### Phase 1: Backend Changes
1. Add new database columns
2. Create task_reviews table
3. Update RLS policies
4. Deploy API functions

### Phase 2: UI Updates
1. Add TL tasks section to WorkspaceTL
2. Add submission management to WorkspaceTM
3. Add submissions gallery to WorkspaceDashboard
4. Add revocation functionality

### Phase 3: Testing & Rollout
1. Test with small group of users
2. Gather feedback
3. Fix issues
4. Full rollout

### Backward Compatibility

- Existing tasks continue to work
- Old submissions remain accessible
- No breaking changes to existing workflows

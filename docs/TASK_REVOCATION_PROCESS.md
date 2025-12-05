# Task Revocation Process Documentation

## Overview

The task revocation process allows Team Leads to revoke task assignments from team members when reassignment is necessary. This feature maintains workflow flexibility while preserving completed work and maintaining audit trails.

## Process Architecture

### Core Functionality
- **Assignment Revocation**: Remove task assignment from current member
- **Work Preservation**: Maintain all progress and submissions
- **Status Management**: Handle task status transitions appropriately
- **Notification System**: Inform all relevant parties of revocation
- **Audit Trail**: Complete logging of revocation activities

### Revocation Eligibility

#### Who Can Revoke
- **Team Leads**: Can revoke any task they assigned
- **Workspace Admins**: Can revoke any task in workspace
- **System Admins**: Can revoke any task system-wide

#### What Can Be Revoked
- **Assigned Tasks**: Tasks currently assigned to team members
- **In Progress Tasks**: Tasks being actively worked on
- **Under Review Tasks**: Tasks submitted but not yet approved
- **Needs Revision Tasks**: Tasks requiring changes

#### What Cannot Be Revoked
- **Completed Tasks**: Tasks that have been approved and finished
- **Unassigned Tasks**: Tasks not currently assigned to anyone
- **System Tasks**: Critical system or administrative tasks

## Detailed Workflow

### 1. Revocation Initiation

#### Access Points
- **WorkspaceTL Page**: "Team Members" section
- **Task Management Dashboard**: Bulk task management interface
- **Individual Task View**: Direct revocation from task details

#### Prerequisites Check
```javascript
// Revocation eligibility verification
const canRevokeTask = async (taskId, revokerId) => {
  const task = await getTask(taskId);
  const revoker = await getUser(revokerId);
  
  // Check if task can be revoked
  if (task.status === 'completed') {
    return { canRevoke: false, reason: 'Cannot revoke completed tasks' };
  }
  
  // Check if task is assigned
  if (!task.assignedTo) {
    return { canRevoke: false, reason: 'Task is not currently assigned' };
  }
  
  // Check revoker permissions
  const hasPermission = await hasRevocationPermission(revokerId, task.workspaceId);
  if (!hasPermission) {
    return { canRevoke: false, reason: 'Insufficient permissions' };
  }
  
  return { canRevoke: true };
};
```

### 2. Revocation Confirmation

#### Confirmation Dialog Interface
```jsx
const RevocationConfirmationDialog = ({ task, assignee, onConfirm, onCancel }) => {
  const [reason, setReason] = useState('');
  const [preserveWork, setPreserveWork] = useState(true);
  
  return (
    <div className="revocation-dialog">
      <div className="dialog-header">
        <h3>Revoke Task Assignment</h3>
        <button onClick={onCancel} className="close-btn">×</button>
      </div>
      
      <div className="dialog-content">
        <div className="task-info">
          <h4>Task Details</h4>
          <p><strong>Title:</strong> {task.title}</p>
          <p><strong>Assigned to:</strong> {assignee.name}</p>
          <p><strong>Current Status:</strong> {task.status}</p>
          <p><strong>Progress:</strong> {task.progress}%</p>
        </div>
        
        {task.hasSubmission && (
          <div className="work-preservation-notice">
            <p className="warning">
              This task has submitted work that will be preserved after revocation.
            </p>
          </div>
        )}
        
        <div className="revocation-reason">
          <label htmlFor="reason">Reason for Revocation (Optional):</label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this task is being revoked..."
            maxLength={500}
          />
        </div>
        
        <div className="preservation-option">
          <label>
            <input
              type="checkbox"
              checked={preserveWork}
              onChange={(e) => setPreserveWork(e.target.checked)}
            />
            Preserve completed work and progress
          </label>
        </div>
      </div>
      
      <div className="dialog-actions">
        <button onClick={onCancel} className="secondary">
          Cancel
        </button>
        <button 
          onClick={() => onConfirm({ reason, preserveWork })}
          className="danger"
        >
          Confirm Revocation
        </button>
      </div>
    </div>
  );
};
```

### 3. Revocation Execution

#### Core Revocation Process
```javascript
// Main revocation workflow
const executeTaskRevocation = async (taskId, revokerId, options = {}) => {
  const { reason, preserveWork = true, notifyAssignee = true } = options;
  
  try {
    // Start transaction
    await beginTransaction();
    
    // Get current task state
    const task = await getTask(taskId);
    const currentAssignee = await getUser(task.assignedTo);
    
    // Preserve work if requested
    if (preserveWork && task.hasWork) {
      await preserveTaskWork(taskId);
    }
    
    // Create revocation record
    const revocation = await createRevocationRecord({
      taskId,
      revokerId,
      previousAssigneeId: task.assignedTo,
      reason,
      preservedWork: preserveWork,
      timestamp: new Date()
    });
    
    // Update task assignment
    await updateTask(taskId, {
      assignedTo: null,
      status: 'unassigned',
      revokedAt: new Date(),
      revokedBy: revokerId
    });
    
    // Log revocation activity
    await logActivity({
      type: 'task_revoked',
      taskId,
      userId: revokerId,
      details: {
        previousAssignee: currentAssignee.id,
        reason,
        preservedWork
      }
    });
    
    // Send notifications
    if (notifyAssignee) {
      await notifyTaskRevocation(currentAssignee.id, task, reason);
    }
    await notifyWorkspaceMembers(task.workspaceId, 'task_available', task);
    
    // Commit transaction
    await commitTransaction();
    
    return revocation;
    
  } catch (error) {
    await rollbackTransaction();
    throw error;
  }
};
```

### 4. Work Preservation

#### Preservation Strategy
```javascript
// Work preservation system
const preserveTaskWork = async (taskId) => {
  const task = await getTask(taskId);
  
  // Preserve submissions
  if (task.submissions && task.submissions.length > 0) {
    await preserveSubmissions(taskId, task.submissions);
  }
  
  // Preserve progress notes
  if (task.progressNotes) {
    await preserveProgressNotes(taskId, task.progressNotes);
  }
  
  // Preserve time tracking
  if (task.timeEntries) {
    await preserveTimeEntries(taskId, task.timeEntries);
  }
  
  // Create preservation record
  await createPreservationRecord({
    taskId,
    preservedAt: new Date(),
    preservedItems: {
      submissions: task.submissions?.length || 0,
      progressNotes: task.progressNotes?.length || 0,
      timeEntries: task.timeEntries?.length || 0
    }
  });
};
```

## Post-Revocation Handling

### 1. Task Reassignment

#### Automatic Reassignment Pool
```javascript
// Add revoked task to assignment pool
const addToAssignmentPool = async (taskId) => {
  const task = await getTask(taskId);
  
  // Update task visibility
  await updateTask(taskId, {
    status: 'available',
    availableForAssignment: true,
    addedToPoolAt: new Date()
  });
  
  // Notify potential assignees
  const eligibleMembers = await getEligibleMembers(task.workspaceId, task.requirements);
  await notifyAssignmentOpportunity(eligibleMembers, task);
  
  // Update workspace statistics
  await updateWorkspaceStats(task.workspaceId, {
    availableTasks: { increment: 1 },
    revokedTasks: { increment: 1 }
  });
};
```

#### Manual Reassignment
```javascript
// Direct reassignment to specific member
const reassignRevokedTask = async (taskId, newAssigneeId, assignerId) => {
  // Verify new assignee eligibility
  const canAssign = await canAssignTask(taskId, newAssigneeId);
  if (!canAssign.eligible) {
    throw new Error(canAssign.reason);
  }
  
  // Get preserved work
  const preservedWork = await getPreservedWork(taskId);
  
  // Assign to new member
  await assignTask(taskId, newAssigneeId, {
    assignedBy: assignerId,
    reassignment: true,
    previousWork: preservedWork
  });
  
  // Notify new assignee about preserved work
  if (preservedWork.hasContent) {
    await notifyPreservedWork(newAssigneeId, taskId, preservedWork);
  }
};
```

### 2. Status Management

#### Status Transition Rules
```javascript
// Status handling after revocation
const handlePostRevocationStatus = (task, preservedWork) => {
  // If work was preserved and substantial
  if (preservedWork.hasSubmissions) {
    return 'needs_review'; // Preserved submissions need review
  }
  
  if (preservedWork.hasProgress && preservedWork.progressPercentage > 50) {
    return 'in_progress'; // Significant progress preserved
  }
  
  // Default to available for assignment
  return 'available';
};
```

## Notification System

### 1. Revocation Notifications

#### To Revoked Assignee
```javascript
// Notification to member whose task was revoked
const notifyTaskRevocation = async (memberId, task, reason) => {
  const notification = {
    type: 'task_revoked',
    recipientId: memberId,
    title: 'Task Assignment Revoked',
    message: `Your assignment for "${task.title}" has been revoked.`,
    details: {
      taskId: task.id,
      taskTitle: task.title,
      reason: reason || 'No reason provided',
      revokedAt: new Date(),
      preservedWork: task.hasPreservedWork
    },
    actions: [
      {
        label: 'View Available Tasks',
        action: 'navigate',
        target: '/workspace/tasks/available'
      }
    ]
  };
  
  await sendNotification(notification);
};
```

#### To Workspace Members
```javascript
// Notification about task availability
const notifyTaskAvailability = async (workspaceId, task) => {
  const members = await getWorkspaceMembers(workspaceId);
  const eligibleMembers = members.filter(member => 
    canMemberTakeTask(member, task)
  );
  
  const notification = {
    type: 'task_available',
    title: 'Task Available for Assignment',
    message: `"${task.title}" is now available for assignment.`,
    details: {
      taskId: task.id,
      taskTitle: task.title,
      hasPreservedWork: task.hasPreservedWork,
      priority: task.priority
    }
  };
  
  await sendBulkNotification(eligibleMembers, notification);
};
```

### 2. Escalation Notifications

#### To Team Leads
```javascript
// Escalation for repeated revocations
const checkRevocationEscalation = async (taskId) => {
  const revocations = await getTaskRevocations(taskId);
  
  if (revocations.length >= 3) {
    const teamLeads = await getWorkspaceTeamLeads(task.workspaceId);
    
    await sendEscalationNotification(teamLeads, {
      type: 'repeated_revocations',
      taskId,
      revocationCount: revocations.length,
      message: 'Task has been revoked multiple times and may need review.'
    });
  }
};
```

## Analytics and Reporting

### 1. Revocation Metrics

#### Key Performance Indicators
```javascript
// Revocation analytics
const calculateRevocationMetrics = async (workspaceId, timeRange) => {
  const revocations = await getRevocationsInRange(workspaceId, timeRange);
  const tasks = await getTasksInRange(workspaceId, timeRange);
  
  return {
    totalRevocations: revocations.length,
    revocationRate: (revocations.length / tasks.length) * 100,
    averageTimeToRevocation: calculateAverageTimeToRevocation(revocations),
    topRevocationReasons: getTopRevocationReasons(revocations),
    mostRevokedMembers: getMostRevokedMembers(revocations),
    reassignmentSuccessRate: calculateReassignmentSuccessRate(revocations),
    workPreservationRate: calculateWorkPreservationRate(revocations)
  };
};
```

#### Reporting Dashboard
```jsx
const RevocationAnalyticsDashboard = ({ workspaceId }) => {
  const [metrics, setMetrics] = useState(null);
  
  return (
    <div className="revocation-analytics">
      <h2>Task Revocation Analytics</h2>
      
      <div className="metrics-overview">
        <MetricCard
          title="Total Revocations"
          value={metrics?.totalRevocations}
          trend={metrics?.revocationTrend}
        />
        <MetricCard
          title="Revocation Rate"
          value={`${metrics?.revocationRate?.toFixed(1)}%`}
          trend={metrics?.rateTrend}
        />
        <MetricCard
          title="Avg Time to Revocation"
          value={formatDuration(metrics?.averageTimeToRevocation)}
        />
        <MetricCard
          title="Reassignment Success"
          value={`${metrics?.reassignmentSuccessRate?.toFixed(1)}%`}
        />
      </div>
      
      <div className="detailed-analytics">
        <RevocationReasonsChart data={metrics?.topRevocationReasons} />
        <RevocationTrendChart data={metrics?.trendData} />
        <MemberRevocationTable data={metrics?.memberStats} />
      </div>
    </div>
  );
};
```

## Best Practices

### For Team Leads
1. **Communication First**: Discuss issues with team members before revoking
2. **Document Reasons**: Always provide clear reasons for revocation
3. **Preserve Work**: Enable work preservation unless there are specific reasons not to
4. **Quick Reassignment**: Reassign tasks promptly to avoid project delays
5. **Pattern Recognition**: Monitor for patterns that might indicate systemic issues

### For System Administrators
1. **Monitor Patterns**: Watch for excessive revocations that might indicate problems
2. **Performance Tracking**: Track revocation impact on project timelines
3. **Process Improvement**: Use revocation data to improve assignment processes
4. **Training Needs**: Identify training needs based on revocation reasons

### For Development Team
1. **Atomic Operations**: Ensure revocation process is atomic and consistent
2. **Data Integrity**: Maintain referential integrity during revocations
3. **Performance**: Optimize revocation process for large workspaces
4. **Error Handling**: Implement robust error handling and rollback mechanisms

---

*Document Version: 1.0*
*Last Updated: October 2024*
*Maintained by: Development Team*
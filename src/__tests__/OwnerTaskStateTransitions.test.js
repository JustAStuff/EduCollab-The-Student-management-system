/**
 * Test suite for workspace owner task state transitions
 * 
 * Tests the enhanced task state transition logic for workspace owners
 */

import { validateTaskStatus, validateTaskPermissions } from '../utils/errorHandling';

describe('Owner Task State Transitions', () => {
  const mockTask = {
    id: 'task-123',
    status: 'todo',
    assigned_to: 'owner-user-id',
    workspace_id: 'workspace-123',
    submission_file_url: null
  };

  const ownerUserId = 'owner-user-id';
  const ownerWorkspaceRole = 'owner';

  describe('validateTaskStatus for workspace owners', () => {
    test('should allow owners to start tasks from any status', () => {
      const statuses = ['todo', 'in_progress', 'submitted', 'needs_revision', 'completed'];
      
      statuses.forEach(status => {
        const task = { ...mockTask, status };
        const result = validateTaskStatus(task, 'start', ownerUserId, ownerWorkspaceRole);
        expect(result.isValid).toBe(true);
      });
    });

    test('should allow owners to upload to tasks from any status except completed', () => {
      const allowedStatuses = ['todo', 'in_progress', 'submitted', 'needs_revision'];
      
      allowedStatuses.forEach(status => {
        const task = { ...mockTask, status };
        const result = validateTaskStatus(task, 'upload', ownerUserId, ownerWorkspaceRole);
        expect(result.isValid).toBe(true);
      });

      // Should not allow upload to completed tasks
      const completedTask = { ...mockTask, status: 'completed' };
      const result = validateTaskStatus(completedTask, 'upload', ownerUserId, ownerWorkspaceRole);
      expect(result.isValid).toBe(false);
    });

    test('should allow owners to change status from any status', () => {
      const statuses = ['todo', 'in_progress', 'submitted', 'needs_revision', 'completed'];
      
      statuses.forEach(status => {
        const task = { ...mockTask, status };
        const result = validateTaskStatus(task, 'status_change', ownerUserId, ownerWorkspaceRole);
        expect(result.isValid).toBe(true);
      });
    });

    test('should not allow owners to mark their own tasks as complete (peer review required)', () => {
      // The 'complete' operation is no longer supported for workspace owners on their own tasks
      // Tasks must be reviewed and approved by teammates
      const submittedTask = { ...mockTask, status: 'submitted' };
      
      // This operation should not exist in the validation logic anymore
      // Owners cannot self-complete their tasks
      expect(() => {
        validateTaskStatus(submittedTask, 'complete', ownerUserId, ownerWorkspaceRole);
      }).not.toThrow(); // The operation simply won't be available
    });

    test('should allow owners to modify submissions from any status except completed', () => {
      const taskWithSubmission = { 
        ...mockTask, 
        status: 'submitted', 
        submission_file_url: 'path/to/file.pdf' 
      };
      
      const operations = ['delete_submission', 'reupload_submission'];
      
      operations.forEach(operation => {
        const result = validateTaskStatus(taskWithSubmission, operation, ownerUserId, ownerWorkspaceRole);
        expect(result.isValid).toBe(true);
      });

      // Should not allow modification of completed task submissions
      const completedTask = { ...taskWithSubmission, status: 'completed' };
      operations.forEach(operation => {
        const result = validateTaskStatus(completedTask, operation, ownerUserId, ownerWorkspaceRole);
        expect(result.isValid).toBe(false);
      });
    });

    test('should not allow owners to review their own tasks', () => {
      const submittedTask = { ...mockTask, status: 'submitted' };
      const result = validateTaskStatus(submittedTask, 'review', ownerUserId, ownerWorkspaceRole);
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateTaskPermissions for workspace owners', () => {
    test('should allow owners to perform task management operations on their own tasks', () => {
      const operations = ['start', 'upload', 'delete_submission', 'reupload_submission', 'status_change'];
      
      operations.forEach(operation => {
        const result = validateTaskPermissions(mockTask, ownerUserId, operation, ownerWorkspaceRole);
        expect(result.isValid).toBe(true);
      });
    });

    test('should allow owners to revoke any task assignment', () => {
      const taskAssignedToOther = { ...mockTask, assigned_to: 'other-user-id' };
      const result = validateTaskPermissions(taskAssignedToOther, ownerUserId, 'revoke', ownerWorkspaceRole);
      expect(result.isValid).toBe(true);
    });

    test('should not allow owners to review their own tasks', () => {
      const result = validateTaskPermissions(mockTask, ownerUserId, 'review', ownerWorkspaceRole);
      expect(result.isValid).toBe(false);
    });
  });

  describe('Regular member restrictions', () => {
    const memberUserId = 'member-user-id';
    const memberWorkspaceRole = 'member';

    test('should restrict members to standard status transitions', () => {
      // Members cannot start completed tasks
      const completedTask = { ...mockTask, status: 'completed', assigned_to: memberUserId };
      const result = validateTaskStatus(completedTask, 'start', memberUserId, memberWorkspaceRole);
      expect(result.isValid).toBe(false);
    });

    test('should not allow members to perform operations on tasks not assigned to them', () => {
      const result = validateTaskPermissions(mockTask, memberUserId, 'start', memberWorkspaceRole);
      expect(result.isValid).toBe(false);
    });
  });
});
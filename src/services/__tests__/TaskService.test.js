// src/services/__tests__/TaskService.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteSubmission, reuploadSubmission, revokeTaskAssignment, getTLTasks, submitReview } from '../TaskService';
import { supabase } from '../../supabaseClient';
import * as fileUtils from '../../utils/fileUtils';

// Mock dependencies
vi.mock('../../supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn(),
    storage: {
      from: vi.fn()
    }
  }
}));

vi.mock('../../utils/fileUtils', () => ({
  validateFile: vi.fn(),
  generateFilePath: vi.fn()
}));

describe('TaskService', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    supabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });
  });

  describe('deleteSubmission', () => {
    it('should successfully delete a submission', async () => {
      const taskId = 'task-123';
      const mockTask = {
        submission_file_url: 'path/to/file.pdf',
        status: 'submitted',
        assigned_to: 'user-123'
      };

      // Mock task fetch
      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({
        data: mockTask,
        error: null
      });

      supabase.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        single: singleMock,
        update: vi.fn().mockReturnThis()
      });

      selectMock.mockReturnValue({ eq: eqMock, single: singleMock });
      eqMock.mockReturnValue({ single: singleMock });

      // Mock storage deletion
      const removeMock = vi.fn().mockResolvedValue({ error: null });
      supabase.storage.from.mockReturnValue({
        remove: removeMock
      });

      // Mock task update
      const updateMock = vi.fn().mockReturnThis();
      const updateEqMock = vi.fn().mockResolvedValue({ error: null });
      
      let callCount = 0;
      supabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { select: selectMock, eq: eqMock, single: singleMock };
        } else {
          return { update: updateMock, eq: updateEqMock };
        }
      });

      updateMock.mockReturnValue({ eq: updateEqMock });

      const result = await deleteSubmission(taskId);

      expect(result.success).toBe(true);
      expect(removeMock).toHaveBeenCalledWith(['path/to/file.pdf']);
      expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
        status: 'in_progress',
        submission_file_url: null,
        submission_file_name: null,
        submission_file_size: null,
        submitted_at: null
      }));
    });

    it('should throw error if task is not in submitted status', async () => {
      const taskId = 'task-123';
      const mockTask = {
        submission_file_url: 'path/to/file.pdf',
        status: 'completed',
        assigned_to: 'user-123'
      };

      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({
        data: mockTask,
        error: null
      });

      supabase.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        single: singleMock
      });

      selectMock.mockReturnValue({ eq: eqMock, single: singleMock });
      eqMock.mockReturnValue({ single: singleMock });

      await expect(deleteSubmission(taskId)).rejects.toThrow(
        'Can only delete submissions for tasks under review'
      );
    });

    it('should throw error if user is not assigned to task', async () => {
      const taskId = 'task-123';
      const mockTask = {
        submission_file_url: 'path/to/file.pdf',
        status: 'submitted',
        assigned_to: 'other-user-456'
      };

      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({
        data: mockTask,
        error: null
      });

      supabase.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        single: singleMock
      });

      selectMock.mockReturnValue({ eq: eqMock, single: singleMock });
      eqMock.mockReturnValue({ single: singleMock });

      await expect(deleteSubmission(taskId)).rejects.toThrow(
        'You can only delete your own submissions'
      );
    });

    it('should continue with update even if storage deletion fails', async () => {
      const taskId = 'task-123';
      const mockTask = {
        submission_file_url: 'path/to/file.pdf',
        status: 'submitted',
        assigned_to: 'user-123'
      };

      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({
        data: mockTask,
        error: null
      });

      // Mock storage deletion failure
      const removeMock = vi.fn().mockResolvedValue({ 
        error: new Error('Storage error') 
      });
      supabase.storage.from.mockReturnValue({
        remove: removeMock
      });

      // Mock task update success
      const updateMock = vi.fn().mockReturnThis();
      const updateEqMock = vi.fn().mockResolvedValue({ error: null });

      let callCount = 0;
      supabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { select: selectMock, eq: eqMock, single: singleMock };
        } else {
          return { update: updateMock, eq: updateEqMock };
        }
      });

      selectMock.mockReturnValue({ eq: eqMock, single: singleMock });
      eqMock.mockReturnValue({ single: singleMock });
      updateMock.mockReturnValue({ eq: updateEqMock });

      const result = await deleteSubmission(taskId);

      expect(result.success).toBe(true);
      expect(updateMock).toHaveBeenCalled();
    });
  });

  describe('reuploadSubmission', () => {
    it('should successfully re-upload a submission', async () => {
      const taskId = 'task-123';
      const workspaceId = 'workspace-123';
      const file = new File(['content'], 'new-file.pdf', { type: 'application/pdf' });

      // Mock file validation
      fileUtils.validateFile.mockReturnValue({ isValid: true });
      fileUtils.generateFilePath.mockReturnValue('workspace-123/task-123/user-123/new-file.pdf');

      // Mock task fetch
      const mockTask = {
        submission_file_url: 'old/path/file.pdf',
        status: 'submitted',
        assigned_to: 'user-123'
      };

      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({
        data: mockTask,
        error: null
      });

      // Mock storage operations
      const removeMock = vi.fn().mockResolvedValue({ error: null });
      const uploadMock = vi.fn().mockResolvedValue({
        data: { path: 'new/path/file.pdf' },
        error: null
      });

      supabase.storage.from.mockReturnValue({
        remove: removeMock,
        upload: uploadMock
      });

      // Mock task update
      const updateMock = vi.fn().mockReturnThis();
      const updateEqMock = vi.fn().mockResolvedValue({ error: null });

      let callCount = 0;
      supabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { select: selectMock, eq: eqMock, single: singleMock };
        } else {
          return { update: updateMock, eq: updateEqMock };
        }
      });

      selectMock.mockReturnValue({ eq: eqMock, single: singleMock });
      eqMock.mockReturnValue({ single: singleMock });
      updateMock.mockReturnValue({ eq: updateEqMock });

      const result = await reuploadSubmission(taskId, file, workspaceId);

      expect(result.success).toBe(true);
      expect(fileUtils.validateFile).toHaveBeenCalledWith(file);
      expect(removeMock).toHaveBeenCalledWith(['old/path/file.pdf']);
      expect(uploadMock).toHaveBeenCalled();
      expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
        submission_file_url: 'new/path/file.pdf',
        submission_file_name: 'new-file.pdf'
      }));
    });

    it('should throw error if file validation fails', async () => {
      const taskId = 'task-123';
      const workspaceId = 'workspace-123';
      const file = new File(['content'], 'invalid.exe', { type: 'application/exe' });

      fileUtils.validateFile.mockReturnValue({
        isValid: false,
        error: 'Invalid file type'
      });

      await expect(reuploadSubmission(taskId, file, workspaceId)).rejects.toThrow(
        'Invalid file type'
      );
    });

    it('should throw error if task is not in submitted status', async () => {
      const taskId = 'task-123';
      const workspaceId = 'workspace-123';
      const file = new File(['content'], 'file.pdf', { type: 'application/pdf' });

      fileUtils.validateFile.mockReturnValue({ isValid: true });

      const mockTask = {
        submission_file_url: 'path/to/file.pdf',
        status: 'completed',
        assigned_to: 'user-123'
      };

      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({
        data: mockTask,
        error: null
      });

      supabase.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        single: singleMock
      });

      selectMock.mockReturnValue({ eq: eqMock, single: singleMock });
      eqMock.mockReturnValue({ single: singleMock });

      await expect(reuploadSubmission(taskId, file, workspaceId)).rejects.toThrow(
        'Can only re-upload submissions for tasks under review'
      );
    });

    it('should throw error if user is not assigned to task', async () => {
      const taskId = 'task-123';
      const workspaceId = 'workspace-123';
      const file = new File(['content'], 'file.pdf', { type: 'application/pdf' });

      fileUtils.validateFile.mockReturnValue({ isValid: true });

      const mockTask = {
        submission_file_url: 'path/to/file.pdf',
        status: 'submitted',
        assigned_to: 'other-user-456'
      };

      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({
        data: mockTask,
        error: null
      });

      supabase.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        single: singleMock
      });

      selectMock.mockReturnValue({ eq: eqMock, single: singleMock });
      eqMock.mockReturnValue({ single: singleMock });

      await expect(reuploadSubmission(taskId, file, workspaceId)).rejects.toThrow(
        'You can only re-upload your own submissions'
      );
    });

    it('should handle upload errors appropriately', async () => {
      const taskId = 'task-123';
      const workspaceId = 'workspace-123';
      const file = new File(['content'], 'file.pdf', { type: 'application/pdf' });

      fileUtils.validateFile.mockReturnValue({ isValid: true });
      fileUtils.generateFilePath.mockReturnValue('path/to/file.pdf');

      const mockTask = {
        submission_file_url: 'old/path/file.pdf',
        status: 'submitted',
        assigned_to: 'user-123'
      };

      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({
        data: mockTask,
        error: null
      });

      const removeMock = vi.fn().mockResolvedValue({ error: null });
      const uploadMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Upload failed: policy violation' }
      });

      supabase.storage.from.mockReturnValue({
        remove: removeMock,
        upload: uploadMock
      });

      supabase.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        single: singleMock
      });

      selectMock.mockReturnValue({ eq: eqMock, single: singleMock });
      eqMock.mockReturnValue({ single: singleMock });

      await expect(reuploadSubmission(taskId, file, workspaceId)).rejects.toThrow(
        'You do not have permission to upload files for this task.'
      );
    });
  });

  describe('revokeTaskAssignment', () => {
    it('should successfully revoke a task assignment', async () => {
      const taskId = 'task-123';
      const mockTask = {
        workspace_id: 'workspace-123',
        assigned_by: 'user-123',
        status: 'in_progress'
      };

      // Mock task fetch
      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({
        data: mockTask,
        error: null
      });

      // Mock task update
      const updateMock = vi.fn().mockReturnThis();
      const updateEqMock = vi.fn().mockResolvedValue({ error: null });

      let callCount = 0;
      supabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { select: selectMock, eq: eqMock, single: singleMock };
        } else {
          return { update: updateMock, eq: updateEqMock };
        }
      });

      selectMock.mockReturnValue({ eq: eqMock, single: singleMock });
      eqMock.mockReturnValue({ single: singleMock });
      updateMock.mockReturnValue({ eq: updateEqMock });

      const result = await revokeTaskAssignment(taskId);

      expect(result.success).toBe(true);
      expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
        assigned_to: null
      }));
    });

    it('should throw error if user is not logged in', async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      await expect(revokeTaskAssignment('task-123')).rejects.toThrow(
        'You must be logged in to revoke task assignments'
      );
    });

    it('should throw error if user is not the one who assigned the task', async () => {
      const taskId = 'task-123';
      const mockTask = {
        workspace_id: 'workspace-123',
        assigned_by: 'other-user-456',
        status: 'in_progress'
      };

      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({
        data: mockTask,
        error: null
      });

      supabase.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        single: singleMock
      });

      selectMock.mockReturnValue({ eq: eqMock, single: singleMock });
      eqMock.mockReturnValue({ single: singleMock });

      await expect(revokeTaskAssignment(taskId)).rejects.toThrow(
        'Only the team lead who assigned the task can revoke it'
      );
    });

    it('should throw error if task is completed', async () => {
      const taskId = 'task-123';
      const mockTask = {
        workspace_id: 'workspace-123',
        assigned_by: 'user-123',
        status: 'completed'
      };

      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({
        data: mockTask,
        error: null
      });

      supabase.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        single: singleMock
      });

      selectMock.mockReturnValue({ eq: eqMock, single: singleMock });
      eqMock.mockReturnValue({ single: singleMock });

      await expect(revokeTaskAssignment(taskId)).rejects.toThrow(
        'Cannot revoke assignment for completed tasks'
      );
    });

    it('should handle database errors appropriately', async () => {
      const taskId = 'task-123';

      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Database error')
      });

      supabase.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        single: singleMock
      });

      selectMock.mockReturnValue({ eq: eqMock, single: singleMock });
      eqMock.mockReturnValue({ single: singleMock });

      await expect(revokeTaskAssignment(taskId)).rejects.toThrow('Database error');
    });

    it('should preserve task progress when revoking', async () => {
      const taskId = 'task-123';
      const mockTask = {
        workspace_id: 'workspace-123',
        assigned_by: 'user-123',
        status: 'submitted',
        submission_file_url: 'path/to/file.pdf'
      };

      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({
        data: mockTask,
        error: null
      });

      const updateMock = vi.fn().mockReturnThis();
      const updateEqMock = vi.fn().mockResolvedValue({ error: null });

      let callCount = 0;
      supabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { select: selectMock, eq: eqMock, single: singleMock };
        } else {
          return { update: updateMock, eq: updateEqMock };
        }
      });

      selectMock.mockReturnValue({ eq: eqMock, single: singleMock });
      eqMock.mockReturnValue({ single: singleMock });
      updateMock.mockReturnValue({ eq: updateEqMock });

      await revokeTaskAssignment(taskId);

      // Verify that only assigned_to is set to null, not other fields
      expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
        assigned_to: null
      }));
      expect(updateMock).toHaveBeenCalledWith(expect.not.objectContaining({
        submission_file_url: null
      }));
    });
  });

  describe('getTLTasks', () => {
    it('should successfully fetch TL tasks', async () => {
      const workspaceId = 'workspace-123';
      const userId = 'user-123';
      const mockTasks = [
        {
          id: 'task-1',
          title: 'Task 1',
          description: 'Description 1',
          status: 'submitted',
          assigned_to: 'user-123',
          assigned_by: 'user-456',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T01:00:00Z',
          started_at: '2024-01-01T00:30:00Z',
          submitted_at: '2024-01-01T01:00:00Z',
          reviewed_at: null,
          completed_at: null,
          reviewed_by: null,
          review_comments: null,
          submission_file_url: 'path/to/file.pdf',
          submission_file_name: 'file.pdf',
          submission_file_size: 1024
        },
        {
          id: 'task-2',
          title: 'Task 2',
          description: 'Description 2',
          status: 'in_progress',
          assigned_to: 'user-123',
          assigned_by: 'user-456',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          started_at: '2024-01-02T00:00:00Z',
          submitted_at: null,
          reviewed_at: null,
          completed_at: null,
          reviewed_by: null,
          review_comments: null,
          submission_file_url: null,
          submission_file_name: null,
          submission_file_size: null
        }
      ];

      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const orderMock = vi.fn().mockResolvedValue({
        data: mockTasks,
        error: null
      });

      supabase.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        order: orderMock
      });

      selectMock.mockReturnValue({ eq: eqMock, order: orderMock });
      eqMock.mockReturnValue({ eq: eqMock, order: orderMock });

      const result = await getTLTasks(workspaceId, userId);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expect.objectContaining({
        id: 'task-1',
        title: 'Task 1',
        status: 'submitted',
        can_modify_submission: true
      }));
      expect(result[1]).toEqual(expect.objectContaining({
        id: 'task-2',
        title: 'Task 2',
        status: 'in_progress',
        can_modify_submission: false
      }));
      expect(selectMock).toHaveBeenCalledWith(expect.stringContaining('id'));
      expect(eqMock).toHaveBeenCalledWith('workspace_id', workspaceId);
      expect(eqMock).toHaveBeenCalledWith('assigned_to', userId);
      expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should handle database errors', async () => {
      const workspaceId = 'workspace-123';
      const userId = 'user-123';

      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const orderMock = vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Database error')
      });

      supabase.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        order: orderMock
      });

      selectMock.mockReturnValue({ eq: eqMock, order: orderMock });
      eqMock.mockReturnValue({ eq: eqMock, order: orderMock });

      await expect(getTLTasks(workspaceId, userId)).rejects.toThrow('Database error');
    });

    it('should return empty array when no tasks found', async () => {
      const workspaceId = 'workspace-123';
      const userId = 'user-123';

      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const orderMock = vi.fn().mockResolvedValue({
        data: [],
        error: null
      });

      supabase.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        order: orderMock
      });

      selectMock.mockReturnValue({ eq: eqMock, order: orderMock });
      eqMock.mockReturnValue({ eq: eqMock, order: orderMock });

      const result = await getTLTasks(workspaceId, userId);

      expect(result).toEqual([]);
    });
  });

  describe('submitReview', () => {
    const mockTask = {
      status: 'submitted',
      assigned_to: 'task-owner-456',
      workspace_id: 'workspace-123'
    };

    const mockMembership = {
      id: 'membership-123'
    };

    beforeEach(() => {
      // Reset mocks for each test
      vi.clearAllMocks();
      
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });
    });

    it('should successfully approve a task', async () => {
      const taskId = 'task-123';
      const action = 'approve';
      const comments = 'Great work!';

      // Mock task fetch
      const taskSelectMock = vi.fn().mockReturnThis();
      const taskEqMock = vi.fn().mockReturnThis();
      const taskSingleMock = vi.fn().mockResolvedValue({
        data: mockTask,
        error: null
      });

      // Mock membership check
      const memberSelectMock = vi.fn().mockReturnThis();
      const memberEqMock = vi.fn().mockReturnThis();
      const memberSingleMock = vi.fn().mockResolvedValue({
        data: mockMembership,
        error: null
      });

      // Mock review insertion
      const reviewInsertMock = vi.fn().mockResolvedValue({ error: null });

      // Mock task update
      const taskUpdateMock = vi.fn().mockReturnThis();
      const taskUpdateEqMock = vi.fn().mockResolvedValue({ error: null });

      let callCount = 0;
      supabase.from.mockImplementation((table) => {
        callCount++;
        if (table === 'tasks' && callCount === 1) {
          taskSelectMock.mockReturnValue({ eq: taskEqMock, single: taskSingleMock });
          taskEqMock.mockReturnValue({ single: taskSingleMock });
          return { select: taskSelectMock, eq: taskEqMock, single: taskSingleMock };
        } else if (table === 'workspace_members') {
          memberSelectMock.mockReturnValue({ eq: memberEqMock, single: memberSingleMock });
          memberEqMock.mockReturnValue({ eq: memberEqMock, single: memberSingleMock });
          return { select: memberSelectMock, eq: memberEqMock, single: memberSingleMock };
        } else if (table === 'task_reviews') {
          return { insert: reviewInsertMock };
        } else if (table === 'tasks' && callCount > 1) {
          taskUpdateMock.mockReturnValue({ eq: taskUpdateEqMock });
          return { update: taskUpdateMock, eq: taskUpdateEqMock };
        }
      });

      const result = await submitReview(taskId, action, comments);

      expect(result.success).toBe(true);
      expect(reviewInsertMock).toHaveBeenCalledWith(expect.objectContaining({
        task_id: taskId,
        reviewer_id: mockUser.id,
        action: 'approve',
        comments: 'Great work!'
      }));
      expect(taskUpdateMock).toHaveBeenCalledWith(expect.objectContaining({
        status: 'completed',
        reviewed_by: mockUser.id,
        review_comments: 'Great work!',
        completed_at: expect.any(String)
      }));
    });

    it('should successfully request redo for a task', async () => {
      const taskId = 'task-123';
      const action = 'request_redo';
      const comments = 'Please fix the formatting';

      // Mock task fetch
      const taskSelectMock = vi.fn().mockReturnThis();
      const taskEqMock = vi.fn().mockReturnThis();
      const taskSingleMock = vi.fn().mockResolvedValue({
        data: mockTask,
        error: null
      });

      // Mock membership check
      const memberSelectMock = vi.fn().mockReturnThis();
      const memberEqMock = vi.fn().mockReturnThis();
      const memberSingleMock = vi.fn().mockResolvedValue({
        data: mockMembership,
        error: null
      });

      // Mock review insertion
      const reviewInsertMock = vi.fn().mockResolvedValue({ error: null });

      // Mock task update
      const taskUpdateMock = vi.fn().mockReturnThis();
      const taskUpdateEqMock = vi.fn().mockResolvedValue({ error: null });

      let callCount = 0;
      supabase.from.mockImplementation((table) => {
        callCount++;
        if (table === 'tasks' && callCount === 1) {
          taskSelectMock.mockReturnValue({ eq: taskEqMock, single: taskSingleMock });
          taskEqMock.mockReturnValue({ single: taskSingleMock });
          return { select: taskSelectMock, eq: taskEqMock, single: taskSingleMock };
        } else if (table === 'workspace_members') {
          memberSelectMock.mockReturnValue({ eq: memberEqMock, single: memberSingleMock });
          memberEqMock.mockReturnValue({ eq: memberEqMock, single: memberSingleMock });
          return { select: memberSelectMock, eq: memberEqMock, single: memberSingleMock };
        } else if (table === 'task_reviews') {
          return { insert: reviewInsertMock };
        } else if (table === 'tasks' && callCount > 1) {
          taskUpdateMock.mockReturnValue({ eq: taskUpdateEqMock });
          return { update: taskUpdateMock, eq: taskUpdateEqMock };
        }
      });

      const result = await submitReview(taskId, action, comments);

      expect(result.success).toBe(true);
      expect(taskUpdateMock).toHaveBeenCalledWith(expect.objectContaining({
        status: 'needs_revision',
        reviewed_by: mockUser.id,
        review_comments: 'Please fix the formatting'
      }));
      expect(taskUpdateMock).toHaveBeenCalledWith(expect.not.objectContaining({
        completed_at: expect.any(String)
      }));
    });

    it('should throw error for invalid action', async () => {
      const taskId = 'task-123';
      const action = 'invalid_action';

      await expect(submitReview(taskId, action)).rejects.toThrow(
        'Invalid review action. Must be "approve" or "request_redo"'
      );
    });

    it('should throw error if user is not logged in', async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      await expect(submitReview('task-123', 'approve')).rejects.toThrow(
        'You must be logged in to submit reviews'
      );
    });

    it('should throw error if task is not in submitted status', async () => {
      const taskId = 'task-123';
      const action = 'approve';

      const mockTaskNotSubmitted = {
        ...mockTask,
        status: 'in_progress'
      };

      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({
        data: mockTaskNotSubmitted,
        error: null
      });

      supabase.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        single: singleMock
      });

      selectMock.mockReturnValue({ eq: eqMock, single: singleMock });
      eqMock.mockReturnValue({ single: singleMock });

      await expect(submitReview(taskId, action)).rejects.toThrow(
        'Can only review tasks that are submitted'
      );
    });

    it('should throw error if user tries to review their own task', async () => {
      const taskId = 'task-123';
      const action = 'approve';

      const mockOwnTask = {
        ...mockTask,
        assigned_to: 'user-123' // Same as mockUser.id
      };

      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({
        data: mockOwnTask,
        error: null
      });

      supabase.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        single: singleMock
      });

      selectMock.mockReturnValue({ eq: eqMock, single: singleMock });
      eqMock.mockReturnValue({ single: singleMock });

      await expect(submitReview(taskId, action)).rejects.toThrow(
        'You cannot review your own task'
      );
    });

    it('should throw error if user is not a workspace member', async () => {
      const taskId = 'task-123';
      const action = 'approve';

      // Mock task fetch
      const taskSelectMock = vi.fn().mockReturnThis();
      const taskEqMock = vi.fn().mockReturnThis();
      const taskSingleMock = vi.fn().mockResolvedValue({
        data: mockTask,
        error: null
      });

      // Mock membership check failure
      const memberSelectMock = vi.fn().mockReturnThis();
      const memberEqMock = vi.fn().mockReturnThis();
      const memberSingleMock = vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Not found')
      });

      supabase.from.mockImplementation((table) => {
        if (table === 'tasks') {
          taskSelectMock.mockReturnValue({ eq: taskEqMock, single: taskSingleMock });
          taskEqMock.mockReturnValue({ single: taskSingleMock });
          return { select: taskSelectMock, eq: taskEqMock, single: taskSingleMock };
        } else if (table === 'workspace_members') {
          memberSelectMock.mockReturnValue({ eq: memberEqMock, single: memberSingleMock });
          memberEqMock.mockReturnValue({ eq: memberEqMock, single: memberSingleMock });
          return { select: memberSelectMock, eq: memberEqMock, single: memberSingleMock };
        }
      });

      await expect(submitReview(taskId, action)).rejects.toThrow(
        'You must be a workspace member to review tasks'
      );
    });
  });
});

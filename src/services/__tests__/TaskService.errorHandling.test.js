import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../supabaseClient';
import {
  deleteSubmission,
  reuploadSubmission,
  revokeTaskAssignment,
  submitReview,
} from '../TaskService';
import {
  TaskManagementError,
  ERROR_CODES,
  ERROR_TYPES,
} from '../../utils/errorHandling';

// Mock supabase
vi.mock('../../supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(),
      })),
      insert: vi.fn(),
    })),
    storage: {
      from: vi.fn(() => ({
        remove: vi.fn(),
        upload: vi.fn(),
      })),
    },
  },
}));

// Mock error handling utilities
vi.mock('../../utils/errorHandling', async () => {
  const actual = await vi.importActual('../../utils/errorHandling');
  return {
    ...actual,
    logError: vi.fn(),
    retryOperation: vi.fn((operation) => operation()),
  };
});

describe('TaskService Error Handling', () => {
  const mockUser = { id: 'user-1' };
  const mockTask = {
    id: 'task-1',
    status: 'submitted',
    assigned_to: 'user-1',
    assigned_by: 'user-2',
    workspace_id: 'workspace-1',
    submission_file_url: 'path/to/file.pdf',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
  });

  describe('deleteSubmission', () => {
    it('should handle authentication errors', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('Auth error') });

      await expect(deleteSubmission('task-1')).rejects.toThrow(TaskManagementError);
      await expect(deleteSubmission('task-1')).rejects.toThrow('You must be logged in to delete submissions');
    });

    it('should handle task not found', async () => {
      supabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
          })),
        })),
      });

      await expect(deleteSubmission('task-1')).rejects.toThrow(TaskManagementError);
    });

    it('should validate task permissions', async () => {
      const taskWithDifferentAssignee = { ...mockTask, assigned_to: 'other-user' };
      
      supabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: taskWithDifferentAssignee, error: null }),
          })),
        })),
      });

      await expect(deleteSubmission('task-1')).rejects.toThrow(TaskManagementError);
      await expect(deleteSubmission('task-1')).rejects.toThrow('You can only modify tasks assigned to you');
    });

    it('should validate task status', async () => {
      const taskWithWrongStatus = { ...mockTask, status: 'completed' };
      
      supabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: taskWithWrongStatus, error: null }),
          })),
        })),
      });

      await expect(deleteSubmission('task-1')).rejects.toThrow(TaskManagementError);
    });

    it('should handle storage deletion errors gracefully', async () => {
      supabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockTask, error: null }),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });

      supabase.storage.from.mockReturnValue({
        remove: vi.fn().mockResolvedValue({ error: new Error('Storage error') }),
      });

      // Should not throw error, should continue with database update
      const result = await deleteSubmission('task-1');
      expect(result.success).toBe(true);
    });

    it('should handle database update errors', async () => {
      supabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockTask, error: null }),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: new Error('Database error') }),
        })),
      });

      supabase.storage.from.mockReturnValue({
        remove: vi.fn().mockResolvedValue({ error: null }),
      });

      await expect(deleteSubmission('task-1')).rejects.toThrow(TaskManagementError);
    });

    it('should succeed with valid permissions and status', async () => {
      supabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockTask, error: null }),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });

      supabase.storage.from.mockReturnValue({
        remove: vi.fn().mockResolvedValue({ error: null }),
      });

      const result = await deleteSubmission('task-1');
      expect(result.success).toBe(true);
    });
  });

  describe('reuploadSubmission', () => {
    const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });

    it('should validate file before upload', async () => {
      const { validateFileEnhanced } = await import('../../utils/errorHandling');
      
      vi.mocked(validateFileEnhanced).mockReturnValue({
        isValid: false,
        error: new TaskManagementError('File too large', ERROR_CODES.FILE_TOO_LARGE),
      });

      await expect(reuploadSubmission('task-1', mockFile, 'workspace-1')).rejects.toThrow('File too large');
    });

    it('should handle upload errors with retry logic', async () => {
      const { validateFileEnhanced, retryOperation } = await import('../../utils/errorHandling');
      
      vi.mocked(validateFileEnhanced).mockReturnValue({ isValid: true, error: null });
      
      supabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockTask, error: null }),
          })),
        })),
      });

      const uploadError = new Error('Upload failed');
      supabase.storage.from.mockReturnValue({
        remove: vi.fn().mockResolvedValue({ error: null }),
        upload: vi.fn().mockResolvedValue({ error: uploadError }),
      });

      vi.mocked(retryOperation).mockRejectedValue(new TaskManagementError('Upload failed', ERROR_CODES.UPLOAD_FAILED));

      await expect(reuploadSubmission('task-1', mockFile, 'workspace-1')).rejects.toThrow('Upload failed');
      expect(retryOperation).toHaveBeenCalled();
    });

    it('should handle duplicate file errors', async () => {
      const { validateFileEnhanced } = await import('../../utils/errorHandling');
      
      vi.mocked(validateFileEnhanced).mockReturnValue({ isValid: true, error: null });
      
      supabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockTask, error: null }),
          })),
        })),
      });

      const duplicateError = new Error('duplicate');
      supabase.storage.from.mockReturnValue({
        remove: vi.fn().mockResolvedValue({ error: null }),
        upload: vi.fn().mockResolvedValue({ error: duplicateError }),
      });

      await expect(reuploadSubmission('task-1', mockFile, 'workspace-1')).rejects.toThrow(TaskManagementError);
    });

    it('should handle permission errors', async () => {
      const { validateFileEnhanced } = await import('../../utils/errorHandling');
      
      vi.mocked(validateFileEnhanced).mockReturnValue({ isValid: true, error: null });
      
      supabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockTask, error: null }),
          })),
        })),
      });

      const permissionError = new Error('policy violation');
      supabase.storage.from.mockReturnValue({
        remove: vi.fn().mockResolvedValue({ error: null }),
        upload: vi.fn().mockResolvedValue({ error: permissionError }),
      });

      await expect(reuploadSubmission('task-1', mockFile, 'workspace-1')).rejects.toThrow(TaskManagementError);
    });

    it('should succeed with valid file and permissions', async () => {
      const { validateFileEnhanced } = await import('../../utils/errorHandling');
      
      vi.mocked(validateFileEnhanced).mockReturnValue({ isValid: true, error: null });
      
      supabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockTask, error: null }),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });

      supabase.storage.from.mockReturnValue({
        remove: vi.fn().mockResolvedValue({ error: null }),
        upload: vi.fn().mockResolvedValue({ data: { path: 'new/path.pdf' }, error: null }),
      });

      const result = await reuploadSubmission('task-1', mockFile, 'workspace-1');
      expect(result.success).toBe(true);
    });
  });

  describe('revokeTaskAssignment', () => {
    it('should validate team lead permissions', async () => {
      const taskWithDifferentAssigner = { ...mockTask, assigned_by: 'other-user' };
      
      supabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: taskWithDifferentAssigner, error: null }),
          })),
        })),
      });

      await expect(revokeTaskAssignment('task-1')).rejects.toThrow(TaskManagementError);
      await expect(revokeTaskAssignment('task-1')).rejects.toThrow('Only the team lead who assigned the task can revoke it');
    });

    it('should prevent revoking completed tasks', async () => {
      const completedTask = { ...mockTask, status: 'completed', assigned_by: 'user-1' };
      
      supabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: completedTask, error: null }),
          })),
        })),
      });

      await expect(revokeTaskAssignment('task-1')).rejects.toThrow(TaskManagementError);
    });

    it('should succeed with valid permissions', async () => {
      const validTask = { ...mockTask, assigned_by: 'user-1', status: 'in_progress' };
      
      supabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: validTask, error: null }),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });

      const result = await revokeTaskAssignment('task-1');
      expect(result.success).toBe(true);
    });
  });

  describe('submitReview', () => {
    it('should validate review action', async () => {
      await expect(submitReview('task-1', 'invalid_action')).rejects.toThrow(TaskManagementError);
      await expect(submitReview('task-1', 'invalid_action')).rejects.toThrow('Invalid review action');
    });

    it('should prevent self-review', async () => {
      const selfAssignedTask = { ...mockTask, assigned_to: 'user-1' };
      
      supabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: selfAssignedTask, error: null }),
          })),
        })),
      });

      await expect(submitReview('task-1', 'approve')).rejects.toThrow(TaskManagementError);
      await expect(submitReview('task-1', 'approve')).rejects.toThrow('You cannot review your own task');
    });

    it('should validate workspace membership', async () => {
      const otherUserTask = { ...mockTask, assigned_to: 'other-user' };
      
      supabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: otherUserTask, error: null }),
          })),
        })),
      }).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
            })),
          })),
        })),
      });

      await expect(submitReview('task-1', 'approve')).rejects.toThrow(TaskManagementError);
      await expect(submitReview('task-1', 'approve')).rejects.toThrow('You must be a workspace member to review tasks');
    });

    it('should handle review insertion errors', async () => {
      const otherUserTask = { ...mockTask, assigned_to: 'other-user' };
      
      supabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: otherUserTask, error: null }),
          })),
        })),
      }).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { id: 'membership-1' }, error: null }),
            })),
          })),
        })),
        insert: vi.fn().mockResolvedValue({ error: new Error('Insert failed') }),
      });

      await expect(submitReview('task-1', 'approve')).rejects.toThrow(TaskManagementError);
    });

    it('should succeed with valid review', async () => {
      const otherUserTask = { ...mockTask, assigned_to: 'other-user' };
      
      supabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: otherUserTask, error: null }),
          })),
        })),
      }).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { id: 'membership-1' }, error: null }),
            })),
          })),
        })),
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });

      const result = await submitReview('task-1', 'approve', 'Good work!');
      expect(result.success).toBe(true);
    });

    it('should set completed_at for approved tasks', async () => {
      const otherUserTask = { ...mockTask, assigned_to: 'other-user' };
      const mockUpdate = vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }));
      
      supabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: otherUserTask, error: null }),
          })),
        })),
      }).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { id: 'membership-1' }, error: null }),
            })),
          })),
        })),
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: mockUpdate,
      });

      await submitReview('task-1', 'approve');
      
      expect(mockUpdate).toHaveBeenCalled();
      const updateCall = mockUpdate.mock.calls[0][0];
      expect(updateCall.status).toBe('completed');
      expect(updateCall.completed_at).toBeDefined();
    });

    it('should not set completed_at for revision requests', async () => {
      const otherUserTask = { ...mockTask, assigned_to: 'other-user' };
      const mockUpdate = vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }));
      
      supabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: otherUserTask, error: null }),
          })),
        })),
      }).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { id: 'membership-1' }, error: null }),
            })),
          })),
        })),
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: mockUpdate,
      });

      await submitReview('task-1', 'request_redo');
      
      expect(mockUpdate).toHaveBeenCalled();
      const updateCall = mockUpdate.mock.calls[0][0];
      expect(updateCall.status).toBe('needs_revision');
      expect(updateCall.completed_at).toBeUndefined();
    });
  });

  describe('Error Logging', () => {
    it('should log errors with context', async () => {
      const { logError } = await import('../../utils/errorHandling');
      
      supabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
          })),
        })),
      });

      try {
        await deleteSubmission('task-1');
      } catch (error) {
        // Error should be logged
      }

      expect(logError).toHaveBeenCalledWith(
        expect.any(TaskManagementError),
        expect.objectContaining({
          operation: 'delete_submission',
          taskId: 'task-1',
        })
      );
    });
  });
});
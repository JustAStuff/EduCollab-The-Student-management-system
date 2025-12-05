/**
 * Member Re-submission Service Layer Tests
 * 
 * Tests the service layer functions for member re-submission,
 * ensuring proper permission validation and error handling.
 */

import { vi } from 'vitest';
import { deleteSubmission, reuploadSubmission } from '../services/TaskService';
import { validateTaskPermissions, validateTaskStatus, TaskManagementError, ERROR_CODES } from '../utils/errorHandling';
import { supabase } from '../supabaseClient';

// Mock dependencies
vi.mock('../supabaseClient');
vi.mock('../utils/errorHandling');
vi.mock('../utils/securityValidation');

describe('Member Re-submission Service Layer', () => {
  const mockUser = { id: 'user-123' };
  const mockTask = {
    id: 'task-456',
    workspace_id: 'workspace-789',
    assigned_to: 'user-123',
    status: 'submitted',
    submission_file_url: 'path/to/file.pdf',
    submission_file_name: 'test-file.pdf',
    submission_file_size: 1024
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful auth
    supabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    // Mock successful task fetch
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockTask,
            error: null
          })
        })
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null
        })
      })
    });

    // Mock successful storage operations
    supabase.storage = {
      from: vi.fn().mockReturnValue({
        remove: vi.fn().mockResolvedValue({ error: null }),
        upload: vi.fn().mockResolvedValue({
          data: { path: 'new/path/file.pdf' },
          error: null
        })
      })
    };

    // Mock successful validation by default
    validateTaskPermissions.mockReturnValue({ isValid: true, error: null });
    validateTaskStatus.mockReturnValue({ isValid: true, error: null });
  });

  describe('deleteSubmission', () => {
    test('should successfully delete submission for regular member', async () => {
      const result = await deleteSubmission('task-456', 'csrf-token');
      
      expect(result).toEqual({ success: true });
      expect(supabase.storage.from).toHaveBeenCalledWith('task-submissions');
    });

    test('should reject deletion for workspace owner', async () => {
      // Mock workspace owner role check
      const getUserWorkspaceRole = vi.fn().mockResolvedValue('owner');
      
      // Import and mock the function
      const TaskService = await import('../services/TaskService');
      TaskService.getUserWorkspaceRole = getUserWorkspaceRole;

      await expect(deleteSubmission('task-456', 'csrf-token'))
        .rejects.toThrow('Workspace owners cannot modify their own submissions');
    });

    test('should reject deletion for non-assignee', async () => {
      const nonAssigneeTask = { ...mockTask, assigned_to: 'other-user' };
      
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: nonAssigneeTask,
              error: null
            })
          })
        })
      });

      await expect(deleteSubmission('task-456', 'csrf-token'))
        .rejects.toThrow('Only the task assignee can delete submissions');
    });

    test('should reject deletion for non-submitted task', async () => {
      const inProgressTask = { ...mockTask, status: 'in_progress' };
      
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: inProgressTask,
              error: null
            })
          })
        })
      });

      validateTaskStatus.mockReturnValue({
        isValid: false,
        error: new TaskManagementError(
          'You can only delete submissions for tasks under review',
          ERROR_CODES.INVALID_TASK_STATUS
        )
      });

      await expect(deleteSubmission('task-456', 'csrf-token'))
        .rejects.toThrow('You can only delete submissions for tasks under review');
    });

    test('should handle invalid CSRF token', async () => {
      // Mock CSRF validation failure
      const { validateCSRFToken } = await import('../utils/securityValidation');
      validateCSRFToken.mockReturnValue(false);

      await expect(deleteSubmission('task-456', 'invalid-token'))
        .rejects.toThrow('Invalid security token');
    });

    test('should handle unauthenticated user', async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      });

      await expect(deleteSubmission('task-456', 'csrf-token'))
        .rejects.toThrow('You must be logged in to delete submissions');
    });
  });

  describe('reuploadSubmission', () => {
    const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });

    test('should successfully re-upload submission for regular member', async () => {
      const result = await reuploadSubmission('task-456', mockFile, 'workspace-789', 'csrf-token');
      
      expect(result).toEqual({ success: true });
      expect(supabase.storage.from).toHaveBeenCalledWith('task-submissions');
    });

    test('should reject re-upload for workspace owner', async () => {
      // Mock workspace owner role check
      const getUserWorkspaceRole = vi.fn().mockResolvedValue('owner');
      
      // Import and mock the function
      const TaskService = await import('../services/TaskService');
      TaskService.getUserWorkspaceRole = getUserWorkspaceRole;

      await expect(reuploadSubmission('task-456', mockFile, 'workspace-789', 'csrf-token'))
        .rejects.toThrow('Workspace owners cannot modify their own submissions');
    });

    test('should reject re-upload for non-assignee', async () => {
      const nonAssigneeTask = { ...mockTask, assigned_to: 'other-user' };
      
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: nonAssigneeTask,
              error: null
            })
          })
        })
      });

      await expect(reuploadSubmission('task-456', mockFile, 'workspace-789', 'csrf-token'))
        .rejects.toThrow('Only the task assignee can re-upload submissions');
    });

    test('should validate file before upload', async () => {
      const { validateFileServerSide } = await import('../utils/securityValidation');
      validateFileServerSide.mockResolvedValue({
        isValid: false,
        error: 'File too large'
      });

      await expect(reuploadSubmission('task-456', mockFile, 'workspace-789', 'csrf-token'))
        .rejects.toThrow('File too large');
    });

    test('should handle storage upload failure', async () => {
      supabase.storage.from.mockReturnValue({
        remove: vi.fn().mockResolvedValue({ error: null }),
        upload: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Upload failed' }
        })
      });

      await expect(reuploadSubmission('task-456', mockFile, 'workspace-789', 'csrf-token'))
        .rejects.toThrow();
    });

    test('should handle database update failure', async () => {
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockTask,
              error: null
            })
          })
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: { message: 'Database update failed' }
          })
        })
      });

      await expect(reuploadSubmission('task-456', mockFile, 'workspace-789', 'csrf-token'))
        .rejects.toThrow();
    });

    test('should clean up old file before uploading new one', async () => {
      const removeFileMock = vi.fn().mockResolvedValue({ error: null });
      
      supabase.storage.from.mockReturnValue({
        remove: removeFileMock,
        upload: vi.fn().mockResolvedValue({
          data: { path: 'new/path/file.pdf' },
          error: null
        })
      });

      await reuploadSubmission('task-456', mockFile, 'workspace-789', 'csrf-token');
      
      expect(removeFileMock).toHaveBeenCalledWith(['path/to/file.pdf']);
    });
  });

  describe('Permission Validation Integration', () => {
    test('should properly validate workspace owner permissions', async () => {
      // Test that the permission validation correctly identifies workspace owners
      const ownerTask = { ...mockTask, assigned_to: 'owner-123' };
      
      validateTaskPermissions.mockReturnValue({
        isValid: false,
        error: new TaskManagementError(
          'Workspace owners cannot modify their own submissions',
          ERROR_CODES.CANNOT_REVIEW_OWN_TASK
        )
      });

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: ownerTask,
              error: null
            })
          })
        })
      });

      await expect(deleteSubmission('task-456', 'csrf-token'))
        .rejects.toThrow('Workspace owners cannot modify their own submissions');
    });

    test('should allow regular members to modify their submissions', async () => {
      // Ensure regular members can modify their submissions
      const memberTask = { ...mockTask, assigned_to: 'member-123' };
      
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: memberTask,
              error: null
            })
          })
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null
          })
        })
      });

      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'member-123' } },
        error: null
      });

      const result = await deleteSubmission('task-456', 'csrf-token');
      expect(result).toEqual({ success: true });
    });
  });
});
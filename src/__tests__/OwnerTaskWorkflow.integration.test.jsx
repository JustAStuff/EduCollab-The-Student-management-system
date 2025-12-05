/**
 * Integration tests for workspace owner task workflow
 * Tests the complete workflow from task assignment to completion for workspace owners
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { supabase } from '../supabaseClient';
import TaskCard from '../components/tasks/TaskCard';
import { validateTaskPermissions, validateTaskStatus } from '../utils/errorHandling';
import { startTask, uploadTaskFile, deleteSubmission, reuploadSubmission } from '../services/TaskService';

// Mock Supabase
vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn()
      })),
      insert: vi.fn()
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        remove: vi.fn(),
        download: vi.fn()
      }))
    }
  }
}));

// Mock security validation
vi.mock('../utils/securityValidation', () => ({
  validateFileServerSide: vi.fn(() => Promise.resolve({ isValid: true })),
  checkUploadRateLimit: vi.fn(() => true),
  validateCSRFToken: vi.fn(() => true),
  auditLog: vi.fn(() => Promise.resolve()),
  sanitizeFilename: vi.fn((name) => name),
  validateWorkspacePermissions: vi.fn(() => Promise.resolve({ isValid: true })),
  generateCSRFToken: vi.fn(() => 'test-csrf-token')
}));

describe('Owner Task Workflow Integration Tests', () => {
  const mockUser = {
    id: 'owner-user-id',
    email: 'owner@test.com'
  };

  const mockWorkspace = {
    id: 'workspace-id',
    created_by: 'owner-user-id',
    name: 'Test Workspace'
  };

  const mockTask = {
    id: 'task-id',
    title: 'Test Task',
    description: 'Test task description',
    status: 'todo',
    assigned_to: 'owner-user-id',
    assigned_by: 'owner-user-id',
    workspace_id: 'workspace-id',
    created_at: '2024-01-01T00:00:00Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful auth
    supabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    // Mock CSRF token in session storage
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: vi.fn(() => 'test-csrf-token'),
        setItem: vi.fn()
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Task Permission Validation', () => {
    it('should allow workspace owners to manage their own tasks', () => {
      const result = validateTaskPermissions(
        mockTask,
        mockUser.id,
        'start',
        'owner'
      );

      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should allow workspace owners to upload to their tasks', () => {
      const result = validateTaskPermissions(
        { ...mockTask, status: 'in_progress' },
        mockUser.id,
        'upload',
        'owner'
      );

      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should allow workspace owners to delete their submissions', () => {
      const result = validateTaskPermissions(
        { ...mockTask, status: 'submitted' },
        mockUser.id,
        'delete_submission',
        'owner'
      );

      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should allow workspace owners to revoke task assignments', () => {
      const taskAssignedToOther = {
        ...mockTask,
        assigned_to: 'other-user-id',
        assigned_by: mockUser.id
      };

      const result = validateTaskPermissions(
        taskAssignedToOther,
        mockUser.id,
        'revoke',
        'owner'
      );

      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  describe('Task Status Validation for Owners', () => {
    it('should allow owners to start their tasks from any status except completed', () => {
      // Test starting from todo
      let result = validateTaskStatus(
        { ...mockTask, status: 'todo' },
        'start',
        mockUser.id,
        'owner'
      );
      expect(result.isValid).toBe(true);

      // Test starting from needs_revision
      result = validateTaskStatus(
        { ...mockTask, status: 'needs_revision' },
        'start',
        mockUser.id,
        'owner'
      );
      expect(result.isValid).toBe(true);

      // Test starting from in_progress (should be allowed for owners)
      result = validateTaskStatus(
        { ...mockTask, status: 'in_progress' },
        'start',
        mockUser.id,
        'owner'
      );
      expect(result.isValid).toBe(true);

      // Test starting from completed (should not be allowed)
      result = validateTaskStatus(
        { ...mockTask, status: 'completed' },
        'start',
        mockUser.id,
        'owner'
      );
      expect(result.isValid).toBe(false);
    });

    it('should allow owners to upload to their tasks in any status except completed', () => {
      // Test uploading to in_progress
      let result = validateTaskStatus(
        { ...mockTask, status: 'in_progress' },
        'upload',
        mockUser.id,
        'owner'
      );
      expect(result.isValid).toBe(true);

      // Test uploading to submitted (should be allowed for owners)
      result = validateTaskStatus(
        { ...mockTask, status: 'submitted' },
        'upload',
        mockUser.id,
        'owner'
      );
      expect(result.isValid).toBe(true);

      // Test uploading to completed (should not be allowed)
      result = validateTaskStatus(
        { ...mockTask, status: 'completed' },
        'upload',
        mockUser.id,
        'owner'
      );
      expect(result.isValid).toBe(false);
    });

    it('should allow owners to modify submissions unless task is completed', () => {
      // Test deleting submission from submitted
      let result = validateTaskStatus(
        { ...mockTask, status: 'submitted' },
        'delete_submission',
        mockUser.id,
        'owner'
      );
      expect(result.isValid).toBe(true);

      // Test re-uploading submission from submitted
      result = validateTaskStatus(
        { ...mockTask, status: 'submitted' },
        'reupload_submission',
        mockUser.id,
        'owner'
      );
      expect(result.isValid).toBe(true);

      // Test modifying completed task (should not be allowed)
      result = validateTaskStatus(
        { ...mockTask, status: 'completed' },
        'delete_submission',
        mockUser.id,
        'owner'
      );
      expect(result.isValid).toBe(false);
    });
  });

  describe('TaskCard Component for Owners', () => {
    it('should render action buttons for workspace owners on their tasks', () => {
      render(
        <TaskCard
          task={mockTask}
          userRole="tm"
          workspaceRole="owner"
          currentUserId={mockUser.id}
          onStatusChange={vi.fn()}
          onUpload={vi.fn()}
        />
      );

      // Should show start button for todo task
      expect(screen.getByText('Start Task')).toBeInTheDocument();
    });

    it('should show upload button for owners on in-progress tasks', () => {
      const inProgressTask = { ...mockTask, status: 'in_progress' };
      
      render(
        <TaskCard
          task={inProgressTask}
          userRole="tm"
          workspaceRole="owner"
          currentUserId={mockUser.id}
          onStatusChange={vi.fn()}
          onUpload={vi.fn()}
        />
      );

      expect(screen.getByText('Upload Result')).toBeInTheDocument();
    });

    it('should show update submission button for owners on submitted tasks', () => {
      const submittedTask = { ...mockTask, status: 'submitted' };
      
      render(
        <TaskCard
          task={submittedTask}
          userRole="tm"
          workspaceRole="owner"
          currentUserId={mockUser.id}
          onStatusChange={vi.fn()}
          onUpload={vi.fn()}
        />
      );

      expect(screen.getByText('Update Submission')).toBeInTheDocument();
    });

    it('should not show submission management buttons for owners', () => {
      const submittedTask = { ...mockTask, status: 'submitted' };
      
      render(
        <TaskCard
          task={submittedTask}
          userRole="tm"
          workspaceRole="owner"
          currentUserId={mockUser.id}
          onDeleteSubmission={vi.fn()}
          onReuploadSubmission={vi.fn()}
        />
      );

      // Owners should not see the separate delete/reupload buttons
      // They should use the main action button instead
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    });

    it('should show review buttons for owners reviewing others tasks', () => {
      const otherUserTask = {
        ...mockTask,
        assigned_to: 'other-user-id',
        status: 'submitted',
        submission_file_url: 'test-file.pdf'
      };
      
      render(
        <TaskCard
          task={otherUserTask}
          userRole="tl"
          workspaceRole="owner"
          currentUserId={mockUser.id}
          onReview={vi.fn()}
          onViewSubmission={vi.fn()}
          onDownloadSubmission={vi.fn()}
        />
      );

      expect(screen.getByText('Approve')).toBeInTheDocument();
      expect(screen.getByText('Request Redo')).toBeInTheDocument();
    });
  });

  describe('Service Function Integration', () => {
    it('should successfully start a task for workspace owner', async () => {
      // Mock successful task fetch with proper chaining
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockTask,
            error: null
          })
        })
      });
      
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null
        })
      });

      supabase.from.mockReturnValue({
        select: mockSelect,
        update: mockUpdate
      });

      const result = await startTask(mockTask.id, 'test-csrf-token');
      expect(result.success).toBe(true);
    });

    it('should successfully upload file for workspace owner', async () => {
      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      
      // Mock successful task fetch
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...mockTask, status: 'in_progress' },
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

      // Mock successful file upload
      supabase.storage.from.mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          data: { path: 'test-path' },
          error: null
        })
      });

      const result = await uploadTaskFile(
        mockTask.id,
        mockFile,
        mockWorkspace.id,
        'test-csrf-token'
      );
      
      expect(result.success).toBe(true);
    });

    it('should successfully delete submission for workspace owner', async () => {
      const submittedTask = {
        ...mockTask,
        status: 'submitted',
        submission_file_url: 'test-file-path'
      };

      // Mock successful task fetch
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: submittedTask,
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

      // Mock successful file deletion
      supabase.storage.from.mockReturnValue({
        remove: vi.fn().mockResolvedValue({
          error: null
        })
      });

      const result = await deleteSubmission(submittedTask.id, 'test-csrf-token');
      expect(result.success).toBe(true);
    });

    it('should successfully reupload submission for workspace owner', async () => {
      const mockFile = new File(['new content'], 'new-test.pdf', { type: 'application/pdf' });
      const submittedTask = {
        ...mockTask,
        status: 'submitted',
        submission_file_url: 'old-file-path'
      };

      // Mock successful task fetch
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: submittedTask,
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

      // Mock successful file operations
      supabase.storage.from.mockReturnValue({
        remove: vi.fn().mockResolvedValue({ error: null }),
        upload: vi.fn().mockResolvedValue({
          data: { path: 'new-test-path' },
          error: null
        })
      });

      const result = await reuploadSubmission(
        submittedTask.id,
        mockFile,
        mockWorkspace.id,
        'test-csrf-token'
      );
      
      expect(result.success).toBe(true);
    });
  });

  describe('Complete Workflow Test', () => {
    it('should complete full owner task workflow from start to completion', async () => {
      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      
      // Step 1: Start task
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

      let result = await startTask(mockTask.id, 'test-csrf-token');
      expect(result.success).toBe(true);

      // Step 2: Upload file
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...mockTask, status: 'in_progress' },
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

      supabase.storage.from.mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          data: { path: 'test-path' },
          error: null
        })
      });

      result = await uploadTaskFile(
        mockTask.id,
        mockFile,
        mockWorkspace.id,
        'test-csrf-token'
      );
      expect(result.success).toBe(true);

      // Step 3: Verify task can be modified (delete submission)
      const submittedTask = {
        ...mockTask,
        status: 'submitted',
        submission_file_url: 'test-path'
      };

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: submittedTask,
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

      supabase.storage.from.mockReturnValue({
        remove: vi.fn().mockResolvedValue({
          error: null
        })
      });

      result = await deleteSubmission(submittedTask.id, 'test-csrf-token');
      expect(result.success).toBe(true);

      // Step 4: Re-upload with new file
      const newFile = new File(['updated content'], 'updated.pdf', { type: 'application/pdf' });
      
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...mockTask, status: 'in_progress' },
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

      supabase.storage.from.mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          data: { path: 'updated-path' },
          error: null
        })
      });

      result = await uploadTaskFile(
        mockTask.id,
        newFile,
        mockWorkspace.id,
        'test-csrf-token'
      );
      expect(result.success).toBe(true);

      console.log('✅ Complete owner task workflow test passed');
    });
  });
});
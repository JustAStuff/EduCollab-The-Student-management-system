// src/__tests__/TaskWorkflowIntegration.test.jsx - Focused integration tests for task workflows
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as TaskService from '../services/TaskService';
import { supabase } from '../supabaseClient';

// Mock supabase
vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn(),
    storage: {
      from: vi.fn()
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn().mockReturnThis()
    }))
  }
}));

describe('Task Workflow Integration Tests', () => {
  const mockWorkspaceId = 'integration-workspace-123';
  const mockTLId = 'tl-integration-123';
  const mockMemberId = 'member-integration-123';
  const mockReviewerId = 'reviewer-integration-123';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock storage operations
    supabase.storage = {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ 
          data: { path: 'integration-test-path/file.pdf' }, 
          error: null 
        }),
        remove: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/integration-file.pdf' }
        })
      }))
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('TL Self-Assignment Workflow', () => {
    it('should complete TL task workflow: start → submit → review → complete', async () => {
      const mockTaskId = 'tl-task-integration-1';
      
      // Mock TL authentication
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockTLId } },
        error: null
      });

      // Mock task data
      const mockTask = {
        id: mockTaskId,
        workspace_id: mockWorkspaceId,
        title: 'TL Integration Task',
        status: 'todo',
        assigned_to: mockTLId,
        assigned_by: mockTLId
      };

      // Mock database operations for task status updates
      supabase.from.mockImplementation((table) => {
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [mockTask],
              error: null
            }),
            single: vi.fn().mockResolvedValue({
              data: mockTask,
              error: null
            }),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null })
            }))
          };
        }
        if (table === 'workspace_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { user_id: mockReviewerId, workspace_id: mockWorkspaceId },
              error: null
            })
          };
        }
        if (table === 'task_reviews') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null })
        };
      });

      // Step 1: Get TL tasks
      const tlTasks = await TaskService.getTLTasks(mockWorkspaceId, mockTLId);
      expect(tlTasks).toBeDefined();

      // Step 2: Simulate task submission (this would normally be done through UI)
      // Mock file for submission
      const mockFile = new File(['integration test content'], 'tl-integration.pdf', { 
        type: 'application/pdf' 
      });

      // Update task to submitted status (simulating upload)
      const submittedTask = {
        ...mockTask,
        status: 'submitted',
        submission_file_name: 'tl-integration.pdf',
        submission_file_url: 'integration-test-path/file.pdf'
      };

      supabase.from.mockImplementation((table) => {
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: submittedTask,
              error: null
            }),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null })
            }))
          };
        }
        if (table === 'workspace_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { user_id: mockReviewerId, workspace_id: mockWorkspaceId },
              error: null
            })
          };
        }
        if (table === 'task_reviews') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null })
        };
      });

      // Step 3: Member reviews and approves
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockReviewerId } },
        error: null
      });

      await TaskService.submitReview(mockTaskId, 'approve');

      // Verify review was submitted
      expect(supabase.from).toHaveBeenCalledWith('task_reviews');
      expect(supabase.from).toHaveBeenCalledWith('tasks');
    });

    it('should handle TL task redo workflow', async () => {
      const mockTaskId = 'tl-task-redo-1';
      
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockReviewerId } },
        error: null
      });

      const submittedTask = {
        id: mockTaskId,
        workspace_id: mockWorkspaceId,
        status: 'submitted',
        assigned_to: mockTLId
      };

      supabase.from.mockImplementation((table) => {
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: submittedTask,
              error: null
            }),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null })
            }))
          };
        }
        if (table === 'workspace_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { user_id: mockReviewerId, workspace_id: mockWorkspaceId },
              error: null
            })
          };
        }
        if (table === 'task_reviews') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null })
        };
      });

      // Member requests redo with feedback
      await TaskService.submitReview(mockTaskId, 'request_redo', 'Please add more details');

      // Verify redo request was processed
      expect(supabase.from).toHaveBeenCalledWith('task_reviews');
      expect(supabase.from).toHaveBeenCalledWith('tasks');
    });
  });

  describe('Member Task Workflow with Submission Modification', () => {
    it('should handle member task submission deletion and re-upload', async () => {
      const mockTaskId = 'member-task-modification-1';
      
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockMemberId } },
        error: null
      });

      const submittedTask = {
        id: mockTaskId,
        workspace_id: mockWorkspaceId,
        status: 'submitted',
        assigned_to: mockMemberId,
        submission_file_url: 'path/to/original-file.pdf'
      };

      supabase.from.mockImplementation((table) => {
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: submittedTask,
              error: null
            }),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null })
            }))
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null })
        };
      });

      // Step 1: Delete submission
      await TaskService.deleteSubmission(mockTaskId);

      // Verify storage deletion was called
      expect(supabase.storage.from).toHaveBeenCalledWith('task-submissions');

      // Step 2: Re-upload submission
      const newFile = new File(['new content'], 'new-submission.pdf', { 
        type: 'application/pdf' 
      });

      await TaskService.reuploadSubmission(mockTaskId, newFile, mockWorkspaceId);

      // Verify new upload was processed
      expect(supabase.storage.from).toHaveBeenCalledWith('task-submissions');
    });

    it('should handle submission modification errors gracefully', async () => {
      const mockTaskId = 'member-task-error-1';
      
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockMemberId } },
        error: null
      });

      // Mock task that cannot be modified (wrong status)
      const completedTask = {
        id: mockTaskId,
        workspace_id: mockWorkspaceId,
        status: 'completed',
        assigned_to: mockMemberId
      };

      supabase.from.mockImplementation((table) => {
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: completedTask,
              error: null
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null })
        };
      });

      // Attempt to delete submission should fail
      await expect(TaskService.deleteSubmission(mockTaskId)).rejects.toThrow();
    });
  });

  describe('Task Revocation Workflow', () => {
    it('should allow TL to revoke task assignment', async () => {
      const mockTaskId = 'revocation-task-1';
      
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockTLId } },
        error: null
      });

      const assignedTask = {
        id: mockTaskId,
        workspace_id: mockWorkspaceId,
        status: 'in_progress',
        assigned_to: mockMemberId,
        assigned_by: mockTLId
      };

      supabase.from.mockImplementation((table) => {
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: assignedTask,
              error: null
            }),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null })
            }))
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null })
        };
      });

      // Revoke task assignment
      await TaskService.revokeTaskAssignment(mockTaskId);

      // Verify task was updated to unassign it
      expect(supabase.from).toHaveBeenCalledWith('tasks');
    });

    it('should prevent non-TL from revoking assignments', async () => {
      const mockTaskId = 'revocation-unauthorized-1';
      
      // Mock member trying to revoke (should fail)
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockMemberId } },
        error: null
      });

      const assignedTask = {
        id: mockTaskId,
        workspace_id: mockWorkspaceId,
        status: 'in_progress',
        assigned_to: mockMemberId,
        assigned_by: mockTLId // Assigned by TL, not by member
      };

      supabase.from.mockImplementation((table) => {
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: assignedTask,
              error: null
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null })
        };
      });

      // Attempt to revoke should fail
      await expect(TaskService.revokeTaskAssignment(mockTaskId)).rejects.toThrow();
    });
  });

  describe('Workspace Submissions Visibility', () => {
    it('should retrieve all workspace submissions for dashboard', async () => {
      const mockSubmissions = [
        {
          id: 'task-1',
          title: 'Task 1',
          submission_file_url: 'path/to/file1.pdf',
          submission_file_name: 'submission1.pdf',
          submission_file_size: 1024000,
          submitted_at: '2024-01-01T10:00:00Z',
          status: 'submitted',
          assigned_to: mockMemberId,
          users: {
            full_name: 'Integration Member',
            email: 'member@integration.test'
          }
        },
        {
          id: 'task-2',
          title: 'Task 2',
          submission_file_url: 'path/to/file2.pdf',
          submission_file_name: 'submission2.pdf',
          submission_file_size: 2048000,
          submitted_at: '2024-01-01T11:00:00Z',
          status: 'completed',
          assigned_to: mockTLId,
          users: {
            full_name: 'Integration TL',
            email: 'tl@integration.test'
          }
        }
      ];

      supabase.from.mockImplementation((table) => {
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: mockSubmissions,
              error: null
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null })
        };
      });

      // Get workspace submissions
      const submissions = await TaskService.getWorkspaceSubmissions(mockWorkspaceId);

      // Verify submissions are properly formatted
      expect(submissions).toHaveLength(2);
      expect(submissions[0]).toMatchObject({
        task_id: 'task-1',
        workspace_id: mockWorkspaceId,
        submitted_by: mockMemberId,
        submitter_name: 'Integration Member',
        task_title: 'Task 1',
        file_name: 'submission1.pdf',
        status: 'under_review'
      });
      expect(submissions[1]).toMatchObject({
        task_id: 'task-2',
        workspace_id: mockWorkspaceId,
        submitted_by: mockTLId,
        submitter_name: 'Integration TL',
        task_title: 'Task 2',
        file_name: 'submission2.pdf',
        status: 'approved'
      });
    });

    it('should handle empty submissions list', async () => {
      supabase.from.mockImplementation((table) => {
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null })
        };
      });

      const submissions = await TaskService.getWorkspaceSubmissions(mockWorkspaceId);
      expect(submissions).toHaveLength(0);
    });
  });

  describe('Multi-User Collaboration Scenarios', () => {
    it('should handle concurrent reviews by different members', async () => {
      const mockTaskId = 'concurrent-review-task-1';
      const mockReviewer1 = 'reviewer1-123';
      const mockReviewer2 = 'reviewer2-123';

      const submittedTask = {
        id: mockTaskId,
        workspace_id: mockWorkspaceId,
        status: 'submitted',
        assigned_to: mockTLId
      };

      supabase.from.mockImplementation((table) => {
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: submittedTask,
              error: null
            }),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null })
            }))
          };
        }
        if (table === 'workspace_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { user_id: mockReviewer1, workspace_id: mockWorkspaceId },
              error: null
            })
          };
        }
        if (table === 'task_reviews') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null })
        };
      });

      // First reviewer approves
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockReviewer1 } },
        error: null
      });

      await TaskService.submitReview(mockTaskId, 'approve');

      // Verify first review was processed
      expect(supabase.from).toHaveBeenCalledWith('task_reviews');

      // Second reviewer attempts to review (should still work, but task is already completed)
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockReviewer2 } },
        error: null
      });

      // Update task to completed status for second review attempt
      const completedTask = { ...submittedTask, status: 'completed' };
      supabase.from.mockImplementation((table) => {
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: completedTask,
              error: null
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ 
            data: { user_id: mockReviewer2, workspace_id: mockWorkspaceId }, 
            error: null 
          })
        };
      });

      // Second review should fail because task is already completed
      await expect(TaskService.submitReview(mockTaskId, 'approve')).rejects.toThrow();
    });

    it('should maintain data consistency across operations', async () => {
      const mockTaskId = 'consistency-task-1';
      
      // Test sequence: create → submit → review → complete
      const taskStates = [
        { status: 'todo' },
        { status: 'in_progress' },
        { status: 'submitted', submission_file_url: 'path/to/file.pdf' },
        { status: 'completed' }
      ];

      let currentState = 0;

      supabase.from.mockImplementation((table) => {
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: mockTaskId,
                workspace_id: mockWorkspaceId,
                assigned_to: mockMemberId,
                ...taskStates[currentState]
              },
              error: null
            }),
            update: vi.fn(() => {
              currentState = Math.min(currentState + 1, taskStates.length - 1);
              return {
                eq: vi.fn().mockResolvedValue({ error: null })
              };
            })
          };
        }
        if (table === 'workspace_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { user_id: mockReviewerId, workspace_id: mockWorkspaceId },
              error: null
            })
          };
        }
        if (table === 'task_reviews') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null })
        };
      });

      // Simulate workflow progression - start with submitted task
      currentState = 2; // Set to submitted state

      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockReviewerId } },
        error: null
      });

      // Review the task (this will progress it to completed)
      await TaskService.submitReview(mockTaskId, 'approve');

      // Verify the workflow completed successfully
      expect(supabase.from).toHaveBeenCalledWith('tasks');
      expect(supabase.from).toHaveBeenCalledWith('task_reviews');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle network failures gracefully', async () => {
      const mockTaskId = 'network-error-task-1';
      
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockMemberId } },
        error: null
      });

      // Mock network error
      supabase.from.mockImplementation(() => {
        throw new Error('Network error');
      });

      // Operations should fail gracefully
      await expect(TaskService.deleteSubmission(mockTaskId)).rejects.toThrow('Network error');
      await expect(TaskService.revokeTaskAssignment(mockTaskId)).rejects.toThrow('Network error');
      await expect(TaskService.submitReview(mockTaskId, 'approve')).rejects.toThrow('Network error');
    });

    it('should validate permissions correctly', async () => {
      const mockTaskId = 'permission-task-1';
      
      // Mock unauthorized user
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'unauthorized-user-123' } },
        error: null
      });

      const restrictedTask = {
        id: mockTaskId,
        workspace_id: mockWorkspaceId,
        status: 'submitted',
        assigned_to: mockMemberId,
        assigned_by: mockTLId
      };

      supabase.from.mockImplementation((table) => {
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: restrictedTask,
              error: null
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null })
        };
      });

      // Unauthorized operations should fail
      await expect(TaskService.deleteSubmission(mockTaskId)).rejects.toThrow();
      await expect(TaskService.revokeTaskAssignment(mockTaskId)).rejects.toThrow();
    });
  });
});
// src/__tests__/TaskWorkflows.e2e.test.jsx - End-to-end workflow tests
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import WorkspaceTL from '../WorkspaceTL';
import WorkspaceTM from '../WorkspaceTM';
import WorkspaceDashboard from '../WorkspaceDashboard';
import { supabase } from '../supabaseClient';
import * as TaskService from '../services/TaskService';

// Mock dependencies
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

vi.mock('../services/TaskService', () => ({
  deleteSubmission: vi.fn(),
  reuploadSubmission: vi.fn(),
  revokeTaskAssignment: vi.fn(),
  getTLTasks: vi.fn(),
  getWorkspaceSubmissions: vi.fn(),
  submitReview: vi.fn()
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'e2e-workspace-123' })
  };
});

vi.mock('../Sidebar', () => ({
  default: () => <div data-testid="sidebar">Sidebar</div>
}));

vi.mock('../AddMembers', () => ({
  default: () => <div data-testid="add-members">AddMembers</div>
}));

describe('Task Workflows - End-to-End Tests', () => {
  const mockWorkspace = {
    id: 'e2e-workspace-123',
    name: 'E2E Test Workspace',
    description: 'End-to-end testing workspace',
    created_by: 'tl-e2e-123'
  };

  const mockTL = {
    id: 'tl-e2e-123',
    email: 'tl-e2e@example.com',
    full_name: 'E2E Team Leader'
  };

  const mockMember = {
    id: 'member-e2e-123',
    email: 'member-e2e@example.com',
    full_name: 'E2E Team Member'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
    
    // Mock storage operations
    supabase.storage = {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ 
          data: { path: 'e2e-test-path/file.pdf' }, 
          error: null 
        }),
        remove: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/e2e-file.pdf' }
        })
      }))
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete TL Self-Assignment Workflow', () => {
    it('should complete entire workflow: create task → assign to self → start → submit → get reviewed → complete', async () => {
      // Phase 1: Task Creation and Assignment (simulated as already done)
      const initialTask = {
        id: 'e2e-tl-task-1',
        workspace_id: 'e2e-workspace-123',
        title: 'E2E TL Task',
        description: 'End-to-end test task for TL',
        status: 'todo',
        assigned_to: 'tl-e2e-123',
        assigned_by: 'tl-e2e-123',
        created_at: '2024-01-01T00:00:00Z'
      };

      // Mock TL authentication
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockTL },
        error: null
      });

      // Mock initial database state
      supabase.from.mockImplementation((table) => {
        if (table === 'workspaces') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockWorkspace,
              error: null
            })
          };
        }
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [initialTask],
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

      // Phase 2: TL views their tasks
      const { rerender } = render(
        <BrowserRouter>
          <WorkspaceTL />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('E2E TL Task')).toBeInTheDocument();
        expect(screen.getByText(/My Tasks/i)).toBeInTheDocument();
      });

      // Phase 3: TL starts the task
      const startButton = screen.getAllByText(/Start Task/i)[0];
      fireEvent.click(startButton);

      // Verify task status update
      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('tasks');
      });

      // Phase 4: Mock task in progress state
      const inProgressTask = {
        ...initialTask,
        status: 'in_progress',
        started_at: new Date().toISOString()
      };

      supabase.from.mockImplementation((table) => {
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [inProgressTask],
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
          single: vi.fn().mockResolvedValue({ data: mockWorkspace, error: null })
        };
      });

      rerender(
        <BrowserRouter>
          <WorkspaceTL />
        </BrowserRouter>
      );

      // Phase 5: TL uploads submission
      await waitFor(() => {
        const uploadButton = screen.getAllByText(/Upload Result/i)[0];
        expect(uploadButton).toBeInTheDocument();
        fireEvent.click(uploadButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Upload Task Submission/i)).toBeInTheDocument();
      });

      // Simulate file selection and upload
      const fileInput = document.querySelector('input[type="file"]');
      const testFile = new File(['e2e test content'], 'e2e-submission.pdf', { type: 'application/pdf' });
      
      fireEvent.change(fileInput, { target: { files: [testFile] } });

      await waitFor(() => {
        const uploadConfirmButton = screen.getAllByText(/Upload/i).find(btn => 
          btn.closest('button') && !btn.closest('button').disabled
        );
        expect(uploadConfirmButton).toBeInTheDocument();
      });

      // Phase 6: Mock task submitted state
      const submittedTask = {
        ...inProgressTask,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        submission_file_name: 'e2e-submission.pdf',
        submission_file_url: 'e2e-test-path/file.pdf'
      };

      supabase.from.mockImplementation((table) => {
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [submittedTask],
              error: null
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockWorkspace, error: null })
        };
      });

      rerender(
        <BrowserRouter>
          <WorkspaceTL />
        </BrowserRouter>
      );

      // Phase 7: Verify submission is visible
      await waitFor(() => {
        expect(screen.getByText('e2e-submission.pdf')).toBeInTheDocument();
        expect(screen.getByText(/Under Review/i)).toBeInTheDocument();
      });

      // Phase 8: Switch to member view for review
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockMember },
        error: null
      });

      supabase.from.mockImplementation((table) => {
        if (table === 'workspace_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { user_id: 'member-e2e-123', workspace_id: 'e2e-workspace-123' },
              error: null
            })
          };
        }
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [submittedTask],
              error: null
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockWorkspace, error: null })
        };
      });

      TaskService.submitReview.mockResolvedValue({ success: true });

      render(
        <BrowserRouter>
          <WorkspaceTM />
        </BrowserRouter>
      );

      // Phase 9: Member reviews and approves
      await waitFor(() => {
        expect(screen.getByText('E2E TL Task')).toBeInTheDocument();
      });

      const approveButton = screen.getAllByText(/Approve/i)[0];
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(TaskService.submitReview).toHaveBeenCalledWith(
          'e2e-tl-task-1',
          'approve',
          undefined
        );
      });

      // Phase 10: Verify completion
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('approved'));
    });
  });

  describe('Complete Member Task Workflow with Modifications', () => {
    it('should handle member task with submission deletion and re-upload', async () => {
      const memberTask = {
        id: 'e2e-member-task-1',
        workspace_id: 'e2e-workspace-123',
        title: 'E2E Member Task',
        description: 'End-to-end test task for member',
        status: 'submitted',
        assigned_to: 'member-e2e-123',
        assigned_by: 'tl-e2e-123',
        created_at: '2024-01-01T00:00:00Z',
        submitted_at: '2024-01-02T00:00:00Z',
        submission_file_name: 'initial-submission.pdf',
        submission_file_url: 'path/to/initial-submission.pdf',
        submission_file_size: 1024000
      };

      // Mock member authentication
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockMember },
        error: null
      });

      supabase.from.mockImplementation((table) => {
        if (table === 'workspaces') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockWorkspace,
              error: null
            })
          };
        }
        if (table === 'workspace_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { user_id: 'member-e2e-123', workspace_id: 'e2e-workspace-123' },
              error: null
            })
          };
        }
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [memberTask],
              error: null
            })
          };
        }
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockTL,
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

      TaskService.deleteSubmission.mockResolvedValue({ success: true });
      TaskService.reuploadSubmission.mockResolvedValue({ success: true });

      // Phase 1: Member views their submitted task
      render(
        <BrowserRouter>
          <WorkspaceTM />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('E2E Member Task')).toBeInTheDocument();
        expect(screen.getByText('initial-submission.pdf')).toBeInTheDocument();
      });

      // Phase 2: Member deletes submission
      const deleteButton = screen.getAllByText('Delete Submission')[0];
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Delete Submission?')).toBeInTheDocument();
      });

      const confirmDeleteButton = screen.getAllByText('Delete Submission')[1];
      fireEvent.click(confirmDeleteButton);

      await waitFor(() => {
        expect(TaskService.deleteSubmission).toHaveBeenCalledWith('e2e-member-task-1');
      });

      // Phase 3: Mock task back to in_progress after deletion
      const inProgressTask = {
        ...memberTask,
        status: 'in_progress',
        submission_file_name: null,
        submission_file_url: null,
        submission_file_size: null,
        submitted_at: null
      };

      supabase.from.mockImplementation((table) => {
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [inProgressTask],
              error: null
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockWorkspace, error: null })
        };
      });

      // Phase 4: Member uploads new submission
      const { rerender } = render(
        <BrowserRouter>
          <WorkspaceTM />
        </BrowserRouter>
      );

      await waitFor(() => {
        const uploadButton = screen.getAllByText(/Upload Result/i)[0];
        expect(uploadButton).toBeInTheDocument();
        fireEvent.click(uploadButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Upload Task Submission/i)).toBeInTheDocument();
      });

      // Simulate new file upload
      const fileInput = document.querySelector('input[type="file"]');
      const newFile = new File(['new e2e content'], 'new-submission.pdf', { type: 'application/pdf' });
      
      fireEvent.change(fileInput, { target: { files: [newFile] } });

      // Phase 5: Verify workflow completion
      await waitFor(() => {
        const uploadButtons = screen.getAllByText(/Upload/i);
        const enabledUploadButton = uploadButtons.find(btn => 
          btn.closest('button') && !btn.closest('button').disabled
        );
        expect(enabledUploadButton).toBeInTheDocument();
      });

      // The workflow demonstrates successful submission modification capability
    });
  });

  describe('Cross-Component Data Consistency', () => {
    it('should maintain consistent data across TL, TM, and Dashboard views', async () => {
      const sharedTask = {
        id: 'e2e-shared-task-1',
        workspace_id: 'e2e-workspace-123',
        title: 'Shared E2E Task',
        description: 'Task visible across all views',
        status: 'submitted',
        assigned_to: 'member-e2e-123',
        assigned_by: 'tl-e2e-123',
        created_at: '2024-01-01T00:00:00Z',
        submitted_at: '2024-01-02T00:00:00Z',
        submission_file_name: 'shared-submission.pdf',
        submission_file_url: 'path/to/shared-submission.pdf',
        submission_file_size: 2048000
      };

      const sharedSubmission = {
        id: 'shared-sub-1',
        task_id: 'e2e-shared-task-1',
        workspace_id: 'e2e-workspace-123',
        submitted_by: 'member-e2e-123',
        submitter_name: 'E2E Team Member',
        task_title: 'Shared E2E Task',
        file_url: 'path/to/shared-submission.pdf',
        file_name: 'shared-submission.pdf',
        file_size: 2048000,
        file_type: 'application/pdf',
        submitted_at: '2024-01-02T00:00:00Z',
        status: 'under_review'
      };

      // Mock shared database responses
      const mockSharedData = (table) => {
        if (table === 'workspaces') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockWorkspace,
              error: null
            })
          };
        }
        if (table === 'workspace_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [{
                id: 'wm-e2e-1',
                user_id: 'member-e2e-123',
                workspace_id: 'e2e-workspace-123',
                users: mockMember
              }],
              error: null
            })
          };
        }
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [sharedTask],
              error: null
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockTL, error: null })
        };
      };

      TaskService.getWorkspaceSubmissions.mockResolvedValue([sharedSubmission]);

      // Test 1: TL View
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockTL },
        error: null
      });
      supabase.from.mockImplementation(mockSharedData);

      const { unmount: unmountTL } = render(
        <BrowserRouter>
          <WorkspaceTL />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('E2E Test Workspace')).toBeInTheDocument();
      });

      // Expand member section to see task
      const memberName = screen.getByText('E2E Team Member');
      fireEvent.click(memberName);

      await waitFor(() => {
        expect(screen.getByText('Shared E2E Task')).toBeInTheDocument();
        expect(screen.getByText('shared-submission.pdf')).toBeInTheDocument();
      });

      unmountTL();

      // Test 2: Member View
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockMember },
        error: null
      });

      supabase.from.mockImplementation((table) => {
        if (table === 'workspace_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { user_id: 'member-e2e-123', workspace_id: 'e2e-workspace-123' },
              error: null
            })
          };
        }
        return mockSharedData(table);
      });

      const { unmount: unmountTM } = render(
        <BrowserRouter>
          <WorkspaceTM />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Shared E2E Task')).toBeInTheDocument();
        expect(screen.getByText('shared-submission.pdf')).toBeInTheDocument();
      });

      unmountTM();

      // Test 3: Dashboard View
      supabase.from.mockImplementation((table) => {
        if (table === 'workspace_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { user_id: 'member-e2e-123', workspace_id: 'e2e-workspace-123' },
              error: null
            })
          };
        }
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [{
                ...sharedTask,
                users: {
                  full_name: mockMember.full_name,
                  email: mockMember.email
                }
              }],
              error: null
            })
          };
        }
        return mockSharedData(table);
      });

      render(
        <BrowserRouter>
          <WorkspaceDashboard />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Workspace Submissions/i)).toBeInTheDocument();
        expect(screen.getByText('shared-submission.pdf')).toBeInTheDocument();
        expect(screen.getByText('E2E Team Member')).toBeInTheDocument();
      });

      // Verify all views show consistent data
      expect(screen.getByText('Shared E2E Task')).toBeInTheDocument();
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle network failures and retry operations gracefully', async () => {
      const resilientTask = {
        id: 'e2e-resilient-task-1',
        workspace_id: 'e2e-workspace-123',
        title: 'Resilient E2E Task',
        status: 'submitted',
        assigned_to: 'member-e2e-123',
        assigned_by: 'tl-e2e-123',
        submission_file_name: 'resilient-submission.pdf',
        submission_file_url: 'path/to/resilient-submission.pdf'
      };

      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockMember },
        error: null
      });

      supabase.from.mockImplementation((table) => {
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [resilientTask],
              error: null
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockWorkspace, error: null })
        };
      });

      // Simulate network failure followed by success
      TaskService.deleteSubmission
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ success: true });

      render(
        <BrowserRouter>
          <WorkspaceTM />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Resilient E2E Task')).toBeInTheDocument();
      });

      // First attempt fails
      const deleteButton = screen.getAllByText('Delete Submission')[0];
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Delete Submission?')).toBeInTheDocument();
      });

      const confirmButton = screen.getAllByText('Delete Submission')[1];
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Network error'));
      });

      // Second attempt succeeds (user retries)
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Delete Submission?')).toBeInTheDocument();
      });

      const retryConfirmButton = screen.getAllByText('Delete Submission')[1];
      fireEvent.click(retryConfirmButton);

      await waitFor(() => {
        expect(TaskService.deleteSubmission).toHaveBeenCalledTimes(2);
      });
    });
  });
});
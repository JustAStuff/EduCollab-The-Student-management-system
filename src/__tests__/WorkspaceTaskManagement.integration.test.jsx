// src/__tests__/WorkspaceTaskManagement.integration.test.jsx
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
    useParams: () => ({ id: 'workspace-123' })
  };
});

vi.mock('../Sidebar', () => ({
  default: () => <div data-testid="sidebar">Sidebar</div>
}));

vi.mock('../AddMembers', () => ({
  default: () => <div data-testid="add-members">AddMembers</div>
}));

describe('Workspace Task Management - Integration Tests', () => {
  const mockTL = {
    id: 'tl-123',
    email: 'tl@example.com',
    full_name: 'Team Leader'
  };

  const mockMember = {
    id: 'member-123',
    email: 'member@example.com',
    full_name: 'Team Member'
  };

  const mockWorkspace = {
    id: 'workspace-123',
    name: 'Test Workspace',
    description: 'Integration test workspace',
    created_by: 'tl-123'
  };

  const mockWorkspaceMember = {
    id: 'wm-1',
    user_id: 'member-123',
    workspace_id: 'workspace-123',
    users: mockMember
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
    
    // Mock storage operations
    supabase.storage = {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ 
          data: { path: 'test-path/file.pdf' }, 
          error: null 
        }),
        remove: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/file.pdf' }
        })
      }))
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('TL Task Workflow (assign to self → complete)', () => {
    const mockTLTask = {
      id: 'tl-task-1',
      workspace_id: 'workspace-123',
      title: 'TL Self-Assigned Task',
      description: 'Task assigned by TL to themselves',
      status: 'todo',
      assigned_to: 'tl-123',
      assigned_by: 'tl-123',
      created_at: '2024-01-01T00:00:00Z'
    };

    beforeEach(() => {
      // Mock TL authentication
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockTL },
        error: null
      });

      // Mock database queries for TL workflow
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
            eq: vi.fn().mockResolvedValue({
              data: [mockWorkspaceMember],
              error: null
            })
          };
        }
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [mockTLTask],
              error: null
            }),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null })
            }))
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
    });

    it('should complete full TL task workflow from todo to completed', async () => {
      render(
        <BrowserRouter>
          <WorkspaceTL />
        </BrowserRouter>
      );

      // Step 1: Verify TL can see their assigned task
      await waitFor(() => {
        expect(screen.getByText('TL Self-Assigned Task')).toBeInTheDocument();
        expect(screen.getByText(/My Tasks/i)).toBeInTheDocument();
      });

      // Step 2: Verify Start Task button is available
      const startButton = screen.getAllByText(/Start Task/i)[0];
      expect(startButton).toBeInTheDocument();

      // Step 3: Simulate starting the task
      fireEvent.click(startButton);

      // Verify task status update was called
      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('tasks');
      });

      // Step 4: Mock task in progress state
      const inProgressTask = { ...mockTLTask, status: 'in_progress', started_at: new Date().toISOString() };
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

      // Re-render to show updated state
      render(
        <BrowserRouter>
          <WorkspaceTL />
        </BrowserRouter>
      );

      // Step 5: Verify Upload Result button appears
      await waitFor(() => {
        const uploadButton = screen.getAllByText(/Upload Result/i)[0];
        expect(uploadButton).toBeInTheDocument();
      });
    });

    it('should handle TL task submission and review process', async () => {
      // Mock task in submitted state
      const submittedTask = {
        ...mockTLTask,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        submission_file_name: 'tl-submission.pdf',
        submission_file_url: 'path/to/tl-submission.pdf'
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

      render(
        <BrowserRouter>
          <WorkspaceTL />
        </BrowserRouter>
      );

      // Verify submitted task shows submission info
      await waitFor(() => {
        expect(screen.getByText('tl-submission.pdf')).toBeInTheDocument();
        expect(screen.getByText(/Under Review/i)).toBeInTheDocument();
      });

      // Verify review actions are available for workspace members
      // (This would be tested in the member review workflow)
    });
  });

  describe('Member Task Workflow with Submission Modification', () => {
    const mockMemberTask = {
      id: 'member-task-1',
      workspace_id: 'workspace-123',
      title: 'Member Task',
      description: 'Task assigned to member',
      status: 'submitted',
      assigned_to: 'member-123',
      assigned_by: 'tl-123',
      created_at: '2024-01-01T00:00:00Z',
      submitted_at: '2024-01-02T00:00:00Z',
      submission_file_name: 'member-submission.pdf',
      submission_file_url: 'path/to/member-submission.pdf',
      submission_file_size: 1024000
    };

    beforeEach(() => {
      // Mock member authentication
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockMember },
        error: null
      });

      // Mock database queries for member workflow
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
              data: { user_id: 'member-123', workspace_id: 'workspace-123' },
              error: null
            })
          };
        }
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [mockMemberTask],
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
    });

    it('should allow member to delete and re-upload submission', async () => {
      TaskService.deleteSubmission.mockResolvedValue({ success: true });
      TaskService.reuploadSubmission.mockResolvedValue({ success: true });

      render(
        <BrowserRouter>
          <WorkspaceTM />
        </BrowserRouter>
      );

      // Verify task and submission are displayed
      await waitFor(() => {
        expect(screen.getByText('Member Task')).toBeInTheDocument();
        expect(screen.getByText('member-submission.pdf')).toBeInTheDocument();
      });

      // Step 1: Test delete submission
      const deleteButton = screen.getAllByText('Delete Submission')[0];
      expect(deleteButton).toBeInTheDocument();

      fireEvent.click(deleteButton);

      // Confirm deletion
      await waitFor(() => {
        expect(screen.getByText('Delete Submission?')).toBeInTheDocument();
      });

      const confirmDeleteButton = screen.getAllByText('Delete Submission')[1];
      fireEvent.click(confirmDeleteButton);

      await waitFor(() => {
        expect(TaskService.deleteSubmission).toHaveBeenCalledWith('member-task-1');
      });

      // Step 2: Test re-upload submission
      const reuploadButton = screen.getAllByText('Re-upload')[0];
      expect(reuploadButton).toBeInTheDocument();

      fireEvent.click(reuploadButton);

      await waitFor(() => {
        expect(screen.getByText('Re-upload Submission')).toBeInTheDocument();
      });

      // Select new file
      const fileInput = document.querySelector('input[type="file"]');
      const newFile = new File(['new content'], 'new-submission.pdf', { type: 'application/pdf' });
      
      fireEvent.change(fileInput, { target: { files: [newFile] } });

      // Confirm re-upload
      await waitFor(() => {
        const confirmReuploadButton = screen.getAllByText('Re-upload')[1];
        expect(confirmReuploadButton).not.toBeDisabled();
      });

      const confirmReuploadButton = screen.getAllByText('Re-upload')[1];
      fireEvent.click(confirmReuploadButton);

      await waitFor(() => {
        expect(TaskService.reuploadSubmission).toHaveBeenCalledWith(
          'member-task-1',
          expect.any(File),
          'workspace-123'
        );
      });
    });

    it('should handle submission modification errors gracefully', async () => {
      TaskService.deleteSubmission.mockRejectedValue(new Error('Delete failed'));
      TaskService.reuploadSubmission.mockRejectedValue(new Error('Upload failed'));

      render(
        <BrowserRouter>
          <WorkspaceTM />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Member Task')).toBeInTheDocument();
      });

      // Test delete error handling
      const deleteButton = screen.getAllByText('Delete Submission')[0];
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Delete Submission?')).toBeInTheDocument();
      });

      const confirmDeleteButton = screen.getAllByText('Delete Submission')[1];
      fireEvent.click(confirmDeleteButton);

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Delete failed'));
      });

      // Test re-upload error handling
      const reuploadButton = screen.getAllByText('Re-upload')[0];
      fireEvent.click(reuploadButton);

      await waitFor(() => {
        expect(screen.getByText('Re-upload Submission')).toBeInTheDocument();
      });

      const fileInput = document.querySelector('input[type="file"]');
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        const confirmButton = screen.getAllByText('Re-upload')[1];
        expect(confirmButton).not.toBeDisabled();
      });

      const confirmButton = screen.getAllByText('Re-upload')[1];
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Upload failed'));
      });
    });
  });

  describe('Peer Review Workflow', () => {
    const mockTaskForReview = {
      id: 'review-task-1',
      workspace_id: 'workspace-123',
      title: 'Task Under Review',
      description: 'Task submitted for review',
      status: 'submitted',
      assigned_to: 'tl-123',
      assigned_by: 'tl-123',
      created_at: '2024-01-01T00:00:00Z',
      submitted_at: '2024-01-02T00:00:00Z',
      submission_file_name: 'review-submission.pdf',
      submission_file_url: 'path/to/review-submission.pdf'
    };

    beforeEach(() => {
      // Mock member as reviewer
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockMember },
        error: null
      });

      TaskService.submitReview.mockResolvedValue({ success: true });

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
              data: { user_id: 'member-123', workspace_id: 'workspace-123' },
              error: null
            })
          };
        }
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [mockTaskForReview],
              error: null
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockTL, error: null })
        };
      });
    });

    it('should allow workspace member to approve TL submission', async () => {
      render(
        <BrowserRouter>
          <WorkspaceTM />
        </BrowserRouter>
      );

      // Wait for task to load
      await waitFor(() => {
        expect(screen.getByText('Task Under Review')).toBeInTheDocument();
      });

      // Find and click approve button
      const approveButton = screen.getAllByText(/Approve/i)[0];
      expect(approveButton).toBeInTheDocument();

      fireEvent.click(approveButton);

      // Verify review submission
      await waitFor(() => {
        expect(TaskService.submitReview).toHaveBeenCalledWith(
          'review-task-1',
          'approve',
          undefined
        );
      });
    });

    it('should allow workspace member to request redo with feedback', async () => {
      render(
        <BrowserRouter>
          <WorkspaceTM />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Task Under Review')).toBeInTheDocument();
      });

      // Find and click request redo button
      const redoButton = screen.getAllByText(/Request Redo/i)[0];
      expect(redoButton).toBeInTheDocument();

      fireEvent.click(redoButton);

      // Should open feedback dialog
      await waitFor(() => {
        expect(screen.getByText(/Request Redo/i)).toBeInTheDocument();
      });

      // Add feedback comment
      const commentInput = screen.getByPlaceholderText(/Add your feedback/i);
      fireEvent.change(commentInput, { target: { value: 'Please revise the document format' } });

      // Submit redo request
      const submitRedoButton = screen.getAllByText(/Request Redo/i)[1];
      fireEvent.click(submitRedoButton);

      await waitFor(() => {
        expect(TaskService.submitReview).toHaveBeenCalledWith(
          'review-task-1',
          'request_redo',
          'Please revise the document format'
        );
      });
    });

    it('should handle review submission errors', async () => {
      TaskService.submitReview.mockRejectedValue(new Error('Review failed'));

      render(
        <BrowserRouter>
          <WorkspaceTM />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Task Under Review')).toBeInTheDocument();
      });

      const approveButton = screen.getAllByText(/Approve/i)[0];
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Review failed'));
      });
    });
  });

  describe('Task Revocation Workflow', () => {
    const mockAssignedTask = {
      id: 'assigned-task-1',
      workspace_id: 'workspace-123',
      title: 'Assigned Task',
      description: 'Task assigned to member',
      status: 'in_progress',
      assigned_to: 'member-123',
      assigned_by: 'tl-123',
      created_at: '2024-01-01T00:00:00Z'
    };

    beforeEach(() => {
      // Mock TL authentication
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockTL },
        error: null
      });

      TaskService.revokeTaskAssignment.mockResolvedValue({ success: true });

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
            eq: vi.fn().mockResolvedValue({
              data: [mockWorkspaceMember],
              error: null
            })
          };
        }
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [mockAssignedTask],
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
    });

    it('should allow TL to revoke task assignment with confirmation', async () => {
      render(
        <BrowserRouter>
          <WorkspaceTL />
        </BrowserRouter>
      );

      // Wait for workspace to load
      await waitFor(() => {
        expect(screen.getByText('Test Workspace')).toBeInTheDocument();
      });

      // Expand member section
      const memberName = screen.getByText('Team Member');
      fireEvent.click(memberName);

      // Wait for task to appear
      await waitFor(() => {
        expect(screen.getByText('Assigned Task')).toBeInTheDocument();
      });

      // Click revoke button
      const revokeButton = screen.getByRole('button', { name: /revoke assignment/i });
      fireEvent.click(revokeButton);

      // Confirm revocation
      await waitFor(() => {
        expect(screen.getByText('Revoke Task Assignment?')).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /confirm revocation/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(TaskService.revokeTaskAssignment).toHaveBeenCalledWith('assigned-task-1');
        expect(window.alert).toHaveBeenCalledWith('Task assignment revoked successfully!');
      });
    });

    it('should handle revocation cancellation', async () => {
      render(
        <BrowserRouter>
          <WorkspaceTL />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Workspace')).toBeInTheDocument();
      });

      const memberName = screen.getByText('Team Member');
      fireEvent.click(memberName);

      await waitFor(() => {
        expect(screen.getByText('Assigned Task')).toBeInTheDocument();
      });

      const revokeButton = screen.getByRole('button', { name: /revoke assignment/i });
      fireEvent.click(revokeButton);

      await waitFor(() => {
        expect(screen.getByText('Revoke Task Assignment?')).toBeInTheDocument();
      });

      // Cancel revocation
      const cancelButton = screen.getAllByRole('button', { name: /cancel/i })[0];
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Revoke Task Assignment?')).not.toBeInTheDocument();
      });

      expect(TaskService.revokeTaskAssignment).not.toHaveBeenCalled();
    });

    it('should handle revocation errors', async () => {
      TaskService.revokeTaskAssignment.mockRejectedValue(
        new Error('Only the team lead who assigned the task can revoke it')
      );

      render(
        <BrowserRouter>
          <WorkspaceTL />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Workspace')).toBeInTheDocument();
      });

      const memberName = screen.getByText('Team Member');
      fireEvent.click(memberName);

      await waitFor(() => {
        expect(screen.getByText('Assigned Task')).toBeInTheDocument();
      });

      const revokeButton = screen.getByRole('button', { name: /revoke assignment/i });
      fireEvent.click(revokeButton);

      await waitFor(() => {
        expect(screen.getByText('Revoke Task Assignment?')).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /confirm revocation/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith(
          'Only the team lead who assigned the task can revoke it'
        );
      });
    });
  });
  
describe('Dashboard Submission Visibility', () => {
    const mockSubmissions = [
      {
        id: 'sub-1',
        task_id: 'task-1',
        workspace_id: 'workspace-123',
        submitted_by: 'member-123',
        submitter_name: 'Team Member',
        task_title: 'Member Task 1',
        file_url: 'path/to/file1.pdf',
        file_name: 'submission1.pdf',
        file_size: 1024000,
        file_type: 'application/pdf',
        submitted_at: '2024-01-01T10:00:00Z',
        status: 'under_review'
      },
      {
        id: 'sub-2',
        task_id: 'task-2',
        workspace_id: 'workspace-123',
        submitted_by: 'tl-123',
        submitter_name: 'Team Leader',
        task_title: 'TL Task 1',
        file_url: 'path/to/file2.docx',
        file_name: 'tl-submission.docx',
        file_size: 2048000,
        file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        submitted_at: '2024-01-02T14:00:00Z',
        status: 'approved'
      }
    ];

    beforeEach(() => {
      TaskService.getWorkspaceSubmissions.mockResolvedValue(mockSubmissions);

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
              data: { user_id: 'member-123', workspace_id: 'workspace-123' },
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
              data: mockSubmissions.map(sub => ({
                id: sub.task_id,
                title: sub.task_title,
                submission_file_url: sub.file_url,
                submission_file_name: sub.file_name,
                submission_file_size: sub.file_size,
                submitted_at: sub.submitted_at,
                status: sub.status === 'approved' ? 'completed' : 'submitted',
                assigned_to: sub.submitted_by,
                users: {
                  full_name: sub.submitter_name,
                  email: sub.submitted_by === 'tl-123' ? 'tl@example.com' : 'member@example.com'
                }
              })),
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
    });

    it('should display all workspace submissions in dashboard', async () => {
      render(
        <BrowserRouter>
          <WorkspaceDashboard />
        </BrowserRouter>
      );

      // Wait for submissions to load
      await waitFor(() => {
        expect(screen.getByText(/Workspace Submissions/i)).toBeInTheDocument();
      });

      // Verify both submissions are displayed
      expect(screen.getByText('submission1.pdf')).toBeInTheDocument();
      expect(screen.getByText('tl-submission.docx')).toBeInTheDocument();

      // Verify submitter names are shown
      expect(screen.getByText(/Team Member/i)).toBeInTheDocument();
      expect(screen.getByText(/Team Leader/i)).toBeInTheDocument();

      // Verify task titles are shown
      expect(screen.getByText('Member Task 1')).toBeInTheDocument();
      expect(screen.getByText('TL Task 1')).toBeInTheDocument();
    });

    it('should allow any workspace member to download submissions', async () => {
      render(
        <BrowserRouter>
          <WorkspaceDashboard />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Workspace Submissions/i)).toBeInTheDocument();
      });

      // Find download buttons
      const downloadButtons = screen.getAllByText(/Download/i);
      expect(downloadButtons.length).toBeGreaterThan(0);

      // Simulate download click
      fireEvent.click(downloadButtons[0]);

      // Verify storage access
      expect(supabase.storage.from).toHaveBeenCalledWith('task-submissions');
    });

    it('should allow viewing supported file formats', async () => {
      render(
        <BrowserRouter>
          <WorkspaceDashboard />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Workspace Submissions/i)).toBeInTheDocument();
      });

      // Find view buttons
      const viewButtons = screen.getAllByText(/View/i);
      expect(viewButtons.length).toBeGreaterThan(0);

      // Simulate view click
      fireEvent.click(viewButtons[0]);

      // Verify view functionality (implementation depends on file type)
      expect(supabase.storage.from).toHaveBeenCalledWith('task-submissions');
    });

    it('should handle empty submissions gracefully', async () => {
      TaskService.getWorkspaceSubmissions.mockResolvedValue([]);

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
          single: vi.fn().mockResolvedValue({ data: mockWorkspace, error: null })
        };
      });

      render(
        <BrowserRouter>
          <WorkspaceDashboard />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/No submissions yet/i)).toBeInTheDocument();
      });
    });

    it('should update submissions in real-time when new ones are added', async () => {
      // Initial render with one submission
      TaskService.getWorkspaceSubmissions.mockResolvedValueOnce([mockSubmissions[0]]);

      render(
        <BrowserRouter>
          <WorkspaceDashboard />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('submission1.pdf')).toBeInTheDocument();
        expect(screen.queryByText('tl-submission.docx')).not.toBeInTheDocument();
      });

      // Simulate new submission added
      TaskService.getWorkspaceSubmissions.mockResolvedValueOnce(mockSubmissions);

      // Trigger re-render (in real app this would be via real-time subscription)
      render(
        <BrowserRouter>
          <WorkspaceDashboard />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('submission1.pdf')).toBeInTheDocument();
        expect(screen.getByText('tl-submission.docx')).toBeInTheDocument();
      });
    });
  });

  describe('Multi-User Collaboration Scenarios', () => {
    const mockCollaborationWorkspace = {
      id: 'collab-workspace-123',
      name: 'Collaboration Workspace',
      description: 'Multi-user collaboration test',
      created_by: 'tl-123'
    };

    const mockUsers = [
      { id: 'tl-123', email: 'tl@example.com', full_name: 'Team Leader' },
      { id: 'member1-123', email: 'member1@example.com', full_name: 'Member One' },
      { id: 'member2-123', email: 'member2@example.com', full_name: 'Member Two' }
    ];

    const mockCollaborationTasks = [
      {
        id: 'collab-task-1',
        workspace_id: 'collab-workspace-123',
        title: 'Collaborative Task 1',
        status: 'submitted',
        assigned_to: 'member1-123',
        assigned_by: 'tl-123',
        submission_file_name: 'member1-work.pdf',
        submission_file_url: 'path/to/member1-work.pdf'
      },
      {
        id: 'collab-task-2',
        workspace_id: 'collab-workspace-123',
        title: 'Collaborative Task 2',
        status: 'submitted',
        assigned_to: 'tl-123',
        assigned_by: 'tl-123',
        submission_file_name: 'tl-work.pdf',
        submission_file_url: 'path/to/tl-work.pdf'
      }
    ];

    beforeEach(() => {
      TaskService.submitReview.mockResolvedValue({ success: true });
      TaskService.revokeTaskAssignment.mockResolvedValue({ success: true });
      TaskService.deleteSubmission.mockResolvedValue({ success: true });
    });

    it('should handle concurrent task reviews by multiple members', async () => {
      // Mock member1 reviewing TL's task
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUsers[1] }, // member1
        error: null
      });

      supabase.from.mockImplementation((table) => {
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [mockCollaborationTasks[1]], // TL's task
              error: null
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ 
            data: mockCollaborationWorkspace, 
            error: null 
          })
        };
      });

      render(
        <BrowserRouter>
          <WorkspaceTM />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Collaborative Task 2')).toBeInTheDocument();
      });

      // Member1 approves TL's task
      const approveButton = screen.getAllByText(/Approve/i)[0];
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(TaskService.submitReview).toHaveBeenCalledWith(
          'collab-task-2',
          'approve',
          undefined
        );
      });

      // Verify success message
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('approved'));
    });

    it('should handle TL reviewing member submissions while member modifies their own', async () => {
      // Mock TL perspective
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUsers[0] }, // TL
        error: null
      });

      const mockMembers = [
        {
          id: 'wm-1',
          user_id: 'member1-123',
          workspace_id: 'collab-workspace-123',
          users: mockUsers[1]
        }
      ];

      supabase.from.mockImplementation((table) => {
        if (table === 'workspaces') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockCollaborationWorkspace,
              error: null
            })
          };
        }
        if (table === 'workspace_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: mockMembers,
              error: null
            })
          };
        }
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [mockCollaborationTasks[0]], // Member's task
              error: null
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockUsers[0], error: null })
        };
      });

      render(
        <BrowserRouter>
          <WorkspaceTL />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Collaboration Workspace')).toBeInTheDocument();
      });

      // Expand member section
      const memberName = screen.getByText('Member One');
      fireEvent.click(memberName);

      await waitFor(() => {
        expect(screen.getByText('Collaborative Task 1')).toBeInTheDocument();
      });

      // TL can see member's submitted work and review options
      expect(screen.getByText('member1-work.pdf')).toBeInTheDocument();
      
      // Verify review actions are available
      const reviewButtons = screen.queryAllByText(/Approve|Request Redo/i);
      expect(reviewButtons.length).toBeGreaterThan(0);
    });

    it('should handle task assignment conflicts and revocations', async () => {
      // Mock TL revoking a task that member is working on
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUsers[0] }, // TL
        error: null
      });

      const inProgressTask = {
        ...mockCollaborationTasks[0],
        status: 'in_progress'
      };

      const mockMembers = [
        {
          id: 'wm-1',
          user_id: 'member1-123',
          workspace_id: 'collab-workspace-123',
          users: mockUsers[1]
        }
      ];

      supabase.from.mockImplementation((table) => {
        if (table === 'workspaces') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockCollaborationWorkspace,
              error: null
            })
          };
        }
        if (table === 'workspace_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: mockMembers,
              error: null
            })
          };
        }
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
          single: vi.fn().mockResolvedValue({ data: mockUsers[0], error: null })
        };
      });

      render(
        <BrowserRouter>
          <WorkspaceTL />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Collaboration Workspace')).toBeInTheDocument();
      });

      // Expand member section
      const memberName = screen.getByText('Member One');
      fireEvent.click(memberName);

      await waitFor(() => {
        expect(screen.getByText('Collaborative Task 1')).toBeInTheDocument();
      });

      // TL revokes the in-progress task
      const revokeButton = screen.getByRole('button', { name: /revoke assignment/i });
      fireEvent.click(revokeButton);

      await waitFor(() => {
        expect(screen.getByText('Revoke Task Assignment?')).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /confirm revocation/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(TaskService.revokeTaskAssignment).toHaveBeenCalledWith('collab-task-1');
        expect(window.alert).toHaveBeenCalledWith('Task assignment revoked successfully!');
      });
    });

    it('should maintain data consistency across multiple user sessions', async () => {
      // Test scenario: Multiple users viewing the same workspace simultaneously
      
      // Mock different user perspectives seeing the same data
      const sharedWorkspaceData = {
        workspace: mockCollaborationWorkspace,
        tasks: mockCollaborationTasks,
        members: mockUsers
      };

      // User 1 (TL) perspective
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUsers[0] },
        error: null
      });

      supabase.from.mockImplementation((table) => {
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: sharedWorkspaceData.tasks,
              error: null
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ 
            data: sharedWorkspaceData.workspace, 
            error: null 
          })
        };
      });

      const { unmount: unmountTL } = render(
        <BrowserRouter>
          <WorkspaceTL />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Collaboration Workspace')).toBeInTheDocument();
      });

      unmountTL();

      // User 2 (Member) perspective - should see consistent data
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUsers[1] },
        error: null
      });

      render(
        <BrowserRouter>
          <WorkspaceTM />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Collaborative Task 1')).toBeInTheDocument();
      });

      // Both users should see the same task data
      expect(screen.getByText('member1-work.pdf')).toBeInTheDocument();
    });

    it('should handle permission boundaries correctly in multi-user scenarios', async () => {
      // Test that members cannot revoke tasks (only TL can)
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUsers[1] }, // member1
        error: null
      });

      supabase.from.mockImplementation((table) => {
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [mockCollaborationTasks[0]],
              error: null
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ 
            data: mockCollaborationWorkspace, 
            error: null 
          })
        };
      });

      render(
        <BrowserRouter>
          <WorkspaceTM />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Collaborative Task 1')).toBeInTheDocument();
      });

      // Member should not see revoke buttons (only TL should)
      const revokeButtons = screen.queryAllByText(/revoke assignment/i);
      expect(revokeButtons.length).toBe(0);

      // But member should see review options for other members' tasks
      const reviewButtons = screen.queryAllByText(/Approve|Request Redo/i);
      expect(reviewButtons.length).toBeGreaterThan(0);
    });
  });
});
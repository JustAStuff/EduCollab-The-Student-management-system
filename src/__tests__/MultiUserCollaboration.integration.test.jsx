// src/__tests__/MultiUserCollaboration.integration.test.jsx
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
    useParams: () => ({ id: 'collab-workspace-123' })
  };
});

vi.mock('../Sidebar', () => ({
  default: () => <div data-testid="sidebar">Sidebar</div>
}));

vi.mock('../AddMembers', () => ({
  default: () => <div data-testid="add-members">AddMembers</div>
}));

describe('Multi-User Collaboration Integration Tests', () => {
  const mockWorkspace = {
    id: 'collab-workspace-123',
    name: 'Collaboration Test Workspace',
    description: 'Multi-user collaboration testing',
    created_by: 'tl-collab-123'
  };

  const mockUsers = {
    tl: {
      id: 'tl-collab-123',
      email: 'tl-collab@example.com',
      full_name: 'Collaboration Team Leader'
    },
    member1: {
      id: 'member1-collab-123',
      email: 'member1-collab@example.com',
      full_name: 'Collaboration Member One'
    },
    member2: {
      id: 'member2-collab-123',
      email: 'member2-collab@example.com',
      full_name: 'Collaboration Member Two'
    },
    member3: {
      id: 'member3-collab-123',
      email: 'member3-collab@example.com',
      full_name: 'Collaboration Member Three'
    }
  };

  const mockWorkspaceMembers = [
    {
      id: 'wm-1',
      user_id: 'member1-collab-123',
      workspace_id: 'collab-workspace-123',
      users: mockUsers.member1
    },
    {
      id: 'wm-2',
      user_id: 'member2-collab-123',
      workspace_id: 'collab-workspace-123',
      users: mockUsers.member2
    },
    {
      id: 'wm-3',
      user_id: 'member3-collab-123',
      workspace_id: 'collab-workspace-123',
      users: mockUsers.member3
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
    
    // Mock storage operations
    supabase.storage = {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ 
          data: { path: 'collab-test-path/file.pdf' }, 
          error: null 
        }),
        remove: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/collab-file.pdf' }
        })
      }))
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Concurrent Task Management', () => {
    it('should handle multiple members working on different tasks simultaneously', async () => {
      const concurrentTasks = [
        {
          id: 'concurrent-task-1',
          workspace_id: 'collab-workspace-123',
          title: 'Member 1 Task',
          status: 'in_progress',
          assigned_to: 'member1-collab-123',
          assigned_by: 'tl-collab-123',
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'concurrent-task-2',
          workspace_id: 'collab-workspace-123',
          title: 'Member 2 Task',
          status: 'submitted',
          assigned_to: 'member2-collab-123',
          assigned_by: 'tl-collab-123',
          created_at: '2024-01-01T01:00:00Z',
          submitted_at: '2024-01-01T10:00:00Z',
          submission_file_name: 'member2-work.pdf',
          submission_file_url: 'path/to/member2-work.pdf'
        },
        {
          id: 'concurrent-task-3',
          workspace_id: 'collab-workspace-123',
          title: 'Member 3 Task',
          status: 'completed',
          assigned_to: 'member3-collab-123',
          assigned_by: 'tl-collab-123',
          created_at: '2024-01-01T02:00:00Z',
          completed_at: '2024-01-01T15:00:00Z'
        }
      ];

      // Mock TL view seeing all member tasks
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.tl },
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
            eq: vi.fn().mockResolvedValue({
              data: mockWorkspaceMembers,
              error: null
            })
          };
        }
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: concurrentTasks,
              error: null
            })
          };
        }
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockUsers.tl,
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

      render(
        <BrowserRouter>
          <WorkspaceTL />
        </BrowserRouter>
      );

      // Verify TL can see all members and their task statuses
      await waitFor(() => {
        expect(screen.getByText('Collaboration Test Workspace')).toBeInTheDocument();
      });

      // Check each member appears
      expect(screen.getByText('Collaboration Member One')).toBeInTheDocument();
      expect(screen.getByText('Collaboration Member Two')).toBeInTheDocument();
      expect(screen.getByText('Collaboration Member Three')).toBeInTheDocument();

      // Expand member sections to see tasks
      const member1 = screen.getByText('Collaboration Member One');
      fireEvent.click(member1);

      await waitFor(() => {
        expect(screen.getByText('Member 1 Task')).toBeInTheDocument();
      });

      const member2 = screen.getByText('Collaboration Member Two');
      fireEvent.click(member2);

      await waitFor(() => {
        expect(screen.getByText('Member 2 Task')).toBeInTheDocument();
        expect(screen.getByText('member2-work.pdf')).toBeInTheDocument();
      });

      const member3 = screen.getByText('Collaboration Member Three');
      fireEvent.click(member3);

      await waitFor(() => {
        expect(screen.getByText('Member 3 Task')).toBeInTheDocument();
      });

      // Verify different task statuses are displayed correctly
      expect(screen.getByText(/In Progress/i)).toBeInTheDocument();
      expect(screen.getByText(/Under Review/i)).toBeInTheDocument();
      expect(screen.getByText(/Completed/i)).toBeInTheDocument();
    });

    it('should handle task reassignment conflicts gracefully', async () => {
      const conflictTask = {
        id: 'conflict-task-1',
        workspace_id: 'collab-workspace-123',
        title: 'Conflict Resolution Task',
        status: 'in_progress',
        assigned_to: 'member1-collab-123',
        assigned_by: 'tl-collab-123',
        created_at: '2024-01-01T00:00:00Z',
        started_at: '2024-01-01T09:00:00Z'
      };

      // Mock TL attempting to revoke task while member is working
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.tl },
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
              data: [mockWorkspaceMembers[0]], // Only member1
              error: null
            })
          };
        }
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [conflictTask],
              error: null
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockUsers.tl, error: null })
        };
      });

      render(
        <BrowserRouter>
          <WorkspaceTL />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Collaboration Test Workspace')).toBeInTheDocument();
      });

      // Expand member section
      const member1 = screen.getByText('Collaboration Member One');
      fireEvent.click(member1);

      await waitFor(() => {
        expect(screen.getByText('Conflict Resolution Task')).toBeInTheDocument();
      });

      // TL revokes the task
      const revokeButton = screen.getByRole('button', { name: /revoke assignment/i });
      fireEvent.click(revokeButton);

      await waitFor(() => {
        expect(screen.getByText('Revoke Task Assignment?')).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /confirm revocation/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(TaskService.revokeTaskAssignment).toHaveBeenCalledWith('conflict-task-1');
        expect(window.alert).toHaveBeenCalledWith('Task assignment revoked successfully!');
      });

      // Verify the system handles the revocation gracefully
      // (In a real scenario, the member would see their task disappear from their view)
    });
  });

  describe('Peer Review Workflows', () => {
    it('should allow multiple members to review different TL submissions', async () => {
      const tlTasks = [
        {
          id: 'tl-review-task-1',
          workspace_id: 'collab-workspace-123',
          title: 'TL Task for Review 1',
          status: 'submitted',
          assigned_to: 'tl-collab-123',
          assigned_by: 'tl-collab-123',
          submitted_at: '2024-01-01T10:00:00Z',
          submission_file_name: 'tl-submission-1.pdf',
          submission_file_url: 'path/to/tl-submission-1.pdf'
        },
        {
          id: 'tl-review-task-2',
          workspace_id: 'collab-workspace-123',
          title: 'TL Task for Review 2',
          status: 'submitted',
          assigned_to: 'tl-collab-123',
          assigned_by: 'tl-collab-123',
          submitted_at: '2024-01-01T11:00:00Z',
          submission_file_name: 'tl-submission-2.pdf',
          submission_file_url: 'path/to/tl-submission-2.pdf'
        }
      ];

      TaskService.submitReview.mockResolvedValue({ success: true });

      // Test Member 1 reviewing first TL task
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.member1 },
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
              data: { user_id: 'member1-collab-123', workspace_id: 'collab-workspace-123' },
              error: null
            })
          };
        }
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: tlTasks,
              error: null
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockUsers.tl, error: null })
        };
      });

      const { unmount: unmountMember1 } = render(
        <BrowserRouter>
          <WorkspaceTM />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('TL Task for Review 1')).toBeInTheDocument();
        expect(screen.getByText('TL Task for Review 2')).toBeInTheDocument();
      });

      // Member 1 approves first task
      const approveButtons = screen.getAllByText(/Approve/i);
      fireEvent.click(approveButtons[0]);

      await waitFor(() => {
        expect(TaskService.submitReview).toHaveBeenCalledWith(
          'tl-review-task-1',
          'approve',
          undefined
        );
      });

      unmountMember1();

      // Test Member 2 reviewing second TL task
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.member2 },
        error: null
      });

      supabase.from.mockImplementation((table) => {
        if (table === 'workspace_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { user_id: 'member2-collab-123', workspace_id: 'collab-workspace-123' },
              error: null
            })
          };
        }
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [tlTasks[1]], // Only second task still under review
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
          <WorkspaceTM />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('TL Task for Review 2')).toBeInTheDocument();
      });

      // Member 2 requests redo for second task
      const redoButton = screen.getAllByText(/Request Redo/i)[0];
      fireEvent.click(redoButton);

      await waitFor(() => {
        expect(screen.getByText(/Request Redo/i)).toBeInTheDocument();
      });

      // Add feedback
      const commentInput = screen.getByPlaceholderText(/Add your feedback/i);
      fireEvent.change(commentInput, { 
        target: { value: 'Please add more details to the analysis section' } 
      });

      const submitRedoButton = screen.getAllByText(/Request Redo/i)[1];
      fireEvent.click(submitRedoButton);

      await waitFor(() => {
        expect(TaskService.submitReview).toHaveBeenCalledWith(
          'tl-review-task-2',
          'request_redo',
          'Please add more details to the analysis section'
        );
      });
    });

    it('should handle cross-member task reviews and feedback loops', async () => {
      const crossReviewTask = {
        id: 'cross-review-task-1',
        workspace_id: 'collab-workspace-123',
        title: 'Cross Review Task',
        status: 'submitted',
        assigned_to: 'member1-collab-123',
        assigned_by: 'tl-collab-123',
        submitted_at: '2024-01-01T10:00:00Z',
        submission_file_name: 'cross-review-submission.pdf',
        submission_file_url: 'path/to/cross-review-submission.pdf'
      };

      TaskService.submitReview.mockResolvedValue({ success: true });

      // Member 2 reviews Member 1's task
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.member2 },
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
              data: { user_id: 'member2-collab-123', workspace_id: 'collab-workspace-123' },
              error: null
            })
          };
        }
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [crossReviewTask],
              error: null
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockUsers.tl, error: null })
        };
      });

      render(
        <BrowserRouter>
          <WorkspaceTM />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Cross Review Task')).toBeInTheDocument();
      });

      // Member 2 can review Member 1's submission
      const approveButton = screen.getAllByText(/Approve/i)[0];
      expect(approveButton).toBeInTheDocument();

      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(TaskService.submitReview).toHaveBeenCalledWith(
          'cross-review-task-1',
          'approve',
          undefined
        );
      });

      // Verify success feedback
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('approved'));
    });
  });

  describe('Dashboard Collaboration Features', () => {
    it('should show all team submissions with proper attribution', async () => {
      const collaborativeSubmissions = [
        {
          id: 'collab-sub-1',
          task_id: 'task-1',
          workspace_id: 'collab-workspace-123',
          submitted_by: 'member1-collab-123',
          submitter_name: 'Collaboration Member One',
          task_title: 'Member 1 Collaborative Task',
          file_url: 'path/to/member1-collab.pdf',
          file_name: 'member1-collaboration.pdf',
          file_size: 1024000,
          file_type: 'application/pdf',
          submitted_at: '2024-01-01T10:00:00Z',
          status: 'under_review'
        },
        {
          id: 'collab-sub-2',
          task_id: 'task-2',
          workspace_id: 'collab-workspace-123',
          submitted_by: 'member2-collab-123',
          submitter_name: 'Collaboration Member Two',
          task_title: 'Member 2 Collaborative Task',
          file_url: 'path/to/member2-collab.docx',
          file_name: 'member2-collaboration.docx',
          file_size: 2048000,
          file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          submitted_at: '2024-01-01T11:00:00Z',
          status: 'approved'
        },
        {
          id: 'collab-sub-3',
          task_id: 'task-3',
          workspace_id: 'collab-workspace-123',
          submitted_by: 'tl-collab-123',
          submitter_name: 'Collaboration Team Leader',
          task_title: 'TL Collaborative Task',
          file_url: 'path/to/tl-collab.xlsx',
          file_name: 'tl-collaboration.xlsx',
          file_size: 3072000,
          file_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          submitted_at: '2024-01-01T12:00:00Z',
          status: 'under_review'
        }
      ];

      TaskService.getWorkspaceSubmissions.mockResolvedValue(collaborativeSubmissions);

      // Any member can view dashboard
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.member3 },
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
              data: { user_id: 'member3-collab-123', workspace_id: 'collab-workspace-123' },
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
              data: collaborativeSubmissions.map(sub => ({
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
                  email: `${sub.submitted_by}@example.com`
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

      render(
        <BrowserRouter>
          <WorkspaceDashboard />
        </BrowserRouter>
      );

      // Verify all submissions are visible
      await waitFor(() => {
        expect(screen.getByText(/Workspace Submissions/i)).toBeInTheDocument();
      });

      // Check all files are displayed
      expect(screen.getByText('member1-collaboration.pdf')).toBeInTheDocument();
      expect(screen.getByText('member2-collaboration.docx')).toBeInTheDocument();
      expect(screen.getByText('tl-collaboration.xlsx')).toBeInTheDocument();

      // Check all submitters are attributed
      expect(screen.getByText('Collaboration Member One')).toBeInTheDocument();
      expect(screen.getByText('Collaboration Member Two')).toBeInTheDocument();
      expect(screen.getByText('Collaboration Team Leader')).toBeInTheDocument();

      // Check all task titles are shown
      expect(screen.getByText('Member 1 Collaborative Task')).toBeInTheDocument();
      expect(screen.getByText('Member 2 Collaborative Task')).toBeInTheDocument();
      expect(screen.getByText('TL Collaborative Task')).toBeInTheDocument();

      // Verify download functionality is available for all
      const downloadButtons = screen.getAllByText(/Download/i);
      expect(downloadButtons.length).toBe(3);

      // Test download functionality
      fireEvent.click(downloadButtons[0]);
      expect(supabase.storage.from).toHaveBeenCalledWith('task-submissions');
    });

    it('should handle real-time updates when multiple users submit simultaneously', async () => {
      // Initial state with one submission
      const initialSubmissions = [
        {
          id: 'realtime-sub-1',
          task_id: 'task-1',
          workspace_id: 'collab-workspace-123',
          submitted_by: 'member1-collab-123',
          submitter_name: 'Collaboration Member One',
          task_title: 'Initial Task',
          file_url: 'path/to/initial.pdf',
          file_name: 'initial-submission.pdf',
          file_size: 1024000,
          submitted_at: '2024-01-01T10:00:00Z',
          status: 'under_review'
        }
      ];

      // Updated state with additional submissions
      const updatedSubmissions = [
        ...initialSubmissions,
        {
          id: 'realtime-sub-2',
          task_id: 'task-2',
          workspace_id: 'collab-workspace-123',
          submitted_by: 'member2-collab-123',
          submitter_name: 'Collaboration Member Two',
          task_title: 'New Task',
          file_url: 'path/to/new.pdf',
          file_name: 'new-submission.pdf',
          file_size: 2048000,
          submitted_at: '2024-01-01T11:00:00Z',
          status: 'under_review'
        }
      ];

      TaskService.getWorkspaceSubmissions
        .mockResolvedValueOnce(initialSubmissions)
        .mockResolvedValueOnce(updatedSubmissions);

      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.member3 },
        error: null
      });

      supabase.from.mockImplementation((table) => {
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            order: vi.fn()
              .mockResolvedValueOnce({
                data: initialSubmissions.map(sub => ({
                  id: sub.task_id,
                  title: sub.task_title,
                  submission_file_name: sub.file_name,
                  users: { full_name: sub.submitter_name }
                })),
                error: null
              })
              .mockResolvedValueOnce({
                data: updatedSubmissions.map(sub => ({
                  id: sub.task_id,
                  title: sub.task_title,
                  submission_file_name: sub.file_name,
                  users: { full_name: sub.submitter_name }
                })),
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

      const { rerender } = render(
        <BrowserRouter>
          <WorkspaceDashboard />
        </BrowserRouter>
      );

      // Initial state
      await waitFor(() => {
        expect(screen.getByText('initial-submission.pdf')).toBeInTheDocument();
        expect(screen.queryByText('new-submission.pdf')).not.toBeInTheDocument();
      });

      // Simulate real-time update
      rerender(
        <BrowserRouter>
          <WorkspaceDashboard />
        </BrowserRouter>
      );

      // Updated state should show both submissions
      await waitFor(() => {
        expect(screen.getByText('initial-submission.pdf')).toBeInTheDocument();
        expect(screen.getByText('new-submission.pdf')).toBeInTheDocument();
      });
    });
  });

  describe('Permission and Access Control in Multi-User Environment', () => {
    it('should enforce proper permissions across different user roles', async () => {
      const permissionTestTask = {
        id: 'permission-task-1',
        workspace_id: 'collab-workspace-123',
        title: 'Permission Test Task',
        status: 'in_progress',
        assigned_to: 'member1-collab-123',
        assigned_by: 'tl-collab-123',
        created_at: '2024-01-01T00:00:00Z'
      };

      // Test 1: TL should see revoke button
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.tl },
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
            eq: vi.fn().mockResolvedValue({
              data: [mockWorkspaceMembers[0]], // Only member1
              error: null
            })
          };
        }
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [permissionTestTask],
              error: null
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mkReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockUsers.tl, error: null })
        };
      });

      const { unmount: unmountTL } = render(
        <BrowserRouter>
          <WorkspaceTL />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Collaboration Test Workspace')).toBeInTheDocument();
      });

      const member1 = screen.getByText('Collaboration Member One');
      fireEvent.click(member1);

      await waitFor(() => {
        expect(screen.getByText('Permission Test Task')).toBeInTheDocument();
      });

      // TL should see revoke button
      expect(screen.getByRole('button', { name: /revoke assignment/i })).toBeInTheDocument();

      unmountTL();

      // Test 2: Regular member should NOT see revoke button
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUsers.member2 },
        error: null
      });

      supabase.from.mockImplementation((table) => {
        if (table === 'workspace_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { user_id: 'member2-collab-123', workspace_id: 'collab-workspace-123' },
              error: null
            })
          };
        }
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [permissionTestTask],
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
          <WorkspaceTM />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Permission Test Task')).toBeInTheDocument();
      });

      // Regular member should NOT see revoke button
      expect(screen.queryByRole('button', { name: /revoke assignment/i })).not.toBeInTheDocument();

      // But should see review options if task was submitted
      // (This would be tested with a submitted task)
    });
  });
});
/**
 * End-to-End Test: Complete Owner Task Workflow
 * 
 * This test validates the entire workflow for workspace owners managing their own tasks:
 * 1. Owner creates/assigns task to themselves
 * 2. Owner starts the task
 * 3. Owner uploads submission
 * 4. Task appears in TL review section for members
 * 5. Members can approve/reject the owner's submission
 * 6. Task completes successfully
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import WorkspaceTL from '../WorkspaceTL';
import WorkspaceTM from '../WorkspaceTM';
import TaskService from '../services/TaskService';

// Mock dependencies
vi.mock('../services/TaskService');
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'owner-123', email: 'owner@test.com' },
    loading: false
  })
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'workspace-123' })
  };
});

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [],
            error: null
          }))
        }))
      }))
    }))
  })),
  storage: {
    from: vi.fn(() => ({
      getPublicUrl: vi.fn(() => ({
        data: { publicUrl: 'https://example.com/file.pdf' }
      }))
    }))
  }
};

vi.mock('../lib/supabase', () => ({
  default: mockSupabase
}));

describe('Owner Task Workflow - End to End', () => {
  const mockWorkspaceData = {
    id: 'workspace-123',
    name: 'Test Workspace',
    created_by: 'owner-123',
    members: [
      { user_id: 'owner-123', role: 'owner', user: { email: 'owner@test.com', full_name: 'Owner User' } },
      { user_id: 'member-456', role: 'member', user: { email: 'member@test.com', full_name: 'Member User' } }
    ]
  };

  const mockOwnerTask = {
    id: 'task-owner-1',
    title: 'Owner Task - Strategic Planning',
    description: 'Complete strategic planning document',
    status: 'todo',
    assigned_to: 'owner-123',
    assigned_by: 'owner-123',
    workspace_id: 'workspace-123',
    created_at: '2024-01-01T10:00:00Z',
    due_date: '2024-01-15T23:59:59Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default Supabase responses
    mockSupabase.from.mockImplementation((table) => {
      const mockQuery = {
        select: vi.fn(() => mockQuery),
        eq: vi.fn(() => mockQuery),
        order: vi.fn(() => mockQuery),
        data: [],
        error: null
      };

      if (table === 'workspaces') {
        mockQuery.data = [mockWorkspaceData];
      } else if (table === 'tasks') {
        mockQuery.data = [mockOwnerTask];
      }

      return mockQuery;
    });
  });

  test('Complete Owner Task Workflow - Happy Path', async () => {
    // Mock TaskService methods
    TaskService.updateTaskStatus = vi.fn().mockResolvedValue({ success: true });
    TaskService.uploadTaskSubmission = vi.fn().mockResolvedValue({ 
      success: true, 
      fileUrl: 'path/to/strategic-plan.pdf',
      fileName: 'strategic-plan.pdf'
    });
    TaskService.submitReview = vi.fn().mockResolvedValue({ success: true });

    // Step 1: Render WorkspaceTL (Owner's view)
    const { rerender } = render(
      <BrowserRouter>
        <WorkspaceTL />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Workspace')).toBeInTheDocument();
    });

    // Step 2: Owner starts the task
    const startButton = screen.getByText('Start Task');
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(TaskService.updateTaskStatus).toHaveBeenCalledWith(
        'task-owner-1',
        'in_progress',
        'owner-123'
      );
    });

    // Step 3: Update task status to in_progress and re-render
    const inProgressTask = { ...mockOwnerTask, status: 'in_progress' };
    mockSupabase.from.mockImplementation((table) => {
      const mockQuery = {
        select: vi.fn(() => mockQuery),
        eq: vi.fn(() => mockQuery),
        order: vi.fn(() => mockQuery),
        data: table === 'tasks' ? [inProgressTask] : [mockWorkspaceData],
        error: null
      };
      return mockQuery;
    });

    rerender(
      <BrowserRouter>
        <WorkspaceTL />
      </BrowserRouter>
    );

    // Step 4: Owner uploads submission
    await waitFor(() => {
      expect(screen.getByText('Upload Submission')).toBeInTheDocument();
    });

    const fileInput = screen.getByLabelText(/upload/i);
    const file = new File(['strategic plan content'], 'strategic-plan.pdf', { type: 'application/pdf' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    const uploadButton = screen.getByText('Submit Task');
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(TaskService.uploadTaskSubmission).toHaveBeenCalledWith(
        'task-owner-1',
        file,
        'owner-123'
      );
    });

    // Step 5: Update task to submitted status
    const submittedTask = { 
      ...mockOwnerTask, 
      status: 'submitted',
      submission_file_url: 'path/to/strategic-plan.pdf',
      submission_file_name: 'strategic-plan.pdf',
      submitted_at: '2024-01-01T15:00:00Z'
    };

    mockSupabase.from.mockImplementation((table) => {
      const mockQuery = {
        select: vi.fn(() => mockQuery),
        eq: vi.fn(() => mockQuery),
        order: vi.fn(() => mockQuery),
        data: table === 'tasks' ? [submittedTask] : [mockWorkspaceData],
        error: null
      };
      return mockQuery;
    });

    // Step 6: Switch to WorkspaceTM (Member's view) to see TL task for review
    rerender(
      <BrowserRouter>
        <WorkspaceTM />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Team Lead Tasks for Review')).toBeInTheDocument();
    });

    // Step 7: Member reviews and approves the TL task
    await waitFor(() => {
      expect(screen.getByText('Owner Task - Strategic Planning')).toBeInTheDocument();
      expect(screen.getByText('Approve')).toBeInTheDocument();
      expect(screen.getByText('Request Redo')).toBeInTheDocument();
    });

    const approveButton = screen.getByText('Approve');
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(TaskService.submitReview).toHaveBeenCalledWith(
        'task-owner-1',
        'approved',
        expect.any(String), // member user ID
        expect.any(String)  // review comment
      );
    });

    // Step 8: Verify task completion
    const completedTask = { ...submittedTask, status: 'completed' };
    mockSupabase.from.mockImplementation((table) => {
      const mockQuery = {
        select: vi.fn(() => mockQuery),
        eq: vi.fn(() => mockQuery),
        order: vi.fn(() => mockQuery),
        data: table === 'tasks' ? [completedTask] : [mockWorkspaceData],
        error: null
      };
      return mockQuery;
    });

    rerender(
      <BrowserRouter>
        <WorkspaceTL />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });
  });

  test('Owner Task Workflow - Request Redo Scenario', async () => {
    // Mock TaskService methods
    TaskService.updateTaskStatus = vi.fn().mockResolvedValue({ success: true });
    TaskService.uploadTaskSubmission = vi.fn().mockResolvedValue({ 
      success: true, 
      fileUrl: 'path/to/draft-plan.pdf',
      fileName: 'draft-plan.pdf'
    });
    TaskService.submitReview = vi.fn().mockResolvedValue({ success: true });

    // Start with submitted task
    const submittedTask = { 
      ...mockOwnerTask, 
      status: 'submitted',
      submission_file_url: 'path/to/draft-plan.pdf',
      submission_file_name: 'draft-plan.pdf',
      submitted_at: '2024-01-01T15:00:00Z'
    };

    mockSupabase.from.mockImplementation((table) => {
      const mockQuery = {
        select: vi.fn(() => mockQuery),
        eq: vi.fn(() => mockQuery),
        order: vi.fn(() => mockQuery),
        data: table === 'tasks' ? [submittedTask] : [mockWorkspaceData],
        error: null
      };
      return mockQuery;
    });

    // Render WorkspaceTM (Member's view)
    render(
      <BrowserRouter>
        <WorkspaceTM />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Team Lead Tasks for Review')).toBeInTheDocument();
    });

    // Member requests redo
    const requestRedoButton = screen.getByText('Request Redo');
    fireEvent.click(requestRedoButton);

    await waitFor(() => {
      expect(TaskService.submitReview).toHaveBeenCalledWith(
        'task-owner-1',
        'needs_revision',
        expect.any(String), // member user ID
        expect.any(String)  // review comment
      );
    });
  });

  test('Owner Task Workflow - Error Handling', async () => {
    // Mock TaskService to return errors
    TaskService.updateTaskStatus = vi.fn().mockRejectedValue(new Error('Database connection failed'));
    TaskService.uploadTaskSubmission = vi.fn().mockRejectedValue(new Error('File upload failed'));

    render(
      <BrowserRouter>
        <WorkspaceTL />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Workspace')).toBeInTheDocument();
    });

    // Try to start task - should handle error gracefully
    const startButton = screen.getByText('Start Task');
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(TaskService.updateTaskStatus).toHaveBeenCalled();
      // Should show error message or maintain current state
      expect(screen.getByText('Start Task')).toBeInTheDocument(); // Button still there
    });
  });

  test('Owner Task Permissions Validation', async () => {
    // Test that only workspace owners can manage their own tasks
    const memberTask = {
      ...mockOwnerTask,
      id: 'task-member-1',
      assigned_to: 'member-456',
      assigned_by: 'owner-123'
    };

    mockSupabase.from.mockImplementation((table) => {
      const mockQuery = {
        select: vi.fn(() => mockQuery),
        eq: vi.fn(() => mockQuery),
        order: vi.fn(() => mockQuery),
        data: table === 'tasks' ? [memberTask] : [mockWorkspaceData],
        error: null
      };
      return mockQuery;
    });

    render(
      <BrowserRouter>
        <WorkspaceTL />
      </BrowserRouter>
    );

    await waitFor(() => {
      // Owner should not see start button for member's task
      expect(screen.queryByText('Start Task')).not.toBeInTheDocument();
    });
  });

  test('File Viewing and Downloading for Owner Tasks', async () => {
    const submittedTask = { 
      ...mockOwnerTask, 
      status: 'submitted',
      submission_file_url: 'path/to/strategic-plan.pdf',
      submission_file_name: 'strategic-plan.pdf',
      submitted_at: '2024-01-01T15:00:00Z'
    };

    mockSupabase.from.mockImplementation((table) => {
      const mockQuery = {
        select: vi.fn(() => mockQuery),
        eq: vi.fn(() => mockQuery),
        order: vi.fn(() => mockQuery),
        data: table === 'tasks' ? [submittedTask] : [mockWorkspaceData],
        error: null
      };
      return mockQuery;
    });

    // Mock window.open
    const mockOpen = vi.fn();
    Object.defineProperty(window, 'open', { value: mockOpen });

    render(
      <BrowserRouter>
        <WorkspaceTM />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Team Lead Tasks for Review')).toBeInTheDocument();
    });

    // Test file viewing
    const viewButton = screen.getByText('View File');
    fireEvent.click(viewButton);

    expect(mockOpen).toHaveBeenCalledWith('https://example.com/file.pdf', '_blank');
  });
});
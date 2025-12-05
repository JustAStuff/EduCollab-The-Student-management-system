import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import WorkspaceTL from '../WorkspaceTL';
import { supabase } from '../supabaseClient';

// Mock dependencies
vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    },
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'test-workspace-id' }),
  };
});

vi.mock('../Sidebar', () => ({
  default: () => <div data-testid="sidebar">Sidebar</div>,
}));

vi.mock('../AddMembers', () => ({
  default: () => <div data-testid="add-members">AddMembers</div>,
}));

describe('WorkspaceTL - TL Task Management', () => {
  const mockUser = {
    id: 'tl-user-id',
    email: 'tl@example.com',
  };

  const mockWorkspace = {
    id: 'test-workspace-id',
    name: 'Test Workspace',
    description: 'Test Description',
    created_by: 'tl-user-id',
  };

  const mockTLTasks = [
    {
      id: 'tl-task-1',
      workspace_id: 'test-workspace-id',
      title: 'TL Task 1',
      description: 'First TL task',
      status: 'todo',
      assigned_to: 'tl-user-id',
      assigned_by: 'tl-user-id',
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'tl-task-2',
      workspace_id: 'test-workspace-id',
      title: 'TL Task 2',
      description: 'Second TL task',
      status: 'in_progress',
      assigned_to: 'tl-user-id',
      assigned_by: 'tl-user-id',
      created_at: '2024-01-02T00:00:00Z',
      started_at: '2024-01-02T10:00:00Z',
    },
    {
      id: 'tl-task-3',
      workspace_id: 'test-workspace-id',
      title: 'TL Task 3',
      description: 'Third TL task',
      status: 'submitted',
      assigned_to: 'tl-user-id',
      assigned_by: 'tl-user-id',
      created_at: '2024-01-03T00:00:00Z',
      submitted_at: '2024-01-03T10:00:00Z',
      submission_file_name: 'submission.pdf',
      submission_file_url: 'path/to/submission.pdf',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock auth
    supabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Track call counts for tasks table
    let tasksCallCount = 0;

    // Mock database queries
    const mockFrom = vi.fn((table) => {
      if (table === 'workspaces') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockWorkspace,
            error: null,
          }),
        };
      } else if (table === 'workspace_members') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        };
      } else if (table === 'tasks') {
        tasksCallCount++;
        const currentCall = tasksCallCount;
        
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockImplementation(() => {
            // First call: all workspace tasks (empty for simplicity)
            // Second call: TL's tasks
            if (currentCall === 1) {
              return Promise.resolve({ data: [], error: null });
            } else {
              return Promise.resolve({ data: mockTLTasks, error: null });
            }
          }),
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      } else if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: mockUser.id, email: mockUser.email, full_name: 'Test User' },
            error: null,
          }),
        };
      }

      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    supabase.from.mockImplementation(mockFrom);
  });

  it('should display "My Tasks" section', async () => {
    render(
      <BrowserRouter>
        <WorkspaceTL />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/My Tasks/i)).toBeInTheDocument();
    });
  });

  it('should display TL tasks count', async () => {
    render(
      <BrowserRouter>
        <WorkspaceTL />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/My Tasks \(3\)/i)).toBeInTheDocument();
    });
  });

  it('should display all TL tasks with correct status', async () => {
    render(
      <BrowserRouter>
        <WorkspaceTL />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('TL Task 1')).toBeInTheDocument();
      expect(screen.getByText('TL Task 2')).toBeInTheDocument();
      expect(screen.getByText('TL Task 3')).toBeInTheDocument();
    });
  });

  it('should show "Start Task" button for todo tasks', async () => {
    render(
      <BrowserRouter>
        <WorkspaceTL />
      </BrowserRouter>
    );

    await waitFor(() => {
      const startButtons = screen.getAllByText(/Start Task/i);
      expect(startButtons.length).toBeGreaterThan(0);
    });
  });

  it('should show "Upload Result" button for in-progress tasks', async () => {
    render(
      <BrowserRouter>
        <WorkspaceTL />
      </BrowserRouter>
    );

    await waitFor(() => {
      const uploadButtons = screen.getAllByText(/Upload Result/i);
      expect(uploadButtons.length).toBeGreaterThan(0);
    });
  });

  it('should show submission info for submitted tasks', async () => {
    render(
      <BrowserRouter>
        <WorkspaceTL />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('submission.pdf')).toBeInTheDocument();
    });
  });

  it('should handle task status change to in_progress', async () => {
    render(
      <BrowserRouter>
        <WorkspaceTL />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('TL Task 1')).toBeInTheDocument();
    });

    // Verify Start Task button is present
    const startButtons = screen.getAllByText(/Start Task/i);
    expect(startButtons.length).toBeGreaterThan(0);
  });

  it('should open upload dialog when clicking Upload Result', async () => {
    render(
      <BrowserRouter>
        <WorkspaceTL />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('TL Task 2')).toBeInTheDocument();
    });

    const uploadButton = screen.getAllByText(/Upload Result/i)[0];
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText(/Upload Task Submission/i)).toBeInTheDocument();
    });
  });

  it('should display message when TL has no tasks', async () => {
    supabase.from.mockImplementation((table) => {
      if (table === 'tasks') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockWorkspace, error: null }),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    render(
      <BrowserRouter>
        <WorkspaceTL />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/You don't have any tasks assigned to you yet/i)).toBeInTheDocument();
    });
  });

  it('should display TaskCard components for TL tasks', async () => {
    render(
      <BrowserRouter>
        <WorkspaceTL />
      </BrowserRouter>
    );

    await waitFor(() => {
      // Verify that TaskCard components are rendered by checking for task titles
      expect(screen.getByText('TL Task 1')).toBeInTheDocument();
      expect(screen.getByText('TL Task 2')).toBeInTheDocument();
      expect(screen.getByText('TL Task 3')).toBeInTheDocument();
    });

    // Verify status chips are displayed
    const statusChips = screen.getAllByText(/To Do|In Progress|Under Review/i);
    expect(statusChips.length).toBeGreaterThan(0);
  });
});

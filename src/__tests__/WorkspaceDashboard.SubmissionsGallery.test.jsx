// WorkspaceDashboard.SubmissionsGallery.test.jsx - Integration tests for submissions gallery in dashboard
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import WorkspaceDashboard from '../WorkspaceDashboard';
import { supabase } from '../supabaseClient';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'workspace-123' }),
    useNavigate: () => vi.fn()
  };
});

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
      on: vi.fn(() => ({
        subscribe: vi.fn()
      }))
    })),
    removeChannel: vi.fn()
  }
}));

// Mock Sidebar
vi.mock('../Sidebar', () => ({
  default: () => <div data-testid="sidebar">Sidebar</div>
}));

describe('WorkspaceDashboard - Submissions Gallery Integration', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com'
  };

  const mockWorkspace = {
    id: 'workspace-123',
    name: 'Test Workspace',
    description: 'Test Description',
    created_by: 'user-123',
    created_at: '2024-01-01T00:00:00Z'
  };

  const mockSubmissions = [
    {
      id: 'task-1',
      title: 'Complete Report',
      submission_file_url: 'workspace-123/task-1/user-1_123456.pdf',
      submission_file_name: 'report.pdf',
      submission_file_size: 1024000,
      submitted_at: '2024-01-15T10:00:00Z',
      status: 'submitted',
      assigned_to: 'user-1',
      users: {
        full_name: 'John Doe',
        email: 'john@example.com'
      }
    },
    {
      id: 'task-2',
      title: 'Design Mockups',
      submission_file_url: 'workspace-123/task-2/user-2_123457.png',
      submission_file_name: 'mockup.png',
      submission_file_size: 2048000,
      submitted_at: '2024-01-16T11:00:00Z',
      status: 'completed',
      assigned_to: 'user-2',
      users: {
        full_name: 'Jane Smith',
        email: 'jane@example.com'
      }
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock auth
    supabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    // Mock database queries
    supabase.from.mockImplementation((table) => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn(),
        insert: vi.fn(),
        update: vi.fn()
      };

      if (table === 'workspaces') {
        mockChain.single.mockResolvedValue({
          data: mockWorkspace,
          error: null
        });
      } else if (table === 'workspace_members') {
        mockChain.single.mockResolvedValue({
          data: null,
          error: null
        });
        mockChain.eq.mockReturnValue({
          ...mockChain,
          then: (resolve) => resolve({ data: [], error: null })
        });
      } else if (table === 'users') {
        mockChain.single.mockResolvedValue({
          data: mockUser,
          error: null
        });
      } else if (table === 'tasks') {
        // For unassigned tasks
        mockChain.is.mockReturnValue({
          ...mockChain,
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        });
        
        // For submissions query
        mockChain.not.mockReturnValue({
          ...mockChain,
          order: vi.fn().mockResolvedValue({
            data: mockSubmissions,
            error: null
          })
        });
        
        // For member tasks
        mockChain.eq.mockReturnValue({
          ...mockChain,
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        });
      }

      return mockChain;
    });
  });

  it('should display submissions gallery section', async () => {
    render(
      <BrowserRouter>
        <WorkspaceDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Workspace Submissions/i)).toBeInTheDocument();
    });
  });

  it('should display submission count in header', async () => {
    render(
      <BrowserRouter>
        <WorkspaceDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Workspace Submissions \(2\)/i)).toBeInTheDocument();
    });
  });

  it('should fetch and display all submissions', async () => {
    render(
      <BrowserRouter>
        <WorkspaceDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('report.pdf')).toBeInTheDocument();
      expect(screen.getByText('mockup.png')).toBeInTheDocument();
    });
  });

  it('should display submitter information', async () => {
    render(
      <BrowserRouter>
        <WorkspaceDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/By: John Doe/i)).toBeInTheDocument();
      expect(screen.getByText(/By: Jane Smith/i)).toBeInTheDocument();
    });
  });

  it('should display task information for each submission', async () => {
    render(
      <BrowserRouter>
        <WorkspaceDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Task: Complete Report/i)).toBeInTheDocument();
      expect(screen.getByText(/Task: Design Mockups/i)).toBeInTheDocument();
    });
  });

  it('should show loading state while fetching submissions', async () => {
    // Create a promise that we can control
    let resolvePromise;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    supabase.from.mockImplementation((table) => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn(),
        insert: vi.fn(),
        update: vi.fn()
      };

      if (table === 'workspaces') {
        mockChain.single.mockResolvedValue({
          data: mockWorkspace,
          error: null
        });
      } else if (table === 'workspace_members') {
        mockChain.single.mockResolvedValue({
          data: null,
          error: null
        });
        mockChain.eq.mockReturnValue({
          ...mockChain,
          then: (resolve) => resolve({ data: [], error: null })
        });
      } else if (table === 'users') {
        mockChain.single.mockResolvedValue({
          data: mockUser,
          error: null
        });
      } else if (table === 'tasks') {
        mockChain.is.mockReturnValue({
          ...mockChain,
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        });
        
        // Delay submissions query
        mockChain.not.mockReturnValue({
          ...mockChain,
          order: vi.fn().mockReturnValue(promise)
        });
        
        mockChain.eq.mockReturnValue({
          ...mockChain,
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        });
      }

      return mockChain;
    });

    render(
      <BrowserRouter>
        <WorkspaceDashboard />
      </BrowserRouter>
    );

    // Should show loading initially
    await waitFor(() => {
      const loadingIndicators = screen.getAllByRole('progressbar');
      expect(loadingIndicators.length).toBeGreaterThan(0);
    });

    // Resolve the promise
    resolvePromise({ data: mockSubmissions, error: null });

    // Should show submissions after loading
    await waitFor(() => {
      expect(screen.getByText('report.pdf')).toBeInTheDocument();
    });
  });

  it('should display empty state when no submissions', async () => {
    supabase.from.mockImplementation((table) => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn(),
        insert: vi.fn(),
        update: vi.fn()
      };

      if (table === 'workspaces') {
        mockChain.single.mockResolvedValue({
          data: mockWorkspace,
          error: null
        });
      } else if (table === 'workspace_members') {
        mockChain.single.mockResolvedValue({
          data: null,
          error: null
        });
        mockChain.eq.mockReturnValue({
          ...mockChain,
          then: (resolve) => resolve({ data: [], error: null })
        });
      } else if (table === 'users') {
        mockChain.single.mockResolvedValue({
          data: mockUser,
          error: null
        });
      } else if (table === 'tasks') {
        mockChain.is.mockReturnValue({
          ...mockChain,
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        });
        
        // No submissions
        mockChain.not.mockReturnValue({
          ...mockChain,
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        });
        
        mockChain.eq.mockReturnValue({
          ...mockChain,
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        });
      }

      return mockChain;
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

  it('should display submissions gallery before team members section', async () => {
    render(
      <BrowserRouter>
        <WorkspaceDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      const submissionsHeader = screen.getByText(/Workspace Submissions/i);
      const teamMembersHeader = screen.getByText(/Team Members/i);
      
      expect(submissionsHeader).toBeInTheDocument();
      expect(teamMembersHeader).toBeInTheDocument();
      
      // Check that submissions comes before team members in the DOM
      const submissionsPosition = submissionsHeader.compareDocumentPosition(teamMembersHeader);
      expect(submissionsPosition & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  it('should handle submission fetch errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    supabase.from.mockImplementation((table) => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn(),
        insert: vi.fn(),
        update: vi.fn()
      };

      if (table === 'workspaces') {
        mockChain.single.mockResolvedValue({
          data: mockWorkspace,
          error: null
        });
      } else if (table === 'workspace_members') {
        mockChain.single.mockResolvedValue({
          data: null,
          error: null
        });
        mockChain.eq.mockReturnValue({
          ...mockChain,
          then: (resolve) => resolve({ data: [], error: null })
        });
      } else if (table === 'users') {
        mockChain.single.mockResolvedValue({
          data: mockUser,
          error: null
        });
      } else if (table === 'tasks') {
        mockChain.is.mockReturnValue({
          ...mockChain,
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        });
        
        // Submissions query fails
        mockChain.not.mockReturnValue({
          ...mockChain,
          order: vi.fn().mockResolvedValue({
            data: null,
            error: new Error('Database error')
          })
        });
        
        mockChain.eq.mockReturnValue({
          ...mockChain,
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        });
      }

      return mockChain;
    });

    render(
      <BrowserRouter>
        <WorkspaceDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching submissions:',
        expect.any(Error)
      );
    });

    consoleErrorSpy.mockRestore();
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import WorkspaceTL from '../WorkspaceTL';
import WorkspaceTM from '../WorkspaceTM';

// Mock supabase
vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() => Promise.resolve({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } }
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: {
              id: 'test-workspace-id',
              name: 'Test Workspace',
              description: 'Test Description',
              created_by: 'test-user-id'
            }
          })),
          order: vi.fn(() => Promise.resolve({
            data: [
              {
                id: 'task-1',
                title: 'Test Task 1',
                status: 'todo',
                created_at: '2024-01-01T00:00:00Z',
                assigned_to: 'test-user-id',
                assigned_by: 'test-user-id',
                workspace_id: 'test-workspace-id'
              },
              {
                id: 'task-2',
                title: 'Test Task 2',
                status: 'in_progress',
                created_at: '2024-01-01T00:00:00Z',
                assigned_to: 'test-user-id',
                assigned_by: 'test-user-id',
                workspace_id: 'test-workspace-id'
              },
              {
                id: 'task-3',
                title: 'Test Task 3',
                status: 'submitted',
                created_at: '2024-01-01T00:00:00Z',
                assigned_to: 'test-user-id',
                assigned_by: 'test-user-id',
                workspace_id: 'test-workspace-id',
                submission_file_name: 'test.pdf',
                submitted_at: '2024-01-02T00:00:00Z'
              },
              {
                id: 'task-4',
                title: 'Test Task 4',
                status: 'completed',
                created_at: '2024-01-01T00:00:00Z',
                assigned_to: 'test-user-id',
                assigned_by: 'test-user-id',
                workspace_id: 'test-workspace-id',
                completed_at: '2024-01-03T00:00:00Z'
              }
            ]
          }))
        }))
      }))
    })),
    storage: {
      from: vi.fn(() => ({
        download: vi.fn(() => Promise.resolve({ data: new Blob() })),
        upload: vi.fn(() => Promise.resolve({ data: { path: 'test-path' } })),
        remove: vi.fn(() => Promise.resolve({ data: null }))
      }))
    }
  }
}));

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'test-workspace-id' }),
    BrowserRouter: ({ children }) => <div>{children}</div>
  };
});

// Mock components that might cause issues in tests
vi.mock('../Sidebar', () => ({
  default: () => <div data-testid="sidebar">Sidebar</div>
}));

vi.mock('../AddMembers', () => ({
  default: ({ open, onClose }) => open ? <div data-testid="add-members">Add Members</div> : null
}));

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('UI Consistency Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Task Display Consistency', () => {
    it('should display tasks with consistent styling in TL view', async () => {
      renderWithRouter(<WorkspaceTL />);

      await waitFor(() => {
        expect(screen.getByText('Test Workspace')).toBeInTheDocument();
      });

      // Check that tasks are displayed with consistent TaskCard styling
      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
        expect(screen.getByText('Test Task 2')).toBeInTheDocument();
        expect(screen.getByText('Test Task 3')).toBeInTheDocument();
        expect(screen.getByText('Test Task 4')).toBeInTheDocument();
      });

      // Check status badges are consistent
      expect(screen.getAllByText('To Do')).toHaveLength(1);
      expect(screen.getAllByText('In Progress')).toHaveLength(1);
      expect(screen.getAllByText('Under Review')).toHaveLength(1);
      expect(screen.getAllByText('Completed')).toHaveLength(1);
    });

    it('should display tasks with consistent styling in TM view', async () => {
      renderWithRouter(<WorkspaceTM />);

      await waitFor(() => {
        expect(screen.getByText('Test Workspace')).toBeInTheDocument();
      });

      // Check that tasks are displayed with consistent TaskCard styling
      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
        expect(screen.getByText('Test Task 2')).toBeInTheDocument();
        expect(screen.getByText('Test Task 3')).toBeInTheDocument();
        expect(screen.getByText('Test Task 4')).toBeInTheDocument();
      });

      // Check status badges are consistent
      expect(screen.getAllByText('To Do')).toHaveLength(1);
      expect(screen.getAllByText('In Progress')).toHaveLength(1);
      expect(screen.getAllByText('Under Review')).toHaveLength(1);
      expect(screen.getAllByText('Completed')).toHaveLength(1);
    });
  });

  describe('Button Consistency', () => {
    it('should display action buttons with consistent styling in both views', async () => {
      // Test TL view
      const { unmount: unmountTL } = renderWithRouter(<WorkspaceTL />);

      await waitFor(() => {
        expect(screen.getByText('Start Task')).toBeInTheDocument();
        expect(screen.getByText('Upload Result')).toBeInTheDocument();
      });

      unmountTL();

      // Test TM view
      renderWithRouter(<WorkspaceTM />);

      await waitFor(() => {
        expect(screen.getByText('Start Task')).toBeInTheDocument();
        expect(screen.getByText('Upload Result')).toBeInTheDocument();
      });
    });
  });

  describe('Status Badge Consistency', () => {
    it('should display status badges with consistent colors and icons', async () => {
      renderWithRouter(<WorkspaceTM />);

      await waitFor(() => {
        // Check that status badges are present and consistent
        const todoChips = screen.getAllByText('To Do');
        const inProgressChips = screen.getAllByText('In Progress');
        const submittedChips = screen.getAllByText('Under Review');
        const completedChips = screen.getAllByText('Completed');

        expect(todoChips.length).toBeGreaterThan(0);
        expect(inProgressChips.length).toBeGreaterThan(0);
        expect(submittedChips.length).toBeGreaterThan(0);
        expect(completedChips.length).toBeGreaterThan(0);
      });
    });
  });

  describe('File Upload Interface Consistency', () => {
    it('should display consistent file upload interface in both views', async () => {
      renderWithRouter(<WorkspaceTM />);

      await waitFor(() => {
        expect(screen.getByText('Upload Result')).toBeInTheDocument();
      });

      // Click upload button to open dialog
      fireEvent.click(screen.getByText('Upload Result'));

      await waitFor(() => {
        expect(screen.getByText('Submit Task Result')).toBeInTheDocument();
        expect(screen.getByText('Select File')).toBeInTheDocument();
      });
    });
  });

  describe('Submission Display Consistency', () => {
    it('should display submissions with consistent styling', async () => {
      renderWithRouter(<WorkspaceTM />);

      await waitFor(() => {
        // Check that submitted task shows file name
        expect(screen.getByText('test.pdf')).toBeInTheDocument();
      });
    });
  });

  describe('Section Layout Consistency', () => {
    it('should display sections with consistent spacing and typography', async () => {
      renderWithRouter(<WorkspaceTM />);

      await waitFor(() => {
        // Check section headers
        expect(screen.getByText(/Active Tasks/)).toBeInTheDocument();
        expect(screen.getByText(/Pending Review Tasks/)).toBeInTheDocument();
        expect(screen.getByText(/Completed Tasks/)).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Layout Consistency', () => {
    it('should maintain consistent layout across different screen sizes', async () => {
      // Test with different viewport sizes
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });

      renderWithRouter(<WorkspaceTM />);

      await waitFor(() => {
        expect(screen.getByText('Test Workspace')).toBeInTheDocument();
      });

      // Change to mobile size
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      // Trigger resize event
      fireEvent(window, new Event('resize'));

      // Layout should still be consistent
      expect(screen.getByText('Test Workspace')).toBeInTheDocument();
    });
  });

  describe('Color Theme Consistency', () => {
    it('should use consistent color scheme across components', async () => {
      renderWithRouter(<WorkspaceTM />);

      await waitFor(() => {
        // Check that workspace title uses consistent color
        const workspaceTitle = screen.getByText('Test Workspace');
        expect(workspaceTitle).toHaveStyle({ color: '#106EBE' });
      });
    });
  });

  describe('Animation and Interaction Consistency', () => {
    it('should provide consistent hover and click interactions', async () => {
      renderWithRouter(<WorkspaceTM />);

      await waitFor(() => {
        const startButton = screen.getByText('Start Task');
        expect(startButton).toBeInTheDocument();
        
        // Test that button is interactive
        fireEvent.mouseOver(startButton);
        fireEvent.mouseOut(startButton);
        
        // Button should remain functional
        expect(startButton).toBeEnabled();
      });
    });
  });

  describe('Error State Consistency', () => {
    it('should display consistent error states', async () => {
      // Mock an error scenario
      vi.mocked(require('../supabaseClient').supabase.from).mockImplementationOnce(() => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.reject(new Error('Test error'))
          })
        })
      }));

      renderWithRouter(<WorkspaceTM />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load workspace data/)).toBeInTheDocument();
      });
    });
  });

  describe('Loading State Consistency', () => {
    it('should display consistent loading states', async () => {
      // Mock a delayed response
      vi.mocked(require('../supabaseClient').supabase.from).mockImplementationOnce(() => ({
        select: () => ({
          eq: () => ({
            single: () => new Promise(resolve => setTimeout(() => resolve({
              data: {
                id: 'test-workspace-id',
                name: 'Test Workspace',
                created_by: 'test-user-id'
              }
            }), 100))
          })
        })
      }));

      renderWithRouter(<WorkspaceTM />);

      // Should show loading spinner initially
      expect(screen.getByRole('progressbar')).toBeInTheDocument();

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });
  });
});
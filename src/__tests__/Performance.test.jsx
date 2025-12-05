// src/__tests__/Performance.test.jsx - Performance optimization tests
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import SubmissionsGallery from '../components/dashboard/SubmissionsGallery';
import WorkspaceTL from '../WorkspaceTL';
import { supabase } from '../supabaseClient';

// Mock dependencies
vi.mock('../supabaseClient');
vi.mock('../hooks/useRealTimeUpdates');
vi.mock('../services/WorkspaceMemberCache');

// Mock performance API
const mockPerformance = {
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByType: vi.fn(() => []),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn()
};

Object.defineProperty(window, 'performance', {
  value: mockPerformance,
  writable: true
});

// Mock IntersectionObserver for lazy loading tests
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
});
window.IntersectionObserver = mockIntersectionObserver;

describe('Performance Optimizations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock auth user
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user1', email: 'test@example.com' } }
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Lazy Loading', () => {
    it('should implement lazy loading for submissions gallery', async () => {
      const mockSubmissions = Array.from({ length: 50 }, (_, i) => ({
        id: `submission-${i}`,
        task_id: `task-${i}`,
        workspace_id: 'workspace1',
        submitted_by: 'user1',
        submitter_name: 'Test User',
        task_title: `Task ${i}`,
        file_url: `file-${i}.pdf`,
        file_name: `file-${i}.pdf`,
        file_size: 1024 * (i + 1),
        submitted_at: new Date().toISOString(),
        status: 'under_review'
      }));

      render(
        <SubmissionsGallery
          workspaceId="workspace1"
          submissions={mockSubmissions}
          onRefresh={vi.fn()}
        />
      );

      // Check that IntersectionObserver is used for lazy loading
      expect(mockIntersectionObserver).toHaveBeenCalled();
      
      // Initially, only first page items should be rendered
      await waitFor(() => {
        const renderedItems = screen.getAllByText(/Task \d+/);
        expect(renderedItems.length).toBeLessThanOrEqual(12); // Default items per page
      });
    });

    it('should load items on intersection', async () => {
      const mockSubmissions = Array.from({ length: 20 }, (_, i) => ({
        id: `submission-${i}`,
        task_id: `task-${i}`,
        workspace_id: 'workspace1',
        submitted_by: 'user1',
        submitter_name: 'Test User',
        task_title: `Task ${i}`,
        file_url: `file-${i}.pdf`,
        file_name: `file-${i}.pdf`,
        file_size: 1024,
        submitted_at: new Date().toISOString(),
        status: 'under_review'
      }));

      render(
        <SubmissionsGallery
          workspaceId="workspace1"
          submissions={mockSubmissions}
          onRefresh={vi.fn()}
        />
      );

      // Simulate intersection observer callback
      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      observerCallback([{ isIntersecting: true }]);

      await waitFor(() => {
        expect(screen.getByText('Task 0')).toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    it('should implement pagination for large datasets', async () => {
      const mockSubmissions = Array.from({ length: 50 }, (_, i) => ({
        id: `submission-${i}`,
        task_id: `task-${i}`,
        workspace_id: 'workspace1',
        submitted_by: 'user1',
        submitter_name: 'Test User',
        task_title: `Task ${i}`,
        file_url: `file-${i}.pdf`,
        file_name: `file-${i}.pdf`,
        file_size: 1024,
        submitted_at: new Date().toISOString(),
        status: 'under_review'
      }));

      render(
        <SubmissionsGallery
          workspaceId="workspace1"
          submissions={mockSubmissions}
          onRefresh={vi.fn()}
        />
      );

      // Check pagination controls are present
      await waitFor(() => {
        expect(screen.getByText(/Showing \d+-\d+ of 50 items/)).toBeInTheDocument();
      });

      // Check page navigation
      const nextPageButton = screen.getByLabelText(/Go to next page/);
      expect(nextPageButton).toBeInTheDocument();
    });

    it('should change items per page', async () => {
      const mockSubmissions = Array.from({ length: 30 }, (_, i) => ({
        id: `submission-${i}`,
        task_id: `task-${i}`,
        workspace_id: 'workspace1',
        submitted_by: 'user1',
        submitter_name: 'Test User',
        task_title: `Task ${i}`,
        file_url: `file-${i}.pdf`,
        file_name: `file-${i}.pdf`,
        file_size: 1024,
        submitted_at: new Date().toISOString(),
        status: 'under_review'
      }));

      render(
        <SubmissionsGallery
          workspaceId="workspace1"
          submissions={mockSubmissions}
          onRefresh={vi.fn()}
        />
      );

      // Find and click items per page selector
      const itemsPerPageSelect = screen.getByLabelText('Items per page');
      fireEvent.mouseDown(itemsPerPageSelect);
      
      const option24 = screen.getByText('24');
      fireEvent.click(option24);

      await waitFor(() => {
        expect(screen.getByText(/Showing 1-24 of 30 items/)).toBeInTheDocument();
      });
    });
  });

  describe('Debouncing', () => {
    it('should debounce file uploads', async () => {
      vi.useFakeTimers();
      
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const mockOnUpload = vi.fn();

      // Mock FileUpload component behavior
      const TestComponent = () => {
        const [file, setFile] = React.useState(null);
        const debouncedFile = useDebounce(file, 500);
        
        React.useEffect(() => {
          if (debouncedFile) {
            mockOnUpload(debouncedFile);
          }
        }, [debouncedFile]);

        return (
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            data-testid="file-input"
          />
        );
      };

      render(<TestComponent />);

      const fileInput = screen.getByTestId('file-input');
      
      // Rapidly change file multiple times
      fireEvent.change(fileInput, { target: { files: [mockFile] } });
      fireEvent.change(fileInput, { target: { files: [mockFile] } });
      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      // Should not call upload immediately
      expect(mockOnUpload).not.toHaveBeenCalled();

      // Fast-forward time
      vi.advanceTimersByTime(500);

      // Should call upload only once after debounce
      await waitFor(() => {
        expect(mockOnUpload).toHaveBeenCalledTimes(1);
      });

      vi.useRealTimers();
    });
  });

  describe('Caching', () => {
    it('should cache workspace members', async () => {
      const mockMembers = [
        {
          id: 'member1',
          user_id: 'user1',
          workspace_id: 'workspace1',
          users: { id: 'user1', email: 'user1@example.com', full_name: 'User 1' }
        }
      ];

      // Mock workspace member cache
      const mockCache = {
        getWorkspaceMembers: vi.fn().mockResolvedValue(mockMembers),
        subscribe: vi.fn().mockReturnValue(() => {}),
        invalidate: vi.fn()
      };

      vi.doMock('../services/WorkspaceMemberCache', () => ({
        default: mockCache
      }));

      // Mock other required data
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'workspace1', name: 'Test Workspace', created_by: 'user1' }
            }),
            order: vi.fn().mockResolvedValue({
              data: []
            })
          })
        })
      });

      render(
        <BrowserRouter>
          <WorkspaceTL />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockCache.getWorkspaceMembers).toHaveBeenCalledWith('workspace1');
      });
    });
  });

  describe('Optimistic Updates', () => {
    it('should show immediate UI feedback for task status changes', async () => {
      const mockTask = {
        id: 'task1',
        title: 'Test Task',
        status: 'todo',
        assigned_to: 'user1',
        workspace_id: 'workspace1'
      };

      // Mock successful update
      supabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'workspace1', name: 'Test Workspace', created_by: 'user1' }
            }),
            order: vi.fn().mockResolvedValue({
              data: [mockTask]
            })
          })
        })
      });

      render(
        <BrowserRouter>
          <WorkspaceTL />
        </BrowserRouter>
      );

      // Find and click start task button
      await waitFor(() => {
        const startButton = screen.getByText('Start Task');
        fireEvent.click(startButton);
      });

      // Should immediately show "In Progress" status
      await waitFor(() => {
        expect(screen.getByText(/In Progress/)).toBeInTheDocument();
      });
    });
  });

  describe('Performance Metrics', () => {
    it('should measure component render time', async () => {
      const mockSubmissions = Array.from({ length: 100 }, (_, i) => ({
        id: `submission-${i}`,
        task_id: `task-${i}`,
        workspace_id: 'workspace1',
        submitted_by: 'user1',
        submitter_name: 'Test User',
        task_title: `Task ${i}`,
        file_url: `file-${i}.pdf`,
        file_name: `file-${i}.pdf`,
        file_size: 1024,
        submitted_at: new Date().toISOString(),
        status: 'under_review'
      }));

      const startTime = performance.now();
      
      render(
        <SubmissionsGallery
          workspaceId="workspace1"
          submissions={mockSubmissions}
          onRefresh={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Showing/)).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Render should complete within reasonable time (adjust threshold as needed)
      expect(renderTime).toBeLessThan(1000); // 1 second
    });

    it('should handle large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `submission-${i}`,
        task_id: `task-${i}`,
        workspace_id: 'workspace1',
        submitted_by: 'user1',
        submitter_name: 'Test User',
        task_title: `Task ${i}`,
        file_url: `file-${i}.pdf`,
        file_name: `file-${i}.pdf`,
        file_size: 1024,
        submitted_at: new Date().toISOString(),
        status: 'under_review'
      }));

      const { container } = render(
        <SubmissionsGallery
          workspaceId="workspace1"
          submissions={largeDataset}
          onRefresh={vi.fn()}
        />
      );

      // Should only render visible items, not all 1000
      const renderedCards = container.querySelectorAll('[data-testid="submission-card"]');
      expect(renderedCards.length).toBeLessThan(50); // Much less than total dataset
    });
  });

  describe('Memory Management', () => {
    it('should cleanup resources on unmount', () => {
      const { unmount } = render(
        <SubmissionsGallery
          workspaceId="workspace1"
          submissions={[]}
          onRefresh={vi.fn()}
        />
      );

      // Mock intersection observer disconnect
      const mockDisconnect = vi.fn();
      mockIntersectionObserver.mockReturnValue({
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: mockDisconnect,
      });

      unmount();

      // Should cleanup intersection observers
      expect(mockDisconnect).toHaveBeenCalled();
    });
  });
});
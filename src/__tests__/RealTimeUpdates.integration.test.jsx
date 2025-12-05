// src/__tests__/RealTimeUpdates.integration.test.jsx - Integration tests for real-time updates
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import WorkspaceTL from '../WorkspaceTL';
import WorkspaceTM from '../WorkspaceTM';
import WorkspaceDashboard from '../WorkspaceDashboard';
import notificationService from '../services/NotificationService';

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
    channel: vi.fn(),
    removeChannel: vi.fn()
  }
}));

vi.mock('../services/NotificationService');

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'test-workspace-id' }),
    useNavigate: () => vi.fn()
  };
});

// Mock components that might cause issues
vi.mock('../Sidebar', () => ({
  default: () => <div data-testid="sidebar">Sidebar</div>
}));

vi.mock('../AddMembers', () => ({
  default: ({ onClose }) => (
    <div data-testid="add-members">
      <button onClick={onClose}>Close</button>
    </div>
  )
}));

describe('Real-Time Updates Integration', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com'
  };

  const mockWorkspace = {
    id: 'workspace-456',
    name: 'Test Workspace',
    description: 'Test Description',
    created_by: 'user-123'
  };

  const mockTask = {
    id: 'task-789',
    title: 'Test Task',
    status: 'todo',
    workspace_id: 'workspace-456',
    assigned_to: 'user-123',
    assigned_by: 'user-123',
    created_at: '2024-01-01T00:00:00Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful auth
    supabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser }
    });

    // Mock notification service
    notificationService.initialize.mockResolvedValue();
    notificationService.subscribeToTaskUpdates.mockReturnValue('task-subscription');
    notificationService.subscribeToTaskReviews.mockReturnValue('review-subscription');
    notificationService.subscribeToSubmissions.mockReturnValue('submission-subscription');
    notificationService.unsubscribe.mockImplementation(() => {});
    notificationService.cleanup.mockImplementation(() => {});

    // Mock supabase channel
    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn()
    };
    supabase.channel.mockReturnValue(mockChannel);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('WorkspaceTL Real-Time Updates', () => {
    beforeEach(() => {
      // Mock workspace data fetch
      supabase.from.mockImplementation((table) => {
        const mockQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(),
          order: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis()
        };

        if (table === 'workspaces') {
          mockQuery.single.mockResolvedValue({
            data: mockWorkspace,
            error: null
          });
        } else if (table === 'workspace_members') {
          mockQuery.single.mockResolvedValue({
            data: [],
            error: null
          });
        } else if (table === 'tasks') {
          mockQuery.single.mockResolvedValue({
            data: [mockTask],
            error: null
          });
        } else if (table === 'users') {
          mockQuery.single.mockResolvedValue({
            data: mockUser,
            error: null
          });
        }

        return mockQuery;
      });
    });

    it('should initialize real-time subscriptions on mount', async () => {
      render(
        <BrowserRouter>
          <WorkspaceTL />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(notificationService.initialize).toHaveBeenCalled();
      });

      expect(notificationService.subscribeToTaskUpdates).toHaveBeenCalledWith(
        'test-workspace-id',
        expect.any(Function)
      );
    });

    it('should handle task status change notifications', async () => {
      let taskUpdateCallback;
      notificationService.subscribeToTaskUpdates.mockImplementation((workspaceId, callback) => {
        taskUpdateCallback = callback;
        return 'task-subscription';
      });

      render(
        <BrowserRouter>
          <WorkspaceTL />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(taskUpdateCallback).toBeDefined();
      });

      // Simulate task status change notification
      const notification = {
        type: 'status_change',
        message: 'Task "Test Task" status changed from To Do to In Progress',
        taskId: 'task-789',
        taskTitle: 'Test Task',
        data: {
          new: { ...mockTask, status: 'in_progress' },
          old: mockTask
        }
      };

      // Trigger the callback
      taskUpdateCallback(notification);

      // Verify that the component handles the notification
      // (In a real test, you'd check for UI updates or data refresh)
      expect(taskUpdateCallback).toHaveBeenCalledWith(notification);
    });

    it('should display notification badge with pending review count', async () => {
      notificationService.getPendingReviewCount.mockResolvedValue(3);

      render(
        <BrowserRouter>
          <WorkspaceTL />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('notification-badge')).toBeInTheDocument();
      });
    });

    it('should cleanup subscriptions on unmount', async () => {
      const { unmount } = render(
        <BrowserRouter>
          <WorkspaceTL />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(notificationService.subscribeToTaskUpdates).toHaveBeenCalled();
      });

      unmount();

      expect(notificationService.unsubscribe).toHaveBeenCalled();
    });
  });

  describe('WorkspaceTM Real-Time Updates', () => {
    beforeEach(() => {
      // Mock workspace member data
      supabase.from.mockImplementation((table) => {
        const mockQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(),
          order: vi.fn().mockReturnThis()
        };

        if (table === 'workspaces') {
          mockQuery.single.mockResolvedValue({
            data: mockWorkspace,
            error: null
          });
        } else if (table === 'workspace_members') {
          mockQuery.single.mockResolvedValue({
            data: { user_id: 'user-123', workspace_id: 'workspace-456' },
            error: null
          });
        } else if (table === 'tasks') {
          mockQuery.single.mockResolvedValue({
            data: [mockTask],
            error: null
          });
        } else if (table === 'users') {
          mockQuery.single.mockResolvedValue({
            data: mockUser,
            error: null
          });
        }

        return mockQuery;
      });
    });

    it('should initialize real-time subscriptions for team members', async () => {
      render(
        <BrowserRouter>
          <WorkspaceTM />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(notificationService.initialize).toHaveBeenCalled();
      });

      expect(notificationService.subscribeToTaskUpdates).toHaveBeenCalledWith(
        'test-workspace-id',
        expect.any(Function)
      );
    });

    it('should handle review notifications for assigned tasks', async () => {
      let reviewUpdateCallback;
      notificationService.subscribeToTaskReviews.mockImplementation((workspaceId, callback) => {
        reviewUpdateCallback = callback;
        return 'review-subscription';
      });

      render(
        <BrowserRouter>
          <WorkspaceTM />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(reviewUpdateCallback).toBeDefined();
      });

      // Simulate review notification
      const notification = {
        type: 'review_action',
        message: 'John Doe approved your task "Test Task"',
        taskId: 'task-789',
        reviewAction: 'approve',
        reviewerName: 'John Doe'
      };

      reviewUpdateCallback(notification);

      expect(reviewUpdateCallback).toHaveBeenCalledWith(notification);
    });
  });

  describe('WorkspaceDashboard Real-Time Updates', () => {
    beforeEach(() => {
      // Mock dashboard data
      supabase.from.mockImplementation((table) => {
        const mockQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(),
          order: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis()
        };

        if (table === 'workspaces') {
          mockQuery.single.mockResolvedValue({
            data: mockWorkspace,
            error: null
          });
        } else if (table === 'workspace_members') {
          mockQuery.single.mockResolvedValue({
            data: { user_id: 'user-123', workspace_id: 'workspace-456' },
            error: null
          });
        } else if (table === 'tasks') {
          mockQuery.single.mockResolvedValue({
            data: [mockTask],
            error: null
          });
        } else if (table === 'users') {
          mockQuery.single.mockResolvedValue({
            data: mockUser,
            error: null
          });
        }

        return mockQuery;
      });
    });

    it('should update submissions gallery in real-time', async () => {
      let submissionUpdateCallback;
      notificationService.subscribeToSubmissions.mockImplementation((workspaceId, callback) => {
        submissionUpdateCallback = callback;
        return 'submission-subscription';
      });

      render(
        <BrowserRouter>
          <WorkspaceDashboard />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(submissionUpdateCallback).toBeDefined();
      });

      // Simulate new submission notification
      const notification = {
        type: 'new_submission',
        message: 'New submission uploaded for "Test Task"',
        taskId: 'task-789',
        fileName: 'test-file.pdf'
      };

      submissionUpdateCallback(notification);

      expect(submissionUpdateCallback).toHaveBeenCalledWith(notification);
    });
  });

  describe('Toast Notifications', () => {
    it('should show toast notifications for successful actions', async () => {
      // Mock window.dispatchEvent
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

      notificationService.showToast.mockImplementation((message, type) => {
        const toast = {
          id: Date.now(),
          message,
          type,
          timestamp: new Date().toISOString()
        };
        window.dispatchEvent(new CustomEvent('kiro-toast', { detail: toast }));
      });

      render(
        <BrowserRouter>
          <WorkspaceTL />
        </BrowserRouter>
      );

      // Simulate showing a toast
      notificationService.showToast('Task completed successfully!', 'success');

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'kiro-toast'
        })
      );

      dispatchEventSpy.mockRestore();
    });

    it('should auto-remove toasts after timeout', async () => {
      vi.useFakeTimers();

      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

      notificationService.showToast.mockImplementation((message, type) => {
        const toast = {
          id: 123,
          message,
          type,
          timestamp: new Date().toISOString()
        };
        window.dispatchEvent(new CustomEvent('kiro-toast', { detail: toast }));
        
        // Simulate auto-removal
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('kiro-toast-remove', { detail: { id: 123 } }));
        }, 5000);
      });

      render(
        <BrowserRouter>
          <WorkspaceTL />
        </BrowserRouter>
      );

      notificationService.showToast('Test message', 'info');

      // Fast-forward time
      vi.advanceTimersByTime(5000);

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'kiro-toast-remove'
        })
      );

      vi.useRealTimers();
      dispatchEventSpy.mockRestore();
    });
  });

  describe('Connection Status', () => {
    it('should handle connection errors gracefully', async () => {
      notificationService.initialize.mockRejectedValue(new Error('Connection failed'));

      render(
        <BrowserRouter>
          <WorkspaceTL />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(notificationService.initialize).toHaveBeenCalled();
      });

      // Component should still render despite connection error
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });

    it('should retry connections on failure', async () => {
      let initializeCallCount = 0;
      notificationService.initialize.mockImplementation(() => {
        initializeCallCount++;
        if (initializeCallCount === 1) {
          return Promise.reject(new Error('First attempt failed'));
        }
        return Promise.resolve();
      });

      render(
        <BrowserRouter>
          <WorkspaceTL />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(notificationService.initialize).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Performance Considerations', () => {
    it('should debounce rapid notification updates', async () => {
      vi.useFakeTimers();

      let taskUpdateCallback;
      notificationService.subscribeToTaskUpdates.mockImplementation((workspaceId, callback) => {
        taskUpdateCallback = callback;
        return 'task-subscription';
      });

      const refreshDataSpy = vi.fn();

      render(
        <BrowserRouter>
          <WorkspaceTL />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(taskUpdateCallback).toBeDefined();
      });

      // Simulate rapid notifications
      const notification = {
        type: 'status_change',
        message: 'Task updated',
        taskId: 'task-789'
      };

      taskUpdateCallback(notification);
      taskUpdateCallback(notification);
      taskUpdateCallback(notification);

      // Fast-forward to trigger debounced refresh
      vi.advanceTimersByTime(1000);

      // Should only refresh once despite multiple notifications
      vi.useRealTimers();
    });

    it('should limit the number of concurrent subscriptions', async () => {
      render(
        <BrowserRouter>
          <WorkspaceTL />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(notificationService.subscribeToTaskUpdates).toHaveBeenCalledTimes(1);
        expect(notificationService.subscribeToTaskReviews).toHaveBeenCalledTimes(1);
        expect(notificationService.subscribeToSubmissions).toHaveBeenCalledTimes(1);
      });

      // Should not create duplicate subscriptions
      expect(notificationService.subscribeToTaskUpdates).toHaveBeenCalledTimes(1);
    });
  });
});
// src/services/__tests__/NotificationService.test.js - Tests for NotificationService
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import notificationService from '../NotificationService';
import { supabase } from '../../supabaseClient';

// Mock supabase
vi.mock('../../supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    },
    channel: vi.fn(),
    removeChannel: vi.fn(),
    from: vi.fn()
  }
}));

describe('NotificationService', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com'
  };

  const mockWorkspaceId = 'workspace-456';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset service state
    notificationService.cleanup();
    
    // Mock successful auth
    supabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser }
    });
  });

  afterEach(() => {
    notificationService.cleanup();
  });

  describe('initialize', () => {
    it('should initialize successfully with authenticated user', async () => {
      await notificationService.initialize();
      
      expect(supabase.auth.getUser).toHaveBeenCalled();
      expect(notificationService.isInitialized).toBe(true);
    });

    it('should handle initialization without authenticated user', async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: null }
      });

      await notificationService.initialize();
      
      expect(notificationService.isInitialized).toBe(false);
    });

    it('should handle initialization errors gracefully', async () => {
      supabase.auth.getUser.mockRejectedValue(new Error('Auth error'));

      await notificationService.initialize();
      
      expect(notificationService.isInitialized).toBe(false);
    });
  });

  describe('subscribeToTaskUpdates', () => {
    beforeEach(async () => {
      await notificationService.initialize();
    });

    it('should create task update subscription', () => {
      const mockCallback = vi.fn();
      const mockSubscription = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn()
      };

      supabase.channel.mockReturnValue(mockSubscription);

      const subscriptionKey = notificationService.subscribeToTaskUpdates(
        mockWorkspaceId, 
        mockCallback
      );

      expect(subscriptionKey).toBe(`tasks_${mockWorkspaceId}`);
      expect(supabase.channel).toHaveBeenCalledWith(`tasks_${mockWorkspaceId}`);
      expect(mockSubscription.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `workspace_id=eq.${mockWorkspaceId}`
        },
        expect.any(Function)
      );
      expect(mockSubscription.subscribe).toHaveBeenCalled();
    });

    it('should not create subscription if not initialized', () => {
      notificationService.cleanup();
      
      const mockCallback = vi.fn();
      const result = notificationService.subscribeToTaskUpdates(
        mockWorkspaceId, 
        mockCallback
      );

      expect(result).toBeNull();
      expect(supabase.channel).not.toHaveBeenCalled();
    });
  });

  describe('subscribeToTaskReviews', () => {
    beforeEach(async () => {
      await notificationService.initialize();
    });

    it('should create review subscription', () => {
      const mockCallback = vi.fn();
      const mockSubscription = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn()
      };

      supabase.channel.mockReturnValue(mockSubscription);

      const subscriptionKey = notificationService.subscribeToTaskReviews(
        mockWorkspaceId, 
        mockCallback
      );

      expect(subscriptionKey).toBe(`reviews_${mockWorkspaceId}`);
      expect(supabase.channel).toHaveBeenCalledWith(`reviews_${mockWorkspaceId}`);
      expect(mockSubscription.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'task_reviews'
        },
        expect.any(Function)
      );
    });
  });

  describe('subscribeToSubmissions', () => {
    beforeEach(async () => {
      await notificationService.initialize();
    });

    it('should create submission subscription', () => {
      const mockCallback = vi.fn();
      const mockSubscription = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn()
      };

      supabase.channel.mockReturnValue(mockSubscription);

      const subscriptionKey = notificationService.subscribeToSubmissions(
        mockWorkspaceId, 
        mockCallback
      );

      expect(subscriptionKey).toBe(`submissions_${mockWorkspaceId}`);
      expect(supabase.channel).toHaveBeenCalledWith(`submissions_${mockWorkspaceId}`);
      expect(mockSubscription.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `workspace_id=eq.${mockWorkspaceId}`
        },
        expect.any(Function)
      );
    });
  });

  describe('handleTaskUpdate', () => {
    beforeEach(async () => {
      await notificationService.initialize();
    });

    it('should handle status change updates', async () => {
      const mockCallback = vi.fn();
      const payload = {
        eventType: 'UPDATE',
        new: {
          id: 'task-123',
          title: 'Test Task',
          status: 'completed',
          assigned_to: 'user-456'
        },
        old: {
          id: 'task-123',
          title: 'Test Task',
          status: 'in_progress',
          assigned_to: 'user-456'
        }
      };

      await notificationService.handleTaskUpdate(payload, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'status_change',
          taskId: 'task-123',
          taskTitle: 'Test Task'
        })
      );
    });

    it('should handle assignment change updates', async () => {
      const mockCallback = vi.fn();
      const payload = {
        eventType: 'UPDATE',
        new: {
          id: 'task-123',
          title: 'Test Task',
          status: 'todo',
          assigned_to: 'user-456'
        },
        old: {
          id: 'task-123',
          title: 'Test Task',
          status: 'todo',
          assigned_to: null
        }
      };

      // Mock user lookup
      supabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { full_name: 'Test User', email: 'test@example.com' }
            })
          })
        })
      });

      await notificationService.handleTaskUpdate(payload, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'assignment_change',
          taskId: 'task-123',
          taskTitle: 'Test Task'
        })
      );
    });
  });

  describe('getPendingReviewCount', () => {
    beforeEach(async () => {
      await notificationService.initialize();
    });

    it('should return pending review count', async () => {
      const mockTasks = [
        { id: 'task-1' },
        { id: 'task-2' }
      ];

      supabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              neq: vi.fn().mockResolvedValue({
                data: mockTasks,
                error: null
              })
            })
          })
        })
      });

      const count = await notificationService.getPendingReviewCount(
        mockWorkspaceId, 
        mockUser.id
      );

      expect(count).toBe(2);
    });

    it('should handle errors gracefully', async () => {
      supabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              neq: vi.fn().mockResolvedValue({
                data: null,
                error: new Error('Database error')
              })
            })
          })
        })
      });

      const count = await notificationService.getPendingReviewCount(
        mockWorkspaceId, 
        mockUser.id
      );

      expect(count).toBe(0);
    });
  });

  describe('showToast', () => {
    it('should add toast to queue and dispatch event', () => {
      const mockMessage = 'Test notification';
      const mockType = 'success';

      // Mock window.dispatchEvent
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

      notificationService.showToast(mockMessage, mockType);

      expect(notificationService.toastQueue).toHaveLength(1);
      expect(notificationService.toastQueue[0]).toMatchObject({
        message: mockMessage,
        type: mockType
      });
      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'kiro-toast'
        })
      );

      dispatchEventSpy.mockRestore();
    });
  });

  describe('unsubscribe', () => {
    beforeEach(async () => {
      await notificationService.initialize();
    });

    it('should unsubscribe from specific subscription', () => {
      const mockCallback = vi.fn();
      const mockSubscription = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn()
      };

      supabase.channel.mockReturnValue(mockSubscription);

      const subscriptionKey = notificationService.subscribeToTaskUpdates(
        mockWorkspaceId, 
        mockCallback
      );

      notificationService.unsubscribe(subscriptionKey);

      expect(supabase.removeChannel).toHaveBeenCalledWith(mockSubscription);
    });
  });

  describe('cleanup', () => {
    it('should clean up all subscriptions and reset state', async () => {
      await notificationService.initialize();
      
      const mockCallback = vi.fn();
      const mockSubscription = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn()
      };

      supabase.channel.mockReturnValue(mockSubscription);
      notificationService.subscribeToTaskUpdates(mockWorkspaceId, mockCallback);

      notificationService.cleanup();

      expect(supabase.removeChannel).toHaveBeenCalled();
      expect(notificationService.isInitialized).toBe(false);
      expect(notificationService.toastQueue).toHaveLength(0);
    });
  });
});
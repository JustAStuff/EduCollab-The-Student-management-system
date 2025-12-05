// src/services/NotificationService.js - Real-time notification service
import { supabase } from '../supabaseClient';

class NotificationService {
  constructor() {
    this.subscriptions = new Map();
    this.listeners = new Map();
    this.toastQueue = [];
    this.isInitialized = false;
  }

  /**
   * Initialize the notification service
   */
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('NotificationService: No authenticated user found');
        return;
      }

      this.currentUser = user;
      this.isInitialized = true;
      console.log('NotificationService: Initialized for user', user.id);
    } catch (error) {
      console.error('NotificationService: Failed to initialize:', error);
    }
  }

  /**
   * Subscribe to task status changes for a workspace
   */
  subscribeToTaskUpdates(workspaceId, callback) {
    if (!this.isInitialized) {
      console.warn('NotificationService: Not initialized, call initialize() first');
      return null;
    }

    const subscriptionKey = `tasks_${workspaceId}`;
    
    // Remove existing subscription if any
    this.unsubscribe(subscriptionKey);

    const subscription = supabase
      .channel(`tasks_${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `workspace_id=eq.${workspaceId}`
        },
        (payload) => {
          console.log('NotificationService: Task update received:', payload);
          this.handleTaskUpdate(payload, callback);
        }
      )
      .subscribe((status) => {
        console.log(`NotificationService: Task subscription status for workspace ${workspaceId}:`, status);
      });

    this.subscriptions.set(subscriptionKey, subscription);
    return subscriptionKey;
  }

  /**
   * Subscribe to task reviews for notifications
   */
  subscribeToTaskReviews(workspaceId, callback) {
    if (!this.isInitialized) {
      console.warn('NotificationService: Not initialized, call initialize() first');
      return null;
    }

    const subscriptionKey = `reviews_${workspaceId}`;
    
    // Remove existing subscription if any
    this.unsubscribe(subscriptionKey);

    const subscription = supabase
      .channel(`reviews_${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'task_reviews'
        },
        async (payload) => {
          console.log('NotificationService: Review update received:', payload);
          await this.handleReviewUpdate(payload, workspaceId, callback);
        }
      )
      .subscribe((status) => {
        console.log(`NotificationService: Review subscription status for workspace ${workspaceId}:`, status);
      });

    this.subscriptions.set(subscriptionKey, subscription);
    return subscriptionKey;
  }

  /**
   * Subscribe to new submissions in workspace
   */
  subscribeToSubmissions(workspaceId, callback) {
    if (!this.isInitialized) {
      console.warn('NotificationService: Not initialized, call initialize() first');
      return null;
    }

    const subscriptionKey = `submissions_${workspaceId}`;
    
    // Remove existing subscription if any
    this.unsubscribe(subscriptionKey);

    const subscription = supabase
      .channel(`submissions_${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `workspace_id=eq.${workspaceId}`
        },
        (payload) => {
          // Only trigger for submissions (when submission_file_url is added)
          if (payload.new.submission_file_url && !payload.old.submission_file_url) {
            console.log('NotificationService: New submission received:', payload);
            this.handleSubmissionUpdate(payload, callback);
          }
        }
      )
      .subscribe((status) => {
        console.log(`NotificationService: Submission subscription status for workspace ${workspaceId}:`, status);
      });

    this.subscriptions.set(subscriptionKey, subscription);
    return subscriptionKey;
  }

  /**
   * Handle task update notifications
   */
  async handleTaskUpdate(payload, callback) {
    try {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      
      // Determine what changed
      let notificationType = null;
      let message = '';

      if (eventType === 'UPDATE') {
        // Status change notifications
        if (oldRecord.status !== newRecord.status) {
          notificationType = 'status_change';
          message = this.getStatusChangeMessage(newRecord, oldRecord);
        }
        
        // Assignment change notifications
        if (oldRecord.assigned_to !== newRecord.assigned_to) {
          notificationType = 'assignment_change';
          message = await this.getAssignmentChangeMessage(newRecord, oldRecord);
        }

        // Review notifications
        if (oldRecord.reviewed_at !== newRecord.reviewed_at) {
          notificationType = 'review';
          message = await this.getReviewMessage(newRecord);
        }
      }

      if (notificationType && message) {
        const notification = {
          type: notificationType,
          message,
          taskId: newRecord.id,
          taskTitle: newRecord.title,
          timestamp: new Date().toISOString(),
          data: { new: newRecord, old: oldRecord }
        };

        // Call the callback with notification
        if (callback) {
          callback(notification);
        }

        // Show toast notification if relevant to current user
        if (this.shouldShowToast(newRecord, oldRecord)) {
          this.showToast(message, this.getToastType(notificationType));
        }
      }
    } catch (error) {
      console.error('NotificationService: Error handling task update:', error);
    }
  }

  /**
   * Handle review update notifications
   */
  async handleReviewUpdate(payload, workspaceId, callback) {
    try {
      const review = payload.new;
      
      // Get task details
      const { data: task, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', review.task_id)
        .single();

      if (error || !task) {
        console.error('NotificationService: Failed to get task for review:', error);
        return;
      }

      // Get reviewer details
      const { data: reviewer, error: reviewerError } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('id', review.reviewer_id)
        .single();

      const reviewerName = reviewer?.full_name || reviewer?.email || 'Someone';

      const message = review.action === 'approve' 
        ? `${reviewerName} approved your task "${task.title}"`
        : `${reviewerName} requested changes to your task "${task.title}"`;

      const notification = {
        type: 'review_action',
        message,
        taskId: task.id,
        taskTitle: task.title,
        reviewAction: review.action,
        reviewerName,
        comments: review.comments,
        timestamp: new Date().toISOString(),
        data: { review, task }
      };

      // Call the callback
      if (callback) {
        callback(notification);
      }

      // Show toast if this is for the current user's task
      if (task.assigned_to === this.currentUser?.id) {
        const toastType = review.action === 'approve' ? 'success' : 'warning';
        this.showToast(message, toastType);
      }
    } catch (error) {
      console.error('NotificationService: Error handling review update:', error);
    }
  }

  /**
   * Handle submission update notifications
   */
  handleSubmissionUpdate(payload, callback) {
    try {
      const task = payload.new;
      
      const notification = {
        type: 'new_submission',
        message: `New submission uploaded for "${task.title}"`,
        taskId: task.id,
        taskTitle: task.title,
        fileName: task.submission_file_name,
        timestamp: new Date().toISOString(),
        data: { task }
      };

      // Call the callback
      if (callback) {
        callback(notification);
      }

      // Show toast if not the current user's submission
      if (task.assigned_to !== this.currentUser?.id) {
        this.showToast(notification.message, 'info');
      }
    } catch (error) {
      console.error('NotificationService: Error handling submission update:', error);
    }
  }

  /**
   * Get status change message
   */
  getStatusChangeMessage(newRecord, oldRecord) {
    const statusMessages = {
      'todo': 'To Do',
      'in_progress': 'In Progress',
      'submitted': 'Submitted',
      'needs_revision': 'Needs Revision',
      'completed': 'Completed'
    };

    const oldStatus = statusMessages[oldRecord.status] || oldRecord.status;
    const newStatus = statusMessages[newRecord.status] || newRecord.status;

    return `Task "${newRecord.title}" status changed from ${oldStatus} to ${newStatus}`;
  }

  /**
   * Get assignment change message
   */
  async getAssignmentChangeMessage(newRecord, oldRecord) {
    try {
      let message = `Task "${newRecord.title}" assignment changed`;

      if (newRecord.assigned_to && !oldRecord.assigned_to) {
        // Task was assigned
        const { data: assignee } = await supabase
          .from('users')
          .select('full_name, email')
          .eq('id', newRecord.assigned_to)
          .single();
        
        const assigneeName = assignee?.full_name || assignee?.email || 'someone';
        message = `Task "${newRecord.title}" was assigned to ${assigneeName}`;
      } else if (!newRecord.assigned_to && oldRecord.assigned_to) {
        // Task was unassigned
        message = `Task "${newRecord.title}" was unassigned`;
      }

      return message;
    } catch (error) {
      console.error('NotificationService: Error getting assignment message:', error);
      return `Task "${newRecord.title}" assignment changed`;
    }
  }

  /**
   * Get review message
   */
  async getReviewMessage(record) {
    try {
      if (!record.reviewed_by) return null;

      const { data: reviewer } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('id', record.reviewed_by)
        .single();

      const reviewerName = reviewer?.full_name || reviewer?.email || 'Someone';
      const action = record.status === 'completed' ? 'approved' : 'requested changes to';

      return `${reviewerName} ${action} task "${record.title}"`;
    } catch (error) {
      console.error('NotificationService: Error getting review message:', error);
      return `Task "${record.title}" was reviewed`;
    }
  }

  /**
   * Determine if toast should be shown for current user
   */
  shouldShowToast(newRecord, oldRecord) {
    if (!this.currentUser) return false;

    // Show toast if:
    // 1. Task is assigned to current user
    // 2. Current user is involved in the change
    // 3. It's a review of current user's work
    return (
      newRecord.assigned_to === this.currentUser.id ||
      oldRecord?.assigned_to === this.currentUser.id ||
      newRecord.reviewed_by === this.currentUser.id ||
      newRecord.assigned_by === this.currentUser.id
    );
  }

  /**
   * Get toast type based on notification type
   */
  getToastType(notificationType) {
    switch (notificationType) {
      case 'status_change':
        return 'info';
      case 'assignment_change':
        return 'info';
      case 'review':
        return 'success';
      default:
        return 'info';
    }
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    // Add to queue for processing by UI components
    const toast = {
      id: Date.now() + Math.random(),
      message,
      type,
      timestamp: new Date().toISOString()
    };

    this.toastQueue.push(toast);

    // Trigger custom event for UI components to listen to
    window.dispatchEvent(new CustomEvent('kiro-toast', { detail: toast }));

    // Auto-remove after 5 seconds
    setTimeout(() => {
      this.removeToast(toast.id);
    }, 5000);
  }

  /**
   * Remove toast from queue
   */
  removeToast(toastId) {
    this.toastQueue = this.toastQueue.filter(toast => toast.id !== toastId);
    window.dispatchEvent(new CustomEvent('kiro-toast-remove', { detail: { id: toastId } }));
  }

  /**
   * Get pending review count for a user in a workspace
   */
  async getPendingReviewCount(workspaceId, userId) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('status', 'submitted')
        .neq('assigned_to', userId); // Don't count own submissions

      if (error) throw error;
      return data?.length || 0;
    } catch (error) {
      console.error('NotificationService: Error getting pending review count:', error);
      return 0;
    }
  }

  /**
   * Unsubscribe from a specific subscription
   */
  unsubscribe(subscriptionKey) {
    const subscription = this.subscriptions.get(subscriptionKey);
    if (subscription) {
      supabase.removeChannel(subscription);
      this.subscriptions.delete(subscriptionKey);
      console.log(`NotificationService: Unsubscribed from ${subscriptionKey}`);
    }
  }

  /**
   * Unsubscribe from all subscriptions
   */
  unsubscribeAll() {
    for (const [key, subscription] of this.subscriptions) {
      supabase.removeChannel(subscription);
      console.log(`NotificationService: Unsubscribed from ${key}`);
    }
    this.subscriptions.clear();
  }

  /**
   * Clean up service
   */
  cleanup() {
    this.unsubscribeAll();
    this.listeners.clear();
    this.toastQueue = [];
    this.isInitialized = false;
    console.log('NotificationService: Cleaned up');
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;
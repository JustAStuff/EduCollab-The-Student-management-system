// src/hooks/useRealTimeUpdates.js - Hook for managing real-time updates
import { useEffect, useRef, useCallback, useState } from 'react';
import notificationService from '../services/NotificationService';

/**
 * Hook for managing real-time updates in workspace components
 * @param {string} workspaceId - The workspace ID to subscribe to
 * @param {Object} options - Configuration options
 * @param {Function} options.onTaskUpdate - Callback for task updates
 * @param {Function} options.onReviewUpdate - Callback for review updates  
 * @param {Function} options.onSubmissionUpdate - Callback for submission updates
 * @param {Function} options.onRefreshData - Callback to refresh component data
 * @param {boolean} options.enableToasts - Whether to show toast notifications
 * @param {boolean} options.enableBadgeUpdates - Whether to update notification badges
 * @returns {Object} - Subscription management functions and state
 */
export default function useRealTimeUpdates(workspaceId, options = {}) {
  const {
    onTaskUpdate,
    onReviewUpdate,
    onSubmissionUpdate,
    onRefreshData,
    enableToasts = true,
    enableBadgeUpdates = true
  } = options;

  const subscriptionsRef = useRef([]);
  const isInitializedRef = useRef(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [updateCount, setUpdateCount] = useState(0);

  // Initialize notification service
  const initializeService = useCallback(async () => {
    if (isInitializedRef.current) return;
    
    try {
      await notificationService.initialize();
      isInitializedRef.current = true;
    } catch (error) {
      console.error('useRealTimeUpdates: Failed to initialize notification service:', error);
    }
  }, []);

  // Handle task updates
  const handleTaskUpdate = useCallback((notification) => {
    console.log('useRealTimeUpdates: Task update received:', notification);
    
    // Update hook state
    setLastUpdate({
      type: 'task_update',
      timestamp: new Date().toISOString(),
      notification
    });
    setUpdateCount(prev => prev + 1);
    
    // Call custom handler if provided
    if (onTaskUpdate) {
      onTaskUpdate(notification);
    }

    // Refresh data if handler provided
    if (onRefreshData) {
      // Debounce refresh calls to avoid excessive API calls
      clearTimeout(handleTaskUpdate.refreshTimeout);
      handleTaskUpdate.refreshTimeout = setTimeout(() => {
        onRefreshData();
      }, 1000);
    }

    // Show success toast for successful actions
    if (enableToasts && notification.type === 'status_change') {
      const { new: newRecord, old: oldRecord } = notification.data;
      if (newRecord.status === 'completed' && oldRecord.status === 'submitted') {
        notificationService.showToast(
          `Task "${newRecord.title}" has been completed!`,
          'success'
        );
      } else if (newRecord.status === 'submitted' && oldRecord.status === 'in_progress') {
        notificationService.showToast(
          `Task "${newRecord.title}" has been submitted for review`,
          'info'
        );
      }
    }
  }, [onTaskUpdate, onRefreshData, enableToasts]);

  // Handle review updates
  const handleReviewUpdate = useCallback((notification) => {
    console.log('useRealTimeUpdates: Review update received:', notification);
    
    // Update hook state
    setLastUpdate({
      type: 'review_update',
      timestamp: new Date().toISOString(),
      notification
    });
    setUpdateCount(prev => prev + 1);
    
    // Call custom handler if provided
    if (onReviewUpdate) {
      onReviewUpdate(notification);
    }

    // Refresh data if handler provided
    if (onRefreshData) {
      clearTimeout(handleReviewUpdate.refreshTimeout);
      handleReviewUpdate.refreshTimeout = setTimeout(() => {
        onRefreshData();
      }, 1000);
    }

    // Show toast for review actions
    if (enableToasts && notification.type === 'review_action') {
      const toastType = notification.reviewAction === 'approve' ? 'success' : 'warning';
      notificationService.showToast(notification.message, toastType);
    }
  }, [onReviewUpdate, onRefreshData, enableToasts]);

  // Handle submission updates
  const handleSubmissionUpdate = useCallback((notification) => {
    console.log('useRealTimeUpdates: Submission update received:', notification);
    
    // Update hook state
    setLastUpdate({
      type: 'submission_update',
      timestamp: new Date().toISOString(),
      notification
    });
    setUpdateCount(prev => prev + 1);
    
    // Call custom handler if provided
    if (onSubmissionUpdate) {
      onSubmissionUpdate(notification);
    }

    // Refresh data if handler provided
    if (onRefreshData) {
      clearTimeout(handleSubmissionUpdate.refreshTimeout);
      handleSubmissionUpdate.refreshTimeout = setTimeout(() => {
        onRefreshData();
      }, 1000);
    }

    // Show toast for new submissions
    if (enableToasts && notification.type === 'new_submission') {
      notificationService.showToast(notification.message, 'info');
    }
  }, [onSubmissionUpdate, onRefreshData, enableToasts]);

  // Subscribe to updates
  const subscribe = useCallback(async () => {
    if (!workspaceId || !isInitializedRef.current) return;

    // Clear existing subscriptions
    unsubscribe();

    try {
      setConnectionStatus('connecting');

      // Subscribe to task updates
      const taskSubscription = notificationService.subscribeToTaskUpdates(
        workspaceId, 
        handleTaskUpdate
      );
      if (taskSubscription) {
        subscriptionsRef.current.push(taskSubscription);
      }

      // Subscribe to review updates
      const reviewSubscription = notificationService.subscribeToTaskReviews(
        workspaceId, 
        handleReviewUpdate
      );
      if (reviewSubscription) {
        subscriptionsRef.current.push(reviewSubscription);
      }

      // Subscribe to submission updates
      const submissionSubscription = notificationService.subscribeToSubmissions(
        workspaceId, 
        handleSubmissionUpdate
      );
      if (submissionSubscription) {
        subscriptionsRef.current.push(submissionSubscription);
      }

      setConnectionStatus('connected');
      console.log(`useRealTimeUpdates: Subscribed to ${subscriptionsRef.current.length} channels for workspace ${workspaceId}`);
    } catch (error) {
      console.error('useRealTimeUpdates: Error subscribing to updates:', error);
      setConnectionStatus('error');
    }
  }, [workspaceId, handleTaskUpdate, handleReviewUpdate, handleSubmissionUpdate]);

  // Unsubscribe from updates
  const unsubscribe = useCallback(() => {
    subscriptionsRef.current.forEach(subscriptionKey => {
      notificationService.unsubscribe(subscriptionKey);
    });
    subscriptionsRef.current = [];
    setConnectionStatus('disconnected');
  }, []);

  // Initialize and subscribe on mount
  useEffect(() => {
    const init = async () => {
      await initializeService();
      if (workspaceId) {
        await subscribe();
      }
    };

    init();

    return () => {
      unsubscribe();
      // Clear any pending timeouts
      clearTimeout(handleTaskUpdate.refreshTimeout);
      clearTimeout(handleReviewUpdate.refreshTimeout);
      clearTimeout(handleSubmissionUpdate.refreshTimeout);
    };
  }, [workspaceId, initializeService, subscribe, unsubscribe]);

  // Re-subscribe when workspace changes
  useEffect(() => {
    if (workspaceId && isInitializedRef.current) {
      subscribe();
    }
  }, [workspaceId, subscribe]);

  return {
    subscribe,
    unsubscribe,
    isInitialized: isInitializedRef.current,
    connectionStatus,
    lastUpdate,
    updateCount
  };
}
// src/components/notifications/NotificationBadge.jsx - Notification badge component
import { useState, useEffect } from 'react';
import {
  Badge,
  IconButton,
  Tooltip,
  Box,
  CircularProgress
} from '@mui/material';
import {
  Notifications,
  NotificationsActive
} from '@mui/icons-material';
import notificationService from '../../services/NotificationService';

export default function NotificationBadge({ 
  workspaceId, 
  userId, 
  onClick,
  size = 'medium',
  color = 'error',
  showConnectionStatus = false
}) {
  const [pendingCount, setPendingCount] = useState(0);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  useEffect(() => {
    if (!workspaceId || !userId) return;

    const fetchPendingCount = async () => {
      try {
        setIsLoading(true);
        const count = await notificationService.getPendingReviewCount(workspaceId, userId);
        setPendingCount(count);
      } catch (error) {
        console.error('NotificationBadge: Error fetching pending count:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchPendingCount();

    // Set up real-time subscription for task updates
    const handleNotification = (notification) => {
      // Update pending count based on notification type
      if (notification.type === 'status_change') {
        if (notification.data.new.status === 'submitted' && 
            notification.data.old.status !== 'submitted' &&
            notification.data.new.assigned_to !== userId) {
          // New submission that needs review
          setPendingCount(prev => prev + 1);
          setHasNewNotifications(true);
        } else if (notification.data.old.status === 'submitted' && 
                   notification.data.new.status !== 'submitted') {
          // Submission was reviewed
          setPendingCount(prev => Math.max(0, prev - 1));
        }
      }

      // Show notification indicator for any relevant updates
      if (notification.type === 'review_action' && 
          notification.data.task.assigned_to === userId) {
        setHasNewNotifications(true);
      }

      // Update connection status based on successful notifications
      setConnectionStatus('connected');
    };

    // Initialize notification service and subscribe
    const initializeAndSubscribe = async () => {
      try {
        setConnectionStatus('connecting');
        await notificationService.initialize();
        notificationService.subscribeToTaskUpdates(workspaceId, handleNotification);
        setConnectionStatus('connected');
      } catch (error) {
        console.error('NotificationBadge: Error initializing notifications:', error);
        setConnectionStatus('error');
      }
    };

    initializeAndSubscribe();

    // Refresh count periodically
    const interval = setInterval(fetchPendingCount, 30000); // Every 30 seconds

    return () => {
      clearInterval(interval);
    };
  }, [workspaceId, userId]);

  const handleClick = () => {
    setHasNewNotifications(false);
    if (onClick) {
      onClick(pendingCount);
    }
  };

  const getTooltipText = () => {
    if (isLoading) {
      return 'Loading notifications...';
    }
    
    if (showConnectionStatus && connectionStatus !== 'connected') {
      return `Connection ${connectionStatus}`;
    }
    
    if (pendingCount === 0) {
      return 'No pending reviews';
    } else if (pendingCount === 1) {
      return '1 task pending review';
    } else {
      return `${pendingCount} tasks pending review`;
    }
  };

  const getIconColor = () => {
    if (isLoading) return 'action.disabled';
    if (connectionStatus === 'error') return 'error.main';
    if (hasNewNotifications || pendingCount > 0) return 'primary.main';
    return 'text.secondary';
  };

  return (
    <Tooltip title={getTooltipText()} arrow>
      <Box>
        <Badge
          badgeContent={pendingCount}
          color={color}
          overlap="circular"
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          sx={{
            '& .MuiBadge-badge': {
              fontSize: '0.75rem',
              minWidth: '18px',
              height: '18px',
              animation: hasNewNotifications ? 'pulse 2s infinite' : 'none',
              '@keyframes pulse': {
                '0%': {
                  transform: 'scale(1)',
                  opacity: 1,
                },
                '50%': {
                  transform: 'scale(1.1)',
                  opacity: 0.8,
                },
                '100%': {
                  transform: 'scale(1)',
                  opacity: 1,
                },
              },
            },
          }}
        >
          <IconButton
            onClick={handleClick}
            size={size}
            disabled={isLoading}
            sx={{
              color: getIconColor(),
              transition: 'color 0.3s ease',
              '&:hover': {
                color: 'primary.main',
                backgroundColor: 'action.hover',
              },
              '&:disabled': {
                color: 'action.disabled',
              },
            }}
          >
            {isLoading ? (
              <CircularProgress size={20} />
            ) : hasNewNotifications || pendingCount > 0 ? (
              <NotificationsActive />
            ) : (
              <Notifications />
            )}
          </IconButton>
        </Badge>
      </Box>
    </Tooltip>
  );
}
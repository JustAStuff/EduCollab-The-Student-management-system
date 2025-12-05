import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  RadioButtonUnchecked,
  PlayArrow,
  CloudUpload,
  CheckCircle,
  Error,
  Delete,
  Refresh,
  AttachFile,
  Visibility,
  GetApp,
  HourglassEmpty,
  Help,
  Info,
  AdminPanelSettings,
  SupervisorAccount,
} from '@mui/icons-material';
import {
  getStatusStyle,
  getActionButtonConfig,
  getCardStyle,
  getButtonStyle,
  getButtonGroupStyle,
  TYPOGRAPHY_CONFIG,
  ICON_CONFIG,
} from '../../config/uiConsistency';

/**
 * TaskCard - Reusable task display component with status badges and action buttons
 * 
 * Provides consistent UI for displaying tasks across TL and TM views
 */
const TaskCard = ({
  task,
  userRole = 'tm',
  workspaceRole = null,
  currentUserId = null,
  onStatusChange,
  onUpload,
  onReview,
  onRevoke,
  onDeleteSubmission,
  onReuploadSubmission,
  onViewSubmission,
  onDownloadSubmission,
  showRevokeButton = false,
  isUpdating = false,
}) => {
  // Get icon component from icon name
  const getIconComponent = (iconName) => {
    const iconProps = { sx: { fontSize: ICON_CONFIG.size.medium } };
    switch (iconName) {
      case 'RadioButtonUnchecked':
        return <RadioButtonUnchecked {...iconProps} />;
      case 'PlayArrow':
        return <PlayArrow {...iconProps} />;
      case 'CloudUpload':
        return <CloudUpload {...iconProps} />;
      case 'Error':
        return <Error {...iconProps} />;
      case 'CheckCircle':
        return <CheckCircle {...iconProps} />;
      case 'Refresh':
        return <Refresh {...iconProps} />;
      case 'HourglassEmpty':
        return <HourglassEmpty {...iconProps} />;
      default:
        return <RadioButtonUnchecked {...iconProps} />;
    }
  };

  // Check if current user can manage this task
  const isTaskAssignee = currentUserId && task.assigned_to === currentUserId;
  const isWorkspaceOwner = workspaceRole === 'owner';
  // Workspace owners can manage their own tasks, members can only manage tasks assigned to them
  const canManageTask = isTaskAssignee;

  // Helper function to determine if submission modification actions should be shown
  const canModifySubmission = () => {
    // Must be the task assignee
    if (!isTaskAssignee) return false;
    
    // Task must be in submitted status
    if (task.status !== 'submitted') return false;
    
    // Workspace owners cannot modify their own submissions (peer review required)
    if (isWorkspaceOwner) return false;
    
    // Regular members can modify their submissions
    return true;
  };

  // Get action button config using consistent configuration
  const getActionButton = () => {
    if (isUpdating) {
      return {
        text: 'Updating...',
        disabled: true,
        color: 'primary',
        showProgress: true,
      };
    }

    // Only show action buttons if user can manage the task
    if (!canManageTask) {
      return null;
    }

    const config = getActionButtonConfig(task.status);
    
    // For workspace owners, allow more flexible status transitions
    if (isWorkspaceOwner && isTaskAssignee) {
      // Owners can start/restart tasks unless completed
      if (task.status === 'todo' || task.status === 'needs_revision') {
        return {
          ...config,
          icon: getIconComponent('PlayArrow'),
          text: task.status === 'needs_revision' ? 'Restart Task' : 'Start Task',
          onClick: () => onStatusChange?.(task.id, 'in_progress'),
        };
      }
      
      // Owners can upload to their in-progress or needs_revision tasks
      if (task.status === 'in_progress' || task.status === 'needs_revision') {
        return {
          ...config,
          icon: getIconComponent('CloudUpload'),
          text: 'Upload Result',
          onClick: () => onUpload?.(task),
        };
      }
      
      // For workspace owners' submitted tasks, they cannot self-approve
      // The task will need to be reviewed by teammates
      if (task.status === 'submitted') {
        return null; // No action button - task needs peer review
      }
      
      // Allow owners to restart completed tasks (move back to in_progress)
      if (task.status === 'completed') {
        return {
          ...config,
          icon: getIconComponent('Refresh'),
          text: 'Reopen Task',
          onClick: () => onStatusChange?.(task.id, 'in_progress'),
          color: 'warning',
        };
      }
    }
    
    return {
      ...config,
      icon: getIconComponent(config.icon),
      onClick: () => {
        if (task.status === 'todo') {
          onStatusChange?.(task.id, 'in_progress');
        } else if (['in_progress', 'needs_revision'].includes(task.status)) {
          onUpload?.(task);
        }
      },
    };
  };

  const actionButton = getActionButton();
  const statusStyle = getStatusStyle(task.status);

  // Helper function to determine if revoke button should be shown
  const canShowRevokeButton = () => {
    // Must have a valid current user ID
    if (!currentUserId) {
      return false;
    }

    // Cannot revoke completed tasks
    if (task.status === 'completed') {
      return false;
    }

    // Workspace owners can revoke any task in their workspace
    if (isWorkspaceOwner) {
      return true;
    }

    // Team leads can revoke tasks they assigned
    if (userRole === 'tl' && task.assigned_by === currentUserId) {
      return true;
    }

    return false;
  };

  // Helper function to get appropriate tooltip for revoke button
  const getRevokeButtonTooltip = () => {
    if (isWorkspaceOwner) {
      return "As workspace owner, you can revoke any task assignment. Any completed work will be preserved and the task will become available for reassignment.";
    } else if (userRole === 'tl' && task.assigned_by === currentUserId) {
      return "As the team lead who assigned this task, you can revoke the assignment. Any completed work will be preserved and the task will become available for reassignment.";
    }
    return "Remove this task assignment from the current member. Any completed work will be preserved and the task will become available for reassignment.";
  };

  return (
    <Card sx={getCardStyle()}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {/* Task Info */}
          <Box sx={{ flex: 1, mr: 2 }}>
            <Typography {...TYPOGRAPHY_CONFIG.taskTitle}>
              {task.title}
            </Typography>
            
            {task.description && (
              <Typography {...TYPOGRAPHY_CONFIG.taskDescription}>
                {task.description}
              </Typography>
            )}

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
              <Typography {...TYPOGRAPHY_CONFIG.metadata}>
                Created: {new Date(task.created_at).toLocaleDateString()}
              </Typography>
              
              {task.assigned_by_user && (
                <Typography {...TYPOGRAPHY_CONFIG.metadata}>
                  • Assigned by: {task.assigned_by_user.full_name || task.assigned_by_user.email}
                </Typography>
              )}
              
              {task.submitted_at && (
                <Typography {...TYPOGRAPHY_CONFIG.metadata}>
                  • Submitted: {new Date(task.submitted_at).toLocaleDateString()}
                </Typography>
              )}
            </Box>

            {/* Submission file info */}
            {task.submission_file_name && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <AttachFile sx={{ fontSize: ICON_CONFIG.size.small, color: ICON_CONFIG.colors.default }} />
                <Typography {...TYPOGRAPHY_CONFIG.metadata}>
                  {task.submission_file_name}
                </Typography>
              </Box>
            )}

            {/* Review comments */}
            {task.review_comments && (
              <Box sx={TYPOGRAPHY_CONFIG.reviewComments.sx}>
                <Typography {...TYPOGRAPHY_CONFIG.reviewComments}>
                  <strong>Review Comments:</strong> {task.review_comments}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Status and Actions */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
            <Chip
              icon={getIconComponent(statusStyle.icon)}
              label={statusStyle.label}
              color={statusStyle.color}
              size="medium"
              sx={{
                bgcolor: statusStyle.bgColor,
                color: statusStyle.textColor,
                '& .MuiChip-icon': {
                  color: statusStyle.textColor,
                },
              }}
            />

            {/* Main action button */}
            {actionButton && (
              <Button
                variant="contained"
                size="small"
                startIcon={actionButton.showProgress ? <CircularProgress size={16} color="inherit" /> : actionButton.icon}
                onClick={actionButton.onClick}
                disabled={actionButton.disabled}
                sx={{
                  minWidth: 140,
                  ...getButtonStyle(actionButton.color),
                }}
              >
                {actionButton.text}
              </Button>
            )}

            {/* Submission management buttons (for regular members only, not workspace owners) */}
            {canModifySubmission() && (
              <Box sx={getButtonGroupStyle()}>
                <Tooltip title="Delete your submission and return task to 'In Progress' status. This action cannot be undone.">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => onDeleteSubmission?.(task.id)}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Replace your current submission with a new file. The old file will be permanently removed.">
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => onReuploadSubmission?.(task)}
                  >
                    <Refresh fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Need help? You can modify your submission while it's under review. Use delete to start over or re-upload to replace the file.">
                  <IconButton size="small" color="info">
                    <Help fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            )}

            {/* Review buttons (for TL or workspace owners reviewing others' tasks) */}
            {task.status === 'submitted' && 
             task.submission_file_url && 
             onReview && 
             !isTaskAssignee && (
              <Box sx={getButtonGroupStyle()}>
                <Tooltip title="Preview the submitted file in your browser (if supported) or view file details">
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Visibility />}
                    onClick={() => onViewSubmission?.(task)}
                  >
                    View
                  </Button>
                </Tooltip>
                <Tooltip title="Download the submitted file to your device for detailed review">
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<GetApp />}
                    onClick={() => onDownloadSubmission?.(task)}
                  >
                    Download
                  </Button>
                </Tooltip>
                <Tooltip title="Mark this submission as completed and approved. The task will be finished.">
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => {
                      console.log('👆 Approve button clicked for task:', task.id);
                      console.log('onReview function exists?', !!onReview);
                      onReview?.(task.id, 'approve');
                    }}
                    sx={getButtonStyle('success')}
                  >
                    Approve
                  </Button>
                </Tooltip>
                <Tooltip title="Send this task back for revision with feedback. The submitter will be able to make changes and resubmit.">
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => {
                      console.log('👆 Request Redo button clicked for task:', task.id);
                      console.log('onReview function exists?', !!onReview);
                      onReview?.(task.id, 'request_redo');
                    }}
                    sx={getButtonStyle('error')}
                  >
                    Request Redo
                  </Button>
                </Tooltip>
                <Tooltip title="Peer Review: Any workspace member can review submissions to ensure quality and accountability.">
                  <IconButton size="small" color="info">
                    <Info fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            )}

            {/* Information message for workspace owners with submitted tasks */}
            {task.status === 'submitted' && isWorkspaceOwner && isTaskAssignee && (
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1, 
                p: 1, 
                bgcolor: 'info.light', 
                borderRadius: 1,
                maxWidth: 200
              }}>
                <Info fontSize="small" color="info" />
                <Typography variant="caption" color="info.dark">
                  Your submission is awaiting peer review. Workspace owners cannot modify their own submissions.
                </Typography>
              </Box>
            )}

            {/* Revoke button (for workspace owners or task assigners) */}
            {showRevokeButton && canShowRevokeButton() && (
              <Tooltip title={getRevokeButtonTooltip()}>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={() => onRevoke?.(task.id)}
                  startIcon={isWorkspaceOwner ? <AdminPanelSettings fontSize="small" /> : <SupervisorAccount fontSize="small" />}
                >
                  Revoke Assignment
                </Button>
              </Tooltip>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

TaskCard.propTypes = {
  task: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    status: PropTypes.oneOf(['todo', 'in_progress', 'submitted', 'needs_revision', 'completed']).isRequired,
    created_at: PropTypes.string.isRequired,
    submitted_at: PropTypes.string,
    submission_file_name: PropTypes.string,
    submission_file_url: PropTypes.string,
    review_comments: PropTypes.string,
    assigned_to: PropTypes.string,
    assigned_by: PropTypes.string,
    assigned_by_user: PropTypes.shape({
      full_name: PropTypes.string,
      email: PropTypes.string,
    }),
  }).isRequired,
  userRole: PropTypes.oneOf(['tl', 'tm']),
  workspaceRole: PropTypes.oneOf(['owner', 'member']),
  currentUserId: PropTypes.string,
  onStatusChange: PropTypes.func,
  onUpload: PropTypes.func,
  onReview: PropTypes.func,
  onRevoke: PropTypes.func,
  onDeleteSubmission: PropTypes.func,
  onReuploadSubmission: PropTypes.func,
  onViewSubmission: PropTypes.func,
  onDownloadSubmission: PropTypes.func,
  showRevokeButton: PropTypes.bool,
  isUpdating: PropTypes.bool,
};

export default TaskCard;

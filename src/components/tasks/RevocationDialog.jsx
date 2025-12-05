import React from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  Chip,
} from '@mui/material';
import { Warning, AdminPanelSettings, SupervisorAccount } from '@mui/icons-material';

/**
 * RevocationDialog - Confirmation dialog for revoking task assignments
 * 
 * Displays task and member information and requires explicit confirmation
 * Enhanced to show revocation authority (workspace owner vs team lead)
 */
const RevocationDialog = ({
  open,
  task,
  member,
  onConfirm,
  onCancel,
  isRevoking = false,
  userRole = null,
  workspaceRole = null,
  error = null,
}) => {
  if (!task || !member) return null;

  // Determine revocation authority
  const isWorkspaceOwner = workspaceRole === 'owner';
  const isTaskAssigner = task.assigned_by === member.id;
  
  const getRevocationAuthority = () => {
    if (isWorkspaceOwner) {
      return {
        icon: <AdminPanelSettings fontSize="small" />,
        label: 'Workspace Owner',
        color: 'primary',
        description: 'You can revoke any task assignment in this workspace'
      };
    } else if (isTaskAssigner) {
      return {
        icon: <SupervisorAccount fontSize="small" />,
        label: 'Task Assigner',
        color: 'secondary',
        description: 'You can revoke this task because you assigned it'
      };
    }
    return null;
  };

  const authority = getRevocationAuthority();

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Warning color="warning" />
        Revoke Task Assignment?
      </DialogTitle>
      
      <DialogContent>
        {/* Show revocation authority */}
        {authority && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Revocation Authority
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Chip
                icon={authority.icon}
                label={authority.label}
                color={authority.color}
                size="small"
                variant="outlined"
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {authority.description}
            </Typography>
          </Box>
        )}

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Task
          </Typography>
          <Typography variant="body1" fontWeight="medium">
            {task.title}
          </Typography>
          {task.status && (
            <Chip 
              label={task.status.replace('_', ' ').toUpperCase()} 
              size="small" 
              sx={{ mt: 1 }}
              color={task.status === 'completed' ? 'success' : 'default'}
            />
          )}
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Assigned to
          </Typography>
          <Typography variant="body1" fontWeight="medium">
            {member.full_name || member.email}
          </Typography>
        </Box>

        {/* Show error if any */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Alert severity="info" sx={{ mt: 2 }}>
          This will unassign the task from the member. Any progress and submissions will be preserved for reference.
        </Alert>

        {/* Warning for completed tasks */}
        {task.status === 'completed' && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            This task is already completed. Revocation is not recommended unless absolutely necessary.
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onCancel}
          disabled={isRevoking}
        >
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="error"
          disabled={isRevoking}
        >
          {isRevoking ? 'Revoking...' : 'Confirm Revocation'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

RevocationDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  task: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    status: PropTypes.string,
    assigned_by: PropTypes.string,
  }),
  member: PropTypes.shape({
    id: PropTypes.string,
    full_name: PropTypes.string,
    email: PropTypes.string,
  }),
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  isRevoking: PropTypes.bool,
  userRole: PropTypes.string,
  workspaceRole: PropTypes.string,
  error: PropTypes.string,
};

export default RevocationDialog;

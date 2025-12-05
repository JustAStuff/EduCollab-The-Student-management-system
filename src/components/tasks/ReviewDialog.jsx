import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  ThumbUp,
  ThumbDown,
  Close,
  Help,
  Info,
} from '@mui/icons-material';

/**
 * ReviewDialog - Component for approve/redo actions on task submissions
 * 
 * Provides consistent interface for reviewing task submissions
 */
const ReviewDialog = ({
  open,
  onClose,
  task,
  onApprove,
  onRequestRedo,
  reviewerName,
}) => {
  const [action, setAction] = useState(null); // 'approve' or 'redo'
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleClose = () => {
    if (submitting) return;
    setAction(null);
    setComments('');
    setError(null);
    onClose();
  };

  const handleApprove = async () => {
    if (!onApprove) return;
    
    setSubmitting(true);
    setError(null);
    
    try {
      await onApprove(task.id, comments);
      handleClose();
    } catch (err) {
      console.error('Approve error:', err);
      setError(err.message || 'Failed to approve task. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestRedo = async () => {
    if (!onRequestRedo) return;
    
    if (!comments.trim()) {
      setError('Please provide feedback for the revision request.');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      await onRequestRedo(task.id, comments);
      handleClose();
    } catch (err) {
      console.error('Request redo error:', err);
      setError(err.message || 'Failed to request revision. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleActionSelect = (selectedAction) => {
    setAction(selectedAction);
    setError(null);
  };

  if (!task) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Review Task Submission
          </Typography>
          <Button
            size="small"
            onClick={handleClose}
            disabled={submitting}
            sx={{ minWidth: 'auto' }}
          >
            <Close />
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Task info */}
        <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Task
          </Typography>
          <Typography variant="body1" fontWeight="medium">
            {task.title}
          </Typography>
          
          {task.submission_file_name && (
            <>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
                Submitted File
              </Typography>
              <Typography variant="body2">
                {task.submission_file_name}
              </Typography>
            </>
          )}
          
          {task.submitted_at && (
            <>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
                Submitted At
              </Typography>
              <Typography variant="body2">
                {new Date(task.submitted_at).toLocaleString()}
              </Typography>
            </>
          )}
        </Box>

        {/* Error message */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Action selection */}
        {!action && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography variant="body1">
                How would you like to proceed with this submission?
              </Typography>
              <Tooltip title="As a workspace member, you can review any submission except your own. Your decision will determine if the task is completed or needs revision.">
                <IconButton size="small" color="info">
                  <Info fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Tooltip title="Mark this submission as satisfactory and complete the task. The submitter will be notified of approval.">
                <Button
                  variant="outlined"
                  color="success"
                  startIcon={<ThumbUp />}
                  onClick={() => handleActionSelect('approve')}
                  fullWidth
                  sx={{ py: 2 }}
                >
                  Approve
                </Button>
              </Tooltip>
              <Tooltip title="Send the task back for revision with specific feedback. The submitter will be able to make changes and resubmit.">
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<ThumbDown />}
                  onClick={() => handleActionSelect('redo')}
                  fullWidth
                  sx={{ py: 2 }}
                >
                  Request Redo
                </Button>
              </Tooltip>
            </Box>
          </Box>
        )}

        {/* Approve confirmation */}
        {action === 'approve' && (
          <Box>
            <Alert severity="success" sx={{ mb: 2 }}>
              You are about to approve this task submission.
            </Alert>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Comments (Optional)"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add any feedback or comments..."
              disabled={submitting}
            />
          </Box>
        )}

        {/* Request redo form */}
        {action === 'redo' && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Alert severity="warning" sx={{ flex: 1 }}>
                The task will be sent back for revision. Please provide clear feedback.
              </Alert>
              <Tooltip title="Constructive feedback helps the submitter understand what needs improvement. Be specific about what changes are needed and why.">
                <IconButton size="small" color="info">
                  <Help fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Revision Comments *"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Explain what needs to be changed or improved..."
              required
              disabled={submitting}
              error={!comments.trim() && error !== null}
              helperText={!comments.trim() && error !== null ? 'Comments are required for revision requests' : 'Be specific about what needs improvement and provide actionable feedback'}
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        {!action ? (
          <Button onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
        ) : (
          <>
            <Button
              onClick={() => {
                setAction(null);
                setComments('');
                setError(null);
              }}
              disabled={submitting}
            >
              Back
            </Button>
            {action === 'approve' ? (
              <Button
                variant="contained"
                color="success"
                startIcon={submitting ? <CircularProgress size={16} /> : <ThumbUp />}
                onClick={handleApprove}
                disabled={submitting}
              >
                {submitting ? 'Approving...' : 'Confirm Approval'}
              </Button>
            ) : (
              <Button
                variant="contained"
                color="error"
                startIcon={submitting ? <CircularProgress size={16} /> : <ThumbDown />}
                onClick={handleRequestRedo}
                disabled={submitting || !comments.trim()}
              >
                {submitting ? 'Submitting...' : 'Request Revision'}
              </Button>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

ReviewDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  task: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    submission_file_name: PropTypes.string,
    submitted_at: PropTypes.string,
  }),
  onApprove: PropTypes.func,
  onRequestRedo: PropTypes.func,
  reviewerName: PropTypes.string,
};

export default ReviewDialog;

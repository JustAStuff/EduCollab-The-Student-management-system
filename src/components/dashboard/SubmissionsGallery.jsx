// SubmissionsGallery.jsx - Display all workspace submissions with lazy loading and pagination
import { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Paper,
  Grid,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Tooltip
} from '@mui/material';
import {
  Download,
  Visibility,
  PictureAsPdf,
  Description,
  Image as ImageIcon,
  AttachFile
} from '@mui/icons-material';
import { supabase } from '../../supabaseClient';
import { formatFileSize, getFileExtension } from '../../utils/fileUtils';
import LazyLoader from '../common/LazyLoader';
import PaginationControls from '../common/PaginationControls';
import usePagination from '../../hooks/usePagination';
import useDebounce from '../../hooks/useDebounce';

const SubmissionsGallery = ({ workspaceId, submissions, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [loadedSubmissions, setLoadedSubmissions] = useState([]);

  // Debounce submissions to prevent excessive re-renders
  const debouncedSubmissions = useDebounce(submissions, 300);

  // Pagination hook
  const {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    totalItems,
    startIndex,
    endIndex
  } = usePagination(debouncedSubmissions, itemsPerPage);

  // Memoize sorted submissions for performance
  const sortedSubmissions = useMemo(() => {
    if (!debouncedSubmissions || !Array.isArray(debouncedSubmissions)) return [];
    
    return [...debouncedSubmissions].sort((a, b) => {
      return new Date(b.submitted_at) - new Date(a.submitted_at);
    });
  }, [debouncedSubmissions]);

  // Set up real-time subscription for new submissions
  useEffect(() => {
    if (!workspaceId) return;

    const channel = supabase
      .channel(`workspace-submissions-${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `workspace_id=eq.${workspaceId}`
        },
        (payload) => {
          // Refresh submissions when tasks are updated
          if (payload.new?.submission_file_url || payload.old?.submission_file_url) {
            onRefresh?.();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, onRefresh]);

  const getFileIcon = (filename) => {
    const ext = getFileExtension(filename);
    
    switch (ext) {
      case 'pdf':
        return <PictureAsPdf sx={{ fontSize: 48, color: '#d32f2f' }} />;
      case 'doc':
      case 'docx':
        return <Description sx={{ fontSize: 48, color: '#1976d2' }} />;
      case 'jpg':
      case 'jpeg':
      case 'png':
        return <ImageIcon sx={{ fontSize: 48, color: '#388e3c' }} />;
      default:
        return <AttachFile sx={{ fontSize: 48, color: '#757575' }} />;
    }
  };

  const handleDownload = async (submission) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: downloadError } = await supabase.storage
        .from('task-submissions')
        .download(submission.file_url);

      if (downloadError) throw downloadError;

      // Create download link
      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = submission.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading file:', err);
      setError('Failed to download file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (submission) => {
    try {
      setLoading(true);
      setError(null);

      const ext = getFileExtension(submission.file_name);
      const viewableFormats = ['jpg', 'jpeg', 'png', 'pdf'];

      if (!viewableFormats.includes(ext)) {
        setError('This file format cannot be previewed. Please download to view.');
        return;
      }

      const { data, error: viewError } = await supabase.storage
        .from('task-submissions')
        .createSignedUrl(submission.file_url, 3600); // 1 hour expiry

      if (viewError) throw viewError;

      // Open in new tab
      window.open(data.signedUrl, '_blank');
    } catch (err) {
      console.error('Error viewing file:', err);
      setError('Failed to view file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'needs_revision':
        return 'error';
      case 'under_review':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'needs_revision':
        return 'Needs Revision';
      case 'under_review':
        return 'Under Review';
      default:
        return 'Unknown';
    }
  };

  // Render individual submission card with lazy loading
  const renderSubmissionCard = (submission) => (
    <LazyLoader
      key={submission.id}
      height={300}
      onIntersect={() => {
        // Track loaded submissions for analytics
        setLoadedSubmissions(prev => [...prev, submission.id]);
      }}
    >
      <Paper
        elevation={2}
        sx={{
          p: 2,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 6
          }
        }}
      >
        {/* File Icon */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: 80,
            mb: 2,
            backgroundColor: '#f5f5f5',
            borderRadius: 1
          }}
        >
          {getFileIcon(submission.file_name)}
        </Box>

        {/* File Name */}
        <Typography
          variant="subtitle2"
          fontWeight="bold"
          sx={{
            mb: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
          title={submission.file_name}
        >
          {submission.file_name}
        </Typography>

        {/* Task Title */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
          title={submission.task_title}
        >
          Task: {submission.task_title}
        </Typography>

        {/* Submitter */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
          title={submission.submitter_name}
        >
          By: {submission.submitter_name}
        </Typography>

        {/* File Size */}
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
          {formatFileSize(submission.file_size)}
        </Typography>

        {/* Status */}
        <Chip
          label={getStatusText(submission.status)}
          size="small"
          color={getStatusColor(submission.status)}
          sx={{ mb: 2, alignSelf: 'flex-start' }}
        />

        {/* Submitted Date */}
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
          {new Date(submission.submitted_at).toLocaleDateString()}
        </Typography>

        {/* Action Buttons */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            gap: 1,
            mt: 'auto'
          }}
        >
          <Tooltip title="View">
            <IconButton
              size="small"
              onClick={() => handleView(submission)}
              disabled={loading}
              sx={{
                bgcolor: 'var(--color-primary)',
                color: 'white',
                '&:hover': { bgcolor: 'var(--color-primary-hover)' }
              }}
            >
              <Visibility />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download">
            <IconButton
              size="small"
              onClick={() => handleDownload(submission)}
              disabled={loading}
              sx={{
                bgcolor: '#4caf50',
                color: 'white',
                '&:hover': { bgcolor: '#388e3c' }
              }}
            >
              <Download />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>
    </LazyLoader>
  );

  if (!sortedSubmissions || sortedSubmissions.length === 0) {
    return (
      <Alert severity="info">
        No submissions yet. Submissions will appear here once team members upload their work.
      </Alert>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Submissions Grid */}
      <Grid container spacing={3}>
        {paginatedData.map((submission) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={submission.id}>
            {renderSubmissionCard(submission)}
          </Grid>
        ))}
      </Grid>

      {/* Pagination Controls */}
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        onPageChange={goToPage}
        onItemsPerPageChange={(newItemsPerPage) => {
          setItemsPerPage(newItemsPerPage);
          goToPage(1); // Reset to first page when changing items per page
        }}
        itemsPerPageOptions={[6, 12, 24, 48]}
        showItemCount={true}
      />

      {loading && (
        <Box
          sx={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 9999
          }}
        >
          <CircularProgress />
        </Box>
      )}
    </Box>
  );
};

SubmissionsGallery.propTypes = {
  workspaceId: PropTypes.string.isRequired,
  submissions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      task_id: PropTypes.string.isRequired,
      workspace_id: PropTypes.string.isRequired,
      submitted_by: PropTypes.string.isRequired,
      submitter_name: PropTypes.string.isRequired,
      task_title: PropTypes.string.isRequired,
      file_url: PropTypes.string.isRequired,
      file_name: PropTypes.string.isRequired,
      file_size: PropTypes.number.isRequired,
      submitted_at: PropTypes.string.isRequired,
      status: PropTypes.string.isRequired
    })
  ).isRequired,
  onRefresh: PropTypes.func
};

export default SubmissionsGallery;

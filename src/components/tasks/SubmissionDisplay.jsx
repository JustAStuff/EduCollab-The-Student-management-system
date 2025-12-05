import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  PictureAsPdf,
  Description,
  Image as ImageIcon,
  AttachFile,
  GetApp,
  Visibility,
  Close,
} from '@mui/icons-material';
import { formatFileSize, getFileIcon } from '../../utils/fileUtils';
import {
  getButtonStyle,
  getButtonGroupStyle,
  TYPOGRAPHY_CONFIG,
  LAYOUT_CONFIG,
  ICON_CONFIG,
  VALIDATION_MESSAGES,
} from '../../config/uiConsistency';

/**
 * SubmissionDisplay - Component for viewing and downloading submission files
 * 
 * Provides consistent interface for displaying file submissions with preview and download
 */
const SubmissionDisplay = ({
  fileName,
  fileUrl,
  fileSize,
  submittedAt,
  submitterName,
  taskTitle,
  onDownload,
  onView,
  showActions = true,
  compact = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get file icon component
  const getFileIconComponent = (filename) => {
    const iconName = getFileIcon(filename);
    const iconSize = compact ? ICON_CONFIG.size.medium : ICON_CONFIG.size.large * 1.5;
    const iconProps = { sx: { fontSize: iconSize, mr: compact ? 1 : 2 } };
    
    switch (iconName) {
      case 'PictureAsPdf':
        return <PictureAsPdf {...iconProps} sx={{ ...iconProps.sx, color: ICON_CONFIG.colors.pdf }} />;
      case 'Description':
        return <Description {...iconProps} sx={{ ...iconProps.sx, color: ICON_CONFIG.colors.doc }} />;
      case 'Image':
        return <ImageIcon {...iconProps} sx={{ ...iconProps.sx, color: ICON_CONFIG.colors.image }} />;
      default:
        return <AttachFile {...iconProps} sx={{ ...iconProps.sx, color: ICON_CONFIG.colors.default }} />;
    }
  };

  const handleDownload = async () => {
    if (!onDownload) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await onDownload(fileUrl, fileName);
    } catch (err) {
      console.error('Download error:', err);
      setError(VALIDATION_MESSAGES.downloadFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleView = async () => {
    if (!onView) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await onView(fileUrl, fileName);
    } catch (err) {
      console.error('View error:', err);
      setError('Failed to view file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canPreview = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'pdf'].includes(ext);
  };

  if (compact) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {getFileIconComponent(fileName)}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" noWrap>
            {fileName}
          </Typography>
          {fileSize && (
            <Typography {...TYPOGRAPHY_CONFIG.metadata}>
              {formatFileSize(fileSize)}
            </Typography>
          )}
        </Box>
        {showActions && (
          <Box sx={{ ...getButtonGroupStyle(), gap: 0.5 }}>
            {canPreview(fileName) && onView && (
              <Tooltip title="View">
                <IconButton size="small" onClick={handleView} disabled={loading}>
                  <Visibility fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {onDownload && (
              <Tooltip title="Download">
                <IconButton size="small" onClick={handleDownload} disabled={loading}>
                  {loading ? <CircularProgress size={16} /> : <GetApp fontSize="small" />}
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Paper sx={{ 
      p: LAYOUT_CONFIG.contentPadding, 
      border: `1px solid ${LAYOUT_CONFIG.borderColor}`,
      borderRadius: LAYOUT_CONFIG.borderRadius,
    }}>
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          action={
            <IconButton size="small" onClick={() => setError(null)}>
              <Close fontSize="small" />
            </IconButton>
          }
        >
          {error}
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        {/* File icon */}
        <Box>
          {getFileIconComponent(fileName)}
        </Box>

        {/* File info */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography {...TYPOGRAPHY_CONFIG.taskTitle} noWrap>
            {fileName}
          </Typography>
          
          {fileSize && (
            <Typography {...TYPOGRAPHY_CONFIG.metadata}>
              Size: {formatFileSize(fileSize)}
            </Typography>
          )}
          
          {submittedAt && (
            <Typography {...TYPOGRAPHY_CONFIG.metadata}>
              Submitted: {new Date(submittedAt).toLocaleString()}
            </Typography>
          )}
          
          {submitterName && (
            <Typography {...TYPOGRAPHY_CONFIG.metadata}>
              By: {submitterName}
            </Typography>
          )}
          
          {taskTitle && (
            <Typography {...TYPOGRAPHY_CONFIG.metadata}>
              Task: {taskTitle}
            </Typography>
          )}
        </Box>

        {/* Actions */}
        {showActions && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {canPreview(fileName) && onView && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<Visibility />}
                onClick={handleView}
                disabled={loading}
              >
                View
              </Button>
            )}
            {onDownload && (
              <Button
                size="small"
                variant="contained"
                startIcon={loading ? <CircularProgress size={16} /> : <GetApp />}
                onClick={handleDownload}
                disabled={loading}
                sx={getButtonStyle('primary')}
              >
                Download
              </Button>
            )}
          </Box>
        )}
      </Box>
    </Paper>
  );
};

SubmissionDisplay.propTypes = {
  fileName: PropTypes.string.isRequired,
  fileUrl: PropTypes.string.isRequired,
  fileSize: PropTypes.number,
  submittedAt: PropTypes.string,
  submitterName: PropTypes.string,
  taskTitle: PropTypes.string,
  onDownload: PropTypes.func,
  onView: PropTypes.func,
  showActions: PropTypes.bool,
  compact: PropTypes.bool,
};

export default SubmissionDisplay;

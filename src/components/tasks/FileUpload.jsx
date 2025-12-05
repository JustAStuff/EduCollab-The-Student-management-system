import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Button,
  Typography,
  LinearProgress,
  Alert,
  Paper,
  Snackbar,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CloudUpload,
  AttachFile,
  CheckCircle,
  Refresh,
  Close,
  Warning,
  Security,
  Help,
} from '@mui/icons-material';
import { formatFileSize } from '../../utils/fileUtils';
import {
  validateFileEnhanced,
  retryOperation,
  getUserFriendlyErrorMessage,
  logError,
  TaskManagementError,
  ERROR_CODES,
} from '../../utils/errorHandling';
import {
  getButtonStyle,
  getButtonGroupStyle,
  FILE_UPLOAD_CONFIG,
  TYPOGRAPHY_CONFIG,
  LAYOUT_CONFIG,
} from '../../config/uiConsistency';
import { validateFileServerSide } from '../../utils/securityValidation';
import { useSecurity } from '../../contexts/SecurityContext';
import { validateUploadPermissions } from '../../services/TaskService';

/**
 * FileUpload - Reusable file upload component with validation
 * 
 * Provides consistent file upload interface with validation and progress indication
 * Enhanced with workspace owner permission support
 */
const FileUpload = ({
  onFileSelect,
  onUpload,
  taskId,
  workspaceId,
  userRole,
  acceptedFormats = FILE_UPLOAD_CONFIG.acceptedFormats,
  maxSizeMB = FILE_UPLOAD_CONFIG.maxSizeMB,
  disabled = false,
  showPreview = true,
  enableRetry = true,
  maxRetries = 3,
  enableSecurityValidation = true,
}) => {
  const { csrfToken, isSecurityReady } = useSecurity();
  const [selectedFile, setSelectedFile] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [securityValidating, setSecurityValidating] = useState(false);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    
    // Reset all error states when selecting a new file
    setValidationError(null);
    setUploadError(null);
    setRetryCount(0);
    
    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Check upload permissions first if taskId is provided
    if (taskId) {
      try {
        const { data: { user } } = await import('../../supabaseClient').then(m => m.supabase.auth.getUser());
        if (user) {
          const permissionCheck = await validateUploadPermissions(taskId, user.id);
          if (!permissionCheck.isValid) {
            setValidationError(permissionCheck.error || 'You do not have permission to upload files to this task');
            setSelectedFile(null);
            return;
          }
        }
      } catch (error) {
        console.error('Error checking upload permissions:', error);
        setValidationError('Unable to verify upload permissions. Please try again.');
        setSelectedFile(null);
        return;
      }
    }

    // Enhanced client-side file validation
    const validation = validateFileEnhanced(file, {
      maxSizeMB,
      allowedTypes: FILE_UPLOAD_CONFIG.allowedTypes,
      allowedExtensions: acceptedFormats.replace(/\./g, '').split(','),
    });
    
    if (!validation.isValid) {
      const errorMessage = getUserFriendlyErrorMessage(validation.error);
      setValidationError(errorMessage);
      setSelectedFile(null);
      
      // Log validation error for debugging
      logError(validation.error, {
        component: 'FileUpload',
        operation: 'file_validation',
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        taskId,
        workspaceId,
        userRole,
      });
      return;
    }

    // Enhanced server-side security validation
    if (enableSecurityValidation) {
      setSecurityValidating(true);
      try {
        const securityValidation = await validateFileServerSide(file, {
          maxSizeMB,
          checkSignature: true,
          scanForMalware: true
        });
        
        if (!securityValidation.isValid) {
          const errorMessage = getUserFriendlyErrorMessage(securityValidation.error);
          setValidationError(errorMessage);
          setSelectedFile(null);
          setSecurityValidating(false);
          return;
        }
      } catch (error) {
        setValidationError('Security validation failed. Please try again.');
        setSelectedFile(null);
        setSecurityValidating(false);
        return;
      }
      setSecurityValidating(false);
    }

    setSelectedFile(file);
    
    // Notify parent component
    if (onFileSelect) {
      onFileSelect(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !onUpload) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      // Double-check permissions before upload
      if (taskId) {
        const { data: { user } } = await import('../../supabaseClient').then(m => m.supabase.auth.getUser());
        if (user) {
          const permissionCheck = await validateUploadPermissions(taskId, user.id);
          if (!permissionCheck.isValid) {
            throw new TaskManagementError(
              permissionCheck.error || 'Upload permission denied',
              ERROR_CODES.PERMISSION_DENIED
            );
          }
        }
      }

      // Progress simulation
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Use retry logic for upload operation with CSRF token
      const uploadOperation = () => onUpload(selectedFile, csrfToken, workspaceId, taskId);
      
      if (enableRetry) {
        await retryOperation(uploadOperation, {
          maxRetries,
          delay: 1000,
          backoffMultiplier: 2,
          shouldRetry: (error) => {
            // Don't retry on permission errors or CSRF token issues
            if (error.code === ERROR_CODES.PERMISSION_DENIED || 
                error.message?.includes('security token') ||
                error.message?.includes('permission')) {
              return false;
            }
            
            // Retry on network errors and upload failures
            return error.code === ERROR_CODES.NETWORK_ERROR || 
                   error.code === ERROR_CODES.UPLOAD_FAILED ||
                   (error.message && error.message.includes('network')) ||
                   (error.message && error.message.includes('timeout'));
          },
        });
      } else {
        await uploadOperation();
      }
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      setShowSuccessMessage(true);
      
      // Reset after successful upload
      setTimeout(() => {
        setSelectedFile(null);
        setUploadProgress(0);
        setUploading(false);
        setRetryCount(0);
      }, 1500);
      
    } catch (error) {
      const taskError = error instanceof TaskManagementError ? error : 
        new TaskManagementError(
          error.message || 'Upload failed',
          ERROR_CODES.UPLOAD_FAILED
        );
      
      let errorMessage = getUserFriendlyErrorMessage(taskError);
      
      // Provide more specific error messages for common issues
      if (error.message?.includes('policy')) {
        errorMessage = 'Upload failed due to permission restrictions. Please check if you have the right to upload to this task.';
      } else if (error.message?.includes('CSRF') || error.message?.includes('security token')) {
        errorMessage = 'Security validation failed. Please refresh the page and try again.';
      } else if (error.message?.includes('network') || error.message?.includes('timeout')) {
        errorMessage = 'Network error occurred. Please check your connection and try again.';
      }
      
      setUploadError(errorMessage);
      setUploading(false);
      setUploadProgress(0);
      
      // Log upload error with enhanced context
      logError(taskError, {
        component: 'FileUpload',
        operation: 'file_upload',
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        retryCount,
        taskId,
        workspaceId,
        userRole,
        errorCode: taskError.code,
        originalError: error.message,
      });
    }
  };

  const handleRetry = async () => {
    if (retryCount >= maxRetries) return;
    
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    setUploadError(null);
    
    // Wait a moment before retrying
    setTimeout(() => {
      setIsRetrying(false);
      handleUpload();
    }, 1000);
  };

  const handleClear = () => {
    setSelectedFile(null);
    setValidationError(null);
    setUploadError(null);
    setUploadProgress(0);
    setRetryCount(0);
    setShowSuccessMessage(false);
  };

  return (
    <Box>
      {/* File input */}
      <Box sx={{ mb: 2 }}>
        <input
          accept={acceptedFormats}
          style={{ display: 'none' }}
          id="file-upload-input"
          type="file"
          onChange={handleFileChange}
          disabled={disabled || uploading}
        />
        <label htmlFor="file-upload-input">
          <Tooltip title="Click to browse and select a file from your device. Files are validated for security and format compliance.">
            <Button
              variant="outlined"
              component="span"
              startIcon={<AttachFile />}
              disabled={disabled || uploading}
              fullWidth
              sx={{ py: 1.5 }}
            >
              {selectedFile ? 'Change File' : 'Select File'}
            </Button>
          </Tooltip>
        </label>
      </Box>

      {/* Accepted formats info */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography {...TYPOGRAPHY_CONFIG.metadata} sx={{ flex: 1 }}>
          Accepted formats: {acceptedFormats.replace(/\./g, '').toUpperCase()} (Max {maxSizeMB}MB)
          {enableSecurityValidation && (
            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
              <Security fontSize="small" />
              <span>Enhanced security validation enabled</span>
            </Box>
          )}
          {userRole === 'owner' && (
            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, color: 'primary.main' }}>
              <Security fontSize="small" />
              <span>Workspace owner: Can upload to any task</span>
            </Box>
          )}
        </Typography>
        <Tooltip title="Files are automatically validated for type, size, and security. Supported formats include documents, images, and code files. All uploads are scanned for malware. Workspace owners can upload files to any task in their workspace.">
          <IconButton size="small" color="info">
            <Help fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Security validation in progress */}
      {securityValidating && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Security />
            <Typography variant="body2">
              Performing security validation...
            </Typography>
          </Box>
        </Alert>
      )}

      {/* Security not ready warning */}
      {enableSecurityValidation && !isSecurityReady && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Security system is initializing. Please wait before uploading files.
        </Alert>
      )}

      {/* Validation error */}
      {validationError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {validationError}
        </Alert>
      )}

      {/* Upload error with retry option */}
      {uploadError && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          action={
            enableRetry && retryCount < maxRetries && (
              <Tooltip title={`Retry upload (${retryCount}/${maxRetries} attempts)`}>
                <IconButton
                  color="inherit"
                  size="small"
                  onClick={handleRetry}
                  disabled={isRetrying || uploading}
                >
                  <Refresh />
                </IconButton>
              </Tooltip>
            )
          }
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning />
            <Box>
              <Typography variant="body2" fontWeight="medium">
                Upload Failed
              </Typography>
              <Typography variant="caption">
                {uploadError}
                {enableRetry && retryCount < maxRetries && (
                  <span> Click retry to try again.</span>
                )}
              </Typography>
            </Box>
          </Box>
        </Alert>
      )}

      {/* File preview */}
      {showPreview && selectedFile && !validationError && (
        <Paper sx={{ 
          p: LAYOUT_CONFIG.contentPadding, 
          mb: 2, 
          bgcolor: '#f5f5f5',
          borderRadius: LAYOUT_CONFIG.borderRadius,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <AttachFile sx={{ mr: 1, color: 'text.secondary' }} />
              <Box>
                <Typography variant="body2" fontWeight="medium">
                  {selectedFile.name}
                </Typography>
                <Typography {...TYPOGRAPHY_CONFIG.metadata}>
                  {formatFileSize(selectedFile.size)}
                </Typography>
              </Box>
            </Box>
            {uploadProgress === 100 && (
              <CheckCircle sx={{ color: 'success.main' }} />
            )}
          </Box>

          {/* Upload progress */}
          {uploading && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress variant="determinate" value={uploadProgress} />
              <Typography {...TYPOGRAPHY_CONFIG.metadata} sx={{ mt: 0.5 }}>
                Uploading... {uploadProgress}%
              </Typography>
            </Box>
          )}
        </Paper>
      )}

      {/* Upload button */}
      {selectedFile && !validationError && (
        <Box sx={getButtonGroupStyle()}>
          <Tooltip title="Upload your selected file to complete the task submission. The file will be securely stored and made available for review.">
            <Button
              variant="contained"
              startIcon={uploading || isRetrying ? <Refresh /> : <CloudUpload />}
              onClick={handleUpload}
              disabled={
                disabled || 
                uploading || 
                uploadProgress === 100 || 
                isRetrying || 
                securityValidating ||
                (enableSecurityValidation && !isSecurityReady)
              }
              fullWidth
              sx={getButtonStyle('primary')}
            >
              {securityValidating ? 'Validating...' :
               isRetrying ? 'Retrying...' : 
               uploading ? `Uploading... ${uploadProgress}%` : 
               retryCount > 0 ? `Upload File (Retry ${retryCount})` : 
               'Upload File'}
            </Button>
          </Tooltip>
          {!uploading && !isRetrying && (
            <Tooltip title="Remove the selected file and start over with a different file">
              <Button
                variant="outlined"
                onClick={handleClear}
                disabled={uploading || isRetrying}
              >
                Clear
              </Button>
            </Tooltip>
          )}
        </Box>
      )}

      {/* Success message */}
      <Snackbar
        open={showSuccessMessage}
        autoHideDuration={3000}
        onClose={() => setShowSuccessMessage(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setShowSuccessMessage(false)} 
          severity="success"
          action={
            <IconButton
              size="small"
              aria-label="close"
              color="inherit"
              onClick={() => setShowSuccessMessage(false)}
            >
              <Close fontSize="small" />
            </IconButton>
          }
        >
          File uploaded successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
};

FileUpload.propTypes = {
  onFileSelect: PropTypes.func,
  onUpload: PropTypes.func,
  taskId: PropTypes.string,
  workspaceId: PropTypes.string,
  userRole: PropTypes.string,
  acceptedFormats: PropTypes.string,
  maxSizeMB: PropTypes.number,
  disabled: PropTypes.bool,
  showPreview: PropTypes.bool,
  enableRetry: PropTypes.bool,
  maxRetries: PropTypes.number,
  enableSecurityValidation: PropTypes.bool,
};

export default FileUpload;

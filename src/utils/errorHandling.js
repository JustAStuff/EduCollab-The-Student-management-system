/**
 * Error Handling Utilities
 * 
 * Centralized error handling and validation for task management operations
 */

// Error types for categorization
export const ERROR_TYPES = {
  VALIDATION: 'validation',
  PERMISSION: 'permission',
  NETWORK: 'network',
  STORAGE: 'storage',
  AUTHENTICATION: 'authentication',
  BUSINESS_LOGIC: 'business_logic',
};

// Error codes for specific error scenarios
export const ERROR_CODES = {
  // File validation errors
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  FILE_TYPE_INVALID: 'FILE_TYPE_INVALID',
  FILE_EMPTY: 'FILE_EMPTY',
  FILE_CORRUPTED: 'FILE_CORRUPTED',
  
  // Permission errors
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  NOT_WORKSPACE_MEMBER: 'NOT_WORKSPACE_MEMBER',
  NOT_TASK_ASSIGNEE: 'NOT_TASK_ASSIGNEE',
  NOT_TEAM_LEAD: 'NOT_TEAM_LEAD',
  
  // Task state errors
  INVALID_TASK_STATUS: 'INVALID_TASK_STATUS',
  TASK_ALREADY_COMPLETED: 'TASK_ALREADY_COMPLETED',
  TASK_NOT_SUBMITTED: 'TASK_NOT_SUBMITTED',
  CANNOT_REVIEW_OWN_TASK: 'CANNOT_REVIEW_OWN_TASK',
  
  // Network/Storage errors
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  DOWNLOAD_FAILED: 'DOWNLOAD_FAILED',
  STORAGE_QUOTA_EXCEEDED: 'STORAGE_QUOTA_EXCEEDED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  
  // Authentication errors
  NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
};

/**
 * Custom error class for task management operations
 */
export class TaskManagementError extends Error {
  constructor(message, code, type = ERROR_TYPES.BUSINESS_LOGIC, details = null) {
    super(message);
    this.name = 'TaskManagementError';
    this.code = code;
    this.type = type;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Enhanced file validation with detailed error reporting
 * @param {File} file - File to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result with detailed error information
 */
export const validateFileEnhanced = (file, options = {}) => {
  const {
    maxSizeMB = 10,
    allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
    minSizeBytes = 1,
  } = options;

  if (!file) {
    return {
      isValid: false,
      error: new TaskManagementError(
        'No file selected',
        ERROR_CODES.FILE_EMPTY,
        ERROR_TYPES.VALIDATION
      ),
    };
  }

  // Check file size (minimum)
  if (file.size < minSizeBytes) {
    return {
      isValid: false,
      error: new TaskManagementError(
        'File appears to be empty or corrupted',
        ERROR_CODES.FILE_CORRUPTED,
        ERROR_TYPES.VALIDATION,
        { fileSize: file.size, minSize: minSizeBytes }
      ),
    };
  }

  // Check file size (maximum)
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      error: new TaskManagementError(
        `File size (${formatFileSize(file.size)}) exceeds the maximum limit of ${maxSizeMB}MB`,
        ERROR_CODES.FILE_TOO_LARGE,
        ERROR_TYPES.VALIDATION,
        { fileSize: file.size, maxSize: maxSizeBytes, fileName: file.name }
      ),
    };
  }

  // Check MIME type
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: new TaskManagementError(
        `File type "${file.type}" is not supported. Allowed types: ${allowedTypes.join(', ')}`,
        ERROR_CODES.FILE_TYPE_INVALID,
        ERROR_TYPES.VALIDATION,
        { fileType: file.type, allowedTypes, fileName: file.name }
      ),
    };
  }

  // Check file extension as additional validation
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !allowedExtensions.includes(extension)) {
    return {
      isValid: false,
      error: new TaskManagementError(
        `File extension "${extension}" is not supported. Allowed extensions: ${allowedExtensions.join(', ')}`,
        ERROR_CODES.FILE_TYPE_INVALID,
        ERROR_TYPES.VALIDATION,
        { extension, allowedExtensions, fileName: file.name }
      ),
    };
  }

  return { isValid: true, error: null };
};

/**
 * Format file size in human readable format
 * @param {number} bytes 
 * @returns {string} formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Parse and categorize Supabase errors
 * @param {Error} error - Original error from Supabase
 * @returns {TaskManagementError} Categorized error
 */
export const parseSupabaseError = (error) => {
  if (!error) return null;

  const message = error.message || 'An unknown error occurred';
  
  // Authentication errors
  if (message.includes('JWT') || message.includes('auth') || error.status === 401) {
    return new TaskManagementError(
      'Your session has expired. Please log in again.',
      ERROR_CODES.SESSION_EXPIRED,
      ERROR_TYPES.AUTHENTICATION,
      { originalError: message }
    );
  }

  // Permission errors
  if (message.includes('policy') || message.includes('permission') || error.status === 403) {
    return new TaskManagementError(
      'You do not have permission to perform this action.',
      ERROR_CODES.PERMISSION_DENIED,
      ERROR_TYPES.PERMISSION,
      { originalError: message }
    );
  }

  // Storage errors
  if (message.includes('storage') || message.includes('bucket')) {
    if (message.includes('quota') || message.includes('limit')) {
      return new TaskManagementError(
        'Storage quota exceeded. Please contact your administrator.',
        ERROR_CODES.STORAGE_QUOTA_EXCEEDED,
        ERROR_TYPES.STORAGE,
        { originalError: message }
      );
    }
    return new TaskManagementError(
      'File storage operation failed. Please try again.',
      ERROR_CODES.UPLOAD_FAILED,
      ERROR_TYPES.STORAGE,
      { originalError: message }
    );
  }

  // Network errors
  if (message.includes('network') || message.includes('fetch') || error.status >= 500) {
    return new TaskManagementError(
      'Network error occurred. Please check your connection and try again.',
      ERROR_CODES.NETWORK_ERROR,
      ERROR_TYPES.NETWORK,
      { originalError: message }
    );
  }

  // Default to business logic error
  return new TaskManagementError(
    message,
    'UNKNOWN_ERROR',
    ERROR_TYPES.BUSINESS_LOGIC,
    { originalError: message }
  );
};

/**
 * Get user-friendly error message based on error code
 * @param {TaskManagementError} error 
 * @returns {string} User-friendly error message
 */
export const getUserFriendlyErrorMessage = (error) => {
  if (!(error instanceof TaskManagementError)) {
    return error?.message || 'An unexpected error occurred. Please try again.';
  }

  const errorMessages = {
    [ERROR_CODES.FILE_TOO_LARGE]: 'The selected file is too large. Please choose a smaller file.',
    [ERROR_CODES.FILE_TYPE_INVALID]: 'This file type is not supported. Please select a different file.',
    [ERROR_CODES.FILE_EMPTY]: 'Please select a file to upload.',
    [ERROR_CODES.FILE_CORRUPTED]: 'The selected file appears to be corrupted. Please try a different file.',
    
    [ERROR_CODES.PERMISSION_DENIED]: 'You don\'t have permission to perform this action.',
    [ERROR_CODES.NOT_WORKSPACE_MEMBER]: 'You must be a workspace member to perform this action.',
    [ERROR_CODES.NOT_TASK_ASSIGNEE]: 'You can only modify tasks assigned to you.',
    [ERROR_CODES.NOT_TEAM_LEAD]: 'Only team leads can perform this action.',
    
    [ERROR_CODES.INVALID_TASK_STATUS]: 'This action cannot be performed on a task in this status.',
    [ERROR_CODES.TASK_ALREADY_COMPLETED]: 'This task has already been completed.',
    [ERROR_CODES.TASK_NOT_SUBMITTED]: 'This task has not been submitted yet.',
    [ERROR_CODES.CANNOT_REVIEW_OWN_TASK]: 'You cannot review your own task.',
    
    [ERROR_CODES.UPLOAD_FAILED]: 'File upload failed. Please try again.',
    [ERROR_CODES.DOWNLOAD_FAILED]: 'File download failed. Please try again.',
    [ERROR_CODES.STORAGE_QUOTA_EXCEEDED]: 'Storage limit reached. Please contact your administrator.',
    [ERROR_CODES.NETWORK_ERROR]: 'Connection error. Please check your internet and try again.',
    
    [ERROR_CODES.NOT_AUTHENTICATED]: 'Please log in to continue.',
    [ERROR_CODES.SESSION_EXPIRED]: 'Your session has expired. Please log in again.',
  };

  return errorMessages[error.code] || error.message || 'An unexpected error occurred.';
};

/**
 * Validate task operation permissions with workspace owner support
 * @param {Object} task - Task object
 * @param {string} userId - Current user ID
 * @param {string} operation - Operation to validate
 * @param {string} userWorkspaceRole - User's role in the workspace ('owner', 'member', etc.)
 * @returns {Object} Validation result
 */
export const validateTaskPermissions = (task, userId, operation, userWorkspaceRole = null) => {
  if (!userId) {
    return {
      isValid: false,
      error: new TaskManagementError(
        'You must be logged in to perform this action',
        ERROR_CODES.NOT_AUTHENTICATED,
        ERROR_TYPES.AUTHENTICATION
      ),
    };
  }

  if (!task) {
    return {
      isValid: false,
      error: new TaskManagementError(
        'Task not found',
        ERROR_CODES.INVALID_TASK_STATUS,
        ERROR_TYPES.BUSINESS_LOGIC
      ),
    };
  }

  // Workspace owners have elevated permissions
  const isWorkspaceOwner = userWorkspaceRole === 'owner';

  switch (operation) {
    case 'start':
    case 'upload':
    case 'delete_submission':
    case 'reupload_submission':
      // Only regular members can modify their own submissions
      // Workspace owners cannot modify their own submissions (must go through peer review)
      if (task.assigned_to !== userId) {
        return {
          isValid: false,
          error: new TaskManagementError(
            'You can only modify tasks assigned to you',
            ERROR_CODES.NOT_TASK_ASSIGNEE,
            ERROR_TYPES.PERMISSION,
            { taskId: task.id, assignedTo: task.assigned_to, userId }
          ),
        };
      }
      
      // Workspace owners cannot modify their own submissions
      if (isWorkspaceOwner && task.assigned_to === userId) {
        return {
          isValid: false,
          error: new TaskManagementError(
            'Workspace owners cannot modify their own submissions. Tasks must go through peer review.',
            ERROR_CODES.CANNOT_REVIEW_OWN_TASK,
            ERROR_TYPES.PERMISSION,
            { taskId: task.id, assignedTo: task.assigned_to, userId, userWorkspaceRole }
          ),
        };
      }
      break;

    case 'review':
      // Users cannot review their own tasks, but workspace owners can review any task not assigned to them
      if (task.assigned_to === userId) {
        return {
          isValid: false,
          error: new TaskManagementError(
            'You cannot review your own task',
            ERROR_CODES.CANNOT_REVIEW_OWN_TASK,
            ERROR_TYPES.PERMISSION,
            { taskId: task.id, assignedTo: task.assigned_to, userId }
          ),
        };
      }
      break;

    case 'revoke':
      // Workspace owners can revoke any task assignment in their workspace
      if (isWorkspaceOwner) {
        return { isValid: true, error: null };
      }
      
      // Team leads can revoke tasks they assigned
      if (task.assigned_by === userId) {
        return { isValid: true, error: null };
      }
      
      // Neither workspace owner nor task assigner
      return {
        isValid: false,
        error: new TaskManagementError(
          'Only workspace owners or the team lead who assigned the task can revoke it',
          ERROR_CODES.NOT_TEAM_LEAD,
          ERROR_TYPES.PERMISSION,
          { taskId: task.id, assignedBy: task.assigned_by, userId, userWorkspaceRole }
        ),
      };
      break;
  }

  return { isValid: true, error: null };
};

/**
 * Validate task status for operations with workspace owner support
 * @param {Object} task - Task object
 * @param {string} operation - Operation to validate
 * @param {string} userId - Current user ID
 * @param {string} userWorkspaceRole - User's role in the workspace ('owner', 'member', etc.)
 * @returns {Object} Validation result
 */
export const validateTaskStatus = (task, operation, userId = null, userWorkspaceRole = null) => {
  const validStatusTransitions = {
    start: ['todo', 'needs_revision'],
    upload: ['in_progress', 'needs_revision'],
    delete_submission: ['submitted'],
    reupload_submission: ['submitted'],
    review: ['submitted'],
    revoke: ['todo', 'in_progress', 'submitted', 'needs_revision'], // Cannot revoke completed tasks
    status_change: ['todo', 'in_progress', 'submitted', 'needs_revision'], // General status change operation
  };

  const validStatuses = validStatusTransitions[operation];
  
  // Special handling for workspace owners on their own tasks
  const isWorkspaceOwner = userWorkspaceRole === 'owner';
  const isTaskAssignee = userId && task.assigned_to === userId;
  
  if (isWorkspaceOwner && isTaskAssignee) {
    // Workspace owners can perform most actions on their own tasks with enhanced flexibility
    switch (operation) {
      case 'start':
        // Owners can start/restart their tasks from any status (including completed)
        return { isValid: true, error: null };
        
      case 'upload':
        // Owners can upload to their tasks from any status except completed
        if (task.status === 'completed') {
          return {
            isValid: false,
            error: new TaskManagementError(
              'Cannot upload to a completed task',
              ERROR_CODES.INVALID_TASK_STATUS,
              ERROR_TYPES.BUSINESS_LOGIC,
              { taskId: task.id, currentStatus: task.status, operation }
            ),
          };
        }
        return { isValid: true, error: null };
        
      case 'delete_submission':
      case 'reupload_submission':
        // Workspace owners cannot modify their own submissions - they must go through peer review
        return {
          isValid: false,
          error: new TaskManagementError(
            'Workspace owners cannot modify their own submissions. Tasks must go through peer review.',
            ERROR_CODES.CANNOT_REVIEW_OWN_TASK,
            ERROR_TYPES.PERMISSION,
            { taskId: task.id, currentStatus: task.status, operation }
          ),
        };
        

      case 'status_change':
        // Owners can change status of their tasks from any status (including completed)
        return { isValid: true, error: null };
        
      case 'review':
        // Owners cannot review their own tasks (this should be handled by permission validation)
        return {
          isValid: false,
          error: new TaskManagementError(
            'Workspace owners cannot review their own tasks',
            ERROR_CODES.CANNOT_REVIEW_OWN_TASK,
            ERROR_TYPES.PERMISSION,
            { taskId: task.id, currentStatus: task.status, operation }
          ),
        };
        
      case 'revoke':
        // Workspace owners can revoke tasks from any status except completed
        if (task.status === 'completed') {
          return {
            isValid: false,
            error: new TaskManagementError(
              'Cannot revoke assignments for completed tasks',
              ERROR_CODES.INVALID_TASK_STATUS,
              ERROR_TYPES.BUSINESS_LOGIC,
              { taskId: task.id, currentStatus: task.status, operation }
            ),
          };
        }
        return { isValid: true, error: null };
    }
  }
  
  // Standard validation for non-owners or non-assignees
  if (!validStatuses || !validStatuses.includes(task.status)) {
    const statusMessages = {
      start: 'This task has already been started or completed',
      upload: 'You can only upload files for tasks that are in progress or need revision',
      delete_submission: 'You can only delete submissions for tasks under review',
      reupload_submission: 'You can only re-upload submissions for tasks under review',
      review: 'You can only review tasks that have been submitted',
      revoke: 'You cannot revoke assignments for completed tasks',
      status_change: 'Invalid status transition for this task',
    };

    return {
      isValid: false,
      error: new TaskManagementError(
        statusMessages[operation] || 'This action cannot be performed on a task in this status',
        ERROR_CODES.INVALID_TASK_STATUS,
        ERROR_TYPES.BUSINESS_LOGIC,
        { taskId: task.id, currentStatus: task.status, operation, validStatuses }
      ),
    };
  }

  return { isValid: true, error: null };
};

/**
 * Retry logic for async operations
 * @param {Function} operation - Async operation to retry
 * @param {Object} options - Retry options
 * @returns {Promise} Operation result
 */
export const retryOperation = async (operation, options = {}) => {
  const {
    maxRetries = 3,
    delay = 1000,
    backoffMultiplier = 2,
    shouldRetry = (error) => error.type === ERROR_TYPES.NETWORK || error.code === ERROR_CODES.UPLOAD_FAILED,
  } = options;

  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof TaskManagementError ? error : parseSupabaseError(error);
      
      // Don't retry on the last attempt or if error shouldn't be retried
      if (attempt === maxRetries || !shouldRetry(lastError)) {
        throw lastError;
      }
      
      // Wait before retrying with exponential backoff
      const waitTime = delay * Math.pow(backoffMultiplier, attempt);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError;
};

/**
 * Log errors for debugging and monitoring
 * @param {TaskManagementError} error 
 * @param {Object} context - Additional context
 */
export const logError = (error, context = {}) => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    error: {
      name: error.name,
      message: error.message,
      code: error.code,
      type: error.type,
      details: error.details,
    },
    context,
    userAgent: navigator.userAgent,
    url: window.location.href,
  };

  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    console.error('Task Management Error:', errorLog);
  }

  // In production, you might want to send to an error tracking service
  // Example: Sentry, LogRocket, etc.
};

export default {
  ERROR_TYPES,
  ERROR_CODES,
  TaskManagementError,
  validateFileEnhanced,
  parseSupabaseError,
  getUserFriendlyErrorMessage,
  validateTaskPermissions,
  validateTaskStatus,
  retryOperation,
  logError,
};
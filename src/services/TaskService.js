// src/services/TaskService.js - Task submission management service
import { supabase } from '../supabaseClient';
import { generateFilePath } from '../utils/fileUtils';
import {
  validateTaskPermissions,
  validateTaskStatus,
  parseSupabaseError,
  TaskManagementError,
  ERROR_CODES,
  ERROR_TYPES,
  logError,
  retryOperation,
} from '../utils/errorHandling';
import {
  validateFileServerSide,
  checkUploadRateLimit,
  validateCSRFToken,
  auditLog,
  sanitizeFilename,
  validateWorkspacePermissions,
} from '../utils/securityValidation';

/**
 * Get user's role in a workspace
 * @param {string} userId - User ID
 * @param {string} workspaceId - Workspace ID
 * @returns {Promise<string|null>} User's role or null if not a member
 */
async function getUserWorkspaceRole(userId, workspaceId) {
  try {
    // Check if user is workspace owner
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('created_by')
      .eq('id', workspaceId)
      .single();
    
    if (!workspaceError && workspace && workspace.created_by === userId) {
      return 'owner';
    }
    
    // Check workspace membership
    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .single();
    
    if (!membershipError && membership) {
      return membership.role;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user workspace role:', error);
    return null;
  }
}

/**
 * Validate upload permissions for workspace owners and task assignees
 * @param {string} taskId - Task ID
 * @param {string} userId - User ID
 * @returns {Promise<{isValid: boolean, error?: string}>}
 */
export async function validateUploadPermissions(taskId, userId) {
  try {
    // Get task details
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, workspace_id, assigned_to, status')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return {
        isValid: false,
        error: 'Task not found'
      };
    }

    // Get user's workspace role
    const userWorkspaceRole = await getUserWorkspaceRole(userId, task.workspace_id);
    
    // Workspace owners can upload to any task in their workspace
    if (userWorkspaceRole === 'owner') {
      return { isValid: true };
    }
    
    // Members can only upload to their assigned tasks
    if (task.assigned_to === userId) {
      return { isValid: true };
    }
    
    return { 
      isValid: false, 
      error: 'You can only upload to tasks assigned to you' 
    };
  } catch (error) {
    console.error('Error validating upload permissions:', error);
    return {
      isValid: false,
      error: 'Failed to validate upload permissions'
    };
  }
}

/**
 * Enhanced CSRF token validation with flexible handling
 * @param {string} providedToken - Token provided by client
 * @returns {Promise<boolean>} Whether token is valid
 */
async function validateCSRFTokenEnhanced(providedToken) {
  try {
    let storedToken = sessionStorage.getItem('csrf_token');
    
    // If no stored token exists, generate one
    if (!storedToken) {
      const { generateCSRFToken } = await import('../utils/securityValidation');
      storedToken = generateCSRFToken();
      sessionStorage.setItem('csrf_token', storedToken);
    }
    
    // Use the enhanced validation from securityValidation
    return validateCSRFToken(providedToken, storedToken);
  } catch (error) {
    console.error('Error validating CSRF token:', error);
    return false;
  }
}

/**
 * Delete a task submission and revert task to in_progress status
 * @param {string} taskId - The task ID
 * @param {string} csrfToken - CSRF token for security
 * @returns {Promise<void>}
 */
export async function deleteSubmission(taskId, csrfToken) {
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new TaskManagementError(
        'You must be logged in to delete submissions',
        ERROR_CODES.NOT_AUTHENTICATED,
        ERROR_TYPES.AUTHENTICATION
      );
    }

    // Validate CSRF token with enhanced handling
    const isValidToken = await validateCSRFTokenEnhanced(csrfToken);
    if (!isValidToken) {
      throw new TaskManagementError(
        'Invalid security token. Please refresh the page and try again.',
        ERROR_CODES.PERMISSION_DENIED,
        ERROR_TYPES.SECURITY
      );
    }

    // Get task to validate permissions and status
    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('submission_file_url, submission_file_name, submission_file_size, status, assigned_to, workspace_id')
      .eq('id', taskId)
      .single();

    if (fetchError) {
      throw parseSupabaseError(fetchError);
    }

    if (!task) {
      throw new TaskManagementError(
        'Task not found',
        ERROR_CODES.INVALID_TASK_STATUS,
        ERROR_TYPES.BUSINESS_LOGIC
      );
    }

    // Get user's workspace role
    const userWorkspaceRole = await getUserWorkspaceRole(user.id, task.workspace_id);
    
    // Ensure only task assignees can delete submissions (not workspace owners)
    if (task.assigned_to !== user.id) {
      throw new TaskManagementError(
        'Only the task assignee can delete submissions',
        ERROR_CODES.NOT_TASK_ASSIGNEE,
        ERROR_TYPES.PERMISSION
      );
    }
    
    // Workspace owners cannot delete their own submissions
    if (userWorkspaceRole === 'owner') {
      throw new TaskManagementError(
        'Workspace owners cannot modify their own submissions. Tasks must go through peer review.',
        ERROR_CODES.CANNOT_REVIEW_OWN_TASK,
        ERROR_TYPES.PERMISSION
      );
    }
    
    // Validate permissions
    const deletePermissionCheck = validateTaskPermissions(task, user.id, 'delete_submission', userWorkspaceRole);
    if (!deletePermissionCheck.isValid) {
      throw deletePermissionCheck.error;
    }

    // Validate task status
    const statusCheck = validateTaskStatus(task, 'delete_submission', user.id, userWorkspaceRole);
    if (!statusCheck.isValid) {
      throw statusCheck.error;
    }

    // Delete file from storage if it exists
    if (task.submission_file_url) {
      const { error: storageError } = await supabase.storage
        .from('task-submissions')
        .remove([task.submission_file_url]);

      if (storageError) {
        logError(parseSupabaseError(storageError), {
          operation: 'delete_submission_file',
          taskId,
          filePath: task.submission_file_url,
        });
        // Continue with database update even if storage deletion fails
      }
    }

    // Update task status and clear submission fields
    const { error: updateError } = await supabase
      .from('tasks')
      .update({
        status: 'in_progress',
        submission_file_url: null,
        submission_file_name: null,
        submission_file_size: null,
        submitted_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId);

    if (updateError) {
      throw parseSupabaseError(updateError);
    }

    // Audit log the deletion
    await auditLog('submission_delete', {
      taskId,
      workspaceId: task.workspace_id,
      fileName: task.submission_file_name,
      fileSize: task.submission_file_size
    }, user.id);

    return { success: true };
  } catch (error) {
    if (error instanceof TaskManagementError) {
      throw error;
    }
    
    const taskError = parseSupabaseError(error);
    logError(taskError, {
      operation: 'delete_submission',
      taskId,
    });
    throw taskError;
  }
}

/**
 * Re-upload a task submission with a new file
 * @param {string} taskId - The task ID
 * @param {File} file - The new file to upload
 * @param {string} workspaceId - The workspace ID
 * @param {string} csrfToken - CSRF token for security
 * @returns {Promise<void>}
 */
export async function reuploadSubmission(taskId, file, workspaceId, csrfToken) {
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new TaskManagementError(
        'You must be logged in to re-upload submissions',
        ERROR_CODES.NOT_AUTHENTICATED,
        ERROR_TYPES.AUTHENTICATION
      );
    }

    // Validate CSRF token with enhanced handling
    const isValidToken = await validateCSRFTokenEnhanced(csrfToken);
    if (!isValidToken) {
      throw new TaskManagementError(
        'Invalid security token. Please refresh the page and try again.',
        ERROR_CODES.PERMISSION_DENIED,
        ERROR_TYPES.SECURITY
      );
    }

    // Check rate limiting
    if (!checkUploadRateLimit(user.id)) {
      throw new TaskManagementError(
        'Upload rate limit exceeded. Please wait before uploading again.',
        ERROR_CODES.RATE_LIMIT_EXCEEDED,
        ERROR_TYPES.RATE_LIMIT
      );
    }

    // Enhanced server-side file validation
    const validation = await validateFileServerSide(file, {
      maxSizeMB: 10,
      checkSignature: true,
      scanForMalware: true
    });
    if (!validation.isValid) {
      throw new TaskManagementError(
        validation.error,
        ERROR_CODES.INVALID_FILE,
        ERROR_TYPES.VALIDATION
      );
    }

    // Validate workspace permissions
    const workspacePermissionCheck = await validateWorkspacePermissions(workspaceId, user.id, 'upload');
    if (!workspacePermissionCheck.isValid) {
      throw new TaskManagementError(
        workspacePermissionCheck.error,
        ERROR_CODES.PERMISSION_DENIED,
        ERROR_TYPES.PERMISSION
      );
    }

    // Get current task and submission
    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('submission_file_url, status, assigned_to, workspace_id')
      .eq('id', taskId)
      .single();

    if (fetchError) {
      throw parseSupabaseError(fetchError);
    }

    if (!task) {
      throw new TaskManagementError(
        'Task not found',
        ERROR_CODES.INVALID_TASK_STATUS,
        ERROR_TYPES.BUSINESS_LOGIC
      );
    }

    // Get user's workspace role
    const userWorkspaceRole = await getUserWorkspaceRole(user.id, task.workspace_id);
    
    // Ensure only task assignees can re-upload (not workspace owners)
    if (task.assigned_to !== user.id) {
      throw new TaskManagementError(
        'Only the task assignee can re-upload submissions',
        ERROR_CODES.NOT_TASK_ASSIGNEE,
        ERROR_TYPES.PERMISSION
      );
    }
    
    // Workspace owners cannot re-upload their own submissions
    if (userWorkspaceRole === 'owner') {
      throw new TaskManagementError(
        'Workspace owners cannot modify their own submissions. Tasks must go through peer review.',
        ERROR_CODES.CANNOT_REVIEW_OWN_TASK,
        ERROR_TYPES.PERMISSION
      );
    }
    
    // Validate permissions
    const reuploadPermissionCheck = validateTaskPermissions(task, user.id, 'reupload_submission', userWorkspaceRole);
    if (!reuploadPermissionCheck.isValid) {
      throw reuploadPermissionCheck.error;
    }

    // Validate task status
    const statusCheck = validateTaskStatus(task, 'reupload_submission', user.id, userWorkspaceRole);
    if (!statusCheck.isValid) {
      throw statusCheck.error;
    }

    // Use retry logic for the upload operation
    const uploadOperation = async () => {
      // Delete old file from storage if it exists
      if (task.submission_file_url) {
        const { error: deleteError } = await supabase.storage
          .from('task-submissions')
          .remove([task.submission_file_url]);

        if (deleteError) {
          logError(parseSupabaseError(deleteError), {
            operation: 'delete_old_file',
            taskId,
            filePath: task.submission_file_url,
          });
          // Continue with upload even if deletion fails
        }
      }

      // Sanitize filename and generate new file path
      const sanitizedName = sanitizeFilename(file.name);
      const fileName = generateFilePath(workspaceId, taskId, user.id, sanitizedName);

      // Upload new file with metadata
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('task-submissions')
        .upload(fileName, file, {
          metadata: {
            size: file.size.toString(),
            type: file.type,
            originalName: file.name,
            uploadedBy: user.id,
            taskId: taskId,
            workspaceId: workspaceId
          }
        });

      if (uploadError) {
        if (uploadError.message.includes('duplicate')) {
          throw new TaskManagementError(
            'A file with this name already exists. Please try again.',
            ERROR_CODES.UPLOAD_FAILED,
            ERROR_TYPES.STORAGE
          );
        } else if (uploadError.message.includes('policy')) {
          throw new TaskManagementError(
            'You do not have permission to upload files for this task.',
            ERROR_CODES.PERMISSION_DENIED,
            ERROR_TYPES.PERMISSION
          );
        } else {
          throw parseSupabaseError(uploadError);
        }
      }

      // Update task with new file information
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          submission_file_url: uploadData.path,
          submission_file_name: sanitizedName,
          submission_file_size: file.size,
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (updateError) {
        throw parseSupabaseError(updateError);
      }

      // Audit log the re-upload
      await auditLog('file_reupload', {
        taskId,
        workspaceId,
        fileName: sanitizedName,
        fileSize: file.size,
        fileType: file.type
      }, user.id);

      return uploadData;
    };

    // Execute with retry logic
    await retryOperation(uploadOperation, {
      maxRetries: 3,
      delay: 1000,
      shouldRetry: (error) => error.type === ERROR_TYPES.NETWORK || error.code === ERROR_CODES.UPLOAD_FAILED,
    });

    return { success: true };
  } catch (error) {
    if (error instanceof TaskManagementError) {
      throw error;
    }
    
    const taskError = parseSupabaseError(error);
    logError(taskError, {
      operation: 'reupload_submission',
      taskId,
      fileName: file?.name,
      fileSize: file?.size,
    });
    throw taskError;
  }
}

/**
 * Get all workspace submissions for display in dashboard
 * @param {string} workspaceId - The workspace ID
 * @returns {Promise<Array>} Array of submission objects
 */
export async function getWorkspaceSubmissions(workspaceId) {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        submission_file_url,
        submission_file_name,
        submission_file_size,
        submitted_at,
        status,
        assigned_to
      `)
      .eq('workspace_id', workspaceId)
      .not('submission_file_url', 'is', null)
      .order('submitted_at', { ascending: false });

    if (error) throw error;

    // Fetch user details for each task
    const tasksWithUsers = [];
    if (data && data.length > 0) {
      for (const task of data) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('full_name, email')
          .eq('id', task.assigned_to)
          .single();

        tasksWithUsers.push({
          id: task.id,
          task_id: task.id,
          workspace_id: workspaceId,
          submitted_by: task.assigned_to,
          submitter_name: userData?.full_name || userData?.email || 'Unknown',
          task_title: task.title,
          file_url: task.submission_file_url,
          file_name: task.submission_file_name,
          file_size: task.submission_file_size,
          submitted_at: task.submitted_at,
          status: task.status === 'completed' ? 'approved' : 
                  task.status === 'needs_revision' ? 'needs_revision' : 'under_review'
        });
      }
    }

    return tasksWithUsers;
  } catch (error) {
    console.error('Error fetching workspace submissions:', error);
    throw error;
  }
}

/**
 * Revoke a task assignment from a member
 * @param {string} taskId - The task ID
 * @param {string} csrfToken - CSRF token for security
 * @returns {Promise<void>}
 */
export async function revokeTaskAssignment(taskId, csrfToken) {
  try {
    // Get current user to verify they are the TL
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new TaskManagementError(
        'You must be logged in to revoke task assignments',
        ERROR_CODES.NOT_AUTHENTICATED,
        ERROR_TYPES.AUTHENTICATION
      );
    }

    // Validate CSRF token with enhanced handling
    const isValidToken = await validateCSRFTokenEnhanced(csrfToken);
    if (!isValidToken) {
      throw new TaskManagementError(
        'Invalid security token. Please refresh the page and try again.',
        ERROR_CODES.PERMISSION_DENIED,
        ERROR_TYPES.SECURITY
      );
    }

    // Get task details to verify permissions
    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('workspace_id, assigned_by, assigned_to, status')
      .eq('id', taskId)
      .single();

    if (fetchError) {
      throw parseSupabaseError(fetchError);
    }

    if (!task) {
      throw new TaskManagementError(
        'Task not found',
        ERROR_CODES.INVALID_TASK_STATUS,
        ERROR_TYPES.BUSINESS_LOGIC
      );
    }

    // Get user's workspace role
    const userWorkspaceRole = await getUserWorkspaceRole(user.id, task.workspace_id);
    
    // Validate permissions
    const revokePermissionCheck = validateTaskPermissions(task, user.id, 'revoke', userWorkspaceRole);
    if (!revokePermissionCheck.isValid) {
      throw revokePermissionCheck.error;
    }

    // Validate task status
    const statusCheck = validateTaskStatus(task, 'revoke', user.id, userWorkspaceRole);
    if (!statusCheck.isValid) {
      throw statusCheck.error;
    }

    // Update task to unassign it (set assigned_to to null)
    const { error: updateError } = await supabase
      .from('tasks')
      .update({
        assigned_to: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId);

    if (updateError) {
      throw parseSupabaseError(updateError);
    }

    // Audit log the revocation
    await auditLog('task_revocation', {
      taskId,
      workspaceId: task.workspace_id,
      previousAssignee: task.assigned_to,
      revokedBy: user.id
    }, user.id);

    return { success: true };
  } catch (error) {
    if (error instanceof TaskManagementError) {
      throw error;
    }
    
    const taskError = parseSupabaseError(error);
    logError(taskError, {
      operation: 'revoke_task_assignment',
      taskId,
    });
    throw taskError;
  }
}

/**
 * Change task status (enhanced for workspace owners)
 * @param {string} taskId - The task ID
 * @param {string} newStatus - The new status to set
 * @param {string} csrfToken - CSRF token for security
 * @returns {Promise<void>}
 */
export async function changeTaskStatus(taskId, newStatus, csrfToken) {
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new TaskManagementError(
        'You must be logged in to change task status',
        ERROR_CODES.NOT_AUTHENTICATED,
        ERROR_TYPES.AUTHENTICATION
      );
    }

    // Validate CSRF token with enhanced handling
    const isValidToken = await validateCSRFTokenEnhanced(csrfToken);
    if (!isValidToken) {
      throw new TaskManagementError(
        'Invalid security token. Please refresh the page and try again.',
        ERROR_CODES.PERMISSION_DENIED,
        ERROR_TYPES.SECURITY
      );
    }

    // Validate new status
    const validStatuses = ['todo', 'in_progress', 'submitted', 'needs_revision', 'completed'];
    if (!validStatuses.includes(newStatus)) {
      throw new TaskManagementError(
        `Invalid status: ${newStatus}`,
        ERROR_CODES.INVALID_TASK_STATUS,
        ERROR_TYPES.VALIDATION
      );
    }

    // Get task to validate permissions and current status
    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('status, assigned_to, workspace_id, submission_file_url')
      .eq('id', taskId)
      .single();

    if (fetchError) {
      throw parseSupabaseError(fetchError);
    }

    if (!task) {
      throw new TaskManagementError(
        'Task not found',
        ERROR_CODES.INVALID_TASK_STATUS,
        ERROR_TYPES.BUSINESS_LOGIC
      );
    }

    // Get user's workspace role
    const userWorkspaceRole = await getUserWorkspaceRole(user.id, task.workspace_id);
    
    // Validate permissions for status change
    const statusChangePermissionCheck = validateTaskPermissions(task, user.id, 'status_change', userWorkspaceRole);
    if (!statusChangePermissionCheck.isValid) {
      throw statusChangePermissionCheck.error;
    }

    // Validate the status transition
    const statusCheck = validateTaskStatus(task, 'status_change', user.id, userWorkspaceRole);
    if (!statusCheck.isValid) {
      throw statusCheck.error;
    }

    // Prevent workspace owners from marking their own tasks as completed
    // Tasks must be reviewed and approved by teammates
    if (newStatus === 'completed' && task.assigned_to === user.id) {
      throw new TaskManagementError(
        'You cannot mark your own task as completed. Tasks must be reviewed and approved by teammates.',
        ERROR_CODES.CANNOT_REVIEW_OWN_TASK,
        ERROR_TYPES.PERMISSION
      );
    }

    // Prepare update data based on new status
    const updateData = {
      status: newStatus,
      updated_at: new Date().toISOString()
    };

    // Add timestamp fields based on status
    switch (newStatus) {
      case 'in_progress':
        updateData.started_at = new Date().toISOString();
        break;
      case 'submitted':
        updateData.submitted_at = new Date().toISOString();
        break;
      case 'completed':
        updateData.completed_at = new Date().toISOString();
        updateData.reviewed_at = new Date().toISOString();
        updateData.reviewed_by = user.id;
        break;
      case 'needs_revision':
        // Clear completion timestamps if reverting from completed
        updateData.completed_at = null;
        updateData.reviewed_at = null;
        updateData.reviewed_by = null;
        break;
    }

    // Special validation for certain status changes
    if (newStatus === 'submitted' && !task.submission_file_url) {
      throw new TaskManagementError(
        'Cannot mark task as submitted without a file upload',
        ERROR_CODES.TASK_NOT_SUBMITTED,
        ERROR_TYPES.BUSINESS_LOGIC
      );
    }

    // Update task status
    const { error: updateError } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId);

    if (updateError) {
      throw parseSupabaseError(updateError);
    }

    // Audit log the status change
    await auditLog('task_status_change', {
      taskId,
      workspaceId: task.workspace_id,
      oldStatus: task.status,
      newStatus: newStatus,
      changedBy: user.id
    }, user.id);

    return { success: true };
  } catch (error) {
    if (error instanceof TaskManagementError) {
      throw error;
    }
    
    const taskError = parseSupabaseError(error);
    logError(taskError, {
      operation: 'change_task_status',
      taskId,
      newStatus,
    });
    throw taskError;
  }
}

/**
 * Start a task (change status from 'todo' to 'in_progress')
 * @param {string} taskId - The task ID
 * @param {string} csrfToken - CSRF token for security
 * @returns {Promise<void>}
 */
export async function startTask(taskId, csrfToken) {
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new TaskManagementError(
        'You must be logged in to start tasks',
        ERROR_CODES.NOT_AUTHENTICATED,
        ERROR_TYPES.AUTHENTICATION
      );
    }

    // Validate CSRF token with enhanced handling
    const isValidToken = await validateCSRFTokenEnhanced(csrfToken);
    if (!isValidToken) {
      throw new TaskManagementError(
        'Invalid security token. Please refresh the page and try again.',
        ERROR_CODES.PERMISSION_DENIED,
        ERROR_TYPES.SECURITY
      );
    }

    // Get task to validate permissions and status
    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('status, assigned_to, workspace_id')
      .eq('id', taskId)
      .single();

    if (fetchError) {
      throw parseSupabaseError(fetchError);
    }

    if (!task) {
      throw new TaskManagementError(
        'Task not found',
        ERROR_CODES.INVALID_TASK_STATUS,
        ERROR_TYPES.BUSINESS_LOGIC
      );
    }

    // Get user's workspace role
    const userWorkspaceRole = await getUserWorkspaceRole(user.id, task.workspace_id);
    
    // Validate permissions
    const startPermissionCheck = validateTaskPermissions(task, user.id, 'start', userWorkspaceRole);
    if (!startPermissionCheck.isValid) {
      throw startPermissionCheck.error;
    }

    // Validate task status
    const statusCheck = validateTaskStatus(task, 'start', user.id, userWorkspaceRole);
    if (!statusCheck.isValid) {
      throw statusCheck.error;
    }

    // Update task status to in_progress
    const { error: updateError } = await supabase
      .from('tasks')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId);

    if (updateError) {
      throw parseSupabaseError(updateError);
    }

    // Audit log the task start
    await auditLog('task_start', {
      taskId,
      workspaceId: task.workspace_id,
      startedBy: user.id
    }, user.id);

    return { success: true };
  } catch (error) {
    if (error instanceof TaskManagementError) {
      throw error;
    }
    
    const taskError = parseSupabaseError(error);
    logError(taskError, {
      operation: 'start_task',
      taskId,
    });
    throw taskError;
  }
}

/**
 * Upload a file for a task
 * @param {string} taskId - The task ID
 * @param {File} file - The file to upload
 * @param {string} workspaceId - The workspace ID
 * @param {string} csrfToken - CSRF token for security
 * @returns {Promise<void>}
 */
export async function uploadTaskFile(taskId, file, workspaceId, csrfToken) {
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new TaskManagementError(
        'You must be logged in to upload files',
        ERROR_CODES.NOT_AUTHENTICATED,
        ERROR_TYPES.AUTHENTICATION
      );
    }

    // Validate CSRF token with enhanced handling
    const isValidToken = await validateCSRFTokenEnhanced(csrfToken);
    if (!isValidToken) {
      throw new TaskManagementError(
        'Invalid security token. Please refresh the page and try again.',
        ERROR_CODES.PERMISSION_DENIED,
        ERROR_TYPES.SECURITY
      );
    }

    // Check rate limiting
    if (!checkUploadRateLimit(user.id)) {
      throw new TaskManagementError(
        'Upload rate limit exceeded. Please wait before uploading again.',
        ERROR_CODES.RATE_LIMIT_EXCEEDED,
        ERROR_TYPES.RATE_LIMIT
      );
    }

    // Enhanced server-side file validation
    const validation = await validateFileServerSide(file, {
      maxSizeMB: 10,
      checkSignature: true,
      scanForMalware: true
    });
    if (!validation.isValid) {
      throw new TaskManagementError(
        validation.error,
        ERROR_CODES.INVALID_FILE,
        ERROR_TYPES.VALIDATION
      );
    }

    // Validate workspace permissions
    const workspacePermissionCheck = await validateWorkspacePermissions(workspaceId, user.id, 'upload');
    if (!workspacePermissionCheck.isValid) {
      throw new TaskManagementError(
        workspacePermissionCheck.error,
        ERROR_CODES.PERMISSION_DENIED,
        ERROR_TYPES.PERMISSION
      );
    }

    // Get task to validate permissions and status
    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('status, assigned_to, workspace_id')
      .eq('id', taskId)
      .single();

    if (fetchError) {
      throw parseSupabaseError(fetchError);
    }

    if (!task) {
      throw new TaskManagementError(
        'Task not found',
        ERROR_CODES.INVALID_TASK_STATUS,
        ERROR_TYPES.BUSINESS_LOGIC
      );
    }

    // Get user's workspace role
    const userWorkspaceRole = await getUserWorkspaceRole(user.id, task.workspace_id);
    
    // Validate permissions
    const uploadPermissionCheck = validateTaskPermissions(task, user.id, 'upload', userWorkspaceRole);
    if (!uploadPermissionCheck.isValid) {
      throw uploadPermissionCheck.error;
    }

    // Validate task status
    const statusCheck = validateTaskStatus(task, 'upload', user.id, userWorkspaceRole);
    if (!statusCheck.isValid) {
      throw statusCheck.error;
    }

    // Use retry logic for the upload operation
    const uploadOperation = async () => {
      // Sanitize filename and generate file path
      const sanitizedName = sanitizeFilename(file.name);
      const fileName = generateFilePath(workspaceId, taskId, user.id, sanitizedName);

      // Upload file with metadata
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('task-submissions')
        .upload(fileName, file, {
          metadata: {
            size: file.size.toString(),
            type: file.type,
            originalName: file.name,
            uploadedBy: user.id,
            taskId: taskId,
            workspaceId: workspaceId
          }
        });

      if (uploadError) {
        if (uploadError.message.includes('duplicate')) {
          throw new TaskManagementError(
            'A file with this name already exists. Please try again.',
            ERROR_CODES.UPLOAD_FAILED,
            ERROR_TYPES.STORAGE
          );
        } else if (uploadError.message.includes('policy')) {
          throw new TaskManagementError(
            'You do not have permission to upload files for this task.',
            ERROR_CODES.PERMISSION_DENIED,
            ERROR_TYPES.PERMISSION
          );
        } else {
          throw parseSupabaseError(uploadError);
        }
      }

      // Update task with file information and set status to submitted
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          submission_file_url: uploadData.path,
          submission_file_name: sanitizedName,
          submission_file_size: file.size,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (updateError) {
        throw parseSupabaseError(updateError);
      }

      // Audit log the upload
      await auditLog('file_upload', {
        taskId,
        workspaceId,
        fileName: sanitizedName,
        fileSize: file.size,
        fileType: file.type
      }, user.id);

      return uploadData;
    };

    // Execute with retry logic
    await retryOperation(uploadOperation, {
      maxRetries: 3,
      delay: 1000,
      shouldRetry: (error) => error.type === ERROR_TYPES.NETWORK || error.code === ERROR_CODES.UPLOAD_FAILED,
    });

    return { success: true };
  } catch (error) {
    if (error instanceof TaskManagementError) {
      throw error;
    }
    
    const taskError = parseSupabaseError(error);
    logError(taskError, {
      operation: 'upload_task_file',
      taskId,
      fileName: file?.name,
      fileSize: file?.size,
    });
    throw taskError;
  }
}

/**
 * Get tasks assigned to a Team Lead (TL)
 * @param {string} workspaceId - The workspace ID
 * @param {string} userId - The TL's user ID
 * @returns {Promise<Array>} Array of task objects
 */
export async function getTLTasks(workspaceId, userId) {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        status,
        assigned_to,
        assigned_by,
        created_at,
        updated_at,
        started_at,
        submitted_at,
        reviewed_at,
        completed_at,
        reviewed_by,
        review_comments,
        submission_file_url,
        submission_file_name,
        submission_file_size
      `)
      .eq('workspace_id', workspaceId)
      .eq('assigned_to', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(task => ({
      ...task,
      can_modify_submission: task.status === 'submitted'
    }));
  } catch (error) {
    console.error('Error fetching TL tasks:', error);
    throw error;
  }
}

/**
 * Submit a review for a task (approve or request redo)
 * @param {string} taskId - The task ID
 * @param {string} action - 'approve' or 'request_redo'
 * @param {string} comments - Optional comments for the review
 * @returns {Promise<void>}
 */
export async function submitReview(taskId, action, comments = null) {
  try {
    // Validate action
    if (!['approve', 'request_redo'].includes(action)) {
      throw new TaskManagementError(
        'Invalid review action. Must be "approve" or "request_redo"',
        ERROR_CODES.INVALID_TASK_STATUS,
        ERROR_TYPES.VALIDATION
      );
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new TaskManagementError(
        'You must be logged in to submit reviews',
        ERROR_CODES.NOT_AUTHENTICATED,
        ERROR_TYPES.AUTHENTICATION
      );
    }

    // Get task details to verify it can be reviewed
    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('status, assigned_to, workspace_id')
      .eq('id', taskId)
      .single();

    if (fetchError) {
      throw parseSupabaseError(fetchError);
    }

    if (!task) {
      throw new TaskManagementError(
        'Task not found',
        ERROR_CODES.INVALID_TASK_STATUS,
        ERROR_TYPES.BUSINESS_LOGIC
      );
    }

    // Get user's workspace role
    const userWorkspaceRole = await getUserWorkspaceRole(user.id, task.workspace_id);
    
    // Validate permissions
    const reviewPermissionCheck = validateTaskPermissions(task, user.id, 'review', userWorkspaceRole);
    if (!reviewPermissionCheck.isValid) {
      throw reviewPermissionCheck.error;
    }

    // Validate task status
    const statusCheck = validateTaskStatus(task, 'review', user.id, userWorkspaceRole);
    if (!statusCheck.isValid) {
      throw statusCheck.error;
    }

    // Verify user is a member of the workspace OR the workspace owner
    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', task.workspace_id)
      .eq('user_id', user.id)
      .single();

    // Also check if user is the workspace owner
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('created_by')
      .eq('id', task.workspace_id)
      .single();

    const isWorkspaceOwner = workspace && workspace.created_by === user.id;
    const isWorkspaceMember = membership && !membershipError;

    if (!isWorkspaceOwner && !isWorkspaceMember) {
      throw new TaskManagementError(
        'You must be a workspace member or owner to review tasks',
        ERROR_CODES.NOT_WORKSPACE_MEMBER,
        ERROR_TYPES.PERMISSION
      );
    }

    // Insert review record
    const { error: reviewError } = await supabase
      .from('task_reviews')
      .insert({
        task_id: taskId,
        reviewer_id: user.id,
        action,
        comments
      });

    if (reviewError) {
      throw parseSupabaseError(reviewError);
    }

    // Update task status based on review action
    const newStatus = action === 'approve' ? 'completed' : 'needs_revision';
    const updateData = {
      status: newStatus,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      review_comments: comments,
      updated_at: new Date().toISOString()
    };

    if (newStatus === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId);

    if (updateError) {
      throw parseSupabaseError(updateError);
    }

    return { success: true };
  } catch (error) {
    if (error instanceof TaskManagementError) {
      throw error;
    }
    
    const taskError = parseSupabaseError(error);
    logError(taskError, {
      operation: 'submit_review',
      taskId,
      action,
    });
    throw taskError;
  }
}

export default {
  changeTaskStatus,
  startTask,
  uploadTaskFile,
  deleteSubmission,
  reuploadSubmission,
  getWorkspaceSubmissions,
  revokeTaskAssignment,
  getTLTasks,
  submitReview
};

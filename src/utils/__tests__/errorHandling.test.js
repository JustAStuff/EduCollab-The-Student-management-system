import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ERROR_TYPES,
  ERROR_CODES,
  TaskManagementError,
  validateFileEnhanced,
  parseSupabaseError,
  getUserFriendlyErrorMessage,
  validateTaskPermissions,
  validateTaskStatus,
  retryOperation,
} from '../errorHandling';

describe('Error Handling Utilities', () => {
  describe('TaskManagementError', () => {
    it('should create error with all properties', () => {
      const error = new TaskManagementError(
        'Test error',
        ERROR_CODES.FILE_TOO_LARGE,
        ERROR_TYPES.VALIDATION,
        { fileSize: 1000 }
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ERROR_CODES.FILE_TOO_LARGE);
      expect(error.type).toBe(ERROR_TYPES.VALIDATION);
      expect(error.details).toEqual({ fileSize: 1000 });
      expect(error.timestamp).toBeDefined();
      expect(error.name).toBe('TaskManagementError');
    });

    it('should use default type when not provided', () => {
      const error = new TaskManagementError('Test error', ERROR_CODES.FILE_TOO_LARGE);
      expect(error.type).toBe(ERROR_TYPES.BUSINESS_LOGIC);
    });
  });

  describe('validateFileEnhanced', () => {
    it('should validate file successfully', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const result = validateFileEnhanced(file);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should reject null file', () => {
      const result = validateFileEnhanced(null);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeInstanceOf(TaskManagementError);
      expect(result.error.code).toBe(ERROR_CODES.FILE_EMPTY);
    });

    it('should reject file that is too large', () => {
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });
      const result = validateFileEnhanced(largeFile, { maxSizeMB: 10 });

      expect(result.isValid).toBe(false);
      expect(result.error).toBeInstanceOf(TaskManagementError);
      expect(result.error.code).toBe(ERROR_CODES.FILE_TOO_LARGE);
      expect(result.error.details.fileSize).toBe(largeFile.size);
    });

    it('should reject file with invalid MIME type', () => {
      const invalidFile = new File(['content'], 'test.exe', { type: 'application/x-msdownload' });
      const result = validateFileEnhanced(invalidFile);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeInstanceOf(TaskManagementError);
      expect(result.error.code).toBe(ERROR_CODES.FILE_TYPE_INVALID);
    });

    it('should reject file with invalid extension', () => {
      const invalidFile = new File(['content'], 'test.exe', { type: 'application/pdf' });
      const result = validateFileEnhanced(invalidFile);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeInstanceOf(TaskManagementError);
      expect(result.error.code).toBe(ERROR_CODES.FILE_TYPE_INVALID);
    });

    it('should reject empty file', () => {
      const emptyFile = new File([], 'empty.pdf', { type: 'application/pdf' });
      const result = validateFileEnhanced(emptyFile);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeInstanceOf(TaskManagementError);
      expect(result.error.code).toBe(ERROR_CODES.FILE_CORRUPTED);
    });

    it('should use custom validation options', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const result = validateFileEnhanced(file, {
        maxSizeMB: 0.001, // Very small limit
        allowedTypes: ['image/jpeg'], // PDF not allowed
        allowedExtensions: ['jpg'],
      });

      expect(result.isValid).toBe(false);
      // Should fail on file type first, then size
      expect(result.error.code).toBe(ERROR_CODES.FILE_TYPE_INVALID);
    });
  });

  describe('parseSupabaseError', () => {
    it('should parse authentication error', () => {
      const supabaseError = { message: 'JWT expired', status: 401 };
      const result = parseSupabaseError(supabaseError);

      expect(result).toBeInstanceOf(TaskManagementError);
      expect(result.code).toBe(ERROR_CODES.SESSION_EXPIRED);
      expect(result.type).toBe(ERROR_TYPES.AUTHENTICATION);
    });

    it('should parse permission error', () => {
      const supabaseError = { message: 'policy violation', status: 403 };
      const result = parseSupabaseError(supabaseError);

      expect(result).toBeInstanceOf(TaskManagementError);
      expect(result.code).toBe(ERROR_CODES.PERMISSION_DENIED);
      expect(result.type).toBe(ERROR_TYPES.PERMISSION);
    });

    it('should parse storage error', () => {
      const supabaseError = { message: 'storage quota exceeded' };
      const result = parseSupabaseError(supabaseError);

      expect(result).toBeInstanceOf(TaskManagementError);
      expect(result.code).toBe(ERROR_CODES.STORAGE_QUOTA_EXCEEDED);
      expect(result.type).toBe(ERROR_TYPES.STORAGE);
    });

    it('should parse network error', () => {
      const supabaseError = { message: 'network error', status: 500 };
      const result = parseSupabaseError(supabaseError);

      expect(result).toBeInstanceOf(TaskManagementError);
      expect(result.code).toBe(ERROR_CODES.NETWORK_ERROR);
      expect(result.type).toBe(ERROR_TYPES.NETWORK);
    });

    it('should handle unknown error', () => {
      const supabaseError = { message: 'unknown error' };
      const result = parseSupabaseError(supabaseError);

      expect(result).toBeInstanceOf(TaskManagementError);
      expect(result.type).toBe(ERROR_TYPES.BUSINESS_LOGIC);
    });

    it('should return null for null error', () => {
      const result = parseSupabaseError(null);
      expect(result).toBeNull();
    });
  });

  describe('getUserFriendlyErrorMessage', () => {
    it('should return user-friendly message for known error codes', () => {
      const error = new TaskManagementError('Technical error', ERROR_CODES.FILE_TOO_LARGE);
      const message = getUserFriendlyErrorMessage(error);

      expect(message).toBe('The selected file is too large. Please choose a smaller file.');
    });

    it('should return original message for unknown error codes', () => {
      const error = new TaskManagementError('Custom error', 'UNKNOWN_CODE');
      const message = getUserFriendlyErrorMessage(error);

      expect(message).toBe('Custom error');
    });

    it('should handle non-TaskManagementError', () => {
      const error = new Error('Regular error');
      const message = getUserFriendlyErrorMessage(error);

      expect(message).toBe('Regular error');
    });

    it('should handle null error', () => {
      const message = getUserFriendlyErrorMessage(null);
      expect(message).toBe('An unexpected error occurred. Please try again.');
    });
  });

  describe('validateTaskPermissions', () => {
    const mockTask = {
      id: 'task-1',
      assigned_to: 'user-1',
      assigned_by: 'user-2',
    };

    it('should validate permissions for task assignee', () => {
      const result = validateTaskPermissions(mockTask, 'user-1', 'start');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should reject operation by non-assignee', () => {
      const result = validateTaskPermissions(mockTask, 'user-3', 'start');

      expect(result.isValid).toBe(false);
      expect(result.error).toBeInstanceOf(TaskManagementError);
      expect(result.error.code).toBe(ERROR_CODES.NOT_TASK_ASSIGNEE);
    });

    it('should reject self-review', () => {
      const result = validateTaskPermissions(mockTask, 'user-1', 'review');

      expect(result.isValid).toBe(false);
      expect(result.error).toBeInstanceOf(TaskManagementError);
      expect(result.error.code).toBe(ERROR_CODES.CANNOT_REVIEW_OWN_TASK);
    });

    it('should validate review by other user', () => {
      const result = validateTaskPermissions(mockTask, 'user-3', 'review');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should validate revoke by task assigner', () => {
      const result = validateTaskPermissions(mockTask, 'user-2', 'revoke');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should reject revoke by non-assigner', () => {
      const result = validateTaskPermissions(mockTask, 'user-3', 'revoke');

      expect(result.isValid).toBe(false);
      expect(result.error).toBeInstanceOf(TaskManagementError);
      expect(result.error.code).toBe(ERROR_CODES.NOT_TEAM_LEAD);
    });

    it('should reject operation without authentication', () => {
      const result = validateTaskPermissions(mockTask, null, 'start');

      expect(result.isValid).toBe(false);
      expect(result.error).toBeInstanceOf(TaskManagementError);
      expect(result.error.code).toBe(ERROR_CODES.NOT_AUTHENTICATED);
    });
  });

  describe('validateTaskStatus', () => {
    it('should validate start operation on todo task', () => {
      const task = { id: 'task-1', status: 'todo' };
      const result = validateTaskStatus(task, 'start');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should reject start operation on completed task', () => {
      const task = { id: 'task-1', status: 'completed' };
      const result = validateTaskStatus(task, 'start');

      expect(result.isValid).toBe(false);
      expect(result.error).toBeInstanceOf(TaskManagementError);
      expect(result.error.code).toBe(ERROR_CODES.INVALID_TASK_STATUS);
    });

    it('should validate upload operation on in_progress task', () => {
      const task = { id: 'task-1', status: 'in_progress' };
      const result = validateTaskStatus(task, 'upload');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should reject upload operation on todo task', () => {
      const task = { id: 'task-1', status: 'todo' };
      const result = validateTaskStatus(task, 'upload');

      expect(result.isValid).toBe(false);
      expect(result.error).toBeInstanceOf(TaskManagementError);
      expect(result.error.code).toBe(ERROR_CODES.INVALID_TASK_STATUS);
    });

    it('should validate delete_submission on submitted task', () => {
      const task = { id: 'task-1', status: 'submitted' };
      const result = validateTaskStatus(task, 'delete_submission');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should reject revoke on completed task', () => {
      const task = { id: 'task-1', status: 'completed' };
      const result = validateTaskStatus(task, 'revoke');

      expect(result.isValid).toBe(false);
      expect(result.error).toBeInstanceOf(TaskManagementError);
      expect(result.error.code).toBe(ERROR_CODES.INVALID_TASK_STATUS);
    });
  });

  describe('retryOperation', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await retryOperation(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable error', async () => {
      const retryableError = new TaskManagementError('Network error', ERROR_CODES.NETWORK_ERROR, ERROR_TYPES.NETWORK);
      const operation = vi.fn()
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValue('success');
      
      const promise = retryOperation(operation, { maxRetries: 1, delay: 100 });
      
      // Fast-forward timers
      vi.advanceTimersByTime(100);
      
      const result = await promise;
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    }, 10000);

    it('should not retry on non-retryable error', async () => {
      const nonRetryableError = new TaskManagementError('Validation error', ERROR_CODES.FILE_TOO_LARGE, ERROR_TYPES.VALIDATION);
      const operation = vi.fn().mockRejectedValue(nonRetryableError);
      
      await expect(retryOperation(operation)).rejects.toThrow(nonRetryableError);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should fail after max retries', async () => {
      const retryableError = new TaskManagementError('Network error', ERROR_CODES.NETWORK_ERROR, ERROR_TYPES.NETWORK);
      const operation = vi.fn().mockRejectedValue(retryableError);
      
      const promise = retryOperation(operation, { maxRetries: 2, delay: 100 });
      
      // Fast-forward through all retry attempts
      vi.advanceTimersByTime(300); // Initial + 2 retries with backoff
      
      await expect(promise).rejects.toThrow(retryableError);
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    }, 10000);

    it('should use exponential backoff', async () => {
      const retryableError = new TaskManagementError('Network error', ERROR_CODES.NETWORK_ERROR, ERROR_TYPES.NETWORK);
      const operation = vi.fn().mockRejectedValue(retryableError);
      
      // Start the operation but don't await it yet
      const promise = retryOperation(operation, { maxRetries: 2, delay: 100, backoffMultiplier: 2 });
      
      // Initial call should happen immediately
      expect(operation).toHaveBeenCalledTimes(1);
      
      // Fast-forward through all retries at once
      vi.advanceTimersByTime(500); // Enough time for all retries
      
      await expect(promise).rejects.toThrow(retryableError);
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should use custom shouldRetry function', async () => {
      const error = new TaskManagementError('Custom error', 'CUSTOM_CODE');
      const operation = vi.fn().mockRejectedValue(error);
      const shouldRetry = vi.fn().mockReturnValue(false);
      
      await expect(retryOperation(operation, { shouldRetry })).rejects.toThrow(error);
      
      expect(operation).toHaveBeenCalledTimes(1);
      expect(shouldRetry).toHaveBeenCalledWith(error);
    });
  });
});
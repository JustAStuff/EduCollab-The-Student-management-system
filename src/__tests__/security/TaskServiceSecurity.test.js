// TaskService security enhancements tests

// Mock supabase
const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
    update: jest.fn(() => ({
      eq: jest.fn(),
    })),
  })),
  storage: {
    from: jest.fn(() => ({
      remove: jest.fn(),
      upload: jest.fn(),
    })),
  },
};

jest.mock('../../supabaseClient', () => ({
  supabase: mockSupabase,
}));

// Mock security validation
jest.mock('../../utils/securityValidation', () => ({
  validateFileServerSide: jest.fn(),
  checkUploadRateLimit: jest.fn(),
  validateCSRFToken: jest.fn(),
  auditLog: jest.fn(),
  sanitizeFilename: jest.fn((name) => name.replace(/[^a-zA-Z0-9.-]/g, '_')),
  validateWorkspacePermissions: jest.fn(),
}));

// Mock error handling
jest.mock('../../utils/errorHandling', () => ({
  validateTaskPermissions: jest.fn(() => ({ isValid: true })),
  validateTaskStatus: jest.fn(() => ({ isValid: true })),
  parseSupabaseError: jest.fn((error) => error),
  TaskManagementError: class TaskManagementError extends Error {
    constructor(message, code, type) {
      super(message);
      this.code = code;
      this.type = type;
    }
  },
  ERROR_CODES: {
    NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    INVALID_FILE: 'INVALID_FILE',
  },
  ERROR_TYPES: {
    AUTHENTICATION: 'AUTHENTICATION',
    SECURITY: 'SECURITY',
    RATE_LIMIT: 'RATE_LIMIT',
    VALIDATION: 'VALIDATION',
    PERMISSION: 'PERMISSION',
  },
  retryOperation: jest.fn((fn) => fn()),
  logError: jest.fn(),
}));

// Mock file utils
jest.mock('../../utils/fileUtils', () => ({
  generateFilePath: jest.fn(() => 'workspace/task/user_timestamp.jpg'),
}));

describe('TaskService Security Enhancements', () => {
  let deleteSubmission, reuploadSubmission, revokeTaskAssignment;

  beforeAll(async () => {
    const TaskService = await import('../../services/TaskService');
    deleteSubmission = TaskService.deleteSubmission;
    reuploadSubmission = TaskService.reuploadSubmission;
    revokeTaskAssignment = TaskService.revokeTaskAssignment;
  });
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default session storage
    sessionStorage.clear();
    sessionStorage.setItem('csrf_token', 'valid-csrf-token');
    
    // Setup default auth response
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123' } },
      error: null,
    });
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('deleteSubmission security', () => {
    it('should validate CSRF token before deletion', async () => {
      const { validateCSRFToken } = require('../../utils/securityValidation');
      validateCSRFToken.mockReturnValue(false);

      // Setup task data
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          submission_file_url: 'path/to/file.jpg',
          status: 'submitted',
          assigned_to: 'user123',
          workspace_id: 'workspace123',
        },
        error: null,
      });

      await expect(deleteSubmission('task123', 'invalid-csrf-token')).rejects.toThrow(
        'Invalid security token'
      );

      expect(validateCSRFToken).toHaveBeenCalledWith('invalid-csrf-token', 'valid-csrf-token');
    });

    it('should audit log successful deletion', async () => {
      const { validateCSRFToken, auditLog } = require('../../utils/securityValidation');
      validateCSRFToken.mockReturnValue(true);

      // Setup successful deletion
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          submission_file_url: 'path/to/file.jpg',
          status: 'submitted',
          assigned_to: 'user123',
          workspace_id: 'workspace123',
          submission_file_name: 'document.pdf',
          submission_file_size: 1024,
        },
        error: null,
      });

      mockSupabase.storage.from().remove.mockResolvedValue({ error: null });
      mockSupabase.from().update().eq.mockResolvedValue({ error: null });

      await deleteSubmission('task123', 'valid-csrf-token');

      expect(auditLog).toHaveBeenCalledWith(
        'submission_delete',
        {
          taskId: 'task123',
          workspaceId: 'workspace123',
          fileName: 'document.pdf',
          fileSize: 1024,
        },
        'user123'
      );
    });

    it('should reject deletion without authentication', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      await expect(deleteSubmission('task123', 'valid-csrf-token')).rejects.toThrow(
        'You must be logged in to delete submissions'
      );
    });
  });

  describe('reuploadSubmission security', () => {
    const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

    it('should validate CSRF token before upload', async () => {
      const { validateCSRFToken } = require('../../utils/securityValidation');
      validateCSRFToken.mockReturnValue(false);

      await expect(
        reuploadSubmission('task123', mockFile, 'workspace123', 'invalid-csrf-token')
      ).rejects.toThrow('Invalid security token');
    });

    it('should check rate limiting before upload', async () => {
      const { 
        validateCSRFToken, 
        checkUploadRateLimit 
      } = require('../../utils/securityValidation');
      
      validateCSRFToken.mockReturnValue(true);
      checkUploadRateLimit.mockReturnValue(false);

      await expect(
        reuploadSubmission('task123', mockFile, 'workspace123', 'valid-csrf-token')
      ).rejects.toThrow('Upload rate limit exceeded');

      expect(checkUploadRateLimit).toHaveBeenCalledWith('user123');
    });

    it('should perform server-side file validation', async () => {
      const { 
        validateCSRFToken, 
        checkUploadRateLimit,
        validateFileServerSide,
        validateWorkspacePermissions 
      } = require('../../utils/securityValidation');
      
      validateCSRFToken.mockReturnValue(true);
      checkUploadRateLimit.mockReturnValue(true);
      validateFileServerSide.mockResolvedValue({
        isValid: false,
        error: 'File signature mismatch',
      });

      await expect(
        reuploadSubmission('task123', mockFile, 'workspace123', 'valid-csrf-token')
      ).rejects.toThrow('File signature mismatch');

      expect(validateFileServerSide).toHaveBeenCalledWith(mockFile, {
        maxSizeMB: 10,
        checkSignature: true,
        scanForMalware: true,
      });
    });

    it('should validate workspace permissions', async () => {
      const { 
        validateCSRFToken, 
        checkUploadRateLimit,
        validateFileServerSide,
        validateWorkspacePermissions 
      } = require('../../utils/securityValidation');
      
      validateCSRFToken.mockReturnValue(true);
      checkUploadRateLimit.mockReturnValue(true);
      validateFileServerSide.mockResolvedValue({ isValid: true });
      validateWorkspacePermissions.mockResolvedValue({
        isValid: false,
        error: 'Insufficient permissions',
      });

      await expect(
        reuploadSubmission('task123', mockFile, 'workspace123', 'valid-csrf-token')
      ).rejects.toThrow('Insufficient permissions');

      expect(validateWorkspacePermissions).toHaveBeenCalledWith(
        'workspace123',
        'user123',
        'upload'
      );
    });

    it('should sanitize filename before upload', async () => {
      const { 
        validateCSRFToken, 
        checkUploadRateLimit,
        validateFileServerSide,
        validateWorkspacePermissions,
        sanitizeFilename,
        auditLog
      } = require('../../utils/securityValidation');
      
      // Setup successful validation
      validateCSRFToken.mockReturnValue(true);
      checkUploadRateLimit.mockReturnValue(true);
      validateFileServerSide.mockResolvedValue({ isValid: true });
      validateWorkspacePermissions.mockResolvedValue({ isValid: true });

      // Setup task data
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          submission_file_url: 'old/path.jpg',
          status: 'submitted',
          assigned_to: 'user123',
          workspace_id: 'workspace123',
        },
        error: null,
      });

      mockSupabase.storage.from().remove.mockResolvedValue({ error: null });
      mockSupabase.storage.from().upload.mockResolvedValue({
        data: { path: 'new/path.jpg' },
        error: null,
      });
      mockSupabase.from().update().eq.mockResolvedValue({ error: null });

      const dangerousFile = new File(['content'], '../../../etc/passwd', { type: 'text/plain' });

      await reuploadSubmission('task123', dangerousFile, 'workspace123', 'valid-csrf-token');

      expect(sanitizeFilename).toHaveBeenCalledWith('../../../etc/passwd');
    });

    it('should audit log successful reupload', async () => {
      const { 
        validateCSRFToken, 
        checkUploadRateLimit,
        validateFileServerSide,
        validateWorkspacePermissions,
        auditLog
      } = require('../../utils/securityValidation');
      
      // Setup successful validation
      validateCSRFToken.mockReturnValue(true);
      checkUploadRateLimit.mockReturnValue(true);
      validateFileServerSide.mockResolvedValue({ isValid: true });
      validateWorkspacePermissions.mockResolvedValue({ isValid: true });

      // Setup task data
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          submission_file_url: 'old/path.jpg',
          status: 'submitted',
          assigned_to: 'user123',
          workspace_id: 'workspace123',
        },
        error: null,
      });

      mockSupabase.storage.from().remove.mockResolvedValue({ error: null });
      mockSupabase.storage.from().upload.mockResolvedValue({
        data: { path: 'new/path.jpg' },
        error: null,
      });
      mockSupabase.from().update().eq.mockResolvedValue({ error: null });

      await reuploadSubmission('task123', mockFile, 'workspace123', 'valid-csrf-token');

      expect(auditLog).toHaveBeenCalledWith(
        'file_reupload',
        {
          taskId: 'task123',
          workspaceId: 'workspace123',
          fileName: 'test.jpg',
          fileSize: mockFile.size,
          fileType: 'image/jpeg',
        },
        'user123'
      );
    });

    it('should include metadata in file upload', async () => {
      const { 
        validateCSRFToken, 
        checkUploadRateLimit,
        validateFileServerSide,
        validateWorkspacePermissions
      } = require('../../utils/securityValidation');
      
      // Setup successful validation
      validateCSRFToken.mockReturnValue(true);
      checkUploadRateLimit.mockReturnValue(true);
      validateFileServerSide.mockResolvedValue({ isValid: true });
      validateWorkspacePermissions.mockResolvedValue({ isValid: true });

      // Setup task data
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          submission_file_url: null,
          status: 'submitted',
          assigned_to: 'user123',
          workspace_id: 'workspace123',
        },
        error: null,
      });

      const mockUpload = jest.fn().mockResolvedValue({
        data: { path: 'new/path.jpg' },
        error: null,
      });
      mockSupabase.storage.from.mockReturnValue({ upload: mockUpload });
      mockSupabase.from().update().eq.mockResolvedValue({ error: null });

      await reuploadSubmission('task123', mockFile, 'workspace123', 'valid-csrf-token');

      expect(mockUpload).toHaveBeenCalledWith(
        'workspace/task/user_timestamp.jpg',
        mockFile,
        {
          metadata: {
            size: mockFile.size.toString(),
            type: mockFile.type,
            originalName: mockFile.name,
            uploadedBy: 'user123',
            taskId: 'task123',
            workspaceId: 'workspace123',
          },
        }
      );
    });
  });

  describe('revokeTaskAssignment security', () => {
    it('should validate CSRF token before revocation', async () => {
      const { validateCSRFToken } = require('../../utils/securityValidation');
      validateCSRFToken.mockReturnValue(false);

      await expect(revokeTaskAssignment('task123', 'invalid-csrf-token')).rejects.toThrow(
        'Invalid security token'
      );
    });

    it('should audit log successful revocation', async () => {
      const { validateCSRFToken, auditLog } = require('../../utils/securityValidation');
      validateCSRFToken.mockReturnValue(true);

      // Setup task data
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          workspace_id: 'workspace123',
          assigned_by: 'user123',
          assigned_to: 'member456',
          status: 'in_progress',
        },
        error: null,
      });

      mockSupabase.from().update().eq.mockResolvedValue({ error: null });

      await revokeTaskAssignment('task123', 'valid-csrf-token');

      expect(auditLog).toHaveBeenCalledWith(
        'task_revocation',
        {
          taskId: 'task123',
          workspaceId: 'workspace123',
          previousAssignee: 'member456',
          revokedBy: 'user123',
        },
        'user123'
      );
    });
  });

  describe('Security error handling', () => {
    it('should handle CSRF token validation errors', async () => {
      const { validateCSRFToken } = require('../../utils/securityValidation');
      validateCSRFToken.mockImplementation(() => {
        throw new Error('Token validation failed');
      });

      await expect(deleteSubmission('task123', 'token')).rejects.toThrow();
    });

    it('should handle rate limiting service errors', async () => {
      const { 
        validateCSRFToken, 
        checkUploadRateLimit 
      } = require('../../utils/securityValidation');
      
      validateCSRFToken.mockReturnValue(true);
      checkUploadRateLimit.mockImplementation(() => {
        throw new Error('Rate limiting service unavailable');
      });

      const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      await expect(
        reuploadSubmission('task123', mockFile, 'workspace123', 'valid-csrf-token')
      ).rejects.toThrow();
    });

    it('should handle audit logging failures gracefully', async () => {
      const { 
        validateCSRFToken, 
        auditLog 
      } = require('../../utils/securityValidation');
      
      validateCSRFToken.mockReturnValue(true);
      auditLog.mockRejectedValue(new Error('Audit service unavailable'));

      // Setup successful deletion
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          submission_file_url: 'path/to/file.jpg',
          status: 'submitted',
          assigned_to: 'user123',
          workspace_id: 'workspace123',
          submission_file_name: 'document.pdf',
          submission_file_size: 1024,
        },
        error: null,
      });

      mockSupabase.storage.from().remove.mockResolvedValue({ error: null });
      mockSupabase.from().update().eq.mockResolvedValue({ error: null });

      // Should not throw even if audit logging fails
      await expect(deleteSubmission('task123', 'valid-csrf-token')).resolves.toEqual({
        success: true,
      });
    });
  });
});
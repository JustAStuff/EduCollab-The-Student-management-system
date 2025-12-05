/**
 * Integration tests for file upload permissions
 * Tests workspace owner and member upload functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import FileUpload from '../components/tasks/FileUpload';
import { validateUploadPermissions } from '../services/TaskService';
import { validateFileServerSide } from '../utils/securityValidation';
import { SecurityProvider } from '../contexts/SecurityContext';

// Mock dependencies
vi.mock('../services/TaskService', () => ({
  validateUploadPermissions: vi.fn(),
}));

vi.mock('../utils/securityValidation', () => ({
  validateFileServerSide: vi.fn(),
}));

vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
  },
}));

vi.mock('../utils/errorHandling', () => ({
  validateFileEnhanced: vi.fn(),
  getUserFriendlyErrorMessage: vi.fn(),
  logError: vi.fn(),
  TaskManagementError: class TaskManagementError extends Error {
    constructor(message, code) {
      super(message);
      this.code = code;
    }
  },
  ERROR_CODES: {
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    UPLOAD_FAILED: 'UPLOAD_FAILED',
    NETWORK_ERROR: 'NETWORK_ERROR',
  },
  retryOperation: vi.fn(),
}));

vi.mock('../config/uiConsistency', () => ({
  getButtonStyle: vi.fn(() => ({})),
  getButtonGroupStyle: vi.fn(() => ({})),
  FILE_UPLOAD_CONFIG: {
    acceptedFormats: '.pdf,.doc,.docx,.jpg,.png',
    maxSizeMB: 10,
    allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  },
  TYPOGRAPHY_CONFIG: {
    metadata: { variant: 'caption' },
  },
  LAYOUT_CONFIG: {
    contentPadding: 2,
    borderRadius: 1,
  },
}));

// Mock SecurityContext
const MockSecurityProvider = ({ children }) => (
  <SecurityProvider value={{ csrfToken: 'mock-csrf-token', isSecurityReady: true }}>
    {children}
  </SecurityProvider>
);

describe('FileUpload Permissions Integration Tests', () => {
  const mockUser = { id: 'user-123' };
  const mockTask = { id: 'task-456', workspace_id: 'workspace-789' };
  const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
  
  let mockOnUpload;
  let mockOnFileSelect;

  beforeEach(() => {
    mockOnUpload = vi.fn();
    mockOnFileSelect = vi.fn();
    
    // Reset all mocks
    vi.clearAllMocks();
    
    // Default mock implementations
    const { supabase } = require('../supabaseClient');
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    const { validateFileEnhanced } = require('../utils/errorHandling');
    validateFileEnhanced.mockReturnValue({ isValid: true });
    
    validateFileServerSide.mockResolvedValue({ isValid: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Workspace Owner Upload Permissions', () => {
    it('should allow workspace owner to upload to any task', async () => {
      const user = userEvent.setup();
      
      // Mock successful permission check for workspace owner
      validateUploadPermissions.mockResolvedValue({ isValid: true });
      
      render(
        <MockSecurityProvider>
          <FileUpload
            taskId={mockTask.id}
            workspaceId={mockTask.workspace_id}
            userRole="owner"
            onUpload={mockOnUpload}
            onFileSelect={mockOnFileSelect}
          />
        </MockSecurityProvider>
      );

      // Select a file
      const fileInput = screen.getByLabelText(/select file/i);
      await user.upload(fileInput, mockFile);

      // Wait for permission validation
      await waitFor(() => {
        expect(validateUploadPermissions).toHaveBeenCalledWith(mockTask.id, mockUser.id);
      });

      // Should show file preview without errors
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
      expect(screen.getByText(/upload file/i)).toBeInTheDocument();
      
      // Should show workspace owner indicator
      expect(screen.getByText(/workspace owner: can upload to any task/i)).toBeInTheDocument();
    });

    it('should handle workspace owner upload with enhanced error handling', async () => {
      const user = userEvent.setup();
      
      // Mock permission check success but upload failure
      validateUploadPermissions.mockResolvedValue({ isValid: true });
      mockOnUpload.mockRejectedValue(new Error('Network timeout'));
      
      render(
        <MockSecurityProvider>
          <FileUpload
            taskId={mockTask.id}
            workspaceId={mockTask.workspace_id}
            userRole="owner"
            onUpload={mockOnUpload}
            onFileSelect={mockOnFileSelect}
            enableRetry={true}
          />
        </MockSecurityProvider>
      );

      // Select and upload file
      const fileInput = screen.getByLabelText(/select file/i);
      await user.upload(fileInput, mockFile);
      
      const uploadButton = screen.getByText(/upload file/i);
      await user.click(uploadButton);

      // Should show network error message
      await waitFor(() => {
        expect(screen.getByText(/network error occurred/i)).toBeInTheDocument();
      });
    });

    it('should allow workspace owner to upload even when not task assignee', async () => {
      const user = userEvent.setup();
      
      // Mock workspace owner permission (not task assignee)
      validateUploadPermissions.mockResolvedValue({ isValid: true });
      
      render(
        <MockSecurityProvider>
          <FileUpload
            taskId={mockTask.id}
            workspaceId={mockTask.workspace_id}
            userRole="owner"
            onUpload={mockOnUpload}
            onFileSelect={mockOnFileSelect}
          />
        </MockSecurityProvider>
      );

      const fileInput = screen.getByLabelText(/select file/i);
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(validateUploadPermissions).toHaveBeenCalledWith(mockTask.id, mockUser.id);
      });

      // Should allow upload
      expect(screen.getByText(/upload file/i)).toBeInTheDocument();
      expect(screen.queryByText(/permission/i)).not.toBeInTheDocument();
    });
  });

  describe('Workspace Member Upload Permissions', () => {
    it('should allow member to upload to assigned task', async () => {
      const user = userEvent.setup();
      
      // Mock successful permission check for task assignee
      validateUploadPermissions.mockResolvedValue({ isValid: true });
      
      render(
        <MockSecurityProvider>
          <FileUpload
            taskId={mockTask.id}
            workspaceId={mockTask.workspace_id}
            userRole="member"
            onUpload={mockOnUpload}
            onFileSelect={mockOnFileSelect}
          />
        </MockSecurityProvider>
      );

      const fileInput = screen.getByLabelText(/select file/i);
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(validateUploadPermissions).toHaveBeenCalledWith(mockTask.id, mockUser.id);
      });

      expect(screen.getByText('test.pdf')).toBeInTheDocument();
      expect(screen.getByText(/upload file/i)).toBeInTheDocument();
    });

    it('should prevent member from uploading to unassigned task', async () => {
      const user = userEvent.setup();
      
      // Mock permission denied for non-assignee
      validateUploadPermissions.mockResolvedValue({ 
        isValid: false, 
        error: 'You can only upload to tasks assigned to you' 
      });
      
      render(
        <MockSecurityProvider>
          <FileUpload
            taskId={mockTask.id}
            workspaceId={mockTask.workspace_id}
            userRole="member"
            onUpload={mockOnUpload}
            onFileSelect={mockOnFileSelect}
          />
        </MockSecurityProvider>
      );

      const fileInput = screen.getByLabelText(/select file/i);
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(screen.getByText(/you can only upload to tasks assigned to you/i)).toBeInTheDocument();
      });

      // Should not show upload button
      expect(screen.queryByText(/upload file/i)).not.toBeInTheDocument();
    });

    it('should handle member upload with permission error during upload', async () => {
      const user = userEvent.setup();
      
      // Mock permission check success initially but failure during upload
      validateUploadPermissions
        .mockResolvedValueOnce({ isValid: true })
        .mockResolvedValueOnce({ isValid: false, error: 'Permission denied' });
      
      const { TaskManagementError, ERROR_CODES } = require('../utils/errorHandling');
      mockOnUpload.mockRejectedValue(
        new TaskManagementError('Permission denied', ERROR_CODES.PERMISSION_DENIED)
      );
      
      render(
        <MockSecurityProvider>
          <FileUpload
            taskId={mockTask.id}
            workspaceId={mockTask.workspace_id}
            userRole="member"
            onUpload={mockOnUpload}
            onFileSelect={mockOnFileSelect}
          />
        </MockSecurityProvider>
      );

      const fileInput = screen.getByLabelText(/select file/i);
      await user.upload(fileInput, mockFile);
      
      const uploadButton = screen.getByText(/upload file/i);
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/upload failed due to permission restrictions/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle CSRF token validation errors', async () => {
      const user = userEvent.setup();
      
      validateUploadPermissions.mockResolvedValue({ isValid: true });
      mockOnUpload.mockRejectedValue(new Error('Invalid security token'));
      
      render(
        <MockSecurityProvider>
          <FileUpload
            taskId={mockTask.id}
            workspaceId={mockTask.workspace_id}
            userRole="owner"
            onUpload={mockOnUpload}
            onFileSelect={mockOnFileSelect}
          />
        </MockSecurityProvider>
      );

      const fileInput = screen.getByLabelText(/select file/i);
      await user.upload(fileInput, mockFile);
      
      const uploadButton = screen.getByText(/upload file/i);
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/security validation failed/i)).toBeInTheDocument();
      });
    });

    it('should handle network errors with retry option', async () => {
      const user = userEvent.setup();
      
      validateUploadPermissions.mockResolvedValue({ isValid: true });
      mockOnUpload.mockRejectedValue(new Error('Network timeout'));
      
      render(
        <MockSecurityProvider>
          <FileUpload
            taskId={mockTask.id}
            workspaceId={mockTask.workspace_id}
            userRole="owner"
            onUpload={mockOnUpload}
            onFileSelect={mockOnFileSelect}
            enableRetry={true}
            maxRetries={2}
          />
        </MockSecurityProvider>
      );

      const fileInput = screen.getByLabelText(/select file/i);
      await user.upload(fileInput, mockFile);
      
      const uploadButton = screen.getByText(/upload file/i);
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/network error occurred/i)).toBeInTheDocument();
      });

      // Should show retry button
      const retryButton = screen.getByLabelText(/retry upload/i);
      expect(retryButton).toBeInTheDocument();
    });

    it('should validate permissions on both file selection and upload', async () => {
      const user = userEvent.setup();
      
      // Mock permission check to fail on second call (during upload)
      validateUploadPermissions
        .mockResolvedValueOnce({ isValid: true })
        .mockResolvedValueOnce({ isValid: false, error: 'Task reassigned' });
      
      render(
        <MockSecurityProvider>
          <FileUpload
            taskId={mockTask.id}
            workspaceId={mockTask.workspace_id}
            userRole="member"
            onUpload={mockOnUpload}
            onFileSelect={mockOnFileSelect}
          />
        </MockSecurityProvider>
      );

      // File selection should succeed
      const fileInput = screen.getByLabelText(/select file/i);
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(screen.getByText(/upload file/i)).toBeInTheDocument();
      });

      // Upload should fail with permission error
      const uploadButton = screen.getByText(/upload file/i);
      await user.click(uploadButton);

      await waitFor(() => {
        expect(validateUploadPermissions).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('File Validation Integration', () => {
    it('should validate file type and size before checking permissions', async () => {
      const user = userEvent.setup();
      
      const { validateFileEnhanced } = require('../utils/errorHandling');
      const { TaskManagementError, ERROR_CODES } = require('../utils/errorHandling');
      
      // Mock file validation failure
      validateFileEnhanced.mockReturnValue({
        isValid: false,
        error: new TaskManagementError('File too large', ERROR_CODES.FILE_TOO_LARGE)
      });
      
      render(
        <MockSecurityProvider>
          <FileUpload
            taskId={mockTask.id}
            workspaceId={mockTask.workspace_id}
            userRole="owner"
            onUpload={mockOnUpload}
            onFileSelect={mockOnFileSelect}
          />
        </MockSecurityProvider>
      );

      const fileInput = screen.getByLabelText(/select file/i);
      await user.upload(fileInput, mockFile);

      // Should show file validation error without checking permissions
      await waitFor(() => {
        expect(validateUploadPermissions).not.toHaveBeenCalled();
      });
    });

    it('should perform security validation for workspace owners', async () => {
      const user = userEvent.setup();
      
      validateUploadPermissions.mockResolvedValue({ isValid: true });
      validateFileServerSide.mockResolvedValue({ isValid: true });
      
      render(
        <MockSecurityProvider>
          <FileUpload
            taskId={mockTask.id}
            workspaceId={mockTask.workspace_id}
            userRole="owner"
            onUpload={mockOnUpload}
            onFileSelect={mockOnFileSelect}
            enableSecurityValidation={true}
          />
        </MockSecurityProvider>
      );

      const fileInput = screen.getByLabelText(/select file/i);
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(validateFileServerSide).toHaveBeenCalledWith(mockFile, {
          maxSizeMB: 10,
          checkSignature: true,
          scanForMalware: true
        });
      });
    });
  });
});
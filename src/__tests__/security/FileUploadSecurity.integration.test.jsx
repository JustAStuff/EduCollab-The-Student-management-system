// File upload security integration tests
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FileUpload from '../../components/tasks/FileUpload';
import { SecurityProvider } from '../../contexts/SecurityContext';

// Mock the security validation utilities
jest.mock('../../utils/securityValidation', () => ({
  validateFileServerSide: jest.fn(),
  generateCSRFToken: jest.fn(() => 'mock-csrf-token'),
  validateCSRFToken: jest.fn(() => true),
}));

// Mock error handling utilities
jest.mock('../../utils/errorHandling', () => ({
  validateFileEnhanced: jest.fn(() => ({ isValid: true })),
  retryOperation: jest.fn((fn) => fn()),
  getUserFriendlyErrorMessage: jest.fn((error) => error.message || 'Unknown error'),
  logError: jest.fn(),
  TaskManagementError: class TaskManagementError extends Error {
    constructor(message, code, type) {
      super(message);
      this.code = code;
      this.type = type;
    }
  },
  ERROR_CODES: {
    INVALID_FILE: 'INVALID_FILE',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  },
}));

// Mock UI consistency config
jest.mock('../../config/uiConsistency', () => ({
  getButtonStyle: jest.fn(() => ({})),
  getButtonGroupStyle: jest.fn(() => ({})),
  FILE_UPLOAD_CONFIG: {
    acceptedFormats: '.jpg,.png,.pdf',
    maxSizeMB: 10,
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  },
  TYPOGRAPHY_CONFIG: {
    metadata: { variant: 'caption', color: 'text.secondary' },
  },
  LAYOUT_CONFIG: {
    contentPadding: 2,
    borderRadius: 1,
  },
}));

const TestWrapper = ({ children }) => (
  <SecurityProvider>
    {children}
  </SecurityProvider>
);

describe('FileUpload Security Integration', () => {
  let mockOnUpload;
  let mockOnFileSelect;

  beforeEach(() => {
    mockOnUpload = jest.fn();
    mockOnFileSelect = jest.fn();
    jest.clearAllMocks();
    
    // Reset session storage
    sessionStorage.clear();
    sessionStorage.setItem('csrf_token', 'mock-csrf-token');
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should perform security validation on file selection', async () => {
    const { validateFileServerSide } = require('../../utils/securityValidation');
    validateFileServerSide.mockResolvedValue({ isValid: true });

    render(
      <TestWrapper>
        <FileUpload
          onUpload={mockOnUpload}
          onFileSelect={mockOnFileSelect}
          enableSecurityValidation={true}
        />
      </TestWrapper>
    );

    // Wait for security to be ready
    await waitFor(() => {
      expect(screen.queryByText(/Security system is initializing/)).not.toBeInTheDocument();
    });

    // Create a test file
    const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByRole('button', { name: /select file/i }).previousElementSibling;

    // Upload file
    await userEvent.upload(input, file);

    // Should call server-side validation
    await waitFor(() => {
      expect(validateFileServerSide).toHaveBeenCalledWith(file, {
        maxSizeMB: 10,
        checkSignature: true,
        scanForMalware: true,
      });
    });

    expect(mockOnFileSelect).toHaveBeenCalledWith(file);
  });

  it('should reject file that fails security validation', async () => {
    const { validateFileServerSide } = require('../../utils/securityValidation');
    validateFileServerSide.mockResolvedValue({
      isValid: false,
      error: 'File signature validation failed'
    });

    render(
      <TestWrapper>
        <FileUpload
          onUpload={mockOnUpload}
          onFileSelect={mockOnFileSelect}
          enableSecurityValidation={true}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Security system is initializing/)).not.toBeInTheDocument();
    });

    const file = new File(['malicious content'], 'malware.jpg', { type: 'image/jpeg' });
    const input = screen.getByRole('button', { name: /select file/i }).previousElementSibling;

    await userEvent.upload(input, file);

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/File signature validation failed/)).toBeInTheDocument();
    });

    expect(mockOnFileSelect).not.toHaveBeenCalled();
  });

  it('should show security validation in progress', async () => {
    const { validateFileServerSide } = require('../../utils/securityValidation');
    
    // Make validation take some time
    validateFileServerSide.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ isValid: true }), 100))
    );

    render(
      <TestWrapper>
        <FileUpload
          onUpload={mockOnUpload}
          onFileSelect={mockOnFileSelect}
          enableSecurityValidation={true}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Security system is initializing/)).not.toBeInTheDocument();
    });

    const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByRole('button', { name: /select file/i }).previousElementSibling;

    await userEvent.upload(input, file);

    // Should show validation in progress
    expect(screen.getByText(/Performing security validation/)).toBeInTheDocument();

    // Wait for validation to complete
    await waitFor(() => {
      expect(screen.queryByText(/Performing security validation/)).not.toBeInTheDocument();
    });
  });

  it('should pass CSRF token to upload function', async () => {
    const { validateFileServerSide } = require('../../utils/securityValidation');
    validateFileServerSide.mockResolvedValue({ isValid: true });

    render(
      <TestWrapper>
        <FileUpload
          onUpload={mockOnUpload}
          onFileSelect={mockOnFileSelect}
          enableSecurityValidation={true}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Security system is initializing/)).not.toBeInTheDocument();
    });

    const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByRole('button', { name: /select file/i }).previousElementSibling;

    await userEvent.upload(input, file);

    // Wait for file to be selected and validated
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /upload file/i })).toBeInTheDocument();
    });

    // Click upload button
    await userEvent.click(screen.getByRole('button', { name: /upload file/i }));

    // Should call onUpload with file and CSRF token
    expect(mockOnUpload).toHaveBeenCalledWith(file, 'mock-csrf-token');
  });

  it('should disable upload when security is not ready', () => {
    // Mock security context to return not ready
    jest.doMock('../../contexts/SecurityContext', () => ({
      useSecurity: () => ({
        csrfToken: null,
        isSecurityReady: false,
        refreshCSRFToken: jest.fn(),
      }),
      SecurityProvider: ({ children }) => children,
    }));

    render(
      <FileUpload
        onUpload={mockOnUpload}
        onFileSelect={mockOnFileSelect}
        enableSecurityValidation={true}
      />
    );

    // Should show security warning
    expect(screen.getByText(/Security system is initializing/)).toBeInTheDocument();

    // Upload button should be disabled even if file is selected
    const selectButton = screen.getByRole('button', { name: /select file/i });
    expect(selectButton).toBeDisabled();
  });

  it('should work without security validation when disabled', async () => {
    render(
      <TestWrapper>
        <FileUpload
          onUpload={mockOnUpload}
          onFileSelect={mockOnFileSelect}
          enableSecurityValidation={false}
        />
      </TestWrapper>
    );

    const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByRole('button', { name: /select file/i }).previousElementSibling;

    await userEvent.upload(input, file);

    // Should not perform server-side validation
    const { validateFileServerSide } = require('../../utils/securityValidation');
    expect(validateFileServerSide).not.toHaveBeenCalled();

    expect(mockOnFileSelect).toHaveBeenCalledWith(file);
  });

  it('should handle security validation errors gracefully', async () => {
    const { validateFileServerSide } = require('../../utils/securityValidation');
    validateFileServerSide.mockRejectedValue(new Error('Validation service unavailable'));

    render(
      <TestWrapper>
        <FileUpload
          onUpload={mockOnUpload}
          onFileSelect={mockOnFileSelect}
          enableSecurityValidation={true}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Security system is initializing/)).not.toBeInTheDocument();
    });

    const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByRole('button', { name: /select file/i }).previousElementSibling;

    await userEvent.upload(input, file);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/Security validation failed/)).toBeInTheDocument();
    });

    expect(mockOnFileSelect).not.toHaveBeenCalled();
  });

  it('should show enhanced security indicator', async () => {
    render(
      <TestWrapper>
        <FileUpload
          onUpload={mockOnUpload}
          onFileSelect={mockOnFileSelect}
          enableSecurityValidation={true}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Enhanced security validation enabled/)).toBeInTheDocument();
    });
  });

  it('should disable upload button during security validation', async () => {
    const { validateFileServerSide } = require('../../utils/securityValidation');
    
    let resolveValidation;
    validateFileServerSide.mockImplementation(() => 
      new Promise(resolve => { resolveValidation = resolve; })
    );

    render(
      <TestWrapper>
        <FileUpload
          onUpload={mockOnUpload}
          onFileSelect={mockOnFileSelect}
          enableSecurityValidation={true}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Security system is initializing/)).not.toBeInTheDocument();
    });

    const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByRole('button', { name: /select file/i }).previousElementSibling;

    await userEvent.upload(input, file);

    // Upload button should not be available during validation
    expect(screen.queryByRole('button', { name: /upload file/i })).not.toBeInTheDocument();

    // Resolve validation
    resolveValidation({ isValid: true });

    // Upload button should become available
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /upload file/i })).toBeInTheDocument();
    });
  });
});

describe('FileUpload Security Edge Cases', () => {
  let mockOnUpload;

  beforeEach(() => {
    mockOnUpload = jest.fn();
    jest.clearAllMocks();
    sessionStorage.clear();
    sessionStorage.setItem('csrf_token', 'mock-csrf-token');
  });

  it('should handle multiple rapid file selections', async () => {
    const { validateFileServerSide } = require('../../utils/securityValidation');
    validateFileServerSide.mockResolvedValue({ isValid: true });

    render(
      <TestWrapper>
        <FileUpload
          onUpload={mockOnUpload}
          enableSecurityValidation={true}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Security system is initializing/)).not.toBeInTheDocument();
    });

    const input = screen.getByRole('button', { name: /select file/i }).previousElementSibling;

    // Select multiple files rapidly
    const file1 = new File(['content1'], 'test1.jpg', { type: 'image/jpeg' });
    const file2 = new File(['content2'], 'test2.jpg', { type: 'image/jpeg' });

    await userEvent.upload(input, file1);
    await userEvent.upload(input, file2);

    // Should handle the rapid changes without errors
    await waitFor(() => {
      expect(screen.getByText('test2.jpg')).toBeInTheDocument();
    });
  });

  it('should clear validation errors when selecting new file', async () => {
    const { validateFileServerSide } = require('../../utils/securityValidation');
    
    // First file fails validation
    validateFileServerSide.mockResolvedValueOnce({
      isValid: false,
      error: 'First file is invalid'
    });

    render(
      <TestWrapper>
        <FileUpload
          onUpload={mockOnUpload}
          enableSecurityValidation={true}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Security system is initializing/)).not.toBeInTheDocument();
    });

    const input = screen.getByRole('button', { name: /select file/i }).previousElementSibling;

    // Select invalid file
    const invalidFile = new File(['bad content'], 'bad.jpg', { type: 'image/jpeg' });
    await userEvent.upload(input, invalidFile);

    await waitFor(() => {
      expect(screen.getByText(/First file is invalid/)).toBeInTheDocument();
    });

    // Second file passes validation
    validateFileServerSide.mockResolvedValueOnce({ isValid: true });

    // Select valid file
    const validFile = new File(['good content'], 'good.jpg', { type: 'image/jpeg' });
    await userEvent.upload(input, validFile);

    // Error should be cleared
    await waitFor(() => {
      expect(screen.queryByText(/First file is invalid/)).not.toBeInTheDocument();
    });
  });
});
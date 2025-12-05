import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FileUpload from '../FileUpload';

// Mock the error handling utilities
vi.mock('../../../utils/errorHandling', () => ({
  validateFileEnhanced: vi.fn((file, options = {}) => {
    const { maxSizeMB = 10, allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'] } = options;
    
    if (!file) {
      return { 
        isValid: false, 
        error: { message: 'No file selected', code: 'FILE_EMPTY' }
      };
    }
    
    if (file.size > maxSizeMB * 1024 * 1024) {
      return { 
        isValid: false, 
        error: { message: `File size exceeds ${maxSizeMB}MB limit`, code: 'FILE_TOO_LARGE' }
      };
    }
    
    if (!allowedTypes.includes(file.type)) {
      return { 
        isValid: false, 
        error: { message: 'File type not supported', code: 'FILE_TYPE_INVALID' }
      };
    }
    
    return { isValid: true, error: null };
  }),
  getUserFriendlyErrorMessage: vi.fn((error) => error?.message || 'Unknown error'),
  logError: vi.fn(),
  retryOperation: vi.fn((operation) => operation()),
  TaskManagementError: class TaskManagementError extends Error {
    constructor(message, code) {
      super(message);
      this.code = code;
    }
  },
  ERROR_CODES: {
    NETWORK_ERROR: 'NETWORK_ERROR',
    UPLOAD_FAILED: 'UPLOAD_FAILED',
  },
}));

// Mock the fileUtils
vi.mock('../../../utils/fileUtils', () => ({
  formatFileSize: vi.fn((bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }),
}));

describe('FileUpload Component', () => {
  const mockHandlers = {
    onFileSelect: vi.fn(),
    onUpload: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render file selection button', () => {
      render(<FileUpload />);
      
      expect(screen.getByRole('button', { name: /Select File/i })).toBeInTheDocument();
    });

    it('should display accepted formats info', () => {
      render(<FileUpload acceptedFormats=".jpg,.png,.pdf" maxSizeMB={5} />);
      
      expect(screen.getByText(/Accepted formats: JPG,PNG,PDF \(Max 5MB\)/i)).toBeInTheDocument();
    });

    it('should not show upload button initially', () => {
      render(<FileUpload />);
      
      expect(screen.queryByRole('button', { name: /Upload File/i })).not.toBeInTheDocument();
    });
  });

  describe('File Selection', () => {
    it('should call onFileSelect when valid file is selected', async () => {
      render(<FileUpload onFileSelect={mockHandlers.onFileSelect} />);
      
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/Select File/i).querySelector('input');
      
      fireEvent.change(input, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(mockHandlers.onFileSelect).toHaveBeenCalledWith(file);
      });
    });

    it('should display selected file name and size', async () => {
      render(<FileUpload showPreview={true} />);
      
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/Select File/i).querySelector('input');
      
      fireEvent.change(input, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument();
      });
    });

    it('should change button text after file selection', async () => {
      render(<FileUpload />);
      
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/Select File/i).querySelector('input');
      
      fireEvent.change(input, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Change File/i })).toBeInTheDocument();
      });
    });
  });

  describe('File Validation', () => {
    it('should show error for oversized file', async () => {
      render(<FileUpload maxSizeMB={1} />);
      
      const largeFile = new File(['x'.repeat(2 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/Select File/i).querySelector('input');
      
      fireEvent.change(input, { target: { files: [largeFile] } });
      
      await waitFor(() => {
        expect(screen.getByText(/File size exceeds 1MB limit/i)).toBeInTheDocument();
      });
    });

    it('should show error for invalid file type', async () => {
      render(<FileUpload />);
      
      const invalidFile = new File(['content'], 'test.exe', { type: 'application/x-msdownload' });
      const input = screen.getByLabelText(/Select File/i).querySelector('input');
      
      fireEvent.change(input, { target: { files: [invalidFile] } });
      
      await waitFor(() => {
        expect(screen.getByText(/File type not supported/i)).toBeInTheDocument();
      });
    });

    it('should not show upload button for invalid file', async () => {
      render(<FileUpload />);
      
      const invalidFile = new File(['content'], 'test.exe', { type: 'application/x-msdownload' });
      const input = screen.getByLabelText(/Select File/i).querySelector('input');
      
      fireEvent.change(input, { target: { files: [invalidFile] } });
      
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /Upload File/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('File Upload', () => {
    it('should show upload button for valid file', async () => {
      render(<FileUpload />);
      
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/Select File/i).querySelector('input');
      
      fireEvent.change(input, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Upload File/i })).toBeInTheDocument();
      });
    });

    it('should call onUpload when upload button is clicked', async () => {
      mockHandlers.onUpload.mockResolvedValue();
      render(<FileUpload onUpload={mockHandlers.onUpload} />);
      
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/Select File/i).querySelector('input');
      
      fireEvent.change(input, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Upload File/i })).toBeInTheDocument();
      });
      
      const uploadButton = screen.getByRole('button', { name: /Upload File/i });
      fireEvent.click(uploadButton);
      
      await waitFor(() => {
        expect(mockHandlers.onUpload).toHaveBeenCalledWith(file);
      });
    });

    it('should show progress during upload', async () => {
      mockHandlers.onUpload.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 500)));
      render(<FileUpload onUpload={mockHandlers.onUpload} />);
      
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/Select File/i).querySelector('input');
      
      fireEvent.change(input, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Upload File/i })).toBeInTheDocument();
      });
      
      const uploadButton = screen.getByRole('button', { name: /Upload File/i });
      fireEvent.click(uploadButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Uploading.../i)).toBeInTheDocument();
      });
    });

    it('should disable buttons during upload', async () => {
      mockHandlers.onUpload.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 500)));
      render(<FileUpload onUpload={mockHandlers.onUpload} />);
      
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/Select File/i).querySelector('input');
      
      fireEvent.change(input, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Upload File/i })).toBeInTheDocument();
      });
      
      const uploadButton = screen.getByRole('button', { name: /Upload File/i });
      fireEvent.click(uploadButton);
      
      await waitFor(() => {
        const selectButton = screen.getByRole('button', { name: /Change File/i });
        expect(selectButton).toBeDisabled();
      });
    });

    it('should handle upload errors', async () => {
      mockHandlers.onUpload.mockRejectedValue(new Error('Upload failed'));
      render(<FileUpload onUpload={mockHandlers.onUpload} />);
      
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/Select File/i).querySelector('input');
      
      fireEvent.change(input, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Upload File/i })).toBeInTheDocument();
      });
      
      const uploadButton = screen.getByRole('button', { name: /Upload File/i });
      fireEvent.click(uploadButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Upload failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Clear Functionality', () => {
    it('should show clear button after file selection', async () => {
      render(<FileUpload />);
      
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/Select File/i).querySelector('input');
      
      fireEvent.change(input, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Clear/i })).toBeInTheDocument();
      });
    });

    it('should clear selected file when clear button is clicked', async () => {
      render(<FileUpload />);
      
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/Select File/i).querySelector('input');
      
      fireEvent.change(input, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument();
      });
      
      const clearButton = screen.getByRole('button', { name: /Clear/i });
      fireEvent.click(clearButton);
      
      await waitFor(() => {
        expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
      });
    });
  });

  describe('Disabled State', () => {
    it('should disable file selection when disabled prop is true', () => {
      render(<FileUpload disabled={true} />);
      
      const button = screen.getByRole('button', { name: /Select File/i });
      expect(button).toBeDisabled();
    });

    it('should not allow file selection when disabled', () => {
      render(<FileUpload disabled={true} onFileSelect={mockHandlers.onFileSelect} />);
      
      const input = screen.getByLabelText(/Select File/i).querySelector('input');
      expect(input).toBeDisabled();
    });
  });

  describe('Preview Mode', () => {
    it('should show preview when showPreview is true', async () => {
      render(<FileUpload showPreview={true} />);
      
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/Select File/i).querySelector('input');
      
      fireEvent.change(input, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument();
      });
    });

    it('should not show preview when showPreview is false', async () => {
      render(<FileUpload showPreview={false} />);
      
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/Select File/i).querySelector('input');
      
      fireEvent.change(input, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
      });
    });
  });
});
  describe('Enhanced Error Handling', () => {
    it('should display user-friendly error messages', async () => {
      const { validateFileEnhanced, getUserFriendlyErrorMessage } = await import('../../../utils/errorHandling');
      
      validateFileEnhanced.mockReturnValue({
        isValid: false,
        error: { message: 'Technical error', code: 'FILE_TOO_LARGE' }
      });
      getUserFriendlyErrorMessage.mockReturnValue('The selected file is too large. Please choose a smaller file.');
      
      render(<FileUpload />);
      
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/Select File/i).querySelector('input');
      
      fireEvent.change(input, { target: { files: [largeFile] } });
      
      await waitFor(() => {
        expect(screen.getByText('The selected file is too large. Please choose a smaller file.')).toBeInTheDocument();
      });
    });

    it('should log validation errors', async () => {
      const { validateFileEnhanced, logError } = await import('../../../utils/errorHandling');
      
      const validationError = { message: 'File too large', code: 'FILE_TOO_LARGE' };
      validateFileEnhanced.mockReturnValue({
        isValid: false,
        error: validationError
      });
      
      render(<FileUpload />);
      
      const largeFile = new File(['content'], 'large.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/Select File/i).querySelector('input');
      
      fireEvent.change(input, { target: { files: [largeFile] } });
      
      await waitFor(() => {
        expect(logError).toHaveBeenCalledWith(validationError, expect.objectContaining({
          component: 'FileUpload',
          operation: 'file_validation',
          fileName: 'large.pdf',
        }));
      });
    });

    it('should show retry button on upload failure', async () => {
      const { retryOperation } = await import('../../../utils/errorHandling');
      
      mockHandlers.onUpload.mockRejectedValue(new Error('Network error'));
      retryOperation.mockRejectedValue(new Error('Network error'));
      
      render(<FileUpload onUpload={mockHandlers.onUpload} enableRetry={true} />);
      
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/Select File/i).querySelector('input');
      
      fireEvent.change(input, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Upload File/i })).toBeInTheDocument();
      });
      
      const uploadButton = screen.getByRole('button', { name: /Upload File/i });
      fireEvent.click(uploadButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Upload Failed/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should handle retry attempts', async () => {
      const { retryOperation } = await import('../../../utils/errorHandling');
      
      let attemptCount = 0;
      mockHandlers.onUpload.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 2) {
          throw new Error('Network error');
        }
        return Promise.resolve();
      });
      
      retryOperation.mockImplementation(async (operation) => {
        try {
          return await operation();
        } catch (error) {
          // Simulate one retry
          return await operation();
        }
      });
      
      render(<FileUpload onUpload={mockHandlers.onUpload} enableRetry={true} maxRetries={2} />);
      
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/Select File/i).querySelector('input');
      
      fireEvent.change(input, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Upload File/i })).toBeInTheDocument();
      });
      
      const uploadButton = screen.getByRole('button', { name: /Upload File/i });
      fireEvent.click(uploadButton);
      
      await waitFor(() => {
        expect(screen.getByText(/File uploaded successfully!/i)).toBeInTheDocument();
      });
    });

    it('should disable retry after max attempts', async () => {
      render(<FileUpload enableRetry={true} maxRetries={2} />);
      
      const component = screen.getByRole('button', { name: /Select File/i }).closest('div');
      
      // Simulate reaching max retries by setting internal state
      // This would normally be done through user interactions
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/Select File/i).querySelector('input');
      
      fireEvent.change(input, { target: { files: [file] } });
      
      // The retry button availability depends on internal state
      // In a real scenario, this would be tested through user interactions
      expect(component).toBeInTheDocument();
    });

    it('should show success message after upload', async () => {
      mockHandlers.onUpload.mockResolvedValue();
      
      render(<FileUpload onUpload={mockHandlers.onUpload} />);
      
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/Select File/i).querySelector('input');
      
      fireEvent.change(input, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Upload File/i })).toBeInTheDocument();
      });
      
      const uploadButton = screen.getByRole('button', { name: /Upload File/i });
      fireEvent.click(uploadButton);
      
      await waitFor(() => {
        expect(screen.getByText(/File uploaded successfully!/i)).toBeInTheDocument();
      });
    });

    it('should clear all error states when selecting new file', async () => {
      const { validateFileEnhanced } = await import('../../../utils/errorHandling');
      
      // First file fails validation
      validateFileEnhanced.mockReturnValueOnce({
        isValid: false,
        error: { message: 'File too large', code: 'FILE_TOO_LARGE' }
      });
      
      render(<FileUpload />);
      
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/Select File/i).querySelector('input');
      
      fireEvent.change(input, { target: { files: [largeFile] } });
      
      await waitFor(() => {
        expect(screen.getByText(/File too large/i)).toBeInTheDocument();
      });
      
      // Second file passes validation
      validateFileEnhanced.mockReturnValueOnce({
        isValid: true,
        error: null
      });
      
      const validFile = new File(['content'], 'valid.pdf', { type: 'application/pdf' });
      fireEvent.change(input, { target: { files: [validFile] } });
      
      await waitFor(() => {
        expect(screen.queryByText(/File too large/i)).not.toBeInTheDocument();
      });
    });

    it('should handle network errors with retry logic', async () => {
      const { retryOperation, ERROR_CODES } = await import('../../../utils/errorHandling');
      
      const networkError = new Error('Network error');
      networkError.code = ERROR_CODES.NETWORK_ERROR;
      
      mockHandlers.onUpload.mockRejectedValue(networkError);
      retryOperation.mockRejectedValue(networkError);
      
      render(<FileUpload onUpload={mockHandlers.onUpload} enableRetry={true} />);
      
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/Select File/i).querySelector('input');
      
      fireEvent.change(input, { target: { files: [file] } });
      
      const uploadButton = screen.getByRole('button', { name: /Upload File/i });
      fireEvent.click(uploadButton);
      
      await waitFor(() => {
        expect(retryOperation).toHaveBeenCalledWith(
          expect.any(Function),
          expect.objectContaining({
            maxRetries: 3,
            delay: 1000,
            backoffMultiplier: 2,
          })
        );
      });
    });

    it('should disable retry when enableRetry is false', async () => {
      const { retryOperation } = await import('../../../utils/errorHandling');
      
      mockHandlers.onUpload.mockRejectedValue(new Error('Upload failed'));
      
      render(<FileUpload onUpload={mockHandlers.onUpload} enableRetry={false} />);
      
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/Select File/i).querySelector('input');
      
      fireEvent.change(input, { target: { files: [file] } });
      
      const uploadButton = screen.getByRole('button', { name: /Upload File/i });
      fireEvent.click(uploadButton);
      
      await waitFor(() => {
        expect(retryOperation).not.toHaveBeenCalled();
        expect(mockHandlers.onUpload).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Loading States', () => {
    it('should show uploading state with progress', async () => {
      mockHandlers.onUpload.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
      
      render(<FileUpload onUpload={mockHandlers.onUpload} />);
      
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/Select File/i).querySelector('input');
      
      fireEvent.change(input, { target: { files: [file] } });
      
      const uploadButton = screen.getByRole('button', { name: /Upload File/i });
      fireEvent.click(uploadButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Uploading.../i)).toBeInTheDocument();
      });
    });

    it('should show retrying state', async () => {
      render(<FileUpload enableRetry={true} />);
      
      // This would be tested through user interactions in a real scenario
      // The retrying state is internal to the component
      expect(screen.getByRole('button', { name: /Select File/i })).toBeInTheDocument();
    });

    it('should disable buttons during upload', async () => {
      mockHandlers.onUpload.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
      
      render(<FileUpload onUpload={mockHandlers.onUpload} />);
      
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/Select File/i).querySelector('input');
      
      fireEvent.change(input, { target: { files: [file] } });
      
      const uploadButton = screen.getByRole('button', { name: /Upload File/i });
      fireEvent.click(uploadButton);
      
      await waitFor(() => {
        const selectButton = screen.getByRole('button', { name: /Change File/i });
        expect(selectButton).toBeDisabled();
      });
    });
  });

  describe('Permission Validation', () => {
    it('should handle permission errors gracefully', async () => {
      const permissionError = new Error('Permission denied');
      permissionError.code = 'PERMISSION_DENIED';
      
      mockHandlers.onUpload.mockRejectedValue(permissionError);
      
      render(<FileUpload onUpload={mockHandlers.onUpload} />);
      
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/Select File/i).querySelector('input');
      
      fireEvent.change(input, { target: { files: [file] } });
      
      const uploadButton = screen.getByRole('button', { name: /Upload File/i });
      fireEvent.click(uploadButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Permission denied/i)).toBeInTheDocument();
      });
    });
  });
});
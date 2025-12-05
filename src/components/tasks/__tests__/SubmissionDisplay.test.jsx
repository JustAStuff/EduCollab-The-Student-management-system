import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SubmissionDisplay from '../SubmissionDisplay';

// Mock the fileUtils
vi.mock('../../../utils/fileUtils', () => ({
  formatFileSize: vi.fn((bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }),
  getFileIcon: vi.fn((filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'pdf') return 'PictureAsPdf';
    if (['doc', 'docx'].includes(ext)) return 'Description';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return 'Image';
    return 'AttachFile';
  }),
}));

describe('SubmissionDisplay Component', () => {
  const mockProps = {
    fileName: 'report.pdf',
    fileUrl: 'path/to/report.pdf',
    fileSize: 1024 * 1024, // 1MB
    submittedAt: '2024-01-15T10:30:00Z',
    submitterName: 'John Doe',
    taskTitle: 'Complete Report',
  };

  const mockHandlers = {
    onDownload: vi.fn(),
    onView: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering - Full Mode', () => {
    it('should render file name', () => {
      render(<SubmissionDisplay {...mockProps} />);
      
      expect(screen.getByText('report.pdf')).toBeInTheDocument();
    });

    it('should render file size', () => {
      render(<SubmissionDisplay {...mockProps} />);
      
      expect(screen.getByText(/Size: 1.00 MB/i)).toBeInTheDocument();
    });

    it('should render submission date', () => {
      render(<SubmissionDisplay {...mockProps} />);
      
      expect(screen.getByText(/Submitted:/i)).toBeInTheDocument();
    });

    it('should render submitter name', () => {
      render(<SubmissionDisplay {...mockProps} />);
      
      expect(screen.getByText(/By: John Doe/i)).toBeInTheDocument();
    });

    it('should render task title', () => {
      render(<SubmissionDisplay {...mockProps} />);
      
      expect(screen.getByText(/Task: Complete Report/i)).toBeInTheDocument();
    });

    it('should render appropriate file icon for PDF', () => {
      const { container } = render(<SubmissionDisplay {...mockProps} />);
      
      // Check for PDF icon (PictureAsPdf component)
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should render appropriate file icon for images', () => {
      const imageProps = { ...mockProps, fileName: 'photo.jpg' };
      const { container } = render(<SubmissionDisplay {...imageProps} />);
      
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Rendering - Compact Mode', () => {
    it('should render in compact mode', () => {
      render(<SubmissionDisplay {...mockProps} compact={true} />);
      
      expect(screen.getByText('report.pdf')).toBeInTheDocument();
    });

    it('should not render full metadata in compact mode', () => {
      render(<SubmissionDisplay {...mockProps} compact={true} />);
      
      expect(screen.queryByText(/Submitted:/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/By: John Doe/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Task:/i)).not.toBeInTheDocument();
    });

    it('should show file size in compact mode', () => {
      render(<SubmissionDisplay {...mockProps} compact={true} />);
      
      expect(screen.getByText(/1.00 MB/i)).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should show view and download buttons when showActions is true', () => {
      render(
        <SubmissionDisplay
          {...mockProps}
          showActions={true}
          onView={mockHandlers.onView}
          onDownload={mockHandlers.onDownload}
        />
      );
      
      expect(screen.getByRole('button', { name: /View/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Download/i })).toBeInTheDocument();
    });

    it('should not show action buttons when showActions is false', () => {
      render(
        <SubmissionDisplay
          {...mockProps}
          showActions={false}
          onView={mockHandlers.onView}
          onDownload={mockHandlers.onDownload}
        />
      );
      
      expect(screen.queryByRole('button', { name: /View/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Download/i })).not.toBeInTheDocument();
    });

    it('should only show view button for previewable files', () => {
      render(
        <SubmissionDisplay
          {...mockProps}
          fileName="report.pdf"
          onView={mockHandlers.onView}
          onDownload={mockHandlers.onDownload}
        />
      );
      
      expect(screen.getByRole('button', { name: /View/i })).toBeInTheDocument();
    });

    it('should not show view button for non-previewable files', () => {
      render(
        <SubmissionDisplay
          {...mockProps}
          fileName="data.csv"
          onView={mockHandlers.onView}
          onDownload={mockHandlers.onDownload}
        />
      );
      
      expect(screen.queryByRole('button', { name: /View/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Download/i })).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onDownload when download button is clicked', async () => {
      mockHandlers.onDownload.mockResolvedValue();
      render(
        <SubmissionDisplay
          {...mockProps}
          onDownload={mockHandlers.onDownload}
        />
      );
      
      const downloadButton = screen.getByRole('button', { name: /Download/i });
      fireEvent.click(downloadButton);
      
      await waitFor(() => {
        expect(mockHandlers.onDownload).toHaveBeenCalledWith('path/to/report.pdf', 'report.pdf');
      });
    });

    it('should call onView when view button is clicked', async () => {
      mockHandlers.onView.mockResolvedValue();
      render(
        <SubmissionDisplay
          {...mockProps}
          onView={mockHandlers.onView}
        />
      );
      
      const viewButton = screen.getByRole('button', { name: /View/i });
      fireEvent.click(viewButton);
      
      await waitFor(() => {
        expect(mockHandlers.onView).toHaveBeenCalledWith('path/to/report.pdf', 'report.pdf');
      });
    });

    it('should show loading state during download', async () => {
      mockHandlers.onDownload.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 500)));
      render(
        <SubmissionDisplay
          {...mockProps}
          onDownload={mockHandlers.onDownload}
        />
      );
      
      const downloadButton = screen.getByRole('button', { name: /Download/i });
      fireEvent.click(downloadButton);
      
      await waitFor(() => {
        expect(downloadButton).toBeDisabled();
      });
    });

    it('should show loading state during view', async () => {
      mockHandlers.onView.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 500)));
      render(
        <SubmissionDisplay
          {...mockProps}
          onView={mockHandlers.onView}
        />
      );
      
      const viewButton = screen.getByRole('button', { name: /View/i });
      fireEvent.click(viewButton);
      
      await waitFor(() => {
        expect(viewButton).toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message on download failure', async () => {
      mockHandlers.onDownload.mockRejectedValue(new Error('Download failed'));
      render(
        <SubmissionDisplay
          {...mockProps}
          onDownload={mockHandlers.onDownload}
        />
      );
      
      const downloadButton = screen.getByRole('button', { name: /Download/i });
      fireEvent.click(downloadButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to download file/i)).toBeInTheDocument();
      });
    });

    it('should display error message on view failure', async () => {
      mockHandlers.onView.mockRejectedValue(new Error('View failed'));
      render(
        <SubmissionDisplay
          {...mockProps}
          onView={mockHandlers.onView}
        />
      );
      
      const viewButton = screen.getByRole('button', { name: /View/i });
      fireEvent.click(viewButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to view file/i)).toBeInTheDocument();
      });
    });

    it('should allow dismissing error message', async () => {
      mockHandlers.onDownload.mockRejectedValue(new Error('Download failed'));
      render(
        <SubmissionDisplay
          {...mockProps}
          onDownload={mockHandlers.onDownload}
        />
      );
      
      const downloadButton = screen.getByRole('button', { name: /Download/i });
      fireEvent.click(downloadButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to download file/i)).toBeInTheDocument();
      });
      
      const closeButton = screen.getByRole('button', { name: '' }); // Close icon button
      fireEvent.click(closeButton);
      
      await waitFor(() => {
        expect(screen.queryByText(/Failed to download file/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Compact Mode Actions', () => {
    it('should show icon buttons in compact mode', () => {
      render(
        <SubmissionDisplay
          {...mockProps}
          compact={true}
          onView={mockHandlers.onView}
          onDownload={mockHandlers.onDownload}
        />
      );
      
      // In compact mode, buttons are icon buttons with tooltips
      expect(screen.getByLabelText(/View/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Download/i)).toBeInTheDocument();
    });

    it('should call handlers from compact mode buttons', async () => {
      mockHandlers.onDownload.mockResolvedValue();
      render(
        <SubmissionDisplay
          {...mockProps}
          compact={true}
          onDownload={mockHandlers.onDownload}
        />
      );
      
      const downloadButton = screen.getByLabelText(/Download/i);
      fireEvent.click(downloadButton);
      
      await waitFor(() => {
        expect(mockHandlers.onDownload).toHaveBeenCalled();
      });
    });
  });

  describe('Optional Props', () => {
    it('should render without optional metadata', () => {
      render(
        <SubmissionDisplay
          fileName="report.pdf"
          fileUrl="path/to/report.pdf"
        />
      );
      
      expect(screen.getByText('report.pdf')).toBeInTheDocument();
      expect(screen.queryByText(/Size:/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Submitted:/i)).not.toBeInTheDocument();
    });

    it('should render without action handlers', () => {
      render(
        <SubmissionDisplay
          fileName="report.pdf"
          fileUrl="path/to/report.pdf"
          showActions={false}
        />
      );
      
      expect(screen.getByText('report.pdf')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });
});

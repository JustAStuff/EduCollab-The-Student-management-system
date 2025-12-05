// SubmissionsGallery.test.jsx - Tests for submissions gallery component
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import SubmissionsGallery from '../SubmissionsGallery';
import { supabase } from '../../../supabaseClient';

// Mock supabase
vi.mock('../../../supabaseClient', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        download: vi.fn(),
        createSignedUrl: vi.fn()
      }))
    },
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn()
      }))
    })),
    removeChannel: vi.fn()
  }
}));

describe('SubmissionsGallery', () => {
  const mockWorkspaceId = 'workspace-123';
  const mockSubmissions = [
    {
      id: 'sub-1',
      task_id: 'task-1',
      workspace_id: mockWorkspaceId,
      submitted_by: 'user-1',
      submitter_name: 'John Doe',
      task_title: 'Complete Project Report',
      file_url: 'workspace-123/task-1/user-1_123456.pdf',
      file_name: 'report.pdf',
      file_size: 1024000,
      submitted_at: '2024-01-15T10:00:00Z',
      status: 'under_review'
    },
    {
      id: 'sub-2',
      task_id: 'task-2',
      workspace_id: mockWorkspaceId,
      submitted_by: 'user-2',
      submitter_name: 'Jane Smith',
      task_title: 'Design Mockups',
      file_url: 'workspace-123/task-2/user-2_123457.png',
      file_name: 'mockup.png',
      file_size: 2048000,
      submitted_at: '2024-01-16T11:00:00Z',
      status: 'approved'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render empty state when no submissions', () => {
      render(
        <SubmissionsGallery
          workspaceId={mockWorkspaceId}
          submissions={[]}
        />
      );

      expect(screen.getByText(/No submissions yet/i)).toBeInTheDocument();
    });

    it('should render all submissions', () => {
      render(
        <SubmissionsGallery
          workspaceId={mockWorkspaceId}
          submissions={mockSubmissions}
        />
      );

      expect(screen.getByText('report.pdf')).toBeInTheDocument();
      expect(screen.getByText('mockup.png')).toBeInTheDocument();
    });

    it('should display submitter names', () => {
      render(
        <SubmissionsGallery
          workspaceId={mockWorkspaceId}
          submissions={mockSubmissions}
        />
      );

      expect(screen.getByText(/By: John Doe/i)).toBeInTheDocument();
      expect(screen.getByText(/By: Jane Smith/i)).toBeInTheDocument();
    });

    it('should display task titles', () => {
      render(
        <SubmissionsGallery
          workspaceId={mockWorkspaceId}
          submissions={mockSubmissions}
        />
      );

      expect(screen.getByText(/Task: Complete Project Report/i)).toBeInTheDocument();
      expect(screen.getByText(/Task: Design Mockups/i)).toBeInTheDocument();
    });

    it('should display file sizes', () => {
      render(
        <SubmissionsGallery
          workspaceId={mockWorkspaceId}
          submissions={mockSubmissions}
        />
      );

      expect(screen.getByText('1000 KB')).toBeInTheDocument();
      expect(screen.getByText('1.95 MB')).toBeInTheDocument();
    });

    it('should display submission status', () => {
      render(
        <SubmissionsGallery
          workspaceId={mockWorkspaceId}
          submissions={mockSubmissions}
        />
      );

      expect(screen.getByText('Under Review')).toBeInTheDocument();
      expect(screen.getByText('Approved')).toBeInTheDocument();
    });

    it('should display submission dates', () => {
      render(
        <SubmissionsGallery
          workspaceId={mockWorkspaceId}
          submissions={mockSubmissions}
        />
      );

      expect(screen.getByText('15/1/2024')).toBeInTheDocument();
      expect(screen.getByText('16/1/2024')).toBeInTheDocument();
    });
  });

  describe('File Icons', () => {
    it('should display PDF icon for PDF files', () => {
      const pdfSubmission = [{
        ...mockSubmissions[0],
        file_name: 'document.pdf'
      }];

      const { container } = render(
        <SubmissionsGallery
          workspaceId={mockWorkspaceId}
          submissions={pdfSubmission}
        />
      );

      // Check for PDF icon (PictureAsPdf component)
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should display image icon for image files', () => {
      const imageSubmission = [{
        ...mockSubmissions[0],
        file_name: 'photo.jpg'
      }];

      const { container } = render(
        <SubmissionsGallery
          workspaceId={mockWorkspaceId}
          submissions={imageSubmission}
        />
      );

      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should display document icon for doc files', () => {
      const docSubmission = [{
        ...mockSubmissions[0],
        file_name: 'document.docx'
      }];

      const { container } = render(
        <SubmissionsGallery
          workspaceId={mockWorkspaceId}
          submissions={docSubmission}
        />
      );

      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('File Download', () => {
    it('should download file when download button clicked', async () => {
      const mockBlob = new Blob(['test content'], { type: 'application/pdf' });
      const mockDownload = vi.fn().mockResolvedValue({ data: mockBlob, error: null });
      
      supabase.storage.from.mockReturnValue({
        download: mockDownload
      });

      // Mock URL.createObjectURL and related functions
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = vi.fn();
      
      // Mock document.createElement and appendChild
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn()
      };
      const originalCreateElement = document.createElement.bind(document);
      document.createElement = vi.fn((tag) => {
        if (tag === 'a') return mockLink;
        return originalCreateElement(tag);
      });
      document.body.appendChild = vi.fn();
      document.body.removeChild = vi.fn();

      render(
        <SubmissionsGallery
          workspaceId={mockWorkspaceId}
          submissions={mockSubmissions}
        />
      );

      const downloadButtons = screen.getAllByTitle('Download');
      fireEvent.click(downloadButtons[0]);

      await waitFor(() => {
        expect(mockDownload).toHaveBeenCalledWith(mockSubmissions[0].file_url);
      });

      await waitFor(() => {
        expect(mockLink.click).toHaveBeenCalled();
      });

      // Cleanup
      document.createElement = originalCreateElement;
    });

    it('should show error message when download fails', async () => {
      const mockDownload = vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Download failed')
      });
      
      supabase.storage.from.mockReturnValue({
        download: mockDownload
      });

      render(
        <SubmissionsGallery
          workspaceId={mockWorkspaceId}
          submissions={mockSubmissions}
        />
      );

      const downloadButtons = screen.getAllByTitle('Download');
      fireEvent.click(downloadButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Failed to download file/i)).toBeInTheDocument();
      });
    });
  });

  describe('File View', () => {
    it('should open file in new tab when view button clicked', async () => {
      const mockCreateSignedUrl = vi.fn().mockResolvedValue({
        data: { signedUrl: 'https://example.com/signed-url' },
        error: null
      });
      
      supabase.storage.from.mockReturnValue({
        createSignedUrl: mockCreateSignedUrl
      });

      global.open = vi.fn();

      render(
        <SubmissionsGallery
          workspaceId={mockWorkspaceId}
          submissions={mockSubmissions}
        />
      );

      const viewButtons = screen.getAllByTitle('View');
      fireEvent.click(viewButtons[0]);

      await waitFor(() => {
        expect(mockCreateSignedUrl).toHaveBeenCalledWith(
          mockSubmissions[0].file_url,
          3600
        );
      });

      await waitFor(() => {
        expect(global.open).toHaveBeenCalledWith(
          'https://example.com/signed-url',
          '_blank'
        );
      });
    });

    it('should show error for non-viewable file formats', async () => {
      const nonViewableSubmission = [{
        ...mockSubmissions[0],
        file_name: 'document.docx'
      }];

      render(
        <SubmissionsGallery
          workspaceId={mockWorkspaceId}
          submissions={nonViewableSubmission}
        />
      );

      const viewButtons = screen.getAllByTitle('View');
      fireEvent.click(viewButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/This file format cannot be previewed/i)).toBeInTheDocument();
      });
    });

    it('should show error message when view fails', async () => {
      const mockCreateSignedUrl = vi.fn().mockResolvedValue({
        data: null,
        error: new Error('View failed')
      });
      
      supabase.storage.from.mockReturnValue({
        createSignedUrl: mockCreateSignedUrl
      });

      render(
        <SubmissionsGallery
          workspaceId={mockWorkspaceId}
          submissions={mockSubmissions}
        />
      );

      const viewButtons = screen.getAllByTitle('View');
      fireEvent.click(viewButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Failed to view file/i)).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should set up real-time subscription on mount', () => {
      const mockSubscribe = vi.fn();
      const mockOn = vi.fn(() => ({ subscribe: mockSubscribe }));
      const mockChannel = vi.fn(() => ({ on: mockOn }));
      
      supabase.channel = mockChannel;

      render(
        <SubmissionsGallery
          workspaceId={mockWorkspaceId}
          submissions={mockSubmissions}
        />
      );

      expect(mockChannel).toHaveBeenCalledWith(`workspace-submissions-${mockWorkspaceId}`);
      expect(mockOn).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `workspace_id=eq.${mockWorkspaceId}`
        }),
        expect.any(Function)
      );
      expect(mockSubscribe).toHaveBeenCalled();
    });

    it('should call onRefresh when submission is added', () => {
      const mockOnRefresh = vi.fn();
      let changeHandler;
      
      const mockSubscribe = vi.fn();
      const mockOn = vi.fn((event, config, handler) => {
        changeHandler = handler;
        return { subscribe: mockSubscribe };
      });
      const mockChannel = vi.fn(() => ({ on: mockOn }));
      
      supabase.channel = mockChannel;

      render(
        <SubmissionsGallery
          workspaceId={mockWorkspaceId}
          submissions={mockSubmissions}
          onRefresh={mockOnRefresh}
        />
      );

      // Simulate a new submission
      changeHandler({
        new: { submission_file_url: 'new-file.pdf' },
        old: {}
      });

      expect(mockOnRefresh).toHaveBeenCalled();
    });

    it('should cleanup subscription on unmount', () => {
      const mockRemoveChannel = vi.fn();
      supabase.removeChannel = mockRemoveChannel;

      const { unmount } = render(
        <SubmissionsGallery
          workspaceId={mockWorkspaceId}
          submissions={mockSubmissions}
        />
      );

      unmount();

      expect(mockRemoveChannel).toHaveBeenCalled();
    });
  });

  describe('Status Display', () => {
    it('should display correct status colors', () => {
      const submissionsWithStatuses = [
        { ...mockSubmissions[0], status: 'approved' },
        { ...mockSubmissions[1], status: 'needs_revision' },
        { ...mockSubmissions[0], id: 'sub-3', status: 'under_review' }
      ];

      render(
        <SubmissionsGallery
          workspaceId={mockWorkspaceId}
          submissions={submissionsWithStatuses}
        />
      );

      expect(screen.getByText('Approved')).toBeInTheDocument();
      expect(screen.getByText('Needs Revision')).toBeInTheDocument();
      expect(screen.getByText('Under Review')).toBeInTheDocument();
    });
  });

  describe('Responsive Layout', () => {
    it('should render in grid layout', () => {
      const { container } = render(
        <SubmissionsGallery
          workspaceId={mockWorkspaceId}
          submissions={mockSubmissions}
        />
      );

      const grid = container.querySelector('.MuiGrid-container');
      expect(grid).toBeInTheDocument();
    });

    it('should render submission cards', () => {
      const { container } = render(
        <SubmissionsGallery
          workspaceId={mockWorkspaceId}
          submissions={mockSubmissions}
        />
      );

      const papers = container.querySelectorAll('.MuiPaper-root');
      expect(papers.length).toBeGreaterThanOrEqual(mockSubmissions.length);
    });
  });

  describe('Error Handling', () => {
    it('should display and dismiss error messages', async () => {
      const mockDownload = vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Download failed')
      });
      
      supabase.storage.from.mockReturnValue({
        download: mockDownload
      });

      render(
        <SubmissionsGallery
          workspaceId={mockWorkspaceId}
          submissions={mockSubmissions}
        />
      );

      const downloadButtons = screen.getAllByTitle('Download');
      fireEvent.click(downloadButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Failed to download file/i)).toBeInTheDocument();
      });

      // Find and click the close button on the alert
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText(/Failed to download file/i)).not.toBeInTheDocument();
      });
    });
  });
});

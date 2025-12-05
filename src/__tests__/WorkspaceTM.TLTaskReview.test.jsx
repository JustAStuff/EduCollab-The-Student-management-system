/**
 * Test suite for TL task review functionality in WorkspaceTM
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import WorkspaceTM from '../WorkspaceTM';

// Mock the supabase client
vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() => Promise.resolve({
        data: { user: { id: 'user-123', email: 'member@test.com' } }
      }))
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: { id: 'workspace-1', name: 'Test Workspace', created_by: 'owner-123' }
          })),
          order: vi.fn(() => Promise.resolve({
            data: [
              {
                id: 'tl-task-1',
                title: 'TL Task Needing Review',
                status: 'submitted',
                assigned_to: 'owner-123',
                workspace_id: 'workspace-1',
                submission_file_url: 'path/to/file.pdf',
                submission_file_name: 'report.pdf',
                submitted_at: '2024-01-01T10:00:00Z'
              }
            ]
          }))
        }))
      }))
    })),
    storage: {
      from: vi.fn(() => ({
        getPublicUrl: vi.fn(() => ({
          data: { publicUrl: 'https://example.com/file.pdf' }
        }))
      }))
    }
  }
}));

// Mock the services
vi.mock('../services/TaskService', () => ({
  submitReview: vi.fn(() => Promise.resolve({ success: true }))
}));

// Mock the hooks
vi.mock('../hooks/useRealTimeUpdates', () => ({
  default: vi.fn()
}));

vi.mock('../hooks/useDebounce', () => ({
  default: vi.fn((value) => value)
}));

vi.mock('../hooks/useOptimisticUpdate', () => ({
  default: vi.fn((data) => ({
    data,
    performOptimisticUpdate: vi.fn()
  }))
}));

// Mock the components
vi.mock('../components/tasks/TaskCard', () => ({
  default: ({ task, onReview, onViewSubmission, onDownloadSubmission }) => (
    <div data-testid={`task-card-${task.id}`}>
      <h3>{task.title}</h3>
      <span>Status: {task.status}</span>
      {onReview && (
        <div>
          <button onClick={() => onReview(task.id, 'approve')}>
            Approve
          </button>
          <button onClick={() => onReview(task.id, 'request_redo')}>
            Request Redo
          </button>
        </div>
      )}
      {onViewSubmission && (
        <button onClick={() => onViewSubmission(task)}>
          View
        </button>
      )}
      {onDownloadSubmission && (
        <button onClick={() => onDownloadSubmission(task)}>
          Download
        </button>
      )}
    </div>
  )
}));

vi.mock('../components/tasks/ReviewDialog', () => ({
  default: ({ open, task, onClose, onSubmit }) => (
    open ? (
      <div data-testid="review-dialog">
        <h3>Review Task: {task?.title}</h3>
        <button onClick={() => onSubmit('Needs improvement')}>
          Submit Review
        </button>
        <button onClick={onClose}>
          Close
        </button>
      </div>
    ) : null
  )
}));

vi.mock('../Sidebar', () => ({
  default: () => <div data-testid="sidebar">Sidebar</div>
}));

vi.mock('../components/layout/LayoutContainer', () => ({
  default: ({ children }) => <div data-testid="layout-container">{children}</div>
}));

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'workspace-1' })
  };
});

describe('WorkspaceTM TL Task Review', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should display TL tasks needing review', async () => {
    render(
      <BrowserRouter>
        <WorkspaceTM />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Team Lead Tasks for Review (1)')).toBeInTheDocument();
    });

    expect(screen.getByText('TL Task Needing Review')).toBeInTheDocument();
    expect(screen.getByTestId('task-card-tl-task-1')).toBeInTheDocument();
  });

  test('should show review buttons for TL tasks', async () => {
    render(
      <BrowserRouter>
        <WorkspaceTM />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Approve')).toBeInTheDocument();
      expect(screen.getByText('Request Redo')).toBeInTheDocument();
    });
  });

  test('should handle task approval', async () => {
    const { submitReview } = await import('../services/TaskService');
    
    render(
      <BrowserRouter>
        <WorkspaceTM />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Approve')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Approve'));

    await waitFor(() => {
      expect(submitReview).toHaveBeenCalledWith('tl-task-1', 'approve', null);
    });
  });

  test('should open review dialog for request redo', async () => {
    render(
      <BrowserRouter>
        <WorkspaceTM />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Request Redo')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Request Redo'));

    await waitFor(() => {
      expect(screen.getByTestId('review-dialog')).toBeInTheDocument();
      expect(screen.getByText('Review Task: TL Task Needing Review')).toBeInTheDocument();
    });
  });

  test('should handle review submission with comments', async () => {
    const { submitReview } = await import('../services/TaskService');
    
    render(
      <BrowserRouter>
        <WorkspaceTM />
      </BrowserRouter>
    );

    // Open review dialog
    await waitFor(() => {
      expect(screen.getByText('Request Redo')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Request Redo'));

    await waitFor(() => {
      expect(screen.getByTestId('review-dialog')).toBeInTheDocument();
    });

    // Submit review with comments
    fireEvent.click(screen.getByText('Submit Review'));

    await waitFor(() => {
      expect(submitReview).toHaveBeenCalledWith('tl-task-1', 'request_redo', 'Needs improvement');
    });
  });

  test('should handle file viewing and downloading', async () => {
    // Mock window.open
    const mockOpen = vi.fn();
    Object.defineProperty(window, 'open', { value: mockOpen });

    // Mock document.createElement for download
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn()
    };
    const mockCreateElement = vi.fn(() => mockLink);
    Object.defineProperty(document, 'createElement', { value: mockCreateElement });

    render(
      <BrowserRouter>
        <WorkspaceTM />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('View')).toBeInTheDocument();
      expect(screen.getByText('Download')).toBeInTheDocument();
    });

    // Test file viewing
    fireEvent.click(screen.getByText('View'));
    expect(mockOpen).toHaveBeenCalledWith('https://example.com/file.pdf', '_blank');

    // Test file downloading
    fireEvent.click(screen.getByText('Download'));
    expect(mockCreateElement).toHaveBeenCalledWith('a');
    expect(mockLink.href).toBe('https://example.com/file.pdf');
    expect(mockLink.download).toBe('report.pdf');
    expect(mockLink.click).toHaveBeenCalled();
  });

  test('should show info message about TL task review', async () => {
    render(
      <BrowserRouter>
        <WorkspaceTM />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('These are tasks submitted by your Team Lead that need peer review and approval.')).toBeInTheDocument();
    });
  });
});
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TaskCard from '../TaskCard';

describe('TaskCard Component', () => {
  const mockTask = {
    id: 'task-1',
    title: 'Test Task',
    description: 'Test description',
    status: 'todo',
    created_at: '2024-01-01T00:00:00Z',
    assigned_by_user: {
      full_name: 'John Doe',
      email: 'john@example.com',
    },
  };

  const mockHandlers = {
    onStatusChange: vi.fn(),
    onUpload: vi.fn(),
    onReview: vi.fn(),
    onRevoke: vi.fn(),
    onDeleteSubmission: vi.fn(),
    onReuploadSubmission: vi.fn(),
    onViewSubmission: vi.fn(),
    onDownloadSubmission: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render task title and description', () => {
      render(<TaskCard task={mockTask} />);
      
      expect(screen.getByText('Test Task')).toBeInTheDocument();
      expect(screen.getByText('Test description')).toBeInTheDocument();
    });

    it('should render task metadata', () => {
      render(<TaskCard task={mockTask} />);
      
      expect(screen.getByText(/Created:/)).toBeInTheDocument();
      expect(screen.getByText(/Assigned by: John Doe/)).toBeInTheDocument();
    });

    it('should render status badge with correct color', () => {
      const { rerender } = render(<TaskCard task={mockTask} />);
      expect(screen.getByText('To Do')).toBeInTheDocument();

      rerender(<TaskCard task={{ ...mockTask, status: 'in_progress' }} />);
      expect(screen.getByText('In Progress')).toBeInTheDocument();

      rerender(<TaskCard task={{ ...mockTask, status: 'completed' }} />);
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });
  });

  describe('Status-based Actions', () => {
    it('should show "Start Task" button for todo status', () => {
      render(<TaskCard task={mockTask} onStatusChange={mockHandlers.onStatusChange} />);
      
      const button = screen.getByRole('button', { name: /Start Task/i });
      expect(button).toBeInTheDocument();
      expect(button).not.toBeDisabled();
    });

    it('should show "Upload Result" button for in_progress status', () => {
      const inProgressTask = { ...mockTask, status: 'in_progress' };
      render(<TaskCard task={inProgressTask} onUpload={mockHandlers.onUpload} />);
      
      const button = screen.getByRole('button', { name: /Upload Result/i });
      expect(button).toBeInTheDocument();
      expect(button).not.toBeDisabled();
    });

    it('should show disabled "Under Review" button for submitted status', () => {
      const submittedTask = { ...mockTask, status: 'submitted' };
      render(<TaskCard task={submittedTask} />);
      
      const button = screen.getByRole('button', { name: /Under Review/i });
      expect(button).toBeInTheDocument();
      expect(button).toBeDisabled();
    });

    it('should show "Re-submit" button for needs_revision status', () => {
      const revisionTask = { ...mockTask, status: 'needs_revision' };
      render(<TaskCard task={revisionTask} onUpload={mockHandlers.onUpload} />);
      
      const button = screen.getByRole('button', { name: /Re-submit/i });
      expect(button).toBeInTheDocument();
      expect(button).not.toBeDisabled();
    });

    it('should show disabled "Completed" button for completed status', () => {
      const completedTask = { ...mockTask, status: 'completed' };
      render(<TaskCard task={completedTask} />);
      
      const button = screen.getByRole('button', { name: /Completed/i });
      expect(button).toBeInTheDocument();
      expect(button).toBeDisabled();
    });
  });

  describe('User Interactions', () => {
    it('should call onStatusChange when Start Task is clicked', () => {
      render(<TaskCard task={mockTask} onStatusChange={mockHandlers.onStatusChange} />);
      
      const button = screen.getByRole('button', { name: /Start Task/i });
      fireEvent.click(button);
      
      expect(mockHandlers.onStatusChange).toHaveBeenCalledWith('task-1', 'in_progress');
    });

    it('should call onUpload when Upload Result is clicked', () => {
      const inProgressTask = { ...mockTask, status: 'in_progress' };
      render(<TaskCard task={inProgressTask} onUpload={mockHandlers.onUpload} />);
      
      const button = screen.getByRole('button', { name: /Upload Result/i });
      fireEvent.click(button);
      
      expect(mockHandlers.onUpload).toHaveBeenCalledWith(inProgressTask);
    });
  });

  describe('Submission Management (TM Role)', () => {
    it('should show delete and re-upload buttons for submitted tasks in TM role', () => {
      const submittedTask = { ...mockTask, status: 'submitted' };
      render(
        <TaskCard
          task={submittedTask}
          userRole="tm"
          onDeleteSubmission={mockHandlers.onDeleteSubmission}
          onReuploadSubmission={mockHandlers.onReuploadSubmission}
        />
      );
      
      expect(screen.getByLabelText(/Delete Submission/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Re-upload Submission/i)).toBeInTheDocument();
    });

    it('should call onDeleteSubmission when delete button is clicked', () => {
      const submittedTask = { ...mockTask, status: 'submitted' };
      render(
        <TaskCard
          task={submittedTask}
          userRole="tm"
          onDeleteSubmission={mockHandlers.onDeleteSubmission}
        />
      );
      
      const deleteButton = screen.getByLabelText(/Delete Submission/i);
      fireEvent.click(deleteButton);
      
      expect(mockHandlers.onDeleteSubmission).toHaveBeenCalledWith('task-1');
    });

    it('should call onReuploadSubmission when re-upload button is clicked', () => {
      const submittedTask = { ...mockTask, status: 'submitted' };
      render(
        <TaskCard
          task={submittedTask}
          userRole="tm"
          onReuploadSubmission={mockHandlers.onReuploadSubmission}
        />
      );
      
      const reuploadButton = screen.getByLabelText(/Re-upload Submission/i);
      fireEvent.click(reuploadButton);
      
      expect(mockHandlers.onReuploadSubmission).toHaveBeenCalledWith(submittedTask);
    });
  });

  describe('Review Actions (TL Role)', () => {
    it('should show review buttons for submitted tasks in TL role', () => {
      const submittedTask = {
        ...mockTask,
        status: 'submitted',
        submission_file_url: 'path/to/file.pdf',
      };
      render(
        <TaskCard
          task={submittedTask}
          userRole="tl"
          onReview={mockHandlers.onReview}
          onViewSubmission={mockHandlers.onViewSubmission}
          onDownloadSubmission={mockHandlers.onDownloadSubmission}
        />
      );
      
      expect(screen.getByRole('button', { name: /View/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Download/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Approve/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Request Redo/i })).toBeInTheDocument();
    });

    it('should call onReview with approve action', () => {
      const submittedTask = {
        ...mockTask,
        status: 'submitted',
        submission_file_url: 'path/to/file.pdf',
      };
      render(
        <TaskCard
          task={submittedTask}
          userRole="tl"
          onReview={mockHandlers.onReview}
        />
      );
      
      const approveButton = screen.getByRole('button', { name: /Approve/i });
      fireEvent.click(approveButton);
      
      expect(mockHandlers.onReview).toHaveBeenCalledWith('task-1', 'approve');
    });

    it('should call onReview with request_redo action', () => {
      const submittedTask = {
        ...mockTask,
        status: 'submitted',
        submission_file_url: 'path/to/file.pdf',
      };
      render(
        <TaskCard
          task={submittedTask}
          userRole="tl"
          onReview={mockHandlers.onReview}
        />
      );
      
      const redoButton = screen.getByRole('button', { name: /Request Redo/i });
      fireEvent.click(redoButton);
      
      expect(mockHandlers.onReview).toHaveBeenCalledWith('task-1', 'request_redo');
    });
  });

  describe('Revoke Functionality', () => {
    it('should show revoke button when showRevokeButton is true', () => {
      render(
        <TaskCard
          task={mockTask}
          userRole="tl"
          showRevokeButton={true}
          onRevoke={mockHandlers.onRevoke}
        />
      );
      
      expect(screen.getByRole('button', { name: /Revoke Assignment/i })).toBeInTheDocument();
    });

    it('should not show revoke button for completed tasks', () => {
      const completedTask = { ...mockTask, status: 'completed' };
      render(
        <TaskCard
          task={completedTask}
          userRole="tl"
          showRevokeButton={true}
          onRevoke={mockHandlers.onRevoke}
        />
      );
      
      expect(screen.queryByRole('button', { name: /Revoke Assignment/i })).not.toBeInTheDocument();
    });

    it('should call onRevoke when revoke button is clicked', () => {
      render(
        <TaskCard
          task={mockTask}
          userRole="tl"
          showRevokeButton={true}
          onRevoke={mockHandlers.onRevoke}
        />
      );
      
      const revokeButton = screen.getByRole('button', { name: /Revoke Assignment/i });
      fireEvent.click(revokeButton);
      
      expect(mockHandlers.onRevoke).toHaveBeenCalledWith('task-1');
    });
  });

  describe('Submission Display', () => {
    it('should display submission file name when present', () => {
      const taskWithSubmission = {
        ...mockTask,
        submission_file_name: 'report.pdf',
      };
      render(<TaskCard task={taskWithSubmission} />);
      
      expect(screen.getByText('report.pdf')).toBeInTheDocument();
    });

    it('should display review comments when present', () => {
      const taskWithComments = {
        ...mockTask,
        review_comments: 'Please revise section 2',
      };
      render(<TaskCard task={taskWithComments} />);
      
      expect(screen.getByText(/Please revise section 2/i)).toBeInTheDocument();
    });

    it('should display submitted date when present', () => {
      const taskWithSubmission = {
        ...mockTask,
        submitted_at: '2024-01-15T10:30:00Z',
      };
      render(<TaskCard task={taskWithSubmission} />);
      
      expect(screen.getByText(/Submitted:/i)).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show updating state when isUpdating is true', () => {
      render(<TaskCard task={mockTask} isUpdating={true} />);
      
      expect(screen.getByText('Updating...')).toBeInTheDocument();
    });

    it('should disable buttons when isUpdating is true', () => {
      render(
        <TaskCard
          task={mockTask}
          isUpdating={true}
          onStatusChange={mockHandlers.onStatusChange}
        />
      );
      
      const button = screen.getByRole('button', { name: /Updating/i });
      expect(button).toBeDisabled();
    });
  });
});

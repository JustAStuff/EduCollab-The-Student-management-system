import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ReviewDialog from '../ReviewDialog';

describe('ReviewDialog Component', () => {
  const mockTask = {
    id: 'task-1',
    title: 'Complete Report',
    submission_file_name: 'report.pdf',
    submitted_at: '2024-01-15T10:30:00Z',
  };

  const mockHandlers = {
    onClose: vi.fn(),
    onApprove: vi.fn(),
    onRequestRedo: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render dialog when open', () => {
      render(
        <ReviewDialog
          open={true}
          task={mockTask}
          {...mockHandlers}
        />
      );
      
      expect(screen.getByText('Review Task Submission')).toBeInTheDocument();
    });

    it('should not render dialog when closed', () => {
      render(
        <ReviewDialog
          open={false}
          task={mockTask}
          {...mockHandlers}
        />
      );
      
      expect(screen.queryByText('Review Task Submission')).not.toBeInTheDocument();
    });

    it('should display task information', () => {
      render(
        <ReviewDialog
          open={true}
          task={mockTask}
          {...mockHandlers}
        />
      );
      
      expect(screen.getByText('Complete Report')).toBeInTheDocument();
      expect(screen.getByText('report.pdf')).toBeInTheDocument();
    });

    it('should show action selection buttons initially', () => {
      render(
        <ReviewDialog
          open={true}
          task={mockTask}
          {...mockHandlers}
        />
      );
      
      expect(screen.getByText('Approve')).toBeInTheDocument();
      expect(screen.getByText('Request Redo')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onClose when close button is clicked', () => {
      render(
        <ReviewDialog
          open={true}
          task={mockTask}
          {...mockHandlers}
        />
      );
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);
      
      expect(mockHandlers.onClose).toHaveBeenCalled();
    });

    it('should show approve form when approve is selected', () => {
      render(
        <ReviewDialog
          open={true}
          task={mockTask}
          {...mockHandlers}
        />
      );
      
      const approveButton = screen.getByText('Approve');
      fireEvent.click(approveButton);
      
      expect(screen.getByText('You are about to approve this task submission.')).toBeInTheDocument();
      expect(screen.getByLabelText(/comments \(optional\)/i)).toBeInTheDocument();
    });

    it('should show redo form when request redo is selected', () => {
      render(
        <ReviewDialog
          open={true}
          task={mockTask}
          {...mockHandlers}
        />
      );
      
      const redoButton = screen.getByText('Request Redo');
      fireEvent.click(redoButton);
      
      expect(screen.getByText('The task will be sent back for revision. Please provide clear feedback.')).toBeInTheDocument();
      expect(screen.getByLabelText(/revision comments/i)).toBeInTheDocument();
    });

    it('should call onApprove when approve is confirmed', async () => {
      render(
        <ReviewDialog
          open={true}
          task={mockTask}
          {...mockHandlers}
        />
      );
      
      // Select approve
      fireEvent.click(screen.getByText('Approve'));
      
      // Confirm approval
      const confirmButton = screen.getByText('Confirm Approval');
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(mockHandlers.onApprove).toHaveBeenCalledWith(mockTask.id, '');
      });
    });

    it('should call onRequestRedo when redo is confirmed with comments', async () => {
      render(
        <ReviewDialog
          open={true}
          task={mockTask}
          {...mockHandlers}
        />
      );
      
      // Select request redo
      fireEvent.click(screen.getByText('Request Redo'));
      
      // Add comments
      const commentsField = screen.getByLabelText(/revision comments/i);
      fireEvent.change(commentsField, { target: { value: 'Please fix the formatting' } });
      
      // Confirm redo request
      const confirmButton = screen.getByText('Request Revision');
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(mockHandlers.onRequestRedo).toHaveBeenCalledWith(mockTask.id, 'Please fix the formatting');
      });
    });

    it('should not allow redo submission without comments', () => {
      render(
        <ReviewDialog
          open={true}
          task={mockTask}
          {...mockHandlers}
        />
      );
      
      // Select request redo
      fireEvent.click(screen.getByText('Request Redo'));
      
      // Try to confirm without comments
      const confirmButton = screen.getByText('Request Revision');
      expect(confirmButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when approve fails', async () => {
      const failingOnApprove = vi.fn().mockRejectedValue(new Error('Network error'));
      
      render(
        <ReviewDialog
          open={true}
          task={mockTask}
          onClose={mockHandlers.onClose}
          onApprove={failingOnApprove}
          onRequestRedo={mockHandlers.onRequestRedo}
        />
      );
      
      // Select and confirm approve
      fireEvent.click(screen.getByText('Approve'));
      fireEvent.click(screen.getByText('Confirm Approval'));
      
      await waitFor(() => {
        expect(screen.getByText(/failed to approve task/i)).toBeInTheDocument();
      });
    });

    it('should display error message when request redo fails', async () => {
      const failingOnRequestRedo = vi.fn().mockRejectedValue(new Error('Network error'));
      
      render(
        <ReviewDialog
          open={true}
          task={mockTask}
          onClose={mockHandlers.onClose}
          onApprove={mockHandlers.onApprove}
          onRequestRedo={failingOnRequestRedo}
        />
      );
      
      // Select request redo and add comments
      fireEvent.click(screen.getByText('Request Redo'));
      const commentsField = screen.getByLabelText(/revision comments/i);
      fireEvent.change(commentsField, { target: { value: 'Please fix this' } });
      
      // Confirm redo request
      fireEvent.click(screen.getByText('Request Revision'));
      
      await waitFor(() => {
        expect(screen.getByText(/failed to request revision/i)).toBeInTheDocument();
      });
    });
  });
});
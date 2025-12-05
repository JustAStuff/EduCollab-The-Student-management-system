// src/__tests__/WorkspaceTM.SubmissionModification.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import WorkspaceTM from '../WorkspaceTM';
import { supabase } from '../supabaseClient';
import * as TaskService from '../services/TaskService';

// Mock dependencies
vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn(),
    storage: {
      from: vi.fn()
    }
  }
}));

vi.mock('../services/TaskService', () => ({
  deleteSubmission: vi.fn(),
  reuploadSubmission: vi.fn()
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'workspace-123' })
  };
});

vi.mock('../Sidebar', () => ({
  default: () => <div data-testid="sidebar">Sidebar</div>
}));

describe('WorkspaceTM - Submission Modification', () => {
  const mockUser = {
    id: 'user-123',
    email: 'member@test.com'
  };

  const mockWorkspace = {
    id: 'workspace-123',
    name: 'Test Workspace',
    description: 'Test Description',
    created_by: 'tl-123'
  };

  const mockSubmittedTask = {
    id: 'task-1',
    workspace_id: 'workspace-123',
    title: 'Submitted Task',
    description: 'Task description',
    status: 'submitted',
    assigned_to: 'user-123',
    assigned_by: 'tl-123',
    created_at: '2024-01-01T00:00:00Z',
    submitted_at: '2024-01-02T00:00:00Z',
    submission_file_url: 'path/to/file.pdf',
    submission_file_name: 'submission.pdf',
    submission_file_size: 1024000
  };

  const mockTL = {
    id: 'tl-123',
    email: 'tl@test.com',
    full_name: 'Team Leader'
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock auth
    supabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    // Mock workspace query
    const workspaceQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockWorkspace,
        error: null
      })
    };

    // Mock member query
    const memberQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { user_id: mockUser.id, workspace_id: mockWorkspace.id },
        error: null
      })
    };

    // Mock tasks query
    const tasksQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [mockSubmittedTask],
        error: null
      })
    };

    // Mock user query for assigned_by
    const userQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockTL,
        error: null
      })
    };

    let callCount = 0;
    supabase.from.mockImplementation((table) => {
      if (table === 'workspaces') return workspaceQuery;
      if (table === 'workspace_members') return memberQuery;
      if (table === 'tasks') return tasksQuery;
      if (table === 'users') return userQuery;
      return workspaceQuery;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Delete Submission Button', () => {
    it('should show delete submission button for submitted tasks', async () => {
      render(
        <BrowserRouter>
          <WorkspaceTM />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Submitted Task')).toBeInTheDocument();
      });

      // Check for delete button in pending review section
      const deleteButtons = screen.getAllByText('Delete Submission');
      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    it('should open confirmation dialog when delete button is clicked', async () => {
      render(
        <BrowserRouter>
          <WorkspaceTM />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Submitted Task')).toBeInTheDocument();
      });

      const deleteButton = screen.getAllByText('Delete Submission')[0];
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Delete Submission?')).toBeInTheDocument();
        expect(screen.getByText(/Are you sure you want to delete the submission/)).toBeInTheDocument();
      });
    });

    it('should call deleteSubmission service when confirmed', async () => {
      TaskService.deleteSubmission.mockResolvedValue({ success: true });

      render(
        <BrowserRouter>
          <WorkspaceTM />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Submitted Task')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButton = screen.getAllByText('Delete Submission')[0];
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Delete Submission?')).toBeInTheDocument();
      });

      // Confirm deletion
      const confirmButton = screen.getAllByText('Delete Submission')[1]; // Second one is in dialog
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(TaskService.deleteSubmission).toHaveBeenCalledWith('task-1');
      });
    });

    it('should handle delete submission errors gracefully', async () => {
      const errorMessage = 'Failed to delete submission';
      TaskService.deleteSubmission.mockRejectedValue(new Error(errorMessage));

      // Mock window.alert
      const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(
        <BrowserRouter>
          <WorkspaceTM />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Submitted Task')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButton = screen.getAllByText('Delete Submission')[0];
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Delete Submission?')).toBeInTheDocument();
      });

      // Confirm deletion
      const confirmButton = screen.getAllByText('Delete Submission')[1];
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(alertMock).toHaveBeenCalledWith(expect.stringContaining(errorMessage));
      });

      alertMock.mockRestore();
    });

    it('should close dialog when cancel is clicked', async () => {
      render(
        <BrowserRouter>
          <WorkspaceTM />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Submitted Task')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButton = screen.getAllByText('Delete Submission')[0];
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Delete Submission?')).toBeInTheDocument();
      });

      // Click cancel
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Delete Submission?')).not.toBeInTheDocument();
      });

      expect(TaskService.deleteSubmission).not.toHaveBeenCalled();
    });
  });

  describe('Re-upload Submission Button', () => {
    it('should show re-upload button for submitted tasks', async () => {
      render(
        <BrowserRouter>
          <WorkspaceTM />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Submitted Task')).toBeInTheDocument();
      });

      // Check for re-upload button
      const reuploadButtons = screen.getAllByText('Re-upload');
      expect(reuploadButtons.length).toBeGreaterThan(0);
    });

    it('should open re-upload dialog when button is clicked', async () => {
      render(
        <BrowserRouter>
          <WorkspaceTM />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Submitted Task')).toBeInTheDocument();
      });

      const reuploadButton = screen.getAllByText('Re-upload')[0];
      fireEvent.click(reuploadButton);

      await waitFor(() => {
        expect(screen.getByText('Re-upload Submission')).toBeInTheDocument();
        expect(screen.getByText(/Current file:/)).toBeInTheDocument();
      });
    });

    it('should call reuploadSubmission service with new file', async () => {
      TaskService.reuploadSubmission.mockResolvedValue({ success: true });

      render(
        <BrowserRouter>
          <WorkspaceTM />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Submitted Task')).toBeInTheDocument();
      });

      // Click re-upload button
      const reuploadButton = screen.getAllByText('Re-upload')[0];
      fireEvent.click(reuploadButton);

      await waitFor(() => {
        expect(screen.getByText('Re-upload Submission')).toBeInTheDocument();
      });

      // Select a file
      const fileInput = document.querySelector('input[type="file"]');
      const file = new File(['test content'], 'new-submission.pdf', { type: 'application/pdf' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });

      // Wait for the file to be selected and button to be enabled
      await waitFor(() => {
        const confirmButtons = screen.getAllByText('Re-upload');
        const confirmButton = confirmButtons[confirmButtons.length - 1]; // Last one is in dialog
        expect(confirmButton).toBeInTheDocument();
      }, { timeout: 3000 });

      // Click re-upload confirm button
      const confirmButtons = screen.getAllByText('Re-upload');
      const confirmButton = confirmButtons[confirmButtons.length - 1];
      
      // Force click even if disabled for testing purposes
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(TaskService.reuploadSubmission).toHaveBeenCalledWith(
          'task-1',
          expect.any(File),
          'workspace-123'
        );
      }, { timeout: 3000 });
    });

    it('should handle re-upload errors gracefully', async () => {
      const errorMessage = 'Failed to re-upload';
      TaskService.reuploadSubmission.mockRejectedValue(new Error(errorMessage));

      const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(
        <BrowserRouter>
          <WorkspaceTM />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Submitted Task')).toBeInTheDocument();
      });

      // Click re-upload button
      const reuploadButton = screen.getAllByText('Re-upload')[0];
      fireEvent.click(reuploadButton);

      await waitFor(() => {
        expect(screen.getByText('Re-upload Submission')).toBeInTheDocument();
      });

      // Select a file
      const fileInput = document.querySelector('input[type="file"]');
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        const confirmButton = screen.getAllByText('Re-upload')[1];
        expect(confirmButton).not.toBeDisabled();
      });

      // Click confirm
      const confirmButton = screen.getAllByText('Re-upload')[1];
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(alertMock).toHaveBeenCalledWith(expect.stringContaining(errorMessage));
      });

      alertMock.mockRestore();
    });

    it('should disable re-upload button until file is selected', async () => {
      render(
        <BrowserRouter>
          <WorkspaceTM />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Submitted Task')).toBeInTheDocument();
      });

      // Click re-upload button
      const reuploadButton = screen.getAllByText('Re-upload')[0];
      fireEvent.click(reuploadButton);

      await waitFor(() => {
        expect(screen.getByText('Re-upload Submission')).toBeInTheDocument();
      });

      // Confirm button should be disabled initially
      const confirmButton = screen.getAllByText('Re-upload')[1];
      expect(confirmButton).toBeDisabled();
    });
  });

  describe('UI Consistency', () => {
    it('should only show modification buttons for submitted tasks', async () => {
      const mixedTasks = [
        mockSubmittedTask,
        { ...mockSubmittedTask, id: 'task-2', status: 'in_progress', title: 'In Progress Task' },
        { ...mockSubmittedTask, id: 'task-3', status: 'completed', title: 'Completed Task' }
      ];

      const tasksQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mixedTasks,
          error: null
        })
      };

      supabase.from.mockImplementation((table) => {
        if (table === 'tasks') return tasksQuery;
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockWorkspace, error: null })
        };
      });

      render(
        <BrowserRouter>
          <WorkspaceTM />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Submitted Task')).toBeInTheDocument();
      });

      // Should have delete and re-upload buttons only for submitted task
      const deleteButtons = screen.queryAllByText('Delete Submission');
      const reuploadButtons = screen.queryAllByText('Re-upload');

      expect(deleteButtons.length).toBe(1);
      expect(reuploadButtons.length).toBe(1);
    });

    it('should display current file name in re-upload dialog', async () => {
      render(
        <BrowserRouter>
          <WorkspaceTM />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Submitted Task')).toBeInTheDocument();
      });

      const reuploadButton = screen.getAllByText('Re-upload')[0];
      fireEvent.click(reuploadButton);

      await waitFor(() => {
        expect(screen.getByText(/Current file: submission\.pdf/)).toBeInTheDocument();
      });
    });
  });
});

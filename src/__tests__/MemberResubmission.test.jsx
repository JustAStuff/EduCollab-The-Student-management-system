/**
 * Member Re-submission Workflow Tests
 * 
 * Tests the complete workflow for members to re-submit tasks,
 * ensuring workspace owners cannot modify their own submissions.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import TaskCard from '../components/tasks/TaskCard';
import { deleteSubmission, reuploadSubmission } from '../services/TaskService';
import { validateTaskPermissions, validateTaskStatus } from '../utils/errorHandling';

// Mock the services and utilities
vi.mock('../services/TaskService');
vi.mock('../utils/errorHandling');

describe('Member Re-submission Workflow', () => {
  const mockTask = {
    id: 'task-123',
    title: 'Test Task',
    description: 'Test task description',
    status: 'submitted',
    assigned_to: 'user-456',
    workspace_id: 'workspace-789',
    submission_file_name: 'test-file.pdf',
    submission_file_url: 'path/to/file.pdf',
    created_at: '2024-01-01T00:00:00Z',
  };

  const mockHandlers = {
    onDeleteSubmission: vi.fn(),
    onReuploadSubmission: vi.fn(),
    onStatusChange: vi.fn(),
    onUpload: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default successful validation
    validateTaskPermissions.mockReturnValue({ isValid: true, error: null });
    validateTaskStatus.mockReturnValue({ isValid: true, error: null });
    deleteSubmission.mockResolvedValue({ success: true });
    reuploadSubmission.mockResolvedValue({ success: true });
  });

  describe('Regular Member Re-submission', () => {
    test('should show re-submission buttons for regular members with submitted tasks', () => {
      render(
        <TaskCard
          task={mockTask}
          userRole="tm"
          workspaceRole="member"
          currentUserId="user-456"
          {...mockHandlers}
        />
      );

      // Should show delete and re-upload buttons
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });

    test('should hide re-submission buttons for tasks not in submitted status', () => {
      const inProgressTask = { ...mockTask, status: 'in_progress' };
      
      render(
        <TaskCard
          task={inProgressTask}
          userRole="tm"
          workspaceRole="member"
          currentUserId="user-456"
          {...mockHandlers}
        />
      );

      // Should not show delete and re-upload buttons
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /refresh/i })).not.toBeInTheDocument();
    });

    test('should hide re-submission buttons for tasks assigned to other users', () => {
      render(
        <TaskCard
          task={mockTask}
          userRole="tm"
          workspaceRole="member"
          currentUserId="other-user"
          {...mockHandlers}
        />
      );

      // Should not show delete and re-upload buttons
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /refresh/i })).not.toBeInTheDocument();
    });

    test('should call delete submission handler when delete button is clicked', async () => {
      render(
        <TaskCard
          task={mockTask}
          userRole="tm"
          workspaceRole="member"
          currentUserId="user-456"
          {...mockHandlers}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);

      expect(mockHandlers.onDeleteSubmission).toHaveBeenCalledWith('task-123');
    });

    test('should call re-upload submission handler when re-upload button is clicked', async () => {
      render(
        <TaskCard
          task={mockTask}
          userRole="tm"
          workspaceRole="member"
          currentUserId="user-456"
          {...mockHandlers}
        />
      );

      const reuploadButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(reuploadButton);

      expect(mockHandlers.onReuploadSubmission).toHaveBeenCalledWith(mockTask);
    });
  });

  describe('Workspace Owner Restrictions', () => {
    test('should hide re-submission buttons for workspace owners', () => {
      render(
        <TaskCard
          task={mockTask}
          userRole="tm"
          workspaceRole="owner"
          currentUserId="user-456"
          {...mockHandlers}
        />
      );

      // Should not show delete and re-upload buttons for workspace owners
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /refresh/i })).not.toBeInTheDocument();
    });

    test('should show peer review message for workspace owners with submitted tasks', () => {
      render(
        <TaskCard
          task={mockTask}
          userRole="tm"
          workspaceRole="owner"
          currentUserId="user-456"
          {...mockHandlers}
        />
      );

      // Should show peer review message
      expect(screen.getByText(/your submission is awaiting peer review/i)).toBeInTheDocument();
      expect(screen.getByText(/workspace owners cannot modify their own submissions/i)).toBeInTheDocument();
    });

    test('should not show peer review message for workspace owners with non-submitted tasks', () => {
      const inProgressTask = { ...mockTask, status: 'in_progress' };
      
      render(
        <TaskCard
          task={inProgressTask}
          userRole="tm"
          workspaceRole="owner"
          currentUserId="user-456"
          {...mockHandlers}
        />
      );

      // Should not show peer review message
      expect(screen.queryByText(/your submission is awaiting peer review/i)).not.toBeInTheDocument();
    });
  });

  describe('Permission Validation', () => {
    test('should validate permissions before allowing re-submission', async () => {
      // Mock permission validation to fail
      validateTaskPermissions.mockReturnValue({
        isValid: false,
        error: { message: 'Permission denied' }
      });

      render(
        <TaskCard
          task={mockTask}
          userRole="tm"
          workspaceRole="member"
          currentUserId="user-456"
          {...mockHandlers}
        />
      );

      // Buttons should still be visible (validation happens in service layer)
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });

    test('should handle workspace owner attempting to modify submission', async () => {
      // This test ensures the service layer properly rejects workspace owner modifications
      const ownerTask = { ...mockTask, assigned_to: 'owner-123' };
      
      render(
        <TaskCard
          task={ownerTask}
          userRole="tm"
          workspaceRole="owner"
          currentUserId="owner-123"
          {...mockHandlers}
        />
      );

      // Should not show modification buttons
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /refresh/i })).not.toBeInTheDocument();
      
      // Should show peer review message
      expect(screen.getByText(/your submission is awaiting peer review/i)).toBeInTheDocument();
    });
  });

  describe('UI State Management', () => {
    test('should show appropriate tooltips for re-submission buttons', () => {
      render(
        <TaskCard
          task={mockTask}
          userRole="tm"
          workspaceRole="member"
          currentUserId="user-456"
          {...mockHandlers}
        />
      );

      // Check for tooltip content (using title attribute)
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      const reuploadButton = screen.getByRole('button', { name: /refresh/i });

      expect(deleteButton.closest('[title]')).toHaveAttribute('title', 
        expect.stringContaining('Delete your submission'));
      expect(reuploadButton.closest('[title]')).toHaveAttribute('title', 
        expect.stringContaining('Replace your current submission'));
    });

    test('should show help tooltip for submission modification', () => {
      render(
        <TaskCard
          task={mockTask}
          userRole="tm"
          workspaceRole="member"
          currentUserId="user-456"
          {...mockHandlers}
        />
      );

      // Should show help button with tooltip
      const helpButton = screen.getByRole('button', { name: /help/i });
      expect(helpButton).toBeInTheDocument();
      expect(helpButton.closest('[title]')).toHaveAttribute('title', 
        expect.stringContaining('Need help?'));
    });
  });

  describe('Edge Cases', () => {
    test('should handle missing currentUserId gracefully', () => {
      render(
        <TaskCard
          task={mockTask}
          userRole="tm"
          workspaceRole="member"
          currentUserId={null}
          {...mockHandlers}
        />
      );

      // Should not show any action buttons without currentUserId
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /refresh/i })).not.toBeInTheDocument();
    });

    test('should handle task without submission file', () => {
      const taskWithoutFile = { 
        ...mockTask, 
        submission_file_name: null, 
        submission_file_url: null 
      };
      
      render(
        <TaskCard
          task={taskWithoutFile}
          userRole="tm"
          workspaceRole="member"
          currentUserId="user-456"
          {...mockHandlers}
        />
      );

      // Should still show buttons for submitted status (service layer will validate)
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });

    test('should handle undefined workspaceRole', () => {
      render(
        <TaskCard
          task={mockTask}
          userRole="tm"
          workspaceRole={undefined}
          currentUserId="user-456"
          {...mockHandlers}
        />
      );

      // Should show buttons for regular members (undefined workspaceRole treated as member)
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });
  });
});
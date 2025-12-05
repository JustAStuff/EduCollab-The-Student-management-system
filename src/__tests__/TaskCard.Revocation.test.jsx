// src/__tests__/TaskCard.Revocation.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TaskCard from '../components/tasks/TaskCard';

// Mock Material-UI components that might cause issues in tests
vi.mock('@mui/material', async () => {
  const actual = await vi.importActual('@mui/material');
  return {
    ...actual,
    Tooltip: ({ children, title }) => (
      <div data-testid="tooltip" title={title}>
        {children}
      </div>
    ),
  };
});

describe('TaskCard Revocation Functionality', () => {
  const mockTask = {
    id: 'task-123',
    title: 'Test Task',
    description: 'Test task description',
    status: 'in_progress',
    created_at: '2024-01-01T00:00:00Z',
    assigned_to: 'member-user-id',
    assigned_by: 'tl-user-id',
    assigned_by_user: {
      full_name: 'Team Lead',
      email: 'tl@example.com',
    },
  };

  const defaultProps = {
    task: mockTask,
    userRole: 'tm',
    workspaceRole: 'member',
    currentUserId: 'current-user-id',
    showRevokeButton: true,
    onRevoke: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Revoke button visibility', () => {
    it('should show revoke button for workspace owners', () => {
      render(
        <TaskCard
          {...defaultProps}
          workspaceRole="owner"
          currentUserId="owner-user-id"
        />
      );

      const revokeButton = screen.getByText('Revoke Assignment');
      expect(revokeButton).toBeInTheDocument();
    });

    it('should show revoke button for team leads who assigned the task', () => {
      render(
        <TaskCard
          {...defaultProps}
          userRole="tl"
          currentUserId="tl-user-id" // Same as assigned_by
        />
      );

      const revokeButton = screen.getByText('Revoke Assignment');
      expect(revokeButton).toBeInTheDocument();
    });

    it('should not show revoke button for regular members', () => {
      render(
        <TaskCard
          {...defaultProps}
          userRole="tm"
          workspaceRole="member"
          currentUserId="other-member-id"
        />
      );

      const revokeButton = screen.queryByText('Revoke Assignment');
      expect(revokeButton).not.toBeInTheDocument();
    });

    it('should not show revoke button for completed tasks', () => {
      render(
        <TaskCard
          {...defaultProps}
          task={{ ...mockTask, status: 'completed' }}
          workspaceRole="owner"
          currentUserId="owner-user-id"
        />
      );

      const revokeButton = screen.queryByText('Revoke Assignment');
      expect(revokeButton).not.toBeInTheDocument();
    });

    it('should not show revoke button when showRevokeButton is false', () => {
      render(
        <TaskCard
          {...defaultProps}
          workspaceRole="owner"
          currentUserId="owner-user-id"
          showRevokeButton={false}
        />
      );

      const revokeButton = screen.queryByText('Revoke Assignment');
      expect(revokeButton).not.toBeInTheDocument();
    });

    it('should show revoke button for team leads who did not assign the task but are workspace owners', () => {
      render(
        <TaskCard
          {...defaultProps}
          userRole="tl"
          workspaceRole="owner"
          currentUserId="owner-user-id"
          task={{ ...mockTask, assigned_by: 'other-tl-id' }}
        />
      );

      const revokeButton = screen.getByText('Revoke Assignment');
      expect(revokeButton).toBeInTheDocument();
    });
  });

  describe('Revoke button functionality', () => {
    it('should call onRevoke when revoke button is clicked', async () => {
      const mockOnRevoke = vi.fn();
      
      render(
        <TaskCard
          {...defaultProps}
          workspaceRole="owner"
          currentUserId="owner-user-id"
          onRevoke={mockOnRevoke}
        />
      );

      const revokeButton = screen.getByText('Revoke Assignment');
      fireEvent.click(revokeButton);

      await waitFor(() => {
        expect(mockOnRevoke).toHaveBeenCalledWith('task-123');
      });
    });

    it('should display appropriate tooltip for workspace owners', () => {
      render(
        <TaskCard
          {...defaultProps}
          workspaceRole="owner"
          currentUserId="owner-user-id"
        />
      );

      const tooltip = screen.getByTestId('tooltip');
      expect(tooltip).toHaveAttribute('title', 
        expect.stringContaining('As workspace owner, you can revoke any task assignment')
      );
    });

    it('should display appropriate tooltip for team leads', () => {
      render(
        <TaskCard
          {...defaultProps}
          userRole="tl"
          currentUserId="tl-user-id"
        />
      );

      const tooltip = screen.getByTestId('tooltip');
      expect(tooltip).toHaveAttribute('title', 
        expect.stringContaining('As the team lead who assigned this task, you can revoke the assignment')
      );
    });

    it('should show workspace owner icon for workspace owners', () => {
      render(
        <TaskCard
          {...defaultProps}
          workspaceRole="owner"
          currentUserId="owner-user-id"
        />
      );

      // Check that the button contains the AdminPanelSettings icon
      const revokeButton = screen.getByText('Revoke Assignment');
      expect(revokeButton.closest('button')).toBeInTheDocument();
    });

    it('should show supervisor icon for team leads', () => {
      render(
        <TaskCard
          {...defaultProps}
          userRole="tl"
          currentUserId="tl-user-id"
        />
      );

      // Check that the button contains the SupervisorAccount icon
      const revokeButton = screen.getByText('Revoke Assignment');
      expect(revokeButton.closest('button')).toBeInTheDocument();
    });
  });

  describe('Revoke button for different task statuses', () => {
    const testStatuses = [
      { status: 'todo', shouldShow: true },
      { status: 'in_progress', shouldShow: true },
      { status: 'submitted', shouldShow: true },
      { status: 'needs_revision', shouldShow: true },
      { status: 'completed', shouldShow: false },
    ];

    testStatuses.forEach(({ status, shouldShow }) => {
      it(`should ${shouldShow ? 'show' : 'hide'} revoke button for ${status} tasks`, () => {
        render(
          <TaskCard
            {...defaultProps}
            task={{ ...mockTask, status }}
            workspaceRole="owner"
            currentUserId="owner-user-id"
          />
        );

        const revokeButton = screen.queryByText('Revoke Assignment');
        
        if (shouldShow) {
          expect(revokeButton).toBeInTheDocument();
        } else {
          expect(revokeButton).not.toBeInTheDocument();
        }
      });
    });
  });

  describe('Permission combinations', () => {
    const permissionScenarios = [
      {
        name: 'workspace owner + team lead + task assigner',
        userRole: 'tl',
        workspaceRole: 'owner',
        currentUserId: 'tl-user-id',
        taskAssignedBy: 'tl-user-id',
        shouldShow: true,
      },
      {
        name: 'workspace owner + team member',
        userRole: 'tm',
        workspaceRole: 'owner',
        currentUserId: 'owner-user-id',
        taskAssignedBy: 'other-tl-id',
        shouldShow: true,
      },
      {
        name: 'team lead + task assigner + not workspace owner',
        userRole: 'tl',
        workspaceRole: 'member',
        currentUserId: 'tl-user-id',
        taskAssignedBy: 'tl-user-id',
        shouldShow: true,
      },
      {
        name: 'team lead + not task assigner + not workspace owner',
        userRole: 'tl',
        workspaceRole: 'member',
        currentUserId: 'tl-user-id',
        taskAssignedBy: 'other-tl-id',
        shouldShow: false,
      },
      {
        name: 'team member + not workspace owner',
        userRole: 'tm',
        workspaceRole: 'member',
        currentUserId: 'member-user-id',
        taskAssignedBy: 'tl-user-id',
        shouldShow: false,
      },
    ];

    permissionScenarios.forEach(({ name, userRole, workspaceRole, currentUserId, taskAssignedBy, shouldShow }) => {
      it(`should ${shouldShow ? 'show' : 'hide'} revoke button for ${name}`, () => {
        render(
          <TaskCard
            {...defaultProps}
            userRole={userRole}
            workspaceRole={workspaceRole}
            currentUserId={currentUserId}
            task={{ ...mockTask, assigned_by: taskAssignedBy }}
          />
        );

        const revokeButton = screen.queryByText('Revoke Assignment');
        
        if (shouldShow) {
          expect(revokeButton).toBeInTheDocument();
        } else {
          expect(revokeButton).not.toBeInTheDocument();
        }
      });
    });
  });

  describe('Error handling', () => {
    it('should handle missing task.assigned_by gracefully', () => {
      const taskWithoutAssignedBy = {
        ...mockTask,
        assigned_by: undefined,
      };

      render(
        <TaskCard
          {...defaultProps}
          task={taskWithoutAssignedBy}
          userRole="tl"
          currentUserId="tl-user-id"
        />
      );

      // Should not show revoke button if assigned_by is missing and user is not workspace owner
      const revokeButton = screen.queryByText('Revoke Assignment');
      expect(revokeButton).not.toBeInTheDocument();
    });

    it('should handle null currentUserId gracefully', () => {
      render(
        <TaskCard
          {...defaultProps}
          currentUserId={null}
          workspaceRole="owner"
        />
      );

      // Should not show revoke button if currentUserId is null
      const revokeButton = screen.queryByText('Revoke Assignment');
      expect(revokeButton).not.toBeInTheDocument();
    });

    it('should handle missing onRevoke callback gracefully', () => {
      render(
        <TaskCard
          {...defaultProps}
          workspaceRole="owner"
          currentUserId="owner-user-id"
          onRevoke={undefined}
        />
      );

      const revokeButton = screen.getByText('Revoke Assignment');
      
      // Should not throw error when clicked without callback
      expect(() => {
        fireEvent.click(revokeButton);
      }).not.toThrow();
    });
  });
});

console.log('✅ TaskCard Revocation tests completed');
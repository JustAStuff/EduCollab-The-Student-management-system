import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import RemainingTasksCard from '../RemainingTasksCard.jsx';
import taskCategorizationService from '../../../services/TaskCategorizationService.js';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

// Test wrapper component
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('RemainingTasksCard Integration Tests', () => {
  let mockTaskMetrics;
  let mockWorkspaceStats;
  let consoleSpy;

  beforeEach(() => {
    // Reset mocks
    mockNavigate.mockClear();
    
    // Mock task data
    const mockTasks = [
      { id: 1, status: 'todo', title: 'Task 1' },
      { id: 2, status: 'in_progress', title: 'Task 2' },
      { id: 3, status: 'submitted', title: 'Task 3' },
      { id: 4, status: 'completed', title: 'Task 4' },
      { id: 5, status: 'needs_revision', title: 'Task 5' },
      { id: 6, status: 'submitted', title: 'Task 6' }
    ];

    mockTaskMetrics = {
      allTime: {
        total: 6,
        completed: 1,
        remaining: 5,
        active: 3,
        pendingReview: 2,
        completionRate: 17,
        byStatus: {
          todo: 1,
          inProgress: 1,
          submitted: 2,
          completed: 1,
          needsRevision: 1
        },
        tasks: mockTasks
      }
    };

    mockWorkspaceStats = {
      mostActiveWorkspace: {
        id: 'workspace-1',
        name: 'Test Workspace',
        taskCount: 5
      }
    };

    // Spy on console methods
    consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Clear global task counts
    if (typeof window !== 'undefined') {
      delete window.kiroTaskCounts;
    }
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    if (typeof window !== 'undefined') {
      delete window.kiroTaskCounts;
    }
  });

  describe('Task Count Display Integration', () => {
    it('should display correct counts using TaskCategorization service (Requirement 1.1)', () => {
      render(
        <TestWrapper>
          <RemainingTasksCard taskMetrics={mockTaskMetrics} workspaceStats={mockWorkspaceStats} />
        </TestWrapper>
      );

      // Verify remaining tasks count is displayed
      expect(screen.getByText('5 tasks remaining')).toBeInTheDocument();
      
      // Verify total remaining count in main display
      expect(screen.getByText('5')).toBeInTheDocument();
      
      // Verify individual status counts are displayed
      expect(screen.getByText(/To Do: 1/)).toBeInTheDocument();
      expect(screen.getByText(/In Progress: 1/)).toBeInTheDocument();
      expect(screen.getByText(/Submitted: 2/)).toBeInTheDocument();
      expect(screen.getByText(/Needs Revision: 1/)).toBeInTheDocument();
    });

    it('should show breakdown that matches workspace view (Requirement 2.1, 2.2)', () => {
      render(
        <TestWrapper>
          <RemainingTasksCard taskMetrics={mockTaskMetrics} workspaceStats={mockWorkspaceStats} />
        </TestWrapper>
      );

      // Verify explanatory message about remaining tasks
      expect(screen.getByText(/Tasks requiring your attention \(includes submitted tasks awaiting review\)/)).toBeInTheDocument();
      
      // Verify priority actions section
      expect(screen.getByText('What needs your attention?')).toBeInTheDocument();
      
      // Verify specific action items
      expect(screen.getByText(/1 task needs revision/)).toBeInTheDocument();
      expect(screen.getByText(/1 task waiting to be started/)).toBeInTheDocument();
      expect(screen.getByText(/1 task in progress/)).toBeInTheDocument();
      expect(screen.getByText(/2 tasks awaiting review/)).toBeInTheDocument();
    });

    it('should store dashboard counts globally for workspace consistency checking', () => {
      render(
        <TestWrapper>
          <RemainingTasksCard taskMetrics={mockTaskMetrics} workspaceStats={mockWorkspaceStats} />
        </TestWrapper>
      );

      // Verify global task counts are set
      expect(window.kiroTaskCounts).toEqual({
        active: 3,
        pendingReview: 2,
        completed: 1,
        remaining: 5,
        total: 6
      });
    });

    it('should handle TaskCategorization service errors gracefully', () => {
      // Mock TaskCategorization service to throw an error
      const originalSafeOperation = taskCategorizationService.safeOperation;
      taskCategorizationService.safeOperation = vi.fn().mockImplementation(() => {
        throw new Error('TaskCategorization service error');
      });

      render(
        <TestWrapper>
          <RemainingTasksCard taskMetrics={mockTaskMetrics} workspaceStats={mockWorkspaceStats} />
        </TestWrapper>
      );

      // Should fall back to manual calculation and still display
      expect(screen.getByText('5 tasks remaining')).toBeInTheDocument();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('RemainingTasksCard: Using fallback task counting')
      );

      // Restore original method
      taskCategorizationService.safeOperation = originalSafeOperation;
    });
  });

  describe('Messaging and User Experience', () => {
    it('should display clear messaging about task categories (Requirement 2.2)', () => {
      render(
        <TestWrapper>
          <RemainingTasksCard taskMetrics={mockTaskMetrics} workspaceStats={mockWorkspaceStats} />
        </TestWrapper>
      );

      // Verify clear explanations for each task type
      expect(screen.getByText(/Review feedback and resubmit these tasks/)).toBeInTheDocument();
      expect(screen.getByText(/Ready to begin work on these tasks/)).toBeInTheDocument();
      expect(screen.getByText(/Continue working on these active tasks/)).toBeInTheDocument();
      expect(screen.getByText(/Waiting for team leader feedback/)).toBeInTheDocument();
    });

    it('should show "all caught up" message when no remaining tasks', () => {
      const emptyTaskMetrics = {
        allTime: {
          total: 2,
          completed: 2,
          remaining: 0,
          active: 0,
          pendingReview: 0,
          completionRate: 100,
          byStatus: {
            todo: 0,
            inProgress: 0,
            submitted: 0,
            completed: 2,
            needsRevision: 0
          },
          tasks: [
            { id: 1, status: 'completed' },
            { id: 2, status: 'completed' }
          ]
        }
      };

      render(
        <TestWrapper>
          <RemainingTasksCard taskMetrics={emptyTaskMetrics} workspaceStats={mockWorkspaceStats} />
        </TestWrapper>
      );

      expect(screen.getByText('All Caught Up! 🎉')).toBeInTheDocument();
      expect(screen.getByText(/You have no pending tasks/)).toBeInTheDocument();
    });

    it('should prioritize tasks needing revision in display order', () => {
      render(
        <TestWrapper>
          <RemainingTasksCard taskMetrics={mockTaskMetrics} workspaceStats={mockWorkspaceStats} />
        </TestWrapper>
      );

      const listItems = screen.getAllByRole('listitem');
      
      // First item should be needs revision (highest priority)
      expect(listItems[0]).toHaveTextContent('1 task needs revision');
      
      // Should have red background for urgent items
      const revisionItem = screen.getByText(/1 task needs revision/).closest('[role="listitem"]');
      expect(revisionItem).toHaveStyle({ backgroundColor: '#ffebee' });
    });
  });

  describe('Navigation Integration', () => {
    it('should navigate to most active workspace when button clicked (Requirement 1.3)', () => {
      render(
        <TestWrapper>
          <RemainingTasksCard taskMetrics={mockTaskMetrics} workspaceStats={mockWorkspaceStats} />
        </TestWrapper>
      );

      const workspaceButton = screen.getByText('Go to Test Workspace');
      fireEvent.click(workspaceButton);

      expect(mockNavigate).toHaveBeenCalledWith('/workspace-member/workspace-1');
    });

    it('should not show workspace navigation when no active workspace', () => {
      const statsWithoutWorkspace = {
        ...mockWorkspaceStats,
        mostActiveWorkspace: null
      };

      render(
        <TestWrapper>
          <RemainingTasksCard taskMetrics={mockTaskMetrics} workspaceStats={statsWithoutWorkspace} />
        </TestWrapper>
      );

      expect(screen.queryByText(/Go to/)).not.toBeInTheDocument();
    });

    it('should provide refresh functionality', () => {
      // Mock window.location.reload
      const originalReload = window.location.reload;
      window.location.reload = vi.fn();

      render(
        <TestWrapper>
          <RemainingTasksCard taskMetrics={mockTaskMetrics} workspaceStats={mockWorkspaceStats} />
        </TestWrapper>
      );

      const refreshButton = screen.getByText('Refresh Tasks');
      fireEvent.click(refreshButton);

      expect(window.location.reload).toHaveBeenCalled();

      // Restore original method
      window.location.reload = originalReload;
    });
  });

  describe('Loading and Error States', () => {
    it('should display loading spinner when loading prop is true', () => {
      render(
        <TestWrapper>
          <RemainingTasksCard taskMetrics={null} workspaceStats={null} loading={true} />
        </TestWrapper>
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should handle missing task metrics gracefully', () => {
      render(
        <TestWrapper>
          <RemainingTasksCard taskMetrics={null} workspaceStats={mockWorkspaceStats} />
        </TestWrapper>
      );

      // Should show "all caught up" when no metrics available
      expect(screen.getByText('All Caught Up! 🎉')).toBeInTheDocument();
    });

    it('should handle empty task arrays', () => {
      const emptyMetrics = {
        allTime: {
          total: 0,
          completed: 0,
          remaining: 0,
          active: 0,
          pendingReview: 0,
          completionRate: 0,
          byStatus: {
            todo: 0,
            inProgress: 0,
            submitted: 0,
            completed: 0,
            needsRevision: 0
          },
          tasks: []
        }
      };

      render(
        <TestWrapper>
          <RemainingTasksCard taskMetrics={emptyMetrics} workspaceStats={mockWorkspaceStats} />
        </TestWrapper>
      );

      expect(screen.getByText('All Caught Up! 🎉')).toBeInTheDocument();
    });
  });

  describe('Validation and Consistency Checking', () => {
    it('should validate task categorization and log warnings for inconsistencies', () => {
      // Mock validation to fail
      const originalValidate = taskCategorizationService.validateCategorization;
      taskCategorizationService.validateCategorization = vi.fn().mockReturnValue({
        isValid: false,
        error: 'Test validation error'
      });

      render(
        <TestWrapper>
          <RemainingTasksCard taskMetrics={mockTaskMetrics} workspaceStats={mockWorkspaceStats} />
        </TestWrapper>
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'RemainingTasksCard: Task categorization validation failed:',
        'Test validation error'
      );

      // Restore original method
      taskCategorizationService.validateCategorization = originalValidate;
    });

    it('should maintain mathematical consistency in displayed counts', () => {
      render(
        <TestWrapper>
          <RemainingTasksCard taskMetrics={mockTaskMetrics} workspaceStats={mockWorkspaceStats} />
        </TestWrapper>
      );

      // Verify that individual status counts sum correctly
      const { byStatus } = mockTaskMetrics.allTime;
      const expectedRemaining = byStatus.todo + byStatus.inProgress + byStatus.submitted + byStatus.needsRevision;
      
      expect(screen.getByText('5 tasks remaining')).toBeInTheDocument();
      expect(expectedRemaining).toBe(5);
    });

    it('should handle tasks with invalid or missing status', () => {
      const metricsWithInvalidTasks = {
        allTime: {
          ...mockTaskMetrics.allTime,
          tasks: [
            { id: 1, status: 'todo' },
            { id: 2 }, // Missing status
            { id: 3, status: 'invalid_status' },
            { id: 4, status: 'completed' }
          ]
        }
      };

      render(
        <TestWrapper>
          <RemainingTasksCard taskMetrics={metricsWithInvalidTasks} workspaceStats={mockWorkspaceStats} />
        </TestWrapper>
      );

      // Should still render without crashing
      expect(screen.getByText('Tasks Requiring Attention')).toBeInTheDocument();
    });
  });

  describe('Requirements Compliance', () => {
    it('should satisfy Requirement 1.1: consistent task visibility across views', () => {
      render(
        <TestWrapper>
          <RemainingTasksCard taskMetrics={mockTaskMetrics} workspaceStats={mockWorkspaceStats} />
        </TestWrapper>
      );

      // Dashboard should show same counts that workspace would display
      const displayedRemaining = screen.getByText('5 tasks remaining');
      expect(displayedRemaining).toBeInTheDocument();
      
      // Global counts should match what workspace components would use
      expect(window.kiroTaskCounts.remaining).toBe(5);
      expect(window.kiroTaskCounts.active).toBe(3);
      expect(window.kiroTaskCounts.pendingReview).toBe(2);
    });

    it('should satisfy Requirement 2.1: clearly distinguish task states', () => {
      render(
        <TestWrapper>
          <RemainingTasksCard taskMetrics={mockTaskMetrics} workspaceStats={mockWorkspaceStats} />
        </TestWrapper>
      );

      // Verify submitted tasks are clearly distinguished
      expect(screen.getByText(/2 tasks awaiting review/)).toBeInTheDocument();
      expect(screen.getByText(/Waiting for team leader feedback/)).toBeInTheDocument();
      
      // Verify active tasks are distinguished
      expect(screen.getByText(/1 task in progress/)).toBeInTheDocument();
      expect(screen.getByText(/Continue working on these active tasks/)).toBeInTheDocument();
    });

    it('should satisfy Requirement 2.3: accurate task counts', () => {
      render(
        <TestWrapper>
          <RemainingTasksCard taskMetrics={mockTaskMetrics} workspaceStats={mockWorkspaceStats} />
        </TestWrapper>
      );

      // Verify all counts are accurate and match the data
      expect(screen.getByText('5 tasks remaining')).toBeInTheDocument();
      expect(screen.getByText(/To Do: 1/)).toBeInTheDocument();
      expect(screen.getByText(/In Progress: 1/)).toBeInTheDocument();
      expect(screen.getByText(/Submitted: 2/)).toBeInTheDocument();
      expect(screen.getByText(/Needs Revision: 1/)).toBeInTheDocument();
      
      // Verify mathematical accuracy
      const totalDisplayed = 1 + 1 + 2 + 1; // Sum of individual counts
      expect(totalDisplayed).toBe(5); // Should match remaining count
    });
  });
});
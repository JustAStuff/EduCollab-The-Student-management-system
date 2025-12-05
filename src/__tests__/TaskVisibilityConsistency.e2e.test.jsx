import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import RemainingTasksCard from '../components/dashboard/RemainingTasksCard.jsx';
import taskCategorizationService from '../services/TaskCategorizationService.js';
import { statisticsService } from '../services/StatisticsService.js';

// Mock supabase client
vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(() => ({
            gte: vi.fn(() => ({
              order: vi.fn()
            }))
          }))
        })),
        gte: vi.fn(() => ({
          order: vi.fn()
        })),
        not: vi.fn(),
        in: vi.fn(() => ({
          order: vi.fn()
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn()
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn()
        }))
      })),
      upsert: vi.fn(() => ({
        select: vi.fn()
      }))
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'mock-url' } }))
      }))
    }
  }
}));

// Mock react-router-dom navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ workspaceId: 'test-workspace-1' })
  };
});

// Test wrapper component
const TestWrapper = ({ children, initialEntries = ['/'] }) => (
  <MemoryRouter initialEntries={initialEntries}>
    {children}
  </MemoryRouter>
);

describe('Task Visibility Consistency E2E Tests', () => {
  let mockTasks;
  let mockTaskMetrics;
  let mockWorkspaceStats;
  let consoleSpy;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    mockNavigate.mockClear();

    // Mock tasks in various statuses for comprehensive testing
    mockTasks = [
      {
        id: 1,
        title: 'Task 1 - Todo',
        description: 'A task to be started',
        status: 'todo',
        assigned_to: 'user-123',
        workspace_id: 'test-workspace-1',
        created_at: '2024-01-01T00:00:00Z',
        due_date: '2024-01-15T00:00:00Z'
      },
      {
        id: 2,
        title: 'Task 2 - In Progress',
        description: 'A task being worked on',
        status: 'in_progress',
        assigned_to: 'user-123',
        workspace_id: 'test-workspace-1',
        created_at: '2024-01-02T00:00:00Z',
        due_date: '2024-01-16T00:00:00Z'
      },
      {
        id: 3,
        title: 'Task 3 - Submitted',
        description: 'A task awaiting review',
        status: 'submitted',
        assigned_to: 'user-123',
        workspace_id: 'test-workspace-1',
        created_at: '2024-01-03T00:00:00Z',
        submitted_at: '2024-01-10T00:00:00Z',
        due_date: '2024-01-17T00:00:00Z'
      },
      {
        id: 4,
        title: 'Task 4 - Needs Revision',
        description: 'A task requiring changes',
        status: 'needs_revision',
        assigned_to: 'user-123',
        workspace_id: 'test-workspace-1',
        created_at: '2024-01-04T00:00:00Z',
        due_date: '2024-01-18T00:00:00Z'
      },
      {
        id: 5,
        title: 'Task 5 - Another Submitted',
        description: 'Another task awaiting review',
        status: 'submitted',
        assigned_to: 'user-123',
        workspace_id: 'test-workspace-1',
        created_at: '2024-01-05T00:00:00Z',
        submitted_at: '2024-01-11T00:00:00Z',
        due_date: '2024-01-19T00:00:00Z'
      },
      {
        id: 6,
        title: 'Task 6 - Completed',
        description: 'A completed task',
        status: 'completed',
        assigned_to: 'user-123',
        workspace_id: 'test-workspace-1',
        created_at: '2024-01-06T00:00:00Z',
        completed_at: '2024-01-12T00:00:00Z',
        due_date: '2024-01-20T00:00:00Z'
      }
    ];

    // Create task metrics using StatisticsService
    const taskStats = statisticsService.calculateTaskStats(mockTasks);
    mockTaskMetrics = {
      allTime: taskStats
    };

    mockWorkspaceStats = {
      mostActiveWorkspace: {
        id: 'test-workspace-1',
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

  describe('Dashboard Task Count Display and Consistency (Requirement 1.1, 1.2)', () => {
    it('should display consistent task counts using TaskCategorization service', async () => {
      render(
        <TestWrapper>
          <RemainingTasksCard taskMetrics={mockTaskMetrics} workspaceStats={mockWorkspaceStats} />
        </TestWrapper>
      );

      // Verify dashboard shows correct remaining count (5 tasks: todo + in_progress + submitted + needs_revision)
      await waitFor(() => {
        expect(screen.getByText('5 tasks remaining')).toBeInTheDocument();
      });

      // Verify global task counts are set correctly
      expect(window.kiroTaskCounts).toEqual({
        active: 3, // todo + in_progress + needs_revision
        pendingReview: 2, // submitted tasks
        completed: 1,
        remaining: 5, // active + pendingReview
        total: 6
      });

      // Verify task categorization matches expected counts
      const activeTasks = taskCategorizationService.getActiveTasks(mockTasks);
      const pendingTasks = taskCategorizationService.getPendingReviewTasks(mockTasks);
      expect(activeTasks.length + pendingTasks.length).toBe(5);
    });

    it('should include submitted tasks in dashboard remaining count (Requirement 1.2)', async () => {
      render(
        <TestWrapper>
          <RemainingTasksCard taskMetrics={mockTaskMetrics} workspaceStats={mockWorkspaceStats} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('5 tasks remaining')).toBeInTheDocument();
      });

      // Verify submitted tasks are included in remaining count
      expect(screen.getByText(/Submitted: 2/)).toBeInTheDocument();
      expect(screen.getByText(/2 tasks awaiting review/)).toBeInTheDocument();
      
      // Verify explanatory text about submitted tasks
      expect(screen.getByText(/includes submitted tasks awaiting review/)).toBeInTheDocument();
    });

    it('should maintain consistency when navigating from dashboard to workspace (Requirement 1.3)', async () => {
      render(
        <TestWrapper>
          <RemainingTasksCard taskMetrics={mockTaskMetrics} workspaceStats={mockWorkspaceStats} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Go to Test Workspace/)).toBeInTheDocument();
      });

      // Click navigation button
      const workspaceButton = screen.getByText('Go to Test Workspace');
      fireEvent.click(workspaceButton);

      // Verify navigation was called with correct workspace
      expect(mockNavigate).toHaveBeenCalledWith('/workspace-member/test-workspace-1');

      // Verify global counts are preserved for workspace to use
      expect(window.kiroTaskCounts.remaining).toBe(5);
      expect(window.kiroTaskCounts.active).toBe(3);
      expect(window.kiroTaskCounts.pendingReview).toBe(2);
    });
  });

  describe('Task Status Transitions Maintain Consistency (Requirement 1.1)', () => {
    it('should maintain consistency when task status changes from in_progress to submitted', () => {
      // Simulate task status change: in_progress -> submitted
      const updatedTasks = mockTasks.map(task => 
        task.id === 2 ? { ...task, status: 'submitted', submitted_at: '2024-01-13T00:00:00Z' } : task
      );

      // Verify counts updated correctly using TaskCategorization service
      const activeTasks = taskCategorizationService.getActiveTasks(updatedTasks);
      const pendingTasks = taskCategorizationService.getPendingReviewTasks(updatedTasks);
      
      expect(activeTasks.length).toBe(2); // One less active task
      expect(pendingTasks.length).toBe(3); // One more pending task
      expect(activeTasks.length + pendingTasks.length).toBe(5); // Total remaining unchanged

      // Verify StatisticsService produces consistent results
      const updatedStats = statisticsService.calculateTaskStats(updatedTasks);
      expect(updatedStats.remaining).toBe(5);
      expect(updatedStats.active).toBe(2);
      expect(updatedStats.pendingReview).toBe(3);
    });

    it('should maintain consistency when task status changes from submitted to completed', () => {
      // Simulate task completion: submitted -> completed
      const updatedTasks = mockTasks.map(task => 
        task.id === 3 ? { 
          ...task, 
          status: 'completed', 
          completed_at: '2024-01-14T00:00:00Z' 
        } : task
      );

      // Verify counts are correct
      const remainingTasks = taskCategorizationService.getRemainingTasks(updatedTasks);
      expect(remainingTasks.length).toBe(4); // One less remaining task

      // Verify StatisticsService produces consistent results
      const updatedStats = statisticsService.calculateTaskStats(updatedTasks);
      expect(updatedStats.remaining).toBe(4);
      expect(updatedStats.completed).toBe(2);
    });

    it('should maintain consistency when task status changes from submitted to needs_revision', () => {
      // Simulate task revision: submitted -> needs_revision
      const updatedTasks = mockTasks.map(task => 
        task.id === 5 ? { 
          ...task, 
          status: 'needs_revision',
          submitted_at: null // Clear submission timestamp
        } : task
      );

      // Verify task moved from pending to active category
      const activeTasks = taskCategorizationService.getActiveTasks(updatedTasks);
      const pendingTasks = taskCategorizationService.getPendingReviewTasks(updatedTasks);
      
      expect(activeTasks.length).toBe(4); // One more active task
      expect(pendingTasks.length).toBe(1); // One less pending task
      expect(activeTasks.length + pendingTasks.length).toBe(5); // Total remaining unchanged

      // Verify StatisticsService produces consistent results
      const updatedStats = statisticsService.calculateTaskStats(updatedTasks);
      expect(updatedStats.remaining).toBe(5);
      expect(updatedStats.active).toBe(4);
      expect(updatedStats.pendingReview).toBe(1);
    });
  });

  describe('Task Distribution and Categorization (Requirement 1.3, 2.1)', () => {
    it('should correctly categorize tasks for workspace display', () => {
      // Verify tasks are categorized correctly using TaskCategorization service
      const activeTasks = taskCategorizationService.getActiveTasks(mockTasks);
      const pendingTasks = taskCategorizationService.getPendingReviewTasks(mockTasks);
      const completedTasks = taskCategorizationService.getCompletedTasks(mockTasks);

      // Verify correct task distribution
      expect(activeTasks.length).toBe(3); // todo, in_progress, needs_revision
      expect(pendingTasks.length).toBe(2); // submitted tasks
      expect(completedTasks.length).toBe(1); // completed task

      // Verify specific tasks are in correct categories
      expect(activeTasks.map(t => t.status)).toEqual(
        expect.arrayContaining(['todo', 'in_progress', 'needs_revision'])
      );
      expect(pendingTasks.every(t => t.status === 'submitted')).toBe(true);
      expect(completedTasks.every(t => t.status === 'completed')).toBe(true);
    });

    it('should handle empty task arrays gracefully', () => {
      const emptyTasks = [];
      
      const activeTasks = taskCategorizationService.getActiveTasks(emptyTasks);
      const pendingTasks = taskCategorizationService.getPendingReviewTasks(emptyTasks);
      const completedTasks = taskCategorizationService.getCompletedTasks(emptyTasks);

      expect(activeTasks.length).toBe(0);
      expect(pendingTasks.length).toBe(0);
      expect(completedTasks.length).toBe(0);

      // Verify StatisticsService handles empty arrays
      const emptyStats = statisticsService.calculateTaskStats(emptyTasks);
      expect(emptyStats.remaining).toBe(0);
      expect(emptyStats.total).toBe(0);
    });

    it('should maintain mathematical consistency in task counts', () => {
      const taskCounts = taskCategorizationService.getTaskCounts(mockTasks);
      
      // Verify mathematical relationships
      expect(taskCounts.remaining).toBe(taskCounts.active + taskCounts.pendingReview);
      expect(taskCounts.total).toBe(taskCounts.active + taskCounts.pendingReview + taskCounts.completed);
      
      // Verify against StatisticsService
      const stats = statisticsService.calculateTaskStats(mockTasks);
      expect(stats.remaining).toBe(taskCounts.remaining);
      expect(stats.active).toBe(taskCounts.active);
      expect(stats.pendingReview).toBe(taskCounts.pendingReview);
      expect(stats.completed).toBe(taskCounts.completed);
    });
  });

  describe('Task Categorization Service Integration (Requirement 3.1, 3.3)', () => {
    it('should use consistent filtering logic across components', () => {
      // Get categorization directly from service
      const activeTasks = taskCategorizationService.getActiveTasks(mockTasks);
      const pendingTasks = taskCategorizationService.getPendingReviewTasks(mockTasks);
      const completedTasks = taskCategorizationService.getCompletedTasks(mockTasks);
      const remainingTasks = taskCategorizationService.getRemainingTasks(mockTasks);

      // Verify service categorization matches expected counts
      expect(activeTasks.length).toBe(3);
      expect(pendingTasks.length).toBe(2);
      expect(completedTasks.length).toBe(1);
      expect(remainingTasks.length).toBe(5);

      // Verify StatisticsService uses same logic
      const stats = statisticsService.calculateTaskStats(mockTasks);
      expect(stats.active).toBe(activeTasks.length);
      expect(stats.pendingReview).toBe(pendingTasks.length);
      expect(stats.completed).toBe(completedTasks.length);
      expect(stats.remaining).toBe(remainingTasks.length);
    });

    it('should validate categorization consistency and log warnings', () => {
      // Mock validation to fail
      const originalValidate = taskCategorizationService.validateCategorization;
      taskCategorizationService.validateCategorization = vi.fn().mockReturnValue({
        isValid: false,
        error: 'Test validation error'
      });

      // Test with RemainingTasksCard component
      render(
        <TestWrapper>
          <RemainingTasksCard taskMetrics={mockTaskMetrics} workspaceStats={mockWorkspaceStats} />
        </TestWrapper>
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Task categorization validation failed'),
        'Test validation error'
      );

      // Restore original method
      taskCategorizationService.validateCategorization = originalValidate;
    });

    it('should handle TaskCategorization service errors gracefully', () => {
      // Mock service to throw error
      const originalSafeOperation = taskCategorizationService.safeOperation;
      taskCategorizationService.safeOperation = vi.fn().mockImplementation(() => {
        throw new Error('TaskCategorization service error');
      });

      // Should still work with fallback logic
      const stats = statisticsService.calculateTaskStats(mockTasks);
      expect(stats).toHaveProperty('remaining');
      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('pendingReview');

      // Restore original method
      taskCategorizationService.safeOperation = originalSafeOperation;
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle tasks with invalid or missing status', () => {
      const tasksWithInvalidStatus = [
        ...mockTasks,
        { id: 7, title: 'Invalid Task', status: 'invalid_status', assigned_to: 'user-123' },
        { id: 8, title: 'Missing Status Task', assigned_to: 'user-123' }
      ];

      // Should handle invalid tasks gracefully
      const stats = statisticsService.calculateTaskStats(tasksWithInvalidStatus);
      expect(stats).toHaveProperty('remaining');
      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('pendingReview');
      
      // TaskCategorization service should filter out invalid tasks
      const activeTasks = taskCategorizationService.getActiveTasks(tasksWithInvalidStatus);
      const pendingTasks = taskCategorizationService.getPendingReviewTasks(tasksWithInvalidStatus);
      
      // Should only count valid tasks
      expect(activeTasks.length).toBe(3); // Original valid active tasks
      expect(pendingTasks.length).toBe(2); // Original valid pending tasks
    });

    it('should handle rapid task status changes', () => {
      let taskData = [...mockTasks];

      // Simulate rapid status changes
      const statusChanges = [
        { id: 1, status: 'in_progress' },
        { id: 2, status: 'submitted' },
        { id: 4, status: 'submitted' }
      ];

      statusChanges.forEach(change => {
        taskData = taskData.map(task => 
          task.id === change.id ? { ...task, status: change.status } : task
        );
      });

      // Verify counts are still mathematically consistent
      const remainingTasks = taskCategorizationService.getRemainingTasks(taskData);
      const activeTasks = taskCategorizationService.getActiveTasks(taskData);
      const pendingTasks = taskCategorizationService.getPendingReviewTasks(taskData);

      expect(remainingTasks.length).toBe(activeTasks.length + pendingTasks.length);
      
      // Verify StatisticsService maintains consistency
      const stats = statisticsService.calculateTaskStats(taskData);
      expect(stats.remaining).toBe(stats.active + stats.pendingReview);
    });

    it('should maintain consistency with null and undefined values', () => {
      const tasksWithNulls = [
        ...mockTasks,
        null,
        undefined,
        { id: 7, status: null },
        { id: 8, status: undefined }
      ];

      // Should handle null/undefined gracefully
      const stats = statisticsService.calculateTaskStats(tasksWithNulls);
      expect(stats.remaining).toBeGreaterThanOrEqual(0);
      expect(stats.total).toBeGreaterThanOrEqual(0);
      
      // TaskCategorization should filter out invalid entries
      const activeTasks = taskCategorizationService.getActiveTasks(tasksWithNulls);
      expect(activeTasks).toBeInstanceOf(Array);
      expect(activeTasks.every(task => task && task.status)).toBe(true);
    });
  });

  describe('Requirements Compliance Verification', () => {
    it('should satisfy all Requirement 1.1 criteria: consistent task visibility', () => {
      // Dashboard remaining count should match workspace visible tasks
      const dashboardStats = statisticsService.calculateTaskStats(mockTasks);
      const workspaceActive = taskCategorizationService.getActiveTasks(mockTasks);
      const workspaceSubmitted = taskCategorizationService.getPendingReviewTasks(mockTasks);
      
      const dashboardRemaining = dashboardStats.remaining;
      const workspaceVisible = workspaceActive.length + workspaceSubmitted.length;
      
      expect(dashboardRemaining).toBe(workspaceVisible);
      expect(dashboardRemaining).toBe(5);
      expect(workspaceVisible).toBe(5);
    });

    it('should satisfy all Requirement 1.2 criteria: submitted tasks counted consistently', () => {
      const stats = statisticsService.calculateTaskStats(mockTasks);
      
      // Submitted tasks should be included in remaining count
      expect(stats.remaining).toBe(5);
      expect(stats.pendingReview).toBe(2); // 2 submitted tasks
      expect(stats.byStatus.submitted).toBe(2);
      
      // Remaining should include submitted tasks
      expect(stats.remaining).toBeGreaterThanOrEqual(stats.pendingReview);
    });

    it('should satisfy all Requirement 2.1 criteria: clearly distinguish task states', () => {
      const activeTasks = taskCategorizationService.getActiveTasks(mockTasks);
      const pendingTasks = taskCategorizationService.getPendingReviewTasks(mockTasks);
      const completedTasks = taskCategorizationService.getCompletedTasks(mockTasks);
      
      // Tasks should be clearly distinguished by state
      expect(activeTasks.length).toBe(3);
      expect(pendingTasks.length).toBe(2);
      expect(completedTasks.length).toBe(1);
      
      // Verify specific task categorization
      expect(activeTasks.some(t => t.status === 'todo')).toBe(true);
      expect(activeTasks.some(t => t.status === 'in_progress')).toBe(true);
      expect(activeTasks.some(t => t.status === 'needs_revision')).toBe(true);
      expect(pendingTasks.every(t => t.status === 'submitted')).toBe(true);
      expect(completedTasks.every(t => t.status === 'completed')).toBe(true);
    });

    it('should satisfy all Requirement 3.1 and 3.3 criteria: consistent filtering and standardized calculations', () => {
      // Test consistency between TaskCategorization service and StatisticsService
      const taskCounts = taskCategorizationService.getTaskCounts(mockTasks);
      const stats = statisticsService.calculateTaskStats(mockTasks);
      
      // Should use same filtering logic
      expect(stats.active).toBe(taskCounts.active);
      expect(stats.pendingReview).toBe(taskCounts.pendingReview);
      expect(stats.completed).toBe(taskCounts.completed);
      expect(stats.remaining).toBe(taskCounts.remaining);
      expect(stats.total).toBe(taskCounts.total);
      
      // Should have standardized calculation method
      expect(stats.remaining).toBe(stats.active + stats.pendingReview);
      expect(stats.total).toBe(stats.active + stats.pendingReview + stats.completed);
      expect(stats.completionRate).toBe(Math.round((stats.completed / stats.total) * 100));
    });
  });
});
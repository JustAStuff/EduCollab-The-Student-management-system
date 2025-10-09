import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import taskCategorizationService from '../TaskCategorizationService.js';

describe('TaskCategorizationService', () => {
  let mockTasks;
  let consoleSpy;

  beforeEach(() => {
    // Reset mock tasks before each test
    mockTasks = [
      { id: 1, status: 'todo', title: 'Task 1' },
      { id: 2, status: 'in_progress', title: 'Task 2' },
      { id: 3, status: 'submitted', title: 'Task 3' },
      { id: 4, status: 'completed', title: 'Task 4' },
      { id: 5, status: 'needs_revision', title: 'Task 5' },
      { id: 6, status: 'todo', title: 'Task 6' },
      { id: 7, status: 'submitted', title: 'Task 7' }
    ];

    // Spy on console.warn to test error handling
    consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('getActiveTasks', () => {
    it('should return tasks with todo, in_progress, and needs_revision statuses', () => {
      const result = taskCategorizationService.getActiveTasks(mockTasks);
      
      expect(result).toHaveLength(4);
      expect(result.map(t => t.id)).toEqual([1, 2, 5, 6]);
      expect(result.every(t => ['todo', 'in_progress', 'needs_revision'].includes(t.status))).toBe(true);
    });

    it('should return empty array for empty input', () => {
      const result = taskCategorizationService.getActiveTasks([]);
      expect(result).toEqual([]);
    });

    it('should handle non-array input gracefully', () => {
      const result = taskCategorizationService.getActiveTasks(null);
      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('TaskCategorization: getActiveTasks received non-array input');
    });

    it('should filter out null/undefined tasks', () => {
      const tasksWithNulls = [
        { id: 1, status: 'todo' },
        null,
        { id: 2, status: 'in_progress' },
        undefined,
        { id: 3, status: 'completed' }
      ];
      
      const result = taskCategorizationService.getActiveTasks(tasksWithNulls);
      expect(result).toHaveLength(2);
      expect(result.map(t => t.id)).toEqual([1, 2]);
    });

    it('should handle tasks with invalid statuses', () => {
      const tasksWithInvalidStatus = [
        { id: 1, status: 'todo' },
        { id: 2, status: 'invalid_status' },
        { id: 3, status: 'in_progress' }
      ];
      
      const result = taskCategorizationService.getActiveTasks(tasksWithInvalidStatus);
      expect(result).toHaveLength(2);
      expect(result.map(t => t.id)).toEqual([1, 3]);
    });
  });

  describe('getPendingReviewTasks', () => {
    it('should return only tasks with submitted status', () => {
      const result = taskCategorizationService.getPendingReviewTasks(mockTasks);
      
      expect(result).toHaveLength(2);
      expect(result.map(t => t.id)).toEqual([3, 7]);
      expect(result.every(t => t.status === 'submitted')).toBe(true);
    });

    it('should return empty array when no submitted tasks exist', () => {
      const tasksWithoutSubmitted = mockTasks.filter(t => t.status !== 'submitted');
      const result = taskCategorizationService.getPendingReviewTasks(tasksWithoutSubmitted);
      expect(result).toEqual([]);
    });

    it('should handle non-array input gracefully', () => {
      const result = taskCategorizationService.getPendingReviewTasks('invalid');
      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('TaskCategorization: getPendingReviewTasks received non-array input');
    });

    it('should filter out null/undefined tasks', () => {
      const tasksWithNulls = [
        { id: 1, status: 'submitted' },
        null,
        { id: 2, status: 'submitted' },
        undefined
      ];
      
      const result = taskCategorizationService.getPendingReviewTasks(tasksWithNulls);
      expect(result).toHaveLength(2);
      expect(result.map(t => t.id)).toEqual([1, 2]);
    });
  });

  describe('getCompletedTasks', () => {
    it('should return only tasks with completed status', () => {
      const result = taskCategorizationService.getCompletedTasks(mockTasks);
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(4);
      expect(result[0].status).toBe('completed');
    });

    it('should return empty array when no completed tasks exist', () => {
      const tasksWithoutCompleted = mockTasks.filter(t => t.status !== 'completed');
      const result = taskCategorizationService.getCompletedTasks(tasksWithoutCompleted);
      expect(result).toEqual([]);
    });

    it('should handle non-array input gracefully', () => {
      const result = taskCategorizationService.getCompletedTasks({});
      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('TaskCategorization: getCompletedTasks received non-array input');
    });

    it('should filter out null/undefined tasks', () => {
      const tasksWithNulls = [
        { id: 1, status: 'completed' },
        null,
        { id: 2, status: 'todo' },
        undefined,
        { id: 3, status: 'completed' }
      ];
      
      const result = taskCategorizationService.getCompletedTasks(tasksWithNulls);
      expect(result).toHaveLength(2);
      expect(result.map(t => t.id)).toEqual([1, 3]);
    });
  });

  describe('getRemainingTasks', () => {
    it('should return all tasks except completed ones', () => {
      const result = taskCategorizationService.getRemainingTasks(mockTasks);
      
      expect(result).toHaveLength(6);
      expect(result.map(t => t.id)).toEqual([1, 2, 3, 5, 6, 7]);
      expect(result.every(t => t.status !== 'completed')).toBe(true);
    });

    it('should return empty array when all tasks are completed', () => {
      const completedTasks = [
        { id: 1, status: 'completed' },
        { id: 2, status: 'completed' }
      ];
      
      const result = taskCategorizationService.getRemainingTasks(completedTasks);
      expect(result).toEqual([]);
    });

    it('should handle non-array input gracefully', () => {
      const result = taskCategorizationService.getRemainingTasks(undefined);
      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('TaskCategorization: getRemainingTasks received non-array input');
    });

    it('should include submitted tasks in remaining count', () => {
      const result = taskCategorizationService.getRemainingTasks(mockTasks);
      const submittedTasks = result.filter(t => t.status === 'submitted');
      expect(submittedTasks).toHaveLength(2);
    });
  });

  describe('getTaskCounts', () => {
    it('should return correct counts for all categories', () => {
      const result = taskCategorizationService.getTaskCounts(mockTasks);
      
      expect(result).toEqual({
        active: 4,        // todo(2) + in_progress(1) + needs_revision(1)
        pendingReview: 2, // submitted(2)
        completed: 1,     // completed(1)
        remaining: 6,     // total(7) - completed(1)
        total: 7
      });
    });

    it('should return zero counts for empty array', () => {
      const result = taskCategorizationService.getTaskCounts([]);
      
      expect(result).toEqual({
        active: 0,
        pendingReview: 0,
        completed: 0,
        remaining: 0,
        total: 0
      });
    });

    it('should handle non-array input gracefully', () => {
      const result = taskCategorizationService.getTaskCounts('not-an-array');
      
      expect(result).toEqual({
        active: 0,
        pendingReview: 0,
        completed: 0,
        remaining: 0,
        total: 0
      });
      expect(consoleSpy).toHaveBeenCalledWith('TaskCategorization: getTaskCounts received non-array input');
    });

    it('should handle array with mixed valid and invalid tasks', () => {
      const mixedTasks = [
        { id: 1, status: 'todo' },
        null,
        { id: 2, status: 'completed' },
        { id: 3, status: 'invalid_status' },
        { id: 4, status: 'submitted' }
      ];
      
      const result = taskCategorizationService.getTaskCounts(mixedTasks);
      
      expect(result).toEqual({
        active: 1,        // todo(1)
        pendingReview: 1, // submitted(1)
        completed: 1,     // completed(1)
        remaining: 2,     // todo(1) + submitted(1)
        total: 5
      });
    });
  });  
describe('getTasksByStatus', () => {
    it('should return correct counts for each specific status', () => {
      const result = taskCategorizationService.getTasksByStatus(mockTasks);
      
      expect(result).toEqual({
        todo: 2,
        inProgress: 1,
        submitted: 2,
        completed: 1,
        needsRevision: 1
      });
    });

    it('should return zero counts for empty array', () => {
      const result = taskCategorizationService.getTasksByStatus([]);
      
      expect(result).toEqual({
        todo: 0,
        inProgress: 0,
        submitted: 0,
        completed: 0,
        needsRevision: 0
      });
    });

    it('should handle non-array input gracefully', () => {
      const result = taskCategorizationService.getTasksByStatus(42);
      
      expect(result).toEqual({
        todo: 0,
        inProgress: 0,
        submitted: 0,
        completed: 0,
        needsRevision: 0
      });
      expect(consoleSpy).toHaveBeenCalledWith('TaskCategorization: getTasksByStatus received non-array input');
    });

    it('should handle tasks with unknown statuses', () => {
      const tasksWithUnknownStatus = [
        { id: 1, status: 'todo' },
        { id: 2, status: 'unknown_status' },
        { id: 3, status: 'completed' }
      ];
      
      const result = taskCategorizationService.getTasksByStatus(tasksWithUnknownStatus);
      
      expect(result).toEqual({
        todo: 1,
        inProgress: 0,
        submitted: 0,
        completed: 1,
        needsRevision: 0
      });
    });

    it('should filter out null/undefined tasks', () => {
      const tasksWithNulls = [
        { id: 1, status: 'todo' },
        null,
        { id: 2, status: 'completed' },
        undefined,
        { id: 3, status: 'in_progress' }
      ];
      
      const result = taskCategorizationService.getTasksByStatus(tasksWithNulls);
      
      expect(result).toEqual({
        todo: 1,
        inProgress: 1,
        submitted: 0,
        completed: 1,
        needsRevision: 0
      });
    });
  });

  describe('validateCategorization', () => {
    it('should validate correct task categorization', () => {
      const result = taskCategorizationService.validateCategorization(mockTasks);
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
      expect(result.counts).toEqual({
        active: 4,
        pendingReview: 2,
        completed: 1,
        remaining: 6,
        total: 7
      });
      expect(result.statusCounts).toEqual({
        todo: 2,
        inProgress: 1,
        submitted: 2,
        completed: 1,
        needsRevision: 1
      });
      expect(result.categorizedTotal).toBe(7);
      expect(result.statusTotal).toBe(7);
    });

    it('should return invalid for non-array input', () => {
      const result = taskCategorizationService.validateCategorization('invalid');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid input: tasks must be an array');
    });

    it('should validate empty array correctly', () => {
      const result = taskCategorizationService.validateCategorization([]);
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
      expect(result.counts.total).toBe(0);
      expect(result.categorizedTotal).toBe(0);
      expect(result.statusTotal).toBe(0);
    });

    it('should handle tasks with null values', () => {
      const tasksWithNulls = [
        { id: 1, status: 'todo' },
        null,
        { id: 2, status: 'completed' }
      ];
      
      const result = taskCategorizationService.validateCategorization(tasksWithNulls);
      
      expect(result.isValid).toBe(true);
      expect(result.counts.total).toBe(3);
      expect(result.categorizedTotal).toBe(2); // Only valid tasks counted in categories
      expect(result.statusTotal).toBe(2);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle tasks without status property', () => {
      const tasksWithoutStatus = [
        { id: 1, title: 'Task without status' },
        { id: 2, status: 'todo' },
        { id: 3 } // No status property
      ];
      
      const activeTasks = taskCategorizationService.getActiveTasks(tasksWithoutStatus);
      const counts = taskCategorizationService.getTaskCounts(tasksWithoutStatus);
      
      expect(activeTasks).toHaveLength(1);
      expect(activeTasks[0].id).toBe(2);
      expect(counts.total).toBe(3);
      expect(counts.active).toBe(1);
    });

    it('should handle very large arrays efficiently', () => {
      const largeTasks = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        status: ['todo', 'in_progress', 'submitted', 'completed', 'needs_revision'][i % 5]
      }));
      
      const start = performance.now();
      const counts = taskCategorizationService.getTaskCounts(largeTasks);
      const end = performance.now();
      
      expect(counts.total).toBe(10000);
      expect(counts.active).toBe(6000); // todo(2000) + in_progress(2000) + needs_revision(2000)
      expect(counts.pendingReview).toBe(2000); // submitted(2000)
      expect(counts.completed).toBe(2000); // completed(2000)
      expect(end - start).toBeLessThan(100); // Should complete in under 100ms
    });

    it('should maintain consistency across all methods', () => {
      const activeTasks = taskCategorizationService.getActiveTasks(mockTasks);
      const pendingTasks = taskCategorizationService.getPendingReviewTasks(mockTasks);
      const completedTasks = taskCategorizationService.getCompletedTasks(mockTasks);
      const remainingTasks = taskCategorizationService.getRemainingTasks(mockTasks);
      const counts = taskCategorizationService.getTaskCounts(mockTasks);
      
      // Verify consistency
      expect(activeTasks.length).toBe(counts.active);
      expect(pendingTasks.length).toBe(counts.pendingReview);
      expect(completedTasks.length).toBe(counts.completed);
      expect(remainingTasks.length).toBe(counts.remaining);
      
      // Verify remaining = active + pending
      expect(counts.remaining).toBe(counts.active + counts.pendingReview);
      
      // Verify total = active + pending + completed
      expect(counts.total).toBe(counts.active + counts.pendingReview + counts.completed);
    });

    it('should handle tasks with extra properties', () => {
      const tasksWithExtraProps = [
        { 
          id: 1, 
          status: 'todo', 
          title: 'Task 1',
          assignee: 'user1',
          priority: 'high',
          metadata: { custom: 'data' }
        },
        { 
          id: 2, 
          status: 'completed',
          description: 'Long description',
          tags: ['urgent', 'bug']
        }
      ];
      
      const activeTasks = taskCategorizationService.getActiveTasks(tasksWithExtraProps);
      const completedTasks = taskCategorizationService.getCompletedTasks(tasksWithExtraProps);
      
      expect(activeTasks).toHaveLength(1);
      expect(activeTasks[0].title).toBe('Task 1');
      expect(activeTasks[0].priority).toBe('high');
      expect(completedTasks).toHaveLength(1);
      expect(completedTasks[0].tags).toEqual(['urgent', 'bug']);
    });

    it('should handle case-sensitive status values', () => {
      const tasksWithCaseSensitiveStatus = [
        { id: 1, status: 'TODO' }, // Uppercase
        { id: 2, status: 'Todo' }, // Mixed case
        { id: 3, status: 'todo' }, // Correct lowercase
        { id: 4, status: 'COMPLETED' }
      ];
      
      const activeTasks = taskCategorizationService.getActiveTasks(tasksWithCaseSensitiveStatus);
      const completedTasks = taskCategorizationService.getCompletedTasks(tasksWithCaseSensitiveStatus);
      
      // Only exact matches should be included
      expect(activeTasks).toHaveLength(1);
      expect(activeTasks[0].id).toBe(3);
      expect(completedTasks).toHaveLength(0); // 'COMPLETED' !== 'completed'
    });
  });

  describe('Integration with Requirements', () => {
    it('should satisfy requirement 3.1: consistent filtering logic', () => {
      // Test that the same task array produces consistent results across methods
      const testTasks = [
        { id: 1, status: 'todo' },
        { id: 2, status: 'submitted' },
        { id: 3, status: 'completed' }
      ];
      
      const activeTasks = taskCategorizationService.getActiveTasks(testTasks);
      const pendingTasks = taskCategorizationService.getPendingReviewTasks(testTasks);
      const completedTasks = taskCategorizationService.getCompletedTasks(testTasks);
      const remainingTasks = taskCategorizationService.getRemainingTasks(testTasks);
      
      // Verify no task appears in multiple categories incorrectly
      const allCategorizedTasks = [...activeTasks, ...pendingTasks, ...completedTasks];
      const uniqueIds = new Set(allCategorizedTasks.map(t => t.id));
      expect(uniqueIds.size).toBe(allCategorizedTasks.length);
      
      // Verify remaining includes active and pending but not completed
      expect(remainingTasks.map(t => t.id).sort()).toEqual([1, 2]);
    });

    it('should satisfy requirement 3.2: same criteria applied across views', () => {
      // Test that filtering criteria are consistent
      const mixedTasks = [
        { id: 1, status: 'todo' },
        { id: 2, status: 'in_progress' },
        { id: 3, status: 'needs_revision' },
        { id: 4, status: 'submitted' },
        { id: 5, status: 'completed' }
      ];
      
      const counts = taskCategorizationService.getTaskCounts(mixedTasks);
      const statusCounts = taskCategorizationService.getTasksByStatus(mixedTasks);
      
      // Verify active tasks include all expected statuses
      expect(counts.active).toBe(3); // todo + in_progress + needs_revision
      expect(statusCounts.todo + statusCounts.inProgress + statusCounts.needsRevision).toBe(3);
      
      // Verify pending review includes only submitted
      expect(counts.pendingReview).toBe(1);
      expect(statusCounts.submitted).toBe(1);
    });

    it('should satisfy requirement 3.3: standardized calculation method', () => {
      // Test that calculation methods are standardized and predictable
      const testScenarios = [
        { tasks: [], expected: { active: 0, pendingReview: 0, completed: 0, remaining: 0 } },
        { 
          tasks: [{ id: 1, status: 'todo' }], 
          expected: { active: 1, pendingReview: 0, completed: 0, remaining: 1 } 
        },
        { 
          tasks: [{ id: 1, status: 'submitted' }], 
          expected: { active: 0, pendingReview: 1, completed: 0, remaining: 1 } 
        },
        { 
          tasks: [{ id: 1, status: 'completed' }], 
          expected: { active: 0, pendingReview: 0, completed: 1, remaining: 0 } 
        }
      ];
      
      testScenarios.forEach(({ tasks, expected }) => {
        const counts = taskCategorizationService.getTaskCounts(tasks);
        expect(counts.active).toBe(expected.active);
        expect(counts.pendingReview).toBe(expected.pendingReview);
        expect(counts.completed).toBe(expected.completed);
        expect(counts.remaining).toBe(expected.remaining);
      });
    });
  });

  describe('Error Handling and Validation', () => {
    describe('safeOperation', () => {
      it('should execute operation successfully with valid input', () => {
        const tasks = [
          { id: 1, status: 'todo' },
          { id: 2, status: 'completed' }
        ];

        const result = taskCategorizationService.safeOperation(
          tasks, 
          (t) => taskCategorizationService.getActiveTasks(t), 
          'getActiveTasks'
        );
        
        expect(result).toHaveLength(1);
        expect(result[0].status).toBe('todo');
      });

      it('should return fallback result for non-array input', () => {
        const result = taskCategorizationService.safeOperation(
          'not an array', 
          (t) => taskCategorizationService.getActiveTasks(t), 
          'getActiveTasks'
        );
        
        expect(result).toEqual([]);
        expect(consoleSpy).toHaveBeenCalledWith('TaskCategorization: getActiveTasks received non-array input, using fallback');
      });

      it('should handle operation errors gracefully', () => {
        const mockOperation = vi.fn().mockImplementation(() => {
          throw new Error('Test error');
        });

        const result = taskCategorizationService.safeOperation(
          [], 
          mockOperation, 
          'getActiveTasks'
        );
        
        expect(result).toEqual([]);
        expect(mockOperation).toHaveBeenCalled();
      });

      it('should return correct fallback for getTaskCounts operation', () => {
        const result = taskCategorizationService.safeOperation(
          null, 
          (t) => taskCategorizationService.getTaskCounts(t), 
          'getTaskCounts'
        );
        
        expect(result).toEqual({
          active: 0,
          pendingReview: 0,
          completed: 0,
          remaining: 0,
          total: 0
        });
      });

      it('should validate categorization during safe operations', () => {
        const tasks = [
          { id: 1, status: 'todo' },
          { id: 2, status: 'completed' }
        ];

        taskCategorizationService.safeOperation(
          tasks, 
          (t) => taskCategorizationService.getTaskCounts(t), 
          'getTaskCounts'
        );
        
        // Should not warn for valid categorization
        expect(consoleSpy).not.toHaveBeenCalledWith(
          expect.stringContaining('Inconsistency detected')
        );
      });
    });

    describe('getFallbackResult', () => {
      it('should return empty array for task filtering operations', () => {
        expect(taskCategorizationService.getFallbackResult('getActiveTasks')).toEqual([]);
        expect(taskCategorizationService.getFallbackResult('getPendingReviewTasks')).toEqual([]);
        expect(taskCategorizationService.getFallbackResult('getCompletedTasks')).toEqual([]);
        expect(taskCategorizationService.getFallbackResult('getRemainingTasks')).toEqual([]);
      });

      it('should return zero counts for count operations', () => {
        const result = taskCategorizationService.getFallbackResult('getTaskCounts');
        expect(result).toEqual({
          active: 0,
          pendingReview: 0,
          completed: 0,
          remaining: 0,
          total: 0
        });
      });

      it('should return zero status counts for status operations', () => {
        const result = taskCategorizationService.getFallbackResult('getTasksByStatus');
        expect(result).toEqual({
          todo: 0,
          inProgress: 0,
          submitted: 0,
          completed: 0,
          needsRevision: 0
        });
      });

      it('should return null for unknown operations', () => {
        expect(taskCategorizationService.getFallbackResult('unknownOperation')).toBeNull();
      });
    });

    describe('validateDashboardWorkspaceConsistency', () => {
      it('should detect consistent counts', () => {
        const dashboardCounts = {
          active: 2,
          pendingReview: 1,
          completed: 3,
          remaining: 3
        };
        
        const workspaceCounts = {
          active: 2,
          pendingReview: 1,
          completed: 3,
          remaining: 3
        };

        const result = taskCategorizationService.validateDashboardWorkspaceConsistency(dashboardCounts, workspaceCounts);
        
        expect(result.isConsistent).toBe(true);
        expect(result.inconsistencies).toHaveLength(0);
        expect(result.dashboardCounts).toEqual(dashboardCounts);
        expect(result.workspaceCounts).toEqual(workspaceCounts);
      });

      it('should detect inconsistent counts', () => {
        const dashboardCounts = {
          active: 2,
          pendingReview: 1,
          completed: 3,
          remaining: 3
        };
        
        const workspaceCounts = {
          active: 1, // Different
          pendingReview: 2, // Different
          completed: 3,
          remaining: 3
        };

        const result = taskCategorizationService.validateDashboardWorkspaceConsistency(dashboardCounts, workspaceCounts);
        
        expect(result.isConsistent).toBe(false);
        expect(result.inconsistencies).toHaveLength(2);
        expect(result.inconsistencies[0].field).toBe('active');
        expect(result.inconsistencies[0].difference).toBe(1);
        expect(result.inconsistencies[1].field).toBe('pendingReview');
        expect(result.inconsistencies[1].difference).toBe(-1);
        expect(consoleSpy).toHaveBeenCalledWith(
          'TaskCategorization: Dashboard-Workspace count inconsistencies detected:', 
          expect.any(Array)
        );
      });

      it('should handle errors gracefully', () => {
        const result = taskCategorizationService.validateDashboardWorkspaceConsistency(null, undefined);
        
        expect(result.isConsistent).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.inconsistencies).toEqual([]);
      });

      it('should detect all types of inconsistencies', () => {
        const dashboardCounts = {
          active: 5,
          pendingReview: 3,
          completed: 2,
          remaining: 8
        };
        
        const workspaceCounts = {
          active: 4,
          pendingReview: 2,
          completed: 3,
          remaining: 6
        };

        const result = taskCategorizationService.validateDashboardWorkspaceConsistency(dashboardCounts, workspaceCounts);
        
        expect(result.isConsistent).toBe(false);
        expect(result.inconsistencies).toHaveLength(4);
        
        const fields = result.inconsistencies.map(i => i.field);
        expect(fields).toContain('active');
        expect(fields).toContain('pendingReview');
        expect(fields).toContain('completed');
        expect(fields).toContain('remaining');
      });
    });

    describe('Error Recovery and Logging', () => {
      it('should log warnings for invalid inputs', () => {
        taskCategorizationService.getActiveTasks(null);
        taskCategorizationService.getPendingReviewTasks(undefined);
        taskCategorizationService.getCompletedTasks('string');
        taskCategorizationService.getRemainingTasks(123);
        
        expect(consoleSpy).toHaveBeenCalledTimes(4);
        expect(consoleSpy).toHaveBeenCalledWith('TaskCategorization: getActiveTasks received non-array input');
        expect(consoleSpy).toHaveBeenCalledWith('TaskCategorization: getPendingReviewTasks received non-array input');
        expect(consoleSpy).toHaveBeenCalledWith('TaskCategorization: getCompletedTasks received non-array input');
        expect(consoleSpy).toHaveBeenCalledWith('TaskCategorization: getRemainingTasks received non-array input');
      });

      it('should maintain service availability during errors', () => {
        // Even with invalid inputs, service should continue to work
        const invalidResult1 = taskCategorizationService.getTaskCounts(null);
        const invalidResult2 = taskCategorizationService.getTasksByStatus('invalid');
        
        // Valid operation should still work after errors
        const validTasks = [{ id: 1, status: 'todo' }];
        const validResult = taskCategorizationService.getTaskCounts(validTasks);
        
        expect(invalidResult1.total).toBe(0);
        expect(invalidResult2.todo).toBe(0);
        expect(validResult.total).toBe(1);
        expect(validResult.active).toBe(1);
      });

      it('should provide detailed error information in validation', () => {
        const tasks = [
          { id: 1, status: 'todo' },
          { id: 2, status: 'completed' }
        ];
        
        const validation = taskCategorizationService.validateCategorization(tasks);
        
        expect(validation).toHaveProperty('isValid');
        expect(validation).toHaveProperty('counts');
        expect(validation).toHaveProperty('statusCounts');
        expect(validation).toHaveProperty('categorizedTotal');
        expect(validation).toHaveProperty('statusTotal');
        expect(validation).toHaveProperty('error');
      });
    });
  });
});
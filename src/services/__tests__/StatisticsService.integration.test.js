import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { statisticsService } from '../StatisticsService.js';
import taskCategorizationService from '../TaskCategorizationService.js';

// Mock supabase client
vi.mock('../../supabaseClient', () => ({
  supabase: {
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
        not: vi.fn()
      }))
    }))
  }
}));

describe('StatisticsService Integration with TaskCategorization', () => {
  let mockTasks;
  let consoleSpy;

  beforeEach(() => {
    // Reset mock tasks before each test
    mockTasks = [
      { id: 1, status: 'todo', title: 'Task 1', created_at: '2024-01-01', assigned_to: 'user1' },
      { id: 2, status: 'in_progress', title: 'Task 2', created_at: '2024-01-02', assigned_to: 'user1' },
      { id: 3, status: 'submitted', title: 'Task 3', created_at: '2024-01-03', assigned_to: 'user1', submitted_at: '2024-01-04' },
      { id: 4, status: 'completed', title: 'Task 4', created_at: '2024-01-04', assigned_to: 'user1', completed_at: '2024-01-05' },
      { id: 5, status: 'needs_revision', title: 'Task 5', created_at: '2024-01-05', assigned_to: 'user1' },
      { id: 6, status: 'submitted', title: 'Task 6', created_at: '2024-01-06', assigned_to: 'user1', submitted_at: '2024-01-07' }
    ];

    // Spy on console methods
    consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Clear cache before each test
    statisticsService.clearCache();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('calculateTaskStats Integration', () => {
    it('should use TaskCategorization service for consistent task filtering', () => {
      const result = statisticsService.calculateTaskStats(mockTasks);
      
      // Verify the result structure matches TaskCategorization service output
      expect(result).toHaveProperty('total', 6);
      expect(result).toHaveProperty('completed', 1);
      expect(result).toHaveProperty('remaining', 5); // Includes submitted tasks
      expect(result).toHaveProperty('active', 3); // todo + in_progress + needs_revision
      expect(result).toHaveProperty('pendingReview', 2); // submitted tasks
      expect(result).toHaveProperty('completionRate', 17); // 1/6 * 100 rounded
      
      // Verify byStatus breakdown
      expect(result.byStatus).toEqual({
        todo: 1,
        inProgress: 1,
        submitted: 2,
        completed: 1,
        needsRevision: 1
      });
      
      // Verify tasks array is included
      expect(result.tasks).toEqual(mockTasks);
    });

    it('should include submitted tasks in remaining count (Requirement 1.1, 1.2)', () => {
      const result = statisticsService.calculateTaskStats(mockTasks);
      
      // Remaining should include all non-completed tasks
      expect(result.remaining).toBe(5); // 6 total - 1 completed
      
      // Verify submitted tasks are counted as remaining
      const submittedCount = result.byStatus.submitted;
      expect(submittedCount).toBe(2);
      expect(result.remaining).toBeGreaterThanOrEqual(submittedCount);
    });

    it('should maintain consistency with TaskCategorization service methods', () => {
      const result = statisticsService.calculateTaskStats(mockTasks);
      
      // Get counts directly from TaskCategorization service
      const directCounts = taskCategorizationService.getTaskCounts(mockTasks);
      const directStatusCounts = taskCategorizationService.getTasksByStatus(mockTasks);
      
      // Verify StatisticsService results match TaskCategorization service
      expect(result.active).toBe(directCounts.active);
      expect(result.pendingReview).toBe(directCounts.pendingReview);
      expect(result.completed).toBe(directCounts.completed);
      expect(result.remaining).toBe(directCounts.remaining);
      expect(result.total).toBe(directCounts.total);
      
      // Verify status breakdown matches
      expect(result.byStatus.todo).toBe(directStatusCounts.todo);
      expect(result.byStatus.inProgress).toBe(directStatusCounts.inProgress);
      expect(result.byStatus.submitted).toBe(directStatusCounts.submitted);
      expect(result.byStatus.completed).toBe(directStatusCounts.completed);
      expect(result.byStatus.needsRevision).toBe(directStatusCounts.needsRevision);
    });

    it('should handle TaskCategorization service errors gracefully', () => {
      // Mock TaskCategorization service to throw an error
      const originalSafeOperation = taskCategorizationService.safeOperation;
      taskCategorizationService.safeOperation = vi.fn().mockImplementation(() => {
        throw new Error('TaskCategorization service error');
      });
      
      const result = statisticsService.calculateTaskStats(mockTasks);
      
      // Should fall back to original logic
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('completed');
      expect(result).toHaveProperty('remaining');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('StatisticsService: Using fallback task stats calculation')
      );
      
      // Restore original method
      taskCategorizationService.safeOperation = originalSafeOperation;
    });

    it('should validate categorization consistency (Requirement 3.3)', () => {
      const result = statisticsService.calculateTaskStats(mockTasks);
      
      // Verify mathematical consistency
      expect(result.remaining).toBe(result.active + result.pendingReview);
      expect(result.total).toBe(result.active + result.pendingReview + result.completed);
      
      // Verify status counts sum to total
      const statusSum = Object.values(result.byStatus).reduce((sum, count) => sum + count, 0);
      expect(statusSum).toBe(result.total);
    });

    it('should handle empty task arrays', () => {
      const result = statisticsService.calculateTaskStats([]);
      
      expect(result).toEqual({
        total: 0,
        completed: 0,
        remaining: 0,
        completionRate: 0,
        active: 0,
        pendingReview: 0,
        byStatus: {
          todo: 0,
          inProgress: 0,
          submitted: 0,
          completed: 0,
          needsRevision: 0
        },
        tasks: []
      });
    });

    it('should handle invalid task data gracefully', () => {
      const invalidTasks = [
        { id: 1, status: 'todo' },
        null,
        { id: 2, status: 'invalid_status' },
        undefined,
        { id: 3, status: 'completed' }
      ];
      
      const result = statisticsService.calculateTaskStats(invalidTasks);
      
      // Should handle invalid data without crashing
      expect(result.total).toBe(5);
      expect(result.active).toBe(1); // Only valid 'todo' task
      expect(result.completed).toBe(1); // Only valid 'completed' task
      expect(result.remaining).toBe(1); // Only the 'todo' task
    });
  });

  describe('Error Handling and Fallback Logic', () => {
    it('should use fallback logic when TaskCategorization service fails', () => {
      // Create a scenario where TaskCategorization service would fail
      const tasksWithInvalidStructure = 'not-an-array';
      
      const result = statisticsService.calculateTaskStats(tasksWithInvalidStructure);
      
      // Should return fallback structure
      expect(result).toHaveProperty('total', 0);
      expect(result).toHaveProperty('completed', 0);
      expect(result).toHaveProperty('remaining', 0);
      expect(result).toHaveProperty('active', 0);
      expect(result).toHaveProperty('pendingReview', 0);
      expect(result.tasks).toEqual([]);
    });

    it('should log appropriate warnings for validation failures', () => {
      // Mock validation to fail
      const originalValidate = taskCategorizationService.validateCategorization;
      taskCategorizationService.validateCategorization = vi.fn().mockReturnValue({
        isValid: false,
        error: 'Test validation error'
      });
      
      statisticsService.calculateTaskStats(mockTasks);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'StatisticsService: Task categorization validation failed:',
        'Test validation error'
      );
      
      // Restore original method
      taskCategorizationService.validateCategorization = originalValidate;
    });

    it('should maintain service availability during partial failures', () => {
      // Test that service continues to work even if some operations fail
      const partiallyValidTasks = [
        { id: 1, status: 'todo' },
        { id: 2 }, // Missing status
        { id: 3, status: 'completed' }
      ];
      
      const result = statisticsService.calculateTaskStats(partiallyValidTasks);
      
      // Should still produce valid results
      expect(result.total).toBe(3);
      expect(result.active).toBeGreaterThanOrEqual(0);
      expect(result.completed).toBeGreaterThanOrEqual(0);
      expect(result.remaining).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance and Caching Integration', () => {
    it('should maintain performance with TaskCategorization service integration', () => {
      const largeTasks = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        status: ['todo', 'in_progress', 'submitted', 'completed', 'needs_revision'][i % 5],
        created_at: '2024-01-01',
        assigned_to: 'user1'
      }));
      
      const start = performance.now();
      const result = statisticsService.calculateTaskStats(largeTasks);
      const end = performance.now();
      
      expect(result.total).toBe(1000);
      expect(end - start).toBeLessThan(50); // Should complete quickly
    });

    it('should work correctly with cached data', () => {
      // First call
      const result1 = statisticsService.calculateTaskStats(mockTasks);
      
      // Second call with same data
      const result2 = statisticsService.calculateTaskStats(mockTasks);
      
      // Results should be identical
      expect(result1).toEqual(result2);
    });
  });

  describe('Requirements Compliance', () => {
    it('should satisfy Requirement 1.1: consistent task visibility', () => {
      const result = statisticsService.calculateTaskStats(mockTasks);
      
      // Dashboard remaining count should match what workspace would show
      const activeTasks = taskCategorizationService.getActiveTasks(mockTasks);
      const pendingTasks = taskCategorizationService.getPendingReviewTasks(mockTasks);
      
      expect(result.remaining).toBe(activeTasks.length + pendingTasks.length);
      expect(result.active).toBe(activeTasks.length);
      expect(result.pendingReview).toBe(pendingTasks.length);
    });

    it('should satisfy Requirement 1.2: submitted tasks counted consistently', () => {
      const result = statisticsService.calculateTaskStats(mockTasks);
      
      // Submitted tasks should be included in remaining count
      expect(result.byStatus.submitted).toBe(2);
      expect(result.remaining).toBeGreaterThanOrEqual(result.byStatus.submitted);
      expect(result.pendingReview).toBe(result.byStatus.submitted);
    });

    it('should satisfy Requirement 3.1: consistent filtering logic', () => {
      const result = statisticsService.calculateTaskStats(mockTasks);
      
      // Should use same logic as TaskCategorization service
      const directActive = taskCategorizationService.getActiveTasks(mockTasks);
      const directPending = taskCategorizationService.getPendingReviewTasks(mockTasks);
      const directCompleted = taskCategorizationService.getCompletedTasks(mockTasks);
      
      expect(result.active).toBe(directActive.length);
      expect(result.pendingReview).toBe(directPending.length);
      expect(result.completed).toBe(directCompleted.length);
    });

    it('should satisfy Requirement 3.3: standardized calculation method', () => {
      const result = statisticsService.calculateTaskStats(mockTasks);
      
      // Calculations should be predictable and standardized
      expect(result.completionRate).toBe(Math.round((result.completed / result.total) * 100));
      expect(result.remaining).toBe(result.total - result.completed);
      expect(result.remaining).toBe(result.active + result.pendingReview);
    });
  });
});
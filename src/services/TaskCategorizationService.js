/**
 * TaskCategorization Service
 * 
 * Provides unified task filtering and categorization logic to ensure consistency
 * across dashboard and workspace components. This service standardizes how tasks
 * are filtered, counted, and categorized throughout the application.
 */

class TaskCategorizationService {
  /**
   * Get tasks that require active user work
   * These are tasks the user needs to start, continue, or revise
   * 
   * @param {Array} tasks - Array of task objects
   * @returns {Array} Tasks with status: todo, in_progress, needs_revision
   */
  getActiveTasks(tasks) {
    if (!Array.isArray(tasks)) {
      console.warn('TaskCategorization: getActiveTasks received non-array input');
      return [];
    }

    return tasks.filter(task =>
      task && ['todo', 'in_progress', 'needs_revision'].includes(task.status)
    );
  }

  /**
   * Get tasks that are pending review by team leader
   * These are tasks submitted by user but not yet completed
   * 
   * @param {Array} tasks - Array of task objects
   * @returns {Array} Tasks with status: submitted
   */
  getPendingReviewTasks(tasks) {
    if (!Array.isArray(tasks)) {
      console.warn('TaskCategorization: getPendingReviewTasks received non-array input');
      return [];
    }

    return tasks.filter(task =>
      task && task.status === 'submitted'
    );
  }

  /**
   * Get tasks that are fully completed
   * These tasks require no further action from the user
   * 
   * @param {Array} tasks - Array of task objects
   * @returns {Array} Tasks with status: completed
   */
  getCompletedTasks(tasks) {
    if (!Array.isArray(tasks)) {
      console.warn('TaskCategorization: getCompletedTasks received non-array input');
      return [];
    }

    return tasks.filter(task =>
      task && task.status === 'completed'
    );
  }

  /**
   * Get tasks that count as "remaining work" for the user
   * This includes both active tasks and tasks pending review
   * Excludes only completed tasks
   * 
   * @param {Array} tasks - Array of task objects
   * @returns {Array} Tasks that are not completed
   */
  getRemainingTasks(tasks) {
    if (!Array.isArray(tasks)) {
      console.warn('TaskCategorization: getRemainingTasks received non-array input');
      return [];
    }

    return tasks.filter(task =>
      task && task.status !== 'completed'
    );
  }

  /**
   * Get comprehensive task counts by category
   * Provides a complete breakdown of task distribution
   * 
   * @param {Array} tasks - Array of task objects
   * @returns {Object} Object containing counts for each category
   */
  getTaskCounts(tasks) {
    if (!Array.isArray(tasks)) {
      console.warn('TaskCategorization: getTaskCounts received non-array input');
      return {
        active: 0,
        pendingReview: 0,
        completed: 0,
        remaining: 0,
        total: 0
      };
    }

    const activeTasks = this.getActiveTasks(tasks);
    const pendingReviewTasks = this.getPendingReviewTasks(tasks);
    const completedTasks = this.getCompletedTasks(tasks);
    const remainingTasks = this.getRemainingTasks(tasks);

    return {
      active: activeTasks.length,
      pendingReview: pendingReviewTasks.length,
      completed: completedTasks.length,
      remaining: remainingTasks.length,
      total: tasks.length
    };
  }

  /**
   * Get detailed task breakdown by status
   * Provides granular status-based categorization
   * 
   * @param {Array} tasks - Array of task objects
   * @returns {Object} Object containing counts for each specific status
   */
  getTasksByStatus(tasks) {
    if (!Array.isArray(tasks)) {
      console.warn('TaskCategorization: getTasksByStatus received non-array input');
      return {
        todo: 0,
        inProgress: 0,
        submitted: 0,
        completed: 0,
        needsRevision: 0
      };
    }

    return {
      todo: tasks.filter(t => t && t.status === 'todo').length,
      inProgress: tasks.filter(t => t && t.status === 'in_progress').length,
      submitted: tasks.filter(t => t && t.status === 'submitted').length,
      completed: tasks.filter(t => t && t.status === 'completed').length,
      needsRevision: tasks.filter(t => t && t.status === 'needs_revision').length
    };
  }

  /**
   * Validate task categorization consistency
   * Ensures that categorized tasks add up to the total
   * 
   * @param {Array} tasks - Array of task objects
   * @returns {Object} Validation result with isValid flag and details
   */
  validateCategorization(tasks) {
    if (!Array.isArray(tasks)) {
      return {
        isValid: false,
        error: 'Invalid input: tasks must be an array'
      };
    }

    const counts = this.getTaskCounts(tasks);
    const statusCounts = this.getTasksByStatus(tasks);

    // Check if active + pendingReview + completed = total
    const categorizedTotal = counts.active + counts.pendingReview + counts.completed;
    const statusTotal = statusCounts.todo + statusCounts.inProgress +
      statusCounts.submitted + statusCounts.completed +
      statusCounts.needsRevision;

    const isValid = categorizedTotal === counts.total && statusTotal === counts.total;

    return {
      isValid,
      counts,
      statusCounts,
      categorizedTotal,
      statusTotal,
      error: isValid ? null : 'Task categorization counts do not match total'
    };
  }

  /**
   * Safe wrapper for task categorization operations
   * Provides fallback logic if categorization fails
   * 
   * @param {Array} tasks - Array of task objects
   * @param {Function} operation - Categorization operation to perform
   * @param {string} operationName - Name of operation for logging
   * @returns {*} Result of operation or fallback value
   */
  safeOperation(tasks, operation, operationName) {
    try {
      if (!Array.isArray(tasks)) {
        console.warn(`TaskCategorization: ${operationName} received non-array input, using fallback`);
        return this.getFallbackResult(operationName);
      }

      const result = operation(tasks);

      // Validate the result if it's a categorization operation
      if (operationName.includes('Count') || operationName.includes('Tasks')) {
        const validation = this.validateCategorization(tasks);
        if (!validation.isValid) {
          console.warn(`TaskCategorization: Inconsistency detected in ${operationName}:`, validation.error);
          console.warn('Validation details:', validation);
        }
      }

      return result;
    } catch (error) {
      console.error(`TaskCategorization: Error in ${operationName}:`, error);
      console.warn(`TaskCategorization: Using fallback logic for ${operationName}`);
      return this.getFallbackResult(operationName);
    }
  }

  /**
   * Get fallback results for failed operations
   * 
   * @param {string} operationName - Name of the failed operation
   * @returns {*} Appropriate fallback value
   */
  getFallbackResult(operationName) {
    switch (operationName) {
      case 'getActiveTasks':
      case 'getPendingReviewTasks':
      case 'getCompletedTasks':
      case 'getRemainingTasks':
        return [];
      case 'getTaskCounts':
        return {
          active: 0,
          pendingReview: 0,
          completed: 0,
          remaining: 0,
          total: 0
        };
      case 'getTasksByStatus':
        return {
          todo: 0,
          inProgress: 0,
          submitted: 0,
          completed: 0,
          needsRevision: 0
        };
      default:
        return null;
    }
  }

  /**
   * Validate consistency between dashboard and workspace task counts
   * 
   * @param {Object} dashboardCounts - Task counts from dashboard
   * @param {Object} workspaceCounts - Task counts from workspace
   * @returns {Object} Validation result with consistency details
   */
  validateDashboardWorkspaceConsistency(dashboardCounts, workspaceCounts) {
    try {
      const inconsistencies = [];

      // Check remaining tasks consistency
      if (dashboardCounts.remaining !== workspaceCounts.remaining) {
        inconsistencies.push({
          field: 'remaining',
          dashboard: dashboardCounts.remaining,
          workspace: workspaceCounts.remaining,
          difference: dashboardCounts.remaining - workspaceCounts.remaining
        });
      }

      // Check active tasks consistency
      if (dashboardCounts.active !== workspaceCounts.active) {
        inconsistencies.push({
          field: 'active',
          dashboard: dashboardCounts.active,
          workspace: workspaceCounts.active,
          difference: dashboardCounts.active - workspaceCounts.active
        });
      }

      // Check pending review tasks consistency
      if (dashboardCounts.pendingReview !== workspaceCounts.pendingReview) {
        inconsistencies.push({
          field: 'pendingReview',
          dashboard: dashboardCounts.pendingReview,
          workspace: workspaceCounts.pendingReview,
          difference: dashboardCounts.pendingReview - workspaceCounts.pendingReview
        });
      }

      // Check completed tasks consistency
      if (dashboardCounts.completed !== workspaceCounts.completed) {
        inconsistencies.push({
          field: 'completed',
          dashboard: dashboardCounts.completed,
          workspace: workspaceCounts.completed,
          difference: dashboardCounts.completed - workspaceCounts.completed
        });
      }

      const isConsistent = inconsistencies.length === 0;

      if (!isConsistent) {
        console.warn('TaskCategorization: Dashboard-Workspace count inconsistencies detected:', inconsistencies);
      }

      return {
        isConsistent,
        inconsistencies,
        dashboardCounts,
        workspaceCounts
      };
    } catch (error) {
      console.error('TaskCategorization: Error validating dashboard-workspace consistency:', error);
      return {
        isConsistent: false,
        error: error.message,
        inconsistencies: []
      };
    }
  }
}

// Export singleton instance
export const taskCategorizationService = new TaskCategorizationService();
export default taskCategorizationService;
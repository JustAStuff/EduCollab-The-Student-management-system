// Statistics Service for Dashboard Analytics
import { supabase } from '../supabaseClient';
import taskCategorizationService from './TaskCategorizationService';

class StatisticsService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 15 * 60 * 1000; // 15 minutes
  }

  // Main method to get all user statistics
  async getUserStatistics(userId) {
    const cacheKey = `user_stats_${userId}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const [taskMetrics, efficiencyMetrics, workspaceStats, achievements] = await Promise.all([
        this.getTaskMetrics(userId),
        this.getEfficiencyMetrics(userId),
        this.getWorkspaceStats(userId),
        this.getAchievements(userId)
      ]);

      const statistics = {
        userId,
        taskMetrics,
        efficiencyMetrics,
        workspaceStats,
        achievements,
        lastUpdated: new Date().toISOString()
      };

      // Cache the results
      this.cache.set(cacheKey, {
        data: statistics,
        timestamp: Date.now()
      });

      return statistics;
    } catch (error) {
      console.error('Error fetching user statistics:', error);
      throw error;
    }
  }

  // Get task completion metrics
  async getTaskMetrics(userId) {
    try {
      // Get all tasks for the user
      const { data: allTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', userId);

      if (tasksError) throw tasksError;

      // Calculate current week and month dates
      const now = new Date();
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Filter tasks by timeframes
      const allTimeTasks = allTasks || [];
      const weekTasks = allTimeTasks.filter(task => 
        new Date(task.created_at) >= weekStart
      );
      const monthTasks = allTimeTasks.filter(task => 
        new Date(task.created_at) >= monthStart
      );

      return {
        allTime: this.calculateTaskStats(allTimeTasks),
        thisWeek: this.calculateTaskStats(weekTasks),
        thisMonth: this.calculateTaskStats(monthTasks),
        trends: await this.getTaskTrends(userId)
      };
    } catch (error) {
      console.error('Error fetching task metrics:', error);
      return this.getEmptyTaskMetrics();
    }
  }

  // Calculate task statistics for a given set of tasks
  calculateTaskStats(tasks) {
    try {
      // Use TaskCategorization service for consistent filtering with error handling
      const taskCounts = taskCategorizationService.safeOperation(
        tasks, 
        (t) => taskCategorizationService.getTaskCounts(t), 
        'getTaskCounts'
      );
      
      const statusCounts = taskCategorizationService.safeOperation(
        tasks, 
        (t) => taskCategorizationService.getTasksByStatus(t), 
        'getTasksByStatus'
      );

      const total = taskCounts.total;
      const completed = taskCounts.completed;
      const remaining = taskCounts.remaining; // Includes submitted tasks
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      // Validate categorization consistency
      const validation = taskCategorizationService.validateCategorization(tasks);
      if (!validation.isValid) {
        console.warn('StatisticsService: Task categorization validation failed:', validation.error);
      }

      return {
        total,
        completed,
        remaining, // Added remaining count for consistency
        completionRate,
        active: taskCounts.active,
        pendingReview: taskCounts.pendingReview,
        byStatus: {
          todo: statusCounts.todo,
          inProgress: statusCounts.inProgress,
          submitted: statusCounts.submitted,
          completed: statusCounts.completed,
          needsRevision: statusCounts.needsRevision
        },
        tasks // Include tasks array for downstream components
      };
    } catch (error) {
      console.error('StatisticsService: Error calculating task stats:', error);
      console.warn('StatisticsService: Using fallback task stats calculation');
      
      // Fallback to original logic
      return this.getFallbackTaskStats(tasks);
    }
  }

  // Fallback task stats calculation
  getFallbackTaskStats(tasks) {
    try {
      const total = Array.isArray(tasks) ? tasks.length : 0;
      const byStatus = {
        todo: Array.isArray(tasks) ? tasks.filter(t => t && t.status === 'todo').length : 0,
        inProgress: Array.isArray(tasks) ? tasks.filter(t => t && t.status === 'in_progress').length : 0,
        submitted: Array.isArray(tasks) ? tasks.filter(t => t && t.status === 'submitted').length : 0,
        completed: Array.isArray(tasks) ? tasks.filter(t => t && t.status === 'completed').length : 0,
        needsRevision: Array.isArray(tasks) ? tasks.filter(t => t && t.status === 'needs_revision').length : 0
      };

      const completed = byStatus.completed;
      const remaining = total - completed; // Simple remaining calculation
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        total,
        completed,
        remaining,
        completionRate,
        active: byStatus.todo + byStatus.inProgress + byStatus.needsRevision,
        pendingReview: byStatus.submitted,
        byStatus,
        tasks: Array.isArray(tasks) ? tasks : []
      };
    } catch (error) {
      console.error('StatisticsService: Fallback task stats calculation failed:', error);
      return this.getEmptyTaskStats();
    }
  }

  // Get empty task stats structure
  getEmptyTaskStats() {
    return {
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
    };
  }

  // Get task completion trends over time
  async getTaskTrends(userId) {
    try {
      const { data: trends, error } = await supabase
        .from('tasks')
        .select('created_at, completed_at, status')
        .eq('assigned_to', userId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .order('created_at', { ascending: true });

      if (error) throw error;

      return this.processTrendData(trends || []);
    } catch (error) {
      console.error('Error fetching task trends:', error);
      return [];
    }
  }

  // Process trend data for charts
  processTrendData(tasks) {
    const dailyStats = {};
    
    tasks.forEach(task => {
      const date = new Date(task.created_at).toISOString().split('T')[0];
      
      if (!dailyStats[date]) {
        dailyStats[date] = { date, created: 0, completed: 0 };
      }
      
      dailyStats[date].created++;
      
      if (task.status === 'completed' && task.completed_at) {
        const completedDate = new Date(task.completed_at).toISOString().split('T')[0];
        if (!dailyStats[completedDate]) {
          dailyStats[completedDate] = { date: completedDate, created: 0, completed: 0 };
        }
        dailyStats[completedDate].completed++;
      }
    });

    return Object.values(dailyStats).sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  // Get efficiency metrics
  async getEfficiencyMetrics(userId) {
    try {
      const { data: completedTasks, error } = await supabase
        .from('tasks')
        .select('created_at, completed_at, submitted_at, status, review_comments')
        .eq('assigned_to', userId)
        .eq('status', 'completed')
        .not('completed_at', 'is', null);

      if (error) throw error;

      const tasks = completedTasks || [];
      
      if (tasks.length === 0) {
        return this.getEmptyEfficiencyMetrics();
      }

      // Calculate average completion time (in hours)
      const completionTimes = tasks.map(task => {
        const created = new Date(task.created_at);
        const completed = new Date(task.completed_at);
        return (completed - created) / (1000 * 60 * 60); // Convert to hours
      });

      const avgCompletionTime = completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length;

      // Calculate revision rate
      const { data: allUserTasks } = await supabase
        .from('tasks')
        .select('status, review_comments')
        .eq('assigned_to', userId);

      const totalSubmitted = (allUserTasks || []).filter(t => 
        ['completed', 'needs_revision'].includes(t.status)
      ).length;

      const needsRevision = (allUserTasks || []).filter(t => 
        t.status === 'needs_revision' || t.review_comments
      ).length;

      const revisionRate = totalSubmitted > 0 ? Math.round((needsRevision / totalSubmitted) * 100) : 0;

      // Calculate on-time rate (assuming 7 days is the expected completion time)
      const onTimeCompletions = tasks.filter(task => {
        const timeTaken = (new Date(task.completed_at) - new Date(task.created_at)) / (1000 * 60 * 60 * 24);
        return timeTaken <= 7; // 7 days or less
      }).length;

      const onTimeRate = Math.round((onTimeCompletions / tasks.length) * 100);

      // Calculate productivity score (0-100)
      const productivityScore = this.calculateProductivityScore({
        completionRate: tasks.length > 0 ? 100 : 0, // All fetched tasks are completed
        avgCompletionTime,
        onTimeRate,
        revisionRate
      });

      return {
        avgCompletionTime: Math.round(avgCompletionTime * 10) / 10, // Round to 1 decimal
        onTimeRate,
        revisionRate,
        productivityScore,
        totalCompleted: tasks.length
      };
    } catch (error) {
      console.error('Error fetching efficiency metrics:', error);
      return this.getEmptyEfficiencyMetrics();
    }
  }

  // Calculate productivity score based on various metrics
  calculateProductivityScore({ completionRate, avgCompletionTime, onTimeRate, revisionRate }) {
    // Weighted scoring system
    const completionWeight = 0.3;
    const speedWeight = 0.25;
    const timelinessWeight = 0.25;
    const qualityWeight = 0.2;

    // Normalize completion time (lower is better, max 168 hours = 1 week)
    const speedScore = Math.max(0, 100 - (avgCompletionTime / 168) * 100);
    
    // Quality score (lower revision rate is better)
    const qualityScore = Math.max(0, 100 - revisionRate);

    const score = (
      completionRate * completionWeight +
      speedScore * speedWeight +
      onTimeRate * timelinessWeight +
      qualityScore * qualityWeight
    );

    return Math.round(Math.min(100, Math.max(0, score)));
  }

  // Get workspace participation statistics
  async getWorkspaceStats(userId) {
    try {
      // Get owned workspaces
      const { data: ownedWorkspaces, error: ownedError } = await supabase
        .from('workspaces')
        .select('id, name, created_at')
        .eq('created_by', userId);

      if (ownedError) throw ownedError;

      // Get member workspaces
      const { data: memberWorkspaces, error: memberError } = await supabase
        .from('workspace_members')
        .select('workspace_id, workspaces(id, name, created_at)')
        .eq('user_id', userId);

      if (memberError) throw memberError;

      // Get task distribution across workspaces
      const { data: taskDistribution, error: taskError } = await supabase
        .from('tasks')
        .select('workspace_id, status, workspaces(name)')
        .eq('assigned_to', userId);

      if (taskError) throw taskError;

      // Process workspace statistics
      const owned = ownedWorkspaces || [];
      const member = (memberWorkspaces || []).map(m => m.workspaces).filter(Boolean);
      
      // Find most active workspace
      const workspaceTaskCounts = {};
      (taskDistribution || []).forEach(task => {
        const wsId = task.workspace_id;
        if (!workspaceTaskCounts[wsId]) {
          workspaceTaskCounts[wsId] = {
            id: wsId,
            name: task.workspaces?.name || 'Unknown',
            taskCount: 0,
            completedCount: 0
          };
        }
        workspaceTaskCounts[wsId].taskCount++;
        if (task.status === 'completed') {
          workspaceTaskCounts[wsId].completedCount++;
        }
      });

      const mostActive = Object.values(workspaceTaskCounts)
        .sort((a, b) => b.taskCount - a.taskCount)[0] || null;

      return {
        totalWorkspaces: owned.length + member.length,
        ownedWorkspaces: owned.length,
        memberWorkspaces: member.length,
        mostActiveWorkspace: mostActive,
        taskDistribution: Object.values(workspaceTaskCounts)
      };
    } catch (error) {
      console.error('Error fetching workspace stats:', error);
      return this.getEmptyWorkspaceStats();
    }
  }

  // Get user achievements and badges
  async getAchievements(userId) {
    try {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('status, completed_at, created_at')
        .eq('assigned_to', userId);

      const userTasks = tasks || [];
      const completedTasks = userTasks.filter(t => t.status === 'completed');

      // Calculate badges
      const badges = this.calculateBadges(userTasks, completedTasks);
      
      // Calculate streaks
      const streaks = this.calculateStreaks(completedTasks);

      return {
        badges,
        currentStreak: streaks.current,
        longestStreak: streaks.longest,
        totalBadges: badges.length
      };
    } catch (error) {
      console.error('Error fetching achievements:', error);
      return { badges: [], currentStreak: 0, longestStreak: 0, totalBadges: 0 };
    }
  }

  // Calculate achievement badges
  calculateBadges(allTasks, completedTasks) {
    const badges = [];

    // Completion badges
    if (completedTasks.length >= 10) badges.push({ id: 'first_10', name: 'Getting Started', description: '10 tasks completed', icon: '🎯' });
    if (completedTasks.length >= 50) badges.push({ id: 'half_century', name: 'Half Century', description: '50 tasks completed', icon: '🏆' });
    if (completedTasks.length >= 100) badges.push({ id: 'centurion', name: 'Task Master', description: '100 tasks completed', icon: '👑' });

    // Quality badges
    const revisionTasks = allTasks.filter(t => t.status === 'needs_revision').length;
    const revisionRate = allTasks.length > 0 ? (revisionTasks / allTasks.length) * 100 : 0;
    
    if (revisionRate < 10 && completedTasks.length >= 20) {
      badges.push({ id: 'quality_master', name: 'Quality Master', description: 'Less than 10% revision rate', icon: '⭐' });
    }

    return badges;
  }

  // Calculate completion streaks
  calculateStreaks(completedTasks) {
    if (completedTasks.length === 0) return { current: 0, longest: 0 };

    // Sort by completion date
    const sorted = completedTasks
      .filter(t => t.completed_at)
      .sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at));

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;

    for (let i = 1; i < sorted.length; i++) {
      const prevDate = new Date(sorted[i - 1].completed_at).toDateString();
      const currDate = new Date(sorted[i].completed_at).toDateString();
      
      if (prevDate === currDate || this.isConsecutiveDay(prevDate, currDate)) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }

    longestStreak = Math.max(longestStreak, tempStreak);
    
    // Calculate current streak (from today backwards)
    const today = new Date().toDateString();
    const recentTasks = sorted.reverse();
    
    for (const task of recentTasks) {
      const taskDate = new Date(task.completed_at).toDateString();
      if (taskDate === today || this.isRecentDay(taskDate, 7)) {
        currentStreak++;
      } else {
        break;
      }
    }

    return { current: currentStreak, longest: longestStreak };
  }

  // Helper method to check if dates are consecutive
  isConsecutiveDay(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1;
  }

  // Helper method to check if date is within recent days
  isRecentDay(date, days) {
    const taskDate = new Date(date);
    const now = new Date();
    const diffTime = now - taskDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= days;
  }

  // Empty state methods
  getEmptyTaskMetrics() {
    return {
      allTime: this.getEmptyTaskStats(),
      thisWeek: this.getEmptyTaskStats(),
      thisMonth: this.getEmptyTaskStats(),
      trends: []
    };
  }

  getEmptyEfficiencyMetrics() {
    return {
      avgCompletionTime: 0,
      onTimeRate: 0,
      revisionRate: 0,
      productivityScore: 0,
      totalCompleted: 0
    };
  }

  getEmptyWorkspaceStats() {
    return {
      totalWorkspaces: 0,
      ownedWorkspaces: 0,
      memberWorkspaces: 0,
      mostActiveWorkspace: null,
      taskDistribution: []
    };
  }

  // Clear cache method
  clearCache() {
    this.cache.clear();
  }
}

// Export singleton instance
export const statisticsService = new StatisticsService();
export default statisticsService;
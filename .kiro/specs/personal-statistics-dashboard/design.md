# Design Document

## Overview

The personal statistics dashboard will transform the current static dashboard into a dynamic, data-driven interface that provides users with comprehensive insights into their productivity, task completion patterns, and workspace participation. The design incorporates modern UI elements with meaningful metrics and visual representations.

## Architecture

### Data Flow Architecture
```
User Dashboard Request
    ↓
Dashboard Component
    ↓
Statistics Service (fetch user data)
    ↓
Multiple Data Sources:
    - Tasks (completion, efficiency)
    - Workspaces (participation, roles)
    - User Activity (streaks, patterns)
    ↓
Statistics Processing & Calculations
    ↓
Visual Components (Charts, Progress Bars, Cards)
    ↓
Rendered Dashboard
```

### Component Structure
```
Dashboard
├── StatisticsOverview
│   ├── TaskCompletionCard
│   ├── EfficiencyMetricsCard
│   └── WorkspaceParticipationCard
├── VisualAnalytics
│   ├── CompletionTrendChart
│   ├── ProductivityHeatmap
│   └── WorkloadDistributionChart
├── AchievementsSection
│   ├── BadgeDisplay
│   ├── StreakCounter
│   └── MilestoneProgress
└── RecentActivity
    ├── TaskUpdates
    └── WorkspaceActivity
```

## Components and Interfaces

### 1. Statistics Service

**Purpose**: Centralized data fetching and calculation service

```javascript
class StatisticsService {
  async getUserStatistics(userId) {
    // Fetch and calculate all user statistics
  }
  
  async getTaskMetrics(userId, timeframe) {
    // Calculate task completion metrics
  }
  
  async getEfficiencyMetrics(userId) {
    // Calculate work efficiency metrics
  }
  
  async getWorkspaceStats(userId) {
    // Get workspace participation data
  }
}
```

### 2. Task Completion Metrics

**Key Metrics:**
- Total tasks assigned/completed
- Completion rate percentage
- Tasks by status (todo, in_progress, submitted, completed, needs_revision)
- Weekly/monthly completion trends
- Average completion time

**Visual Elements:**
- Circular progress indicators for completion rates
- Bar charts for task distribution
- Line charts for completion trends

### 3. Efficiency Metrics

**Key Metrics:**
- Average time to complete tasks
- On-time completion rate
- Revision rate (tasks needing revisions)
- Productivity score (custom algorithm)
- Peak productivity hours/days

**Calculations:**
```javascript
const calculateEfficiencyMetrics = (tasks) => {
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const avgCompletionTime = calculateAverageTime(completedTasks);
  const onTimeRate = calculateOnTimeRate(completedTasks);
  const revisionRate = calculateRevisionRate(tasks);
  
  return {
    avgCompletionTime,
    onTimeRate,
    revisionRate,
    productivityScore: calculateProductivityScore(tasks)
  };
};
```

### 4. Workspace Participation

**Key Metrics:**
- Number of workspaces (owned vs member)
- Most active workspace
- Task distribution across workspaces
- Role distribution
- Collaboration score

### 5. Achievement System

**Badge Categories:**
- **Completion Badges**: "Task Master" (100 tasks), "Speed Demon" (fast completion)
- **Consistency Badges**: "Perfect Week", "Monthly Champion"
- **Quality Badges**: "Zero Revisions", "First Try Success"
- **Leadership Badges**: "Team Builder", "Mentor"

**Streak Tracking:**
- Daily task completion streaks
- Weekly goal achievement streaks
- Consecutive on-time submissions

## Data Models

### Statistics Data Model
```javascript
const UserStatistics = {
  userId: String,
  taskMetrics: {
    total: Number,
    completed: Number,
    completionRate: Number,
    byStatus: {
      todo: Number,
      inProgress: Number,
      submitted: Number,
      completed: Number,
      needsRevision: Number
    },
    trends: {
      weekly: Array,
      monthly: Array
    }
  },
  efficiencyMetrics: {
    avgCompletionTime: Number, // in hours
    onTimeRate: Number, // percentage
    revisionRate: Number, // percentage
    productivityScore: Number // 0-100
  },
  workspaceStats: {
    totalWorkspaces: Number,
    ownedWorkspaces: Number,
    memberWorkspaces: Number,
    mostActiveWorkspace: Object,
    taskDistribution: Array
  },
  achievements: {
    badges: Array,
    currentStreak: Number,
    longestStreak: Number,
    milestones: Array
  },
  recentActivity: Array
};
```

### Database Queries Required

**Task Statistics Query:**
```sql
SELECT 
  COUNT(*) as total_tasks,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
  COUNT(CASE WHEN status = 'todo' THEN 1 END) as todo_tasks,
  COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tasks,
  COUNT(CASE WHEN status = 'submitted' THEN 1 END) as submitted_tasks,
  COUNT(CASE WHEN status = 'needs_revision' THEN 1 END) as revision_tasks,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600) as avg_completion_hours
FROM tasks 
WHERE assigned_to = $1 
AND created_at >= $2;
```

## Error Handling

### Data Loading States
- **Loading**: Show skeleton components while fetching data
- **Empty State**: Display motivational message for new users
- **Error State**: Show retry options with helpful error messages
- **Partial Data**: Handle cases where some metrics are unavailable

### Performance Considerations
- **Caching**: Cache statistics for 15 minutes to reduce database load
- **Lazy Loading**: Load detailed charts only when user scrolls to them
- **Pagination**: Limit recent activity to last 20 items
- **Background Updates**: Refresh data periodically without blocking UI

## Testing Strategy

### Unit Tests
- Statistics calculation functions
- Data transformation utilities
- Achievement badge logic
- Streak calculation algorithms

### Integration Tests
- Database query performance
- Statistics service API
- Chart rendering with real data
- Achievement system triggers

### User Experience Tests
- Dashboard load time under 2 seconds
- Responsive design on mobile devices
- Accessibility compliance (WCAG 2.1)
- Color contrast for charts and metrics

## Visual Design Specifications

### Color Scheme
- **Success/Completed**: #4CAF50 (Green)
- **In Progress**: #FF9800 (Orange)
- **Pending/Todo**: #2196F3 (Blue)
- **Needs Attention**: #F44336 (Red)
- **Neutral**: #9E9E9E (Gray)

### Chart Types
- **Completion Rate**: Circular progress (donut chart)
- **Task Trends**: Line chart with smooth curves
- **Workspace Distribution**: Horizontal bar chart
- **Productivity Heatmap**: Calendar-style grid
- **Achievement Progress**: Linear progress bars

### Responsive Breakpoints
- **Mobile**: < 768px (stacked cards, simplified charts)
- **Tablet**: 768px - 1024px (2-column layout)
- **Desktop**: > 1024px (3-column layout with detailed charts)
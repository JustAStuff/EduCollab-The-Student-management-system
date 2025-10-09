// Recent Activity and Updates Card Component
import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Chip,
  Divider,
  Button
} from '@mui/material';
import {
  History,
  CheckCircle,
  PlayArrow,
  Assignment,
  Refresh,
  Schedule,
  Group,
  Add,
  TrendingUp
} from '@mui/icons-material';

const RecentActivityCard = ({ taskMetrics, workspaceStats, loading = false }) => {
  if (loading) {
    return (
      <Card sx={{ height: '100%', minHeight: 300 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 250 }}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Generate recent activity based on task metrics and workspace stats
  const generateRecentActivity = () => {
    const activities = [];
    const { allTime, thisWeek, thisMonth } = taskMetrics || {};
    
    // Add completion activities
    if (thisWeek?.completed > 0) {
      activities.push({
        id: 'week_completion',
        type: 'completion',
        icon: <CheckCircle sx={{ color: '#4caf50' }} />,
        title: `Completed ${thisWeek.completed} task${thisWeek.completed > 1 ? 's' : ''} this week`,
        subtitle: 'Great progress on your weekly goals!',
        time: 'This week',
        color: '#4caf50'
      });
    }

    // Add productivity insights
    if (thisMonth?.completionRate > 75) {
      activities.push({
        id: 'high_productivity',
        type: 'achievement',
        icon: <TrendingUp sx={{ color: '#ff9800' }} />,
        title: `${thisMonth.completionRate}% completion rate this month`,
        subtitle: 'You\'re having a productive month!',
        time: 'This month',
        color: '#ff9800'
      });
    }

    // Add workspace activity
    if (workspaceStats?.mostActiveWorkspace) {
      activities.push({
        id: 'active_workspace',
        type: 'workspace',
        icon: <Group sx={{ color: '#2196f3' }} />,
        title: `Most active in ${workspaceStats.mostActiveWorkspace.name}`,
        subtitle: `${workspaceStats.mostActiveWorkspace.taskCount} tasks in this workspace`,
        time: 'Recent',
        color: '#2196f3'
      });
    }

    // Add task status activities
    if (allTime?.byStatus?.inProgress > 0) {
      activities.push({
        id: 'in_progress',
        type: 'status',
        icon: <PlayArrow sx={{ color: '#ff9800' }} />,
        title: `${allTime.byStatus.inProgress} task${allTime.byStatus.inProgress > 1 ? 's' : ''} in progress`,
        subtitle: 'Keep up the momentum!',
        time: 'Current',
        color: '#ff9800'
      });
    }

    if (allTime?.byStatus?.submitted > 0) {
      activities.push({
        id: 'submitted',
        type: 'status',
        icon: <Assignment sx={{ color: '#2196f3' }} />,
        title: `${allTime.byStatus.submitted} task${allTime.byStatus.submitted > 1 ? 's' : ''} awaiting review`,
        subtitle: 'Waiting for team leader feedback',
        time: 'Pending',
        color: '#2196f3'
      });
    }

    if (allTime?.byStatus?.needsRevision > 0) {
      activities.push({
        id: 'needs_revision',
        type: 'attention',
        icon: <Refresh sx={{ color: '#f44336' }} />,
        title: `${allTime.byStatus.needsRevision} task${allTime.byStatus.needsRevision > 1 ? 's' : ''} need${allTime.byStatus.needsRevision === 1 ? 's' : ''} revision`,
        subtitle: 'Review feedback and resubmit',
        time: 'Action needed',
        color: '#f44336'
      });
    }

    // Add milestone activities
    if (allTime?.completed >= 10 && allTime?.completed < 15) {
      activities.push({
        id: 'milestone_10',
        type: 'milestone',
        icon: <CheckCircle sx={{ color: '#4caf50' }} />,
        title: 'Reached 10 completed tasks!',
        subtitle: 'You\'re building great momentum',
        time: 'Recent achievement',
        color: '#4caf50'
      });
    }

    return activities.slice(0, 6); // Limit to 6 most recent activities
  };

  const recentActivities = generateRecentActivity();

  // Get activity type styling
  const getActivityStyling = (type) => {
    switch (type) {
      case 'completion':
        return { bgcolor: '#e8f5e8', borderLeft: '4px solid #4caf50' };
      case 'achievement':
        return { bgcolor: '#fff3e0', borderLeft: '4px solid #ff9800' };
      case 'workspace':
        return { bgcolor: '#e3f2fd', borderLeft: '4px solid #2196f3' };
      case 'attention':
        return { bgcolor: '#ffebee', borderLeft: '4px solid #f44336' };
      case 'milestone':
        return { bgcolor: '#f3e5f5', borderLeft: '4px solid #9c27b0' };
      default:
        return { bgcolor: '#f5f5f5', borderLeft: '4px solid #9e9e9e' };
    }
  };

  return (
    <Card sx={{ height: '100%', minHeight: 300 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <History sx={{ mr: 1, color: '#2196f3' }} />
          Recent Activity & Updates
        </Typography>

        {recentActivities.length > 0 ? (
          <>
            <List sx={{ p: 0 }}>
              {recentActivities.map((activity, index) => (
                <Box key={activity.id}>
                  <ListItem
                    sx={{
                      ...getActivityStyling(activity.type),
                      borderRadius: 2,
                      mb: 1,
                      p: 2
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: 'transparent' }}>
                        {activity.icon}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontWeight="bold">
                          {activity.title}
                        </Typography>
                      }
                      secondary={
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {activity.subtitle}
                          </Typography>
                          <Chip
                            label={activity.time}
                            size="small"
                            sx={{
                              ml: 1,
                              height: 20,
                              fontSize: '0.7rem',
                              bgcolor: `${activity.color}20`,
                              color: activity.color
                            }}
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < recentActivities.length - 1 && (
                    <Divider sx={{ my: 0.5, opacity: 0.3 }} />
                  )}
                </Box>
              ))}
            </List>

            {/* Activity Summary */}
            <Box sx={{ mt: 3, p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Activity Summary
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Total tasks completed: {taskMetrics?.allTime?.completed || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Active workspaces: {workspaceStats?.totalWorkspaces || 0}
                </Typography>
              </Box>
            </Box>
          </>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <History sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Recent Activity
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
              Start working on tasks to see your activity timeline here.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={() => window.location.reload()}
            >
              Refresh Activity
            </Button>
          </Box>
        )}

        {/* Quick Stats */}
        {recentActivities.length > 0 && (
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="text"
              size="small"
              onClick={() => window.location.reload()}
              sx={{ color: 'text.secondary' }}
            >
              Refresh for latest updates
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivityCard;
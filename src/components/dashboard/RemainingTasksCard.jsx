// Remaining Tasks Overview Card Component
import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Chip,
  Grid,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  Assignment,
  PlayArrow,
  Schedule,
  Refresh,
  CheckCircle,
  Warning,
  ArrowForward,
  RateReview
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import taskCategorizationService from '../../services/TaskCategorizationService';

const RemainingTasksCard = ({ taskMetrics, workspaceStats, loading = false }) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  const { allTime } = taskMetrics || {};
  
  // Use TaskCategorization service for consistent task filtering with error handling
  const allTasks = allTime?.tasks || [];
  
  let taskCounts, statusCounts;
  
  try {
    taskCounts = taskCategorizationService.safeOperation(
      allTasks, 
      (tasks) => taskCategorizationService.getTaskCounts(tasks), 
      'getTaskCounts'
    );
    
    statusCounts = taskCategorizationService.safeOperation(
      allTasks, 
      (tasks) => taskCategorizationService.getTasksByStatus(tasks), 
      'getTasksByStatus'
    );

    // Validate task categorization consistency
    const validation = taskCategorizationService.validateCategorization(allTasks);
    if (!validation.isValid) {
      console.warn('RemainingTasksCard: Task categorization validation failed:', validation.error);
    }
  } catch (error) {
    console.error('RemainingTasksCard: Error using TaskCategorization service:', error);
    console.warn('RemainingTasksCard: Using fallback task counting');
    
    // Fallback logic
    taskCounts = {
      active: allTasks.filter(t => t && ['todo', 'in_progress', 'needs_revision'].includes(t.status)).length,
      pendingReview: allTasks.filter(t => t && t.status === 'submitted').length,
      completed: allTasks.filter(t => t && t.status === 'completed').length,
      remaining: allTasks.filter(t => t && t.status !== 'completed').length,
      total: allTasks.length
    };
    
    statusCounts = {
      todo: allTasks.filter(t => t && t.status === 'todo').length,
      inProgress: allTasks.filter(t => t && t.status === 'in_progress').length,
      submitted: allTasks.filter(t => t && t.status === 'submitted').length,
      completed: allTasks.filter(t => t && t.status === 'completed').length,
      needsRevision: allTasks.filter(t => t && t.status === 'needs_revision').length
    };
  }
  
  // Get categorized task counts
  const remainingTasks = taskCounts.remaining; // Includes submitted tasks
  const activeTasks = taskCounts.active; // Tasks needing user action
  const pendingReviewTasks = taskCounts.pendingReview; // Submitted tasks
  
  // Store dashboard counts globally for workspace consistency checking
  // This allows workspace components to validate against dashboard counts
  if (typeof window !== 'undefined') {
    window.kiroTaskCounts = {
      active: activeTasks,
      pendingReview: pendingReviewTasks,
      completed: taskCounts.completed,
      remaining: remainingTasks,
      total: taskCounts.total
    };
  }
  
  // Individual status counts for detailed breakdown
  const inProgressTasks = statusCounts.inProgress;
  const todoTasks = statusCounts.todo;
  const submittedTasks = statusCounts.submitted;
  const needsRevisionTasks = statusCounts.needsRevision;

  // Get status color and icon
  const getStatusInfo = (status) => {
    switch (status) {
      case 'todo':
        return { color: '#9E9E9E', icon: <Schedule />, label: 'To Do' };
      case 'inProgress':
        return { color: '#FF9800', icon: <PlayArrow />, label: 'In Progress' };
      case 'submitted':
        return { color: '#2196F3', icon: <Assignment />, label: 'Submitted' };
      case 'needsRevision':
        return { color: '#F44336', icon: <Refresh />, label: 'Needs Revision' };
      default:
        return { color: '#9E9E9E', icon: <Schedule />, label: 'Unknown' };
    }
  };

  const taskSummary = [
    { status: 'todo', count: todoTasks },
    { status: 'inProgress', count: inProgressTasks },
    { status: 'submitted', count: submittedTasks },
    { status: 'needsRevision', count: needsRevisionTasks }
  ].filter(item => item.count > 0);

  return (
    <Card sx={{ mb: 3, border: remainingTasks > 0 ? '2px solid #FF9800' : '1px solid #e0e0e0' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center' }}>
            <Assignment sx={{ mr: 2, color: '#FF9800' }} />
            Tasks Requiring Attention
          </Typography>
          {remainingTasks > 0 && (
            <Chip
              icon={<Warning />}
              label={`${remainingTasks} tasks remaining`}
              color="warning"
              sx={{ fontWeight: 'bold' }}
            />
          )}
        </Box>
        
        {/* Clarifying message about what "remaining" means */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontStyle: 'italic' }}>
          Tasks requiring your attention (includes submitted tasks awaiting review)
        </Typography>

        {remainingTasks > 0 ? (
          <>
            {/* Task Summary Grid */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                  <Typography variant="h3" color="warning.main" fontWeight="bold">
                    {remainingTasks}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Remaining
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={9}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', height: '100%' }}>
                  {taskSummary.map(({ status, count }) => {
                    const statusInfo = getStatusInfo(status);
                    return (
                      <Chip
                        key={status}
                        icon={statusInfo.icon}
                        label={`${statusInfo.label}: ${count}`}
                        sx={{
                          backgroundColor: `${statusInfo.color}20`,
                          color: statusInfo.color,
                          fontWeight: 'bold',
                          '& .MuiChip-icon': {
                            color: statusInfo.color
                          }
                        }}
                      />
                    );
                  })}
                </Box>
              </Grid>
            </Grid>

            <Divider sx={{ mb: 3 }} />

            {/* Priority Actions */}
            <Box>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircle sx={{ mr: 1, color: '#4CAF50' }} />
                What needs your attention?
              </Typography>
              
              <List dense>
                {needsRevisionTasks > 0 && (
                  <ListItem sx={{ bgcolor: '#ffebee', borderRadius: 1, mb: 1 }}>
                    <ListItemIcon>
                      <Refresh sx={{ color: '#F44336' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={`${needsRevisionTasks} task${needsRevisionTasks > 1 ? 's' : ''} need${needsRevisionTasks === 1 ? 's' : ''} revision`}
                      secondary="Review feedback and resubmit these tasks"
                    />
                  </ListItem>
                )}
                
                {todoTasks > 0 && (
                  <ListItem sx={{ bgcolor: '#f3f4f6', borderRadius: 1, mb: 1 }}>
                    <ListItemIcon>
                      <Schedule sx={{ color: '#9E9E9E' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={`${todoTasks} task${todoTasks > 1 ? 's' : ''} waiting to be started`}
                      secondary="Ready to begin work on these tasks"
                    />
                  </ListItem>
                )}
                
                {inProgressTasks > 0 && (
                  <ListItem sx={{ bgcolor: '#fff3e0', borderRadius: 1, mb: 1 }}>
                    <ListItemIcon>
                      <PlayArrow sx={{ color: '#FF9800' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={`${inProgressTasks} task${inProgressTasks > 1 ? 's' : ''} in progress`}
                      secondary="Continue working on these active tasks"
                    />
                  </ListItem>
                )}
                
                {submittedTasks > 0 && (
                  <ListItem sx={{ bgcolor: '#e3f2fd', borderRadius: 1, mb: 1 }}>
                    <ListItemIcon>
                      <Assignment sx={{ color: '#2196F3' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={`${submittedTasks} task${submittedTasks > 1 ? 's' : ''} awaiting review`}
                      secondary="Waiting for team leader feedback"
                    />
                  </ListItem>
                )}
              </List>

              {/* Quick Action Buttons */}
              <Box sx={{ display: 'flex', gap: 2, mt: 3, flexWrap: 'wrap' }}>
                {workspaceStats?.mostActiveWorkspace && (
                  <Button
                    variant="contained"
                    endIcon={<ArrowForward />}
                    onClick={() => navigate(`/workspace-member/${workspaceStats.mostActiveWorkspace.id}`)}
                    sx={{ bgcolor: '#106EBE', '&:hover': { bgcolor: '#0A4E82' } }}
                  >
                    Go to {workspaceStats.mostActiveWorkspace.name}
                  </Button>
                )}
                <Button
                  variant="outlined"
                  onClick={() => window.location.reload()}
                >
                  Refresh Tasks
                </Button>
              </Box>
            </Box>
          </>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircle sx={{ fontSize: 64, color: '#4CAF50', mb: 2 }} />
            <Typography variant="h5" color="success.main" gutterBottom fontWeight="bold">
              All Caught Up! 🎉
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              You have no pending tasks. Great job on staying on top of your work!
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/create-workspace')}
              sx={{ bgcolor: '#106EBE', '&:hover': { bgcolor: '#0A4E82' } }}
            >
              Create New Workspace
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default RemainingTasksCard;
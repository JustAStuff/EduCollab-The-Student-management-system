// Task Completion Statistics Card Component
import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Chip,
  Grid,
  LinearProgress
} from '@mui/material';
import {
  CheckCircle,
  Schedule,
  PlayArrow,
  RadioButtonUnchecked,
  Assignment,
  Refresh
} from '@mui/icons-material';

const TaskCompletionCard = ({ taskMetrics, loading = false }) => {
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

  const { allTime, thisWeek, thisMonth } = taskMetrics;

  // Get status colors
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'inProgress': return '#FF9800';
      case 'submitted': return '#2196F3';
      case 'needsRevision': return '#F44336';
      case 'todo': return '#9E9E9E';
      default: return '#9E9E9E';
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle sx={{ fontSize: 16 }} />;
      case 'inProgress': return <PlayArrow sx={{ fontSize: 16 }} />;
      case 'submitted': return <Assignment sx={{ fontSize: 16 }} />;
      case 'needsRevision': return <Refresh sx={{ fontSize: 16 }} />;
      case 'todo': return <RadioButtonUnchecked sx={{ fontSize: 16 }} />;
      default: return <Schedule sx={{ fontSize: 16 }} />;
    }
  };

  // Circular progress component
  const CircularProgressWithLabel = ({ value, label, color = '#2196F3', size = 80 }) => (
    <Box sx={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <CircularProgress
          variant="determinate"
          value={value}
          size={size}
          thickness={4}
          sx={{
            color: color,
            '& .MuiCircularProgress-circle': {
              strokeLinecap: 'round',
            },
          }}
        />
        <Box
          sx={{
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography 
            variant="h6" 
            component="div" 
            color="text.primary" 
            fontWeight="bold"
            sx={{ fontSize: size > 70 ? '1rem' : '0.875rem' }}
          >
            {`${Math.round(value)}%`}
          </Typography>
        </Box>
      </Box>
      <Typography variant="caption" sx={{ mt: 1, textAlign: 'center', fontWeight: 500 }}>
        {label}
      </Typography>
    </Box>
  );

  return (
    <Card sx={{ height: '100%', minHeight: 300 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Assignment sx={{ mr: 1, color: '#2196F3' }} />
          Task Completion Statistics
        </Typography>

        {/* Completion Rate Circles */}
        <Box sx={{ display: 'flex', justifyContent: 'space-around', mb: 4 }}>
          <CircularProgressWithLabel
            value={allTime.completionRate}
            label="All Time"
            color="#4CAF50"
            size={70}
          />
          <CircularProgressWithLabel
            value={thisMonth.completionRate}
            label="This Month"
            color="#2196F3"
            size={70}
          />
          <CircularProgressWithLabel
            value={thisWeek.completionRate}
            label="This Week"
            color="#FF9800"
            size={70}
          />
        </Box>

        {/* Task Summary */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Overall Summary
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary" fontWeight="bold">
                  {allTime.total}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total Tasks
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main" fontWeight="bold">
                  {allTime.completed}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Completed
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main" fontWeight="bold">
                  {allTime.total - allTime.completed}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Remaining
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Status Breakdown */}
        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Current Status Breakdown
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {Object.entries(allTime.byStatus).map(([status, count]) => {
              if (count === 0) return null;
              
              const displayName = status === 'inProgress' ? 'In Progress' : 
                                status === 'needsRevision' ? 'Needs Revision' : 
                                status.charAt(0).toUpperCase() + status.slice(1);
              
              return (
                <Chip
                  key={status}
                  icon={getStatusIcon(status)}
                  label={`${displayName}: ${count}`}
                  size="small"
                  sx={{
                    backgroundColor: `${getStatusColor(status)}20`,
                    color: getStatusColor(status),
                    '& .MuiChip-icon': {
                      color: getStatusColor(status)
                    }
                  }}
                />
              );
            })}
          </Box>
        </Box>

        {/* Empty State */}
        {allTime.total === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Assignment sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Tasks Yet
            </Typography>
            <Typography variant="body2" color="text.disabled">
              Join a workspace and start getting tasks assigned to see your statistics here!
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default TaskCompletionCard;
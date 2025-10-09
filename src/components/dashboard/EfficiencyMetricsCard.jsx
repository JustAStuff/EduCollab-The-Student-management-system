// Efficiency Metrics Card Component
import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  LinearProgress,
  Grid,
  Chip,
  Divider
} from '@mui/material';
import {
  Speed,
  Timer,
  CheckCircle,
  Refresh,
  TrendingUp,
  Star
} from '@mui/icons-material';

const EfficiencyMetricsCard = ({ efficiencyMetrics, loading = false }) => {
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

  const {
    avgCompletionTime,
    onTimeRate,
    revisionRate,
    productivityScore,
    totalCompleted
  } = efficiencyMetrics;

  // Get productivity score color and label
  const getProductivityLevel = (score) => {
    if (score >= 90) return { level: 'Excellent', color: '#4CAF50', icon: '🏆' };
    if (score >= 75) return { level: 'Good', color: '#8BC34A', icon: '⭐' };
    if (score >= 60) return { level: 'Average', color: '#FF9800', icon: '👍' };
    if (score >= 40) return { level: 'Below Average', color: '#FF5722', icon: '📈' };
    return { level: 'Needs Improvement', color: '#F44336', icon: '🎯' };
  };

  const productivity = getProductivityLevel(productivityScore);

  // Format completion time
  const formatCompletionTime = (hours) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${Math.round(hours * 10) / 10}h`;
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round((hours % 24) * 10) / 10;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  };

  // Circular progress with custom styling
  const MetricCircle = ({ value, label, color, icon, suffix = '%' }) => (
    <Box sx={{ textAlign: 'center', position: 'relative' }}>
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <CircularProgress
          variant="determinate"
          value={value}
          size={80}
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
            flexDirection: 'column'
          }}
        >
          <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.875rem', color: 'text.primary' }}>
            {value}{suffix}
          </Typography>
        </Box>
      </Box>
      <Typography variant="caption" sx={{ mt: 1, display: 'block', fontSize: '0.75rem', fontWeight: 500 }}>
        {label}
      </Typography>
    </Box>
  );

  return (
    <Card sx={{ height: '100%', minHeight: 300 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Speed sx={{ mr: 1, color: '#FF9800' }} />
          Work Efficiency & Productivity
        </Typography>

        {totalCompleted > 0 ? (
          <>
            {/* Productivity Score Header */}
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                <Typography variant="h3" sx={{ color: productivity.color, fontWeight: 'bold', mr: 1 }}>
                  {productivityScore}
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  /100
                </Typography>
              </Box>
              <Chip
                label={`${productivity.icon} ${productivity.level}`}
                sx={{
                  backgroundColor: `${productivity.color}20`,
                  color: productivity.color,
                  fontWeight: 'bold'
                }}
              />
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* Efficiency Metrics Circles */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={4}>
                <MetricCircle
                  value={onTimeRate}
                  label="On-Time Rate"
                  color="#4CAF50"
                  icon={<CheckCircle sx={{ fontSize: 16, color: '#4CAF50' }} />}
                />
              </Grid>
              <Grid item xs={4}>
                <MetricCircle
                  value={Math.max(0, 100 - revisionRate)}
                  label="Quality Score"
                  color="#2196F3"
                  icon={<Star sx={{ fontSize: 16, color: '#2196F3' }} />}
                />
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                    <CircularProgress
                      variant="determinate"
                      value={Math.min(100, Math.max(0, 100 - (avgCompletionTime / 168) * 100))}
                      size={80}
                      thickness={4}
                      sx={{
                        color: '#FF9800',
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
                        flexDirection: 'column'
                      }}
                    >
                      <Timer sx={{ fontSize: 16, color: '#FF9800' }} />
                      <Typography variant="caption" fontWeight="bold" sx={{ fontSize: '0.7rem' }}>
                        {formatCompletionTime(avgCompletionTime)}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="caption" sx={{ mt: 1, display: 'block', fontSize: '0.75rem' }}>
                    Avg Time
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {/* Detailed Metrics */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Performance Details
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2">On-Time Completion</Typography>
                  <Typography variant="body2" fontWeight="bold" color="success.main">
                    {onTimeRate}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={onTimeRate}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: '#e0e0e0',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: '#4CAF50',
                      borderRadius: 3,
                    },
                  }}
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2">Quality (Low Revision Rate)</Typography>
                  <Typography variant="body2" fontWeight="bold" color="primary.main">
                    {Math.max(0, 100 - revisionRate)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.max(0, 100 - revisionRate)}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: '#e0e0e0',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: '#2196F3',
                      borderRadius: 3,
                    },
                  }}
                />
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Tasks Completed: {totalCompleted}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Avg Time: {formatCompletionTime(avgCompletionTime)}
                </Typography>
              </Box>
            </Box>
          </>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Speed sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Efficiency Data Yet
            </Typography>
            <Typography variant="body2" color="text.disabled">
              Complete some tasks to see your efficiency metrics and productivity score!
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default EfficiencyMetricsCard;
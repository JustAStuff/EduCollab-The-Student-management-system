// Achievements and Badges Card Component
import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Chip,
  Grid,
  Avatar,
  LinearProgress,
  Divider,
  Tooltip
} from '@mui/material';
import {
  EmojiEvents,
  LocalFireDepartment,
  Star,
  Speed,
  CheckCircle,
  TrendingUp,
  WorkspacePremium
} from '@mui/icons-material';

const AchievementsCard = ({ achievements, taskMetrics, loading = false }) => {
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

  const { badges, currentStreak, longestStreak, totalBadges } = achievements || {};
  const completedTasks = taskMetrics?.allTime?.completed || 0;

  // Calculate progress towards next milestones
  const getMilestoneProgress = (current, milestones) => {
    const nextMilestone = milestones.find(m => m > current) || milestones[milestones.length - 1];
    const prevMilestone = milestones.filter(m => m <= current).pop() || 0;
    const progress = prevMilestone === nextMilestone ? 100 : 
      ((current - prevMilestone) / (nextMilestone - prevMilestone)) * 100;
    return { nextMilestone, progress: Math.min(100, progress) };
  };

  const taskMilestones = [10, 25, 50, 100, 250, 500];
  const streakMilestones = [3, 7, 14, 30, 60, 100];

  const taskProgress = getMilestoneProgress(completedTasks, taskMilestones);
  const streakProgress = getMilestoneProgress(longestStreak || 0, streakMilestones);

  // Badge display component
  const BadgeDisplay = ({ badge }) => (
    <Tooltip title={badge.description} arrow>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          p: 2,
          bgcolor: '#f8f9fa',
          borderRadius: 2,
          border: '2px solid #e9ecef',
          transition: 'all 0.3s ease',
          cursor: 'pointer',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: 3,
            borderColor: '#ffd700'
          }
        }}
      >
        <Avatar
          sx={{
            width: 48,
            height: 48,
            bgcolor: '#ffd700',
            fontSize: '1.5rem',
            mb: 1
          }}
        >
          {badge.icon}
        </Avatar>
        <Typography variant="caption" fontWeight="bold" textAlign="center">
          {badge.name}
        </Typography>
      </Box>
    </Tooltip>
  );

  // Streak display component
  const StreakDisplay = ({ current, longest, label, icon, color }) => (
    <Box sx={{ textAlign: 'center', p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
        {icon}
        <Typography variant="h4" fontWeight="bold" sx={{ ml: 1, color }}>
          {current}
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      {longest > current && (
        <Typography variant="caption" color="text.disabled">
          Best: {longest}
        </Typography>
      )}
    </Box>
  );

  return (
    <Card sx={{ height: '100%', minHeight: 300 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <EmojiEvents sx={{ mr: 1, color: '#ffd700' }} />
          Achievements & Milestones
        </Typography>

        {totalBadges > 0 || currentStreak > 0 ? (
          <>
            {/* Streak Section */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <LocalFireDepartment sx={{ mr: 1, color: '#ff6b35' }} />
                Current Streak
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <StreakDisplay
                    current={currentStreak || 0}
                    longest={longestStreak || 0}
                    label="Days Active"
                    icon={<LocalFireDepartment sx={{ color: '#ff6b35' }} />}
                    color="#ff6b35"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ p: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Next Streak Milestone
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="h6" fontWeight="bold">
                        {streakProgress.nextMilestone} days
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={streakProgress.progress}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: '#e0e0e0',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: '#ff6b35',
                          borderRadius: 4,
                        },
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {Math.round(streakProgress.progress)}% complete
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* Badges Section */}
            {badges && badges.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <Star sx={{ mr: 1, color: '#ffd700' }} />
                  Earned Badges ({badges.length})
                </Typography>
                
                <Grid container spacing={2}>
                  {badges.map((badge, index) => (
                    <Grid item xs={6} sm={4} md={3} key={badge.id || index}>
                      <BadgeDisplay badge={badge} />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* Progress Towards Next Milestones */}
            <Box>
              <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUp sx={{ mr: 1, color: '#4caf50' }} />
                Progress Towards Next Goals
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2">
                    Task Completion Goal
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {completedTasks} / {taskProgress.nextMilestone}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={taskProgress.progress}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: '#e0e0e0',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: '#4caf50',
                      borderRadius: 4,
                    },
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  {Math.round(taskProgress.progress)}% towards next milestone
                </Typography>
              </Box>

              {/* Upcoming Badges Preview */}
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Upcoming Achievements
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {completedTasks < 10 && (
                    <Chip
                      icon={<CheckCircle />}
                      label="First 10 Tasks"
                      size="small"
                      variant="outlined"
                      sx={{ opacity: 0.6 }}
                    />
                  )}
                  {completedTasks < 50 && completedTasks >= 10 && (
                    <Chip
                      icon={<Speed />}
                      label="Half Century"
                      size="small"
                      variant="outlined"
                      sx={{ opacity: 0.6 }}
                    />
                  )}
                  {completedTasks < 100 && completedTasks >= 50 && (
                    <Chip
                      icon={<WorkspacePremium />}
                      label="Task Master"
                      size="small"
                      variant="outlined"
                      sx={{ opacity: 0.6 }}
                    />
                  )}
                  {(currentStreak || 0) < 7 && (
                    <Chip
                      icon={<LocalFireDepartment />}
                      label="Week Warrior"
                      size="small"
                      variant="outlined"
                      sx={{ opacity: 0.6 }}
                    />
                  )}
                </Box>
              </Box>
            </Box>
          </>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <EmojiEvents sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Start Your Achievement Journey!
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
              Complete tasks and maintain streaks to earn badges and unlock achievements.
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                icon={<CheckCircle />}
                label="Complete 10 tasks"
                size="small"
                variant="outlined"
              />
              <Chip
                icon={<LocalFireDepartment />}
                label="3-day streak"
                size="small"
                variant="outlined"
              />
              <Chip
                icon={<Star />}
                label="Zero revisions"
                size="small"
                variant="outlined"
              />
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default AchievementsCard;
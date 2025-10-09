// Workspace Participation Statistics Card Component
import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Chip,
  Grid,
  Divider
} from '@mui/material';
import {
  Business,
  Group,
  Star,
  TrendingUp
} from '@mui/icons-material';

const WorkspaceParticipationCard = ({ workspaceStats, loading = false }) => {
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
    totalWorkspaces,
    ownedWorkspaces,
    memberWorkspaces,
    mostActiveWorkspace,
    taskDistribution
  } = workspaceStats;

  return (
    <Card sx={{ height: '100%', minHeight: 300 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Business sx={{ mr: 1, color: '#2196F3' }} />
          Workspace Participation
        </Typography>

        {totalWorkspaces > 0 ? (
          <>
            {/* Summary Stats */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" color="primary" fontWeight="bold">
                    {totalWorkspaces}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total Workspaces
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" color="success.main" fontWeight="bold">
                    {ownedWorkspaces}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Owned
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" color="info.main" fontWeight="bold">
                    {memberWorkspaces}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Member
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            <Divider sx={{ mb: 3 }} />

            {/* Role Distribution */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Role Distribution
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {ownedWorkspaces > 0 && (
                  <Chip
                    icon={<Star />}
                    label={`Team Leader (${ownedWorkspaces})`}
                    color="primary"
                    size="small"
                  />
                )}
                {memberWorkspaces > 0 && (
                  <Chip
                    icon={<Group />}
                    label={`Team Member (${memberWorkspaces})`}
                    color="info"
                    size="small"
                  />
                )}
              </Box>
            </Box>

            {/* Most Active Workspace */}
            {mostActiveWorkspace && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Most Active Workspace
                </Typography>
                <Box
                  sx={{
                    p: 2,
                    bgcolor: '#f5f5f5',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {mostActiveWorkspace.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {mostActiveWorkspace.taskCount} tasks • {mostActiveWorkspace.completedCount} completed
                    </Typography>
                  </Box>
                  <TrendingUp sx={{ color: 'success.main' }} />
                </Box>
              </Box>
            )}

            {/* Task Distribution */}
            {taskDistribution && taskDistribution.length > 1 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Task Distribution Across Workspaces
                </Typography>
                {taskDistribution.slice(0, 3).map((workspace, index) => (
                  <Box key={workspace.id} sx={{ mb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" noWrap>
                        {workspace.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {workspace.taskCount} tasks
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        width: '100%',
                        height: 4,
                        bgcolor: '#e0e0e0',
                        borderRadius: 2,
                        overflow: 'hidden'
                      }}
                    >
                      <Box
                        sx={{
                          width: `${Math.min(100, (workspace.taskCount / Math.max(...taskDistribution.map(w => w.taskCount))) * 100)}%`,
                          height: '100%',
                          bgcolor: index === 0 ? '#4CAF50' : index === 1 ? '#2196F3' : '#FF9800',
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Business sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Workspaces Yet
            </Typography>
            <Typography variant="body2" color="text.disabled">
              Create or join a workspace to start collaborating and see your participation statistics!
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkspaceParticipationCard;
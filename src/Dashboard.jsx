// Enhanced Dashboard with Personal Statistics
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Grid,
  Alert,
  Skeleton,
  Fade,
  Container
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { Add, Dashboard as DashboardIcon } from "@mui/icons-material";
import Sidebar from "./Sidebar";
import { supabase } from "./supabaseClient";
import statisticsService from "./services/StatisticsService";
import TaskCompletionCard from "./components/dashboard/TaskCompletionCard";
import EfficiencyMetricsCard from "./components/dashboard/EfficiencyMetricsCard";
import CompletionTrendChart from "./components/dashboard/CompletionTrendChart";
import WorkspaceParticipationCard from "./components/dashboard/WorkspaceParticipationCard";
import RemainingTasksCard from "./components/dashboard/RemainingTasksCard";
import AchievementsCard from "./components/dashboard/AchievementsCard";
import RecentActivityCard from "./components/dashboard/RecentActivityCard";

const MainBox = styled(Box)(() => ({
  display: "flex",
  minHeight: "100vh",
  width: "100vw",
  backgroundColor: "#F9FAFB",
  fontFamily: "Roboto, sans-serif",
}));

const Dashboard = () => {
  const navigate = useNavigate();
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUserStatistics();
  }, []);

  const fetchUserStatistics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !currentUser) {
        setError("Please log in to view your dashboard");
        navigate("/");
        return;
      }

      setUser(currentUser);

      // Fetch user statistics
      const userStats = await statisticsService.getUserStatistics(currentUser.id);
      setStatistics(userStats);

    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    statisticsService.clearCache();
    fetchUserStatistics();
  };

  if (error) {
    return (
      <MainBox>
        <Sidebar />
        <Box component="main" sx={{ flexGrow: 1, p: 4 }}>
          <Alert 
            severity="error" 
            action={
              <Button color="inherit" size="small" onClick={handleRefresh}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        </Box>
      </MainBox>
    );
  }

  return (
    <MainBox>
      <Sidebar />
      
      <Box component="main" sx={{ flexGrow: 1, overflow: 'auto' }}>
        <Container maxWidth="xl" sx={{ py: 4 }}>
          {/* Header Section */}
          <Fade in={!loading} timeout={500}>
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center' }}>
                    <DashboardIcon sx={{ mr: 2, color: '#106EBE' }} />
                    Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}!
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Here's your productivity overview and statistics
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  sx={{
                    bgcolor: "#106EBE",
                    "&:hover": { bgcolor: "#0A4E82" },
                    borderRadius: "12px",
                    px: 3,
                    py: 1.5,
                    boxShadow: 3
                  }}
                  onClick={() => navigate("/create-workspace")}
                >
                  Create Workspace
                </Button>
              </Box>
            </Box>
          </Fade>

<<<<<<< HEAD
          {/* Remaining Tasks Overview - Priority Section */}
          {loading ? (
            <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2, mb: 3 }} />
          ) : (
            <Fade in={!loading} timeout={500}>
              <div>
                <RemainingTasksCard 
                  taskMetrics={statistics?.taskMetrics} 
                  workspaceStats={statistics?.workspaceStats}
                  loading={loading}
                />
              </div>
            </Fade>
          )}

          {/* Statistics Grid - Stacked Vertically */}
          <Grid container spacing={3} direction="column">
            {/* Task Completion Statistics */}
            <Grid item xs={12}>
              {loading ? (
                <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
              ) : (
                <Fade in={!loading} timeout={700}>
                  <div>
                    <TaskCompletionCard 
                      taskMetrics={statistics?.taskMetrics} 
                      loading={loading}
                    />
                  </div>
                </Fade>
              )}
            </Grid>

            {/* Efficiency Metrics */}
            <Grid item xs={12}>
              {loading ? (
                <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
              ) : (
                <Fade in={!loading} timeout={900}>
                  <div>
                    <EfficiencyMetricsCard 
                      efficiencyMetrics={statistics?.efficiencyMetrics} 
                      loading={loading}
                    />
                  </div>
                </Fade>
              )}
            </Grid>

            {/* Completion Trend Chart */}
            <Grid item xs={12}>
              {loading ? (
                <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
              ) : (
                <Fade in={!loading} timeout={1100}>
                  <div>
                    <CompletionTrendChart 
                      trends={statistics?.taskMetrics?.trends} 
                      loading={loading}
                    />
                  </div>
                </Fade>
              )}
            </Grid>

            {/* Workspace Participation */}
            <Grid item xs={12}>
              {loading ? (
                <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
              ) : (
                <Fade in={!loading} timeout={1300}>
                  <div>
                    <WorkspaceParticipationCard 
                      workspaceStats={statistics?.workspaceStats} 
                      loading={loading}
                    />
                  </div>
                </Fade>
              )}
            </Grid>

            {/* Achievements and Badges */}
            <Grid item xs={12}>
              {loading ? (
                <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
              ) : (
                <Fade in={!loading} timeout={1500}>
                  <div>
                    <AchievementsCard 
                      achievements={statistics?.achievements} 
                      taskMetrics={statistics?.taskMetrics}
                      loading={loading}
                    />
                  </div>
                </Fade>
              )}
            </Grid>

            {/* Recent Activity */}
            <Grid item xs={12}>
              {loading ? (
                <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
              ) : (
                <Fade in={!loading} timeout={1700}>
                  <div>
                    <RecentActivityCard 
                      taskMetrics={statistics?.taskMetrics}
                      workspaceStats={statistics?.workspaceStats}
                      loading={loading}
                    />
                  </div>
                </Fade>
              )}
            </Grid>

            {/* Quick Actions */}
            <Grid item xs={12}>
              {loading ? (
                <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
              ) : (
                <Fade in={!loading} timeout={1900}>
                  <Box
                    sx={{
                      p: 3,
                      bgcolor: 'white',
                      borderRadius: 2,
                      boxShadow: 1,
                      minHeight: 200
                    }}
                  >
                    <Typography variant="h6" gutterBottom>
                      Quick Actions
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Button
                          fullWidth
                          variant="contained"
                          onClick={() => navigate("/create-workspace")}
                          sx={{ 
                            bgcolor: "#106EBE",
                            "&:hover": { bgcolor: "#0A4E82" },
                            py: 1.5
                          }}
                        >
                          Create New Workspace
                        </Button>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Button
                          fullWidth
                          variant="outlined"
                          onClick={handleRefresh}
                          sx={{ py: 1.5 }}
                        >
                          Refresh Statistics
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>
                </Fade>
              )}
            </Grid>
          </Grid>
        </Container>
=======
      {/* Main Content Area */}
      <Box component="main" sx={{ flexGrow: 1, p: 4, maxWidth: "100%" }}>
        {/* Create Workspace */}
        <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 3 }}>
          <Button
            variant="contained"
            sx={{
              bgcolor: "#106EBE",
              "&:hover": { bgcolor: "#0A4E82" },
              borderRadius: "8px",
              px: 3,
            }}
            onClick={() => navigate("/create-workspace")}
          >
            Create Workspace
          </Button>
        </Box>

        {/* Sections stacked vertically */}
        <Grid container spacing={3} direction="column">
          {/* Personal Statistics */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, borderRadius: "16px", boxShadow: 3 }}>
              <Typography variant="h6" gutterBottom>
                Personal Statistics
              </Typography>
              <Box
                sx={{
                  bgcolor: "#106EBE",
                  "&:hover": { bgcolor: "#0A4E82" },
                  borderRadius: "8px",
                  px: 3,
                }}
                onClick={() => navigate("/create-workspace")}
              >
                Create Workspace
              </Button>
            </Box>

            {/* Dashboard Sections */}
            <Grid container spacing={3} direction="column">
              {/* Personal Statistics */}
              <Grid item xs={12}>
                <Paper sx={{ p: 3, borderRadius: "16px", boxShadow: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Personal Statistics
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mt: 2,
                    }}
                  >
                    <Box sx={{ position: "relative", display: "inline-flex" }}>
                      <CircularProgress
                        variant="determinate"
                        value={0}
                        size={100}
                        thickness={5}
                        sx={{ color: "#0FFCBE" }}
                      />
                      <Box
                        sx={{
                          top: 0,
                          left: 0,
                          bottom: 0,
                          right: 0,
                          position: "absolute",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Typography variant="h6" color="text.secondary">
                          0%
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ flex: 1, ml: 4 }}>
                      <Typography variant="body2">
                        Tasks Completed This Week
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={0}
                        sx={{
                          mt: 1,
                          height: 8,
                          borderRadius: "5px",
                          bgcolor: "#E0E0E0",
                          "& .MuiLinearProgress-bar": { bgcolor: "#106EBE" },
                        }}
                      />
                    </Box>
                  </Box>

              <Box sx={{ mt: 3 }}>
                <Typography variant="body2" gutterBottom>
                  Current Project Roles
                </Typography>
                {["Role 1", "Role 2"].map((role, i) => (
                  <Box key={i} sx={{ mb: 2 }}>
                    <Typography variant="caption">{role}</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={0}
                      sx={{
                        mt: 0.5,
                        height: 6,
                        borderRadius: "5px",
                        bgcolor: "#E0E0E0",
                        "& .MuiLinearProgress-bar": { bgcolor: "#0FFCBE" },
                      }}
                    />
                  </Box>
                </Paper>
              </Grid>

              {/* Recent Project Activity */}
              <Grid item xs={12}>
                <Paper sx={{ p: 3, borderRadius: "16px", boxShadow: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Recent Project Activity
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    No project activity yet.
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </>
        ) : (
          <PublicChat /> 
        )}
>>>>>>> 810a2186c454257359a601b81497f2c26f5c9001
      </Box>
    </MainBox>
  );
};

export default Dashboard;

// Enhanced Dashboard with Personal Statistics
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Grid,
  Alert,
  Skeleton,
  Fade
} from "@mui/material";
import { Add, Dashboard as DashboardIcon } from "@mui/icons-material";
import Sidebar from "./Sidebar";
import LayoutContainer from "./components/layout/LayoutContainer";
import { supabase } from "./supabaseClient";
import statisticsService from "./services/StatisticsService";
import TaskCompletionCard from "./components/dashboard/TaskCompletionCard";
import EfficiencyMetricsCard from "./components/dashboard/EfficiencyMetricsCard";
import CompletionTrendChart from "./components/dashboard/CompletionTrendChart";
import WorkspaceParticipationCard from "./components/dashboard/WorkspaceParticipationCard";
import RemainingTasksCard from "./components/dashboard/RemainingTasksCard";
import AchievementsCard from "./components/dashboard/AchievementsCard";
import RecentActivityCard from "./components/dashboard/RecentActivityCard";
import "./styles/layout.css";

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
      <div className="layout-container">
        <Sidebar />
        <LayoutContainer>
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
        </LayoutContainer>
      </div>
    );
  }

  return (
    <div className="layout-container">
      <Sidebar />
      
      <LayoutContainer maxWidth="xl" padding="default">
        {/* Header Section */}
        <Fade in={!loading} timeout={500}>
          <div className="layout-content-wrapper layout-margin-bottom-lg">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <DashboardIcon sx={{ mr: 2, color: 'var(--color-primary)' }} />
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
                  bgcolor: "var(--color-primary)",
                  "&:hover": { bgcolor: "var(--color-primary-hover)" },
                  borderRadius: "var(--border-radius-lg)",
                  px: 3,
                  py: 1.5,
                  boxShadow: "var(--shadow-md)"
                }}
                onClick={() => navigate("/create-workspace")}
              >
                Create Workspace
              </Button>
            </Box>
          </div>
        </Fade>

        {/* Remaining Tasks Overview - Priority Section */}
        {loading ? (
          <Skeleton 
            variant="rectangular" 
            height={200} 
            sx={{ 
              borderRadius: 'var(--border-radius-lg)', 
              mb: 'var(--spacing-lg)' 
            }} 
          />
        ) : (
          <Fade in={!loading} timeout={500}>
            <div className="layout-margin-bottom-lg">
              <RemainingTasksCard 
                taskMetrics={statistics?.taskMetrics} 
                workspaceStats={statistics?.workspaceStats}
                loading={loading}
              />
            </div>
          </Fade>
        )}

        {/* Statistics Grid - Stacked Vertically with Consistent Spacing */}
        <div className="layout-flex-column layout-spacing-lg">
          {/* Task Completion Statistics */}
          {loading ? (
            <Skeleton 
              variant="rectangular" 
              height={300} 
              sx={{ borderRadius: 'var(--border-radius-lg)' }} 
            />
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

          {/* Efficiency Metrics */}
          {loading ? (
            <Skeleton 
              variant="rectangular" 
              height={300} 
              sx={{ borderRadius: 'var(--border-radius-lg)' }} 
            />
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

          {/* Completion Trend Chart */}
          {loading ? (
            <Skeleton 
              variant="rectangular" 
              height={300} 
              sx={{ borderRadius: 'var(--border-radius-lg)' }} 
            />
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

          {/* Workspace Participation */}
          {loading ? (
            <Skeleton 
              variant="rectangular" 
              height={300} 
              sx={{ borderRadius: 'var(--border-radius-lg)' }} 
            />
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

          {/* Achievements and Badges */}
          {loading ? (
            <Skeleton 
              variant="rectangular" 
              height={300} 
              sx={{ borderRadius: 'var(--border-radius-lg)' }} 
            />
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

          {/* Recent Activity */}
          {loading ? (
            <Skeleton 
              variant="rectangular" 
              height={300} 
              sx={{ borderRadius: 'var(--border-radius-lg)' }} 
            />
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

          {/* Quick Actions */}
          {loading ? (
            <Skeleton 
              variant="rectangular" 
              height={200} 
              sx={{ borderRadius: 'var(--border-radius-lg)' }} 
            />
          ) : (
            <Fade in={!loading} timeout={1900}>
              <div className="layout-card">
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
                        bgcolor: "var(--color-primary)",
                        "&:hover": { bgcolor: "var(--color-primary-hover)" },
                        py: 1.5,
                        borderRadius: 'var(--border-radius-md)'
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
                      sx={{ 
                        py: 1.5,
                        borderRadius: 'var(--border-radius-md)'
                      }}
                    >
                      Refresh Statistics
                    </Button>
                  </Grid>
                </Grid>
              </div>
            </Fade>
          )}
        </div>
      </LayoutContainer>
    </div>
  );
};

export default Dashboard;

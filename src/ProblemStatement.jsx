import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  CircularProgress,
  Alert,
  Snackbar,
} from "@mui/material";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PeopleIcon from "@mui/icons-material/People";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import Sidebar from "./Sidebar";
import LayoutContainer from "./components/layout/LayoutContainer";
import TeamList from "./components/problemStatements/TeamList";
import CreateTeamSection from "./components/problemStatements/CreateTeamSection";
import problemStatementService from "./services/ProblemStatementService";
import "./styles/layout.css";

const ProblemStatement = () => {
  const [searchParams] = useSearchParams();
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [problemStatements, setProblemStatements] = useState([]);
  const [teams, setTeams] = useState([]);
  const [userApplications, setUserApplications] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Fetch problem statements
  useEffect(() => {
    const fetchProblemStatements = async () => {
      try {
        setLoading(true);
        const { data, error } = await problemStatementService.getAllProblemStatements();
        
        if (error) {
          setError(error);
        } else {
          setProblemStatements(data || []);
        }
      } catch (err) {
        console.error("Error fetching problem statements:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProblemStatements();
  }, []);

  // Get current user ID
  useEffect(() => {
    const getCurrentUser = async () => {
      const userId = await problemStatementService.getCurrentUserId();
      setCurrentUserId(userId);
    };
    getCurrentUser();
  }, []);

  // Fetch teams and applications when problem is selected
  useEffect(() => {
    if (selectedProblem) {
      fetchTeamsAndApplications();
    }
  }, [selectedProblem]);

  // Handle problem selection from URL
  useEffect(() => {
    const problemId = searchParams.get("selected") || searchParams.get("id");
    if (problemId && problemStatements.length > 0) {
      const problem = problemStatements.find((p) => p.id === problemId);
      if (problem) {
        setSelectedProblem(problem);
      }
    }
  }, [searchParams, problemStatements]);

  const fetchTeamsAndApplications = async () => {
    if (!selectedProblem) return;

    try {
      // Fetch teams
      const teamsResult = await problemStatementService.getProblemTeams(selectedProblem.id);
      setTeams(teamsResult.data || []);

      // Fetch user's applications
      const appsResult = await problemStatementService.hasUserApplied(selectedProblem.id);
      setUserApplications(appsResult.applications || []);
    } catch (err) {
      console.error("Error fetching teams:", err);
    }
  };

  const handleProblemSelect = (problem) => {
    setSelectedProblem(problem);
    setError(null);
    setSuccess(null);
  };

  const handleJoinTeam = async (teamId) => {
    if (!selectedProblem || applying) return;

    setApplying(true);
    setError(null);

    try {
      const result = await problemStatementService.applyForProblem(
        selectedProblem.id,
        'Member',
        teamId,
        'I would like to join this team'
      );

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess('Application submitted successfully! The team lead will review your request.');
        await fetchTeamsAndApplications();
      }
    } catch (err) {
      console.error('Error applying to team:', err);
      setError(err.message || 'Failed to submit application');
    } finally {
      setApplying(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!selectedProblem || applying) return;

    setApplying(true);
    setError(null);

    try {
      const result = await problemStatementService.applyForProblem(
        selectedProblem.id,
        'Lead',
        null, // null creates new team
        'Creating a new team'
      );

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess('Team created successfully! You are now the team lead.');
        await fetchTeamsAndApplications();
      }
    } catch (err) {
      console.error('Error creating team:', err);
      setError(err.message || 'Failed to create team');
    } finally {
      setApplying(false);
    }
  };

  const isUserInAnyTeam = () => {
    return teams.some(team => 
      team.members.some(member => member.user_id === currentUserId)
    );
  };

  // Check if user has any pending applications (Lead or Member)
  const hasPendingApplication = () => {
    return userApplications.some(app => app.status === 'pending');
  };

  return (
    <div className="layout-container">
      <Sidebar />
      <LayoutContainer maxWidth="xl" padding="default">
        <div className="layout-content-wrapper">
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" sx={{ fontWeight: "bold", color: "#106EBE" }}>
              Problem Statements
            </Typography>
          </Box>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
              <CircularProgress />
            </Box>
          ) : !selectedProblem ? (
            <Card elevation={2}>
              <CardContent sx={{ textAlign: "center", py: 8 }}>
                <AssignmentIcon sx={{ fontSize: 64, color: "#106EBE", mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  Select a problem statement from the sidebar to view details and join a team
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Box>
              {/* Main content area */}
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  {/* Problem Details */}
                    <Card elevation={2} sx={{ mb: 3 }}>
                      <CardContent>
                        <Typography variant="h5" sx={{ mb: 2, fontWeight: "bold", color: "#106EBE" }}>
                          {selectedProblem.title}
                        </Typography>
                        
                        <Typography variant="body1" sx={{ mb: 3, color: "text.secondary" }}>
                          {selectedProblem.description}
                        </Typography>

                        <Divider sx={{ my: 2 }} />

                        <Grid container spacing={2}>
                          <Grid item xs={12} md={4}>
                            <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                              <CalendarTodayIcon sx={{ mr: 1, color: "#106EBE" }} />
                              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                Duration
                              </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                              {selectedProblem.duration}
                            </Typography>
                          </Grid>
                          
                          <Grid item xs={12} md={4}>
                            <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                              <PeopleIcon sx={{ mr: 1, color: "#106EBE" }} />
                              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                Team Size
                              </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                              {selectedProblem.team_size}
                            </Typography>
                          </Grid>
                          
                          <Grid item xs={12} md={4}>
                            <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                              <TrendingUpIcon sx={{ mr: 1, color: "#106EBE" }} />
                              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                Difficulty
                              </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                              {selectedProblem.difficulty}
                            </Typography>
                          </Grid>
                        </Grid>

                        <Divider sx={{ my: 3 }} />

                        <Typography variant="h6" sx={{ mb: 2, color: "#106EBE", fontWeight: "bold" }}>
                          Required Skills
                        </Typography>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                          {selectedProblem.skills?.map((skill, index) => (
                            <Chip key={index} label={skill} color="primary" variant="outlined" />
                          ))}
                        </Box>
                      </CardContent>
                    </Card>

                    {/* Success/Error Messages */}
                    {error && (
                      <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                        {error}
                      </Alert>
                    )}
                    {success && (
                      <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
                        {success}
                      </Alert>
                    )}

                    {/* Create Team Section */}
                    <CreateTeamSection
                      onCreateTeam={handleCreateTeam}
                      disabled={applying}
                      disabledReason={null}
                    />

                    {/* Existing Teams */}
                    <Card elevation={2}>
                      <CardContent>
                        <TeamList
                          teams={teams}
                          onJoinTeam={handleJoinTeam}
                          userApplications={userApplications}
                          currentUserId={currentUserId}
                        />
                      </CardContent>
                    </Card>
                </Grid>
              </Grid>
            </Box>
          )}

          <Snackbar
            open={!!error}
            autoHideDuration={6000}
            onClose={() => setError(null)}
            message={error}
          />
        </div>
      </LayoutContainer>
    </div>
  );
};

export default ProblemStatement;

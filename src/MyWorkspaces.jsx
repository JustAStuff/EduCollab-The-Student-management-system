import { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Chip, 
  Grid, 
  Alert,
  CircularProgress,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { 
  Work as WorkIcon,
  ExpandMore as ExpandMoreIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  Pending as PendingIcon
} from '@mui/icons-material';
import Sidebar from './Sidebar';
import LayoutContainer from './components/layout/LayoutContainer';
import problemStatementService from './services/ProblemStatementService';
import './styles/layout.css';

const MyWorkspaces = () => {
  const [teams, setTeams] = useState([]);
  const [pendingApplications, setPendingApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch user's teams
      console.log('Fetching user teams...');
      const teamsResult = await problemStatementService.getUserTeams();
      console.log('Teams result:', teamsResult);
      
      if (teamsResult.error && !teamsResult.needsSetup) {
        console.error('Error fetching teams:', teamsResult.error);
        throw new Error(teamsResult.error);
      }
      
      console.log('Teams data:', teamsResult.data);
      setTeams(teamsResult.data || []);

      // Fetch pending applications for review (if user is a lead)
      console.log('Fetching pending applications...');
      const pendingResult = await problemStatementService.getPendingApplicationsForReview();
      console.log('Pending applications result:', pendingResult);
      
      if (pendingResult.error) {
        console.warn('Could not fetch pending applications:', pendingResult.error);
      }
      setPendingApplications(pendingResult.data || []);

      console.log('Final state - Teams:', teamsResult.data?.length || 0, 'Pending:', pendingResult.data?.length || 0);

    } catch (err) {
      console.error('Error in fetchData:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewApplication = async (applicationId, status) => {
    try {
      const result = await problemStatementService.reviewApplication(
        applicationId, 
        status, 
        status === 'approved' ? 'Welcome to the team!' : 'Application not approved at this time.'
      );
      
      if (result.error) {
        throw new Error(result.error);
      }

      // Refresh data
      fetchData();
    } catch (err) {
      setError(`Failed to ${status} application: ${err.message}`);
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner': return 'success';
      case 'intermediate': return 'warning';
      case 'advanced': return 'error';
      default: return 'default';
    }
  };

  const getRoleIcon = (role) => {
    return role === 'Lead' ? <PersonIcon /> : <GroupIcon />;
  };

  if (loading) {
    return (
      <div className="layout-container">
        <Sidebar />
        <LayoutContainer maxWidth="xl" padding="default">
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
            <CircularProgress />
          </Box>
        </LayoutContainer>
      </div>
    );
  }

  return (
    <div className="layout-container">
      <Sidebar />
      <LayoutContainer maxWidth="xl" padding="default">
        <div className="layout-content-wrapper">
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <WorkIcon sx={{ mr: 2, color: 'var(--color-primary)', fontSize: 32 }} />
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  My Workspaces
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Projects you're working on and applications to review
                </Typography>
              </Box>
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Pending Applications for Review */}
          {pendingApplications.length > 0 && (
            <Accordion sx={{ mb: 3 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <PendingIcon sx={{ mr: 1, color: 'warning.main' }} />
                  <Typography variant="h6">
                    Applications to Review ({pendingApplications.length})
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  {pendingApplications.map((application) => (
                    <Grid item xs={12} md={6} key={application.id}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                            <Box>
                              <Typography variant="subtitle1" fontWeight="600">
                                {application.applicant?.full_name || application.applicant?.email || 'Unknown User'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {application.applicant?.email}
                              </Typography>
                            </Box>
                          </Box>
                          
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Project: {application.problem_statements?.title}
                          </Typography>
                          
                          <Chip 
                            label={`Applying as ${application.role}`} 
                            size="small" 
                            color="primary" 
                            sx={{ mb: 1 }}
                          />
                          
                          {application.message && (
                            <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic', color: 'text.secondary' }}>
                              "{application.message}"
                            </Typography>
                          )}
                          
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                            Applied: {new Date(application.applied_at).toLocaleDateString()}
                          </Typography>
                          
                          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              onClick={() => handleReviewApplication(application.id, 'approved')}
                            >
                              Approve
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              onClick={() => handleReviewApplication(application.id, 'rejected')}
                            >
                              Reject
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </AccordionDetails>
            </Accordion>
          )}

          {/* My Teams */}
          <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
            My Projects ({teams.length})
          </Typography>

          {teams.length === 0 ? (
            <Alert severity="info">
              You haven't joined any projects yet. Visit the Problem Statements page to apply for projects!
            </Alert>
          ) : (
            <Grid container spacing={3}>
              {teams.map((team) => (
                <Grid item xs={12} md={6} lg={4} key={team.id}>
                  <Card 
                    sx={{ 
                      height: '100%',
                      border: team.role === 'Lead' ? '2px solid var(--color-primary)' : '1px solid #e0e0e0',
                      '&:hover': {
                        boxShadow: 'var(--shadow-md)',
                        transform: 'translateY(-2px)',
                        transition: 'all 0.2s ease-in-out'
                      }
                    }}
                  >
                    <CardContent>
                      {/* Header */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography variant="h6" component="h3" gutterBottom>
                          {team.problem_statements?.title}
                        </Typography>
                        <Chip
                          icon={getRoleIcon(team.role)}
                          label={team.role}
                          color={team.role === 'Lead' ? 'primary' : 'default'}
                          size="small"
                        />
                      </Box>

                      {/* Description */}
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        paragraph
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {team.problem_statements?.description}
                      </Typography>

                      {/* Details */}
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                        <Chip
                          label={team.problem_statements?.difficulty}
                          color={getDifficultyColor(team.problem_statements?.difficulty)}
                          size="small"
                        />
                        <Chip
                          label={team.problem_statements?.duration}
                          variant="outlined"
                          size="small"
                        />
                        <Chip
                          label={team.problem_statements?.team_size}
                          variant="outlined"
                          size="small"
                        />
                      </Box>

                      {/* Skills */}
                      {team.problem_statements?.skills && team.problem_statements.skills.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                            Skills:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {team.problem_statements.skills.slice(0, 3).map((skill, index) => (
                              <Chip
                                key={index}
                                label={skill}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.7rem', height: 20 }}
                              />
                            ))}
                            {team.problem_statements.skills.length > 3 && (
                              <Chip
                                label={`+${team.problem_statements.skills.length - 3} more`}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.7rem', height: 20 }}
                              />
                            )}
                          </Box>
                        </Box>
                      )}

                      {/* Footer */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto' }}>
                        <Typography variant="caption" color="text.secondary">
                          Joined: {new Date(team.joined_at).toLocaleDateString()}
                        </Typography>
                        <Chip
                          label={team.problem_statements?.status || 'active'}
                          color={team.problem_statements?.status === 'active' ? 'success' : 'default'}
                          size="small"
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </div>
      </LayoutContainer>
    </div>
  );
};

export default MyWorkspaces;
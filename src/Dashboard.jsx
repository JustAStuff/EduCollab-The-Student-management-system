import React, { useState } from "react";
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Typography,
  Button,
  Divider,
  Grid,
  Paper,
  CircularProgress,
  LinearProgress,
  Collapse,
  Card,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

const drawerWidth = 240;

const MainBox = styled(Box)(() => ({
  display: "flex",
  height: "100vh",
  width: "100vw",
  backgroundColor: "#F9FAFB",
  fontFamily: "Roboto, sans-serif",
}));

const Sidebar = styled(Drawer)(() => ({
  width: drawerWidth,
  flexShrink: 0,
  "& .MuiDrawer-paper": {
    width: drawerWidth,
    boxSizing: "border-box",
    backgroundColor: "#106EBE",
    color: "white",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
}));

const Dashboard = () => {
  const navigate = useNavigate();
  const [openProblemStatements, setOpenProblemStatements] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [showRoles, setShowRoles] = useState(false);

  // Dynamic Problem Statements
  const problemStatements = [
    {
      id: 1,
      title: "AI-powered Student Performance Tracker",
      description:
        "This project uses AI algorithms to monitor and predict student performance, helping educators take proactive measures.",
    },
    {
      id: 2,
      title: "Smart Attendance Management System",
      description:
        "An intelligent attendance system using facial recognition and QR codes to automate attendance tracking.",
    },
    {
      id: 3,
      title: "Collaborative Study Group Platform",
      description:
        "A platform for students to create and join study groups, share resources, and collaborate in real-time.",
    },
    {
      id: 4,
      title: "College Event Management App",
      description:
        "An app to manage college events, registrations, scheduling, and notifications efficiently.",
    },
  ];

  // Toggle Problem Statements Submenu
  const handleProblemStatementsClick = () => {
    setOpenProblemStatements(!openProblemStatements);
    setSelectedProblem(null);
    setShowRoles(false);
  };

  // When clicking a problem in the sidebar
  const handleProblemClick = (problem) => {
    setSelectedProblem(problem);
    setShowRoles(false);
  };

  // When OK button is clicked -> show Lead/Member buttons
  const handleOkClick = () => {
    setShowRoles(true);
  };

  // Role selection
  const handleRoleSelect = (role) => {
    alert(`You selected ${role} for problem: ${selectedProblem.title}`);
    // TODO: Connect to Supabase or backend
  };

  // Logout handler
  const handleLogout = () => {
    navigate("/"); // Redirect to login page
  };

  return (
    <MainBox>
      {/* Sidebar */}
      <Sidebar variant="permanent" anchor="left">
        <Box>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold">
              Dashboard
            </Typography>
          </Box>
          <Divider sx={{ bgcolor: "rgba(255,255,255,0.3)" }} />
          <List>
            {/* Workspace Labels */}
            <Typography sx={{ px: 2, py: 1, fontSize: 13, opacity: 0.8 }}>
              My Workspaces
            </Typography>

            <Typography sx={{ px: 2, py: 1, fontSize: 13, opacity: 0.8 }}>
              Other Workspaces
            </Typography>

            <Divider sx={{ bgcolor: "rgba(255,255,255,0.3)", my: 2 }} />

            {/* Dashboard Navigation */}
            <ListItem button onClick={() => navigate("/dashboard")}>
              <ListItemText primary="Dashboard" />
            </ListItem>

            {/* Public Chat Navigation */}
            <ListItem button onClick={() => navigate("/public-chat")}>
              <ListItemText primary="Public Chat" />
            </ListItem>

            {/* Problem Statements */}
            <ListItem button onClick={handleProblemStatementsClick}>
              <ListItemText primary="Problem Statements" />
              {openProblemStatements ? <ExpandLess /> : <ExpandMore />}
            </ListItem>

            <Collapse in={openProblemStatements} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {problemStatements.map((problem) => (
                  <ListItem
                    key={problem.id}
                    button
                    sx={{
                      pl: 4,
                      bgcolor:
                        selectedProblem?.id === problem.id
                          ? "rgba(255,255,255,0.2)"
                          : "transparent",
                    }}
                    onClick={() => handleProblemClick(problem)}
                  >
                    <ListItemText primary={problem.title} />
                  </ListItem>
                ))}
              </List>
            </Collapse>
          </List>
        </Box>

        {/* Logout Button at the Bottom */}
        <Box sx={{ p: 2 }}>
          <Button
            variant="contained"
            color="error"
            fullWidth
            onClick={handleLogout}
            sx={{
              bgcolor: "#D32F2F",
              "&:hover": { bgcolor: "#B71C1C" },
              borderRadius: "8px",
            }}
          >
            Logout
          </Button>
        </Box>
      </Sidebar>

      {/* Main Content Area */}
      <Box component="main" sx={{ flexGrow: 1, p: 4, maxWidth: "100%" }}>
        {/* If a problem is selected -> Show its details */}
        {selectedProblem ? (
          <Card sx={{ p: 3, borderRadius: "16px", boxShadow: 3, mb: 3 }}>
            <Typography variant="h5" gutterBottom>
              {selectedProblem.title}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {selectedProblem.description}
            </Typography>

            {!showRoles ? (
              <Button
                variant="contained"
                sx={{
                  bgcolor: "#106EBE",
                  "&:hover": { bgcolor: "#0A4E82" },
                  borderRadius: "8px",
                  px: 3,
                }}
                onClick={handleOkClick}
              >
                OK
              </Button>
            ) : (
              <Box sx={{ display: "flex", gap: 2 }}>
                <Button
                  variant="contained"
                  sx={{
                    bgcolor: "#3498db",
                    "&:hover": { bgcolor: "#2e86c1" },
                  }}
                  onClick={() => handleRoleSelect("Lead")}
                >
                  Lead
                </Button>
                <Button
                  variant="contained"
                  sx={{
                    bgcolor: "#76d7c4",
                    color: "black",
                    "&:hover": { bgcolor: "#48c9b0" },
                  }}
                  onClick={() => handleRoleSelect("Member")}
                >
                  Member
                </Button>
              </Box>
            )}
          </Card>
        ) : (
          /* Default dashboard content */
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
                  {["Role 1", "Role 2", "Role 3"].map((role, i) => (
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
                  ))}
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
        )}
      </Box>
    </MainBox>
  );
};

export default Dashboard;







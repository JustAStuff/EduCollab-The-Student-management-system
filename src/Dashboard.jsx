// src/pages/Dashboard.jsx
import React from "react";
import { useNavigate } from "react-router-dom"; 
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
} from "@mui/material";
import { styled } from "@mui/material/styles";

const drawerWidth = 240;

const MainBox = styled(Box)(() => ({
  display: "flex",
  height: "100vh",   // full screen height
  width: "100vw",    // full screen width
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
  },
}));

const Dashboard = () => {
   const navigate = useNavigate();
  return (
    <MainBox>
      {/* Sidebar */}
      <Sidebar variant="permanent" anchor="left">
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight="bold">
            Dashboard
          </Typography>
        </Box>
        <Divider sx={{ bgcolor: "rgba(255,255,255,0.3)" }} />
        <List>
          <Typography sx={{ px: 2, py: 1, fontSize: 13, opacity: 0.8 }}>
            My Workspaces
          </Typography>

          <Typography sx={{ px: 2, py: 1, fontSize: 13, opacity: 0.8 }}>
            Other Workspaces
          </Typography>

          <Divider sx={{ bgcolor: "rgba(255,255,255,0.3)", my: 2 }} />
      <ListItem button onClick={() => navigate("/dashboard")}>
        <ListItemText primary="Dashboard" />
      </ListItem>
      <ListItem button onClick={() => navigate("/public-chat")}>
        <ListItemText primary="Public Chat" />
      </ListItem>
      <ListItem button>
        <ListItemText primary="Problem Statements" />
      </ListItem>
    </List>
      </Sidebar>

      {/* Main Content */}
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
      </Box>
    </MainBox>
  );
};

export default Dashboard;
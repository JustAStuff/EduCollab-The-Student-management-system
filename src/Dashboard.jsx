// src/pages/Dashboard.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Grid,
  Paper,
  LinearProgress,
  Card,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import Sidebar from "./Sidebar"; // ✅ Import Sidebar

const MainBox = styled(Box)(() => ({
  display: "flex",
  height: "100vh",
  width: "100vw",
  backgroundColor: "#F9FAFB",
  fontFamily: "Roboto, sans-serif",
}));

const Dashboard = () => {
  const navigate = useNavigate();

  // ✅ Optional: Logout handler
  const handleLogout = () => {
    // Example: Clear token and go to login
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <MainBox>
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, p: 4, maxWidth: "100%" }}>
        {/* Top Buttons */}
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 3 }}>
          <Button
            variant="contained"
            color="error"
            sx={{
              bgcolor: "#D32F2F",
              "&:hover": { bgcolor: "#B71C1C" },
              borderRadius: "8px",
              px: 3,
            }}
            onClick={handleLogout}
          >
            Logout
          </Button>
        </Box>

        {/* Dashboard Content */}
        <Grid container spacing={3} direction="column">
          {/* Personal Statistics */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, borderRadius: "16px", boxShadow: 3 }}>
              <Typography variant="h6" gutterBottom>
                Personal Statistics
              </Typography>

              {["Role 1", "Role 2"].map((role, i) => (
                <Box key={i} sx={{ mb: 2 }}>
                  <Typography variant="caption">{role}</Typography>
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
              ))}

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

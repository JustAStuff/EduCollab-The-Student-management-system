import React from "react";
import { AppBar, Toolbar, Typography, Button, Box } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";

// Full screen hero section
const HeroSection = styled(Box)(() => ({
  height: "100vh",
  width: "100vw",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "linear-gradient(to right, #e3f2fd, #bbdefb)",
  position: "relative",
  overflow: "hidden",
  margin: 0,
  padding: 0,
}));

// 3D text effect styling
const HeroText = styled(Typography)(() => ({
  fontSize: "6rem",
  fontWeight: "bold",
  color: "#106EBE",
  textShadow: `
    3px 3px 0px #0A4E82, 
    6px 6px 10px rgba(0, 0, 0, 0.4)
  `,
  transition: "transform 0.4s ease",
  textAlign: "center",
  "&:hover": {
    transform: "scale(1.1) rotateX(8deg) rotateY(-8deg)",
  },
}));

const LandingPage = () => {
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate("/login");
  };

  const handleLogout = () => {
    navigate("/");
  };

  const handleAboutUs = () => {
    navigate("/about-us");
  };

  const handleHome = () => {
    navigate("/");
  };

  return (
    <Box sx={{ flexGrow: 1, margin: 0, padding: 0 }}>
      {/* Top Navigation Bar */}
      <AppBar position="fixed" sx={{ bgcolor: "#106EBE", boxShadow: 2 }}>
        <Toolbar>
          {/* Left: Logo and EduCollab Name */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              flexGrow: 1,
              cursor: "pointer",
            }}
            onClick={handleHome}
          >
            <img
              src="https://cdn-icons-png.flaticon.com/512/3135/3135755.png" // Replace with your logo
              alt="EduCollab Logo"
              style={{ width: 40, height: 40, marginRight: 10 }}
            />
            <Typography variant="h6" sx={{ fontWeight: "bold", color: "white" }}>
              EduCollab
            </Typography>
          </Box>

          {/* Right: Navigation Links */}
          <Button color="inherit" onClick={handleHome}>
            Home
          </Button>
          <Button color="inherit" onClick={handleLogin}>
            Login
          </Button>
          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
          <Button color="inherit" onClick={handleAboutUs}>
            About Us
          </Button>
        </Toolbar>
      </AppBar>

      {/* Hero Section */}
      <HeroSection>
        <HeroText>Project Platform</HeroText>
      </HeroSection>
    </Box>
  );
};

export default LandingPage;



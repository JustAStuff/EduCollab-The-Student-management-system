import React, { useState } from "react";
import {
  Box,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Collapse,
} from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import GroupIcon from "@mui/icons-material/Group";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";

const ProblemStatementSidebar = () => {
  // Sample problem statement data
  const problemStatements = [
    { id: 1, title: "AI-powered Student Performance Tracker" },
    { id: 2, title: "Smart Attendance Management System" },
    { id: 3, title: "Collaborative Study Group Platform" },
    { id: 4, title: "College Event Management App" },
  ];

  const [open, setOpen] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState(null);

  const handleSidebarToggle = () => {
    setOpen(!open);
    setSelectedProblem(null); // Reset when toggling
  };

  const handleProblemClick = (problem) => {
    setSelectedProblem(problem);
  };

  const handleRoleSelect = (role) => {
    alert(`You chose the role: ${role} for problem: ${selectedProblem.title}`);
  };

  return (
    <Box sx={{ width: "100%" }}>
      {/* Main Problem Statements Button */}
      <ListItemButton
        onClick={handleSidebarToggle}
        sx={{
          bgcolor: open ? "#3498db" : "transparent",
          color: open ? "white" : "inherit",
          borderRadius: 2,
          mb: 1,
        }}
      >
        <ListItemText primary="Problem Statements" />
        {open ? <ExpandLess /> : <ExpandMore />}
      </ListItemButton>

      {/* Expandable List of Problem Statements */}
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List component="div" disablePadding sx={{ pl: 2 }}>
          {problemStatements.map((problem) => (
            <ListItem key={problem.id} disablePadding>
              <ListItemButton
                selected={selectedProblem?.id === problem.id}
                onClick={() => handleProblemClick(problem)}
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  "&.Mui-selected": {
                    bgcolor: "#76d7c4",
                    color: "black",
                  },
                  "&:hover": { bgcolor: "#d5f5e3" },
                }}
              >
                <ListItemText primary={problem.title} />
                <ChevronRightIcon />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        {/* Role Selection Buttons */}
        {selectedProblem && (
          <Box sx={{ mt: 2, pl: 2 }}>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: "bold", color: "#154360", mb: 1 }}
            >
              Choose Role for:
              <br />
              {selectedProblem.title}
            </Typography>
            <Button
              variant="contained"
              startIcon={<WorkspacePremiumIcon />}
              onClick={() => handleRoleSelect("Lead")}
              sx={{
                bgcolor: "#3498db",
                "&:hover": { bgcolor: "#2e86c1" },
                borderRadius: 3,
                mb: 1,
                width: "90%",
              }}
            >
              Lead
            </Button>
            <Button
              variant="contained"
              startIcon={<GroupIcon />}
              onClick={() => handleRoleSelect("Member")}
              sx={{
                bgcolor: "#76d7c4",
                color: "black",
                "&:hover": { bgcolor: "#48c9b0" },
                borderRadius: 3,
                width: "90%",
              }}
            >
              Member
            </Button>
          </Box>
        )}
      </Collapse>
    </Box>
  );
};

export default ProblemStatementSidebar;

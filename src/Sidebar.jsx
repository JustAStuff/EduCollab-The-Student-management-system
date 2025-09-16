// src/Sidebar.jsx
import React from "react";
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Typography,
  Divider,
} from "@mui/material";

const drawerWidth = 240;

export default function Sidebar() {
  return (
    <Drawer
      variant="permanent"
      anchor="left"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
          backgroundColor: "#106EBE",
          color: "white",
        },
      }}
    >
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
        <ListItem button>
          <ListItemText primary="Dashboard" />
        </ListItem>
        <ListItem button>
          <ListItemText primary="Public Chat" />
        </ListItem>
        <ListItem button>
          <ListItemText primary="Problem Statements" />
        </ListItem>
      </List>
    </Drawer>
  );
}
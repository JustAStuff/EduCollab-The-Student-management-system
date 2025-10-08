// src/Sidebar.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Typography,
  Divider,
  CircularProgress,
  ListItemButton,
  Button,
} from "@mui/material";
import { supabase } from "./supabaseClient";

const drawerWidth = 240;

export default function Sidebar() {
  const navigate = useNavigate();
  const [myWorkspaces, setMyWorkspaces] = useState([]);
  const [otherWorkspaces, setOtherWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        // Get current user
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);

        if (!currentUser) {
          setMyWorkspaces([]);
          setOtherWorkspaces([]);
          setLoading(false);
          return;
        }

        // Fetch all workspaces
        const { data: allWorkspaces, error: workspacesError } = await supabase
          .from("workspaces")
          .select("*")
          .order("created_at", { ascending: false });

        if (workspacesError) throw workspacesError;

        // Get workspaces where user is a member
        const { data: memberWorkspaces, error: memberError } = await supabase
          .from("workspace_members")
          .select("workspace_id")
          .eq("user_id", currentUser.id);

        if (memberError) throw memberError;

        const memberWorkspaceIds = memberWorkspaces.map(m => m.workspace_id);

        // Separate workspaces into "my workspaces" and "other workspaces"
        const myWs = allWorkspaces.filter(ws => 
          ws.created_by === currentUser.id || memberWorkspaceIds.includes(ws.id)
        );
        const otherWs = allWorkspaces.filter(ws => 
          ws.created_by !== currentUser.id && !memberWorkspaceIds.includes(ws.id)
        );

        setMyWorkspaces(myWs);
        setOtherWorkspaces(otherWs);
      } catch (error) {
        console.error("Error fetching workspaces:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspaces();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

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
      
      <List sx={{ flex: 1, overflow: "auto" }}>
        {/* My Workspaces Section */}
        <Typography sx={{ px: 2, py: 1, fontSize: 13, opacity: 0.8, fontWeight: "bold" }}>
          My Workspaces
        </Typography>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <CircularProgress size={20} sx={{ color: "white" }} />
          </Box>
        ) : myWorkspaces.length > 0 ? (
          myWorkspaces.map((workspace) => (
            <ListItemButton
              key={workspace.id}
              onClick={() => {
                if (workspace.created_by === user?.id) {
                  navigate(`/workspace/${workspace.id}`); // Owner view
                } else {
                  navigate(`/workspace-member/${workspace.id}`); // Member view
                }
              }}
              sx={{
                pl: 3,
                "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" },
              }}
            >
              <ListItemText 
                primary={workspace.name}
                primaryTypographyProps={{
                  fontSize: "0.875rem",
                  noWrap: true,
                }}
                secondary={workspace.created_by === user?.id ? "Owner" : "Member"}
                secondaryTypographyProps={{
                  fontSize: "0.75rem",
                  color: "rgba(255,255,255,0.7)",
                }}
              />
            </ListItemButton>
          ))
        ) : (
          <Typography sx={{ px: 3, py: 1, fontSize: 12, opacity: 0.6, fontStyle: "italic" }}>
            No workspaces yet
          </Typography>
        )}

        {/* Other Workspaces Section */}
        <Typography sx={{ px: 2, py: 1, mt: 2, fontSize: 13, opacity: 0.8, fontWeight: "bold" }}>
          Other Workspaces
        </Typography>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <CircularProgress size={20} sx={{ color: "white" }} />
          </Box>
        ) : otherWorkspaces.length > 0 ? (
          otherWorkspaces.slice(0, 5).map((workspace) => ( // Limit to 5 to save space
            <ListItemButton
              key={workspace.id}
              onClick={() => navigate(`/join-workspace/${workspace.id}`)}
              sx={{
                pl: 3,
                "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" },
              }}
            >
              <ListItemText 
                primary={workspace.name}
                primaryTypographyProps={{
                  fontSize: "0.875rem",
                  noWrap: true,
                }}
                secondary="Click to join"
                secondaryTypographyProps={{
                  fontSize: "0.75rem",
                  color: "rgba(255,255,255,0.7)",
                }}
              />
            </ListItemButton>
          ))
        ) : (
          <Typography sx={{ px: 3, py: 1, fontSize: 12, opacity: 0.6, fontStyle: "italic" }}>
            No other workspaces
          </Typography>
        )}

        <Divider sx={{ bgcolor: "rgba(255,255,255,0.3)", my: 2 }} />
        
        {/* Navigation Links */}
        <ListItemButton onClick={() => navigate("/dashboard")}>
          <ListItemText primary="Dashboard" />
        </ListItemButton>
        <ListItemButton onClick={() => navigate("/create-workspace")}>
          <ListItemText primary="Create Workspace" />
        </ListItemButton>
        <ListItemButton onClick={() => navigate("/public-chat")}>
          <ListItemText primary="Public Chat" />
        </ListItemButton>
        <ListItemButton>
          <ListItemText primary="Problem Statements" />
        </ListItemButton>
        
        <Divider sx={{ bgcolor: "rgba(255,255,255,0.3)", my: 2 }} />
        
        {/* User Info and Logout */}
        {user && (
          <Box sx={{ p: 2 }}>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)" }}>
              Logged in as:
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, wordBreak: "break-word" }}>
              {user.email}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={handleLogout}
              sx={{
                color: "white",
                borderColor: "rgba(255,255,255,0.5)",
                "&:hover": {
                  borderColor: "white",
                  backgroundColor: "rgba(255,255,255,0.1)"
                }
              }}
            >
              Logout
            </Button>
          </Box>
        )}
      </List>
    </Drawer>
  );
}

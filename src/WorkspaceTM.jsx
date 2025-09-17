// src/WorkspaceTM.jsx - Workspace Team Member View
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "./supabaseClient";
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  Assignment,
  CheckCircle,
  Schedule,
  PlayArrow,
  RadioButtonUnchecked,
} from "@mui/icons-material";
import Sidebar from "./Sidebar";

export default function WorkspaceTM() {
  const { id } = useParams();
  const [workspace, setWorkspace] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, task: null, newStatus: null });
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    fetchWorkspaceData();
  }, [id]);

  const fetchWorkspaceData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Please log in to access this workspace");
        return;
      }

      // Fetch workspace details
      const { data: workspaceData, error: workspaceError } = await supabase
        .from("workspaces")
        .select("*")
        .eq("id", id)
        .single();

      if (workspaceError) throw workspaceError;
      setWorkspace(workspaceData);

      // Check if user is a member of this workspace
      const { data: memberData, error: memberError } = await supabase
        .from("workspace_members")
        .select("*")
        .eq("workspace_id", id)
        .eq("user_id", user.id)
        .single();

      if (memberError && memberError.code !== 'PGRST116') {
        throw memberError;
      }

      if (!memberData && workspaceData.created_by !== user.id) {
        setError("You are not a member of this workspace");
        return;
      }

      // Fetch tasks assigned to this user
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .eq("workspace_id", id)
        .eq("assigned_to", user.id)
        .order("created_at", { ascending: false });

      if (tasksError) throw tasksError;

      // Fetch assigned_by user details for each task
      const tasksWithUsers = [];
      if (tasksData && tasksData.length > 0) {
        for (const task of tasksData) {
          const { data: assignedByUser, error: userError } = await supabase
            .from("users")
            .select("id, email, full_name")
            .eq("id", task.assigned_by)
            .single();

          tasksWithUsers.push({
            ...task,
            assigned_by_user: assignedByUser || {
              id: task.assigned_by,
              email: "Team Leader",
              full_name: "Team Leader"
            }
          });
        }
      }

      setTasks(tasksWithUsers || []);



    } catch (err) {
      console.error("Error fetching workspace data:", err);
      setError("Failed to load workspace data");
    } finally {
      setLoading(false);
    }
  };

  const getNextStatus = (currentStatus) => {
    switch (currentStatus) {
      case "todo":
        return "in_progress";
      case "in_progress":
        return "completed";
      case "completed":
        return "completed"; // Stay completed
      default:
        return "todo";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "todo":
        return "default";
      case "in_progress":
        return "warning";
      case "completed":
        return "success";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "todo":
        return <RadioButtonUnchecked />;
      case "in_progress":
        return <PlayArrow />;
      case "completed":
        return <CheckCircle />;
      default:
        return <RadioButtonUnchecked />;
    }
  };

  const handleStatusChange = (task) => {
    const newStatus = getNextStatus(task.status);
    
    if (task.status === "completed") {
      return; // Can't change from completed
    }

    setConfirmDialog({
      open: true,
      task: task,
      newStatus: newStatus
    });
  };

  const confirmStatusChange = async () => {
    const { task, newStatus } = confirmDialog;
    setUpdating(task.id);
    
    try {
      const updateData = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === "completed") {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("tasks")
        .update(updateData)
        .eq("id", task.id);

      if (error) throw error;

      // Refresh tasks
      fetchWorkspaceData();
      
    } catch (err) {
      console.error("Error updating task status:", err);
      alert("Failed to update task status. Please try again.");
    } finally {
      setUpdating(null);
      setConfirmDialog({ open: false, task: null, newStatus: null });
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "todo":
        return "To Do";
      case "in_progress":
        return "In Progress";
      case "completed":
        return "Completed";
      default:
        return "Unknown";
    }
  };

  const getButtonText = (status) => {
    switch (status) {
      case "todo":
        return "Start Task";
      case "in_progress":
        return "Mark Complete";
      case "completed":
        return "Completed";
      default:
        return "Update";
    }
  };

  const currentTasks = tasks.filter(task => task.status !== "completed");
  const completedTasks = tasks.filter(task => task.status === "completed");

  if (loading) {
    return (
      <Box sx={{ display: "flex", height: "100vh", backgroundColor: "#F9FAFB" }}>
        <Sidebar />
        <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: "flex", height: "100vh", backgroundColor: "#F9FAFB" }}>
        <Sidebar />
        <Box sx={{ flexGrow: 1, p: 4 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "#F9FAFB" }}>
      <Sidebar />
      
      <Box component="main" sx={{ flexGrow: 1, p: 4 }}>
        <Paper sx={{ p: 4, borderRadius: "12px" }}>
          <Typography variant="h4" gutterBottom sx={{ color: "#106EBE", fontWeight: "bold" }}>
            {workspace?.name}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            {workspace?.description || "No description provided"}
          </Typography>

          {/* Current Tasks Section */}
          <Typography variant="h6" sx={{ mb: 2, display: "flex", alignItems: "center" }}>
            <Assignment sx={{ mr: 1 }} />
            My Tasks ({currentTasks.length})
          </Typography>

          {currentTasks.length === 0 ? (
            <Alert severity="info" sx={{ mb: 4 }}>
              No tasks assigned yet!
            </Alert>
          ) : (
            <List sx={{ mb: 4 }}>
              {currentTasks.map((task) => (
                <ListItem
                  key={task.id}
                  sx={{
                    border: "1px solid #e0e0e0",
                    borderRadius: "8px",
                    mb: 2,
                    backgroundColor: "white",
                    "&:hover": { backgroundColor: "#f9f9f9" },
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {task.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Assigned by: {task.assigned_by_user?.full_name || task.assigned_by_user?.email}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Created: {new Date(task.created_at).toLocaleDateString()}
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <Chip
                            icon={getStatusIcon(task.status)}
                            label={getStatusText(task.status)}
                            color={getStatusColor(task.status)}
                            size="medium"
                          />
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => handleStatusChange(task)}
                            disabled={task.status === "completed" || updating === task.id}
                            sx={{
                              bgcolor: task.status === "completed" ? "#28a745" : "#106EBE",
                              "&:hover": {
                                bgcolor: task.status === "completed" ? "#218838" : "#0A4E82"
                              }
                            }}
                          >
                            {updating === task.id ? (
                              <CircularProgress size={16} color="inherit" />
                            ) : (
                              getButtonText(task.status)
                            )}
                          </Button>
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}

          {/* Completed Tasks Section */}
          {completedTasks.length > 0 && (
            <>
              <Divider sx={{ my: 4 }} />
              <Typography variant="h6" sx={{ mb: 2, display: "flex", alignItems: "center" }}>
                <CheckCircle sx={{ mr: 1, color: "#28a745" }} />
                Previous Tasks ({completedTasks.length})
              </Typography>

              <List>
                {completedTasks.map((task) => (
                  <ListItem
                    key={task.id}
                    sx={{
                      border: "1px solid #e0e0e0",
                      borderRadius: "8px",
                      mb: 1,
                      backgroundColor: "#f8f9fa",
                      opacity: 0.8,
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" sx={{ textDecoration: "line-through" }}>
                              {task.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Completed: {new Date(task.completed_at || task.updated_at).toLocaleDateString()}
                            </Typography>
                          </Box>
                          <Chip
                            icon={<CheckCircle />}
                            label="Completed"
                            color="success"
                            size="small"
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </Paper>
      </Box>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, task: null, newStatus: null })}
      >
        <DialogTitle>Confirm Status Change</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to change the status of "{confirmDialog.task?.title}" to{" "}
            <strong>{getStatusText(confirmDialog.newStatus)}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmDialog({ open: false, task: null, newStatus: null })}
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            onClick={confirmStatusChange}
            variant="contained"
            sx={{ bgcolor: "#106EBE", "&:hover": { bgcolor: "#0A4E82" } }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
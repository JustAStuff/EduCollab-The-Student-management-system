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
  Input,
} from "@mui/material";
import {
  Assignment,
  CheckCircle,
  Schedule,
  PlayArrow,
  RadioButtonUnchecked,
  CloudUpload,
  AttachFile,
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
  const [uploadDialog, setUploadDialog] = useState({ open: false, task: null });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

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
        return "submitted"; // Changed to submitted instead of completed
      case "needs_revision":
        return "submitted";
      case "submitted":
        return "submitted"; // Stay submitted
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
      case "submitted":
        return "info";
      case "needs_revision":
        return "error";
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
    if (task.status === "completed" || task.status === "submitted") {
      return; // Can't change from completed or submitted
    }

    const newStatus = getNextStatus(task.status);
    
    if (newStatus === "submitted") {
      // Open upload dialog for submission
      setUploadDialog({ open: true, task: task });
    } else {
      setConfirmDialog({
        open: true,
        task: task,
        newStatus: newStatus
      });
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !uploadDialog.task) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const task = uploadDialog.task;
      
      // Create file path: userId/taskId/filename
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${task.id}/${Date.now()}.${fileExt}`;
      
      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('task-submissions')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Update task status and file info
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          status: 'submitted',
          submission_file_url: uploadData.path,
          submission_file_name: selectedFile.name,
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id);

      if (updateError) throw updateError;

      alert('Task submitted successfully!');
      setUploadDialog({ open: false, task: null });
      setSelectedFile(null);
      fetchWorkspaceData();

    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to submit task. Please try again.');
    } finally {
      setUploading(false);
    }
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
      case "submitted":
        return "Submitted";
      case "needs_revision":
        return "Needs Revision";
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
        return "Upload Result";
      case "needs_revision":
        return "Re-submit";
      case "submitted":
        return "Submitted";
      case "completed":
        return "Completed";
      default:
        return "Update";
    }
  };

  const currentTasks = tasks.filter(task => !["completed", "submitted"].includes(task.status));
  const submittedTasks = tasks.filter(task => task.status === "submitted");
  const completedTasks = tasks.filter(task => task.status === "completed");

  if (loading) {
    return (
      <Box sx={{ display: "flex", height: "100vh", backgroundColor: "#F9FAFB", width:"100vw" }}>
        <Sidebar />
        <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "center", alignItems: "center", width:"100vw" }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: "flex", height: "100vh", backgroundColor: "#F9FAFB", width:"100vw"  }}>
        <Sidebar />
        <Box sx={{ flexGrow: 1, p: 4 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "#F9FAFB", width:"100vw" }}>
      <Sidebar />
      
      <Box component="main" sx={{ p: 4, flexGrow:1}}>
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
                            disabled={["completed", "submitted"].includes(task.status) || updating === task.id}
                            startIcon={task.status === "in_progress" || task.status === "needs_revision" ? <CloudUpload /> : null}
                            sx={{
                              bgcolor: 
                                task.status === "completed" ? "#28a745" : 
                                task.status === "submitted" ? "#17a2b8" :
                                task.status === "needs_revision" ? "#dc3545" : "#106EBE",
                              "&:hover": {
                                bgcolor: 
                                  task.status === "completed" ? "#218838" : 
                                  task.status === "submitted" ? "#138496" :
                                  task.status === "needs_revision" ? "#c82333" : "#0A4E82"
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

          {/* Submitted Tasks Section */}
          {submittedTasks.length > 0 && (
            <>
              <Divider sx={{ my: 4 }} />
              <Typography variant="h6" sx={{ mb: 2, display: "flex", alignItems: "center" }}>
                <CloudUpload sx={{ mr: 1, color: "#17a2b8" }} />
                Submitted Tasks ({submittedTasks.length})
              </Typography>

              <List>
                {submittedTasks.map((task) => (
                  <ListItem
                    key={task.id}
                    sx={{
                      border: "1px solid #e0e0e0",
                      borderRadius: "8px",
                      mb: 1,
                      backgroundColor: "#e7f3ff",
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1">
                              {task.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Submitted: {new Date(task.submitted_at).toLocaleDateString()}
                            </Typography>
                            {task.submission_file_name && (
                              <Typography variant="caption" sx={{ display: "flex", alignItems: "center" }}>
                                <AttachFile sx={{ fontSize: 16, mr: 0.5 }} />
                                {task.submission_file_name}
                              </Typography>
                            )}
                          </Box>
                          <Chip
                            icon={<CloudUpload />}
                            label="Under Review"
                            color="info"
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

          {/* Completed Tasks Section */}
          {completedTasks.length > 0 && (
            <>
              <Divider sx={{ my: 4 }} />
              <Typography variant="h6" sx={{ mb: 2, display: "flex", alignItems: "center" }}>
                <CheckCircle sx={{ mr: 1, color: "#28a745" }} />
                Completed Tasks ({completedTasks.length})
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

      {/* File Upload Dialog */}
      <Dialog
        open={uploadDialog.open}
        onClose={() => setUploadDialog({ open: false, task: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Submit Task Result</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Upload your work result for: <strong>{uploadDialog.task?.title}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Accepted formats: JPG, PNG, PDF (Max 10MB)
          </Typography>
          
          <Input
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={(e) => setSelectedFile(e.target.files[0])}
            sx={{ width: "100%" }}
          />
          
          {selectedFile && (
            <Box sx={{ mt: 2, p: 2, bgcolor: "#f5f5f5", borderRadius: 1 }}>
              <Typography variant="body2">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setUploadDialog({ open: false, task: null });
              setSelectedFile(null);
            }}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleFileUpload}
            variant="contained"
            disabled={!selectedFile || uploading}
            sx={{ bgcolor: "#106EBE", "&:hover": { bgcolor: "#0A4E82" } }}
          >
            {uploading ? <CircularProgress size={20} color="inherit" /> : "Submit Task"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
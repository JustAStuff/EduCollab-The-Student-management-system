// src/WorkspaceTL.jsx - Workspace Team Leader (Owner) View
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
  TextField,
  IconButton,
  Collapse,
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
  Add,
  Remove,
  ExpandLess,
  ExpandMore,
  Assignment,
  CheckCircle,
  Schedule,
  PersonAdd,
  Visibility,
  ThumbUp,
  ThumbDown,
  PictureAsPdf,
  Description,
  Image,
  AttachFile,
} from "@mui/icons-material";
import { getFileIcon, formatFileSize } from "./utils/fileUtils";

// Helper function to get icon component
const getFileIconComponent = (filename) => {
  const iconName = getFileIcon(filename);
  switch (iconName) {
    case 'PictureAsPdf':
      return <PictureAsPdf sx={{ fontSize: 16, mr: 0.5, color: '#d32f2f' }} />;
    case 'Description':
      return <Description sx={{ fontSize: 16, mr: 0.5, color: '#1976d2' }} />;
    case 'Image':
      return <Image sx={{ fontSize: 16, mr: 0.5, color: '#388e3c' }} />;
    default:
      return <AttachFile sx={{ fontSize: 16, mr: 0.5 }} />;
  }
};
import Sidebar from "./Sidebar";
import AddMembers from "./AddMembers";

export default function WorkspaceTL() {
  const { id } = useParams();
  const [workspace, setWorkspace] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedMember, setExpandedMember] = useState(null);
  const [assigningTasks, setAssigningTasks] = useState(null);
  const [newTasks, setNewTasks] = useState([""]);
  const [submitting, setSubmitting] = useState(false);
  const [addMembersOpen, setAddMembersOpen] = useState(false);
  const [reviewingTask, setReviewingTask] = useState(null);
  const [reviewComments, setReviewComments] = useState("");
  const [downloadingFile, setDownloadingFile] = useState(null);

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

      // Check if user is the owner
      if (workspaceData.created_by !== user.id) {
        setError("You don't have permission to access this workspace as a team leader");
        return;
      }

      setWorkspace(workspaceData);

      // Fetch workspace members with user details
      const { data: membersData, error: membersError } = await supabase
        .from("workspace_members")
        .select("*")
        .eq("workspace_id", id);

      if (membersError) throw membersError;

      // Fetch user details for each member
      const membersWithUsers = [];
      if (membersData && membersData.length > 0) {
        for (const member of membersData) {
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("id, email, full_name")
            .eq("id", member.user_id)
            .single();

          if (!userError && userData) {
            membersWithUsers.push({
              ...member,
              users: userData
            });
          } else {
            // If user not found in users table, show placeholder
            membersWithUsers.push({
              ...member,
              users: {
                id: member.user_id,
                email: "Unknown User",
                full_name: "Team Member"
              }
            });
          }
        }
      }

      setMembers(membersWithUsers || []);

      // Fetch all tasks for this workspace
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .eq("workspace_id", id)
        .order("created_at", { ascending: false });

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);

    } catch (err) {
      console.error("Error fetching workspace data:", err);
      setError("Failed to load workspace data");
    } finally {
      setLoading(false);
    }
  };

  const handleMemberClick = (memberId) => {
    setExpandedMember(expandedMember === memberId ? null : memberId);
  };

  const handleAssignTasks = (memberId) => {
    setAssigningTasks(memberId);
    setNewTasks([""]);
  };

  const addTaskField = () => {
    setNewTasks([...newTasks, ""]);
  };

  const removeTaskField = (index) => {
    if (newTasks.length > 1) {
      const updated = newTasks.filter((_, i) => i !== index);
      setNewTasks(updated);
    }
  };

  const handleTaskChange = (index, value) => {
    const updated = [...newTasks];
    updated[index] = value;
    setNewTasks(updated);
  };

  const confirmAssignTasks = async () => {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const validTasks = newTasks.filter(task => task.trim() !== "");

      if (validTasks.length === 0) {
        alert("Please enter at least one task");
        return;
      }

      const tasksToInsert = validTasks.map(task => ({
        workspace_id: id,
        assigned_to: assigningTasks,
        assigned_by: user.id,
        title: task.trim(),
        status: "todo"
      }));

      const { error } = await supabase
        .from("tasks")
        .insert(tasksToInsert);

      if (error) throw error;

      alert(`${validTasks.length} tasks assigned successfully!`);
      setAssigningTasks(null);
      setNewTasks([""]);
      fetchWorkspaceData(); // Refresh data

    } catch (err) {
      console.error("Error assigning tasks:", err);
      alert("Failed to assign tasks. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const getMemberTasks = (memberId) => {
    return tasks.filter(task => task.assigned_to === memberId);
  };

  const getTaskStats = (memberId) => {
    const memberTasks = getMemberTasks(memberId);
    return {
      total: memberTasks.length,
      todo: memberTasks.filter(t => t.status === "todo").length,
      inProgress: memberTasks.filter(t => t.status === "in_progress").length,
      submitted: memberTasks.filter(t => t.status === "submitted").length,
      needsRevision: memberTasks.filter(t => t.status === "needs_revision").length,
      completed: memberTasks.filter(t => t.status === "completed").length,
    };
  };

  const handleTaskReview = async (taskId, action, comments = "") => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const newStatus = action === "approve" ? "completed" : "needs_revision";
      
      const updateData = {
        status: newStatus,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
        review_comments: comments || null,
      };

      if (newStatus === "completed") {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("tasks")
        .update(updateData)
        .eq("id", taskId);

      if (error) throw error;

      alert(`Task ${action === "approve" ? "approved" : "sent back for revision"}!`);
      setReviewingTask(null);
      setReviewComments("");
      fetchWorkspaceData();
    } catch (error) {
      console.error("Error reviewing task:", error);
      alert("Failed to review task. Please try again.");
    }
  };

  const downloadFile = async (fileUrl, fileName, taskId) => {
    setDownloadingFile(taskId);
    try {
      console.log('Download attempt:', {
        fileUrl,
        fileName,
        taskId
      });

      // First, let's check if the file exists by listing files
      const { data: listData, error: listError } = await supabase.storage
        .from("task-submissions")
        .list('', { limit: 100, search: fileName });

      console.log('File list check:', { listData, listError });

      // Try direct download first
      const { data, error } = await supabase.storage
        .from("task-submissions")
        .download(fileUrl);

      if (error) {
        console.error("Download error details:", error);
        alert(`Download failed: ${error.message}\nFile path: ${fileUrl}`);
        return;
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);



    } catch (error) {
      console.error("Error downloading file:", error);
      alert(`Failed to download file: ${error.message}`);
    } finally {
      setDownloadingFile(null);
    }
  };

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
      <Box sx={{ display: "flex", height: "100vh", backgroundColor: "#F9FAFB", width:"77vw" }}>
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
      
      <Box component="main" sx={{ flexGrow: 1, p: 4, width:"10vw"}}>
        <Paper sx={{ p: 4, borderRadius: "12px" }}>
          <Typography variant="h4" gutterBottom sx={{ color: "#106EBE", fontWeight: "bold" }}>
            {workspace?.name}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            {workspace?.description || "No description provided"}
          </Typography>

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6" sx={{ display: "flex", alignItems: "center" }}>
              <Assignment sx={{ mr: 1 }} />
              Team Members ({members.length})
            </Typography>
            <Button
              variant="contained"
              startIcon={<PersonAdd />}
              onClick={() => setAddMembersOpen(true)}
              sx={{ bgcolor: "#28a745", "&:hover": { bgcolor: "#218838" } }}
            >
              Add Members
            </Button>
          </Box>

          {members.length === 0 ? (
            <Alert severity="info">No members have joined this workspace yet.</Alert>
          ) : (
            <List>
              {members.map((member) => {
                const stats = getTaskStats(member.user_id);
                const isExpanded = expandedMember === member.user_id;
                const isAssigning = assigningTasks === member.user_id;

                return (
                  <Box key={member.id}>
                    <ListItem
                      sx={{
                        border: "1px solid #e0e0e0",
                        borderRadius: "8px",
                        mb: 1,
                        backgroundColor: isExpanded ? "#f5f5f5" : "white",
                        "&:hover": { backgroundColor: "#f9f9f9" },
                      }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <Box
                              sx={{ cursor: "pointer", flex: 1 }}
                              onClick={() => handleMemberClick(member.user_id)}
                            >
                              <Typography variant="subtitle1" fontWeight="bold">
                                {member.users?.full_name || member.users?.email}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {member.users?.email}
                              </Typography>
                            </Box>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Chip
                                size="small"
                                icon={<CheckCircle />}
                                label={`${stats.completed}/${stats.total}`}
                                color={stats.completed === stats.total && stats.total > 0 ? "success" : "default"}
                              />
                              <Button
                                variant="contained"
                                size="small"
                                onClick={() => handleAssignTasks(member.user_id)}
                                disabled={isAssigning}
                                sx={{ bgcolor: "#106EBE", "&:hover": { bgcolor: "#0A4E82" } }}
                              >
                                Assign Tasks
                              </Button>
                              <IconButton onClick={() => handleMemberClick(member.user_id)}>
                                {isExpanded ? <ExpandLess /> : <ExpandMore />}
                              </IconButton>
                            </Box>
                          </Box>
                        }
                      />
                    </ListItem>

                    {/* Task Assignment Form */}
                    {isAssigning && (
                      <Paper sx={{ p: 3, mb: 2, backgroundColor: "#f8f9fa", border: "1px solid #dee2e6" }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                          Assign Tasks to {member.users?.full_name || member.users?.email}
                        </Typography>
                        
                        {newTasks.map((task, index) => (
                          <Box key={index} sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                            <TextField
                              fullWidth
                              label={`Task ${index + 1}`}
                              value={task}
                              onChange={(e) => handleTaskChange(index, e.target.value)}
                              placeholder="Enter task description"
                            />
                            <IconButton onClick={addTaskField} sx={{ ml: 1, color: "#106EBE" }}>
                              <Add />
                            </IconButton>
                            {newTasks.length > 1 && (
                              <IconButton onClick={() => removeTaskField(index)} sx={{ ml: 1, color: "#f44336" }}>
                                <Remove />
                              </IconButton>
                            )}
                          </Box>
                        ))}

                        <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
                          <Button
                            variant="contained"
                            onClick={confirmAssignTasks}
                            disabled={submitting}
                            sx={{ bgcolor: "#28a745", "&:hover": { bgcolor: "#218838" } }}
                          >
                            {submitting ? <CircularProgress size={20} /> : "Confirm Assignment"}
                          </Button>
                          <Button
                            variant="outlined"
                            onClick={() => setAssigningTasks(null)}
                            disabled={submitting}
                          >
                            Cancel
                          </Button>
                        </Box>
                      </Paper>
                    )}

                    {/* Member Details */}
                    <Collapse in={isExpanded}>
                      <Paper sx={{ p: 3, mb: 2, ml: 2, backgroundColor: "#fafafa" }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                          Task Overview
                        </Typography>
                        
                        <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
                          <Chip icon={<Schedule />} label={`Todo: ${stats.todo}`} color="default" />
                          <Chip icon={<Schedule />} label={`In Progress: ${stats.inProgress}`} color="warning" />
                          <Chip icon={<CheckCircle />} label={`Completed: ${stats.completed}`} color="success" />
                        </Box>

                        {getMemberTasks(member.user_id).length === 0 ? (
                          <Typography color="text.secondary">No tasks assigned yet</Typography>
                        ) : (
                          <List dense>
                            {getMemberTasks(member.user_id).map((task) => (
                              <ListItem key={task.id} sx={{ pl: 0, flexDirection: "column", alignItems: "stretch" }}>
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                                  <ListItemText
                                    primary={task.title}
                                    secondary={`Status: ${task.status.replace("_", " ")} • Created: ${new Date(task.created_at).toLocaleDateString()}`}
                                  />
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                    <Chip
                                      size="small"
                                      label={task.status.replace("_", " ")}
                                      color={
                                        task.status === "completed" ? "success" :
                                        task.status === "submitted" ? "info" :
                                        task.status === "needs_revision" ? "error" :
                                        task.status === "in_progress" ? "warning" : "default"
                                      }
                                    />
                                    {task.status === "submitted" && task.submission_file_url && (
                                      <Box sx={{ display: "flex", gap: 1 }}>
                                        <Button
                                          size="small"
                                          startIcon={downloadingFile === task.id ? <CircularProgress size={16} /> : <Visibility />}
                                          onClick={() => downloadFile(task.submission_file_url, task.submission_file_name, task.id)}
                                          disabled={downloadingFile === task.id}
                                        >
                                          {downloadingFile === task.id ? "Loading..." : "View"}
                                        </Button>
                                        <Button
                                          size="small"
                                          startIcon={<ThumbUp />}
                                          color="success"
                                          onClick={() => handleTaskReview(task.id, "approve")}
                                        >
                                          Approve
                                        </Button>
                                        <Button
                                          size="small"
                                          startIcon={<ThumbDown />}
                                          color="error"
                                          onClick={() => setReviewingTask(task.id)}
                                        >
                                          Revise
                                        </Button>
                                      </Box>
                                    )}
                                  </Box>
                                </Box>
                                {task.review_comments && (
                                  <Box sx={{ mt: 1, p: 1, bgcolor: "#f5f5f5", borderRadius: 1 }}>
                                    <Typography variant="caption" color="text.secondary">
                                      Review Comments: {task.review_comments}
                                    </Typography>
                                  </Box>
                                )}
                              </ListItem>
                            ))}
                          </List>
                        )}

                        {/* Review Dialog */}
                        <Dialog
                          open={reviewingTask !== null}
                          onClose={() => setReviewingTask(null)}
                          maxWidth="sm"
                          fullWidth
                        >
                          <DialogTitle>Request Revision</DialogTitle>
                          <DialogContent>
                            <TextField
                              fullWidth
                              multiline
                              rows={4}
                              label="Comments for revision"
                              value={reviewComments}
                              onChange={(e) => setReviewComments(e.target.value)}
                              placeholder="Explain what needs to be changed or improved..."
                              sx={{ mt: 1 }}
                            />
                          </DialogContent>
                          <DialogActions>
                            <Button onClick={() => setReviewingTask(null)}>Cancel</Button>
                            <Button
                              variant="contained"
                              color="error"
                              onClick={() => handleTaskReview(reviewingTask, "revise", reviewComments)}
                            >
                              Send for Revision
                            </Button>
                          </DialogActions>
                        </Dialog>
                      </Paper>
                    </Collapse>
                  </Box>
                );
              })}
            </List>
          )}
        </Paper>

        {/* Add Members Dialog */}
        <AddMembers
          workspaceId={id}
          workspaceName={workspace?.name}
          open={addMembersOpen}
          onClose={() => setAddMembersOpen(false)}
          onSuccess={fetchWorkspaceData}
        />
      </Box>
    </Box>
  );
}
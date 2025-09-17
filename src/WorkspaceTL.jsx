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
} from "@mui/material";
import {
  Add,
  Remove,
  ExpandLess,
  ExpandMore,
  Assignment,
  CheckCircle,
  Schedule,
} from "@mui/icons-material";
import Sidebar from "./Sidebar";

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
      completed: memberTasks.filter(t => t.status === "completed").length,
    };
  };

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

          <Typography variant="h6" sx={{ mb: 2, display: "flex", alignItems: "center" }}>
            <Assignment sx={{ mr: 1 }} />
            Team Members ({members.length})
          </Typography>

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
                              <ListItem key={task.id} sx={{ pl: 0 }}>
                                <ListItemText
                                  primary={task.title}
                                  secondary={`Status: ${task.status} • Created: ${new Date(task.created_at).toLocaleDateString()}`}
                                />
                                <Chip
                                  size="small"
                                  label={task.status.replace("_", " ")}
                                  color={
                                    task.status === "completed" ? "success" :
                                    task.status === "in_progress" ? "warning" : "default"
                                  }
                                />
                              </ListItem>
                            ))}
                          </List>
                        )}
                      </Paper>
                    </Collapse>
                  </Box>
                );
              })}
            </List>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
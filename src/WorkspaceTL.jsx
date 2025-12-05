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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  PersonAdd,
  Visibility,
  ThumbUp,
  ThumbDown,
  Person,
} from "@mui/icons-material";
import Sidebar from "./Sidebar";
import LayoutContainer from "./components/layout/LayoutContainer";
import AddMembers from "./AddMembers";
import TaskCard from "./components/tasks/TaskCard";
import FileUpload from "./components/tasks/FileUpload";
import ReviewDialog from "./components/tasks/ReviewDialog";
import RevocationDialog from "./components/tasks/RevocationDialog";
import { generateFilePath } from "./utils/fileUtils";
import { revokeTaskAssignment } from "./services/TaskService";
import useRealTimeUpdates from "./hooks/useRealTimeUpdates";
import NotificationBadge from "./components/notifications/NotificationBadge";
import workspaceMemberCache from "./services/WorkspaceMemberCache";
import useOptimisticUpdate from "./hooks/useOptimisticUpdate";
import usePagination from "./hooks/usePagination";
import PaginationControls from "./components/common/PaginationControls";
import useDebounce from "./hooks/useDebounce";

export default function WorkspaceTL() {
  const { id } = useParams();
  const [workspace, setWorkspace] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [tlTasks, setTlTasks] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedMember, setExpandedMember] = useState(null);
  const [assigningTasks, setAssigningTasks] = useState(null);
  const [newTasks, setNewTasks] = useState([""]);
  const [submitting, setSubmitting] = useState(false);
  const [addMembersOpen, setAddMembersOpen] = useState(false);
  // Review functionality removed - TLs review tasks in WorkspaceTM, not here
  const [downloadingFile, setDownloadingFile] = useState(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedTaskForUpload, setSelectedTaskForUpload] = useState(null);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [revocationDialogOpen, setRevocationDialogOpen] = useState(false);
  const [taskToRevoke, setTaskToRevoke] = useState(null);
  const [memberToRevoke, setMemberToRevoke] = useState(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [membersPerPage, setMembersPerPage] = useState(5);

  // Optimistic updates for tasks
  const {
    data: optimisticTasks,
    performOptimisticUpdate: updateTasksOptimistically
  } = useOptimisticUpdate(tasks);

  // Debounce members for performance
  const debouncedMembers = useDebounce(members, 300);



  // Pagination for members list
  const {
    currentPage: membersPage,
    totalPages: membersTotalPages,
    paginatedData: paginatedMembers,
    goToPage: goToMembersPage
  } = usePagination(debouncedMembers, membersPerPage);

  const fetchWorkspaceData = async () => {
    try {
      // Test connection and get user
      let user;
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          setError("Please log in to access this workspace");
          return;
        }
        user = authUser;
        setCurrentUser(user);
      } catch (authError) {
        if (authError.message?.includes('Failed to fetch') || authError.message?.includes('ERR_')) {
          setError("Network connection error. Please check your internet connection and try again.");
          return;
        }
        throw authError;
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

      // Use cached workspace members for better performance
      const membersWithUsers = await workspaceMemberCache.getWorkspaceMembers(id);
      setMembers(membersWithUsers || []);

      // Fetch all tasks for this workspace
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .eq("workspace_id", id)
        .order("created_at", { ascending: false });

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);

      // Fetch TL's own tasks (tasks assigned to the TL)
      const { data: tlTasksData, error: tlTasksError } = await supabase
        .from("tasks")
        .select("*")
        .eq("workspace_id", id)
        .eq("assigned_to", user.id)
        .order("created_at", { ascending: false });

      if (tlTasksError) throw tlTasksError;
      setTlTasks(tlTasksData || []);

    } catch (err) {
      console.error("Error fetching workspace data:", err);
      setError("Failed to load workspace data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaceData();
  }, [id]);

  // Set up real-time updates
  useRealTimeUpdates(id, {
    onRefreshData: fetchWorkspaceData,
    enableToasts: true
  });

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

  const [reviewingTask, setReviewingTask] = useState(null);
  const [reviewComments, setReviewComments] = useState("");

  const handleTaskReview = async (taskId, action, comments = "") => {
    try {
      const { submitReview } = await import('./services/TaskService');
      await submitReview(taskId, action, comments);
      
      alert(`Task ${action === "approve" ? "approved" : "sent back for revision"}!`);
      setReviewingTask(null);
      setReviewComments("");
      fetchWorkspaceData();
    } catch (error) {
      console.error("Error reviewing task:", error);
      alert(`Failed to ${action} task: ${error.message}`);
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

  // TL Task Management Functions
  const handleTLTaskStatusChange = async (taskId, newStatus) => {
    setUpdatingTaskId(taskId);
    
    try {
      // Get CSRF token
      const csrfToken = sessionStorage.getItem('csrf_token') || 'dev-token';
      
      // Optimistic update
      const optimisticTasks = tlTasks.map(task => 
        task.id === taskId 
          ? { 
              ...task, 
              status: newStatus,
              started_at: newStatus === 'in_progress' ? new Date().toISOString() : task.started_at,
              completed_at: newStatus === 'completed' ? new Date().toISOString() : task.completed_at,
              updated_at: new Date().toISOString()
            }
          : task
      );

      await updateTasksOptimistically(
        optimisticTasks,
        async () => {
          // Use the enhanced changeTaskStatus function for workspace owners
          const { changeTaskStatus } = await import('./services/TaskService');
          await changeTaskStatus(taskId, newStatus, csrfToken);

          // Return updated tasks
          await fetchWorkspaceData();
          return tlTasks;
        },
        tlTasks // Rollback data
      );
    } catch (error) {
      console.error("Error updating task status:", error);
      // Provide more specific error messages for workspace owners
      const errorMessage = error.message || "Failed to update task status. Please try again.";
      alert(`Task Status Update Failed: ${errorMessage}`);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleTLTaskUpload = (task) => {
    setSelectedTaskForUpload(task);
    setUploadDialogOpen(true);
  };

  const handleFileUpload = async (file) => {
    if (!selectedTaskForUpload || !currentUser) {
      return;
    }

    try {
      // Generate file path
      const filePath = generateFilePath(
        id,
        selectedTaskForUpload.id,
        currentUser.id,
        file.name
      );



      // Upload file to storage with retry logic
      let uploadData, uploadError;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          const result = await supabase.storage
            .from("task-submissions")
            .upload(filePath, file);
          
          uploadData = result.data;
          uploadError = result.error;
          
          if (!uploadError) break; // Success, exit retry loop
          retryCount++;
          
          if (retryCount < maxRetries) {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
          }
        } catch (networkError) {
          retryCount++;
          
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
          } else {
            throw new Error(`Network connection failed after ${maxRetries} attempts. Please check your internet connection and try again.`);
          }
        }
      }

      if (uploadError) {
        throw new Error(`File upload failed: ${uploadError.message}`);
      }



      // Update task with submission info
      const { error: updateError } = await supabase
        .from("tasks")
        .update({
          status: "submitted",
          submission_file_url: uploadData.path,
          submission_file_name: file.name,
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedTaskForUpload.id);

      if (updateError) {
        throw new Error(`Failed to update task: ${updateError.message}`);
      }
      alert("File uploaded successfully!");
      setUploadDialogOpen(false);
      setSelectedTaskForUpload(null);
      fetchWorkspaceData();
    } catch (error) {
      console.error("Error uploading file:", error);
      // Provide more specific error messages for workspace owners
      const errorMessage = error.message || "Failed to upload file. Please try again.";
      alert(`File Upload Failed: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  };

  // Note: handleTLTaskReview removed - workspace owners don't review their own tasks

  const handleViewSubmission = async (task) => {
    if (!task.submission_file_url) return;
    await downloadFile(task.submission_file_url, task.submission_file_name, task.id);
  };

  const handleDownloadSubmission = async (task) => {
    if (!task.submission_file_url) return;
    await downloadFile(task.submission_file_url, task.submission_file_name, task.id);
  };

  // Task Revocation Handlers
  const handleRevokeClick = (task, member) => {
    setTaskToRevoke(task);
    setMemberToRevoke(member);
    setRevocationDialogOpen(true);
  };

  const handleRevokeConfirm = async () => {
    if (!taskToRevoke) return;

    setIsRevoking(true);
    try {
      await revokeTaskAssignment(taskToRevoke.id);
      alert('Task assignment revoked successfully!');
      setRevocationDialogOpen(false);
      setTaskToRevoke(null);
      setMemberToRevoke(null);
      fetchWorkspaceData();
    } catch (error) {
      console.error('Error revoking task:', error);
      alert(error.message || 'Failed to revoke task assignment. Please try again.');
    } finally {
      setIsRevoking(false);
    }
  };

  const handleRevokeCancel = () => {
    setRevocationDialogOpen(false);
    setTaskToRevoke(null);
    setMemberToRevoke(null);
  };

  if (loading) {
    return (
      <Box className="layout-container">
        <Sidebar />
        <LayoutContainer maxWidth="xl" padding="default" className="layout-flex-center">
          <CircularProgress />
        </LayoutContainer>
      </Box>
    );
  }

  if (error) {
    return (
      <Box className="layout-container">
        <Sidebar />
        <LayoutContainer maxWidth="xl" padding="default">
          <Alert severity="error">{error}</Alert>
        </LayoutContainer>
      </Box>
    );
  }

  return (
    <Box className="layout-container">
      <Sidebar />
      
      <LayoutContainer maxWidth="xl" padding="default">
        <Paper className="layout-content-wrapper">
          <Typography variant="h4" gutterBottom sx={{ color: "#106EBE", fontWeight: "bold" }}>
            {workspace?.name}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            {workspace?.description || "No description provided"}
          </Typography>

          {/* My Tasks Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Person sx={{ mr: 1 }} />
              My Tasks ({tlTasks.length})
            </Typography>
            

            
            {tlTasks.length === 0 ? (
              <Alert severity="info">You don't have any tasks assigned to you yet.</Alert>
            ) : (
              <Box>
                {tlTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    userRole="tl"
                    workspaceRole="owner"
                    currentUserId={currentUser?.id}
                    onStatusChange={handleTLTaskStatusChange}
                    onUpload={handleTLTaskUpload}
                    onViewSubmission={handleViewSubmission}
                    onDownloadSubmission={handleDownloadSubmission}
                    isUpdating={updatingTaskId === task.id}
                  />
                ))}
              </Box>
            )}
          </Box>

          <Divider sx={{ my: 4 }} />

          {/* Team Members Section */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6" sx={{ display: "flex", alignItems: "center" }}>
              <Assignment sx={{ mr: 1 }} />
              Team Members ({members.length})
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <NotificationBadge
                workspaceId={id}
                userId={currentUser?.id}
                onClick={(count) => {
                  if (count > 0) {
                    alert(`You have ${count} task${count > 1 ? 's' : ''} pending review`);
                  }
                }}
              />
              <Button
                variant="contained"
                startIcon={<PersonAdd />}
                onClick={() => setAddMembersOpen(true)}
                sx={{ bgcolor: "#28a745", "&:hover": { bgcolor: "#218838" } }}
              >
                Add Members
              </Button>
            </Box>
          </Box>

          {members.length === 0 ? (
            <Alert severity="info">No members have joined this workspace yet.</Alert>
          ) : (
            <>
              <List>
                {paginatedMembers.map((member) => {
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
                          <Box>
                            {getMemberTasks(member.user_id).map((task) => (
                              <TaskCard
                                key={task.id}
                                task={task}
                                userRole="tl"
                                workspaceRole="owner"
                                currentUserId={currentUser?.id}
                                onReview={(taskId) => setReviewingTask(taskId)}
                                onViewSubmission={handleViewSubmission}
                                onDownloadSubmission={handleDownloadSubmission}
                                onRevoke={() => handleRevokeClick(task, member.users)}
                                showRevokeButton={true}
                              />
                            ))}
                          </Box>
                        )}
                      </Paper>
                    </Collapse>
                  </Box>
                );
                })}
              </List>

              {/* Members Pagination */}
              {membersTotalPages > 1 && (
                <PaginationControls
                  currentPage={membersPage}
                  totalPages={membersTotalPages}
                  totalItems={debouncedMembers.length}
                  itemsPerPage={membersPerPage}
                  onPageChange={goToMembersPage}
                  onItemsPerPageChange={(newItemsPerPage) => {
                    setMembersPerPage(newItemsPerPage);
                    goToMembersPage(1);
                  }}
                  itemsPerPageOptions={[5, 10, 20]}
                  showItemCount={true}
                  size="small"
                />
              )}
            </>
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

        {/* File Upload Dialog for TL Tasks */}
        <Dialog
          open={uploadDialogOpen}
          onClose={() => {
            setUploadDialogOpen(false);
            setSelectedTaskForUpload(null);
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Upload Task Submission</DialogTitle>
          <DialogContent>
            {selectedTaskForUpload && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Task
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {selectedTaskForUpload.title}
                </Typography>
              </Box>
            )}
            <FileUpload
              onUpload={handleFileUpload}
              acceptedFormats=".jpg,.jpeg,.png,.pdf,.doc,.docx"
              maxSizeMB={10}
            />
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setUploadDialogOpen(false);
                setSelectedTaskForUpload(null);
              }}
            >
              Cancel
            </Button>
          </DialogActions>
        </Dialog>

        {/* Review Dialog for TM Tasks - TL reviews TM submissions here */}
        <ReviewDialog
          open={reviewingTask !== null}
          task={tasks.find(t => t.id === reviewingTask)}
          onClose={() => {
            setReviewingTask(null);
            setReviewComments("");
          }}
          onApprove={(taskId, comments) => handleTaskReview(taskId, 'approve', comments)}
          onRequestRedo={(taskId, comments) => handleTaskReview(taskId, 'request_redo', comments)}
          reviewerName={currentUser?.full_name || currentUser?.email}
        />

        {/* Revocation Dialog */}
        <RevocationDialog
          open={revocationDialogOpen}
          task={taskToRevoke}
          member={memberToRevoke}
          onConfirm={handleRevokeConfirm}
          onCancel={handleRevokeCancel}
          isRevoking={isRevoking}
        />
      </LayoutContainer>
    </Box>
  );
}
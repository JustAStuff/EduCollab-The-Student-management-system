// src/WorkspaceTM.jsx - Workspace Team Member View
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "./supabaseClient";
import {
  Box,
  Typography,
  Paper,
  Button,
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
  CloudUpload,
} from "@mui/icons-material";
import { validateFile, formatFileSize, generateFilePath, getFileIcon } from "./utils/fileUtils";
import taskCategorizationService from "./services/TaskCategorizationService";
import { startTask, uploadTaskFile, deleteSubmission, reuploadSubmission } from "./services/TaskService";
import useRealTimeUpdates from "./hooks/useRealTimeUpdates";
import NotificationBadge from "./components/notifications/NotificationBadge";
import useDebounce from "./hooks/useDebounce";
import useOptimisticUpdate from "./hooks/useOptimisticUpdate";


import Sidebar from "./Sidebar";
import LayoutContainer from "./components/layout/LayoutContainer";
import TaskCard from "./components/tasks/TaskCard";
import FileUpload from "./components/tasks/FileUpload";
import ReviewDialog from "./components/tasks/ReviewDialog";

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
  const [deleteDialog, setDeleteDialog] = useState({ open: false, task: null });
  const [deleting, setDeleting] = useState(false);
  const [reuploadDialog, setReuploadDialog] = useState({ open: false, task: null });
  const [reuploading, setReuploading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [workspaceRole, setWorkspaceRole] = useState(null);
  const [tlTasks, setTlTasks] = useState([]);
  const [reviewDialog, setReviewDialog] = useState({ open: false, task: null, action: null });

  // Debounce file selection to prevent rapid uploads
  const debouncedSelectedFile = useDebounce(selectedFile, 500);

  // Optimistic updates for tasks
  const {
    data: optimisticTasks,
    performOptimisticUpdate: updateTasksOptimistically
  } = useOptimisticUpdate(tasks);

  const fetchWorkspaceData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Please log in to access this workspace");
        return;
      }

      setCurrentUser(user);

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

      // Determine user's workspace role
      if (workspaceData.created_by === user.id) {
        setWorkspaceRole('owner');
      } else if (memberData) {
        setWorkspaceRole('member');
      } else {
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

      // Fetch TL tasks that need review by TM (only if user is TM, not TL)
      let reviewTasksData = [];
      let tlTasksError = null;

      if (workspaceData.created_by !== user.id) {
        // If current user is TM, fetch TL tasks for review
        const { data, error } = await supabase
          .from("tasks")
          .select("*")
          .eq("workspace_id", id)
          .eq("assigned_to", workspaceData.created_by) // Tasks assigned to workspace owner (TL)
          .eq("status", "submitted") // Only submitted tasks that need review
          .order("submitted_at", { ascending: false });
        
        reviewTasksData = data;
        tlTasksError = error;
      }

      if (tlTasksError) {
        console.error("Error fetching review tasks:", tlTasksError);
        setTlTasks([]); // Set empty array on error
      } else {
        // Fetch assigned_by user details for each review task
        const reviewTasksWithUsers = [];
        if (reviewTasksData && reviewTasksData.length > 0) {
          for (const task of reviewTasksData) {
            const { data: assignedByUser, error: userError } = await supabase
              .from("users")
              .select("id, email, full_name")
              .eq("id", task.assigned_by)
              .single();

            // Get task assignee details
            const { data: assigneeUser, error: assigneeError } = await supabase
              .from("users")
              .select("id, email, full_name")
              .eq("id", task.assigned_to)
              .single();

            reviewTasksWithUsers.push({
              ...task,
              assigned_by_user: assignedByUser || {
                id: task.assigned_by,
                email: "Team Leader",
                full_name: "Team Leader"
              },
              assigned_to_user: assigneeUser || {
                id: task.assigned_to,
                email: "Team Member",
                full_name: "Team Member"
              }
            });
          }
        }
        
        setTlTasks(reviewTasksWithUsers || []);
        console.log(`WorkspaceTM: Fetched ${reviewTasksWithUsers?.length || 0} TL tasks for TM review:`, reviewTasksWithUsers);
      }

      // Debug: Log fetched tasks for this workspace
      console.log(`WorkspaceTM: Fetched ${tasksWithUsers.length} tasks for workspace ${id}:`, tasksWithUsers);

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

  const handleTLTaskReview = async (taskId, action, comments = null) => {
    console.log('🔍 handleTLTaskReview called:', { taskId, action, comments });
    
    if (action === 'request_redo') {
      // Open dialog for revision comments
      const task = tlTasks.find(t => t.id === taskId);
      console.log('📝 Opening review dialog for task:', task);
      setReviewDialog({ open: true, task, action });
      return;
    }

    try {
      console.log('✅ Submitting review for task:', taskId, 'action:', action);
      const { submitReview } = await import('./services/TaskService');
      const result = await submitReview(taskId, action, comments);
      console.log('✅ Review submitted successfully:', result);
      
      // Refresh data to show updated task status
      await fetchWorkspaceData();
      
      // Show success message
      const actionText = action === 'approve' ? 'approved' : 'sent back for revision';
      alert(`Task has been ${actionText} successfully!`);
    } catch (error) {
      console.error('❌ Error reviewing TL task:', error);
      alert(`Failed to ${action} task: ${error.message}`);
    }
  };

  const handleReviewSubmit = async (comments) => {
    if (!reviewDialog.task) return;

    try {
      const { submitReview } = await import('./services/TaskService');
      await submitReview(reviewDialog.task.id, reviewDialog.action, comments);
      
      // Close dialog and refresh data
      setReviewDialog({ open: false, task: null, action: null });
      await fetchWorkspaceData();
      
      alert('Task has been sent back for revision successfully!');
    } catch (error) {
      console.error('Error submitting review:', error);
      alert(`Failed to submit review: ${error.message}`);
    }
  };


  const handleStatusChange = (taskId, newStatus) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (task.status === "completed" || task.status === "submitted") {
      return; // Can't change from completed or submitted
    }

    if (newStatus === "submitted" || task.status === "in_progress" || task.status === "needs_revision") {
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

  // Separate handler for upload button clicks
  const handleUploadClick = (task) => {
    setUploadDialog({ open: true, task: task });
  };

  const handleFileUpload = async (file) => {
    if (!file || !uploadDialog.task) return;

    // Validate file before upload
    const validation = validateFile(file);
    if (!validation.isValid) {
      alert(validation.error);
      return;
    }

    setUploading(true);
    const task = uploadDialog.task;

    try {
      // Generate or get CSRF token
      let csrfToken = sessionStorage.getItem('csrf_token');
      if (!csrfToken) {
        // Generate a simple CSRF token if none exists
        csrfToken = 'csrf-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
        sessionStorage.setItem('csrf_token', csrfToken);
      }

      // Optimistic update - immediately show as submitted
      const optimisticTasks = tasks.map(t =>
        t.id === task.id
          ? {
            ...t,
            status: 'submitted',
            submission_file_name: file.name,
            submitted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          : t
      );

      await updateTasksOptimistically(
        optimisticTasks,
        async () => {
          // Use the uploadTaskFile function with proper parameter order
          await uploadTaskFile(task.id, file, id, csrfToken);

          // Refresh data and return updated tasks
          await fetchWorkspaceData();
          return tasks;
        },
        tasks // Rollback data
      );

      alert('Task submitted successfully!');
      setUploadDialog({ open: false, task: null });
      setSelectedFile(null);

    } catch (error) {
      console.error('Error uploading file:', error);
      
      // Provide more specific error messages
      let errorMessage = error.message;
      if (error.message?.includes('permission')) {
        errorMessage = 'You do not have permission to upload files to this task.';
      } else if (error.message?.includes('policy')) {
        errorMessage = 'Upload failed due to storage policy restrictions.';
      } else if (error.message?.includes('size')) {
        errorMessage = 'File is too large. Please select a smaller file.';
      } else if (error.message?.includes('type')) {
        errorMessage = 'File type not supported. Please select a different file.';
      }
      
      alert(`Failed to submit task: ${errorMessage}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteSubmission = async () => {
    if (!deleteDialog.task) return;

    setDeleting(true);
    try {
      const csrfToken = sessionStorage.getItem('csrf_token') || 'temp-token';
      await deleteSubmission(deleteDialog.task.id, csrfToken);
      alert('Submission deleted successfully!');
      setDeleteDialog({ open: false, task: null });
      fetchWorkspaceData();
    } catch (error) {
      console.error('Error deleting submission:', error);
      alert(`Failed to delete submission: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleReuploadSubmission = async () => {
    if (!selectedFile || !reuploadDialog.task) return;

    setReuploading(true);
    try {
      const csrfToken = sessionStorage.getItem('csrf_token') || 'temp-token';
      await reuploadSubmission(reuploadDialog.task.id, selectedFile, id, csrfToken);
      alert('Submission re-uploaded successfully!');
      setReuploadDialog({ open: false, task: null });
      setSelectedFile(null);
      fetchWorkspaceData();
    } catch (error) {
      console.error('Error re-uploading submission:', error);
      alert(`Failed to re-upload submission: ${error.message}`);
    } finally {
      setReuploading(false);
    }
  };

  const confirmStatusChange = async () => {
    const { task, newStatus } = confirmDialog;
    setUpdating(task.id);

    try {
      if (newStatus === 'in_progress') {
        // Use the new startTask function with CSRF token
        const csrfToken = sessionStorage.getItem('csrf_token') || 'temp-token';
        await startTask(task.id, csrfToken);
      } else {
        // Handle other status changes
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
      }

      // Refresh tasks
      fetchWorkspaceData();

    } catch (err) {
      console.error("Error updating task status:", err);
      alert(`Failed to update task status: ${err.message || 'Please try again.'}`);
    } finally {
      setUpdating(null);
      setConfirmDialog({ open: false, task: null, newStatus: null });
    }
  };



  // Use TaskCategorization service for consistent filtering with error handling
  let activeTasks, pendingReviewTasks, completedTasks;

  try {
    activeTasks = taskCategorizationService.safeOperation(
      tasks,
      (t) => taskCategorizationService.getActiveTasks(t),
      'getActiveTasks'
    );

    pendingReviewTasks = taskCategorizationService.safeOperation(
      tasks,
      (t) => taskCategorizationService.getPendingReviewTasks(t),
      'getPendingReviewTasks'
    );

    completedTasks = taskCategorizationService.safeOperation(
      tasks,
      (t) => taskCategorizationService.getCompletedTasks(t),
      'getCompletedTasks'
    );

    // Validate task categorization consistency
    const validation = taskCategorizationService.validateCategorization(tasks);
    if (!validation.isValid) {
      console.warn('WorkspaceTM: Task categorization validation failed:', validation.error);
    }

    // Get task counts for potential dashboard comparison
    const workspaceCounts = taskCategorizationService.safeOperation(
      tasks,
      (t) => taskCategorizationService.getTaskCounts(t),
      'getTaskCounts'
    );

    // Store workspace counts for potential consistency checking
    // This could be used by parent components to validate dashboard-workspace consistency
    if (window.kiroTaskCounts) {
      const dashboardCounts = window.kiroTaskCounts;
      const consistencyCheck = taskCategorizationService.validateDashboardWorkspaceConsistency(
        dashboardCounts,
        workspaceCounts
      );

      if (!consistencyCheck.isConsistent) {
        console.warn('WorkspaceTM: Dashboard-Workspace count inconsistency detected');
      }
    }

  } catch (error) {
    console.error('WorkspaceTM: Error using TaskCategorization service:', error);
    console.warn('WorkspaceTM: Using fallback task filtering');

    // Fallback logic
    activeTasks = tasks.filter(task =>
      task && ['todo', 'in_progress', 'needs_revision'].includes(task.status)
    );
    pendingReviewTasks = tasks.filter(task =>
      task && task.status === 'submitted'
    );
    completedTasks = tasks.filter(task =>
      task && task.status === 'completed'
    );
  }

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
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
            <Box>
              <Typography variant="h4" gutterBottom sx={{ color: "#106EBE", fontWeight: "bold" }}>
                {workspace?.name}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {workspace?.description || "No description provided"}
              </Typography>
            </Box>
            <NotificationBadge
              workspaceId={id}
              userId={tasks[0]?.assigned_to}
              onClick={(count) => {
                if (count > 0) {
                  alert(`There are ${count} task${count > 1 ? 's' : ''} pending review in this workspace`);
                }
              }}
            />
          </Box>

          {/* Active Tasks Section */}
          <Typography variant="h6" sx={{ mb: 2, display: "flex", alignItems: "center" }}>
            <Assignment sx={{ mr: 1 }} />
            Active Tasks ({activeTasks.length})
          </Typography>

          {activeTasks.length === 0 ? (
            <Alert severity="info" sx={{ mb: 4 }}>
              No tasks assigned yet!
            </Alert>
          ) : (
            <Box sx={{ mb: 4 }}>
              {activeTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  userRole="tm"
                  workspaceRole={workspaceRole}
                  currentUserId={currentUser?.id}
                  onStatusChange={handleStatusChange}
                  onUpload={handleUploadClick}
                  isUpdating={updating === task.id}
                />
              ))}
            </Box>
          )}

          {/* Pending Review Tasks Section */}
          {pendingReviewTasks.length > 0 && (
            <>
              <Divider sx={{ my: 4 }} />
              <Typography variant="h6" sx={{ mb: 2, display: "flex", alignItems: "center" }}>
                <CloudUpload sx={{ mr: 1, color: "#17a2b8" }} />
                Pending Review Tasks ({pendingReviewTasks.length})
              </Typography>

              <Box>
                {pendingReviewTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    userRole="tm"
                    workspaceRole={workspaceRole}
                    currentUserId={currentUser?.id}
                    onDeleteSubmission={() => setDeleteDialog({ open: true, task })}
                    onReuploadSubmission={() => setReuploadDialog({ open: true, task })}
                  />
                ))}
              </Box>
            </>
          )}

          {/* Tasks Needing Review Section */}
          {tlTasks.length > 0 && (
            <>
              <Divider sx={{ my: 4 }} />
              <Typography variant="h6" sx={{ mb: 2, display: "flex", alignItems: "center" }}>
                <Assignment sx={{ mr: 1, color: "#ffc107" }} />
                Team Lead Tasks for Review ({tlTasks.length})
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                These are tasks submitted by your Team Lead that need peer review and approval.
              </Alert>

              <Box>
                {tlTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    userRole="tm"
                    workspaceRole={workspaceRole}
                    currentUserId={currentUser?.id}
                    onReview={handleTLTaskReview}
                    onViewSubmission={(task) => {
                      // Handle file viewing
                      if (task.submission_file_url) {
                        window.open(`${supabase.storage.from('task-submissions').getPublicUrl(task.submission_file_url).data.publicUrl}`, '_blank');
                      }
                    }}
                    onDownloadSubmission={(task) => {
                      // Handle file download
                      if (task.submission_file_url) {
                        const link = document.createElement('a');
                        link.href = supabase.storage.from('task-submissions').getPublicUrl(task.submission_file_url).data.publicUrl;
                        link.download = task.submission_file_name || 'download';
                        link.click();
                      }
                    }}
                  />
                ))}
              </Box>
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

              <Box>
                {completedTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    userRole="tm"
                    workspaceRole={workspaceRole}
                    currentUserId={currentUser?.id}
                  />
                ))}
              </Box>
            </>
          )}
        </Paper>
      </LayoutContainer>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, task: null, newStatus: null })}
      >
        <DialogTitle>Confirm Status Change</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to change the status of "{confirmDialog.task?.title}" to{" "}
            <strong>{confirmDialog.newStatus === 'in_progress' ? 'In Progress' : confirmDialog.newStatus}</strong>?
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

          <Box>
            <input
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
              style={{ display: 'none' }}
              id="task-file-upload"
              type="file"
              onChange={(e) => setSelectedFile(e.target.files[0])}
              disabled={uploading}
            />
            <label htmlFor="task-file-upload">
              <Button
                variant="outlined"
                component="span"
                startIcon={<CloudUpload />}
                disabled={uploading}
                fullWidth
                sx={{ mb: 2 }}
              >
                {selectedFile ? `Selected: ${selectedFile.name}` : 'Choose File'}
              </Button>
            </label>
            
            {selectedFile && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  File: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </Typography>
                <Button
                  variant="contained"
                  startIcon={uploading ? <CircularProgress size={16} /> : <CloudUpload />}
                  onClick={() => handleFileUpload(selectedFile)}
                  disabled={uploading}
                  fullWidth
                  sx={{ mt: 1 }}
                >
                  {uploading ? 'Uploading...' : 'Upload & Submit Task'}
                </Button>
              </Box>
            )}
          </Box>
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
        </DialogActions>
      </Dialog>

      {/* Delete Submission Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, task: null })}
      >
        <DialogTitle>Delete Submission?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the submission for "{deleteDialog.task?.title}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            This will remove the uploaded file and return the task to "In Progress" status.
            You can upload a new submission afterwards.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialog({ open: false, task: null })}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteSubmission}
            variant="contained"
            color="error"
            disabled={deleting}
          >
            {deleting ? <CircularProgress size={20} color="inherit" /> : "Delete Submission"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Re-upload Submission Dialog */}
      <Dialog
        open={reuploadDialog.open}
        onClose={() => {
          setReuploadDialog({ open: false, task: null });
          setSelectedFile(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Re-upload Submission</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Upload a new file for: <strong>{reuploadDialog.task?.title}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Current file: {reuploadDialog.task?.submission_file_name}
          </Typography>

          <FileUpload
            onFileSelect={setSelectedFile}
            onUpload={handleReuploadSubmission}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setReuploadDialog({ open: false, task: null });
              setSelectedFile(null);
            }}
            disabled={reuploading}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Review Dialog for TL Tasks */}
      <ReviewDialog
        open={reviewDialog.open}
        task={reviewDialog.task}
        onClose={() => setReviewDialog({ open: false, task: null, action: null })}
        onApprove={async (taskId, comments) => {
          console.log('✅ Approving task:', taskId, 'with comments:', comments);
          await handleTLTaskReview(taskId, 'approve', comments);
        }}
        onRequestRedo={async (taskId, comments) => {
          console.log('📝 Requesting redo for task:', taskId, 'with comments:', comments);
          await handleReviewSubmit(comments);
        }}
      />
    </Box>
  );
}
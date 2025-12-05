// Workspace Dashboard - Central hub for workspace management
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ListItemButton,
  Chip,
  IconButton,
  Collapse,
  Divider,
  Alert,
  CircularProgress,
  Avatar,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Add,
  Person,
  ExpandMore,
  ExpandLess,
  Work,
  Group,
  Dashboard as DashboardIcon,
  PersonAdd
} from '@mui/icons-material';
import { supabase } from './supabaseClient';
import Sidebar from './Sidebar';
import LayoutContainer from './components/layout/LayoutContainer';
import SubmissionsGallery from './components/dashboard/SubmissionsGallery';
import { getWorkspaceSubmissions } from './services/TaskService';
import useRealTimeUpdates from './hooks/useRealTimeUpdates';
import NotificationBadge from './components/notifications/NotificationBadge';

export default function WorkspaceDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();

  // State management
  const [workspace, setWorkspace] = useState(null);
  const [user, setUser] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New task dialog state
  const [newTaskDialog, setNewTaskDialog] = useState(false);
  const [newTasks, setNewTasks] = useState(['']);
  const [submittingTasks, setSubmittingTasks] = useState(false);

  // Unassigned tasks state
  const [unassignedTasks, setUnassignedTasks] = useState([]);

  // Members and assigned tasks state
  const [members, setMembers] = useState([]);
  const [assignedTasks, setAssignedTasks] = useState({});
  const [expandedMember, setExpandedMember] = useState(null);

  // Assignment dialog state
  const [assignDialog, setAssignDialog] = useState({ open: false, task: null });
  const [assignMenuAnchor, setAssignMenuAnchor] = useState(null);

  // Submissions gallery state
  const [submissions, setSubmissions] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);

  const fetchWorkspaceData = async () => {
    try {
      setLoading(true);
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      if (!currentUser) {
        setError('Please log in to access this workspace');
        return;
      }

      setUser(currentUser);

      // Fetch workspace details
      const { data: workspaceData, error: workspaceError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', id)
        .single();

      if (workspaceError) throw workspaceError;
      setWorkspace(workspaceData);
      setIsOwner(workspaceData.created_by === currentUser.id);

      // Check access permissions
      const { data: memberData } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', id)
        .eq('user_id', currentUser.id)
        .single();

      if (!memberData && workspaceData.created_by !== currentUser.id) {
        setError('You do not have access to this workspace');
        return;
      }

      // Fetch all workspace data with the workspace data available
      await Promise.all([
        fetchUnassignedTasks(),
        fetchMembersAndTasks(workspaceData), // Pass workspace data directly
        fetchSubmissions()
      ]);

    } catch (err) {
      console.error('Error fetching workspace data:', err);
      setError('Failed to load workspace data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaceData();
  }, [id]);

  // Set up real-time updates
  useRealTimeUpdates(id, {
    onRefreshData: () => {
      fetchUnassignedTasks();
      fetchMembersAndTasks(workspace);
    },
    onSubmissionUpdate: () => {
      fetchSubmissions();
    },
    enableToasts: true
  });

  const fetchUnassignedTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('workspace_id', id)
        .is('assigned_to', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUnassignedTasks(data || []);
    } catch (err) {
      console.error('Error fetching unassigned tasks:', err);
    }
  };

  const fetchMembersAndTasks = async (workspaceData = workspace) => {
    try {
      if (!workspaceData) {
        console.error('Workspace data not available');
        return;
      }

      console.log('Fetching members for workspace:', workspaceData.id, 'Owner ID:', workspaceData.created_by);

      // Step 1: Fetch the actual workspace owner
      const { data: ownerData, error: ownerError } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('id', workspaceData.created_by)
        .single();

      if (ownerError) {
        console.error('Error fetching owner:', ownerError);
        return;
      }

      console.log('Owner data:', ownerData);

      // Step 2: Fetch ALL workspace members (without the nested users query)
      const { data: membersData, error: membersError } = await supabase
        .from('workspace_members')
        .select('user_id, role, joined_at')
        .eq('workspace_id', id);

      if (membersError) {
        console.error('Error fetching members:', membersError);
      }

      console.log('Members data from database:', membersData);

      // Step 3: Build the members list correctly
      const allMembers = [];

      // Always add the actual owner first with 'owner' role
      if (ownerData) {
        allMembers.push({
          id: ownerData.id,
          email: ownerData.email,
          full_name: ownerData.full_name,
          role: 'owner',
          joined_at: workspaceData.created_at
        });
      }

      // Add other members (but NOT the owner again)
      if (membersData && membersData.length > 0) {
        // Get user details for each member separately
        for (const member of membersData) {
          // Skip if this member is the owner (to avoid duplicates)
          if (member.user_id === workspaceData.created_by) {
            console.log('Skipping owner from members list to avoid duplicate');
            continue;
          }

          // Fetch user details for this member
          const { data: memberUserData, error: memberUserError } = await supabase
            .from('users')
            .select('id, email, full_name')
            .eq('id', member.user_id)
            .single();

          if (memberUserError) {
            console.error(`Error fetching user data for member ${member.user_id}:`, memberUserError);
            continue;
          }

          if (memberUserData) {
            allMembers.push({
              id: memberUserData.id,
              email: memberUserData.email,
              full_name: memberUserData.full_name,
              role: member.role || 'member',
              joined_at: member.joined_at
            });
          }
        }
      }

      console.log('Final members list:', allMembers);
      setMembers(allMembers);

      // Step 4: Fetch tasks for each member
      const tasksData = {};
      for (const member of allMembers) {
        const { data: memberTasks, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .eq('workspace_id', id)
          .eq('assigned_to', member.id)
          .order('created_at', { ascending: false });

        if (tasksError) {
          console.error(`Error fetching tasks for member ${member.id}:`, tasksError);
        }

        tasksData[member.id] = memberTasks || [];
      }

      console.log('Tasks data:', tasksData);
      setAssignedTasks(tasksData);
    } catch (err) {
      console.error('Error fetching members and tasks:', err);
    }
  };

  const fetchSubmissions = async () => {
    try {
      setSubmissionsLoading(true);
      const data = await getWorkspaceSubmissions(id);
      setSubmissions(data);
    } catch (err) {
      console.error('Error fetching submissions:', err);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  // New task management
  const addNewTaskField = () => {
    setNewTasks([...newTasks, '']);
  };

  const removeTaskField = (index) => {
    if (newTasks.length > 1) {
      setNewTasks(newTasks.filter((_, i) => i !== index));
    }
  };

  const updateTaskField = (index, value) => {
    const updated = [...newTasks];
    updated[index] = value;
    setNewTasks(updated);
  };

  const submitNewTasks = async () => {
    try {
      setSubmittingTasks(true);
      const validTasks = newTasks.filter(task => task.trim() !== '');

      if (validTasks.length === 0) {
        alert('Please enter at least one task');
        return;
      }

      // Validate task titles (no duplicates, reasonable length)
      const duplicates = validTasks.filter((task, index) =>
        validTasks.indexOf(task) !== index
      );

      if (duplicates.length > 0) {
        alert('Please remove duplicate task titles');
        return;
      }

      // Check if user has permission to create tasks in this workspace
      const canCreateTasks = isOwner || members.some(member => member.id === user.id);

      if (!canCreateTasks) {
        alert('You do not have permission to create tasks in this workspace.');
        return;
      }

      const tasksToInsert = validTasks.map(task => ({
        workspace_id: id,
        title: task.trim(),
        status: 'todo',
        assigned_by: user.id
        // Keep it minimal like WorkspaceTL
      }));

      console.log('Attempting to insert tasks:', tasksToInsert);
      console.log('Current user:', user);
      console.log('Workspace ID:', id);
      console.log('Is Owner:', isOwner);
      console.log('User in members:', members.some(member => member.id === user.id));

      // Try with minimal fields like WorkspaceTL
      const tasksWithDefaults = tasksToInsert.map(task => ({
        workspace_id: task.workspace_id,
        title: task.title,
        status: task.status,
        assigned_by: task.assigned_by
        // Remove description, assigned_to, timestamps - let DB handle defaults
      }));

      console.log('Tasks with defaults:', tasksWithDefaults);

      const { error } = await supabase
        .from('tasks')
        .insert(tasksWithDefaults);

      if (error) {
        console.error('Database error details:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);

        if (error.code === '42501' || error.message.includes('row-level security') || error.message.includes('permission')) {
          console.error('RLS Policy Error Details:');
          console.error('- User ID:', user.id);
          console.error('- Workspace ID:', id);
          console.error('- Is Owner:', isOwner);
          console.error('- User in members list:', members.some(member => member.id === user.id));
          console.error('- Task data being inserted:', tasksWithDefaults);

          alert(`Database permission error: Unable to create tasks. 
          
This could be because:
1. Database security policies are too restrictive
2. User needs to be properly added as a workspace member
3. Database configuration issue

Please contact the workspace owner or system administrator.`);
          return;
        }

        throw error;
      }

      alert(`${validTasks.length} task(s) created successfully! They are now available for assignment.`);
      setNewTaskDialog(false);
      setNewTasks(['']);

      // Refresh data to show new tasks
      await fetchUnassignedTasks();
      await fetchMembersAndTasks(workspace);
    } catch (err) {
      console.error('Error creating tasks:', err);
      alert(`Failed to create tasks: ${err.message}`);
    } finally {
      setSubmittingTasks(false);
    }
  };

  // Task assignment
  const handleAssignClick = (task, event) => {
    // Prevent assignment if task is already assigned
    if (task.assigned_to) {
      alert('This task is already assigned and cannot be reassigned.');
      return;
    }

    setAssignDialog({ open: true, task });
    setAssignMenuAnchor(event.currentTarget);
  };

  const handleAssignToSelf = async () => {
    if (!window.confirm(`Are you sure you want to assign "${assignDialog.task?.title}" to yourself?`)) {
      return;
    }

    try {
      // Double-check task is still unassigned
      const { data: currentTask, error: checkError } = await supabase
        .from('tasks')
        .select('assigned_to')
        .eq('id', assignDialog.task.id)
        .single();

      if (checkError) throw checkError;

      if (currentTask.assigned_to) {
        alert('This task has already been assigned to someone else.');
        setAssignDialog({ open: false, task: null });
        setAssignMenuAnchor(null);
        await fetchUnassignedTasks();
        await fetchMembersAndTasks(workspace);
        return;
      }

      const { error } = await supabase
        .from('tasks')
        .update({
          assigned_to: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', assignDialog.task.id)
        .is('assigned_to', null); // Only update if still unassigned

      if (error) throw error;

      alert('Task assigned to yourself successfully!');
      setAssignDialog({ open: false, task: null });
      setAssignMenuAnchor(null);

      // Refresh data
      await fetchUnassignedTasks();
      await fetchMembersAndTasks(workspace);
    } catch (err) {
      console.error('Error assigning task:', err);
      alert(`Failed to assign task: ${err.message}`);
    }
  };

  const handleAssignToMember = async (memberId) => {
    const member = members.find(m => m.id === memberId);
    const memberName = member?.full_name || member?.email;

    if (!window.confirm(`Are you sure you want to assign "${assignDialog.task?.title}" to ${memberName}?`)) {
      return;
    }

    try {
      // Double-check task is still unassigned
      const { data: currentTask, error: checkError } = await supabase
        .from('tasks')
        .select('assigned_to')
        .eq('id', assignDialog.task.id)
        .single();

      if (checkError) throw checkError;

      if (currentTask.assigned_to) {
        alert('This task has already been assigned to someone else.');
        setAssignDialog({ open: false, task: null });
        setAssignMenuAnchor(null);
        await fetchUnassignedTasks();
        await fetchMembersAndTasks(workspace);
        return;
      }

      const { error } = await supabase
        .from('tasks')
        .update({
          assigned_to: memberId,
          updated_at: new Date().toISOString()
        })
        .eq('id', assignDialog.task.id)
        .is('assigned_to', null); // Only update if still unassigned

      if (error) throw error;

      alert(`Task assigned to ${memberName} successfully!`);
      setAssignDialog({ open: false, task: null });
      setAssignMenuAnchor(null);

      // Refresh data
      await fetchUnassignedTasks();
      await fetchMembersAndTasks(workspace);
    } catch (err) {
      console.error('Error assigning task:', err);
      alert(`Failed to assign task: ${err.message}`);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'todo': return 'default';
      case 'in_progress': return 'warning';
      case 'submitted': return 'info';
      case 'needs_revision': return 'error';
      case 'completed': return 'success';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'todo': return 'To Do';
      case 'in_progress': return 'In Progress';
      case 'submitted': return 'Submitted';
      case 'needs_revision': return 'Needs Revision';
      case 'completed': return 'Completed';
      default: return 'Unknown';
    }
  };

  if (loading) {
    return (
      <Box className="layout-container">
        <Sidebar />
        <LayoutContainer className="layout-flex-center">
          <CircularProgress />
        </LayoutContainer>
      </Box>
    );
  }

  if (error) {
    return (
      <Box className="layout-container">
        <Sidebar />
        <LayoutContainer>
          <Alert severity="error">{error}</Alert>
        </LayoutContainer>
      </Box>
    );
  }

  return (
    <Box className="layout-container">
      <Sidebar />
      
      <LayoutContainer maxWidth="full" padding="default">
        {/* Header */}
        <Paper className="layout-content-wrapper">
          <Box sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'center' },
            gap: 2
          }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h4" fontWeight="bold" sx={{
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                fontSize: { xs: '1.5rem', md: '2rem' },
                wordBreak: 'break-word'
              }}>
                <DashboardIcon sx={{ mr: 2, flexShrink: 0 }} />
                {workspace?.name}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ 
                mt: 1,
                wordBreak: 'break-word'
              }}>
                {workspace?.description || 'No description provided'}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <NotificationBadge
                workspaceId={id}
                userId={user?.id}
                onClick={(count) => {
                  if (count > 0) {
                    alert(`You have ${count} task${count > 1 ? 's' : ''} pending review`);
                  }
                }}
              />
              <Button
                variant="contained"
                startIcon={<Work />}
                onClick={() => navigate(isOwner ? `/workspace/${id}` : `/workspace-member/${id}`)}
                sx={{
                  bgcolor: 'var(--color-primary)',
                  '&:hover': { bgcolor: 'var(--color-primary-hover)' },
                  minWidth: { xs: '100%', md: 'auto' },
                  flexShrink: 0
                }}
              >
                Workspace Section
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* Task Management Section */}
        <Paper className="layout-content-wrapper">
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between', 
            alignItems: { xs: 'flex-start', sm: 'center' }, 
            mb: 3,
            gap: 2
          }}>
            <Typography variant="h5" fontWeight="bold" sx={{ 
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center'
            }}>
              <Add sx={{ mr: 1 }} />
              Task Management
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setNewTaskDialog(true)}
              sx={{ 
                bgcolor: 'var(--color-primary)', 
                '&:hover': { bgcolor: 'var(--color-primary-hover)' },
                minWidth: { xs: '100%', sm: 'auto' }
              }}
            >
              New Tasks
            </Button>
          </Box>

          {/* Unassigned Tasks */}
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, color: '#333' }}>
            Unassigned Tasks ({unassignedTasks.length})
          </Typography>

          {unassignedTasks.length === 0 ? (
            <Alert severity="info" sx={{ mb: 2 }}>No unassigned tasks</Alert>
          ) : (
            <Box sx={{ mb: 2 }}>
              {unassignedTasks.map((task) => (
                <Paper
                  key={task.id}
                  className="layout-card"
                  sx={{
                    mb: 2,
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    justifyContent: 'space-between',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    gap: 2,
                    '&:hover': { boxShadow: 'var(--shadow-md)' }
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ 
                      mb: 1,
                      wordBreak: 'break-word'
                    }}>
                      {task.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Created: {new Date(task.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    size="medium"
                    startIcon={<PersonAdd />}
                    onClick={(e) => handleAssignClick(task, e)}
                    sx={{
                      bgcolor: 'var(--color-primary)',
                      '&:hover': { bgcolor: 'var(--color-primary-hover)' },
                      minWidth: { xs: '100%', sm: 'auto' },
                      flexShrink: 0
                    }}
                  >
                    Assign
                  </Button>
                </Paper>
              ))}
            </Box>
          )}
        </Paper>

        {/* Submissions Gallery Section */}
        <Paper className="layout-content-wrapper">
          <Typography variant="h5" fontWeight="bold" sx={{ 
            mb: 3, 
            color: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Work sx={{ mr: 1 }} />
            Workspace Submissions ({submissions.length})
          </Typography>

          {submissionsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <SubmissionsGallery
              workspaceId={id}
              submissions={submissions}
              onRefresh={fetchSubmissions}
            />
          )}
        </Paper>

        {/* Team Members Section */}
        <Paper className="layout-content-wrapper">
          <Typography variant="h5" fontWeight="bold" sx={{ 
            mb: 3, 
            color: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Group sx={{ mr: 1 }} />
            Team Members ({members.length})
          </Typography>

          <Box className="layout-flex-column layout-spacing-md">
            {members.map((member) => (
              <Paper
                key={member.id}
                className="layout-card"
                sx={{
                  p: 0,
                  overflow: 'hidden'
                }}
              >
                <ListItemButton
                  onClick={() => setExpandedMember(expandedMember === member.id ? null : member.id)}
                  sx={{
                    p: 3,
                    backgroundColor: member.role === 'owner' ? '#e3f2fd' : 'white',
                    '&:hover': { backgroundColor: member.role === 'owner' ? '#bbdefb' : '#f5f5f5' }
                  }}
                >
                  <Avatar sx={{
                    mr: 3,
                    bgcolor: member.role === 'owner' ? 'var(--color-primary)' : '#9e9e9e',
                    width: 48,
                    height: 48,
                    flexShrink: 0
                  }}>
                    {member.role === 'owner' ? <Person /> : <Group />}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: { xs: 'column', sm: 'row' },
                      alignItems: { xs: 'flex-start', sm: 'center' }, 
                      mb: 1,
                      gap: 1
                    }}>
                      <Typography variant="h6" fontWeight="bold" sx={{
                        wordBreak: 'break-word',
                        flex: 1
                      }}>
                        {member.full_name || member.email}
                      </Typography>
                      <Chip
                        label={member.role.toUpperCase()}
                        size="small"
                        color={member.role === 'owner' ? 'primary' : 'default'}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Assigned Tasks: {assignedTasks[member.id]?.length || 0}
                    </Typography>
                  </Box>
                  {expandedMember === member.id ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>

                <Collapse in={expandedMember === member.id}>
                  <Box sx={{ p: 3, pt: 0, backgroundColor: '#fafafa' }}>
                    {assignedTasks[member.id]?.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        No tasks assigned to this member
                      </Typography>
                    ) : (
                      <Box className="layout-flex-column layout-spacing-md">
                        {assignedTasks[member.id]?.map((task) => (
                          <Paper
                            key={task.id}
                            elevation={0}
                            sx={{
                              p: 2,
                              backgroundColor: 'white',
                              border: '1px solid var(--color-border)',
                              borderRadius: 'var(--border-radius-sm)'
                            }}
                          >
                            <Typography variant="subtitle2" fontWeight="bold" sx={{ 
                              mb: 1,
                              wordBreak: 'break-word'
                            }}>
                              {task.title}
                            </Typography>
                            <Box sx={{ 
                              display: 'flex', 
                              flexDirection: { xs: 'column', sm: 'row' },
                              alignItems: { xs: 'flex-start', sm: 'center' }, 
                              gap: 2 
                            }}>
                              <Chip
                                label={getStatusText(task.status)}
                                size="small"
                                color={getStatusColor(task.status)}
                              />
                              <Typography variant="caption" color="text.secondary">
                                Created: {new Date(task.created_at).toLocaleDateString()}
                              </Typography>
                            </Box>
                          </Paper>
                        ))}
                      </Box>
                    )}
                  </Box>
                </Collapse>
              </Paper>
            ))}
          </Box>
        </Paper>
      </LayoutContainer>

      {/* New Task Dialog */}
      <Dialog 
        open={newTaskDialog} 
        onClose={() => setNewTaskDialog(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 'var(--border-radius-lg)',
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle>Create New Tasks</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Add new tasks to the workspace. They will be unassigned initially and can be assigned later.
          </Typography>

          {newTasks.map((task, index) => (
            <Box key={index} sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'stretch', sm: 'center' }, 
              mb: 2,
              gap: 1
            }}>
              <TextField
                fullWidth
                label={`Task ${index + 1}`}
                value={task}
                onChange={(e) => updateTaskField(index, e.target.value)}
                placeholder="Enter task description"
                sx={{ flex: 1 }}
              />
              <Box sx={{ 
                display: 'flex', 
                gap: 1,
                justifyContent: { xs: 'center', sm: 'flex-start' }
              }}>
                <IconButton
                  onClick={addNewTaskField}
                  sx={{ 
                    bgcolor: 'var(--color-primary)', 
                    color: 'white',
                    '&:hover': { bgcolor: 'var(--color-primary-hover)' }
                  }}
                >
                  <Add />
                </IconButton>
                {newTasks.length > 1 && (
                  <IconButton
                    onClick={() => removeTaskField(index)}
                    sx={{ 
                      bgcolor: '#f44336', 
                      color: 'white',
                      '&:hover': { bgcolor: '#d32f2f' }
                    }}
                  >
                    <ExpandLess />
                  </IconButton>
                )}
              </Box>
            </Box>
          ))}
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button onClick={() => setNewTaskDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={submitNewTasks}
            disabled={submittingTasks}
            sx={{ 
              bgcolor: 'var(--color-primary)', 
              '&:hover': { bgcolor: 'var(--color-primary-hover)' }
            }}
          >
            {submittingTasks ? <CircularProgress size={20} /> : 'Create Tasks'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assignment Menu */}
      <Menu
        anchorEl={assignMenuAnchor}
        open={Boolean(assignMenuAnchor)}
        onClose={() => {
          setAssignMenuAnchor(null);
          setAssignDialog({ open: false, task: null });
        }}
        PaperProps={{
          sx: {
            borderRadius: 'var(--border-radius-md)',
            boxShadow: 'var(--shadow-lg)',
            minWidth: 200
          }
        }}
      >
        <MenuItem onClick={handleAssignToSelf}>
          <Person sx={{ mr: 1 }} />
          Assign to Myself
        </MenuItem>
        {isOwner && (
          <Divider />
        )}
        {isOwner && members.map((member) => (
          <MenuItem
            key={member.id}
            onClick={() => handleAssignToMember(member.id)}
            sx={{
              '&:hover': {
                backgroundColor: '#f5f5f5'
              }
            }}
          >
            <Avatar sx={{ 
              mr: 1, 
              width: 24, 
              height: 24,
              bgcolor: member.role === 'owner' ? 'var(--color-primary)' : '#9e9e9e'
            }}>
              {member.role === 'owner' ? <Person /> : <Group />}
            </Avatar>
            <Box sx={{ 
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {member.full_name || member.email}
              {member.role === 'owner' && ' (Owner)'}
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
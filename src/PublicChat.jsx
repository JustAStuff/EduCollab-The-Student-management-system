import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "./supabaseClient";
import {
  Box,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  Alert,
  Fade,
  Avatar,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Badge,
} from "@mui/material";
import {
  Chat as ChatIcon,
  Send as SendIcon,
  MoreVert as MoreVertIcon,
  Reply as ReplyIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  DoneAll as DoneAllIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
} from "@mui/icons-material";
import Sidebar from "./Sidebar";
import LayoutContainer from "./components/layout/LayoutContainer";
import "./styles/layout.css";

const PublicChat = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [messageStatuses, setMessageStatuses] = useState({});
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const messagesEndRef = useRef(null);
  const messageRefs = useRef({});

  // Initialize chat and set up subscriptions
  useEffect(() => {
    const initializeChat = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          setError("Please log in to access the chat");
          return;
        }

        const userData = {
          id: user.id,
          email: user.email,
          name: user.email?.split('@')[0] || 'Anonymous',
          avatar_url: user.user_metadata?.avatar_url || null
        };
        
        setCurrentUser(userData);
        
        // Update user online status
        await updateOnlineStatus(userData, true);
        
        // Fetch initial data
        await Promise.all([
          fetchMessages(),
          fetchOnlineUsers()
          // fetchMessageStatuses() // Disabled for demo
        ]);
      } catch (err) {
        console.error('Error initializing chat:', err);
        setError("Failed to load chat. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    initializeChat();

    // Set up real-time subscriptions
    const messagesSubscription = supabase
      .channel("public:messages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setMessages((prev) => [...prev, payload.new]);
          } else if (payload.eventType === "UPDATE") {
            setMessages((prev) => 
              prev.map(msg => msg.id === payload.new.id ? payload.new : msg)
            );
          } else if (payload.eventType === "DELETE") {
            setMessages((prev) => prev.filter(msg => msg.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Message status feature disabled for demo
    // const statusSubscription = supabase
    //   .channel("public:message_status")
    //   .on(
    //     "postgres_changes",
    //     { event: "*", schema: "public", table: "message_status" },
    //     () => {
    //       fetchMessageStatuses();
    //     }
    //   )
    //   .subscribe();

    const onlineSubscription = supabase
      .channel("public:online_users")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "online_users" },
        () => {
          fetchOnlineUsers();
        }
      )
      .subscribe();

    // Update online status periodically
    const onlineInterval = setInterval(() => {
      if (currentUser) {
        updateOnlineStatus(currentUser, true);
      }
    }, 30000); // Every 30 seconds

    // Cleanup on unmount
    return () => {
      if (currentUser) {
        updateOnlineStatus(currentUser, false);
      }
      supabase.removeChannel(messagesSubscription);
      // supabase.removeChannel(statusSubscription);
      supabase.removeChannel(onlineSubscription);
      clearInterval(onlineInterval);
    };
  }, []);

  const fetchMessages = async () => {
    try {
      // First try with enhanced schema, fallback to basic schema
      let query = supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });

      // Try to include reply_to if the column exists
      try {
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            reply_to:reply_to_message_id(id, content, user_name)
          `)
          .order('created_at', { ascending: true });

        if (error && error.code === 'PGRST200') {
          // Column doesn't exist, use basic query
          const { data: basicData, error: basicError } = await query;
          if (basicError) throw basicError;
          setMessages(basicData || []);
        } else if (error) {
          throw error;
        } else {
          setMessages(data || []);
        }
      } catch (enhancedError) {
        // Fallback to basic query
        const { data, error } = await query;
        if (error) throw error;
        setMessages(data || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError("Failed to load messages");
    }
  };

  const fetchOnlineUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('online_users')
        .select('*')
        .eq('is_online', true);

      if (error) {
        if (error.code === 'PGRST205') {
          // Table doesn't exist yet, skip
          console.log('Online users table not found, skipping...');
          return;
        }
        console.error('Error fetching online users:', error);
        return;
      }

      setOnlineUsers(data || []);
    } catch (error) {
      console.error('Error fetching online users:', error);
    }
  };

  const fetchMessageStatuses = async () => {
    try {
      const { data, error } = await supabase
        .from('message_status')
        .select('*');

      if (error) {
        if (error.code === 'PGRST205') {
          // Table doesn't exist yet, skip
          console.log('Message status table not found, skipping...');
          return;
        }
        console.error('Error fetching message statuses:', error);
        return;
      }

      // Group statuses by message_id
      const statusMap = {};
      data?.forEach(status => {
        if (!statusMap[status.message_id]) {
          statusMap[status.message_id] = [];
        }
        statusMap[status.message_id].push(status);
      });

      setMessageStatuses(statusMap);
    } catch (error) {
      console.error('Error fetching message statuses:', error);
    }
  };

  const updateOnlineStatus = async (user, isOnline) => {
    try {
      if (isOnline) {
        const { error } = await supabase
          .from('online_users')
          .upsert({
            user_id: user.id,
            user_name: user.name,
            user_avatar_url: user.avatar_url,
            last_seen: new Date().toISOString(),
            is_online: true
          });
        
        if (error && error.code === 'PGRST205') {
          // Table doesn't exist yet, skip
          console.log('Online users table not found, skipping online status update...');
          return;
        }
      } else {
        const { error } = await supabase
          .from('online_users')
          .update({ is_online: false })
          .eq('user_id', user.id);
          
        if (error && error.code === 'PGRST205') {
          // Table doesn't exist yet, skip
          return;
        }
      }
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  };

  const markMessageAsRead = async (messageId) => {
    if (!currentUser) return;
    
    try {
      const { error } = await supabase
        .from('message_status')
        .upsert({
          message_id: messageId,
          user_id: currentUser.id,
          status: 'read'
        });
        
      if (error && error.code === 'PGRST205') {
        // Table doesn't exist yet, skip
        return;
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const sendMessage = async () => {
    if (newMessage.trim().length === 0 || !currentUser) return;

    try {
      // Basic message data that works with both old and new schema
      const basicMessageData = {
        content: newMessage.trim(),
        user_name: currentUser.name
      };

      // Enhanced message data for new schema
      const enhancedMessageData = {
        ...basicMessageData,
        user_id: currentUser.id,
        user_avatar_url: currentUser.avatar_url,
        reply_to_message_id: replyingTo?.id || null
      };

      if (editingMessage) {
        // Try to update with enhanced fields first, fallback to basic
        let updateData = {
          content: newMessage.trim()
        };

        // Try to add enhanced fields if they exist
        try {
          updateData.is_edited = true;
          updateData.edited_at = new Date().toISOString();
        } catch (e) {
          // Enhanced fields don't exist, use basic update
        }

        const { error } = await supabase
          .from('messages')
          .update(updateData)
          .eq('id', editingMessage.id);

        if (error) {
          console.error('Error updating message:', error);
          setError('Failed to update message. Please try again.');
          return;
        }

        setEditingMessage(null);
      } else {
        // Try enhanced insert first, fallback to basic
        let { error } = await supabase
          .from('messages')
          .insert([enhancedMessageData]);

        if (error && error.code === 'PGRST204') {
          // Enhanced columns don't exist, try basic insert
          const { error: basicError } = await supabase
            .from('messages')
            .insert([basicMessageData]);

          if (basicError) {
            console.error('Error sending message:', basicError);
            setError('Failed to send message. Please try again.');
            return;
          }
        } else if (error) {
          console.error('Error sending message:', error);
          setError('Failed to send message. Please try again.');
          return;
        }
      }

      setNewMessage('');
      setReplyingTo(null);
      setError(null);
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
    }
  };

  const deleteMessage = async (messageId) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) {
        console.error('Error deleting message:', error);
        setError('Failed to delete message. Please try again.');
        return;
      }

      setDeleteDialog(false);
      setSelectedMessage(null);
    } catch (error) {
      console.error('Error deleting message:', error);
      setError('Failed to delete message. Please try again.');
    }
  };

  const handleReply = (message) => {
    setReplyingTo(message);
    setMenuAnchor(null);
  };

  const handleEdit = (message) => {
    setEditingMessage(message);
    setNewMessage(message.content);
    setMenuAnchor(null);
  };

  const handleDelete = (message) => {
    setSelectedMessage(message);
    setDeleteDialog(true);
    setMenuAnchor(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    } else if (e.key === 'Escape') {
      setReplyingTo(null);
      setEditingMessage(null);
      setNewMessage('');
    }
  };

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mark messages as read when they come into view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const messageId = entry.target.dataset.messageId;
            if (messageId && currentUser) {
              markMessageAsRead(messageId);
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    Object.values(messageRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [messages, currentUser]);

  // Utility functions
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  const getMessageStatus = (message) => {
    if (!currentUser || message.user_id !== currentUser.id) return null;
    
    const statuses = messageStatuses[message.id] || [];
    const totalOnlineUsers = onlineUsers.length - 1; // Exclude sender
    
    if (totalOnlineUsers === 0) return 'sent';
    
    const readCount = statuses.filter(s => s.status === 'read').length;
    const deliveredCount = statuses.filter(s => s.status === 'delivered').length;
    
    if (readCount === totalOnlineUsers) return 'read';
    if (deliveredCount === totalOnlineUsers) return 'delivered';
    return 'sent';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent':
        return <CheckIcon sx={{ fontSize: 16, color: 'text.secondary' }} />;
      case 'delivered':
        return <DoneAllIcon sx={{ fontSize: 16, color: 'text.secondary' }} />;
      case 'read':
        return <DoneAllIcon sx={{ fontSize: 16, color: '#4fc3f7' }} />;
      default:
        return <ScheduleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />;
    }
  };

  if (error && loading) {
    return (
      <div className="layout-container">
        <Sidebar />
        <LayoutContainer maxWidth="xl" padding="default">
          <div className="layout-content-wrapper">
            <Alert 
              severity="error" 
              sx={{ 
                borderRadius: 'var(--border-radius-lg)',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              {error}
            </Alert>
          </div>
        </LayoutContainer>
      </div>
    );
  }

  return (
    <div className="layout-container">
      <Sidebar />
      
      <LayoutContainer maxWidth="xl" padding="default">
        {/* Header Section */}
        <Fade in={!loading} timeout={500}>
          <div className="layout-content-wrapper layout-margin-bottom-lg">
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ChatIcon sx={{ mr: 2, color: 'var(--color-primary)', fontSize: 32 }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    Public Chat
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Connect with other users in real-time
                  </Typography>
                </Box>
              </Box>
              
              {/* Online Users */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                <Typography variant="body2" color="text.secondary">
                  {onlineUsers.length} online
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                  {onlineUsers.slice(0, 5).map((user) => (
                    <Tooltip key={user.user_id} title={user.user_name}>
                      <Badge
                        overlap="circular"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        badgeContent={
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: '#4caf50',
                              border: '1px solid white'
                            }}
                          />
                        }
                      >
                        <Avatar
                          src={user.user_avatar_url}
                          sx={{ width: 24, height: 24, fontSize: 12 }}
                        >
                          {user.user_name?.[0]?.toUpperCase()}
                        </Avatar>
                      </Badge>
                    </Tooltip>
                  ))}
                  {onlineUsers.length > 5 && (
                    <Chip
                      label={`+${onlineUsers.length - 5}`}
                      size="small"
                      sx={{ height: 24, fontSize: 10 }}
                    />
                  )}
                </Box>
              </Box>
            </Box>
            
            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  mt: 2,
                  borderRadius: 'var(--border-radius-md)'
                }}
                onClose={() => setError(null)}
              >
                {error}
              </Alert>
            )}
          </div>
        </Fade>

        {/* Chat Container */}
        <Fade in={!loading} timeout={500}>
          <div className="layout-content-wrapper" style={{ 
            height: 'calc(100vh - 280px)', 
            display: 'flex', 
            flexDirection: 'column',
            minHeight: '500px'
          }}>
            {/* Chat Messages Area */}
            <Box 
              className="layout-scroll-y"
              sx={{ 
                flexGrow: 1,
                mb: 2,
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--border-radius-md)',
                backgroundColor: '#f8f9fa',
                maxHeight: 'calc(100vh - 400px)',
                minHeight: '300px',
                position: 'relative'
              }}
            >
              <List sx={{ p: 1 }}>
                {loading ? (
                  <ListItem>
                    <Typography 
                      variant="body2" 
                      sx={{ textAlign: 'center', color: 'text.secondary', width: '100%' }}
                    >
                      Loading messages...
                    </Typography>
                  </ListItem>
                ) : messages.length === 0 ? (
                  <ListItem>
                    <Typography 
                      variant="body2" 
                      sx={{ textAlign: 'center', color: 'text.secondary', width: '100%' }}
                    >
                      No messages yet. Start the conversation! 💬
                    </Typography>
                  </ListItem>
                ) : (
                  <>
                    {messages.map((msg) => {
                      const isOwnMessage = currentUser && msg.user_id === currentUser.id;
                      const messageStatus = getMessageStatus(msg);
                      
                      return (
                        <ListItem 
                          key={msg.id}
                          ref={(el) => messageRefs.current[msg.id] = el}
                          data-message-id={msg.id}
                          sx={{ 
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isOwnMessage ? 'flex-end' : 'flex-start',
                            py: 0.5,
                            px: 1
                          }}
                        >
                          <Box
                            sx={{
                              maxWidth: '70%',
                              minWidth: '120px',
                              backgroundColor: isOwnMessage ? '#dcf8c6' : 'white',
                              borderRadius: '12px',
                              p: 1.5,
                              position: 'relative',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                              border: '1px solid',
                              borderColor: isOwnMessage ? '#c8e6c9' : '#e0e0e0'
                            }}
                          >
                            {/* Reply indicator */}
                            {msg.reply_to && (
                              <Box
                                sx={{
                                  backgroundColor: 'rgba(0,0,0,0.05)',
                                  borderLeft: '3px solid var(--color-primary)',
                                  borderRadius: '4px',
                                  p: 1,
                                  mb: 1,
                                  fontSize: '0.85em'
                                }}
                              >
                                <Typography variant="caption" color="primary" fontWeight="medium">
                                  {msg.reply_to.user_name}
                                </Typography>
                                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                                  {msg.reply_to.content.length > 50 
                                    ? msg.reply_to.content.substring(0, 50) + '...'
                                    : msg.reply_to.content
                                  }
                                </Typography>
                              </Box>
                            )}

                            {/* Message header */}
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                              <Avatar
                                src={msg.user_avatar_url}
                                sx={{ width: 20, height: 20, mr: 1, fontSize: 10 }}
                              >
                                {msg.user_name?.[0]?.toUpperCase()}
                              </Avatar>
                              <Typography 
                                variant="caption" 
                                color="primary" 
                                fontWeight="medium"
                                sx={{ flexGrow: 1 }}
                              >
                                {msg.user_name || 'Anonymous'}
                              </Typography>
                              {isOwnMessage && (
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    setMenuAnchor(e.currentTarget);
                                    setSelectedMessage(msg);
                                  }}
                                  sx={{ ml: 1, p: 0.25 }}
                                >
                                  <MoreVertIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                              )}
                            </Box>

                            {/* Message content */}
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                wordBreak: 'break-word',
                                whiteSpace: 'pre-wrap',
                                mb: 0.5,
                                color: '#000000'
                              }}
                            >
                              {msg.content}
                            </Typography>

                            {/* Message footer */}
                            <Box sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'flex-end',
                              gap: 0.5,
                              mt: 0.5
                            }}>
                              <Typography variant="caption" color="text.secondary">
                                {formatTime(msg.created_at)}
                              </Typography>
                              {msg.is_edited && (
                                <Typography variant="caption" color="text.secondary">
                                  (edited)
                                </Typography>
                              )}
                              {isOwnMessage && messageStatus && getStatusIcon(messageStatus)}
                            </Box>
                          </Box>
                        </ListItem>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </List>
            </Box>

            {/* Reply/Edit indicator */}
            {(replyingTo || editingMessage) && (
              <Box sx={{ 
                backgroundColor: '#e3f2fd',
                borderRadius: 'var(--border-radius-md)',
                p: 1,
                mb: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {replyingTo ? <ReplyIcon sx={{ mr: 1, fontSize: 16 }} /> : <EditIcon sx={{ mr: 1, fontSize: 16 }} />}
                  <Typography variant="caption">
                    {replyingTo ? `Replying to ${replyingTo.user_name}` : 'Editing message'}
                  </Typography>
                </Box>
                <IconButton 
                  size="small" 
                  onClick={() => {
                    setReplyingTo(null);
                    setEditingMessage(null);
                    setNewMessage('');
                  }}
                >
                  <DeleteIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            )}

            {/* Input Area */}
            <Box sx={{ 
              display: "flex", 
              gap: 2, 
              alignItems: 'flex-end',
              pt: 2,
              borderTop: '1px solid var(--color-border)',
              flexShrink: 0
            }}>
              <TextField
                fullWidth
                multiline
                maxRows={3}
                label={editingMessage ? "Edit message..." : "Type a message..."}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 'var(--border-radius-md)',
                  }
                }}
              />
              <Button 
                variant="contained" 
                onClick={sendMessage}
                disabled={loading || newMessage.trim().length === 0}
                startIcon={<SendIcon />}
                sx={{
                  bgcolor: "var(--color-primary)",
                  "&:hover": { bgcolor: "var(--color-primary-hover)" },
                  borderRadius: "var(--border-radius-md)",
                  px: 3,
                  py: 1.5,
                  minWidth: 100,
                  height: 56,
                  flexShrink: 0
                }}
              >
                {editingMessage ? 'Update' : 'Send'}
              </Button>
            </Box>
          </div>
        </Fade>

        {/* Message Menu */}
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
        >
          <MenuItem onClick={() => handleReply(selectedMessage)}>
            <ReplyIcon sx={{ mr: 1, fontSize: 16 }} />
            Reply
          </MenuItem>
          {selectedMessage && currentUser && selectedMessage.user_id === currentUser.id && (
            <>
              <MenuItem onClick={() => handleEdit(selectedMessage)}>
                <EditIcon sx={{ mr: 1, fontSize: 16 }} />
                Edit
              </MenuItem>
              <MenuItem onClick={() => handleDelete(selectedMessage)}>
                <DeleteIcon sx={{ mr: 1, fontSize: 16 }} />
                Delete
              </MenuItem>
            </>
          )}
        </Menu>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
          <DialogTitle>Delete Message</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this message? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
            <Button 
              onClick={() => deleteMessage(selectedMessage?.id)} 
              color="error"
              variant="contained"
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </LayoutContainer>
    </div>
  );
};

export default PublicChat;

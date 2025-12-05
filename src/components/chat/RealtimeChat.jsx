// Real-time Chat Component - Based on Supabase Best Practices
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import {
  Box,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  Alert,
  Paper,
  Avatar,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Send as SendIcon,
  Chat as ChatIcon,
  Circle as CircleIcon,
} from '@mui/icons-material';

const RealtimeChat = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const messagesEndRef = useRef(null);
  const channelRef = useRef(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize chat
  useEffect(() => {
    const initializeChat = async () => {
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          setError('Please log in to access the chat');
          setLoading(false);
          return;
        }

        setCurrentUser({
          id: user.id,
          email: user.email,
          name: user.email?.split('@')[0] || 'Anonymous',
        });

        // Fetch existing messages
        await fetchMessages();
        
        // Set up real-time subscription
        setupRealtimeSubscription();
        
      } catch (err) {
        console.error('Error initializing chat:', err);
        setError('Failed to initialize chat');
      } finally {
        setLoading(false);
      }
    };

    initializeChat();

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  // Fetch existing messages
  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        setError('Failed to load messages');
        return;
      }

      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError('Failed to load messages');
    }
  };

  // Set up real-time subscription
  const setupRealtimeSubscription = () => {
    console.log('🔌 Setting up real-time subscription...');
    
    // Create a unique channel name
    const channelName = `public-chat-${Date.now()}`;
    
    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: true },
          presence: { key: 'user_id' },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          console.log('📨 New message received:', payload.new);
          
          setMessages((current) => {
            // Check if message already exists to avoid duplicates
            const exists = current.find(msg => msg.id === payload.new.id);
            if (exists) {
              console.log('⚠️ Duplicate message ignored');
              return current;
            }
            
            console.log('✅ Adding new message');
            return [...current, payload.new];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          console.log('🗑️ Message deleted:', payload.old);
          setMessages((current) => 
            current.filter(msg => msg.id !== payload.old.id)
          );
        }
      )
      .subscribe((status, err) => {
        console.log('🔗 Subscription status:', status);
        setConnectionStatus(status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to real-time updates!');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Real-time subscription error:', err);
          setError('Real-time connection failed');
        } else if (status === 'TIMED_OUT') {
          console.error('⏰ Real-time subscription timed out');
          setError('Real-time connection timed out');
        } else if (status === 'CLOSED') {
          console.log('🔌 Real-time connection closed');
        }
      });

    channelRef.current = channel;
  };

  // Send a new message
  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !currentUser || sending) return;

    try {
      setSending(true);
      
      const messageData = {
        content: newMessage.trim(),
        user_name: currentUser.name,
      };

      const { data, error } = await supabase
        .from('messages')
        .insert([messageData])
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        setError('Failed to send message');
        return;
      }

      console.log('✅ Message sent successfully:', data);
      setNewMessage('');
      
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Test real-time connection
  const testRealtime = async () => {
    try {
      console.log('🧪 Testing real-time connection...');
      
      const testMessage = {
        content: `Real-time test message - ${new Date().toLocaleTimeString()}`,
        user_name: 'System Test',
      };

      const { data, error } = await supabase
        .from('messages')
        .insert([testMessage])
        .select()
        .single();

      if (error) {
        console.error('❌ Real-time test failed:', error);
        setError('Real-time test failed');
      } else {
        console.log('✅ Real-time test message sent:', data);
      }
    } catch (error) {
      console.error('❌ Real-time test error:', error);
      setError('Real-time test error');
    }
  };

  // Get connection status color
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'SUBSCRIBED': return '#4caf50';
      case 'CHANNEL_ERROR': return '#f44336';
      case 'TIMED_OUT': return '#ff9800';
      case 'CLOSED': return '#757575';
      default: return '#2196f3';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', bgcolor: '#f8f9fa' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ChatIcon sx={{ mr: 1, color: '#106EBE' }} />
            <Typography variant="h6" sx={{ color: '#106EBE', fontWeight: 'bold' }}>
              Public Chat
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Connection Status */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CircleIcon sx={{ fontSize: 12, color: getStatusColor(), mr: 0.5 }} />
              <Typography variant="caption" color="text.secondary">
                {connectionStatus === 'SUBSCRIBED' ? 'Connected' : connectionStatus}
              </Typography>
            </Box>
            
            {/* Test Button */}
            <Button
              size="small"
              variant="outlined"
              onClick={testRealtime}
              sx={{ fontSize: '0.7rem', py: 0.5, px: 1 }}
            >
              Test RT
            </Button>
          </Box>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mt: 1 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
      </Box>

      {/* Messages List */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        <List sx={{ py: 0 }}>
          {messages.map((message) => (
            <ListItem key={message.id} sx={{ py: 0.5, alignItems: 'flex-start' }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%' }}>
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    mr: 1,
                    bgcolor: message.user_name === currentUser?.name ? '#106EBE' : '#76d7c4',
                    fontSize: '0.8rem',
                  }}
                >
                  {message.user_name?.charAt(0)?.toUpperCase() || 'A'}
                </Avatar>
                
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mr: 1 }}>
                      {message.user_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </Typography>
                  </Box>
                  
                  <Paper
                    elevation={1}
                    sx={{
                      p: 1.5,
                      bgcolor: message.user_name === currentUser?.name ? '#e3f2fd' : '#f5f5f5',
                      borderRadius: 2,
                      maxWidth: '80%',
                    }}
                  >
                    <Typography variant="body2">
                      {message.content}
                    </Typography>
                  </Paper>
                </Box>
              </Box>
            </ListItem>
          ))}
        </List>
        <div ref={messagesEndRef} />
      </Box>

      {/* Message Input */}
      <Box
        component="form"
        onSubmit={sendMessage}
        sx={{
          p: 2,
          borderTop: '1px solid #e0e0e0',
          bgcolor: '#f8f9fa',
          display: 'flex',
          gap: 1,
        }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          disabled={sending || connectionStatus !== 'SUBSCRIBED'}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
            },
          }}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={!newMessage.trim() || sending || connectionStatus !== 'SUBSCRIBED'}
          sx={{
            minWidth: 'auto',
            px: 2,
            borderRadius: 3,
            bgcolor: '#106EBE',
            '&:hover': { bgcolor: '#0d5aa7' },
          }}
        >
          {sending ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
        </Button>
      </Box>
    </Box>
  );
};

export default RealtimeChat;
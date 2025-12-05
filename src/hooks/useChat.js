import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import ChatService from '../services/ChatService';

export const useChat = () => {
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [messageStatuses, setMessageStatuses] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const subscriptionsRef = useRef([]);
  const onlineIntervalRef = useRef(null);

  // Initialize chat
  const initializeChat = useCallback(async () => {
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
      await ChatService.updateOnlineStatus(userData, true);
      
      // Fetch initial data
      const [messagesResult, onlineUsersResult, statusesResult] = await Promise.all([
        ChatService.getMessages(),
        ChatService.getOnlineUsers(),
        ChatService.getMessageStatuses()
      ]);

      if (messagesResult.error) {
        console.error('Error fetching messages:', messagesResult.error);
        setError('Failed to load messages');
      } else {
        setMessages(messagesResult.data || []);
      }

      if (onlineUsersResult.error) {
        console.error('Error fetching online users:', onlineUsersResult.error);
      } else {
        setOnlineUsers(onlineUsersResult.data || []);
      }

      if (statusesResult.error) {
        console.error('Error fetching message statuses:', statusesResult.error);
      } else {
        // Group statuses by message_id
        const statusMap = {};
        statusesResult.data?.forEach(status => {
          if (!statusMap[status.message_id]) {
            statusMap[status.message_id] = [];
          }
          statusMap[status.message_id].push(status);
        });
        setMessageStatuses(statusMap);
      }

    } catch (err) {
      console.error('Error initializing chat:', err);
      setError("Failed to load chat. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Set up real-time subscriptions
  const setupSubscriptions = useCallback((userData) => {
    // Messages subscription
    const messagesSubscription = ChatService.subscribeToMessages((payload) => {
      if (payload.eventType === "INSERT") {
        setMessages((prev) => [...prev, payload.new]);
      } else if (payload.eventType === "UPDATE") {
        setMessages((prev) => 
          prev.map(msg => msg.id === payload.new.id ? payload.new : msg)
        );
      } else if (payload.eventType === "DELETE") {
        setMessages((prev) => prev.filter(msg => msg.id !== payload.old.id));
      }
    });

    // Message status subscription
    const statusSubscription = ChatService.subscribeToMessageStatus(async () => {
      const result = await ChatService.getMessageStatuses();
      if (!result.error) {
        const statusMap = {};
        result.data?.forEach(status => {
          if (!statusMap[status.message_id]) {
            statusMap[status.message_id] = [];
          }
          statusMap[status.message_id].push(status);
        });
        setMessageStatuses(statusMap);
      }
    });

    // Online users subscription
    const onlineSubscription = ChatService.subscribeToOnlineUsers(async () => {
      const result = await ChatService.getOnlineUsers();
      if (!result.error) {
        setOnlineUsers(result.data || []);
      }
    });

    subscriptionsRef.current = [messagesSubscription, statusSubscription, onlineSubscription];

    // Set up periodic online status update
    onlineIntervalRef.current = setInterval(() => {
      if (userData) {
        ChatService.updateOnlineStatus(userData, true);
        ChatService.cleanupOfflineUsers();
      }
    }, 30000); // Every 30 seconds

  }, []);

  // Cleanup subscriptions
  const cleanup = useCallback(async () => {
    // Update offline status
    if (currentUser) {
      await ChatService.updateOnlineStatus(currentUser, false);
    }

    // Clear subscriptions
    subscriptionsRef.current.forEach(subscription => {
      ChatService.unsubscribe(subscription);
    });
    subscriptionsRef.current = [];

    // Clear interval
    if (onlineIntervalRef.current) {
      clearInterval(onlineIntervalRef.current);
      onlineIntervalRef.current = null;
    }
  }, [currentUser]);

  // Initialize on mount
  useEffect(() => {
    initializeChat().then(() => {
      if (currentUser) {
        setupSubscriptions(currentUser);
      }
    });

    return cleanup;
  }, []);

  // Update subscriptions when currentUser changes
  useEffect(() => {
    if (currentUser && !loading) {
      setupSubscriptions(currentUser);
    }
  }, [currentUser, loading, setupSubscriptions]);

  // Send message
  const sendMessage = useCallback(async (content, replyToId = null) => {
    if (!currentUser) {
      setError('You must be logged in to send messages');
      return { success: false, error: 'Not authenticated' };
    }

    const validation = ChatService.validateMessage(content);
    if (!validation.isValid) {
      setError(validation.error);
      return { success: false, error: validation.error };
    }

    const messageData = {
      content: validation.content,
      user_id: currentUser.id,
      user_name: currentUser.name,
      user_avatar_url: currentUser.avatar_url,
      reply_to_message_id: replyToId
    };

    const result = await ChatService.sendMessage(messageData);
    if (result.error) {
      setError('Failed to send message. Please try again.');
      return { success: false, error: result.error };
    }

    setError(null);
    return { success: true, data: result.data };
  }, [currentUser]);

  // Update message
  const updateMessage = useCallback(async (messageId, content) => {
    if (!currentUser) {
      setError('You must be logged in to edit messages');
      return { success: false, error: 'Not authenticated' };
    }

    const validation = ChatService.validateMessage(content);
    if (!validation.isValid) {
      setError(validation.error);
      return { success: false, error: validation.error };
    }

    const result = await ChatService.updateMessage(messageId, { content: validation.content });
    if (result.error) {
      setError('Failed to update message. Please try again.');
      return { success: false, error: result.error };
    }

    setError(null);
    return { success: true, data: result.data };
  }, [currentUser]);

  // Delete message
  const deleteMessage = useCallback(async (messageId) => {
    if (!currentUser) {
      setError('You must be logged in to delete messages');
      return { success: false, error: 'Not authenticated' };
    }

    const result = await ChatService.deleteMessage(messageId);
    if (result.error) {
      setError('Failed to delete message. Please try again.');
      return { success: false, error: result.error };
    }

    setError(null);
    return { success: true };
  }, [currentUser]);

  // Mark message as read
  const markMessageAsRead = useCallback(async (messageId) => {
    if (!currentUser) return;

    const result = await ChatService.markMessageAsRead(messageId, currentUser.id);
    if (result.error) {
      console.error('Error marking message as read:', result.error);
    }
  }, [currentUser]);

  // Get message status
  const getMessageStatus = useCallback((message) => {
    return ChatService.getMessageStatus(message, messageStatuses, onlineUsers, currentUser?.id);
  }, [messageStatuses, onlineUsers, currentUser]);

  return {
    // State
    messages,
    onlineUsers,
    messageStatuses,
    currentUser,
    loading,
    error,
    
    // Actions
    sendMessage,
    updateMessage,
    deleteMessage,
    markMessageAsRead,
    getMessageStatus,
    setError,
    
    // Utilities
    formatTime: ChatService.formatMessageTime
  };
};

export default useChat;
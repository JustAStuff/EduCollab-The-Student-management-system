import { supabase } from '../supabaseClient';

class ChatService {
  // Message operations
  static async sendMessage(messageData) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([messageData])
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error sending message:', error);
      return { data: null, error };
    }
  }

  static async updateMessage(messageId, updates) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .update({
          ...updates,
          is_edited: true,
          edited_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error updating message:', error);
      return { data: null, error };
    }
  }

  static async deleteMessage(messageId) {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error deleting message:', error);
      return { error };
    }
  }

  static async getMessages(limit = 100) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          reply_to:reply_to_message_id(id, content, user_name)
        `)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching messages:', error);
      return { data: null, error };
    }
  }

  // Message status operations
  static async markMessageAsRead(messageId, userId) {
    try {
      const { error } = await supabase
        .from('message_status')
        .upsert({
          message_id: messageId,
          user_id: userId,
          status: 'read',
          timestamp: new Date().toISOString()
        });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error marking message as read:', error);
      return { error };
    }
  }

  static async getMessageStatuses() {
    try {
      const { data, error } = await supabase
        .from('message_status')
        .select('*');

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching message statuses:', error);
      return { data: null, error };
    }
  }

  // Online users operations
  static async updateOnlineStatus(user, isOnline) {
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

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('online_users')
          .update({ 
            is_online: false,
            last_seen: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (error) throw error;
      }
      return { error: null };
    } catch (error) {
      console.error('Error updating online status:', error);
      return { error };
    }
  }

  static async getOnlineUsers() {
    try {
      const { data, error } = await supabase
        .from('online_users')
        .select('*')
        .eq('is_online', true);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching online users:', error);
      return { data: null, error };
    }
  }

  static async cleanupOfflineUsers() {
    try {
      const { error } = await supabase
        .from('online_users')
        .update({ is_online: false })
        .lt('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // 5 minutes ago
        .eq('is_online', true);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error cleaning up offline users:', error);
      return { error };
    }
  }

  // Real-time subscriptions
  static subscribeToMessages(callback) {
    return supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        callback
      )
      .subscribe();
  }

  static subscribeToMessageStatus(callback) {
    return supabase
      .channel('public:message_status')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_status' },
        callback
      )
      .subscribe();
  }

  static subscribeToOnlineUsers(callback) {
    return supabase
      .channel('public:online_users')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'online_users' },
        callback
      )
      .subscribe();
  }

  static unsubscribe(subscription) {
    if (subscription) {
      supabase.removeChannel(subscription);
    }
  }

  // Utility functions
  static formatMessageTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }

  static getMessageStatus(message, messageStatuses, onlineUsers, currentUserId) {
    if (!currentUserId || message.user_id !== currentUserId) return null;
    
    const statuses = messageStatuses[message.id] || [];
    const totalOnlineUsers = onlineUsers.filter(u => u.user_id !== currentUserId).length;
    
    if (totalOnlineUsers === 0) return 'sent';
    
    const readCount = statuses.filter(s => s.status === 'read').length;
    const deliveredCount = statuses.filter(s => s.status === 'delivered').length;
    
    if (readCount === totalOnlineUsers) return 'read';
    if (deliveredCount === totalOnlineUsers) return 'delivered';
    return 'sent';
  }

  static validateMessage(content) {
    if (!content || typeof content !== 'string') {
      return { isValid: false, error: 'Message content is required' };
    }
    
    const trimmedContent = content.trim();
    if (trimmedContent.length === 0) {
      return { isValid: false, error: 'Message cannot be empty' };
    }
    
    if (trimmedContent.length > 1000) {
      return { isValid: false, error: 'Message is too long (max 1000 characters)' };
    }
    
    return { isValid: true, content: trimmedContent };
  }
}

export default ChatService;
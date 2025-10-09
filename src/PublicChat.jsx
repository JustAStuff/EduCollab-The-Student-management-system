// src/PublicChat.js
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export default function PublicChat() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [username, setUsername] = useState('Guest' + Math.floor(Math.random() * 1000));

  // Fetch messages on load
  useEffect(() => {
    fetchMessages();

    const subscription = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true });
    setMessages(data);
  };

  const sendMessage = async () => {
    if (newMessage.trim().length === 0) return;
    await supabase.from('messages').insert([
      { content: newMessage, username }
    ]);
    setNewMessage('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') sendMessage();
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.header}>Public Chat</h3>
      <div style={styles.chatBox}>
        {messages.map((msg) => (
          <div key={msg.id} style={styles.message}>
            <strong>{msg.username}:</strong> {msg.content}
          </div>
        ))}
      </div>
      <div style={styles.inputArea}>
        <input
          style={styles.input}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Type a message..."
        />
        <button style={styles.button} onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: '400px',
    margin: 'auto',
    border: '1px solid #ccc',
    padding: '10px',
    borderRadius: '8px',
    fontFamily: 'Arial, sans-serif'
  },
  header: {
    textAlign: 'center'
  },
  chatBox: {
    height: '300px',
    overflowY: 'auto',
    border: '1px solid #eee',
    padding: '10px',
    marginBottom: '10px',
    background: '#f9f9f9'
  },
  message: {
    marginBottom: '8px'
  },
  inputArea: {
    display: 'flex'
  },
  input: {
    flexGrow: 1,
    padding: '8px'
  },
  button: {
    padding: '8px 12px'
  }
};

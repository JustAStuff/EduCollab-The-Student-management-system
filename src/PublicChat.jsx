// src/pages/PublicChat.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";

const PublicChat = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  // Fetch old messages
  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true });

      if (!error) setMessages(data);
    };
    fetchMessages();

    // Subscribe to new messages
    const subscription = supabase
      .channel("public:messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  // Send message
  const sendMessage = async () => {
    if (newMessage.trim() === "") return;
    const { error } = await supabase.from("messages").insert([
      {
        content: newMessage,
        user_name: "Guest", // Replace with logged-in username if you have auth
      },
    ]);
    if (!error) setNewMessage("");
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Public Chat
      </Typography>

      {/* Chat Messages */}
      <Paper sx={{ p: 2, mb: 2, height: "60vh", overflowY: "auto" }}>
        <List>
          {messages.map((msg) => (
            <ListItem key={msg.id}>
              <ListItemText
                primary={msg.user_name}
                secondary={msg.content}
              />
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* Input Box */}
      <Box sx={{ display: "flex", gap: 2 }}>
        <TextField
          fullWidth
          label="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <Button variant="contained" onClick={sendMessage}>
          Send
        </Button>
      </Box>
    </Box>
  );
};

export default PublicChat;

// src/pages/PublicChat.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
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

  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true });

      if (!error) setMessages(data);
    };
    fetchMessages();

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

  const sendMessage = async () => {
    if (newMessage.trim() === "") return;
    const { error } = await supabase.from("messages").insert([
      {
        content: newMessage,
        user_name: "Guest",
      },
    ]);
    if (!error) setNewMessage("");
  };

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f5f5f5",
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: "500px",
          bgcolor: "white",
          p: 3,
          boxShadow: 3,
          borderRadius: 2,
        }}
      >
        <Typography variant="h5" gutterBottom align="center">
          Public Chat
        </Typography>

        <Paper sx={{ p: 2, mb: 2, height: "400px", overflowY: "auto" }}>
          <List>
            {messages.map((msg) => (
              <ListItem key={msg.id}>
                <ListItemText primary={msg.user_name} secondary={msg.content} />
              </ListItem>
            ))}
          </List>
        </Paper>

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
    </Box>
  );
};

export default PublicChat;

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

}
export default PublicChat;

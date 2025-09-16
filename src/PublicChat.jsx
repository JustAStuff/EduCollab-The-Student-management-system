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
function App(){
  return (
    <div className="w-full flex h-screen justify-center items-center p-4">
      <div className="border-[1px] border-gray-700 max-w-6xl w-full min-h-[600px] rounded-lg">
        {/* Header */}
        <div className="flex justify-between h-20 border-b-[1px] border-gray-700"> 
          <div className="p-4" >
            <p className="text-gray-300">Sign in as name</p>
            <p className="text-gray-300 italic text-sm">3 users online</p>
          </div>
          <button className="m-2 sm:mr-4">Sing out</button>
        </div>
        {/* main chat */ }
        <div></div>
        {/*message input */}
        <form className="flex flex-col sm:flex-row p-4 border-t-[1px] border-gray-700">
          <input type ="text" placeholder="Type a message..." className="p-2 w-full bg-[#00000040] rounded-lg"/> 
          <button className="mt-4 sm:mt-0 sm:ml-8  text-white max-h-12"> Send</button>
        </form>
      </div>
    </div>
  );
};
} 
export default PublicChat;

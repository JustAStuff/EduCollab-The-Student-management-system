// src/CreateWorkspace.jsx
import React, { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  IconButton,
  Paper,
  CircularProgress,
} from "@mui/material";
import { Add, Delete } from "@mui/icons-material";
import Sidebar from "./Sidebar";
import LayoutContainer from "./components/layout/LayoutContainer";
import { supabase } from "./supabaseClient";

export default function CreateWorkspace() {
  const [workspaceName, setWorkspaceName] = useState("");
  const [description, setDescription] = useState("");
  const [emails, setEmails] = useState([""]); // start with one email box
  const [loading, setLoading] = useState(false);

  const addEmailField = () => setEmails([...emails, ""]);
  const removeEmailField = (index) => {
    if (emails.length > 1) {
      const updated = emails.filter((_, i) => i !== index);
      setEmails(updated);
    }
  };
  const handleEmailChange = (i, value) => {
    const updated = [...emails];
    updated[i] = value;
    setEmails(updated);
  };

  const sendInvites = async () => {
    setLoading(true);
    try {
      if (!workspaceName.trim()) {
        alert("Please enter a workspace name");
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        alert("Please log in to create a workspace");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        alert("Please log in to create a workspace");
        return;
      }

      const validEmails = emails.filter((email) => email.trim() !== "");

      // Use environment variable for functions URL with fallback
      const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL || 
                          `${import.meta.env.VITE_SUPABASE_URL || 'https://nwfaaiixizernafxdddm.supabase.co'}/functions/v1`;

      const res = await fetch(
        `${functionsUrl}/send-invite`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            workspaceName: workspaceName.trim(),
            description: description.trim(),
            userId: user.id,
            emails: validEmails.length > 0 ? validEmails : [], // Send empty array if no emails
          }),
        }
      );

      if (!res.ok) {
        let errorMessage = `HTTP error! status: ${res.status}`;
        
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          // If we can't parse JSON, try to get text
          try {
            const errorText = await res.text();
            errorMessage = errorText || errorMessage;
          } catch (textError) {
            // Use the status-based message
          }
        }

        // Handle specific error types
        if (res.status === 0 || res.status === 404) {
          throw new Error("Network error: Unable to connect to the server. Please check your internet connection and try again.");
        } else if (res.status === 403) {
          throw new Error("Authentication error: Please log out and log back in.");
        } else if (res.status === 500) {
          throw new Error("Server error: Please try again in a few moments.");
        } else {
          throw new Error(errorMessage);
        }
      }

      const data = await res.json();
      if (data.success) {
        alert(
          data.message || 
          `Workspace "${workspaceName}" created successfully! ${data.invitationsSent || 0} invitations sent.`
        );
        setWorkspaceName("");
        setDescription("");
        setEmails([""]);
      } else {
        alert("Error: " + (data.error || "Unknown error occurred"));
      }
    } catch (error) {
      console.error("Error creating workspace:", error);
      
      // Handle different types of errors with user-friendly messages
      let userMessage = "Failed to create workspace: ";
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        userMessage += "Network connection error. Please check your internet connection and try again.";
      } else if (error.message.includes('CORS')) {
        userMessage += "Connection error. Please refresh the page and try again.";
      } else if (error.message.includes('Network error')) {
        userMessage += error.message;
      } else {
        userMessage += error.message || "An unexpected error occurred. Please try again.";
      }
      
      alert(userMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="layout-container">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <LayoutContainer 
        maxWidth="xl" 
        padding="default"
        sx={{ 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center" 
        }}
      >
        <Paper className="layout-content-wrapper"
          sx={{
            minHeight: "80vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Typography variant="h6" gutterBottom>
            Create Workspace
          </Typography>

          {/* Workspace Name */}
          <TextField
            label="Workspace Name"
            fullWidth
            margin="normal"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
          />

          {/* Description */}
          <TextField
            label="Description"
            fullWidth
            margin="normal"
            multiline
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {/* Dynamic Emails */}
          <Typography variant="body2" sx={{ mt: 2, mb: 1 }}>
            Invite Team Members (Optional)
          </Typography>
          {emails.map((email, i) => (
            <Box key={i} sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <TextField
                label={`Email ${i + 1}`}
                fullWidth
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(i, e.target.value)}
                placeholder="Enter email address"
              />
              <IconButton
                onClick={addEmailField}
                sx={{ ml: 1, bgcolor: "#106EBE", color: "white" }}
                disabled={loading}
              >
                <Add />
              </IconButton>
              {emails.length > 1 && (
                <IconButton
                  onClick={() => removeEmailField(i)}
                  sx={{ ml: 1, bgcolor: "#f44336", color: "white" }}
                  disabled={loading}
                >
                  <Delete />
                </IconButton>
              )}
            </Box>
          ))}

          {/* Send Button */}
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
            <Button
              variant="contained"
              sx={{ bgcolor: "#106EBE", "&:hover": { bgcolor: "#0A4E82" } }}
              onClick={sendInvites}
              disabled={loading || !workspaceName.trim()}
              startIcon={
                loading ? <CircularProgress size={20} color="inherit" /> : null
              }
            >
              {loading ? "Creating..." : "Create Workspace"}
            </Button>
          </Box>
        </Paper>
      </LayoutContainer>
    </Box>
  );
}

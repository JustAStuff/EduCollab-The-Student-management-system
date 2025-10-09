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

      const res = await fetch(
        "https://nwfaaiixizernafxdddm.supabase.co/functions/v1/send-invite",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
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
        const errorText = await res.text();
        throw new Error(
          `HTTP error! status: ${res.status}, message: ${errorText}`
        );
      }

      const data = await res.json();
      if (data.success) {
        alert(
          `Workspace "${workspaceName}" created successfully! ${data.invitationsSent} invitations sent.`
        );
        setWorkspaceName("");
        setDescription("");
        setEmails([""]);
      } else {
        alert("Error: " + data.error);
      }
    } catch (error) {
      console.error("Error creating workspace:", error);
      alert("Failed to create workspace: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: "flex", height: "100vh", backgroundColor: "#F9FAFB" }}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 4 },
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width:"77vw",
        }}
      >
        <Paper
          sx={{
            p: { xs: 2, sm: 4 },
            borderRadius: "12px",
            width: "100%",
            maxWidth: "90vw", // keeps it from being too wide
            minHeight: "80vh",
            mx: "auto",
            display: "flex",
            flexDirection: "column",
            boxSizing: "border-box",
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
      </Box>
    </Box>
  );
}

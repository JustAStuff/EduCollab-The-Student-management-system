// src/AddMembers.jsx - Component for adding members to workspace
import { useState } from "react";
import { supabase } from "./supabaseClient";
import {
  Box,
  Button,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  CircularProgress,
} from "@mui/material";
import { Add, Delete } from "@mui/icons-material";

export default function AddMembers({ workspaceId, workspaceName, open, onClose, onSuccess }) {
  const [emails, setEmails] = useState([""]);
  const [loading, setLoading] = useState(false);

  // Add a new empty email field
  const addEmailField = () => setEmails([...emails, ""]);

  // Remove email field at index
  const removeEmailField = (index) => {
    if (emails.length > 1) {
      const updated = emails.filter((_, i) => i !== index);
      setEmails(updated);
    }
  };

  // Update email value at index
  const handleEmailChange = (i, value) => {
    const updated = [...emails];
    updated[i] = value;
    setEmails(updated);
  };

  // Send invitations
  const sendInvitations = async () => {
    setLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        alert("Please log in to send invitations");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("Please log in to send invitations");
        return;
      }

      const validEmails = emails.filter(email => email.trim() !== "");

      if (validEmails.length === 0) {
        alert("Please enter at least one email address");
        return;
      }

      // Send invitations using the same edge function
      const res = await fetch(
        "https://nwfaaiixizernafxdddm.supabase.co/functions/v1/send-invite",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            workspaceName: workspaceName,
            description: `You've been invited to join ${workspaceName}`,
            userId: user.id,
            emails: validEmails,
            workspaceId: workspaceId, // Pass existing workspace ID
          }),
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP error! status: ${res.status}, message: ${errorText}`);
      }

      const data = await res.json();
      if (data.success) {
        alert(`${data.invitationsSent} invitations sent successfully!`);
        setEmails([""]);
        onSuccess && onSuccess();
        onClose();
      } else {
        alert("Error: " + data.error);
      }
    } catch (error) {
      console.error("Error sending invitations:", error);
      alert("Failed to send invitations: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmails([""]);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Members to {workspaceName}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Enter email addresses to invite new members to this workspace.
        </Typography>

        {emails.map((email, i) => (
          <Box key={i} sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <TextField
              fullWidth
              label={`Email ${i + 1}`}
              type="email"
              value={email}
              onChange={(e) => handleEmailChange(i, e.target.value)}
              placeholder="Enter email address"
              disabled={loading}
            />
            <IconButton 
              onClick={addEmailField} 
              sx={{ ml: 1, color: "#106EBE" }}
              disabled={loading}
            >
              <Add />
            </IconButton>
            {emails.length > 1 && (
              <IconButton 
                onClick={() => removeEmailField(i)} 
                sx={{ ml: 1, color: "#f44336" }}
                disabled={loading}
              >
                <Delete />
              </IconButton>
            )}
          </Box>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={sendInvitations}
          disabled={loading || emails.every(email => email.trim() === "")}
          sx={{ bgcolor: "#106EBE", "&:hover": { bgcolor: "#0A4E82" } }}
        >
          {loading ? <CircularProgress size={20} color="inherit" /> : "Send Invitations"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
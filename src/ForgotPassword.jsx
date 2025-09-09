import React, { useState } from "react";
import { supabase } from "./supabaseClient";
import { TextField, Button, Typography, Alert } from "@mui/material";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage("Password reset email sent! Check your inbox.");
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "auto", paddingTop: "50px" }}>
      <Typography variant="h5" gutterBottom>
        Forgot Password
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          label="Email"
          fullWidth
          margin="normal"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Button type="submit" variant="contained" color="primary" fullWidth>
          Send Reset Link
        </Button>
      </form>
      {message && (
        <Alert severity="success" style={{ marginTop: "15px" }}>
          {message}
        </Alert>
      )}
      {error && (
        <Alert severity="error" style={{ marginTop: "15px" }}>
          {error}
        </Alert>
      )}
    </div>
  );
}

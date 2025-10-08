import { useState } from "react";
import {useNavigate} from "react-router-dom";
import { supabase } from "./supabaseClient";
import { TextField, Button, Typography, Alert } from "@mui/material";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  
  const navigate = useNavigate();
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
    } else {
      setMessage("Password successfully updated! You can now login.");
      navigate("/");
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "auto", alignItems:"center", paddingLeft:"500px" }}>
      <Typography variant="h5" gutterBottom>
        Reset Password
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          label="New Password"
          type="password"
          fullWidth
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <TextField
          label="Confirm Password"
          type="password"
          fullWidth
          margin="normal"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <Button type="submit" variant="contained" color="primary" fullWidth>
          Reset Password
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

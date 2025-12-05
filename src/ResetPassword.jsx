import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import LayoutContainer from "./components/layout/LayoutContainer";
import { Box, Card, CardContent, TextField, Button, Typography, Alert } from "@mui/material";

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
    <Box className="layout-container layout-flex-center">
      <LayoutContainer 
        maxWidth="md" 
        padding="default"
        sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}
      >
        <Card sx={{ width: 400, p: 3, margin: "auto" }}>
          <CardContent>
            <Typography variant="h5" gutterBottom align="center">
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
              <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>
                Reset Password
              </Button>
            </form>
            {message && (
              <Alert severity="success" sx={{ mt: 2 }}>
                {message}
              </Alert>
            )}
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </CardContent>
        </Card>
      </LayoutContainer>
    </Box>
  );
}

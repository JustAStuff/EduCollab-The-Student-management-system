import { useState } from "react";
import { supabase } from "./supabaseClient";
import LayoutContainer from "./components/layout/LayoutContainer";
import { Box, Card, CardContent, TextField, Button, Typography, Alert } from "@mui/material";

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
    <Box className="layout-container layout-flex-center">
      <LayoutContainer 
        maxWidth="md" 
        padding="default"
        sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}
      >
        <Card sx={{ width: 400, p: 3, margin: "auto" }}>
          <CardContent>
            <Typography variant="h5" gutterBottom align="center">
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
              <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>
                Send Reset Link
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

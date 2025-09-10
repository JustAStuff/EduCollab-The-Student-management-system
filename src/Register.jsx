import { useState } from "react";
import { supabase } from "./supabaseClient";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  IconButton,
  InputAdornment,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";

function Register() {
  const [formData, setFormData] = useState({
    registerNumber: "",
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    setLoading(true);

    // Step 1: Register in Supabase Auth
    const { error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        emailRedirectTo: "http://localhost:5173/",
      },
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    // Step 2: Store in Users table
    const { error: insertError } = await supabase.from("Users").insert([
      {
        register_number: parseInt(formData.registerNumber, 10),
        full_name: formData.fullName,
        email: formData.email,
      },
    ]);

    if (insertError) {
      console.error(insertError.message);
      alert("Error saving user profile: " + insertError.message);
      setLoading(false);
      return;
    }

    alert("Registration successful! Check your email to confirm.");
    setLoading(false);
    navigate("/");
  };

  return (
    <Box
      sx={{
        minHeight: "90vh",
        minWidth:"100vw",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        bgcolor: "#f5f5f5",
      }}
    >
      <Card sx={{margin: "auto", alignItems:"center", paddingLeft:"500px", width: 400, p: 3, maxHeight:"fit-content"}}>
        <CardContent>
          <Typography variant="h5" align="center" gutterBottom>
            Registration
          </Typography>
          <form onSubmit={handleSubmit}>
            <TextField
              type="number"
              name="registerNumber"
              label="Register Number"
              value={formData.registerNumber}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
            />
            <TextField
              type="text"
              name="fullName"
              label="Full Name"
              value={formData.fullName}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
            />
            <TextField
              type="email"
              name="email"
              label="College Email"
              value={formData.email}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
            />
            <TextField
              type={showPassword ? "text" : "password"}
              name="password"
              label="Password"
              value={formData.password}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              label="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      edge="end"
                    >
                      {showConfirmPassword ? (
                        <VisibilityOff />
                      ) : (
                        <Visibility />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{ mt: 2 }}
              disabled={loading}
            >
              {loading ? "Registering..." : "Register"}
            </Button>
          </form>
          <Typography
            variant="body2"
            align="center"
            sx={{ mt: 2 }}
            color="text.secondary"
          >
            Already a user?{" "}
            <a href="/" style={{ textDecoration: "none", color: "#1976d2" }}>
              Login
            </a>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}

export default Register;

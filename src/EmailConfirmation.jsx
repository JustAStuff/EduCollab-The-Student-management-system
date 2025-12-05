import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import LayoutContainer from './components/layout/LayoutContainer';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Button
} from '@mui/material';
import { CheckCircle, Error } from '@mui/icons-material';

export default function EmailConfirmation() {
  const [status, setStatus] = useState('confirming'); // 'confirming', 'success', 'error'
  const [message, setMessage] = useState('Confirming your email...');
  const navigate = useNavigate();

  useEffect(() => {
    const handleConfirmation = async () => {
      // Check if user is already signed in (tokens were processed by App.jsx)
      const { data: { session } } = await supabase.auth.getSession();
      
      console.log('🔍 Email Confirmation - Current session:', session);
      
      if (session && session.user) {
        console.log('✅ User already signed in via email confirmation!');
        setStatus('success');
        setMessage('Email confirmed successfully! You can now login to your account.');
        return;
      }

      // If no session, check URL for tokens (fallback)
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      
      const error = urlParams.get('error') || hashParams.get('error');
      const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');

      if (error) {
        console.log('❌ Error in URL:', error, errorDescription);
        setStatus('error');
        if (error === 'access_denied' && errorDescription?.includes('expired')) {
          setMessage('Email confirmation link has expired. Please request a new confirmation email.');
        } else {
          setMessage(`Confirmation failed: ${errorDescription || error}`);
        }
        return;
      }

      // If we get here, no session and no tokens - likely invalid link
      console.log('❌ No session and no valid tokens found');
      setStatus('error');
      setMessage('Invalid confirmation link. Please check your email and try again.');
    };

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('📧 EmailConfirmation - Auth event:', event, session?.user?.email);
      
      if (event === 'SIGNED_IN' && session) {
        console.log('✅ Email confirmation successful!');
        setStatus('success');
        setMessage('Email confirmed successfully! You can now login to your account.');
      }
    });

    handleConfirmation();

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = () => {
    navigate('/login');
  };

  const handleRegister = () => {
    navigate('/register');
  };

  return (
    <Box className="layout-container layout-flex-center">
      <LayoutContainer 
        maxWidth="md" 
        padding="default"
        sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}
      >
        <Card sx={{ maxWidth: 500, p: 3, boxShadow: 3, borderRadius: "16px" }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography
              variant="h5"
              sx={{ fontWeight: "bold", color: "#1976d2", mb: 3 }}
            >
              Email Confirmation
            </Typography>

            {status === 'confirming' && (
              <>
                <CircularProgress sx={{ mb: 3, color: "#1976d2" }} size={48} />
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  {message}
                </Typography>
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircle sx={{ fontSize: 64, color: "#4caf50", mb: 2 }} />
                <Alert severity="success" sx={{ mb: 3, borderRadius: "12px" }}>
                  {message}
                </Alert>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleLogin}
                  sx={{
                    bgcolor: "#1976d2",
                    "&:hover": { bgcolor: "#115293" },
                    borderRadius: "12px",
                    py: 1.2,
                    fontSize: "16px",
                    fontWeight: "bold"
                  }}
                >
                  Login Now
                </Button>
              </>
            )}

            {status === 'error' && (
              <>
                <Error sx={{ fontSize: 64, color: "#f44336", mb: 2 }} />
                <Alert severity="error" sx={{ mb: 3, borderRadius: "12px" }}>
                  {message}
                </Alert>
                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleLogin}
                    sx={{
                      bgcolor: "#1976d2",
                      "&:hover": { bgcolor: "#115293" },
                      borderRadius: "12px",
                      py: 1.2,
                    }}
                  >
                    Login
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={handleRegister}
                    sx={{
                      borderColor: "#1976d2",
                      color: "#1976d2",
                      "&:hover": { 
                        borderColor: "#115293",
                        backgroundColor: "rgba(25, 118, 210, 0.04)"
                      },
                      borderRadius: "12px",
                      py: 1.2,
                    }}
                  >
                    Register Again
                  </Button>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Having trouble? Contact support for assistance.
                </Typography>
              </>
            )}
          </CardContent>
        </Card>
      </LayoutContainer>
    </Box>
  );
}
// src/components/notifications/ToastNotification.jsx - Toast notification component
import { useState, useEffect } from 'react';
import {
  Snackbar,
  Alert,
  Box,
  IconButton,
  Typography,
  Slide
} from '@mui/material';
import {
  Close,
  CheckCircle,
  Info,
  Warning,
  Error
} from '@mui/icons-material';

function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function ToastNotification({ 
  maxToasts = 5,
  autoHideDuration = 5000,
  position = 'bottom-right'
}) {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToast = (event) => {
      const toast = event.detail;
      setToasts(prev => [...prev, toast]);
    };

    const handleToastRemove = (event) => {
      const { id } = event.detail;
      setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    window.addEventListener('kiro-toast', handleToast);
    window.addEventListener('kiro-toast-remove', handleToastRemove);

    return () => {
      window.removeEventListener('kiro-toast', handleToast);
      window.removeEventListener('kiro-toast-remove', handleToastRemove);
    };
  }, []);

  const handleClose = (toastId) => {
    setToasts(prev => prev.filter(toast => toast.id !== toastId));
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle />;
      case 'warning':
        return <Warning />;
      case 'error':
        return <Error />;
      default:
        return <Info />;
    }
  };

  const getSeverity = (type) => {
    switch (type) {
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'info';
    }
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        maxWidth: 400,
        width: '100%'
      }}
    >
      {toasts.map((toast, index) => (
        <Snackbar
          key={toast.id}
          open={true}
          TransitionComponent={SlideTransition}
          sx={{
            position: 'relative',
            transform: `translateY(-${index * 60}px)`,
            transition: 'transform 0.3s ease-in-out'
          }}
        >
          <Alert
            severity={getSeverity(toast.type)}
            icon={getIcon(toast.type)}
            action={
              <IconButton
                size="small"
                aria-label="close"
                color="inherit"
                onClick={() => handleClose(toast.id)}
              >
                <Close fontSize="small" />
              </IconButton>
            }
            sx={{
              width: '100%',
              boxShadow: 3,
              '& .MuiAlert-message': {
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }
            }}
          >
            <Typography variant="body2" component="span">
              {toast.message}
            </Typography>
          </Alert>
        </Snackbar>
      ))}
    </Box>
  );
}
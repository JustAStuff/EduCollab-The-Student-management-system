import React from 'react';
import {
  Box,
  Typography,
  Avatar,
  Chip,
  Tooltip,
  Badge
} from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';

const OnlineUsersList = ({ onlineUsers, maxVisible = 5 }) => {
  const visibleUsers = onlineUsers.slice(0, maxVisible);
  const remainingCount = onlineUsers.length - maxVisible;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <PersonIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
      <Typography variant="body2" color="text.secondary">
        {onlineUsers.length} online
      </Typography>
      
      {onlineUsers.length > 0 && (
        <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
          {visibleUsers.map((user) => (
            <Tooltip key={user.user_id} title={`${user.user_name} - Online`}>
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                badgeContent={
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: '#4caf50',
                      border: '1px solid white',
                      boxShadow: '0 0 0 1px rgba(0,0,0,0.1)'
                    }}
                  />
                }
              >
                <Avatar
                  src={user.user_avatar_url}
                  sx={{ 
                    width: 24, 
                    height: 24, 
                    fontSize: 12,
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'scale(1.1)'
                    }
                  }}
                >
                  {user.user_name?.[0]?.toUpperCase()}
                </Avatar>
              </Badge>
            </Tooltip>
          ))}
          
          {remainingCount > 0 && (
            <Tooltip title={`${remainingCount} more users online`}>
              <Chip
                label={`+${remainingCount}`}
                size="small"
                sx={{ 
                  height: 24, 
                  fontSize: 10,
                  bgcolor: 'primary.light',
                  color: 'primary.contrastText',
                  cursor: 'pointer'
                }}
              />
            </Tooltip>
          )}
        </Box>
      )}
    </Box>
  );
};

export default OnlineUsersList;
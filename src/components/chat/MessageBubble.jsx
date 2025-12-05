import React from 'react';
import {
  Box,
  Typography,
  Avatar,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Check as CheckIcon,
  DoneAll as DoneAllIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';

const MessageBubble = ({ 
  message, 
  isOwnMessage, 
  messageStatus, 
  formatTime, 
  onMenuClick,
  onMarkAsRead 
}) => {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent':
        return <CheckIcon sx={{ fontSize: 16, color: 'text.secondary' }} />;
      case 'delivered':
        return <DoneAllIcon sx={{ fontSize: 16, color: 'text.secondary' }} />;
      case 'read':
        return <DoneAllIcon sx={{ fontSize: 16, color: '#4fc3f7' }} />;
      default:
        return <ScheduleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />;
    }
  };

  return (
    <Box
      sx={{
        maxWidth: '70%',
        minWidth: '120px',
        backgroundColor: isOwnMessage ? '#dcf8c6' : 'white',
        borderRadius: '12px',
        p: 1.5,
        position: 'relative',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        border: '1px solid',
        borderColor: isOwnMessage ? '#c8e6c9' : '#e0e0e0',
        '&:hover': {
          boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
        }
      }}
      onMouseEnter={() => onMarkAsRead && onMarkAsRead(message.id)}
    >
      {/* Reply indicator */}
      {message.reply_to && (
        <Box
          sx={{
            backgroundColor: 'rgba(0,0,0,0.05)',
            borderLeft: '3px solid var(--color-primary)',
            borderRadius: '4px',
            p: 1,
            mb: 1,
            fontSize: '0.85em'
          }}
        >
          <Typography variant="caption" color="primary" fontWeight="medium">
            {message.reply_to.user_name}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            {message.reply_to.content.length > 50 
              ? message.reply_to.content.substring(0, 50) + '...'
              : message.reply_to.content
            }
          </Typography>
        </Box>
      )}

      {/* Message header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
        <Avatar
          src={message.user_avatar_url}
          sx={{ width: 20, height: 20, mr: 1, fontSize: 10 }}
        >
          {message.user_name?.[0]?.toUpperCase()}
        </Avatar>
        <Typography 
          variant="caption" 
          color="primary" 
          fontWeight="medium"
          sx={{ flexGrow: 1 }}
        >
          {message.user_name || 'Anonymous'}
        </Typography>
        {isOwnMessage && onMenuClick && (
          <Tooltip title="Message options">
            <IconButton
              size="small"
              onClick={(e) => onMenuClick(e, message)}
              sx={{ 
                ml: 1, 
                p: 0.25,
                opacity: 0.7,
                '&:hover': { opacity: 1 }
              }}
            >
              <MoreVertIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Message content */}
      <Typography 
        variant="body2" 
        sx={{ 
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
          mb: 0.5,
          lineHeight: 1.4
        }}
      >
        {message.content}
      </Typography>

      {/* Message footer */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'flex-end',
        gap: 0.5,
        mt: 0.5
      }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
          {formatTime(message.created_at)}
        </Typography>
        {message.is_edited && (
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
            (edited)
          </Typography>
        )}
        {isOwnMessage && messageStatus && (
          <Tooltip title={`Message ${messageStatus}`}>
            {getStatusIcon(messageStatus)}
          </Tooltip>
        )}
      </Box>
    </Box>
  );
};

export default MessageBubble;
import React from 'react';
import {
  Box,
  TextField,
  Button,
  IconButton,
  Typography
} from '@mui/material';
import {
  Send as SendIcon,
  Reply as ReplyIcon,
  Edit as EditIcon,
  Close as CloseIcon
} from '@mui/icons-material';

const MessageInput = ({
  message,
  setMessage,
  onSend,
  onKeyDown,
  loading,
  replyingTo,
  editingMessage,
  onCancelReply,
  onCancelEdit
}) => {
  const isReplying = Boolean(replyingTo);
  const isEditing = Boolean(editingMessage);
  const canSend = message.trim().length > 0 && !loading;

  return (
    <Box sx={{ flexShrink: 0 }}>
      {/* Reply/Edit indicator */}
      {(isReplying || isEditing) && (
        <Box sx={{ 
          backgroundColor: isEditing ? '#fff3e0' : '#e3f2fd',
          borderRadius: 'var(--border-radius-md)',
          p: 1,
          mb: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          border: '1px solid',
          borderColor: isEditing ? '#ffcc02' : '#2196f3'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {isReplying ? (
              <ReplyIcon sx={{ mr: 1, fontSize: 16, color: '#2196f3' }} />
            ) : (
              <EditIcon sx={{ mr: 1, fontSize: 16, color: '#ff9800' }} />
            )}
            <Box>
              <Typography variant="caption" fontWeight="medium">
                {isReplying ? `Replying to ${replyingTo.user_name}` : 'Editing message'}
              </Typography>
              {isReplying && (
                <Typography variant="caption" sx={{ display: 'block', opacity: 0.7 }}>
                  {replyingTo.content.length > 50 
                    ? replyingTo.content.substring(0, 50) + '...'
                    : replyingTo.content
                  }
                </Typography>
              )}
            </Box>
          </Box>
          <IconButton 
            size="small" 
            onClick={isReplying ? onCancelReply : onCancelEdit}
            sx={{ color: 'text.secondary' }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      )}

      {/* Input Area */}
      <Box sx={{ 
        display: "flex", 
        gap: 2, 
        alignItems: 'flex-end',
        pt: 2,
        borderTop: '1px solid var(--color-border)'
      }}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          label={isEditing ? "Edit message..." : "Type a message..."}
          placeholder={isReplying ? `Reply to ${replyingTo.user_name}...` : "Type a message..."}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={loading}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 'var(--border-radius-md)',
              backgroundColor: 'background.paper'
            }
          }}
        />
        <Button 
          variant="contained" 
          onClick={onSend}
          disabled={!canSend}
          startIcon={<SendIcon />}
          sx={{
            bgcolor: "var(--color-primary)",
            "&:hover": { bgcolor: "var(--color-primary-hover)" },
            "&:disabled": { 
              bgcolor: "action.disabled",
              color: "action.disabled"
            },
            borderRadius: "var(--border-radius-md)",
            px: 3,
            py: 1.5,
            minWidth: 100,
            height: 56,
            flexShrink: 0,
            textTransform: 'none',
            fontWeight: 'medium'
          }}
        >
          {isEditing ? 'Update' : 'Send'}
        </Button>
      </Box>
    </Box>
  );
};

export default MessageInput;
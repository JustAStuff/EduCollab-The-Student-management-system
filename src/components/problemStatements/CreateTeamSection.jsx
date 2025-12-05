import React from 'react';
import { Box, Typography, Button, Card, CardContent, Alert } from '@mui/material';
import { Rocket, WorkspacePremium } from '@mui/icons-material';

const CreateTeamSection = ({ onCreateTeam, disabled, disabledReason }) => {
  return (
    <Card 
      elevation={3}
      sx={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        mb: 3
      }}
    >
      <CardContent>
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <Rocket sx={{ fontSize: 48, mb: 2 }} />
          
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
            Start Your Own Team
          </Typography>
          
          <Typography variant="body1" sx={{ mb: 3, opacity: 0.9 }}>
            Don't see a team you want to join? Create your own team and lead this project!
          </Typography>

          {disabled && disabledReason && (
            <Alert severity="info" sx={{ mb: 2, textAlign: 'left' }}>
              {disabledReason}
            </Alert>
          )}

          <Button
            variant="contained"
            size="large"
            startIcon={<WorkspacePremium />}
            onClick={onCreateTeam}
            disabled={disabled}
            sx={{
              bgcolor: 'white',
              color: '#667eea',
              px: 4,
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 600,
              '&:hover': {
                bgcolor: '#f0f0f0',
              },
              '&:disabled': {
                bgcolor: '#cccccc',
                color: '#666666',
              }
            }}
          >
            Become Team Lead
          </Button>

          <Typography variant="caption" sx={{ display: 'block', mt: 2, opacity: 0.8 }}>
            As a team lead, you'll coordinate activities and review member applications
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default CreateTeamSection;

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Button,
  Chip,
  Collapse,
  IconButton,
  Alert,
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  WorkspacePremium,
  Group,
  CheckCircle,
  HourglassEmpty,
  Cancel,
} from '@mui/icons-material';

const TeamCard = ({ team, onJoinTeam, userApplication, isUserInTeam }) => {
  const [expanded, setExpanded] = useState(false);

  const getApplicationStatus = () => {
    if (isUserInTeam) {
      return { text: "You're in this team", color: 'success', icon: <CheckCircle /> };
    }
    if (!userApplication) return null;
    
    switch (userApplication.status) {
      case 'pending':
        return { text: 'Application Pending', color: 'warning', icon: <HourglassEmpty /> };
      case 'approved':
        return { text: 'Approved', color: 'success', icon: <CheckCircle /> };
      case 'rejected':
        return { text: 'Application Rejected', color: 'error', icon: <Cancel /> };
      default:
        return null;
    }
  };

  const status = getApplicationStatus();
  const canJoin = !isUserInTeam && (!userApplication || userApplication.status === 'rejected');

  return (
    <Card 
      elevation={2}
      sx={{ 
        mb: 2,
        border: isUserInTeam ? '2px solid #27ae60' : '1px solid #e0e0e0',
        '&:hover': { boxShadow: 4 }
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <WorkspacePremium sx={{ color: '#106EBE' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Team {team.team_id.substring(0, 8)}
              </Typography>
              <Chip 
                label={`${team.member_count} members`}
                size="small"
                color="primary"
                variant="outlined"
              />
            </Box>

            {team.lead && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Led by: {team.lead.user?.email?.split('@')[0] || 'Team Lead'}
              </Typography>
            )}

            {status && (
              <Alert 
                severity={status.color} 
                icon={status.icon}
                sx={{ mt: 1, py: 0 }}
              >
                {status.text}
              </Alert>
            )}
          </Box>

          <IconButton onClick={() => setExpanded(!expanded)} size="small">
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>

        <Collapse in={expanded}>
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e0e0e0' }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Team Members:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {team.members.map((member, index) => (
                <Chip
                  key={index}
                  label={member.user?.email?.split('@')[0] || 'Member'}
                  size="small"
                  icon={member.role === 'Lead' ? <WorkspacePremium /> : <Group />}
                  color={member.role === 'Lead' ? 'primary' : 'default'}
                />
              ))}
            </Box>

            {canJoin && (
              <Button
                variant="contained"
                color="success"
                fullWidth
                onClick={() => onJoinTeam(team.team_id)}
                sx={{ mt: 1 }}
              >
                Join as Member
              </Button>
            )}

            {userApplication && userApplication.status === 'rejected' && (
              <Alert severity="info" sx={{ mt: 2 }}>
                You were rejected from this team, but you can apply to other teams or create your own.
              </Alert>
            )}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default TeamCard;

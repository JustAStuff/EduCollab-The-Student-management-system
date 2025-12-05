import React from 'react';
import { Box, Typography, Alert } from '@mui/material';
import { Groups } from '@mui/icons-material';
import TeamCard from './TeamCard';

const TeamList = ({ teams, onJoinTeam, userApplications, currentUserId }) => {
  if (!teams || teams.length === 0) {
    return (
      <Alert severity="info" sx={{ mb: 3 }}>
        No teams yet! Be the first to create a team for this project.
      </Alert>
    );
  }

  const getUserApplicationForTeam = (teamId) => {
    return userApplications?.find(app => app.team_id === teamId);
  };

  const isUserInTeam = (team) => {
    return team.members.some(member => member.user_id === currentUserId);
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Groups sx={{ color: '#106EBE', fontSize: 28 }} />
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#106EBE' }}>
          Existing Teams ({teams.length})
        </Typography>
      </Box>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Click on a team to see members and join as a team member
      </Typography>

      {teams.map((team) => (
        <TeamCard
          key={team.team_id}
          team={team}
          onJoinTeam={onJoinTeam}
          userApplication={getUserApplicationForTeam(team.team_id)}
          isUserInTeam={isUserInTeam(team)}
        />
      ))}
    </Box>
  );
};

export default TeamList;

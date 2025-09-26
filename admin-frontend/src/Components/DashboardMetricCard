import React from 'react';
import { Paper, Box, Typography, Avatar } from '@mui/material';

// This is our new, modern metric card component
const DashboardMetricCard = ({ icon, title, value, color = 'primary' }) => {
  return (
    <Paper
      elevation={4}
      sx={{
        p: 3,
        borderRadius: '16px', // More rounded corners for a modern look
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        height: '100%',
        transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
        '&:hover': {
          transform: 'translateY(-5px)', // Subtle lift effect on hover
          boxShadow: '0 12px 20px -10px rgba(0, 0, 0, 0.2)',
        },
      }}
    >
      <Avatar
        sx={{
          bgcolor: `${color}.light`, // Use the light shade of the chosen color
          color: `${color}.main`,   // Use the main shade for the icon
          width: 60,
          height: 60,
        }}
      >
        {/* The icon you pass will be rendered here, scaled appropriately */}
        {React.cloneElement(icon, { sx: { fontSize: '2rem' } })}
      </Avatar>
      <Box>
        <Typography 
          variant="h5" 
          sx={{ 
            fontWeight: 'bold', 
            color: 'text.primary',
            lineHeight: 1.2 
          }}
        >
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
      </Box>
    </Paper>
  );
};

export default DashboardMetricCard;
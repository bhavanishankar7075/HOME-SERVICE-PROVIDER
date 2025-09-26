import React from 'react';
import { Box, Typography, keyframes } from '@mui/material';

// Define a clean spin animation using keyframes
const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

const AdminLoadingScreen = ({ message = 'Loading...' }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        width: '100%',
        bgcolor: '#f4f6f8', // A neutral, professional background
      }}
    >
      <Box
        sx={{
          width: 50,
          height: 50,
          borderRadius: '50%',
          border: '4px solid rgba(0, 0, 0, 0.1)', // Light grey track
          borderTopColor: 'primary.main', // Your theme's primary color
          animation: `${spin} 1s linear infinite`,
        }}
      />
      <Typography variant="h6" sx={{ mt: 3, color: 'text.secondary', letterSpacing: '1px' }}>
        {message}
      </Typography>
    </Box>
  );
};

export default AdminLoadingScreen;
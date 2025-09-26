import React from 'react';
import { Box, Typography, keyframes } from '@mui/material';
import serviceHubLogo from '../assets/service-hub-logo.png'; // Ensure this path is correct

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const scaleUp = keyframes`
  from { transform: scale(0.8); }
  to { transform: scale(1); }
`;

const pulseGlow = keyframes`
  0% { transform: scale(0.5); opacity: 0; }
  50% { opacity: 0.1; }
  100% { transform: scale(1.5); opacity: 0; }
`;

// <-- UPDATED to accept props
const LoadingScreen = ({ title, message }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        width: '100vw',
        position: 'fixed',
        top: 0,
        left: 0,
        bgcolor: '#f4f7f9',
        zIndex: 9999,
        animation: `${fadeIn} 0.5s ease-in-out`,
      }}
    >
      <Box sx={{ textAlign: 'center', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Box
          sx={{
            position: 'absolute',
            width: { xs: 250, md: 350 },
            height: { xs: 250, md: 350 },
            bgcolor: 'primary.main',
            borderRadius: '50%',
            zIndex: -1,
            animation: `${pulseGlow} 2s infinite ease-out`,
            opacity: 0,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            width: { xs: 250, md: 350 },
            height: { xs: 250, md: 350 },
            bgcolor: 'primary.main',
            borderRadius: '50%',
            zIndex: -1,
            animation: `${pulseGlow} 2s infinite ease-out`,
            animationDelay: '1s',
            opacity: 0,
          }}
        />
        <Box
          component="img"
          src={serviceHubLogo}
          alt="Loading Service Hub"
          sx={{
            width: { xs: 160, sm: 180 },
            height: { xs: 160, sm: 180 },
            objectFit: 'contain',
            animation: `${scaleUp} 0.8s 0.2s cubic-bezier(0.165, 0.84, 0.44, 1) both, ${fadeIn} 0.8s 0.2s ease-out both`,
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
            borderRadius: '50%',
            backgroundColor: 'white'
          }}
        />
      </Box>

      <Box sx={{
        textAlign: 'center',
        position: 'absolute',
        bottom: '10%',
        animation: `${fadeIn} 1s 0.8s ease-out both`
      }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 'bold',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: 'primary.main',
          }}
        >
          {/* // <-- UPDATED to use the title prop or a default */}
          {title || 'Service Hub'}
        </Typography>
        <Typography sx={{ color: 'text.secondary' }}>
          {/* // <-- UPDATED to use the message prop or a default */}
          {message || 'Connecting you to top services...'}
        </Typography>
      </Box>
    </Box>
  );
};

export default LoadingScreen;
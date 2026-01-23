import React from 'react';
import { Box, Typography, keyframes } from '@mui/material';
import serviceHubLogo from '../assets/service-hub-logo.png'; 

// Keyframes for the orbs spiraling in with more impact
const orbit = keyframes`
  0% {
    transform: rotate(0deg) translateX(200px) scale(0);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.2);
  }
  90% {
    opacity: 1;
  }
  100% {
    transform: rotate(360deg) translateX(0) scale(0);
    opacity: 0;
  }
`;

// Keyframes for the main logo reveal
const reveal = keyframes`
  from {
    transform: scale(0.7);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
`;

// A continuous, subtle breathing animation for after the reveal
const breath = keyframes`
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.03);
  }
`;

// A scanner/glare effect that sweeps across the logo
const scan = keyframes`
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
`;

const AdminLoadingScreen = ({ message = 'Loading...' }) => {
  const orbs = [0, 0.15, 0.3, 0.45, 0.6]; // Tighter animation delays

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        // A cleaner, brighter background
        bgcolor: '#f8fafd',
      }}
    >
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: 4 
        }}
      >
        <Box
          sx={{
            position: 'relative',
            width: { xs: 180, sm: 200, md: 220 }, // Increased size
            height: { xs: 180, sm: 200, md: 220 },
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            // Add the continuous breathing animation after the initial reveal
            animation: `${breath} 4s infinite ease-in-out`,
            animationDelay: '2s',
          }}
        >
          {/* The orbiting orbs that assemble */}
          {orbs.map((delay, index) => (
            <Box
              key={index}
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '10px',
                height: '10px',
                bgcolor: '#4F46E5', 
                borderRadius: '50%',
                animation: `${orbit} 1.8s forwards`, 
                animationDelay: `${delay}s`,
                opacity: 0, 
              }}
            />
          ))}

          {/* Your Service Hub Logo */}
          <Box
            component="img"
            src={serviceHubLogo}
            alt="Service Hub Admin"
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              borderRadius: '50%',
              boxShadow: '0 15px 40px rgba(0,0,0,0.12)',
              animation: `${reveal} 0.8s 1.2s cubic-bezier(0.165, 0.84, 0.44, 1) forwards`,
              opacity: 0,
              position: 'relative',
              overflow: 'hidden',
              // The scanner/glare effect
              '&::after': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '50%',
                height: '100%',
                background: 'linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%)',
                transform: 'skewX(-25deg)',
                animation: `${scan} 2.5s infinite ease-in-out`,
                animationDelay: '2.5s',
              }
            }}
          />
        </Box>

        <Typography
          variant="h6"
          sx={{
            color: 'text.secondary',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            fontWeight: 'medium',
            fontSize: '1rem',
            animation: `${reveal} 0.8s 1.8s cubic-bezier(0.165, 0.84, 0.44, 1) forwards`,
            opacity: 0,
          }}
        >
          {message}
        </Typography>
      </Box>
    </Box>
  );
};

export default AdminLoadingScreen;
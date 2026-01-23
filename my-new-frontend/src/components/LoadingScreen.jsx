import React from 'react';
import { Box, Typography, keyframes } from '@mui/material';
import serviceHubLogo from '../assets/service-hub-logo.png'; // Ensure your logo path is correct

// Keyframes for the orbs spiraling into the center
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

// Keyframes for the main logo reveal (fade and scale)
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

// Keyframes for the text fading in
const fadeInText = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const LoadingScreen = ({ title, message }) => {
  const orbs = [0, 0.15, 0.3, 0.45, 0.6]; // Animation delays for each orb

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
    background: 'radial-gradient(circle, #ffffff 0%, #f4f7f9 100%)',
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
            width: { xs: 180, sm: 200, md: 220 },
            height: { xs: 180, sm: 200, md: 220 },
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
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
                width: '12px',
                height: '12px',
                bgcolor: '#4F46E5',
                borderRadius: '50%',
                animation: `${orbit} 1.8s forwards`,
                animationDelay: `${delay}s`,
                opacity: 0,
              }}
            />
          ))}

          <Box
            component="img"
            src={serviceHubLogo}
            alt="Service Hub"
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              borderRadius: '50%',
              boxShadow: '0 15px 40px rgba(79, 70, 229, 0.15)',
              animation: `${reveal} 0.8s 1.2s cubic-bezier(0.165, 0.84, 0.44, 1) forwards`,
              opacity: 0,
            }}
          />
        </Box>

        <Box sx={{
          animation: `${fadeInText} 0.8s 1.8s ease-out forwards`,
          opacity: 0,
          textAlign: 'center',
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
            {title || 'Service Hub'}
          </Typography>
          <Typography sx={{ color: 'text.secondary', mt: 0.5 }}>
            {message || 'Connecting you to top services...'}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default LoadingScreen;
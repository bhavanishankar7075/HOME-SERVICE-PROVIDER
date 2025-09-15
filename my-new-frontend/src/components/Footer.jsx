import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Link, TextField, Button, IconButton, Snackbar, Alert, Stack, Divider, InputAdornment
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { 
  Facebook, Twitter, LinkedIn, Instagram, Email as EmailIcon, Phone as PhoneIcon, Hub as HubIcon 
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// --- BLACK THEME ---
const blackTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#03a9f4', // Vibrant light blue for accents
      dark: '#0276aa',
    },
    background: {
      default: '#000000',
      paper: 'linear-gradient(180deg, #1C1C1E 0%, #121212 100%)', // Subtle gradient
    },
    text: {
      primary: '#ffffff',
      secondary: '#b0bec5',
    },
    divider: 'rgba(255, 255, 255, 0.12)',
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
    h6: {
      fontWeight: 600,
    },
  },
});

// --- Data Constants ---
const QUICK_LINKS = [
  { path: '/services', label: 'Services' },
  { path: '/contact', label: 'Contact Us' },
  { path: '/about', label: 'About Us' },
  { path: '/faq', label: 'FAQ' },
];

const SOCIAL_LINKS = [
  { href: 'https://twitter.com', icon: <Twitter /> },
  { href: 'https://facebook.com', icon: <Facebook /> },
  { href: 'https://linkedin.com', icon: <LinkedIn /> },
  { href: 'https://instagram.com', icon: <Instagram /> },
];

const FooterComponent = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState({ open: false, text: '', severity: 'success' });
  const [emailError, setEmailError] = useState('');

  // All your logic (useEffect, handlers) remains unchanged
  useEffect(() => {
    const socket = io(API_URL, { reconnection: true });
    socket.on('connect', () => console.log('Footer socket connected'));
    socket.on('newNewsletterSubscription', ({ email }) => {
      console.log('Received newNewsletterSubscription:', email);
    });
    return () => socket.disconnect();
  }, []);

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    setEmailError('');
    try {
      await axios.post(`${API_URL}/api/newsletter`, { email });
      setMessage({ open: true, text: 'Subscribed successfully!', severity: 'success' });
      setEmail('');
      const socket = io(API_URL);
      socket.emit('newNewsletterSubscription', { email, subscribedAt: new Date() });
    } catch (error) {
      setMessage({
        open: true,
        text: error.response?.data?.message || 'Error subscribing to newsletter',
        severity: 'error'
      });
    }
  };

  return (
    <Box
      component="footer"
      sx={{
        background: blackTheme.palette.background.paper, // Apply gradient from theme
        color: 'text.secondary',
        py: { xs: 5, sm: 8 },
        px: { xs: 2, sm: 4 },
        mt: 'auto',
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Grid container spacing={{ xs: 4, md: 5 }} sx={{ maxWidth: '1280px', mx: 'auto' }}>
        <Grid item xs={12} md={4}>
          <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
            <HubIcon color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h5" color="text.primary" sx={{ fontWeight: 700 }}>
              ServiceHub
            </Typography>
          </Stack>
          <Typography variant="body2" sx={{ lineHeight: 1.7, mb: 3 }}>
            Connecting you with trusted home service professionals in Visakhapatnam for all your needs.
          </Typography>
          <Stack direction="row" spacing={1.5}>
            {SOCIAL_LINKS.map((social) => (
              <IconButton
                key={social.href}
                href={social.href}
                target="_blank"
                aria-label={social.href}
                sx={{
                  color: 'text.secondary',
                  transition: 'all 0.3s ease',
                  '&:hover': { 
                    color: 'primary.main',
                    transform: 'scale(1.1)',
                    boxShadow: `0 0 15px ${blackTheme.palette.primary.main}`,
                  }
                }}
              >
                {social.icon}
              </IconButton>
            ))}
          </Stack>
        </Grid>

        <Grid item xs={6} sm={4} md={2}>
          <Typography variant="h6" color="text.primary" gutterBottom>
            Navigate
          </Typography>
          <Stack spacing={1.5}>
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.path}
                href="#"
                onClick={(e) => { e.preventDefault(); navigate(link.path); }}
                color="inherit"
                underline="none"
                sx={{
                  transition: 'color 0.3s',
                  '&:hover': { color: 'primary.main' }
                }}
              >
                {link.label}
              </Link>
            ))}
          </Stack>
        </Grid>

        <Grid item xs={12} sm={4} md={3}>
          <Typography variant="h6" color="text.primary" gutterBottom>
            Contact Us
          </Typography>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <EmailIcon color="primary" sx={{ mr: 1.5, fontSize: 20 }} />
              <Link href="mailto:support@homeserviceprovider.com" color="inherit" underline="none">
                support@homeserviceprovider.com
              </Link>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <PhoneIcon color="primary" sx={{ mr: 1.5, fontSize: 20 }} />
              <span>+91 891-234-5678</span>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'start' }}>
              <Box component="span" sx={{ mr: 1.5, mt: 0.2, color: 'primary.main' }}>📍</Box>
              <span>456 Coastal Road, Visakhapatnam, Andhra Pradesh</span>
            </Box>
          </Stack>
        </Grid>
        
        <Grid item xs={12} sm={4} md={3}>
          <Typography variant="h6" color="text.primary" gutterBottom>
            Stay Updated
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Get the latest offers and tips directly in your inbox.
          </Typography>
          <Box component="form" onSubmit={handleNewsletterSubmit}>
            {/* --- UPDATED NEWSLETTER FORM --- */}
            <Stack direction="row">
              <TextField
                placeholder="Your Email"
                variant="outlined"
                size="small"
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={!!emailError}
                helperText={emailError}
                InputProps={{
                  startAdornment: (
                      <InputAdornment position="start">
                          <EmailIcon sx={{ color: 'text.secondary', ml: 0.5 }} />
                      </InputAdornment>
                  ),
                  sx: {
                    borderTopRightRadius: 0,
                    borderBottomRightRadius: 0,
                  }
                }}
              />
              <Button 
                type="submit" 
                variant="contained" 
                sx={{ 
                  borderTopLeftRadius: 0, 
                  borderBottomLeftRadius: 0, 
                  boxShadow: 'none',
                  px: 3, // Add padding for the text
                }}
              >
                Subscribe
              </Button>
            </Stack>
          </Box>
        </Grid>
      </Grid>
      
      <Divider sx={{ my: { xs: 4, sm: 6 } }} />
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="body2">
          &copy; {new Date().getFullYear()} ServiceHub. All Rights Reserved.
        </Typography>
      </Box>

      <Snackbar
        open={message.open}
        autoHideDuration={6000}
        onClose={() => setMessage({ ...message, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setMessage({ ...message, open: false })}
          severity={message.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {message.text}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// EXPORT THE COMPONENT WRAPPED IN THE THEME PROVIDER
const Footer = () => {
    return (
        <ThemeProvider theme={blackTheme}>
            <FooterComponent />
        </ThemeProvider>
    );
};

export default Footer;
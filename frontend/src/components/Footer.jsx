import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Link, TextField, Button, IconButton, Snackbar, Alert, Stack, Divider, InputAdornment, Container
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { 
  Facebook, Twitter, LinkedIn, Instagram, Email as EmailIcon, Phone as PhoneIcon, Hub as HubIcon 
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// LIGHT THEME to match your brand colors
const lightFooterTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#4F46E5', // Matching your Home page Indigo
    },
    background: {
      default: '#ffffff',
      paper: '#f8f9fa',
    },
    text: {
      primary: '#1a1a1b',
      secondary: '#5f6368',
    },
    divider: 'rgba(0, 0, 0, 0.08)',
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
    h6: {
      fontWeight: 600,
    },
  },
});

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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 100);
    const socket = io(API_URL, { reconnection: true });
    return () => {
      clearTimeout(timer);
      socket.disconnect();
    };
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
        background: '#f8f9fa',
        color: 'text.secondary',
        py: { xs: 5, sm: 8 },
        px: { xs: 2, sm: 4 },
        borderTop: '1px solid',
        borderColor: 'divider',
        opacity: isMounted ? 1 : 0,
        transition: 'opacity 0.5s ease-in-out',
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={{ xs: 4, md: 5 }}>
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
              {SOCIAL_LINKS.map((social, idx) => (
                <IconButton
                  key={idx}
                  href={social.href}
                  target="_blank"
                  sx={{
                    color: 'text.secondary',
                    transition: 'all 0.3s ease',
                    '&:hover': { 
                      color: 'primary.main',
                      transform: 'translateY(-3px)',
                    }
                  }}
                >
                  {social.icon}
                </IconButton>
              ))}
            </Stack>
          </Grid>

          <Grid item xs={6} sm={3} md={2}>
            <Typography variant="h6" color="text.primary" gutterBottom>
              Navigate
            </Typography>
            <Stack spacing={1.5}>
              {QUICK_LINKS.map((link) => (
                <Link
                  key={link.path}
                  component="button"
                  onClick={() => navigate(link.path)}
                  sx={{
                    color: 'inherit',
                    textDecoration: 'none',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    p: 0,
                    cursor: 'pointer',
                    transition: 'color 0.3s',
                    '&:hover': { color: 'primary.main' }
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </Stack>
          </Grid>

          <Grid item xs={12} sm={5} md={3}>
            <Typography variant="h6" color="text.primary" gutterBottom>
              Contact Us
            </Typography>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <EmailIcon color="primary" sx={{ mr: 1.5, fontSize: 20 }} />
                <Typography variant="body2">support@homeserviceprovider.com</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PhoneIcon color="primary" sx={{ mr: 1.5, fontSize: 20 }} />
                <Typography variant="body2">+91 891-234-5678</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'start' }}>
                <Typography sx={{ mr: 1.5, color: 'primary.main' }}>📍</Typography>
                <Typography variant="body2">456 Coastal Road, Visakhapatnam, Andhra Pradesh</Typography>
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
                  sx={{ bgcolor: 'white' }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon sx={{ color: 'text.secondary', ml: 0.5 }} />
                      </InputAdornment>
                    ),
                    sx: { borderTopRightRadius: 0, borderBottomRightRadius: 0 }
                  }}
                />
                <Button 
                  type="submit" 
                  variant="contained" 
                  sx={{ 
                    borderTopLeftRadius: 0, 
                    borderBottomLeftRadius: 0, 
                    boxShadow: 'none',
                    px: 3,
                  }}
                >
                  Subscribe
                </Button>
              </Stack>
            </Box>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 4 }} />
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2">
            &copy; {new Date().getFullYear()} ServiceHub. All Rights Reserved.
          </Typography>
        </Box>
      </Container>

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

const Footer = () => {
    return (
        <ThemeProvider theme={lightFooterTheme}>
            <FooterComponent />
        </ThemeProvider>
    );
};

export default Footer;
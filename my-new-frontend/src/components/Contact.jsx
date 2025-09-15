import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Button, Snackbar, Alert, Container, Grid, Divider
} from '@mui/material';
import axios from 'axios';
import io from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Contact = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [errors, setErrors] = useState({ name: '', email: '', message: '' });
  const [message, setMessage] = useState({ open: false, text: '', severity: 'success' });

  useEffect(() => {
    const socket = io(API_URL, { reconnection: true });
    socket.on('connect', () => console.log('Contact socket connected'));
    socket.on('newContactMessage', (contact) => {
      console.log('Received newContactMessage:', contact);
    });
    return () => socket.disconnect();
  }, []);

  const validateForm = () => {
    const newErrors = { name: '', email: '', message: '' };
    let isValid = true;

    if (!formData.name) {
      newErrors.name = 'Name is required';
      isValid = false;
    }
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Valid email is required';
      isValid = false;
    }
    if (!formData.message) {
      newErrors.message = 'Message is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const response = await axios.post(`${API_URL}/api/contact`, formData);
      setMessage({ open: true, text: response.data.message, severity: 'success' });
      setFormData({ name: '', email: '', message: '' });
      const socket = io(API_URL);
      socket.emit('newContactMessage', { ...formData, createdAt: new Date() });
    } catch (error) {
      setMessage({
        open: true,
        text: error.response?.data?.message || 'Error submitting inquiry',
        severity: 'error'
      });
    }
  };

  return (
    <Container sx={{ py: 4, mt: 8, overflowX: 'hidden' /* 64px for NavBar */ }}>
      <Typography variant="h4" gutterBottom sx={{ color: '#1a3c6b', fontWeight: 'bold', textAlign: 'center' }}>
        Contact Us
      </Typography>
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom sx={{ color: '#4a90e2' }}>
            Send Us a Message
          </Typography>
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Name"
              variant="outlined"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={!!errors.name}
              helperText={errors.name}
              fullWidth
              sx={{ '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#4a90e2' } }}
            />
            <TextField
              label="Email"
              variant="outlined"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={!!errors.email}
              helperText={errors.email}
              fullWidth
              sx={{ '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#4a90e2' } }}
            />
            <TextField
              label="Message"
              variant="outlined"
              multiline
              rows={4}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              error={!!errors.message}
              helperText={errors.message}
              fullWidth
              sx={{ '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#4a90e2' } }}
            />
            <Button
              type="submit"
              variant="contained"
              sx={{ bgcolor: '#4a90e2', '&:hover': { bgcolor: '#357abd', transform: 'scale(1.05)', transition: 'all 0.3s' } }}
            >
              Submit
            </Button>
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom sx={{ color: '#4a90e2' }}>
            Get in Touch
          </Typography>
          <Typography variant="body1" sx={{ mb: 1 }}>
            <strong>Email:</strong>{' '}
            <a href="mailto:support@homeserviceprovider.com" style={{ color: '#4a90e2', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
              support@homeserviceprovider.com
            </a>
          </Typography>
          <Typography variant="body1" sx={{ mb: 1 }}>
            <strong>Phone:</strong> +91 891-234-5678
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            <strong>Address:</strong> 456 Coastal Road, Visakhapatnam, Andhra Pradesh, India
          </Typography>
          <Divider sx={{ my: 2, bgcolor: '#4a90e2' }} />
          <Typography variant="h6" gutterBottom sx={{ color: '#4a90e2' }}>
            Find Us
          </Typography>
          <Box sx={{ height: '200px', borderRadius: 2, overflow: 'hidden' }}>
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3800.291263317695!2d83.2987083150836!3d17.686815987886255!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a39431389e6973f%3A0x3a5b1e0c0a7e8c9b!2sVisakhapatnam%2C%20Andhra%20Pradesh%2C%20India!5e0!3m2!1sen!2sin!4v1694567890123"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
            ></iframe>
          </Box>
        </Grid>
      </Grid>
      <Snackbar
        open={message.open}
        autoHideDuration={6000}
        onClose={() => setMessage({ ...message, open: false })}
        sx={{ '& .MuiSnackbarContent-root': { bgcolor: message.severity === 'success' ? '#4a90e2' : '#ff6b6b' } }}
      >
        <Alert
          onClose={() => setMessage({ ...message, open: false })}
          severity={message.severity}
          sx={{ width: '100%' }}
        >
          {message.text}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Contact;
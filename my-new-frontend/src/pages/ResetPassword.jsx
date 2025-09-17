import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setLoading, clearUser } from '../redux/authSlice';
import { Box, TextField, Button, Typography, Alert, Stack, CircularProgress, Link } from '@mui/material';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ResetPassword = () => {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLocalLoading] = useState(false); // Local state for UI
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLocalLoading(true);
    setError('');
    setSuccess('');
    dispatch(setLoading(true));
    try {
      if (newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }
      const response = await axios.post(`${API_URL}/api/users/reset-password`, { email, newPassword });
      setSuccess(response.data.message);
      dispatch(clearUser());
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      console.error('Reset password error:', err.response?.data || err.message);
      setError(err.response?.data?.message || err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLocalLoading(false);
      dispatch(setLoading(false));
    }
  };

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', p: 3, minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', textAlign: 'center', mb: 3 }}>
        Reset Password
      </Typography>
      <Typography variant="body2" sx={{ textAlign: 'center', mb: 3, color: 'text.secondary' }}>
        Enter your email and new password to reset your account.
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      <Box component="form" onSubmit={handleResetPassword}>
        <Stack spacing={2}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            variant="outlined"
            fullWidth
            required
            disabled={loading}
          />
          <TextField
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            variant="outlined"
            fullWidth
            required
            disabled={loading}
            error={newPassword && newPassword.length < 8}
            helperText={newPassword && newPassword.length < 8 ? 'Password must be at least 8 characters' : ''}
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={loading || newPassword.length < 8}
            sx={{ py: 1.5, fontWeight: 'bold' }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Reset Password'}
          </Button>
        </Stack>
      </Box>
      <Typography variant="body2" sx={{ mt: 3, textAlign: 'center' }}>
        Back to{' '}
        <Link component={RouterLink} to="/login" sx={{ fontWeight: 'bold' }}>
          Login
        </Link>
      </Typography>
      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography variant="caption">Debug: Loading: {loading.toString()}</Typography>
        <Typography variant="caption">Debug: Error: {error || 'None'}</Typography>
        <Typography variant="caption">Debug: API_URL: {API_URL}</Typography>
      </Box>
    </Box>
  );
};

export default ResetPassword;
import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loginFailure } from '../store/authSlice';
import { Box, TextField, Button, Typography, Alert, Stack, CircularProgress, Link } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AdminResetPassword = () => {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await axios.post(`${API_URL}/api/auth/admin/reset-password`, { email, newPassword });
      setSuccess(response.data.message);
      dispatch(loginFailure(null)); // Clear any existing login errors
      setTimeout(() => navigate('/admin/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', p: { xs: 2, sm: 3 }, width: '100%', boxSizing: 'border-box' }}>
      <Box sx={{ display: 'flex', justifyContent: { xs: 'flex-start', sm: 'flex-start', md: 'flex-start', lg: 'center', xl: 'center' }, mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/admin/dashboard')}
          sx={{ bgcolor: '#4a90e2', '&:hover': { bgcolor: '#357abd' }, borderRadius: 2 }}
        >
          Back to Dashboard
        </Button>
      </Box>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', textAlign: 'center', mb: 3 }}>
        Reset Admin Password
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
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
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={loading}
            sx={{ py: 1.5, fontWeight: 'bold' }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Reset Password'}
          </Button>
        </Stack>
      </Box>
      <Typography variant="body2" sx={{ mt: 3, textAlign: 'center' }}>
        Back to{' '}
        <Link component={RouterLink} to="/admin/login" sx={{ fontWeight: 'bold' }}>
          Login
        </Link>
      </Typography>
    </Box>
  );
};

export default AdminResetPassword;
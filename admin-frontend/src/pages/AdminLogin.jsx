import React, { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setLoading, setNeedsVerification, setError } from '../store/authSlice';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Stack,
  InputAdornment,
  CircularProgress,
  Link,
  Paper,
  // Container has been removed to allow for full width
} from '@mui/material';
import { EmailOutlined, LockOutlined, Hub as HubIcon } from '@mui/icons-material';
import axios from './axiosInstance';
import adminLoginImage from '../assets/service-hub-logo.png';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AdminLogin = () => {
  // --- All your existing logic remains untouched ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading, error, user, token } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin' && token) {
      const redirectTo = location.state?.from?.pathname || '/admin/dashboard';
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, user, token, navigate, location]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (!email || !password) {
      setLocalError('Please enter both email and password');
      return;
    }
    dispatch(setLoading(true));
    try {
      const response = await axios.post(`${API_URL}/api/auth/admin-login`, { email, password }, { withCredentials: true });
      const { needsVerification } = response.data;
      dispatch(setNeedsVerification(needsVerification));
      navigate('/admin/verify-otp', { state: { email }, replace: true });
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      setLocalError(errorMsg);
      dispatch(setError(errorMsg));
    } finally {
      dispatch(setLoading(false));
    }
  };

  return (
    <Box
      sx={{
        height: '100vh',
        width: '100vw',
        p: 2, // Adds a small padding around the entire screen
        background: 'linear-gradient(to right bottom, #e0e0e0, #fafafa)',
        boxSizing: 'border-box', // Ensures padding is included in the total height/width
      }}
    >
      <Paper
        elevation={8}
        sx={{
          display: 'grid',
          gridTemplateColumns: { md: '1fr 1fr' },
          borderRadius: 4,
          overflow: 'hidden',
          // **FIX**: Make the Paper fill the padded Box
          width: '100%',
          height: '100%',
        }}
      >
        {/* Left Side: Branded Panel */}
        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundImage: `url(${adminLoginImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              background: 'linear-gradient(135deg, rgba(3, 169, 244, 0.7) 30%, rgba(88, 86, 214, 0.7) 90%)',
              zIndex: 1,
            },
            color: 'white',
            textAlign: 'center',
            p: 4,
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 2 }}>
            <HubIcon sx={{ fontSize: 80, mb: 2 }} />
            <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
              ServiceHub
            </Typography>
            <Typography variant="h6">Admin Control Panel</Typography>
          </Box>
        </Box>
        {/* Right Side: Form */}
        <Box
          sx={{
            p: { xs: 3, sm: 4, md: 5 },
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            overflowY: 'auto',
          }}
        >
          <Box sx={{ maxWidth: 400, width: '100%', mx: 'auto' }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', textAlign: 'center', mb: 1, color: 'primary.main' }}>
              Admin Login
            </Typography>
            <Typography variant="body2" sx={{ textAlign: 'center', mb: 3, color: 'text.secondary' }}>
              Welcome back! Please enter your details.
            </Typography>
            {(error || localError) && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => { setLocalError(''); dispatch(setError(null)); }}>
                {error || localError}
              </Alert>
            )}
            <Box component="form" onSubmit={handleLogin}>
              <Stack spacing={2}>
                <TextField
                  margin="dense" label="Email" type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  variant="outlined" fullWidth required disabled={isLoading}
                  InputProps={{
                    startAdornment: (<InputAdornment position="start"><EmailOutlined color="action" /></InputAdornment>),
                  }}
                />
                <TextField
                  margin="dense" label="Password" type="password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  variant="outlined" fullWidth required disabled={isLoading}
                  InputProps={{
                    startAdornment: (<InputAdornment position="start"><LockOutlined color="action" /></InputAdornment>),
                  }}
                />
                <Button
                  type="submit" variant="contained" fullWidth size="large" disabled={isLoading}
                  sx={{ py: 1.5, fontWeight: 'bold' }}
                >
                  {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
                </Button>
              </Stack>
            </Box>
            <Stack direction="column" spacing={1} sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Need an account?{' '}
                <Link component={RouterLink} to="/admin/signup" sx={{ fontWeight: 'bold' }}>
                  Sign Up
                </Link>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Forgot password?{' '}
                <Link component={RouterLink} to="/admin/reset-password" sx={{ fontWeight: 'bold' }}>
                  Reset Password
                </Link>
              </Typography>
            </Stack>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default AdminLogin;

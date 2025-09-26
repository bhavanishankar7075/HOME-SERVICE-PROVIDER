import React, { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
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
  // Container has been removed
} from '@mui/material';
import { PersonOutline, EmailOutlined, PhoneOutlined, LockOutlined, Hub as HubIcon } from '@mui/icons-material';
import axios from './axiosInstance';
import adminSignupImage from '../assets/service-hub-logo.png';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AdminSignup = () => {
  // --- All your existing logic remains untouched ---
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, error, user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleSignup = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (!name || !email || !password) {
      setLocalError('Please fill in all required fields');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters long');
      return;
    }
    dispatch(setLoading(true));
    try {
      const response = await axios.post(`${API_URL}/api/auth/admin-signup`, { name, email, phone, password }, { withCredentials: true });
      const { needsVerification } = response.data;
      dispatch(setNeedsVerification(needsVerification));
      navigate('/admin/verify-otp', { state: { email }, replace: true });
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to sign up. Please try again.';
      setLocalError(errorMsg);
      dispatch(setError(errorMsg));
    } finally {
      dispatch(setLoading(false));
    }
  };

  // --- DESIGN FIXES ARE APPLIED BELOW ---
  return (
    <Box
      sx={{
        height: '100vh',
        width: '100vw',
        p: 2,
        background: 'linear-gradient(to right bottom, #e0e0e0, #fafafa)',
        boxSizing: 'border-box',
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
            backgroundImage: `url(${adminSignupImage})`,
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
            // **FIX**: Add vertical scroll only to the form if content overflows
            overflowY: 'auto',
          }}
        >
          <Box sx={{ maxWidth: 400, width: '100%', mx: 'auto' }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', textAlign: 'center', mb: 1, color: 'primary.main' }}>
              Create Admin Account
            </Typography>
            <Typography variant="body2" sx={{ textAlign: 'center', mb: 3, color: 'text.secondary' }}>
              Enter your details to get started.
            </Typography>
            {(error || localError) && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => { setLocalError(''); dispatch(setError(null)); }}>
                {error || localError}
              </Alert>
            )}
            <Box component="form" onSubmit={handleSignup}>
              {/* **FIX**: Made fields dense for a compact form */}
              <Stack spacing={1.5}>
                <TextField
                  margin="dense" label="Name" type="text" value={name}
                  onChange={(e) => setName(e.target.value)}
                  variant="outlined" fullWidth required disabled={isLoading}
                  InputProps={{ startAdornment: (<InputAdornment position="start"><PersonOutline color="action" /></InputAdornment>), }}
                />
                <TextField
                  margin="dense" label="Email" type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  variant="outlined" fullWidth required disabled={isLoading}
                  InputProps={{ startAdornment: (<InputAdornment position="start"><EmailOutlined color="action" /></InputAdornment>), }}
                />
                <TextField
                  margin="dense" label="Phone (Optional)" type="tel" value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  variant="outlined" fullWidth disabled={isLoading}
                  InputProps={{ startAdornment: (<InputAdornment position="start"><PhoneOutlined color="action" /></InputAdornment>), }}
                />
                <TextField
                  margin="dense" label="Password" type="password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  variant="outlined" fullWidth required disabled={isLoading}
                  InputProps={{ startAdornment: (<InputAdornment position="start"><LockOutlined color="action" /></InputAdornment>), }}
                />
                <Button
                  type="submit" variant="contained" fullWidth size="large" disabled={isLoading}
                  sx={{ py: 1.5, fontWeight: 'bold' }}
                >
                  {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
                </Button>
              </Stack>
            </Box>
            <Typography variant="body2" sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}>
              Already have an account?{' '}
              <Link component={RouterLink} to="/admin/login" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                Login
              </Link>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default AdminSignup;

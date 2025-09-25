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






























































































































//main
/* import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginStart, loginSuccess, loginFailure } from '../store/authSlice';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Grid,
  Stack,
  InputAdornment,
  CircularProgress,
  Link,
  Paper, // Added Paper for card effect
  Container, // Added Container for central alignment and max-width control
} from '@mui/material';
import { PersonOutline, EmailOutlined, LockOutlined, Hub as HubIcon } from '@mui/icons-material';
import axios from 'axios';

// Assuming you'll have an image for the admin signup side
import adminSignupImage from '../assets/service-hub-logo.png'; // Path to your admin signup image

const AdminSignup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  // --- No changes to your existing logic ---
  const handleSignup = async (e) => {
    e.preventDefault();
    dispatch(loginStart());
    try {
      const response = await axios.post('http://localhost:5000/api/auth/admin-signup', { name, email, password });
      // Assuming signup also returns a token and user object
      const { token, user } = response.data;
      dispatch(loginSuccess({ token, user }));
      localStorage.setItem('token', token);
      navigate('/admin/dashboard');
    } catch (err) {
      dispatch(loginFailure(err.response?.data?.message || 'Failed to sign up.'));
    }
  };
  // --- End of unchanged logic ---

  return (
    <Box
      sx={{
        // Outer container for the entire signup page
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // Adjust minHeight to account for a fixed navbar (e.g., 64px tall)
        minHeight: 'calc(100vh - 64px)',
        backgroundColor: (theme) => theme.palette.grey[100], // Light background for the page
        px: 2, // Horizontal padding for small screens
      }}
    >
      <Container maxWidth="md" disableGutters>
        <Paper
          elevation={8}
          sx={{
            display: 'grid',
            gridTemplateColumns: { md: '6fr 6fr' }, // Even split for admin, or adjust if needed
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' }, // Hidden on small screens
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              // Use an image for branding or keep the gradient
              backgroundImage: `url(${adminSignupImage})`, // New: Use an image
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              // Fallback/overlay for the image text
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(135deg, rgba(3, 169, 244, 0.7) 30%, rgba(88, 86, 214, 0.7) 90%)', // Darker gradient overlay
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

          <Box
            sx={{
              p: { xs: 3, sm: 4, md: 5 }, // Responsive padding
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <Box sx={{ maxWidth: 400, width: '100%', mx: 'auto' }}>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', textAlign: 'center', mb: 1, color: 'primary.main' }}>
                Create Admin Account
              </Typography>
              <Typography variant="body2" sx={{ textAlign: 'center', mb: 3, color: 'text.secondary' }}>
                Enter your details to get started.
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch(loginFailure(null))}>
                  {error}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSignup}>
                <Stack spacing={2}> 
                  <TextField
                    label="Name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    variant="outlined"
                    fullWidth
                    required
                    disabled={loading}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonOutline color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    variant="outlined"
                    fullWidth
                    required
                    disabled={loading}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailOutlined color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    variant="outlined"
                    fullWidth
                    required
                    disabled={loading}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockOutlined color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    size="large"
                    disabled={loading}
                    sx={{
                      py: 1.5,
                      fontWeight: 'bold',
                      bgcolor: 'primary.main', // Using theme primary color
                      '&:hover': {
                        bgcolor: 'primary.dark',
                      },
                    }}
                  >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign Up'}
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
      </Container>
    </Box>
  );
};

export default AdminSignup; */

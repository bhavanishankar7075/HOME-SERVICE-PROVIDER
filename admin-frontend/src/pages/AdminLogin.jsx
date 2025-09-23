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
  Container,
} from '@mui/material';
import { EmailOutlined, LockOutlined, Hub as HubIcon } from '@mui/icons-material';
import axios from './axiosInstance';
import adminLoginImage from '../assets/service-hub-logo.png';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading, error, user, token } = useSelector((state) => state.auth);

  useEffect(() => {
    console.log('AdminLogin: Current auth state:', { isAuthenticated, isLoading, error, user, token });
    console.log('AdminLogin: localStorage persist:root:', localStorage.getItem('persist:root'));
    if (isAuthenticated && user?.role === 'admin' && token) {
      const redirectTo = location.state?.from?.pathname || '/admin/dashboard';
      console.log('AdminLogin: User authenticated, navigating to:', redirectTo);
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
      console.log('AdminLogin: Sending login request', { email });
      const response = await axios.post(`${API_URL}/api/auth/admin-login`, { email, password }, { withCredentials: true });
      const { needsVerification } = response.data;
      console.log('AdminLogin: Login response:', response.data);
      dispatch(setNeedsVerification(needsVerification));
      navigate('/admin/verify-otp', { state: { email }, replace: true });
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      console.error('AdminLogin: Login failed', err);
      setLocalError(errorMsg);
      dispatch(setError(errorMsg));
    } finally {
      dispatch(setLoading(false));
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 64px)',
        backgroundColor: (theme) => theme.palette.grey[100],
        px: 2,
      }}
    >
      <Container maxWidth="md" disableGutters>
        <Paper
          elevation={8}
          sx={{
            display: 'grid',
            gridTemplateColumns: { md: '6fr 6fr' },
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
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
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
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
          <Box
            sx={{
              p: { xs: 3, sm: 4, md: 5 },
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
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
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch(setError(null))}>
                  {error || localError}
                </Alert>
              )}
              <Box component="form" onSubmit={handleLogin}>
                <Stack spacing={2}>
                  <TextField
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    variant="outlined"
                    fullWidth
                    required
                    disabled={isLoading}
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
                    disabled={isLoading}
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
                    disabled={isLoading}
                    sx={{
                      py: 1.5,
                      fontWeight: 'bold',
                      bgcolor: 'primary.main',
                      '&:hover': {
                        bgcolor: 'primary.dark',
                      },
                    }}
                  >
                    {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
                  </Button>
                </Stack>
              </Box>
              <Stack direction="column" spacing={1} sx={{ mt: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Need an account?{' '}
                  <Link component={RouterLink} to="/admin/signup" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    Sign Up
                  </Link>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Forgot password?{' '}
                  <Link component={RouterLink} to="/admin/reset-password" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    Reset Password
                  </Link>
                </Typography>
              </Stack>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default AdminLogin;











































































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
import { EmailOutlined, LockOutlined, Hub as HubIcon } from '@mui/icons-material';
import axios from 'axios';

const API_URL = import.meta.env.REACT_APP_API_URL || 'http://localhost:5000';
import adminLoginImage from '../assets/service-hub-logo.png'; // Assuming you have an admin specific image

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  // --- No changes to your existing logic ---
  const handleLogin = async (e) => {
    e.preventDefault();
    dispatch(loginStart());
    try {
      const response = await axios.post(`${API_URL}/api/auth/admin-login`, { email, password });
      const { token, user } = response.data;
      console.log('Login response:', response.data);
      dispatch(loginSuccess({ token, user }));
      localStorage.setItem('token', token);
      navigate('/admin/dashboard');
    } catch (err) {
      console.error('Login error:', err.response?.data || err.message);
      dispatch(loginFailure(err.response?.data?.message || 'Failed to login. Please check your credentials.'));
    }
  };
  // --- End of unchanged logic ---

  return (
    <Box
      sx={{
        // Outer container for the entire login page
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
            gridTemplateColumns: { md: '6fr 6fr' }, // Even split for admin, or you can adjust (e.g., 7fr 5fr)
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
              backgroundImage: `url(${adminLoginImage})`, // New: Use an image
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
              // Removed explicit width/minHeight from this Box, as parent Grid/Paper controls size
            }}
          >
            <Box sx={{ maxWidth: 400, width: '100%', mx: 'auto' }}>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', textAlign: 'center', mb: 1, color: 'primary.main' }}>
                Admin Login
              </Typography>
              <Typography variant="body2" sx={{ textAlign: 'center', mb: 3, color: 'text.secondary' }}>
                Welcome back! Please enter your details.
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch(loginFailure(null))}>
                  {error}
                </Alert>
              )}

              <Box component="form" onSubmit={handleLogin}>
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
                    type="password" // Consider adding a show/hide password toggle like in other forms
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
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
                  </Button>
                </Stack>
              </Box>
              <Stack direction="column" spacing={1} sx={{ mt: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Need an account?{' '}
                  <Link component={RouterLink} to="/admin/signup" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    Sign Up
                  </Link>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Forgot password?{' '}
                  <Link component={RouterLink} to="/admin/reset/password" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    Reset Password
                  </Link>
                </Typography>
              </Stack>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default AdminLogin; */

























































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
} from '@mui/material';
import { EmailOutlined, LockOutlined, Hub as HubIcon } from '@mui/icons-material';
import axios from 'axios';

const API_URL = import.meta.env.REACT_APP_API_URL || 'http://localhost:5000';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    dispatch(loginStart());
    try {
      const response = await axios.post(`${API_URL}/api/auth/admin-login`, { email, password });
      const { token, user } = response.data;
      console.log('Login response:', response.data);
      dispatch(loginSuccess({ token, user }));
      localStorage.setItem('token', token);
      navigate('/admin/dashboard');
    } catch (err) {
      console.error('Login error:', err.response?.data || err.message);
      dispatch(loginFailure(err.response?.data?.message || 'Failed to login. Please check your credentials.'));
    }
  };

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <Grid container sx={{ minHeight: 'calc(100vh - 64px)' }}>
        <Grid
          item
          xs={false}
          md={6}
          sx={{
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #03a9f4 30%, #5856d6 90%)',
            color: 'white',
            textAlign: 'center',
            p: 4,
            width: '800px',
          }}
        >
          <HubIcon sx={{ fontSize: 80, mb: 2 }} />
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
            ServiceHub
          </Typography>
          <Typography variant="h6">Admin Control Panel</Typography>
        </Grid>

        <Grid
          item
          xs={12}
          md={6}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: { xs: 2, sm: 4 },
            width: '600px',
            minHeight: '800px',
          }}
        >
          <Box
            sx={{
              width: '100%',
              maxWidth: 400,
              height: '500px',
              p: { xs: 3, sm: 4 },
              borderRadius: 2,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
            }}
          >
            <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', textAlign: 'center', mb: 1 }}>
              Admin Login
            </Typography>
            <Typography variant="body2" sx={{ textAlign: 'center', mb: 3, color: 'text.secondary' }}>
              Welcome back! Please enter your details.
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch(loginFailure(null))}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleLogin}>
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
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailOutlined />
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
                        <LockOutlined />
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
                    '& .MuiCircularProgress-root': {
                      marginRight: 1,
                    },
                  }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
                </Button>
              </Stack>
            </Box>
            <Typography variant="body2" sx={{ mt: 3, textAlign: 'center' }}>
              Need an account?{' '}
              <Link component={RouterLink} to="/admin/signup" sx={{ fontWeight: 'bold' }}>
                Sign Up
              </Link>
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
              Forgot password?{' '}
              <Link component={RouterLink} to="/admin/reset/password" sx={{ fontWeight: 'bold' }}>
                Reset Password
              </Link>
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminLogin; */










































































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
    Link
} from '@mui/material';
import { EmailOutlined, LockOutlined, Hub as HubIcon } from '@mui/icons-material';
import axios from 'axios';

// Note: This component does not use an external CSS file.
// You can remove the import for 'AdminLogin.css'.

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    dispatch(loginStart());
    try {
      const response = await axios.post('http://localhost:5000/api/auth/admin-login', { email, password });
      const { token, user } = response.data;
      dispatch(loginSuccess({ token, user }));
      localStorage.setItem('token', token);
      navigate('/admin/dashboard');
    } catch (err) {
      dispatch(loginFailure(err.response?.data?.message || 'Failed to login. Please check your credentials.'));
    }
  };

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <Grid container sx={{ minHeight: 'calc(100vh - 64px)' }}> 
        <Grid 
          item 
          xs={false} 
          md={6}
          sx={{
              display: { xs: 'none', md: 'flex' },
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #03a9f4 30%, #5856d6 90%)',
              color: 'white',
              textAlign: 'center',
              p: 4,
              width: '800px'
          }}
        >
          <HubIcon sx={{ fontSize: 80, mb: 2 }} />
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
              ServiceHub
          </Typography>
          <Typography variant="h6">
              Admin Control Panel
          </Typography>
        </Grid>

        <Grid 
          item 
          xs={12} 
          md={6} 
          sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              p: { xs: 2, sm: 4 },
              width:'600px',
              minHeight:'800px'
          }}
        >
          <Box
            sx={{
              width: '100%',
              maxWidth: 400,
              height:'500px',
              p: { xs: 3, sm: 4 },
              borderRadius: 2,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
            }}
          >
            <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', textAlign: 'center', mb: 1 }}>
              Admin Login
            </Typography>
            <Typography variant="body2" sx={{ textAlign: 'center', mb: 3, color: 'text.secondary' }}>
              Welcome back! Please enter your details.
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Box component="form" onSubmit={handleLogin}>
              <Stack spacing={8}>
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
                        <EmailOutlined />
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
                        <LockOutlined />
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
                      // Restoring original loading text as per earlier request
                      '& .MuiCircularProgress-root': {
                        marginRight: 1,
                      }
                  }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
                </Button>
              </Stack>
            </Box>
            <Typography variant="body2" sx={{ mt: 3, textAlign: 'center' }}>
              Need an account?{' '}
              <Link component={RouterLink} to="/admin/signup" sx={{ fontWeight: 'bold' }}>
                Sign Up
              </Link>
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminLogin; */


import React, { useState } from 'react';
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
        {/* Visual Side (Left) */}
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

        {/* Form Side (Right) */}
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


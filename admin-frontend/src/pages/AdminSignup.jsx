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
    Link
} from '@mui/material';
import { PersonOutline, EmailOutlined, LockOutlined, Hub as HubIcon } from '@mui/icons-material';
import axios from 'axios';

// Note: This component does not use an external CSS file.
// You can remove the import for 'AdminSignup.css'.

const AdminSignup = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const dispatch = useDispatch();
    const { loading, error } = useSelector((state) => state.auth);
    const navigate = useNavigate();

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

    return (
        <Box sx={{ width: '100%', height: '100%' }}>
            <Grid container sx={{ minHeight: 'calc(100vh - 64px)' }}> {/* Adjust 64px based on your Navbar height */}

                {/* 1. Visual Side (Left) */}
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

                {/* 2. Form Side (Right) */}
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
                        minHeight: '800px'
                    }}
                >
                    <Box
                        sx={{
                            width: '100%',
                            maxWidth: 400,
                            p: { xs: 3, sm: 4 },
                            borderRadius: 2,
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                        }}
                    >
                        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', textAlign: 'center', mb: 1 }}>
                            Create Admin Account
                        </Typography>
                        <Typography variant="body2" sx={{ textAlign: 'center', mb: 3, color: 'text.secondary' }}>
                            Enter your details to get started.
                        </Typography>

                        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                        <Box component="form" onSubmit={handleSignup}>
                            <Stack spacing={8}>
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
                                                <PersonOutline />
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
                                        transition: 'transform 0.2s',
                                        '&:hover': { transform: 'scale(1.02)' }
                                    }}
                                >
                                    {loading ? <CircularProgress size={26} color="inherit" /> : 'Sign Up'}
                                </Button>
                            </Stack>
                        </Box>
                        <Typography variant="body2" sx={{ mt: 3, textAlign: 'center' }}>
                            Already have an account?{' '}
                            <Link component={RouterLink} to="/admin/login" sx={{ fontWeight: 'bold' }}>
                                Login
                            </Link>
                        </Typography>
                    </Box>
                </Grid>
            </Grid>
        </Box>
    );
};

export default AdminSignup;




























/* import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginStart, loginSuccess, loginFailure } from '../store/authSlice';
import { Box, TextField, Button, Typography, Alert } from '@mui/material';
import axios from 'axios';
import '../styles/AdminSignup.css';

const AdminSignup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    dispatch(loginStart());
    try {
      const response = await axios.post('http://localhost:5000/api/auth/admin-signup', { name, email, password });
      dispatch(loginSuccess(response.data));
      localStorage.setItem('token', response.data.token);
      navigate('/admin/dashboard');
    } catch (err) {
      dispatch(loginFailure(err.response?.data?.message || err.message));
    }
  };

  return (
    <Box className="signup-container">
      <Box className="signup-card">
        <Typography variant="h4" className="signup-title">
          Admin Signup
        </Typography>
        {error && <Alert severity="error" className="signup-error">{error}</Alert>}
        <form onSubmit={handleSignup} className="signup-form">
          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            variant="outlined"
            fullWidth
            margin="normal"
            required
            disabled={loading}
          />
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            variant="outlined"
            fullWidth
            margin="normal"
            required
            disabled={loading}
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            variant="outlined"
            fullWidth
            margin="normal"
            required
            disabled={loading}
          />
          <Button type="submit" variant="contained" className="signup-button" disabled={loading}>
            {loading ? 'Signing up...' : 'Signup'}
          </Button>
          <Typography className="signup-link" onClick={() => navigate('/admin/login')}>
            Already have an account? Login
          </Typography>
        </form>
      </Box>
    </Box>
  );
};

export default AdminSignup; */
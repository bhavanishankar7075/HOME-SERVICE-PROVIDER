import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import axios from 'axios';
import { setUser, setLoading } from '../redux/authSlice';
import {
  Box, TextField, Button, Typography, Alert, CircularProgress, Link, Grid, Paper, IconButton, InputAdornment,
} from '@mui/material';
import { Visibility, VisibilityOff, EmailOutlined, LockOutlined } from '@mui/icons-material';
import loginImg from '../assets/login-image.jpg'

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isLoading, token } = useSelector((state) => state.auth);

  useEffect(() => {
    if (user && token) {
      const role = user.role || 'customer';
      navigate(role === 'provider' ? '/provider/dashboard' : '/home');
    }
  }, [user, token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    dispatch(setLoading(true));
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', { email, password });
      const { token: responseToken, user: userData } = response.data;
      const profileRes = await axios.get('http://localhost:5000/api/users/profile', {
        headers: { Authorization: `Bearer ${responseToken}` },
      });
      const fullUserData = { ...profileRes.data };
      dispatch(setUser({ user: fullUserData, token: responseToken }));
      localStorage.setItem('token', responseToken);
      localStorage.setItem('user', JSON.stringify(fullUserData));
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Login failed. Please check your credentials.';
      setError(errorMsg);
    } finally {
      dispatch(setLoading(false));
    }
  };

  if (isLoading && !user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Logging in...</Typography>
      </Box>
    );
  }

  if (user) {
    return null; 
  }

  return (
    <Box sx={{ pt: { xs: 8, md: 10 } }}>
      <Grid container component="main" sx={{ height: { xs: 'auto', md: 'calc(100vh - 80px)' } }}>
        <Grid
          item
          xs={false}
          sm={4}
          md={7}
          sx={{
            backgroundImage: `url(${loginImg})`,
            backgroundRepeat: 'no-repeat',
            backgroundColor: (t) => t.palette.mode === 'light' ? t.palette.grey[50] : t.palette.grey[900],
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <Grid item xs={12} sm={8} md={5} component={Paper} elevation={6} square>
          <Box
            sx={{
              my: 8,
              mx: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Typography component="h1" variant="h4" sx={{ fontWeight: 'bold', color: '#4F46E5' }}>
              ServiceHub
            </Typography>
            <Typography component="h2" variant="h5" sx={{ mt: 2, fontWeight: 'medium' }}>
              Welcome Back
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Sign in to continue to your account.
            </Typography>
            
            {error && (
              <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailOutlined />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlined />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={isLoading}
                sx={{ 
                  mt: 3, 
                  mb: 2, 
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  bgcolor: '#4F46E5',
                  '&:hover': {
                      bgcolor: '#4338CA',
                  }
                }}
              >
                {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
              </Button>
              <Grid container>
                <Grid item xs>
                  <Link component={RouterLink} to="/forgot-password" variant="body2" sx={{ color: '#4F46E5' }}>
                    Forgot password?
                  </Link>
                </Grid>
                <Grid item>
                  <Typography variant="body2" color="text.secondary">
                    Don't have an account?{" "}
                    <Link component={RouterLink} to="/register" variant="body2" sx={{ fontWeight: 'bold', color: '#4F46E5' }}>
                      Sign Up
                    </Link>
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Login;








































/* import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { setUser, setLoading } from '../redux/authSlice';
import { Box, TextField, Button, Typography, Alert, CircularProgress, Link } from '@mui/material';
import '../styles/Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isLoading, token } = useSelector((state) => state.auth);

  useEffect(() => {
    if (user && token) {
      console.log('User authenticated, navigating:', { user, token });
      console.log('LocalStorage token:', localStorage.getItem('token'));
      const role = user.role || 'customer';
      navigate(role === 'provider' ? '/provider/dashboard' : '/home');
    }
  }, [user, token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    dispatch(setLoading(true));
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', { email, password }, {
        headers: { 'Content-Type': 'application/json' },
      });
      console.log('Login response (full):', response.data);

      if (response.data && response.data.token && response.data.user) {
        const { token, user: userData } = response.data;
        const profileRes = await axios.get('http://localhost:5000/api/users/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const fullUserData = {
          ...profileRes.data,
          _id: profileRes.data._id,
        };
        dispatch(setUser({ user: fullUserData, token }));
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(fullUserData));
        console.log('Stored in localStorage:', { token, user: fullUserData });
      } else {
        setError('Invalid response from server: Missing token or user data');
      }
    } catch (err) {
      console.error('Login error details:', err.response ? err.response.data : err.message);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message;
      setError(
        errorMsg ||
        (err.response?.status === 401
          ? 'Unauthorized: Please check your credentials or change your password.'
          : err.response?.status === 500
          ? 'Server error. Please try again later or contact support.'
          : err.response?.status === 429
          ? 'Too many login attempts. Please try again later.'
          : 'Login failed. Please try again.')
      );
    } finally {
      dispatch(setLoading(false));
    }
  };

  if (isLoading && !user) {
    return (
      <Box className="loading-container">
        <CircularProgress size={40} sx={{ color: '#00acc1' }} />
        <Typography variant="body1" sx={{ ml: 2, color: '#004d40' }}>Logging in...</Typography>
      </Box>
    );
  }

  if (user) {
    return null; // Redirect handled by useEffect
  }

  return (
    <Box className="pt-20 login-page">
      <Box className="login-container">
        <Box className="login-card animate-fade-in">
          <Typography variant="h4" className="login-title">
            Login to ServiceHub
          </Typography>
          <Typography variant="body1" className="login-subtitle">
            Access your account to book top-quality home services.
          </Typography>
          {error && (
            <Alert severity="error" className="login-error">
              {error}
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="login-form">
            <TextField
              label="Email"
              variant="outlined"
              fullWidth
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="login-input"
              required
              aria-label="Email address"
              InputProps={{
                className: 'login-input-field',
              }}
            />
            <TextField
              label="Password"
              type="password"
              variant="outlined"
              fullWidth
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login-input"
              required
              aria-label="Password"
              InputProps={{
                className: 'login-input-field',
              }}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              className="login-button"
              disabled={isLoading}
              aria-label="Login"
            >
              {isLoading ? <CircularProgress size={24} sx={{ color: '#ffffff' }} /> : 'Login'}
            </Button>
            <Box className="login-links">
              <Link
                component="button"
                variant="body2"
                className="forgot-password"
                onClick={() => navigate('/forgot-password')}
                aria-label="Forgot password"
              >
                Forgot Password?
              </Link>
              <Typography variant="body2" className="signup-text">
                Don’t have an account?{' '}
                <Link
                  component="button"
                  variant="body2"
                  className="signup-link"
                  onClick={() => navigate('/register')}
                  aria-label="Sign up"
                >
                  Sign Up
                </Link>
              </Typography>
            </Box>
          </form>
        </Box>
      </Box>
    </Box>
  );
}

export default Login;  */
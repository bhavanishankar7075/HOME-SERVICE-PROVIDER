import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import axios from 'axios';
import { setUser, setLoading } from '../redux/authSlice';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Link,
  Grid,
  Paper,
  IconButton,
  InputAdornment,
  Container, // Added for better content alignment
} from '@mui/material';
import { Visibility, VisibilityOff, EmailOutlined, LockOutlined } from '@mui/icons-material';
import loginImg from '../assets/login-image.png';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isLoading, token } = useSelector((state) => state.auth);

  // --- No changes to your existing logic ---
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
      const { token: responseToken } = response.data;
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
  // --- End of unchanged logic ---

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

  // --- NEW and IMPROVED Design Structure ---
  return (
    <Box
      sx={{
        // Use flexbox to center the login card vertically and horizontally
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // Set minimum height to the full viewport height minus your navbar's height
        // This creates the gap at the top. Assuming a 64px navbar. Adjust if needed.
        minHeight: 'calc(120vh - 64px)',
        backgroundColor: (theme) => theme.palette.grey[100], // A subtle background color
        px: 2, // Add horizontal padding on small screens
      }}
    >
      <Container maxWidth="lg" disableGutters>
        <Paper
          elevation={8}
          sx={{
            // Use Grid for the two-column layout
            display: 'grid',
            // On medium screens and up: Image (7/12) and Form (5/12)
            gridTemplateColumns: { md: '3fr 5fr' },
            borderRadius: 4, // Softer, rounded corners
            overflow: 'hidden', // Ensures the image corners are also rounded
          }}
        >
          {/* Section 1: Image (Visible on medium screens and up) */}
          <Box
            sx={{
              display: { xs: 'none', md: 'block' },
              backgroundImage: `url(${loginImg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />

          {/* Section 2: Login Form */}
          <Box
            sx={{
              p: { xs: 3, sm: 4, md: 6 }, // Responsive padding
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center', // Vertically centers the form content
            }}
          >
            <Box sx={{ maxWidth: 400, width: '100%', mx: 'auto' }}>
              <Typography component="h1" variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main', textAlign: 'center' }}>
                ServiceHub
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ mt: 1, mb: 4, textAlign: 'center' }}>
                Welcome Back!
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
                        <EmailOutlined color="action" />
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
                        <LockOutlined color="action" />
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
                    // Use theme colors for consistency
                    bgcolor: 'primary.main',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                  }}
                >
                  {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
                </Button>
                <Grid container justifyContent="space-between">
                  <Grid item>
                    <Link component={RouterLink} to="/reset/password" variant="body2" sx={{ color: 'primary.main' }}>
                      Forgot password?
                    </Link>
                  </Grid>
                  <Grid item>
                    <Typography variant="body2" color="text.secondary">
                      Don't have an account?{" "}
                      <Link component={RouterLink} to="/register" variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        Sign Up
                      </Link>
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

export default Login;












































/* import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import axios from 'axios';
import { setUser, setLoading } from '../redux/authSlice';
import {
  Box, TextField, Button, Typography, Alert, CircularProgress, Link, Grid, Paper, IconButton, InputAdornment,
} from '@mui/material';
import { Visibility, VisibilityOff, EmailOutlined, LockOutlined } from '@mui/icons-material';
import loginImg from '../assets/login-image.png'

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
                  <Link component={RouterLink} to="/reset/password" variant="body2" sx={{ color: '#4F46E5' }}>
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

export default Login; */









































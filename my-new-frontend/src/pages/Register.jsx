import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import axios from 'axios';
import { setUser, setLoading } from '../redux/authSlice';
import {
  Box, TextField, Button, Typography, Alert, CircularProgress, Link, Grid, Paper, IconButton, InputAdornment, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import { Visibility, VisibilityOff, EmailOutlined, LockOutlined, PersonOutline, PhoneOutlined, WorkOutline } from '@mui/icons-material';
import registerImg from '../assets/register-image.jpg'

function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isLoading, token } = useSelector((state) => state.auth);

  useEffect(() => {
    if (user && token) {
      if (user.role === 'provider') {
        navigate('/provider/dashboard');
      } else {
        navigate('/home');
      }
    }
  }, [user, token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name || !email || !password) {
      setError('Please fill in all required fields');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    dispatch(setLoading(true));
    try {
      const res = await axios.post('http://localhost:5000/api/auth/register', {
        name, email, phone, password, role,
      });
      if (res.data.user && res.data.user._id && res.data.token) {
        dispatch(setUser({
          user: res.data.user,
          token: res.data.token,
        }));
        if (res.data.user.role === 'provider') {
          navigate('/provider/dashboard');
        } else {
          navigate('/home');
        }
      } else {
        setError('Invalid response from server: Missing user data or token');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      dispatch(setLoading(false));
    }
  };

  if (isLoading && !user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Creating your account...</Typography>
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
            backgroundImage:`url(${registerImg})`,
            backgroundRepeat: 'no-repeat',
            backgroundColor: (t) => t.palette.mode === 'light' ? t.palette.grey[50] : t.palette.grey[900],
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <Grid item xs={12} sm={8} md={5} component={Paper} elevation={6} square>
          <Box
            sx={{
              my: 6,
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
              Create Your Account
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Join us to get access to top-quality services.
            </Typography>
            
            {error && (
              <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
              <TextField
                margin="dense"
                required
                fullWidth
                id="name"
                label="Full Name"
                name="name"
                autoComplete="name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                InputProps={{
                  startAdornment: (<InputAdornment position="start"><PersonOutline /></InputAdornment>),
                }}
              />
              <TextField
                margin="dense"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                InputProps={{
                  startAdornment: (<InputAdornment position="start"><EmailOutlined /></InputAdornment>),
                }}
              />
               <TextField
                margin="dense"
                fullWidth
                id="phone"
                label="Phone Number"
                name="phone"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                InputProps={{
                  startAdornment: (<InputAdornment position="start"><PhoneOutlined /></InputAdornment>),
                }}
              />
              <TextField
                margin="dense"
                required
                fullWidth
                name="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                InputProps={{
                  startAdornment: (<InputAdornment position="start"><LockOutlined /></InputAdornment>),
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
              <FormControl fullWidth margin="dense">
                <InputLabel id="role-select-label">I am a...</InputLabel>
                <Select
                    labelId="role-select-label"
                    id="role-select"
                    value={role}
                    label="I am a..."
                    onChange={(e) => setRole(e.target.value)}
                    startAdornment={
                      <InputAdornment position="start">
                        <WorkOutline />
                      </InputAdornment>
                    }
                >
                    <MenuItem value="customer">Customer</MenuItem>
                    <MenuItem value="provider">Service Provider</MenuItem>
                </Select>
              </FormControl>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={isLoading}
                sx={{ 
                  mt: 2, 
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
                {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Sign Up'}
              </Button>
              <Grid container justifyContent="flex-end">
                <Grid item>
                  <Typography variant="body2" color="text.secondary">
                    Already have an account?{" "}
                    <Link component={RouterLink} to="/login" variant="body2" sx={{ fontWeight: 'bold', color: '#4F46E5' }}>
                      Sign In
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

export default Register;





























































/* import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { setUser, setLoading } from '../redux/authSlice';
import { Box, TextField, Button, Typography, Alert, FormControl, InputLabel, Select, MenuItem, CircularProgress, Link } from '@mui/material';
import '../styles/Register.css';

function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer');
  const [error, setError] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isLoading, token } = useSelector((state) => state.auth);

  useEffect(() => {
    if (user && token) {
      console.log('Navigating based on role, user:', user, 'token:', token);
      if (user.role === 'provider') {
        navigate('/provider/dashboard');
      } else {
        navigate('/home');
      }
    }
  }, [user, token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name || !email || !password) {
      setError('Please fill in all required fields');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    dispatch(setLoading(true));
    try {
      const res = await axios.post('http://localhost:5000/api/auth/register', {
        name, email, phone, password, role,
      });
      console.log('Register response (full):', res);
      console.log('Register response data:', res.data);
      if (res.data.user && res.data.user._id && res.data.token) {
        dispatch(setUser({
          user: res.data.user,
          token: res.data.token,
        }));
        // Explicit navigation after dispatch
        if (res.data.user.role === 'provider') {
          navigate('/provider/dashboard');
        } else {
          navigate('/home');
        }
      } else {
        setError('Invalid response from server: Missing user data or token');
      }
    } catch (err) {
      console.error('Register error:', err.response || err);
      setError(err.response?.data?.message || 'Registration failed');
      if (err.response?.status === 401) {
        setError('Unauthorized: Please check your credentials.');
      }
    } finally {
      dispatch(setLoading(false));
    }
  };

  if (isLoading && !user) {
    return (
      <Box className="loading-container">
        <CircularProgress size={40} sx={{ color: '#00acc1' }} />
        <Typography variant="body1" sx={{ ml: 2, color: '#004d40' }}>Registering...</Typography>
      </Box>
    );
  }

  if (user) {
    return null; // Redirect handled by useEffect
  }

  return (
    <Box className="pt-20 register-page">
      <Box className="register-container">
        <Box className="register-card animate-fade-in">
          <Typography variant="h4" className="register-title">
            Sign Up for ServiceHub
          </Typography>
          <Typography variant="body1" className="register-subtitle">
            Create an account to access top-quality home services.
          </Typography>
          {error && (
            <Alert severity="error" className="register-error">
              {error}
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="register-form">
            <TextField
              label="Name"
              variant="outlined"
              fullWidth
              margin="normal"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="register-input"
              required
              aria-label="Name"
              InputProps={{
                className: 'register-input-field',
              }}
            />
            <TextField
              label="Email"
              variant="outlined"
              fullWidth
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="register-input"
              required
              type="email"
              aria-label="Email address"
              InputProps={{
                className: 'register-input-field',
              }}
            />
            <TextField
              label="Phone"
              variant="outlined"
              fullWidth
              margin="normal"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="register-input"
              aria-label="Phone number"
              InputProps={{
                className: 'register-input-field',
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
              className="register-input"
              required
              aria-label="Password"
              InputProps={{
                className: 'register-input-field',
              }}
            />
            <FormControl fullWidth margin="normal" className="register-input">
              <InputLabel id="role-select-label">Role</InputLabel>
              <Select
                labelId="role-select-label"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                label="Role"
                className="register-input-field"
                aria-label="Select role"
              >
                <MenuItem value="customer">Customer</MenuItem>
                <MenuItem value="provider">Provider</MenuItem>
              </Select>
            </FormControl>
            <Button
              type="submit"
              variant="contained"
              fullWidth
              className="register-button"
              disabled={isLoading}
              aria-label="Sign up"
            >
              {isLoading ? <CircularProgress size={24} sx={{ color: '#ffffff' }} /> : 'Sign Up'}
            </Button>
            <Box className="register-links">
              <Typography variant="body2" className="login-text">
                Already have an account?{' '}
                <Link
                  component="button"
                  variant="body2"
                  className="login-link"
                  onClick={() => navigate('/login')}
                  aria-label="Log in"
                >
                  Log In
                </Link>
              </Typography>
            </Box>
          </form>
        </Box>
      </Box>
    </Box>
  );
}

export default Register; */
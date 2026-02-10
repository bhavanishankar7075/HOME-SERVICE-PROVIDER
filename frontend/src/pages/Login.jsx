import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import axios from 'axios';
import { setUser, setLoading, setNeedsVerification } from '../redux/authSlice';
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
  Container,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  EmailOutlined,
  LockOutlined,
} from '@mui/icons-material';
import loginImg from '../assets/login-image.png';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const NAVBAR_HEIGHT = 72;

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isLoading, token, needsVerification } = useSelector(
    (state) => state.auth
  );

  useEffect(() => {
    if (user && token) {
      const role = user.role || 'customer';
      navigate(role === 'provider' ? '/providerhome' : '/home');
    } else if (needsVerification) {
      navigate('/verify-otp', { state: { email, action: 'login' } });
    }
  }, [user, token, needsVerification, email, navigate]);

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
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password,
      });

      const {
        token: responseToken,
        needsVerification: verificationRequired,
      } = response.data;

      if (verificationRequired) {
        dispatch(setNeedsVerification(true));
        return;
      }

      const profileRes = await axios.get(`${API_URL}/api/users/profile`, {
        headers: { Authorization: `Bearer ${responseToken}` },
      });

      dispatch(
        setUser({ user: { ...profileRes.data }, token: responseToken })
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          'Login failed. Please check your credentials.'
      );
    } finally {
      dispatch(setLoading(false));
    }
  };

  if (user) return null;

  return (
    <Box
      sx={{
        minHeight: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
        pt: `${NAVBAR_HEIGHT}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: (theme) => theme.palette.grey[100],
        overflow: 'hidden',
        px: 2,
      }}
    >
      <Container maxWidth="lg" disableGutters>
        <Paper
          elevation={8}
          sx={{
            display: 'grid',
            gridTemplateColumns: { md: '3fr 5fr' },
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          {/* LEFT IMAGE */}
          <Box
            sx={{
              display: { xs: 'none', md: 'block' },
              backgroundImage: `url(${loginImg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />

          {/* RIGHT FORM */}
          <Box
            sx={{
              p: { xs: 3, sm: 4, md: 6 },
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Box sx={{ maxWidth: 400, width: '100%' }}>
              <Typography
                variant="h4"
                fontWeight="bold"
                color="primary.main"
                textAlign="center"
              >
                ServiceHub
              </Typography>

              <Typography
                variant="h6"
                color="text.secondary"
                textAlign="center"
                sx={{ mt: 1, mb: 2 }}
              >
                Welcome Back!
              </Typography>

              {/* ✅ RESERVED SPACE — prevents layout jump */}
              <Box sx={{ minHeight: 56, mb: 2 }}>
                {error && <Alert severity="error">{error}</Alert>}
              </Box>

              <Box component="form" onSubmit={handleSubmit}>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  label="Email Address"
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
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
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
                          onClick={() => setShowPassword(!showPassword)}
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
                    fontWeight: 'bold',
                  }}
                >
                  {isLoading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    'Sign In'
                  )}
                </Button>

                <Grid container justifyContent="space-between">
                  <Grid item>
                    <Link
                      component={RouterLink}
                      to="/reset/password"
                      variant="body2"
                    >
                      Forgot password?
                    </Link>
                  </Grid>
                  <Grid item>
                    <Typography variant="body2">
                      Don't have an account?{' '}
                      <Link
                        component={RouterLink}
                        to="/register"
                        fontWeight="bold"
                      >
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

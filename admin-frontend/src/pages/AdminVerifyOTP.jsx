import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import axios from './axiosInstance';
import { setUser, setLoading, setNeedsVerification, setError } from '../store/authSlice';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Link,
  Stack,
  Paper,
  InputAdornment,
  Container,
} from '@mui/material';
import { EmailOutlined, LockOutlined, Hub as HubIcon } from '@mui/icons-material';
import adminLoginImage from '../assets/service-hub-logo.png';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function AdminVerifyOTP() {
  const [otp, setOtp] = useState('');
  const [localError, setLocalError] = useState('');
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(60);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { state } = useLocation();
  const { email } = state || {};
  const { user, token, isAuthenticated, isLoading, error } = useSelector((state) => state.auth);

  useEffect(() => {
    console.log('AdminVerifyOTP: Current auth state:', { user, token, isAuthenticated, isLoading, error });
    console.log('AdminVerifyOTP: localStorage persist:root:', localStorage.getItem('persist:root'));
    if (isAuthenticated && user?.role === 'admin') {
      console.log('AdminVerifyOTP: User authenticated, navigating...', { user, token });
      navigate('/admin/dashboard', { replace: true });
    }
    if (!email) {
      console.log('AdminVerifyOTP: No email in state, redirecting to login');
      navigate('/admin/login', { replace: true });
    }
  }, [user, token, isAuthenticated, email, navigate]);

  useEffect(() => {
    let timer;
    if (resendDisabled && resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
    } else if (resendCountdown === 0) {
      setResendDisabled(false);
    }
    return () => clearInterval(timer);
  }, [resendDisabled, resendCountdown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (!otp) {
      setLocalError('Please enter the OTP');
      return;
    }
    if (!/^\d{6}$/.test(otp)) {
      setLocalError('OTP must be a 6-digit number');
      return;
    }
    dispatch(setLoading(true));
    try {
      console.log('AdminVerifyOTP: Sending OTP verification request', { email, otp });
      const response = await axios.post(`${API_URL}/api/auth/admin-verify-otp`, { email, otp }, { withCredentials: true });
      const { token: responseToken, user: userData } = response.data;
      console.log('AdminVerifyOTP: OTP verification response:', response.data);

      if (!userData || !responseToken) {
        throw new Error('Invalid response format: user or token missing');
      }

      dispatch(setUser({ user: userData, token: responseToken }));
      dispatch(setNeedsVerification(false));
      console.log('AdminVerifyOTP: State after setUser:', { user: userData, token: responseToken });
      console.log('AdminVerifyOTP: localStorage after setUser:', localStorage.getItem('persist:root'));
      setTimeout(() => {
        console.log('AdminVerifyOTP: localStorage after delay:', localStorage.getItem('persist:root'));
      }, 1000); // Log after a delay to ensure persistence
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'OTP verification failed. Please try again.';
      console.error('AdminVerifyOTP: OTP verification failed', err);
      setLocalError(errorMsg);
      dispatch(setError(errorMsg));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleResendOtp = async () => {
    setLocalError('');
    if (!email) {
      setLocalError('Email not provided. Please return to login.');
      return;
    }
    dispatch(setLoading(true));
    try {
      await axios.post(`${API_URL}/api/auth/admin-resend-otp`, { email }, { withCredentials: true });
      setResendDisabled(true);
      setResendCountdown(60);
      alert('A new OTP has been sent to your email.');
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to resend OTP. Please try again.';
      console.error('AdminVerifyOTP: Resend OTP failed', err);
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
              <Typography variant="h6">Admin OTP Verification</Typography>
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
                Admin OTP Verification
              </Typography>
              <Typography variant="body2" sx={{ textAlign: 'center', mb: 3, color: 'text.secondary' }}>
                Enter the OTP sent to your email.
              </Typography>
              {(error || localError) && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch(setError(null))}>
                  {error || localError}
                </Alert>
              )}
              <Box component="form" onSubmit={handleSubmit}>
                <Stack spacing={2}>
                  <TextField
                    label="Email"
                    type="email"
                    value={email || ''}
                    disabled
                    variant="outlined"
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailOutlined color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    label="OTP (6 digits)"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    variant="outlined"
                    fullWidth
                    required
                    disabled={isLoading}
                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
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
                    {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Verify OTP'}
                  </Button>
                </Stack>
              </Box>
              <Stack direction="column" spacing={1} sx={{ mt: 3, textAlign: 'center' }}>
                <Button
                  onClick={handleResendOtp}
                  disabled={resendDisabled || isLoading}
                  sx={{ textTransform: 'none', color: 'primary.main' }}
                >
                  Resend OTP {resendDisabled ? `(${resendCountdown}s)` : ''}
                </Button>
                <Typography variant="body2" color="text.secondary">
                  Back to{' '}
                  <Link component={RouterLink} to="/admin/login" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    Login
                  </Link>
                </Typography>
              </Stack>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

export default AdminVerifyOTP;
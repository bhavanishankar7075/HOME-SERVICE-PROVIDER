import React, { useState, useEffect } from 'react';
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
  Snackbar, // <-- Import Snackbar
} from '@mui/material';
import { EmailOutlined, LockOutlined, Hub as HubIcon } from '@mui/icons-material';
import adminLoginImage from '../assets/service-hub-logo.png';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function AdminVerifyOTP() {
  // --- All your existing logic remains untouched ---
  const [otp, setOtp] = useState('');
  const [localError, setLocalError] = useState('');
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(60);
  
  // --- State for the new Snackbar notification ---
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { state } = useLocation();
  const { email } = state || {};
  const { user, token, isAuthenticated, isLoading, error } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      navigate('/admin/dashboard', { replace: true });
    }
    if (!email) {
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
      const response = await axios.post(`${API_URL}/api/auth/admin-verify-otp`, { email, otp }, { withCredentials: true });
      const { token: responseToken, user: userData } = response.data;

      if (!userData || !responseToken) {
        throw new Error('Invalid response format: user or token missing');
      }
      dispatch(setUser({ user: userData, token: responseToken }));
      dispatch(setNeedsVerification(false));
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'OTP verification failed. Please try again.';
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
      // **FIX**: Replace alert with Snackbar
      setSnackbar({ open: true, message: 'A new OTP has been sent to your email.' });
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to resend OTP. Please try again.';
      setLocalError(errorMsg);
      dispatch(setError(errorMsg));
    } finally {
      dispatch(setLoading(false));
    }
  };
  
  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
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
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity="success" sx={{ width: '100%', borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Paper
        elevation={8}
        sx={{
          display: 'grid',
          gridTemplateColumns: { md: '1fr 1fr' },
          borderRadius: 4,
          overflow: 'hidden',
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
            backgroundImage: `url(${adminLoginImage})`,
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
            <Typography variant="h6">Admin OTP Verification</Typography>
          </Box>
        </Box>
        {/* Right Side: Form */}
        <Box
          sx={{
            p: { xs: 3, sm: 4, md: 5 },
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            overflowY: 'auto',
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
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => { setLocalError(''); dispatch(setError(null)); }}>
                {error || localError}
              </Alert>
            )}
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  margin="dense" label="Email" type="email" value={email || ''}
                  disabled variant="outlined" fullWidth
                  InputProps={{ startAdornment: (<InputAdornment position="start"><EmailOutlined color="action" /></InputAdornment>), }}
                />
                <TextField
                  margin="dense" label="OTP (6 digits)" value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  variant="outlined" fullWidth required disabled={isLoading}
                  inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                  InputProps={{ startAdornment: (<InputAdornment position="start"><LockOutlined color="action" /></InputAdornment>), }}
                />
                <Button
                  type="submit" variant="contained" fullWidth size="large" disabled={isLoading}
                  sx={{ py: 1.5, fontWeight: 'bold' }}
                >
                  {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Verify OTP'}
                </Button>

               <Typography
                    variant="caption"
                      textAlign="center"
                      sx={{
                      mt: 2, // Adds margin on top for spacing
                      color: 'error.main', // Uses the theme's main error color (typically red)
                      fontWeight: 'bold',
                      display: 'block' // Ensures it takes up the full width for centering
                        }}
                    >
                              NOTE: Please check your spam folder for the OTP email.
                  </Typography>
              </Stack>
            </Box>
            <Stack direction="column" spacing={1} sx={{ mt: 3, textAlign: 'center' }}>
              <Button
                onClick={handleResendOtp}
                disabled={resendDisabled || isLoading}
                sx={{ textTransform: 'none', fontWeight: 'bold' }}
              >
                Resend OTP {resendDisabled ? `(${resendCountdown}s)` : ''}
              </Button>
              <Typography variant="body2" color="text.secondary">
                Back to{' '}
                <Link component={RouterLink} to="/admin/login" sx={{ fontWeight: 'bold' }}>
                  Login
                </Link>
              </Typography>
            </Stack>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}

export default AdminVerifyOTP;

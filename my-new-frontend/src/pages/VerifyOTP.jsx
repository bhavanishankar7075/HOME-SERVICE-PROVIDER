import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
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
  InputAdornment,
  Container,
  Snackbar,
} from '@mui/material';
import { EmailOutlined, LockOutlined } from '@mui/icons-material';
import loginImg from '../assets/login-image.png';
import LoadingScreen from '../components/LoadingScreen';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function VerifyOTP() {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(60);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { state } = useLocation();
  const { email } = state || {};
  const { user, token, isAuthenticated, isLoading } = useSelector((state) => state.auth);
  const stateRef = useRef(useSelector((state) => state.auth));

  useEffect(() => {
    if (isAuthenticated && user && token) {
      const role = user.role || 'customer';
      navigate(role === 'provider' ? '/providerhome' : '/home', { replace: true });
    }
    if (!email) {
      navigate('/login', { replace: true });
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
    setError('');
    if (!otp) {
      setError('Please enter the OTP');
      return;
    }
    if (!/^\d{6}$/.test(otp)) {
      setError('OTP must be a 6-digit number');
      return;
    }
    dispatch(setLoading(true));
    try {
      const response = await axios.post(`${API_URL}/api/auth/verify-otp`, { email, otp });
      const { token: responseToken, user: userData } = response.data;
      if (!userData || !responseToken) {
        throw new Error('Invalid response format: user or token missing');
      }
      dispatch(setUser({ user: userData, token: responseToken }));
      dispatch(setNeedsVerification(false));
      const role = userData.role || 'customer';
      navigate(role === 'provider' ? '/providerhome' : '/home', { replace: true });
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'OTP verification failed. Please try again.';
      setError(errorMsg);
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleResendOtp = async () => {
    setError('');
    if (!email) {
      setError('Email not provided. Please return to login.');
      return;
    }
    dispatch(setLoading(true));
    try {
      await axios.post(`${API_URL}/api/auth/resend-otp`, { email });
      setResendDisabled(true);
      setResendCountdown(60);
      setSnackbar({ open: true, message: 'A new OTP has been sent to your email.' });
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to resend OTP. Please try again.';
      setError(errorMsg);
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

/*   if (isLoading && !user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Verifying OTP...</Typography>
      </Box>
    );
  } */

    if (isLoading && !user) {
  return <LoadingScreen title="Verifying Your Code" message="Just a moment, we're checking your OTP..." />;
}

  return (
    <Box
      sx={{
        height: 'calc(90vh - 64px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        backgroundColor: (theme) => theme.palette.grey[100],
        mt: 8
      }}
    >
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity="success" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Container maxWidth="lg" sx={{ height: '100%', p: '0 !important' }}>
        <Paper
          elevation={6}
          sx={{
            display: 'grid',
            gridTemplateColumns: { md: '3fr 4fr' },
            borderRadius: 4,
            overflow: 'hidden',
            height: '100%',
          }}
        >
          <Box
            sx={{
              display: { xs: 'none', md: 'block' },
              backgroundImage: `url(${loginImg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <Box
            sx={{
              p: { xs: 3, sm: 4 },
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              overflowY: 'auto',
            }}
          >
            <Box sx={{ maxWidth: 400, width: '100%', mx: 'auto' }}>
              <Typography component="h1" variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main', textAlign: 'center' }}>
                ServiceHub
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ mt: 1, mb: 3, textAlign: 'center' }}>
                Enter Verification Code
              </Typography>

              {error && (
                <Alert severity="error" sx={{ width: '100%', mb: 2, borderRadius: 2 }}>
                  {error}
                </Alert>
              )}

              <Box component="form" noValidate onSubmit={handleSubmit}>
                <TextField
                  margin="dense" fullWidth label="Email Address"
                  value={email || ''} disabled
                  InputProps={{ startAdornment: (<InputAdornment position="start"><EmailOutlined color="action" /></InputAdornment>)}}
                />
                <TextField
                  margin="dense" required fullWidth id="otp"
                  label="OTP (6 digits)" name="otp" value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 6 }}
                  InputProps={{ startAdornment: (<InputAdornment position="start"><LockOutlined color="action" /></InputAdornment>)}}
                />
                <Button
                  type="submit" fullWidth variant="contained"
                  disabled={isLoading}
                  sx={{ mt: 2.5, mb: 2, py: 1.5, fontSize: '1rem', fontWeight: 'bold' }}
                >
                  {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Verify OTP'}
                </Button>
                <Typography
                  variant="caption"
                  textAlign="center"
                  sx={{
                    mt: 2,
                    color: 'error.main',
                    fontWeight: 'bold',
                    display: 'block'
                  }}
                >
                  NOTE: Please check your spam folder for the OTP email.
                </Typography>
                <Grid container justifyContent="space-between" alignItems="center">
                  <Grid item>
                    <Button
                      onClick={handleResendOtp}
                      disabled={resendDisabled || isLoading}
                      variant="text"
                      sx={{ textTransform: 'none', fontWeight: 'bold' }}
                    >
                      Resend OTP {resendDisabled ? `(${resendCountdown}s)` : ''}
                    </Button>
                  </Grid>
                  <Grid item>
                    <Link component={RouterLink} to="/login" variant="body2" sx={{ fontWeight: 'bold' }}>
                      Back to Login
                    </Link>
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

export default VerifyOTP;

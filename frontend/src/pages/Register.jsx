import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import axios from 'axios';
import { setLoading, setNeedsVerification } from '../redux/authSlice';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Link,
  Paper,
  IconButton,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Container,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  EmailOutlined,
  LockOutlined,
  PersonOutline,
  PhoneOutlined,
  WorkOutline,
} from '@mui/icons-material';
import registerImg from '../assets/register-image.png';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ✅ MATCH YOUR NAVBAR HEIGHT
const NAVBAR_HEIGHT = 72;

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
  const { user, isLoading, token, needsVerification } = useSelector(
    (state) => state.auth
  );

  useEffect(() => {
    if (user && token) {
      navigate(user.role === 'provider' ? '/providerhome' : '/home');
    } else if (needsVerification) {
      navigate('/verify-otp', {
        state: { email, action: 'register', name, phone, password, role },
      });
    }
  }, [user, token, needsVerification, email, name, phone, password, role, navigate]);

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

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    dispatch(setLoading(true));

    try {
      const res = await axios.post(`${API_URL}/api/auth/register`, {
        name,
        email,
        phone,
        password,
        role,
      });

      if (res.data.needsVerification) {
        dispatch(setNeedsVerification(true));
        return;
      }

      setError(res.data.message || 'Unexpected response from server');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      dispatch(setLoading(false));
    }
  };

  if (user) return null;

  return (
    <Box
      sx={{
        minHeight: `calc(100vh - ${NAVBAR_HEIGHT}px)`, // ✅ space below navbar
        pt: `${NAVBAR_HEIGHT}px`,                      // ✅ pushes content below navbar
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: (theme) => theme.palette.grey[100],
        overflow: 'hidden',                            // ✅ no scrollbar
      }}
    >
      <Container maxWidth="lg">
        <Paper
          elevation={6}
          sx={{
            display: 'grid',
            gridTemplateColumns: { md: '6fr 7fr' },
            borderRadius: 4,
            overflow: 'hidden',
            width: '100%',
          }}
        >
          {/* LEFT IMAGE */}
          <Box
            sx={{
              display: { xs: 'none', md: 'block' },
              backgroundImage: `url(${registerImg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              minHeight: 600,
            }}
          />

          {/* RIGHT FORM */}
          <Box
            sx={{
              p: { xs: 2.5, sm: 3.5 },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box sx={{ maxWidth: 450, width: '100%' }}>
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Typography variant="h4" fontWeight="bold" color="primary.main">
                  ServiceHub
                </Typography>
                <Typography color="text.secondary" mt={1}>
                  Create Your Account ✨
                </Typography>
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                  {error}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit}>
                <Stack spacing={1.5}>
                  <TextField
                    required
                    fullWidth
                    label="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonOutline />
                        </InputAdornment>
                      ),
                    }}
                  />

                  <TextField
                    required
                    fullWidth
                    label="Email Address"
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
                    fullWidth
                    label="Phone Number (Optional)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PhoneOutlined />
                        </InputAdornment>
                      ),
                    }}
                  />

                  <TextField
                    required
                    fullWidth
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
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
                          <IconButton onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <FormControl fullWidth>
                    <InputLabel>I am a...</InputLabel>
                    <Select
                      value={role}
                      label="I am a..."
                      onChange={(e) => setRole(e.target.value)}
                      startAdornment={
                        <InputAdornment position="start" sx={{ ml: 1 }}>
                          <WorkOutline />
                        </InputAdornment>
                      }
                    >
                      <MenuItem value="customer">Customer</MenuItem>
                      <MenuItem value="provider">Service Provider</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={isLoading}
                  sx={{ mt: 2.5, py: 1.25, fontWeight: 'bold', borderRadius: 2 }}
                >
                  {isLoading ? <CircularProgress size={24} /> : 'Sign Up'}
                </Button>

                <Typography align="center" mt={2}>
                  Already have an account?{' '}
                  <Link component={RouterLink} to="/login" fontWeight="bold">
                    Sign In
                  </Link>
                </Typography>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

export default Register;

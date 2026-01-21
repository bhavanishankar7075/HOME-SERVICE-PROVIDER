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
import { Visibility, VisibilityOff, EmailOutlined, LockOutlined, PersonOutline, PhoneOutlined, WorkOutline } from '@mui/icons-material';
import registerImg from '../assets/register-image.png';
import LoadingScreen from '../components/LoadingScreen';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
  const { user, isLoading, token, needsVerification } = useSelector((state) => state.auth);

  useEffect(() => {
    if (user && token) {
      if (user.role === 'provider') {
        navigate('/providerhome');
      } else {
        navigate('/home');
      }
    } else if (needsVerification) {
      navigate('/verify-otp', { state: { email, action: 'register', name, phone, password, role } });
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
      const { needsVerification: verificationRequired, message } = res.data;

      if (verificationRequired) {
        dispatch(setNeedsVerification(true));
        return;
      }
      setError(message || 'Unexpected response from server');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      dispatch(setLoading(false));
    }
  };

  if (user) {
    return null;
  }

  return (
    <Box
      sx={{
        height: 'calc(93vh - 60px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        backgroundColor: (theme) => theme.palette.grey[100],
        mt: 7
      }}
    >
      <Container maxWidth="lg" sx={{ height: '100%', p: '0 !important' }}>
        <Paper
          elevation={6}
          sx={{
            display: 'grid',
            gridTemplateColumns: { md: '6fr 7fr' },
            borderRadius: 4,
            overflow: 'hidden',
            height: '100%',
            width: '100%',
          }}
        >
          <Box
            sx={{
              display: { xs: 'none', md: 'block' },
              backgroundImage: `url(${registerImg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <Box
            sx={{
              p: { xs: 2.5, sm: 3.5 },
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              overflowY: 'auto',
            }}
          >
            <Box sx={{ maxWidth: 450, width: '100%', mx: 'auto' }}>
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Typography component="h1" variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                  ServiceHub
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                  Create Your Account ✨
                </Typography>
              </Box>

              {error && (
                <Alert severity="error" sx={{ width: '100%', mb: 2, borderRadius: 2 }}>
                  {error}
                </Alert>
              )}

              <Box component="form" noValidate onSubmit={handleSubmit}>
                <Stack spacing={1.5}>
                  <TextField
                    margin="dense" required fullWidth label="Full Name" name="name"
                    autoComplete="name" autoFocus value={name}
                    onChange={(e) => setName(e.target.value)}
                    InputProps={{startAdornment: (<InputAdornment position="start"><PersonOutline color="action" /></InputAdornment>),}}
                  />
                  <TextField
                    margin="dense" required fullWidth label="Email Address" name="email"
                    autoComplete="email" value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    InputProps={{startAdornment: (<InputAdornment position="start"><EmailOutlined color="action" /></InputAdornment>),}}
                  />
                  <TextField
                    margin="dense" fullWidth label="Phone Number (Optional)" name="phone"
                    autoComplete="tel" value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    InputProps={{startAdornment: (<InputAdornment position="start"><PhoneOutlined color="action" /></InputAdornment>),}}
                  />
                  <TextField
                    margin="dense" required fullWidth name="password" label="Password"
                    type={showPassword ? 'text' : 'password'} autoComplete="new-password"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    InputProps={{
                      startAdornment: (<InputAdornment position="start"><LockOutlined color="action" /></InputAdornment>),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <FormControl fullWidth margin="dense">
                    <InputLabel>I am a...</InputLabel>
                    <Select
                      value={role} label="I am a..." onChange={(e) => setRole(e.target.value)}
                      startAdornment={<InputAdornment position="start" sx={{ ml: 1.5 }}><WorkOutline color="action" /></InputAdornment>}
                    >
                      <MenuItem value="customer">Customer</MenuItem>
                      <MenuItem value="provider">Service Provider</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
                <Button
                  type="submit" fullWidth variant="contained" disabled={isLoading}
                  sx={{ mt: 2.5, mb: 2, py: 1.25, fontSize: '1rem', fontWeight: 'bold', borderRadius: 2 }}
                >
                  {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Sign Up'}
                </Button>
                <Typography variant="body2" color="text.secondary" align="center">
                  Already have an account?{' '}
                  <Link component={RouterLink} to="/login" variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
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
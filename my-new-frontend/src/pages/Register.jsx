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

function Register() {
  // --- All your logic remains unchanged ---
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
      const res = await axios.post('http://localhost:5000/api/auth/register', {
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

  if (isLoading && !user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Creating your account...
        </Typography>
      </Box>
    );
  }

  if (user) {
    return null;
  }
  
  // --- DESIGN FIXES ARE HERE ---
  return (
    <Box
      sx={{
        // **FIX 1**: Use `height` instead of `minHeight` to prevent page overflow
        height: 'calc(93vh - 60px)', // Adjust 64px to your navbar's height
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2, // Padding to prevent touching screen edges
        backgroundColor: (theme) => theme.palette.grey[100],
        mt:7
      }}
    >
      <Container maxWidth="lg" sx={{ height: '100%', p: '0 !important' }}>
        <Paper
          elevation={6}
          sx={{
            display: 'grid',
            gridTemplateColumns: { md: '6fr 7fr' }, // Adjusted ratio for better balance
            borderRadius: 4,
            overflow: 'hidden',
            height: '100%', // Make Paper fill the container height
            width: '100%',
          }}
        >
          {/* Left Side: Image */}
          <Box
            sx={{
              display: { xs: 'none', md: 'block' },
              backgroundImage: `url(${registerImg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />

          {/* Right Side: Form */}
          <Box
            sx={{
              p: { xs: 2.5, sm: 3.5 },
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              // **FIX 2**: Add vertical scroll *only to the form* if content overflows
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
                {/* **FIX 3**: Reduced spacing and made fields dense */}
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











































































































































//main
/* import { useState, useEffect } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Container,
} from '@mui/material';
import { Visibility, VisibilityOff, EmailOutlined, LockOutlined, PersonOutline, PhoneOutlined, WorkOutline } from '@mui/icons-material';
import registerImg from '../assets/register-image.png';

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

  // --- No changes to your existing logic ---
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
        name,
        email,
        phone,
        password,
        role,
      });
      if (res.data.user && res.data.user._id && res.data.token) {
        dispatch(
          setUser({
            user: res.data.user,
            token: res.data.token,
          })
        );
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
  // --- End of unchanged logic ---

  if (isLoading && !user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Creating your account...
        </Typography>
      </Box>
    );
  }

  if (user) {
    return null;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // Adjusted minHeight: Reverted to 100vh - navbar height.
        // If your navbar is indeed 44px, use that.
        maxHeight: 'calc(140vh - 64px)',
        backgroundColor: (theme) => theme.palette.grey[100],
        px: 2,
        // Optional: If you want to limit the overall width of the entire page content
        // You can add a maxWidth here, but using Container's maxWidth is generally better
        mt:8.8
      }}
    >
      <Container maxWidth="md" disableGutters>
        <Paper
          elevation={8}
          sx={{
            display: 'grid',
            gridTemplateColumns: { md: '7fr 5fr' },
            borderRadius: 4,
            overflow: 'hidden',
            // Optional: You can also set a specific maxWidth for the Paper itself here if needed
            // maxWidth: 900, // Example: limits the paper's max width
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
              // Reduced padding values slightly for a smaller internal appearance
              p: { xs: 2.5, sm: 3.5, md: 4.5 }, // Smaller responsive padding
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <Box sx={{ maxWidth: 400, width: '100%', mx: 'auto' }}>
              <Typography component="h1" variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main', textAlign: 'center' }}>
                ServiceHub
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ mt: 1, mb: 3, textAlign: 'center' }}>
                Create Your Account
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
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutline color="action" />
                      </InputAdornment>
                    ),
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
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailOutlined color="action" />
                      </InputAdornment>
                    ),
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
                    startAdornment: (
                      <InputAdornment position="start">
                        <PhoneOutlined color="action" />
                      </InputAdornment>
                    ),
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
                        <WorkOutline color="action" />
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
                    mt: 2, // Adjusted margin top
                    mb: 1.5, // Adjusted margin bottom
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    bgcolor: 'primary.main',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                  }}
                >
                  {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Sign Up'}
                </Button>
                <Grid container justifyContent="flex-end">
                  <Grid item>
                    <Typography variant="body2" color="text.secondary">
                      Already have an account?{" "}
                      <Link component={RouterLink} to="/login" variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        Sign In
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

export default Register; */

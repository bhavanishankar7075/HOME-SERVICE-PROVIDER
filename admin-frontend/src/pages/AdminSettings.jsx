import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Button, Snackbar, Alert,
  Paper, CircularProgress, FormControlLabel, Switch,
  FormGroup,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import io from 'socket.io-client';
import { ArrowBack } from '@mui/icons-material';
import { logout } from '../store/authSlice';

const AdminSettings = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { token } = useSelector((state) => state.auth);
  const [adminName, setAdminName] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ open: false, text: '', severity: 'success' });
  const [socket, setSocket] = useState(null);

  // Fetch initial admin data and listen for updates
  useEffect(() => {
    const fetchAdminData = async () => {
      setLoading(true);
      try {
        if (!token && !localStorage.getItem('token')) {
          setMessage({ open: true, text: 'No authentication token found. Please log in.', severity: 'error' });
          navigate('/');
          return;
        }

        const response = await axios.get('http://localhost:5000/api/admin/users', {
          headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` },
        });
        const adminData = Array.isArray(response.data) ? response.data.find(user => user.role === 'admin') : response.data;
        if (adminData) {
          setAdminName(adminData.name || 'Admin');
          setNewName(adminData.name || 'Admin');
          setNewEmail(adminData.email || '');
        } else {
          setMessage({ open: true, text: 'Admin user not found.', severity: 'error' });
          setTimeout(() => navigate('/'), 3000);
        }
      } catch (error) {
        console.error('Error fetching admin data:', error.message, error.response?.data);
        setMessage({ open: true, text: 'Error fetching admin data. Please try again.', severity: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchAdminData();

    const socketInstance = io('http://localhost:5000', {
      withCredentials: true,
      extraHeaders: { Authorization: `Bearer ${token || localStorage.getItem('token')}` },
    });
    setSocket(socketInstance);

    socketInstance.on('connect', () => console.log('Socket connected:', socketInstance.id));
    socketInstance.on('connect_error', (error) => console.error('Socket connection error:', error.message));
    socketInstance.on('userUpdated', (updatedUser) => {
      const userId = token && JSON.parse(atob(token.split('.')[1])).id;
      if (updatedUser._id === userId) {
        setAdminName(updatedUser.name || 'Admin');
        setNewName(updatedUser.name || 'Admin');
        setNewEmail(updatedUser.email || '');
      } else {
        console.log('Received userUpdated for different user:', updatedUser._id);
      }
    });

    return () => {
      socketInstance.off('userUpdated');
      socketInstance.disconnect();
      setSocket(null);
    };
  }, [token, navigate]);

  // Handle settings update
  const handleUpdateSettings = async () => {
    setLoading(true);
    try {
      if (newEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        setMessage({ open: true, text: 'Please enter a valid email address.', severity: 'error' });
        return;
      }

      const response = await axios.put(
        'http://localhost:5000/api/admin/settings',
        { 
          name: newName, 
          email: newEmail, 
          password: newPassword || undefined
        },
        { headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` } }
      );
      setAdminName(newName);
      setNewPassword('');
      setMessage({ open: true, text: 'Settings updated successfully!', severity: 'success' });

      if (socket && socket.connected) {
        const userId = response.data._id || (token && JSON.parse(atob(token.split('.')[1])).id);
        if (userId) {
          socket.emit('userUpdated', { 
            _id: userId,
            name: newName, 
            email: newEmail
          });
        } else {
          console.warn('No user ID available for socket emit.');
        }
      } else {
        console.warn('Socket not connected, userUpdated event not emitted.');
      }
    } catch (error) {
      console.error('Error updating settings:', error.message, error.response?.data);
      setMessage({ open: true, text: 'Error updating settings. Please try again.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    try {
      if (socket) {
        socket.emit('logout', { userId: adminName || 'admin' });
        socket.disconnect();
      }
      localStorage.removeItem('token');
      dispatch(logout());
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Logout error:', error.message);
      setMessage({ open: true, text: 'Error during logout. Please try again.', severity: 'error' });
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: '100%', mx: 'auto', bgcolor: '#f4f6f8', minHeight: '100vh' }}>
      <Button
        variant="outlined"
        startIcon={<ArrowBack />}
        onClick={() => navigate('/admin/dashboard')}
        sx={{ mb: 3, color: '#2c5282', borderColor: '#2c5282', '&:hover': { borderColor: '#357abd', color: '#357abd' } }}
      >
        Back to Dashboard
      </Button>

      <Paper sx={{ p: 4, borderRadius: 3, boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)', bgcolor: '#ffffff', maxWidth: '600px', mx: 'auto' }}>
        <Typography variant="h4" sx={{ mb: 3, color: '#2c5282', fontWeight: 'bold', textAlign: 'center' }}>
          Admin Settings
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TextField
              label="Current Name"
              value={adminName}
              disabled
              fullWidth
              sx={{ mb: 2 }}
            />
            <TextField
              label="New Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
            />
            <TextField
              label="New Email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
              error={newEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)}
              helperText={newEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail) ? 'Invalid email format' : ''}
            />
            <TextField
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth
              sx={{ mb: 3 }}
            />

            <Button
              variant="contained"
              onClick={handleUpdateSettings}
              disabled={loading}
              sx={{ bgcolor: '#4a90e2', '&:hover': { bgcolor: '#357abd' }, borderRadius: 2, width: '100%' }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Save Settings'}
            </Button>
          </>
        )}
      </Paper>

      <Snackbar
        open={message.open}
        autoHideDuration={4000}
        onClose={() => setMessage({ ...message, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setMessage({ ...message, open: false })}
          severity={message.severity}
          sx={{ width: '100%', borderRadius: 2, boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' }}
        >
          {message.text}
        </Alert>
      </Snackbar>

      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Button
          variant="contained"
          onClick={handleLogout}
          sx={{ bgcolor: '#e53e3e', '&:hover': { bgcolor: '#c53030' }, borderRadius: 2, width: '200px' }}
        >
          Logout
        </Button>
      </Box>
    </Box>
  );
};

export default AdminSettings;
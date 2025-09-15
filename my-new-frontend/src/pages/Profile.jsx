/* import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { Box, TextField, Button, Typography, Snackbar, Alert } from '@mui/material';
import { setUser } from '../redux/authSlice';
import LoadingButton from '@mui/lab/LoadingButton';

function Profile() {
  const { user, token } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    skills: user?.role === 'provider' && user?.profile?.skills ? user.profile.skills.join(', ') : '',
    availability: user?.role === 'provider' && user?.profile?.availability ? user.profile.availability : '',
    location: user?.role === 'provider' && user?.profile?.location ? (user.profile.location.fullAddress || user.profile.location.city || user.profile.location || '') : '',
  });
  const [errors, setErrors] = useState({});
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Sync formData with Redux user on mount or user change
    setFormData({
      name: user?.name || '',
      phone: user?.phone || '',
      skills: user?.role === 'provider' && user?.profile?.skills ? user.profile.skills.join(', ') : '',
      availability: user?.role === 'provider' && user?.profile?.availability ? user.profile.availability : '',
      location: user?.role === 'provider' && user?.profile?.location ? (user.profile.location.fullAddress || user.profile.location.city || user.profile.location || '') : '',
    });
  }, [user]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    else if (!/^\+?\d{10,15}$/.test(formData.phone)) newErrors.phone = 'Invalid phone number';
    if (user?.role === 'provider') {
      if (!formData.skills.trim()) newErrors.skills = 'Skills are required';
      if (!formData.availability.trim()) newErrors.availability = 'Availability is required';
      if (!formData.location.trim()) newErrors.location = 'Location is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for the field being edited
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await axios.put(
        'http://localhost:5000/api/users/profile',
        {
          ...formData,
          skills: formData.skills ? formData.skills.split(',').map((skill) => skill.trim()) : [],
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      dispatch(setUser({ ...user, ...res.data.user }));
      localStorage.setItem('user', JSON.stringify({ ...user, ...res.data.user }));
      setSuccessMessage('Profile updated successfully!');
      setOpenSnackbar(true);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to update profile');
      setOpenSnackbar(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
    setErrorMessage('');
    setSuccessMessage('');
  };

  if (!user) {
    return (
      <Box sx={{ maxWidth: 400, mx: 'auto', mt: 5, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          Please log in to view your profile.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4, p: 3, bgcolor: 'white', borderRadius: 2, boxShadow: 1 }}>
      <Typography variant="h4" gutterBottom align="center" color="primary" sx={{ fontWeight: 'bold' }}>
        Update Profile
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          label="Name"
          name="name"
          fullWidth
          margin="normal"
          value={formData.name}
          onChange={handleChange}
          error={!!errors.name}
          helperText={errors.name}
          variant="outlined"
          InputProps={{ sx: { borderRadius: 2 } }}
        />
        <TextField
          label="Phone"
          name="phone"
          fullWidth
          margin="normal"
          value={formData.phone}
          onChange={handleChange}
          error={!!errors.phone}
          helperText={errors.phone}
          variant="outlined"
          InputProps={{ sx: { borderRadius: 2 } }}
        />
        {user.role === 'provider' && (
          <>
            <TextField
              label="Skills (comma-separated)"
              name="skills"
              fullWidth
              margin="normal"
              value={formData.skills}
              onChange={handleChange}
              error={!!errors.skills}
              helperText={errors.skills}
              variant="outlined"
              InputProps={{ sx: { borderRadius: 2 } }}
            />
            <TextField
              label="Availability"
              name="availability"
              fullWidth
              margin="normal"
              value={formData.availability}
              onChange={handleChange}
              error={!!errors.availability}
              helperText={errors.availability}
              variant="outlined"
              InputProps={{ sx: { borderRadius: 2 } }}
            />
            <TextField
              label="Location (Full Address)"
              name="location"
              fullWidth
              margin="normal"
              value={formData.location}
              onChange={handleChange}
              error={!!errors.location}
              helperText={errors.location || 'Enter full address or coordinates (lat,lng)'}
              variant="outlined"
              InputProps={{ sx: { borderRadius: 2 } }}
            />
          </>
        )}
        <LoadingButton
          type="submit"
          variant="contained"
          fullWidth
          loading={isLoading}
          sx={{ mt: 3, py: 1.5, borderRadius: 2, bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' } }}
        >
          Update Profile
        </LoadingButton>
      </form>
      <Snackbar
        open={openSnackbar}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={errorMessage ? 'error' : 'success'} sx={{ width: '100%' }}>
          {errorMessage || successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Profile; */
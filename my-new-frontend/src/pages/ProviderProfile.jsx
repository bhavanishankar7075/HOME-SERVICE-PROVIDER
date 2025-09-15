import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { Box, Typography, Button, CircularProgress, Alert, TextField } from '@mui/material';
import { setUser, setLoading } from '../redux/authSlice';

function ProviderProfile() {
  const { user, token } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || user.role !== 'provider') {
      setError('Unauthorized access.');
      setLoading(false);
      return;
    }
    setLoading(true);
    axios.get('http://localhost:5000/api/provider/profile', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        setProfile(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError(`Failed to fetch profile: ${err.response?.data?.message || err.message}`);
        setLoading(false);
      });
  }, [user, token, dispatch]);

  const handleLogout = () => {
    dispatch(setUser({ user: null, token: null }));
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  if (loading) return <CircularProgress className="flex justify-center mt-20" />;
  if (error) return <Alert severity="error" className="max-w-md mx-auto mt-5">{error}</Alert>;
  if (!user || user.role !== 'provider') return null;

  return (
    <Box className="min-h-screen p-6 mx-auto bg-gray-100 max-w-7xl">
      <Typography variant="h3" className="mb-8 font-bold text-center text-blue-900">
        Provider Profile
      </Typography>
      <Box className="p-6 bg-white rounded-lg shadow-md">
        <Typography>Name: {profile?.name || 'N/A'}</Typography>
        <Typography>Email: {profile?.email || 'N/A'}</Typography>
        <Typography>Phone: {profile?.phone || 'N/A'}</Typography>
        <Typography>Skills: {profile?.profile?.skills?.join(', ') || 'N/A'}</Typography>
        <Typography>Availability: {profile?.profile?.availability || 'N/A'}</Typography>
        <Typography>Location: {profile?.profile?.location || 'N/A'}</Typography>
        {profile?.profile?.image && (
          <img src={`http://localhost:5000${profile.profile.image}`} alt="Profile" className="object-cover w-40 h-40 mt-4 rounded-lg shadow-md" />
        )}
        <Button
          variant="contained"
          className="mt-6 text-white bg-blue-600 hover:bg-blue-700"
          onClick={() => handleLogout()}
        >
          Logout
        </Button>
      </Box>
    </Box>
  );
}

export default ProviderProfile;
import React, { useEffect, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import {
  Box, Grid, Card, CardContent, Typography, Button, CircularProgress, Alert,
  Tabs, Tab, TextField, Dialog, DialogActions, DialogContent, DialogTitle, Switch, Snackbar,
  Avatar, CardMedia, Divider, CardActions, Paper, List, ListItem, ListItemIcon, ListItemText, Badge, Rating,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { 
  CheckCircle as CheckCircleIcon, 
  Cancel as CancelOutlined, 
  PersonPinCircle as PersonPinCircleIcon,
  Phone as PhoneIcon,
  Event as EventIcon,
  Schedule as ScheduleIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Notifications as NotificationsIcon
} from '@mui/icons-material';
import io from 'socket.io-client';
import { setUser, clearUser, setLocation, clearNotifications } from '../redux/authSlice';
import { useNavigate } from 'react-router-dom';
import LoadingScreen from '../components/LoadingScreen';
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const socket = io(API_URL);

const ProviderBookingCard = ({ booking, onAction, isActionLoading }) => {
  return (
    <Card variant="outlined" sx={{ mb: 2, boxShadow: 2 }}>
      <Grid container>
        <Grid item xs={12} md={4}>
          <CardMedia
            component="img"
            image={booking.service?.image || `https://via.placeholder.com/300x200?text=${booking.service?.name.charAt(0)}`} // <-- UPDATED
            alt={booking.service?.name}
            sx={{ height: '100%', objectFit: 'cover' }}
          />
        </Grid>
        <Grid item xs={12} md={8}>
          <CardContent>
            <Typography variant="h6">{booking.service?.name}</Typography>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle1" gutterBottom>Customer Details</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <PersonPinCircleIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2"><strong>Name:</strong> {booking.customerDetails.name}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <PhoneIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2"><strong>Phone:</strong> {booking.customerDetails.phone}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PersonPinCircleIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2" className="location-text"><strong>Location:</strong> {booking.location}</Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle1" gutterBottom>Schedule</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <EventIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2">{new Date(booking.scheduledTime).toLocaleDateString()}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <ScheduleIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2">{new Date(booking.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Typography>
            </Box>
          </CardContent>
          <CardActions sx={{ justifyContent: 'flex-end', p: 2, gap: 1, flexWrap: 'wrap' }}>
            {booking.status === 'assigned' && (
              <>
                <Button 
                  variant="contained" 
                  color="success" 
                  size="small" 
                  startIcon={<CheckIcon />} 
                  onClick={() => onAction(booking._id, 'accept')} 
                  disabled={isActionLoading[booking._id]}
                >
                  {isActionLoading[booking._id] ? <CircularProgress size={24} /> : 'Accept'}
                </Button>
                <Button 
                  variant="contained" 
                  color="error" 
                  size="small" 
                  startIcon={<CloseIcon />} 
                  onClick={() => onAction(booking._id, 'reject')} 
                  disabled={isActionLoading[booking._id]}
                >
                  {isActionLoading[booking._id] ? <CircularProgress size={24} /> : 'Reject'}
                </Button>
              </>
            )}
            {booking.status === 'in-progress' && (
              <Button 
                variant="contained" 
                color="primary" 
                size="small" 
                startIcon={<CheckCircleIcon />} 
                onClick={() => onAction(booking._id, 'complete')} 
                disabled={isActionLoading[booking._id]}
              >
                {isActionLoading[booking._id] ? <CircularProgress size={24} /> : 'Mark as Complete'}
              </Button>
            )}
          </CardActions>
        </Grid>
      </Grid>
    </Card>
  );
};

function ProviderDashboard() {
  const { user, token, location, notifications = [] } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [previousWorks, setPreviousWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [ratingFilter, setRatingFilter] = useState('All');
  const [actionLoading, setActionLoading] = useState({});
  const [message, setMessage] = useState({ open: false, text: '', severity: 'success' });

  const [editData, setEditData] = useState({
    name: '',
    phone: '',
    skills: '',
    availability: '',
    location: {
      fullAddress: location || '',
      details: { streetNumber: '', street: '', city: '', state: '', country: '', postalCode: '' }
    },
    image: null
  });

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [profileRes, bookingsRes, prevWorksRes] = await Promise.all([
        axios.get(`${API_URL}/api/users/profile`, config),
        axios.get(`${API_URL}/api/bookings/my-bookings`, config),
        axios.get(`${API_URL}/api/bookings/previous-works`, config)
      ]);

      setProfile(profileRes.data);
      setBookings(bookingsRes.data);
      setPreviousWorks(prevWorksRes.data);
      
      setEditData({
        name: profileRes.data.name,
        phone: profileRes.data.phone || '',
        skills: profileRes.data.profile?.skills?.join(', ') || '',
        availability: profileRes.data.profile?.availability || '',
        location: {
          fullAddress: location || profileRes.data.profile?.location?.fullAddress || '',
          details: {
            streetNumber: profileRes.data.profile?.location?.details?.streetNumber || '',
            street: profileRes.data.profile?.location?.details?.street || '',
            city: profileRes.data.profile?.location?.details?.city || '',
            state: profileRes.data.profile?.location?.details?.state || '',
            country: profileRes.data.profile?.location?.details?.country || '',
            postalCode: profileRes.data.profile?.location?.details?.postalCode || ''
          }
        },
        image: null,
      });
      console.log('Notifications loaded:', notifications);
    } catch (err) {
      setError(`Failed to fetch data: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  }, [token, location, notifications]);

  useEffect(() => {
    if (!user || user.role !== 'provider') {
      navigate('/login');
      return;
    }
    fetchData();

    const handleConnect = () => socket.emit('joinRoom', user._id);
    socket.on('connect', handleConnect);
    if (socket.connected) handleConnect();
    
    const handleNewBooking = (data) => {
      setMessage({ open: true, text: data.message, severity: 'success' });
      fetchData();
    };
    
    const handleBookingUpdate = () => {
      console.log('Received bookingStatusUpdate, refreshing data');
      fetchData();
    };

    const handleFeedbackSubmitted = (data) => {
      setMessage({ 
        open: true, 
        text: `New feedback received for ${data.feedback.serviceName || 'service'}: ${data.feedback.rating}/5`, 
        severity: 'success' 
      });
      fetchData();
    };

    const handleFeedbackUpdated = (data) => {
      setMessage({ 
        open: true, 
        text: `Feedback updated for ${data.serviceName || 'service'}: ${data.rating}/5`, 
        severity: 'info' 
      });
      fetchData();
    };

    const handleFeedbackDeleted = (data) => {
      setMessage({ 
        open: true, 
        text: `Feedback deleted for ${data.serviceName || 'service'}`, 
        severity: 'warning' 
      });
      fetchData();
    };

    socket.on('newBookingAssigned', handleNewBooking);
    socket.on('bookingStatusUpdate', handleBookingUpdate);
    socket.on('feedbackSubmitted', handleFeedbackSubmitted);
    socket.on('feedbackUpdated', handleFeedbackUpdated);
    socket.on('feedbackDeleted', handleFeedbackDeleted);
    socket.on('userUpdated', (updatedUser) => {
      console.log('Received userUpdated:', {
        userId: updatedUser._id,
        location: updatedUser.profile?.location,
        editOpen: editOpen,
        currentEditLocation: editData.location
      });
      setProfile(updatedUser);
      setEditData(prev => ({
        ...prev,
        name: updatedUser.name,
        phone: updatedUser.phone || '',
        skills: updatedUser.profile?.skills?.join(', ') || '',
        availability: updatedUser.profile?.availability || '',
        location: editOpen ? prev.location : {
          fullAddress: location || updatedUser.profile?.location?.fullAddress || '',
          details: {
            streetNumber: updatedUser.profile?.location?.details?.streetNumber || '',
            street: updatedUser.profile?.location?.details?.street || '',
            city: updatedUser.profile?.location?.details?.city || '',
            state: updatedUser.profile?.location?.details?.state || '',
            country: updatedUser.profile?.location?.details?.country || '',
            postalCode: updatedUser.profile?.location?.details?.postalCode || ''
          }
        },
        image: null,
      }));
      dispatch(setUser({ user: updatedUser, token }));
      if (!editOpen) {
        console.log('Updating Redux location:', updatedUser.profile?.location?.fullAddress || '');
        dispatch(setLocation(updatedUser.profile?.location?.fullAddress || ''));
      } else {
        console.log('Skipping Redux location update due to editOpen');
      }
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('newBookingAssigned', handleNewBooking);
      socket.off('bookingStatusUpdate', handleBookingUpdate);
      socket.off('feedbackSubmitted', handleFeedbackSubmitted);
      socket.off('feedbackUpdated', handleFeedbackUpdated);
      socket.off('feedbackDeleted', handleFeedbackDeleted);
      socket.off('userUpdated');
    };
  }, [user, token, navigate, fetchData, editOpen, location, dispatch]);

  useEffect(() => {
    // Sync editData.location with state.auth.location when it changes
    setEditData(prev => ({
      ...prev,
      location: {
        fullAddress: location || prev.location.fullAddress,
        details: prev.location.details // Preserve details unless updated by backend
      }
    }));
  }, [location]);

  const handleBookingAction = async (bookingId, action) => {
    const booking = bookings.find(b => b._id === bookingId);
    if (!booking) {
      setMessage({ open: true, text: 'Booking not found.', severity: 'error' });
      return;
    }
    if (action === 'accept' || action === 'reject') {
      if (booking.status !== 'assigned') {
        setMessage({ open: true, text: `Booking must be in "assigned" state to be ${action}ed.`, severity: 'error' });
        return;
      }
    }
    if (action === 'complete' && booking.status !== 'in-progress') {
      setMessage({ open: true, text: 'Booking must be in "in-progress" state to be completed.', severity: 'error' });
      return;
    }

    setActionLoading(prev => ({ ...prev, [bookingId]: true }));
    let url = `${API_URL}/api/bookings/${bookingId}/${action}`;
    let payload = {};
    if (action === 'complete') {
      url = `${API_URL}/api/bookings/${bookingId}/status`;
      payload = { status: 'completed' };
    }
    try {
      console.log(`Sending ${action} request to ${url}`);
      await axios.put(url, payload, { headers: { Authorization: `Bearer ${token}` } });
      setMessage({ open: true, text: `Booking ${action}ed successfully!`, severity: 'success' });
      fetchData();
    } catch (err) {
      console.error(`Booking ${action} error:`, err.response?.data || err.message);
      setMessage({ open: true, text: `Failed to ${action} booking: ${err.response?.data?.message || err.message}`, severity: 'error' });
    } finally {
      setActionLoading(prev => ({ ...prev, [bookingId]: false }));
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    if (newValue !== 5) {
      dispatch(clearNotifications());
      console.log('Notifications cleared on tab change to:', newValue);
    }
  };

  const handleToggleAvailability = async () => {
    setLoading(true);
    try {
      const response = await axios.put(
        `${API_URL}/api/users/profile/${user._id}/toggle-availability`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const newAvailability = response.data.availability || (response.data.profile?.availability ? 'Available' : 'Unavailable');
      console.log('Toggle availability response:', response.data, 'New availability:', newAvailability);
      setProfile(prev => prev ? { 
        ...prev, 
        profile: { ...prev.profile, availability: newAvailability }
      } : prev);
      setEditData(prev => ({ ...prev, availability: newAvailability }));
      setMessage({ 
        open: true, 
        text: `Availability updated to ${newAvailability}!`, 
        severity: 'success' 
      });
    } catch (error) {
      console.error('Toggle availability error:', error.response?.data || error.message);
      setMessage({ 
        open: true, 
        text: `Failed to toggle availability: ${error.response?.data?.message || error.message}`, 
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    setLoading(true);
    try {
      const response = await axios.put(
        `${API_URL}/api/users/profile/${user._id}/toggle-status`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const newStatus = response.data.status || (response.data.profile?.status ? 'active' : 'inactive');
      console.log('Toggle status response:', response.data, 'New status:', newStatus);
      setProfile(prev => prev ? { 
        ...prev, 
        profile: { ...prev.profile, status: newStatus }
      } : prev);
      setMessage({ 
        open: true, 
        text: `Status updated to ${newStatus}!`, 
        severity: 'success' 
      });
    } catch (error) {
      console.error('Toggle status error:', error.response?.data || error.message);
      setMessage({ 
        open: true, 
        text: `Failed to toggle status: ${error.response?.data?.message || error.message}`, 
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (isSaving) return; // Prevent re-entrant calls
    setIsSaving(true);
    setLoading(true);
    console.log('Saving profile with location:', editData.location);
    const formData = new FormData();
    formData.append('name', editData.name);
    formData.append('phone', editData.phone);
    formData.append('skills', editData.skills);
    formData.append('availability', editData.availability);
    formData.append('location', JSON.stringify(editData.location));
    if (editData.image) formData.append('profileImage', editData.image);
    if (editData.availability.trim() === '') {
      setMessage({ open: true, text: 'Availability is required for providers.', severity: 'error'});
      setLoading(false);
      setIsSaving(false);
      return;
    }
    try {
      const res = await axios.put(`${API_URL}/api/users/profile`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      setProfile(res.data);
      setEditData(prev => ({
        ...prev,
        name: res.data.name,
        phone: res.data.phone || '',
        skills: res.data.profile?.skills?.join(', ') || '',
        availability: res.data.profile?.availability || '',
        location: {
          fullAddress: location || res.data.profile?.location?.fullAddress || '',
          details: {
            streetNumber: res.data.profile?.location?.details?.streetNumber || '',
            street: res.data.profile?.location?.details?.street || '',
            city: res.data.profile?.location?.details?.city || '',
            state: res.data.profile?.location?.details?.state || '',
            country: res.data.profile?.location?.details?.country || '',
            postalCode: res.data.profile?.location?.details?.postalCode || ''
          }
        },
        image: null,
      }));
      dispatch(setUser({ user: res.data, token }));
      dispatch(setLocation(res.data.profile?.location?.fullAddress || ''));
      setEditOpen(false);
      setMessage({ open: true, text: 'Profile updated successfully!', severity: 'success' });
      console.log('Profile saved successfully, new profile:', res.data);
    } catch (err) {
      console.error('Profile update error:', err.response?.data || err.message);
      setMessage({ open: true, text: `Failed to update profile: ${err.response?.data?.message || err.message}`, severity: 'error'});
    } finally {
      setLoading(false);
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setLoading(true);
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ open: true, text: 'New passwords do not match.', severity: 'error' });
      setLoading(false);
      return;
    }
    try {
      await axios.put(`${API_URL}/api/users/change-password`, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      }, { headers: { Authorization: `Bearer ${token}` } });
      dispatch(clearUser());
      alert('Password changed successfully. Please log in again.');
      navigate('/login');
    } catch (err) {
      setMessage({ open: true, text: `Failed to change password: ${err.response?.data?.message || err.message}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      await axios.delete(`${API_URL}/api/users/delete`, { headers: { Authorization: `Bearer ${token}` } });
      dispatch(clearUser());
      alert('Account deleted successfully.');
      navigate('/login');
    } catch (err) {
      setMessage({ open: true, text: `Failed to delete account: ${err.response?.data?.message || err.message}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

/*   if (loading && !profile) return <CircularProgress sx={{ display: 'block', margin: '100px auto' }} />;
 */ 
if (loading && !profile) {
  return <LoadingScreen title="Loading Dashboard" message="Getting your profile and bookings ready..." />;
}
 if (error) return <Alert severity="error">{error}</Alert>;
  if (!user || !profile) return null;

  const assignedBookings = bookings.filter(b => b.status === 'assigned');
  const inProgressBookings = bookings.filter(b => b.status === 'in-progress');
  const workHistory = previousWorks.sort((a, b) => new Date(b.scheduledTime) - new Date(a.scheduledTime));
  const filteredWorkHistory = ratingFilter === 'All'
    ? workHistory
    : workHistory.filter(w => w.feedback?.rating === parseInt(ratingFilter));

  return (
    <Box sx={{ maxWidth: '1200px', margin: 'auto',class:"provider", p: { xs: 2, md: 3 }, mt: 4 }}>
      <Typography variant="h3" gutterBottom sx={{ textAlign: 'center', mb: 4 ,mt:4 }}>Provider Dashboard</Typography>
      <Tabs value={tabValue} onChange={handleTabChange} centered variant="scrollable" scrollButtons="auto" sx={{ mb: 4, backgroundColor: 'white', borderRadius: 2, boxShadow: 1 }}>
        <Tab label="Profile" />
        <Tab label={<Badge color="error" badgeContent={assignedBookings.length} max={9}>New Bookings</Badge>} />
        <Tab label={<Badge color="error" badgeContent={inProgressBookings.length} max={9}>Active Jobs</Badge>} />
        <Tab label="Work History" />
        <Tab label="Settings" />
        <Tab label={<Badge color="error" badgeContent={notifications.length} max={9}>Notifications</Badge>} />
      </Tabs>

      {tabValue === 0 && (
        <Card sx={{ p: 3 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>Profile Details</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {profile.profile?.image ? (
                  <Avatar 
                    src={profile.profile.image} 
                    sx={{ width: 150, height: 150 }} 
                    onError={(e) => {
                      console.error('Failed to load provider image:', profile.profile.image);
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <Avatar sx={{ width: 150, height: 150, fontSize: '4rem' }}>{profile.name.charAt(0)}</Avatar>
                )}
              </Grid>
              <Grid item xs={12} md={8}>
                <Typography sx={{ mb: 1 }}><strong>Name:</strong> {profile.name}</Typography>
                <Typography sx={{ mb: 1 }}><strong>Email:</strong> {profile.email}</Typography>
                <Typography sx={{ mb: 1 }}><strong>Phone:</strong> {profile.phone || 'N/A'}</Typography>
                <Typography sx={{ mb: 1 }}><strong>Location:</strong> {profile.profile?.location?.fullAddress || 'N/A'}</Typography>
                <Typography sx={{ mb: 1 }}><strong>Skills:</strong> {profile.profile?.skills?.join(', ') || 'N/A'}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', my: 1 }}>
                  <Typography><strong>Availability:</strong></Typography>
                  <Switch 
                    checked={profile.profile?.availability === 'Available'} 
                    onChange={handleToggleAvailability} 
                    disabled={loading} 
                  />
                  <Typography>{profile.profile?.availability || 'N/A'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', my: 1 }}>
                  <Typography><strong>Status:</strong></Typography>
                  <Switch 
                    checked={profile.profile?.status === 'active'} 
                    onChange={handleToggleStatus} 
                    disabled={loading} 
                  />
                  <Typography>{profile.profile?.status || 'N/A'}</Typography>
                </Box>
              </Grid>
            </Grid>
            <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button variant="outlined" onClick={() => setEditOpen(true)}>Edit Profile</Button>
            </Box>
          </CardContent>
        </Card>
      )}
      
      {tabValue === 1 && (
        <Box>
          <Typography variant="h5" sx={{ mb: 2 }}>New Assigned Bookings</Typography>
          {assignedBookings.length > 0 ? (
            assignedBookings.map(booking => (
              <ProviderBookingCard 
                key={booking._id} 
                booking={booking} 
                onAction={handleBookingAction} 
                isActionLoading={actionLoading}
              />
            ))
          ) : (<Paper sx={{p: 3, textAlign: 'center'}}><Typography>You have no new bookings assigned.</Typography></Paper>)}
        </Box>
      )}

      {tabValue === 2 && (
        <Box>
          <Typography variant="h5" sx={{ mb: 2 }}>In-Progress Jobs</Typography>
          {inProgressBookings.length > 0 ? (
            inProgressBookings.map(booking => (
              <ProviderBookingCard 
                key={booking._id} 
                booking={booking} 
                onAction={handleBookingAction} 
                isActionLoading={actionLoading}
              />
            ))
          ) : (<Paper sx={{p: 3, textAlign: 'center'}}><Typography>You have no jobs currently in progress.</Typography></Paper>)}
        </Box>
      )}

      {tabValue === 3 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5">Work History</Typography>
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Filter by Rating</InputLabel>
              <Select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                label="Filter by Rating"
              >
                <MenuItem value="All">All</MenuItem>
                <MenuItem value="1">1 Star</MenuItem>
                <MenuItem value="2">2 Stars</MenuItem>
                <MenuItem value="3">3 Stars</MenuItem>
                <MenuItem value="4">4 Stars</MenuItem>
                <MenuItem value="5">5 Stars</MenuItem>
              </Select>
            </FormControl>
          </Box>
          {filteredWorkHistory.length > 0 ? (
            filteredWorkHistory.map((work) => {
              const customerImageUrl = work.customer?.profile?.image || null; 
              console.log('Work History Debug:', {
                bookingId: work._id,
                customerId: work.customer?._id,
                customerExists: !!work.customer,
                profileExists: !!work.customer?.profile,
                profileRaw: work.customer?.profile,
                imagePath: work.customer?.profile?.image,
                customerImageUrl
              });
              return (
                <Card key={work._id} variant="outlined" sx={{ mb: 2, boxShadow: 2 }}>
                  <CardContent>
                    <Typography variant="h6">{work.service?.name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Booking ID: #{work._id.slice(-6).toUpperCase()}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <PersonPinCircleIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body2">Customer: {work.customer?.name || 'N/A'}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <EventIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body2">Completed: {new Date(work.scheduledTime).toLocaleDateString()}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <PersonPinCircleIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body2">Location: {work.location}</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>Status: {work.status}</Typography>
                    {work.feedback && work.customer && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                        <Typography variant="subtitle2" gutterBottom>Customer Feedback</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          {customerImageUrl ? (
                            <Avatar
                              src={customerImageUrl}
                              sx={{ width: 40, height: 40, mr: 1 }}
                              onError={(e) => {
                                console.error('Failed to load customer image:', customerImageUrl);
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <Avatar
                              src="https://via.placeholder.com/40?text=U"
                              sx={{ width: 40, height: 40, mr: 1 }}
                            />
                          )}
                          <Typography variant="body2"><strong>{work.customer?.name || 'Anonymous'}</strong></Typography>
                        </Box>
                        <Rating value={work.feedback.rating} readOnly size="small" />
                        <Typography variant="body2" color="text.secondary">{work.feedback.comment}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Submitted: {new Date(work.feedback.createdAt).toLocaleString()}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              );
            })
          ) : (<Paper sx={{p: 3, textAlign: 'center'}}><Typography>No past jobs match the selected rating.</Typography></Paper>)}
        </Box>
      )}
      
      {tabValue === 4 && (
        <Card sx={{ p: { xs: 2, md: 3 } }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>Account Settings</Typography>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, maxWidth: 'sm' }}>
              <Button variant="outlined" onClick={() => setChangePasswordOpen(true)}>Change Password</Button>
              <Button variant="contained" color="error" onClick={() => setDeleteOpen(true)}>Delete Account</Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {tabValue === 5 && (
        <Box>
          <Typography variant="h5" sx={{ mb: 2 }}>Your Notifications</Typography>
          <Paper sx={{p: 3}}>
            {notifications.length > 0 ? (
              <List>
                {notifications.map((notif) => (
                  <ListItem key={notif.id} divider>
                    <ListItemIcon><NotificationsIcon color="primary"/></ListItemIcon>
                    <ListItemText 
                      primary={notif.message} 
                      secondary={new Date(notif.id).toLocaleString()}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography>You have no new notifications.</Typography>
            )}
          </Paper>
        </Box>
      )}
      
      <Dialog open={editOpen} onClose={() => setEditOpen(false)}>
        <DialogTitle>Edit Profile</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            type="text"
            fullWidth
            variant="standard"
            value={editData.name}
            onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Phone"
            type="text"
            fullWidth
            variant="standard"
            value={editData.phone}
            onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Skills (comma-separated)"
            type="text"
            fullWidth
            variant="standard"
            value={editData.skills}
            onChange={(e) => setEditData(prev => ({ ...prev, skills: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Availability"
            type="text"
            fullWidth
            variant="standard"
            value={editData.availability}
            onChange={(e) => setEditData(prev => ({ ...prev, availability: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Location"
            type="text"
            fullWidth
            variant="standard"
            value={editData.location.fullAddress}
            onChange={(e) => setEditData(prev => ({
              ...prev,
              location: { ...prev.location, fullAddress: e.target.value }
            }))}
          />
          <Button variant="contained" component="label" sx={{ mt: 2 }}>
            Upload Profile Image
            <input type="file" hidden accept="image/*" onChange={(e) => setEditData(prev => ({ ...prev, image: e.target.files[0] }))} />
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveProfile} disabled={loading || isSaving}>
            {loading || isSaving ? <CircularProgress size={24} /> : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)}>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Current Password"
            type="password"
            fullWidth
            variant="standard"
            value={passwordData.currentPassword}
            onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="New Password"
            type="password"
            fullWidth
            variant="standard"
            value={passwordData.newPassword}
            onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Confirm New Password"
            type="password"
            fullWidth
            variant="standard"
            value={passwordData.confirmPassword}
            onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChangePasswordOpen(false)}>Cancel</Button>
          <Button onClick={handleChangePassword} disabled={loading}>
            {loading ? <CircularProgress size={24} /> : "Change"}
          </Button>
        </DialogActions>
      </Dialog>
      
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Confirm Account Deletion</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete your account? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteAccount} disabled={loading} color="error">
            {loading ? <CircularProgress size={24} /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar
        open={message.open}
        autoHideDuration={6000}
        onClose={() => setMessage({ ...message, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setMessage({ ...message, open: false })}
          severity={message.severity || 'info'}
          sx={{ width: '100%' }}
        >
          {message.text}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default ProviderDashboard;
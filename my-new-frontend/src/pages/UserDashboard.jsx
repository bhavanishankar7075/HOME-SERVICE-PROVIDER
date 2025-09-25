import React, { useEffect, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import {
  Box, Card, CardContent, Typography, Button, CircularProgress, Alert, DialogTitle,
  Dialog, DialogActions, DialogContent, TextField, Tab, Tabs, Grid, Chip, Avatar,
  CardMedia, Divider, Rating, Paper, Badge, List, ListItem, ListItemIcon, ListItemText,
  FormControl, InputLabel, Select, MenuItem, Snackbar, Container, GlobalStyles,CardActions
} from '@mui/material';
import {
  CalendarToday as CalendarTodayIcon,
  AccessTime as AccessTimeIcon,
  SupportAgent as SupportAgentIcon,
  Cancel as CancelIcon,
  RateReview as RateReviewIcon,
  Replay as ReplayIcon,
  Notifications as NotificationsIcon,
  Book as BookIcon,
  CheckCircle as CheckCircleIcon,
  Star as StarIcon
} from '@mui/icons-material';
import io from 'socket.io-client';
import { setUser, clearUser, clearNotifications, setLocation } from '../redux/authSlice';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const socket = io(API_URL);

const scrollbarStyles = (
  <GlobalStyles
    styles={{
      '*::-webkit-scrollbar': { width: '8px' },
      '*::-webkit-scrollbar-track': { background: '#f1f1f1' },
      '*::-webkit-scrollbar-thumb': { background: '#888', borderRadius: '4px' },
      '*::-webkit-scrollbar-thumb:hover': { background: '#555' },
    }}
  />
);

const DashboardCard = ({ title, children }) => (
  <Paper elevation={2} sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
    <Typography variant="h6" sx={{ p: 2, bgcolor: 'common.white', borderBottom: '1px solid #e0e0e0' }}>{title}</Typography>
    {children}
  </Paper>
);

const StatCard = ({ icon, title, value }) => (
  <Grid item xs={12} sm={6} md={3}>
    <Paper sx={{ p: 2, borderRadius: 2, boxShadow: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ bgcolor: 'grey.200', color: 'text.primary', width: 48, height: 48 }}>{icon}</Avatar>
        <Box>
          <Typography color="text.secondary" variant="body2">{title}</Typography>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{value}</Typography>
        </Box>
      </Box>
    </Paper>
  </Grid>
);

const BookingCard = ({ booking, onCancel, onFeedback, onRebook, showImage = true }) => {
  const canCancel = ['pending', 'assigned'].includes(booking.status);
  const canGiveFeedback = booking.status === 'completed' && !booking.feedback;
  const canRebook = ['completed', 'cancelled', 'rejected'].includes(booking.status);

  return (
    <Card variant="outlined" sx={{ mb: 2, boxShadow: 2 }}>
      <Grid container>
        {showImage && (
          <Grid item xs={12} sm={4}>
            <CardMedia
              component="img"
              image={booking.service?.image ? `${API_URL}${booking.service.image}` : `https://via.placeholder.com/300x200?text=${booking.service?.name.charAt(0)}`}
              alt={booking.service?.name}
              sx={{ height: '100%', objectFit: 'cover' }}
            />
          </Grid>
        )}
        <Grid item xs={12} sm={showImage ? 8 : 12}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Typography variant="h6">{booking.service?.name}</Typography>
              <Chip 
                label={booking.status} 
                color={
                  booking.status === 'completed' ? 'success' : 
                  booking.status === 'in-progress' ? 'info' :
                  booking.status === 'assigned' ? 'primary' :
                  booking.status === 'cancelled' || booking.status === 'rejected' ? 'error' : 
                  'default'
                } 
                size="small"
                sx={{ textTransform: 'capitalize' }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Booking ID: #{booking._id.slice(-6).toUpperCase()}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <CalendarTodayIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2">{new Date(booking.scheduledTime).toLocaleDateString()}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <AccessTimeIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2">{new Date(booking.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <SupportAgentIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2">Provider: {booking.provider?.name || 'Awaiting Assignment'}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2">Location: {booking.location}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2">Price: ₹{booking.totalPrice}</Typography>
            </Box>
            {booking.feedback && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>Your Feedback</Typography>
                <Rating value={booking.feedback.rating} readOnly size="small" />
                <Typography variant="body2" color="text.secondary">{booking.feedback.comment}</Typography>
              </Box>
            )}
          </CardContent>
          <Divider />
          <CardActions sx={{ justifyContent: 'flex-end', p: 2, flexWrap: 'wrap', gap: 1 }}>
            {canCancel && <Button size="small" color="error" startIcon={<CancelIcon />} onClick={() => onCancel(booking)}>Cancel Booking</Button>}
            {canGiveFeedback && <Button size="small" variant="outlined" startIcon={<RateReviewIcon />} onClick={() => onFeedback(booking)}>Leave Feedback</Button>}
            {canRebook && <Button size="small" variant="contained" startIcon={<ReplayIcon />} onClick={() => onRebook(booking.service)}>Rebook</Button>}
          </CardActions>
        </Grid>
      </Grid>
    </Card>
  );
};

function UserDashboard() {
  const { user, token, location, notifications = [] } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const [allBookings, setAllBookings] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ open: false, text: '', severity: 'info' });
  const [tabValue, setTabValue] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [bookingForAction, setBookingForAction] = useState(null);
  const [editData, setEditData] = useState({ name: '', phone: '', location: { fullAddress: '' }, image: null });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [feedbackData, setFeedbackData] = useState({ rating: 5, comment: '' });
  const [ratingFilter, setRatingFilter] = useState('All');

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [profileRes, bookingsRes] = await Promise.all([
        axios.get(`${API_URL}/api/users/profile`, config),
        axios.get(`${API_URL}/api/bookings/my-bookings`, config)
      ]);
      setProfile(profileRes.data);
      setAllBookings(bookingsRes.data);
      setEditData({
        name: profileRes.data.name || '',
        phone: profileRes.data.phone || '',
        location: { fullAddress: location || profileRes.data.profile?.location?.fullAddress || '' },
        image: null,
      });
      console.log('Notifications loaded:', notifications);
    } catch (err) {
      setMessage({ open: true, text: `Failed to fetch dashboard data: ${err.response?.data?.message || err.message}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [token, location, notifications]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchData();

    const handleConnect = () => socket.emit('joinRoom', user._id);
    socket.on('connect', handleConnect);
    if (socket.connected) handleConnect();
    
    const handleBookingUpdate = () => fetchData();
    const handleServiceCompleted = (data) => {
      setMessage({ open: true, text: `Service ${data.serviceName} has been completed! You can now submit feedback.`, severity: 'success' });
      fetchData();
    };
    const handleUserUpdated = (updatedUser) => {
      console.log('Received userUpdated:', {
        userId: updatedUser._id,
        location: updatedUser.profile?.location,
        editOpen: editOpen,
        currentEditLocation: editData.location
      });
      setProfile(updatedUser);
      setEditData(prev => ({
        ...prev,
        name: updatedUser.name || '',
        phone: updatedUser.phone || '',
        location: editOpen ? prev.location : { fullAddress: location || updatedUser.profile?.location?.fullAddress || '' },
        image: null,
      }));
      dispatch(setUser({ user: updatedUser, token }));
      if (!editOpen) {
        console.log('Updating Redux location:', updatedUser.profile?.location?.fullAddress || '');
        dispatch(setLocation(updatedUser.profile?.location?.fullAddress || ''));
      } else {
        console.log('Skipping Redux location update due to editOpen');
      }
    };

    socket.on('bookingStatusUpdate', handleBookingUpdate);
    socket.on('bookingUpdate', handleBookingUpdate);
    socket.on('serviceCompleted', handleServiceCompleted);
    socket.on('userUpdated', handleUserUpdated);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('bookingStatusUpdate', handleBookingUpdate);
      socket.off('bookingUpdate', handleBookingUpdate);
      socket.off('serviceCompleted', handleServiceCompleted);
      socket.off('userUpdated', handleUserUpdated);
    };
  }, [user, token, navigate, fetchData, editOpen, location, dispatch]);

  useEffect(() => {
    setEditData(prev => ({
      ...prev,
      location: { fullAddress: location || prev.location.fullAddress }
    }));
  }, [location]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    if (newValue !== 4) {
      dispatch(clearNotifications());
      console.log('Notifications cleared on tab change to:', newValue);
    }
  };

  const handleClearNotifications = () => {
    dispatch(clearNotifications());
    console.log('Notifications cleared manually via button');
  };
  
  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      if (!editData.name || editData.name.trim() === '') {
        setMessage({ open: true, text: 'Name is required.', severity: 'error' });
        setLoading(false);
        return;
      }
      const formData = new FormData();
      formData.append('name', editData.name.trim());
      formData.append('phone', editData.phone || '');
      formData.append('location', JSON.stringify(editData.location));
      if (editData.image) {
        formData.append('profileImage', editData.image);
      }
      const config = { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } };
      const { data } = await axios.put(`${API_URL}/api/users/profile`, formData, config);
      setProfile(data);
      dispatch(setUser({ user: data, token }));
      dispatch(setLocation(data.profile?.location?.fullAddress || ''));
      setEditOpen(false);
      setMessage({ open: true, text: 'Profile saved successfully!', severity: 'success' });
    } catch (err) {
      setMessage({ open: true, text: `Failed to update profile: ${err.response?.data?.message || err.message}`, severity: 'error' });
    } finally {
      setLoading(false);
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
      await axios.put(
        `${API_URL}/api/users/change-password`,
        { currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
      await axios.delete(`${API_URL}/api/users/delete`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      dispatch(clearUser());
      alert('Account deleted successfully.');
      navigate('/login');
    } catch (err) {
      setMessage({ open: true, text: `Failed to delete account: ${err.response?.data?.message || err.message}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCancelDialog = (booking) => { setBookingForAction(booking); setCancelOpen(true); };
  const handleOpenFeedbackDialog = (booking) => { setBookingForAction(booking); setFeedbackOpen(true); };
  const handleRebook = (service) => navigate(`/services/${service._id}`);
  
  const handleConfirmCancel = async () => {
    if (!bookingForAction) return;
    setLoading(true);
    try {
      console.log(`Sending cancel request for booking ${bookingForAction._id}`);
      await axios.delete(`${API_URL}/api/bookings/${bookingForAction._id}/cancel`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCancelOpen(false);
      setBookingForAction(null);
      setMessage({ open: true, text: 'Booking cancelled successfully.', severity: 'success' });
      fetchData();
    } catch (err) {
      console.error('Cancel booking error:', err.response?.data || err.message);
      setMessage({ open: true, text: `Failed to cancel booking: ${err.response?.data?.message || err.message}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmFeedback = async () => {
    if (!bookingForAction) return;
    setLoading(true);
    try {
      if (!feedbackData.comment.trim()) {
        setMessage({ open: true, text: 'Comment is required.', severity: 'error' });
        setLoading(false);
        return;
      }
      if (feedbackData.rating < 1 || feedbackData.rating > 5) {
        setMessage({ open: true, text: 'Rating must be between 1 and 5.', severity: 'error' });
        setLoading(false);
        return;
      }
      await axios.post(`${API_URL}/api/feedback`, 
        {
          bookingId: bookingForAction._id,
          rating: feedbackData.rating,
          comment: feedbackData.comment,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFeedbackOpen(false);
      setBookingForAction(null);
      setFeedbackData({ rating: 5, comment: '' });
      setMessage({ open: true, text: 'Thank you for your feedback!', severity: 'success' });
      fetchData();
    } catch (err) {
      console.error('Feedback submission error:', err.response?.data || err.message);
      setMessage({ open: true, text: `Failed to submit feedback: ${err.response?.data?.message || err.message}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };
  
  const activeBookings = allBookings.filter(b => ['pending', 'assigned', 'in-progress'].includes(b.status));
  const previousBookings = allBookings
    .filter(b => ['completed', 'cancelled', 'rejected'].includes(b.status))
    .sort((a, b) => new Date(b.scheduledTime) - new Date(a.scheduledTime));
  const filteredPreviousBookings = ratingFilter === 'All'
    ? previousBookings
    : previousBookings.filter(b => b.feedback?.rating === parseInt(ratingFilter));
  
  const totalBookings = allBookings.length;
  const completedBookings = allBookings.filter(b => b.status === 'completed').length;
  const averageRating = allBookings
    .filter(b => b.feedback?.rating)
    .reduce((acc, b) => acc + b.feedback.rating, 0) / (allBookings.filter(b => b.feedback?.rating).length || 1);

  if (loading && !profile) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;
  if (!user || !profile) return <Container sx={{ py: 8 }}><Typography sx={{ textAlign: 'center' }}>Please log in to view your dashboard.</Typography></Container>;

  console.log('Rendering Tabs with notification count:', notifications.length);

  return (
    <Box sx={{ py: { xs: 6, md: 9 }, bgcolor: '#f4f6f8', minHeight: '100vh' }}>
      {scrollbarStyles}
      <Container maxWidth="lg">
        <Typography variant="h4" component="h1" sx={{ mb: 1, textAlign: { xs: 'center', md: 'left' } }}>
          Welcome back, {user.name}!
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4, textAlign: { xs: 'center', md: 'left' } }}>
          Here is your dashboard on ServiceHub.
        </Typography>

        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          centered 
          variant="scrollable" 
          scrollButtons="auto" 
          sx={{ mb: 4, backgroundColor: 'white', borderRadius: 2, boxShadow: 1 }}
        >
          <Tab label="Profile" />
          <Tab 
            label={
              <Badge color="error" badgeContent={activeBookings.length} max={9}>
                Active Bookings
              </Badge>
            } 
          />
          <Tab label="Booking History" />
          <Tab label="Settings" />
          <Tab 
            label={
              <Badge color="error" badgeContent={notifications.length} max={9}>
                Notifications
              </Badge>
            } 
          />
        </Tabs>

        {tabValue === 0 && (
          <>
            <DashboardCard title="Profile Details">
              <Box sx={{ p: { xs: 2, md: 3 } }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={4} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    {profile.profile?.image ? (
                      <Avatar 
                        src={`${API_URL}${encodeURI(profile.profile.image)}`} 
                        sx={{ width: 100, height: 100 }}
                        onError={(e) => {
                          console.error('Failed to load profile image:', `${API_URL}${profile.profile.image}`);
                          e.target.src = 'https://via.placeholder.com/100?text=U';
                        }}
                      />
                    ) : (
                      <Avatar sx={{ width: 100, height: 100, fontSize: '2.5rem' }}>
                        {profile.name.charAt(0)}
                      </Avatar>
                    )}
                  </Grid>
                  <Grid item xs={12} sm={6} md={8}>
                    <Typography sx={{ mb: 1 }}><strong>Name:</strong> {profile.name}</Typography>
                    <Typography sx={{ mb: 1 }}><strong>Email:</strong> {profile.email}</Typography>
                    <Typography sx={{ mb: 1 }}><strong>Phone:</strong> {profile.phone || 'N/A'}</Typography>
                    <Typography sx={{ mb: 1 }}><strong>Location:</strong> {profile.profile?.location?.fullAddress || 'N/A'}</Typography>
                  </Grid>
                </Grid>
                <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button variant="outlined" onClick={() => setEditOpen(true)}>Edit Profile</Button>
                </Box>
              </Box>
            </DashboardCard>
            <Grid container spacing={2}>
              <StatCard icon={<BookIcon />} title="Total Bookings" value={totalBookings} />
              <StatCard icon={<CheckCircleIcon />} title="Completed Bookings" value={completedBookings} />
              <StatCard icon={<StarIcon />} title="Average Rating" value={averageRating.toFixed(1)} />
            </Grid>
          </>
        )}

        {tabValue === 1 && (
          <DashboardCard title="Track Your Active Services">
            {activeBookings.length > 0 ? (
              activeBookings.map(booking => (
                <BookingCard 
                  key={booking._id} 
                  booking={booking} 
                  onCancel={handleOpenCancelDialog} 
                  onFeedback={handleOpenFeedbackDialog} 
                  onRebook={handleRebook} 
                  showImage={true}
                />
              ))
            ) : (
              <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
                You have no active bookings to track.
              </Typography>
            )}
          </DashboardCard>
        )}

        {tabValue === 2 && (
          <DashboardCard title="Your Booking History">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
              <Typography variant="h6">Filter by Rating</Typography>
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
            {filteredPreviousBookings.length > 0 ? (
              filteredPreviousBookings.map(booking => (
                <BookingCard 
                  key={booking._id} 
                  booking={booking} 
                  onFeedback={handleOpenFeedbackDialog} 
                  onRebook={handleRebook}
                  showImage={false}
                />
              ))
            ) : (
              <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
                No bookings match the selected rating.
              </Typography>
            )}
          </DashboardCard>
        )}

        {tabValue === 3 && (
          <DashboardCard title="Account Settings">
            <Box sx={{ p: 2, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, maxWidth: 'sm' }}>
              <Button variant="outlined" onClick={() => setChangePasswordOpen(true)}>Change Password</Button>
              <Button variant="contained" color="error" onClick={() => setDeleteOpen(true)}>Delete Account</Button>
            </Box>
          </DashboardCard>
        )}

        {tabValue === 4 && (
          <DashboardCard title="Your Notifications">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
              <Typography variant="h6">Notifications</Typography>
              {notifications.length > 0 && (
                <Button 
                  variant="outlined" 
                  color="secondary" 
                  onClick={handleClearNotifications}
                >
                  Clear All Notifications
                </Button>
              )}
            </Box>
            {notifications.length > 0 ? (
              <List>
                {notifications.map((notif) => (
                  <ListItem key={notif.id} divider>
                    <ListItemIcon><NotificationsIcon color="primary" /></ListItemIcon>
                    <ListItemText 
                      primary={notif.message} 
                      secondary={new Date(notif.id).toLocaleString()}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
                You have no new notifications.
              </Typography>
            )}
          </DashboardCard>
        )}

        <Dialog open={editOpen} onClose={() => setEditOpen(false)}>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogContent>
            <TextField autoFocus margin="dense" label="Name" type="text" fullWidth variant="standard" value={editData.name} onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))} />
            <TextField margin="dense" label="Phone" type="text" fullWidth variant="standard" value={editData.phone} onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))} />
            <TextField margin="dense" label="Location Address" type="text" fullWidth variant="standard" value={editData.location.fullAddress} onChange={(e) => setEditData(prev => ({ ...prev, location: { ...prev.location, fullAddress: e.target.value } }))} />
            <Button variant="contained" component="label" sx={{ mt: 2 }}>
              Upload Profile Image
              <input type="file" hidden accept="image/*" onChange={(e) => setEditData(prev => ({ ...prev, image: e.target.files[0] }))} />
            </Button>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveProfile} disabled={loading}>{loading ? <CircularProgress size={24} /> : "Save"}</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)}>
          <DialogTitle>Change Password</DialogTitle>
          <DialogContent>
            <TextField autoFocus margin="dense" label="Current Password" type="password" fullWidth variant="standard" value={passwordData.currentPassword} onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))} />
            <TextField margin="dense" label="New Password" type="password" fullWidth variant="standard" value={passwordData.newPassword} onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))} />
            <TextField margin="dense" label="Confirm New Password" type="password" fullWidth variant="standard" value={passwordData.confirmPassword} onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setChangePasswordOpen(false)}>Cancel</Button>
            <Button onClick={handleChangePassword} disabled={loading}>{loading ? <CircularProgress size={24} /> : "Change"}</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
          <DialogTitle>Confirm Account Deletion</DialogTitle>
          <DialogContent><Typography>Are you sure you want to delete your account? This action cannot be undone.</Typography></DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button onClick={handleDeleteAccount} disabled={loading} color="error">{loading ? <CircularProgress size={24} /> : "Delete"}</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)}>
          <DialogTitle>Confirm Cancellation</DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to cancel your booking for "{bookingForAction?.service?.name}"?</Typography>
            <Typography color="text.secondary" variant="body2">This action cannot be undone.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCancelOpen(false)}>No, Keep It</Button>
            <Button onClick={handleConfirmCancel} color="error" variant="contained">Yes, Cancel</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)}>
          <DialogTitle>Leave Feedback for "{bookingForAction?.service?.name}"</DialogTitle>
          <DialogContent>
            <Typography component="legend">Your Rating</Typography>
            <Rating name="booking-rating" value={feedbackData.rating} onChange={(event, newValue) => { setFeedbackData(prev => ({ ...prev, rating: newValue })); }} />
            <TextField 
              autoFocus 
              margin="dense" 
              label="Your Comments" 
              type="text" 
              fullWidth 
              variant="outlined" 
              multiline 
              rows={4} 
              value={feedbackData.comment} 
              onChange={(e) => setFeedbackData(prev => ({ ...prev, comment: e.target.value }))} 
              error={!feedbackData.comment.trim()}
              helperText={!feedbackData.comment.trim() ? 'Comment is required' : ''}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFeedbackOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmFeedback} variant="contained" disabled={loading || !feedbackData.comment.trim() || feedbackData.rating < 1 || feedbackData.rating > 5}>
              {loading ? <CircularProgress size={24} /> : "Submit Feedback"}
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar 
          open={message.open} 
          autoHideDuration={4000} 
          onClose={() => setMessage({ ...message, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert onClose={() => setMessage({ ...message, open: false })} severity={message.severity || 'info'} sx={{ width: '100%' }}>
            {message.text}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
}

export default UserDashboard;




































































































//main-main
/* import React, { useEffect, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import {
  Box, Card, CardContent, Typography, Button, CircularProgress, Alert, DialogTitle,
  Dialog, DialogActions, DialogContent, TextField, Tab, Tabs, Grid, Chip, Avatar,
  CardMedia, Divider, Rating, Paper, CardActions, Badge, List, ListItem, ListItemIcon, ListItemText, GlobalStyles,
  FormControl, InputLabel, Select, MenuItem, Snackbar
} from '@mui/material';
import { 
  CalendarToday as CalendarTodayIcon, 
  AccessTime as AccessTimeIcon, 
  SupportAgent as SupportAgentIcon,
  Cancel as CancelIcon,
  RateReview as RateReviewIcon,
  Replay as ReplayIcon,
  Notifications as NotificationsIcon
} from '@mui/icons-material';
import io from 'socket.io-client';
import { setUser, clearUser, clearNotifications, setLocation } from '../redux/authSlice';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const socket = io(API_URL);

const BookingCard = ({ booking, onCancel, onFeedback, onRebook }) => {
  const canCancel = ['pending', 'assigned'].includes(booking.status);
  const canGiveFeedback = booking.status === 'completed' && !booking.feedback;
  const canRebook = ['completed', 'cancelled', 'rejected'].includes(booking.status);

  return (
    <Card variant="outlined" sx={{ mb: 2, boxShadow: 2 }}>
      <Grid container>
        <Grid item xs={12} sm={4}>
          <CardMedia
            component="img"
            image={booking.service?.image ? `${API_URL}${booking.service.image}` : `https://via.placeholder.com/300x200?text=${booking.service?.name.charAt(0)}`}
            alt={booking.service?.name}
            sx={{ height: '100%', objectFit: 'cover' }}
          />
        </Grid>
        <Grid item xs={12} sm={8}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Typography variant="h6">{booking.service?.name}</Typography>
              <Chip 
                label={booking.status} 
                color={
                  booking.status === 'completed' ? 'success' : 
                  booking.status === 'in-progress' ? 'info' :
                  booking.status === 'assigned' ? 'primary' :
                  booking.status === 'cancelled' || booking.status === 'rejected' ? 'error' : 
                  'default'
                } 
                size="small"
                sx={{ textTransform: 'capitalize' }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Booking ID: #{booking._id.slice(-6).toUpperCase()}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <CalendarTodayIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2">{new Date(booking.scheduledTime).toLocaleDateString()}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <AccessTimeIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2">{new Date(booking.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <SupportAgentIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2">Provider: {booking.provider?.name || 'Awaiting Assignment'}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2">Location: {booking.location}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2">Price: ₹{booking.totalPrice}</Typography>
            </Box>
            {booking.feedback && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>Your Feedback</Typography>
                <Rating value={booking.feedback.rating} readOnly size="small" />
                <Typography variant="body2" color="text.secondary">{booking.feedback.comment}</Typography>
              </Box>
            )}
          </CardContent>
          <Divider />
          <CardActions sx={{ justifyContent: 'flex-end', p: 2, flexWrap: 'wrap', gap: 1 }}>
            {canCancel && <Button size="small" color="error" startIcon={<CancelIcon />} onClick={() => onCancel(booking)}>Cancel Booking</Button>}
            {canGiveFeedback && <Button size="small" variant="outlined" startIcon={<RateReviewIcon />} onClick={() => onFeedback(booking)}>Leave Feedback</Button>}
            {canRebook && <Button size="small" variant="contained" startIcon={<ReplayIcon />} onClick={() => onRebook(booking.service)}>Rebook</Button>}
          </CardActions>
        </Grid>
      </Grid>
    </Card>
  );
};

const scrollbarStyles = (
  <GlobalStyles
    styles={{
      '*::-webkit-scrollbar': { width: '8px' },
      '*::-webkit-scrollbar-track': { background: '#f1f1f1' },
      '*::-webkit-scrollbar-thumb': { background: '#888', borderRadius: '4px' },
      '*::-webkit-scrollbar-thumb:hover': { background: '#555' },
    }}
  />
);

function UserDashboard() {
  const { user, token, location, notifications = [] } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const [allBookings, setAllBookings] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ open: false, text: '', severity: 'info' });
  const [tabValue, setTabValue] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [bookingForAction, setBookingForAction] = useState(null);
  const [editData, setEditData] = useState({ name: '', phone: '', location: { fullAddress: '' }, image: null });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [feedbackData, setFeedbackData] = useState({ rating: 5, comment: '' });
  const [ratingFilter, setRatingFilter] = useState('All');

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [profileRes, bookingsRes] = await Promise.all([
        axios.get(`${API_URL}/api/users/profile`, config),
        axios.get(`${API_URL}/api/bookings/my-bookings`, config)
      ]);
      setProfile(profileRes.data);
      setAllBookings(bookingsRes.data);
      setEditData({
        name: profileRes.data.name || '',
        phone: profileRes.data.phone || '',
        location: { fullAddress: location || profileRes.data.profile?.location?.fullAddress || '' },
        image: null,
      });
      console.log('Notifications loaded:', notifications);
    } catch (err) {
      setMessage({ open: true, text: `Failed to fetch dashboard data: ${err.response?.data?.message || err.message}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [token, location, notifications]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchData();

    const handleConnect = () => socket.emit('joinRoom', user._id);
    socket.on('connect', handleConnect);
    if (socket.connected) handleConnect();
    
    const handleBookingUpdate = () => fetchData();
    const handleServiceCompleted = (data) => {
      setMessage({ open: true, text: `Service ${data.serviceName} has been completed! You can now submit feedback.`, severity: 'success' });
      fetchData();
    };
    const handleUserUpdated = (updatedUser) => {
      console.log('Received userUpdated:', {
        userId: updatedUser._id,
        location: updatedUser.profile?.location,
        editOpen: editOpen,
        currentEditLocation: editData.location
      });
      setProfile(updatedUser);
      setEditData(prev => ({
        ...prev,
        name: updatedUser.name || '',
        phone: updatedUser.phone || '',
        location: editOpen ? prev.location : { fullAddress: location || updatedUser.profile?.location?.fullAddress || '' },
        image: null,
      }));
      dispatch(setUser({ user: updatedUser, token }));
      if (!editOpen) {
        console.log('Updating Redux location:', updatedUser.profile?.location?.fullAddress || '');
        dispatch(setLocation(updatedUser.profile?.location?.fullAddress || ''));
      } else {
        console.log('Skipping Redux location update due to editOpen');
      }
    };

    socket.on('bookingStatusUpdate', handleBookingUpdate);
    socket.on('bookingUpdate', handleBookingUpdate);
    socket.on('serviceCompleted', handleServiceCompleted);
    socket.on('userUpdated', handleUserUpdated);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('bookingStatusUpdate', handleBookingUpdate);
      socket.off('bookingUpdate', handleBookingUpdate);
      socket.off('serviceCompleted', handleServiceCompleted);
      socket.off('userUpdated', handleUserUpdated);
    };
  }, [user, token, navigate, fetchData, editOpen, location, dispatch]);

  useEffect(() => {
    // Sync editData.location with state.auth.location when it changes
    setEditData(prev => ({
      ...prev,
      location: { fullAddress: location || prev.location.fullAddress }
    }));
  }, [location]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    if (newValue !== 4) {
      dispatch(clearNotifications());
      console.log('Notifications cleared on tab change to:', newValue);
    }
  };

  const handleClearNotifications = () => {
    dispatch(clearNotifications());
    console.log('Notifications cleared manually via button');
  };
  
  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      if (!editData.name || editData.name.trim() === '') {
        setMessage({ open: true, text: 'Name is required.', severity: 'error' });
        setLoading(false);
        return;
      }
      const formData = new FormData();
      formData.append('name', editData.name.trim());
      formData.append('phone', editData.phone || '');
      formData.append('location', JSON.stringify(editData.location));
      if (editData.image) {
        formData.append('profileImage', editData.image);
      }
      const config = { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } };
      const { data } = await axios.put(`${API_URL}/api/users/profile`, formData, config);
      setProfile(data);
      dispatch(setUser({ user: data, token }));
      dispatch(setLocation(data.profile?.location?.fullAddress || ''));
      setEditOpen(false);
      setMessage({ open: true, text: 'Profile saved successfully!', severity: 'success' });
    } catch (err) {
      setMessage({ open: true, text: `Failed to update profile: ${err.response?.data?.message || err.message}`, severity: 'error' });
    } finally {
      setLoading(false);
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
      await axios.put(
        `${API_URL}/api/users/change-password`,
        { currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
      await axios.delete(`${API_URL}/api/users/delete`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      dispatch(clearUser());
      alert('Account deleted successfully.');
      navigate('/login');
    } catch (err) {
      setMessage({ open: true, text: `Failed to delete account: ${err.response?.data?.message || err.message}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCancelDialog = (booking) => { setBookingForAction(booking); setCancelOpen(true); };
  const handleOpenFeedbackDialog = (booking) => { setBookingForAction(booking); setFeedbackOpen(true); };
  const handleRebook = (service) => navigate(`/services/${service._id}`);
  
  const handleConfirmCancel = async () => {
    if (!bookingForAction) return;
    setLoading(true);
    try {
      console.log(`Sending cancel request for booking ${bookingForAction._id}`);
      await axios.delete(`${API_URL}/api/bookings/${bookingForAction._id}/cancel`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCancelOpen(false);
      setBookingForAction(null);
      setMessage({ open: true, text: 'Booking cancelled successfully.', severity: 'success' });
      fetchData();
    } catch (err) {
      console.error('Cancel booking error:', err.response?.data || err.message);
      setMessage({ open: true, text: `Failed to cancel booking: ${err.response?.data?.message || err.message}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmFeedback = async () => {
    if (!bookingForAction) return;
    setLoading(true);
    try {
      if (!feedbackData.comment.trim()) {
        setMessage({ open: true, text: 'Comment is required.', severity: 'error' });
        setLoading(false);
        return;
      }
      if (feedbackData.rating < 1 || feedbackData.rating > 5) {
        setMessage({ open: true, text: 'Rating must be between 1 and 5.', severity: 'error' });
        setLoading(false);
        return;
      }
      await axios.post(`${API_URL}/api/feedback`, 
        {
          bookingId: bookingForAction._id,
          rating: feedbackData.rating,
          comment: feedbackData.comment,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFeedbackOpen(false);
      setBookingForAction(null);
      setFeedbackData({ rating: 5, comment: '' });
      setMessage({ open: true, text: 'Thank you for your feedback!', severity: 'success' });
      fetchData();
    } catch (err) {
      console.error('Feedback submission error:', err.response?.data || err.message);
      setMessage({ open: true, text: `Failed to submit feedback: ${err.response?.data?.message || err.message}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };
  
  const activeBookings = allBookings.filter(b => ['pending', 'assigned', 'in-progress'].includes(b.status));
  const previousBookings = allBookings
    .filter(b => ['completed', 'cancelled', 'rejected'].includes(b.status))
    .sort((a, b) => new Date(b.scheduledTime) - new Date(a.scheduledTime));
  const filteredPreviousBookings = ratingFilter === 'All'
    ? previousBookings
    : previousBookings.filter(b => b.feedback?.rating === parseInt(ratingFilter));
  
  if (loading && !profile) return <CircularProgress sx={{ display: 'block', margin: '100px auto' }} />;
  if (!user || !profile) return <Typography sx={{textAlign: 'center', mt: 5}}>Please log in to view your dashboard.</Typography>;

  console.log('Rendering Tabs with notification count:', notifications.length);

  return (
    <Box sx={{ maxWidth: '1200px', margin: 'auto', p: { xs: 2, md: 3 }, mt: 4 }}>
      {scrollbarStyles}
      <Typography variant="h3" gutterBottom sx={{ textAlign: 'center', mb: 4 }}>Customer Dashboard</Typography>
      <Tabs 
        value={tabValue} 
        onChange={handleTabChange} 
        centered 
        variant="scrollable" 
        scrollButtons="auto" 
        sx={{ 
          mb: 4, 
          backgroundColor: 'white', 
          borderRadius: 2, 
          boxShadow: 1,
          '& .MuiTab-root': { textTransform: 'none', fontWeight: 500 },
        }}
      >
        <Tab label="Profile" />
        <Tab 
          label={
            <Badge 
              color="error" 
              badgeContent={activeBookings.length} 
              max={9}
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: '0.75rem',
                  height: '18px',
                  minWidth: '18px',
                  padding: '0 4px',
                }
              }}
            >
              Active Bookings
            </Badge>
          } 
        />
        <Tab label="Booking History" />
        <Tab label="Settings" />
        <Tab 
          label={
            <Badge 
              color="error" 
              badgeContent={notifications.length} 
              max={9}
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: '0.75rem',
                  height: '18px',
                  minWidth: '18px',
                  padding: '0 4px',
                }
              }}
            >
              Notifications
            </Badge>
          } 
        />
      </Tabs>
      
      {tabValue === 0 && (
        <Card sx={{ p: { xs: 2, md: 3 } }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>Profile Details</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4} sx={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                {profile.profile?.image ? (
                  <Avatar src={`${API_URL}${profile.profile.image}`} sx={{ width: 150, height: 150 }} />
                ) : (
                  <Avatar sx={{ width: 150, height: 150, fontSize: '4rem' }}>{profile.name.charAt(0)}</Avatar>
                )}
              </Grid>
              <Grid item xs={12} md={8}>
                <Typography sx={{ mb: 1 }}><strong>Name:</strong> {profile.name}</Typography>
                <Typography sx={{ mb: 1 }}><strong>Email:</strong> {profile.email}</Typography>
                <Typography sx={{ mb: 1 }}><strong>Phone:</strong> {profile.phone || 'N/A'}</Typography>
                <Typography sx={{ mb: 1 }}><strong>Location:</strong> {profile.profile?.location?.fullAddress || 'N/A'}</Typography>
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
          <Typography variant="h5" sx={{ mb: 2 }}>Track Your Active Services</Typography>
          {activeBookings.length > 0 ? (
            activeBookings.map(booking => <BookingCard key={booking._id} booking={booking} onCancel={handleOpenCancelDialog} onFeedback={handleOpenFeedbackDialog} onRebook={handleRebook} />)
          ) : (
            <Paper sx={{p: 3, textAlign: 'center'}}><Typography>You have no active bookings to track.</Typography></Paper>
          )}
        </Box>
      )}

      {tabValue === 2 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5">Your Booking History</Typography>
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
          {filteredPreviousBookings.length > 0 ? (
            filteredPreviousBookings.map(booking => <BookingCard key={booking._id} booking={booking} onFeedback={handleOpenFeedbackDialog} onRebook={handleRebook}/>)
          ) : (
            <Paper sx={{p: 3, textAlign: 'center'}}><Typography>No bookings match the selected rating.</Typography></Paper>
          )}
        </Box>
      )}

      {tabValue === 3 && (
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

      {tabValue === 4 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5">Your Notifications</Typography>
            {notifications.length > 0 && (
              <Button 
                variant="outlined" 
                color="secondary" 
                onClick={handleClearNotifications}
                sx={{ textTransform: 'none' }}
              >
                Clear All Notifications
              </Button>
            )}
          </Box>
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
          <TextField autoFocus margin="dense" label="Name" type="text" fullWidth variant="standard" value={editData.name} onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))} />
          <TextField margin="dense" label="Phone" type="text" fullWidth variant="standard" value={editData.phone} onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))} />
          <TextField margin="dense" label="Location Address" type="text" fullWidth variant="standard" value={editData.location.fullAddress} onChange={(e) => setEditData(prev => ({ ...prev, location: { ...prev.location, fullAddress: e.target.value } }))} />
          <Button variant="contained" component="label" sx={{ mt: 2 }}>
            Upload Profile Image
            <input type="file" hidden accept="image/*" onChange={(e) => setEditData(prev => ({ ...prev, image: e.target.files[0] }))} />
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveProfile} disabled={loading}>{loading ? <CircularProgress size={24} /> : "Save"}</Button>
        </DialogActions>
      </Dialog>
      
      <Dialog open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)}>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <TextField autoFocus margin="dense" label="Current Password" type="password" fullWidth variant="standard" value={passwordData.currentPassword} onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))} />
          <TextField margin="dense" label="New Password" type="password" fullWidth variant="standard" value={passwordData.newPassword} onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))} />
          <TextField margin="dense" label="Confirm New Password" type="password" fullWidth variant="standard" value={passwordData.confirmPassword} onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChangePasswordOpen(false)}>Cancel</Button>
          <Button onClick={handleChangePassword} disabled={loading}>{loading ? <CircularProgress size={24} /> : "Change"}</Button>
        </DialogActions>
      </Dialog>
      
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Confirm Account Deletion</DialogTitle>
        <DialogContent><Typography>Are you sure you want to delete your account? This action cannot be undone.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteAccount} disabled={loading} color="error">{loading ? <CircularProgress size={24} /> : "Delete"}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)}>
        <DialogTitle>Confirm Cancellation</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to cancel your booking for "{bookingForAction?.service?.name}"?</Typography>
          <Typography color="text.secondary" variant="body2">This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelOpen(false)}>No, Keep It</Button>
          <Button onClick={handleConfirmCancel} color="error" variant="contained">Yes, Cancel</Button>
        </DialogActions>
      </Dialog>
      
      <Dialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)}>
        <DialogTitle>Leave Feedback for "{bookingForAction?.service?.name}"</DialogTitle>
        <DialogContent>
          <Typography component="legend">Your Rating</Typography>
          <Rating name="booking-rating" value={feedbackData.rating} onChange={(event, newValue) => { setFeedbackData(prev => ({ ...prev, rating: newValue })); }} />
          <TextField 
            autoFocus 
            margin="dense" 
            label="Your Comments" 
            type="text" 
            fullWidth 
            variant="outlined" 
            multiline 
            rows={4} 
            value={feedbackData.comment} 
            onChange={(e) => setFeedbackData(prev => ({ ...prev, comment: e.target.value }))} 
            error={!feedbackData.comment.trim()}
            helperText={!feedbackData.comment.trim() ? 'Comment is required' : ''}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeedbackOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmFeedback} variant="contained" disabled={loading || !feedbackData.comment.trim() || feedbackData.rating < 1 || feedbackData.rating > 5}>
            {loading ? <CircularProgress size={24} /> : "Submit Feedback"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={message.open} autoHideDuration={6000} onClose={() => setMessage({ ...message, open: false })}>
        <Alert onClose={() => setMessage({ ...message, open: false })} severity={message.severity || 'info'} sx={{ width: '100%' }}>
          {message.text}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default UserDashboard;
 */


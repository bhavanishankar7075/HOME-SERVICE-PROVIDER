import React, { useCallback, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  Box, Typography, Button, Container, Paper, Grid, Avatar, Switch, Divider, List, ListItem, ListItemAvatar, ListItemText, Alert, CircularProgress, Snackbar, Chip,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Event as EventIcon,
  MonetizationOn as MonetizationOnIcon,
  Star as StarIcon,
  AccountCircle as AccountCircleIcon,
  WorkspacePremium as WorkspacePremiumIcon,
  ManageAccounts as ManageAccountsIcon
} from '@mui/icons-material';
import { setUser } from '../redux/authSlice';
import io from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const socket = io(API_URL, { autoConnect: false });

// --- Helper Components for a Clean Layout ---
const StatCard = ({ icon, title, value }) => (
  <Grid item xs={6} sm={3}>
    <Paper elevation={2} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 2 }}>
      <Avatar sx={{ bgcolor: 'grey.200', color: 'text.primary', width: 48, height: 48 }}>{icon}</Avatar>
      <Box>
        <Typography color="text.secondary" variant="body2">{title}</Typography>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>{value}</Typography>
      </Box>
    </Paper>
  </Grid>
);

const DashboardCard = ({ title, children }) => (
  <Paper elevation={3} sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
    <Typography variant="h6" sx={{ p: 2, bgcolor: 'common.white', borderBottom: '1px solid #e0e0e0' }}>{title}</Typography>
    {children}
  </Paper>
);

// --- Main ProviderHome Component ---
function ProviderHome() {
  const { user, token } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const [dashboardData, setDashboardData] = useState(null);
  const [subscriptionDetails, setSubscriptionDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [showSpecialMessage, setShowSpecialMessage] = useState(null);

 const fetchProviderHomeData = useCallback(async (isInitialLoad = false, retryCount = 0) => {
  if (!token) {
    console.error('No token found for API calls');
    return;
  }
  if (isInitialLoad) setLoading(true);
  try {
    const config = { headers: { Authorization: `Bearer ${token}` } };
    console.log('Fetching data with token:', token);
    const [profileRes, bookingsRes, subscriptionRes] = await Promise.all([
      axios.get(`${API_URL}/api/users/profile`, config),
      axios.get(`${API_URL}/api/bookings/my-bookings`, config),
      axios.get(`${API_URL}/api/users/subscription-details`, config)
    ]);
    console.log('Profile API response:', profileRes.data);
    console.log('Subscription details response:', subscriptionRes.data);
    dispatch(setUser({ user: profileRes.data, token }));

    const allBookings = bookingsRes.data;
    const newBookings = allBookings.filter(b => b.status === 'assigned');

    setDashboardData({
      newBookings: newBookings.slice(0, 3),
    });
    setSubscriptionDetails(subscriptionRes.data);
    setError(null);
  } catch (err) {
    console.error('Error fetching provider home data:', {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    });
    if (retryCount < 2) {
      setTimeout(() => fetchProviderHomeData(isInitialLoad, retryCount + 1), 1000);
    } else {
      setError('Could not load homepage data. Please try again.');
    }
  } finally {
    if (isInitialLoad && retryCount === 0) setLoading(false);
  }
}, [token, dispatch]);

  useEffect(() => {
    if (token) {
      socket.auth = { token };
      socket.connect();
      console.log('[Socket] Connected');
      socket.on('subscriptionWarning', (data) => {
        setSubscriptionDetails((prev) => ({ ...prev, subscriptionStatusMessage: data.message }));
        setSnackbar({ open: true, message: data.message, severity: data.message.includes('past_due') ? 'error' : 'warning' });
      });
      socket.on('subscriptionUpdated', (updatedUser) => {
        dispatch(setUser({ user: updatedUser, token }));
        fetchProviderHomeData();
      });
    }

    return () => {
      socket.off('subscriptionWarning');
      socket.off('subscriptionUpdated');
      socket.disconnect();
      console.log('[Socket] Disconnected');
    };
  }, [token, dispatch, fetchProviderHomeData]);

  useEffect(() => {
    const subscriptionSuccess = searchParams.get('subscription_success');
    const sessionId = searchParams.get('session_id');
    const action = searchParams.get('action');

    const verifySession = async (sId) => {
      setShowSpecialMessage('Verifying your new subscription...');
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const [verifyRes, bookingsRes, subscriptionRes] = await Promise.all([
          axios.post(`${API_URL}/api/subscriptions/verify-session`, { sessionId: sId }, config),
          axios.get(`${API_URL}/api/bookings/my-bookings`, config),
          axios.get(`${API_URL}/api/users/subscription-details`, config)
        ]);
        console.log('Verify session response:', verifyRes.data);
        dispatch(setUser({ user: verifyRes.data, token }));
        const allBookings = bookingsRes.data;
        const newBookings = allBookings.filter(b => b.status === 'assigned');
        setDashboardData({ newBookings: newBookings.slice(0, 3) });
        setSubscriptionDetails(subscriptionRes.data);
        setSnackbar({ open: true, message: 'Subscription verified successfully!', severity: 'success' });
      } catch (err) {
        console.error('Failed to verify session:', err);
        setSnackbar({ open: true, message: 'Failed to verify subscription.', severity: 'error' });
        fetchProviderHomeData(true);
      } finally {
        setSearchParams({}, { replace: true });
        setShowSpecialMessage(null);
        setLoading(false);
      }
    };

    const handleSubscriptionManaged = async () => {
      setShowSpecialMessage('Syncing your subscription status...');
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const [profileRes, bookingsRes, subscriptionRes] = await Promise.all([
          axios.get(`${API_URL}/api/users/profile`, config),
          axios.get(`${API_URL}/api/bookings/my-bookings`, config),
          axios.get(`${API_URL}/api/users/subscription-details`, config)
        ]);
        console.log('Profile sync response:', profileRes.data);
        dispatch(setUser({ user: profileRes.data, token }));
        const allBookings = bookingsRes.data;
        const newBookings = allBookings.filter(b => b.status === 'assigned');
        setDashboardData({ newBookings: newBookings.slice(0, 3) });
        setSubscriptionDetails(subscriptionRes.data);
        setSnackbar({ open: true, message: 'Subscription status synced successfully!', severity: 'success' });
      } catch (err) {
        console.error('Failed to sync subscription status:', err);
        setSnackbar({ open: true, message: 'Failed to sync subscription status.', severity: 'error' });
        fetchProviderHomeData(true);
      } finally {
        setSearchParams({}, { replace: true });
        setShowSpecialMessage(null);
        setLoading(false);
      }
    };

    if (subscriptionSuccess === 'true' && sessionId) {
      verifySession(sessionId);
    } else if (action === 'subscription_managed') {
      handleSubscriptionManaged();
    } else {
      fetchProviderHomeData(true);
    }
  }, [searchParams, setSearchParams, token, dispatch, fetchProviderHomeData]);

  const handleBookingAction = async (bookingId, action) => {
    setActionLoading(prev => ({ ...prev, [bookingId]: true }));
    try {
      await axios.put(`${API_URL}/api/bookings/${bookingId}/${action}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setSnackbar({ open: true, message: `Booking successfully ${action}ed!`, severity: 'success' });
      fetchProviderHomeData();
    } catch (err) {
      console.error('Error handling booking action:', err);
      setSnackbar({ open: true, message: `Failed to ${action} booking.`, severity: 'error' });
    } finally {
      setActionLoading(prev => ({ ...prev, [bookingId]: false }));
    }
  };

  const handleAvailabilityToggle = async () => {
    const originalAvailability = user.profile?.availability;
    const newAvailability = originalAvailability === 'Available' ? 'Unavailable' : 'Available';
    try {
      const updatedUserInUI = { ...user, profile: { ...user.profile, availability: newAvailability } };
      dispatch(setUser({ user: updatedUserInUI, token }));
      const response = await axios.put(`${API_URL}/api/users/profile`, { availability: newAvailability }, { headers: { Authorization: `Bearer ${token}` } });
      console.log('Availability update response:', response.data);
      dispatch(setUser({ user: response.data, token }));
      setSnackbar({ open: true, message: `Availability set to ${newAvailability}`, severity: 'success' });
    } catch (err) {
      console.error('Error updating availability:', err);
      dispatch(setUser({ user: { ...user, profile: { ...user.profile, availability: originalAvailability } }, token }));
      setSnackbar({ open: true, message: 'Failed to update availability.', severity: 'error' });
    }
  };

  const handleManageSubscription = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = await axios.post(`${API_URL}/api/subscriptions/create-portal-session`, {}, config);
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Error opening subscription portal:', err);
      const errorMessage = err.response?.data?.message || 'Could not open management portal.';
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    }
  };

  const handleCancelSubscription = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${API_URL}/api/subscriptions/cancel-subscription`, {}, config);
      setSnackbar({ open: true, message: 'Subscription canceled successfully! You are now on the Free plan.', severity: 'success' });
      fetchProviderHomeData();
    } catch (err) {
      console.error('Error canceling subscription:', err);
      setSnackbar({ open: true, message: err.response?.data?.message || 'Failed to cancel subscription.', severity: 'error' });
    }
  };

  const handleCloseSnackbar = () => setSnackbar(prev => ({ ...prev, open: false }));

  if (showSpecialMessage) {
    return (
      <Box sx={{ py: 9, textAlign: 'center' }}>
        <Container maxWidth="sm">
          <Paper sx={{ p: 4, borderRadius: 2 }}>
            <Typography variant="h5" gutterBottom>{showSpecialMessage}</Typography>
            <CircularProgress sx={{ mt: 2 }} />
          </Paper>
        </Container>
      </Box>
    );
  }

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;
  }
  if (error) {
    return <Container sx={{ py: 8 }}><Alert severity="error">{error}</Alert></Container>;
  }
  if (!user || !dashboardData) return null;

  console.log('Redux user state:', user);

  const stats = {
    newBookingsCount: dashboardData.newBookings.length,
    activeJobsCount: user.profile?.activeJobsCount || 0,
    weeklyEarnings: user.profile?.weeklyEarnings || 0,
    rating: user.profile?.averageRating || 0,
  };

  return (
    <Box sx={{ py: 9, bgcolor: '#f4f6f8', minHeight: '100vh' }}>
      <Container maxWidth="lg">
        <Typography variant="h4" component="h1" sx={{ mb: 1 }}>Welcome back, {user.name}!</Typography>
        <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>Here is your business summary.</Typography>
        
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <StatCard icon={<NotificationsIcon color="primary" />} title="New Job Requests" value={stats.newBookingsCount} />
          <StatCard icon={<EventIcon color="secondary" />} title="Active Jobs" value={stats.activeJobsCount} />
          <StatCard icon={<MonetizationOnIcon color="success" />} title="This Week's Earnings" value={`₹${stats.weeklyEarnings.toLocaleString()}`} />
          <StatCard icon={<StarIcon sx={{ color: '#ffb400' }} />} title="Your Rating" value={stats.rating.toFixed(1)} />
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <DashboardCard title="Action Required: New Job Requests">
              {dashboardData.newBookings.length > 0 ? (
                <List disablePadding>
                  {dashboardData.newBookings.map((booking, index) => (
                    <React.Fragment key={booking._id}>
                      <ListItem>
                        <ListItemAvatar><Avatar src={booking.customerDetails?.avatar} /></ListItemAvatar>
                        <ListItemText primary={booking.service?.name} secondary={`With ${booking.customerDetails?.name}`} />
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => handleBookingAction(booking._id, 'accept')}
                            disabled={actionLoading[booking._id] || (subscriptionDetails?.subscriptionStatus === 'past_due' || subscriptionDetails?.currentBookingCount >= subscriptionDetails?.bookingLimit)}
                          >
                            {actionLoading[booking._id] ? <CircularProgress size={16} /> : 'Accept'}
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => handleBookingAction(booking._id, 'reject')}
                            disabled={actionLoading[booking._id]}
                          >
                            {actionLoading[booking._id] ? <CircularProgress size={16} /> : 'Reject'}
                          </Button>
                        </Box>
                      </ListItem>
                      {index < dashboardData.newBookings.length - 1 && <Divider variant="inset" component="li" />}
                    </React.Fragment>
                  ))}
                  {stats.newBookingsCount > 3 && (
                    <Box sx={{ p: 1, textAlign: 'center' }}>
                      <Button onClick={() => navigate('/provider/dashboard')}>View All New Bookings</Button>
                    </Box>
                  )}
                </List>
              ) : (
                <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>You have no new job requests. Great work!</Typography>
              )}
            </DashboardCard>
          </Grid>

          <Grid item xs={12} md={4}>
            <DashboardCard title="Subscription Status">
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Chip
                  icon={<WorkspacePremiumIcon />}
                  label={`${(subscriptionDetails?.subscriptionTier || 'free').charAt(0).toUpperCase() + (subscriptionDetails?.subscriptionTier || 'free').slice(1)} Plan`}
                  color={subscriptionDetails?.subscriptionStatus === 'active' ? 'success' : subscriptionDetails?.subscriptionStatus === 'past_due' ? 'error' : 'default'}
                  sx={{ mb: 2, fontSize: '1rem', p: 2 }}
                />
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Bookings:</strong> {subscriptionDetails?.currentBookingCount || 0} / {subscriptionDetails?.bookingLimit === 0 ? 'Unlimited' : subscriptionDetails?.bookingLimit}
                </Typography>
                {subscriptionDetails?.subscriptionStatusMessage && (
                  <Typography variant="body2" color={subscriptionDetails.subscriptionStatus === 'past_due' ? 'error' : 'warning'} sx={{ mb: 2 }}>
                    {subscriptionDetails.subscriptionStatusMessage}
                  </Typography>
                )}
                {subscriptionDetails?.subscriptionStatus === 'past_due' || !subscriptionDetails?.subscriptionTier || subscriptionDetails?.subscriptionTier === 'free' ? (
                  <Button fullWidth variant="contained" onClick={() => navigate('/pricing')}>
                    {subscriptionDetails?.subscriptionStatus === 'past_due' ? 'Renew Subscription' : 'Upgrade Plan'}
                  </Button>
                ) : (
                  <>
                    <Button fullWidth variant="outlined" startIcon={<ManageAccountsIcon />} onClick={handleManageSubscription} sx={{ mb: 1 }}>
                      Manage Subscription
                    </Button>
                    <Button fullWidth variant="outlined" color="error" onClick={handleCancelSubscription}>
                      Cancel Subscription
                    </Button>
                  </>
                )}
              </Box>
            </DashboardCard>
            <DashboardCard title="Your Status">
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2 }}>
                <Typography variant="h6">Availability</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography color={user.profile?.availability === 'Available' ? 'success.main' : 'text.secondary'}>
                    {user.profile?.availability || 'Unavailable'}
                  </Typography>
                  <Switch checked={user.profile?.availability === 'Available'} onChange={handleAvailabilityToggle} color="success" />
                </Box>
              </Box>
            </DashboardCard>
            <DashboardCard title="Quick Actions">
              <Box sx={{ p: 2 }}>
                <Button
                  fullWidth
                  variant="contained"
                  sx={{ mb: 2 }}
                  startIcon={<AccountCircleIcon />}
                  onClick={() => navigate('/provider/dashboard')}
                >
                  Manage Full Dashboard
                </Button>
              </Box>
            </DashboardCard>
          </Grid>
        </Grid>
        <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity || 'info'} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
}

export default ProviderHome;

















































































































//main
/* import React, { useCallback, useEffect } from 'react';
import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  Box, Typography, Button, Container, Paper, Grid, Avatar, Switch, Divider, List, ListItem, ListItemAvatar, ListItemText, Alert, CircularProgress, Snackbar, Chip
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Event as EventIcon,
  MonetizationOn as MonetizationOnIcon,
  Star as StarIcon,
  AccountCircle as AccountCircleIcon,
  WorkspacePremium as WorkspacePremiumIcon,
  ManageAccounts as ManageAccountsIcon
} from '@mui/icons-material';
import { setUser } from '../redux/authSlice';
import io from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const socket = io(API_URL, { autoConnect: false });

// --- Helper Components for a Clean Layout ---
const StatCard = ({ icon, title, value }) => (
  <Grid item xs={6} sm={3}>
    <Paper elevation={2} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 2 }}>
      <Avatar sx={{ bgcolor: 'grey.200', color: 'text.primary', width: 48, height: 48 }}>{icon}</Avatar>
      <Box>
        <Typography color="text.secondary" variant="body2">{title}</Typography>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>{value}</Typography>
      </Box>
    </Paper>
  </Grid>
);

const DashboardCard = ({ title, children }) => (
  <Paper elevation={3} sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
    <Typography variant="h6" sx={{ p: 2, bgcolor: 'common.white', borderBottom: '1px solid #e0e0e0' }}>{title}</Typography>
    {children}
  </Paper>
);

// --- Main ProviderHome Component ---
function ProviderHome() {
  const { user, token } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [showSpecialMessage, setShowSpecialMessage] = useState(null);

  const fetchProviderHomeData = useCallback(async (isInitialLoad = false, retryCount = 0) => {
    if (!token) return;
    if (isInitialLoad) setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [profileRes, bookingsRes] = await Promise.all([
        axios.get(`${API_URL}/api/users/profile`, config),
        axios.get(`${API_URL}/api/bookings/my-bookings`, config)
      ]);
      console.log('Profile API response:', profileRes.data); // Debug API response
      dispatch(setUser({ user: profileRes.data, token }));

      const allBookings = bookingsRes.data;
      const newBookings = allBookings.filter(b => b.status === 'assigned');

      setDashboardData({
        newBookings: newBookings.slice(0, 3),
      });
      setError(null);
    } catch (err) {
      console.error('Error fetching provider home data:', err);
      if (retryCount < 2) {
        // Retry up to 2 times with a 1-second delay
        setTimeout(() => fetchProviderHomeData(isInitialLoad, retryCount + 1), 1000);
      } else {
        setError('Could not load homepage data. Please try again.');
      }
    } finally {
      if (isInitialLoad && retryCount === 0) setLoading(false);
    }
  }, [token, dispatch]);

  useEffect(() => {
    // Initialize socket connection
    if (token) {
      socket.auth = { token };
      socket.connect();
      console.log('[Socket] Connected');
    }

    // Handle userUpdated event
    socket.on('userUpdated', (updatedUser) => {
      console.log('[Socket] Received userUpdated:', updatedUser);
      dispatch(setUser({ user: updatedUser, token }));
    });

    // Cleanup on unmount
    return () => {
      socket.off('userUpdated');
      socket.disconnect();
      console.log('[Socket] Disconnected');
    };
  }, [token, dispatch]);

  useEffect(() => {
    const subscriptionSuccess = searchParams.get('subscription_success');
    const sessionId = searchParams.get('session_id');
    const action = searchParams.get('action');

    const verifySession = async (sId) => {
      setShowSpecialMessage('Verifying your new subscription...');
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const [verifyRes, bookingsRes] = await Promise.all([
          axios.post(`${API_URL}/api/subscriptions/verify-session`, { sessionId: sId }, config),
          axios.get(`${API_URL}/api/bookings/my-bookings`, config)
        ]);
        console.log('Verify session response:', verifyRes.data);
        dispatch(setUser({ user: verifyRes.data, token }));
        const allBookings = bookingsRes.data;
        const newBookings = allBookings.filter(b => b.status === 'assigned');
        setDashboardData({ newBookings: newBookings.slice(0, 3) });
        setSnackbar({ open: true, message: 'Subscription verified successfully!', severity: 'success' });
      } catch (err) {
        console.error('Failed to verify session:', err);
        setSnackbar({ open: true, message: 'Failed to verify subscription.', severity: 'error' });
        fetchProviderHomeData(true); // Fallback to full fetch if verification fails
      } finally {
        setSearchParams({}, { replace: true });
        setShowSpecialMessage(null);
        setLoading(false);
      }
    };

    const handleSubscriptionManaged = async () => {
      setShowSpecialMessage('Syncing your subscription status...');
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const [profileRes, bookingsRes] = await Promise.all([
          axios.get(`${API_URL}/api/users/profile`, config),
          axios.get(`${API_URL}/api/bookings/my-bookings`, config)
        ]);
        console.log('Profile sync response:', profileRes.data);
        dispatch(setUser({ user: profileRes.data, token }));
        const allBookings = bookingsRes.data;
        const newBookings = allBookings.filter(b => b.status === 'assigned');
        setDashboardData({ newBookings: newBookings.slice(0, 3) });
        setSnackbar({ open: true, message: 'Subscription status synced successfully!', severity: 'success' });
      } catch (err) {
        console.error('Failed to sync subscription status:', err);
        setSnackbar({ open: true, message: 'Failed to sync subscription status.', severity: 'error' });
        fetchProviderHomeData(true);
      } finally {
        setSearchParams({}, { replace: true });
        setShowSpecialMessage(null);
        setLoading(false);
      }
    };

    if (subscriptionSuccess === 'true' && sessionId) {
      verifySession(sessionId);
    } else if (action === 'subscription_managed') {
      handleSubscriptionManaged();
    } else {
      fetchProviderHomeData(true);
    }
  }, [searchParams, setSearchParams, token, dispatch, fetchProviderHomeData]);

  const handleBookingAction = async (bookingId, action) => {
    setActionLoading(prev => ({ ...prev, [bookingId]: true }));
    try {
      await axios.put(`${API_URL}/api/bookings/${bookingId}/${action}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setSnackbar({ open: true, message: `Booking successfully ${action}ed!`, severity: 'success' });
      fetchProviderHomeData();
    } catch (err) {
      console.error('Error handling booking action:', err);
      setSnackbar({ open: true, message: `Failed to ${action} booking.`, severity: 'error' });
    } finally {
      setActionLoading(prev => ({ ...prev, [bookingId]: false }));
    }
  };

  const handleAvailabilityToggle = async () => {
    const originalAvailability = user.profile?.availability;
    const newAvailability = originalAvailability === 'Available' ? 'Unavailable' : 'Available';
    try {
      const updatedUserInUI = { ...user, profile: { ...user.profile, availability: newAvailability } };
      dispatch(setUser({ user: updatedUserInUI, token }));
      const response = await axios.put(`${API_URL}/api/users/profile`, { availability: newAvailability }, { headers: { Authorization: `Bearer ${token}` } });
      console.log('Availability update response:', response.data);
      dispatch(setUser({ user: response.data, token }));
      setSnackbar({ open: true, message: `Availability set to ${newAvailability}`, severity: 'success' });
    } catch (err) {
      console.error('Error updating availability:', err);
      dispatch(setUser({ user: { ...user, profile: { ...user.profile, availability: originalAvailability } }, token }));
      setSnackbar({ open: true, message: 'Failed to update availability.', severity: 'error' });
    }
  };

  const handleManageSubscription = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = await axios.post(`${API_URL}/api/subscriptions/create-portal-session`, {}, config);
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Error opening subscription portal:', err);
      const errorMessage = err.response?.data?.message || 'Could not open management portal.';
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    }
  };

  const handleCloseSnackbar = () => setSnackbar(prev => ({ ...prev, open: false }));

  if (showSpecialMessage) {
    return (
      <Box sx={{ py: 9, textAlign: 'center' }}>
        <Container maxWidth="sm">
          <Paper sx={{ p: 4, borderRadius: 2 }}>
            <Typography variant="h5" gutterBottom>{showSpecialMessage}</Typography>
            <CircularProgress sx={{ mt: 2 }} />
          </Paper>
        </Container>
      </Box>
    );
  }

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;
  }
  if (error) {
    return <Container sx={{ py: 8 }}><Alert severity="error">{error}</Alert></Container>;
  }
  if (!user || !dashboardData) return null;

  // Debug Redux state before rendering
  console.log('Redux user state:', user);

  const stats = {
    newBookingsCount: dashboardData.newBookings.length,
    activeJobsCount: user.profile?.activeJobsCount || 0,
    weeklyEarnings: user.profile?.weeklyEarnings || 0,
    rating: user.profile?.averageRating || 0,
  };

  return (
    <Box sx={{ py: 9, bgcolor: '#f4f6f8', minHeight: '100vh' }}>
      <Container maxWidth="lg">
        <Typography variant="h4" component="h1" sx={{ mb: 1 }}>Welcome back, {user.name}!</Typography>
        <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>Here is your business summary.</Typography>
        
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <StatCard icon={<NotificationsIcon color="primary" />} title="New Job Requests" value={stats.newBookingsCount} />
          <StatCard icon={<EventIcon color="secondary" />} title="Active Jobs" value={stats.activeJobsCount} />
          <StatCard icon={<MonetizationOnIcon color="success" />} title="This Week's Earnings" value={`₹${stats.weeklyEarnings.toLocaleString()}`} />
          <StatCard icon={<StarIcon sx={{ color: '#ffb400' }} />} title="Your Rating" value={stats.rating.toFixed(1)} />
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <DashboardCard title="Action Required: New Job Requests">
              {dashboardData.newBookings.length > 0 ? (
                <List disablePadding>
                  {dashboardData.newBookings.map((booking, index) => (
                    <React.Fragment key={booking._id}>
                      <ListItem>
                        <ListItemAvatar><Avatar src={booking.customerDetails?.avatar} /></ListItemAvatar>
                        <ListItemText primary={booking.service?.name} secondary={`With ${booking.customerDetails?.name}`} />
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => handleBookingAction(booking._id, 'accept')}
                            disabled={actionLoading[booking._id]}
                          >
                            {actionLoading[booking._id] ? <CircularProgress size={16} /> : 'Accept'}
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => handleBookingAction(booking._id, 'reject')}
                            disabled={actionLoading[booking._id]}
                          >
                            {actionLoading[booking._id] ? <CircularProgress size={16} /> : 'Reject'}
                          </Button>
                        </Box>
                      </ListItem>
                      {index < dashboardData.newBookings.length - 1 && <Divider variant="inset" component="li" />}
                    </React.Fragment>
                  ))}
                  {stats.newBookingsCount > 3 && (
                    <Box sx={{ p: 1, textAlign: 'center' }}>
                      <Button onClick={() => navigate('/provider/dashboard')}>View All New Bookings</Button>
                    </Box>
                  )}
                </List>
              ) : (
                <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>You have no new job requests. Great work!</Typography>
              )}
            </DashboardCard>
          </Grid>

          <Grid item xs={12} md={4}>
            <DashboardCard title="Subscription Status">
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Chip
                  icon={<WorkspacePremiumIcon />}
                  label={`${(user.subscriptionTier || 'free').charAt(0).toUpperCase() + (user.subscriptionTier || 'free').slice(1)} Plan`}
                  color={user.subscriptionTier === 'free' ? 'default' : 'success'}
                  sx={{ mb: 2, fontSize: '1rem', p: 2 }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {user.subscriptionTier === 'free'
                    ? 'Upgrade to unlock more features.'
                    : `Your plan is currently ${user.subscriptionStatus}.`}
                </Typography>
                {user.subscriptionTier === 'free' ? (
                  <Button fullWidth variant="contained" onClick={() => navigate('/pricing')}>Upgrade Now</Button>
                ) : (
                  <Button fullWidth variant="outlined" startIcon={<ManageAccountsIcon />} onClick={handleManageSubscription}>
                    Manage Subscription
                  </Button>
                )}
              </Box>
            </DashboardCard>
            <DashboardCard title="Your Status">
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2 }}>
                <Typography variant="h6">Availability</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography color={user.profile?.availability === 'Available' ? 'success.main' : 'text.secondary'}>
                    {user.profile?.availability || 'Unavailable'}
                  </Typography>
                  <Switch checked={user.profile?.availability === 'Available'} onChange={handleAvailabilityToggle} color="success" />
                </Box>
              </Box>
            </DashboardCard>
            <DashboardCard title="Quick Actions">
              <Box sx={{ p: 2 }}>
                <Button
                  fullWidth
                  variant="contained"
                  sx={{ mb: 2 }}
                  startIcon={<AccountCircleIcon />}
                  onClick={() => navigate('/provider/dashboard')}
                >
                  Manage Full Dashboard
                </Button>
              </Box>
            </DashboardCard>
          </Grid>
        </Grid>
        <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity || 'info'} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
}

export default ProviderHome; */

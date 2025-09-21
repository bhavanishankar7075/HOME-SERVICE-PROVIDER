import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import {
  Box, Typography, Button, Container, Paper, Grid, Avatar, Switch, Divider, List, ListItem, ListItemAvatar, ListItemText, Alert, CircularProgress, Snackbar, Card, CardContent, Tabs, Tab, Badge, Rating
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Event as EventIcon,
  MonetizationOn as MonetizationOnIcon,
  Star as StarIcon,
  CalendarToday as CalendarTodayIcon,
  AccountCircle as AccountCircleIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Check as CheckIcon,
  PersonPinCircle as PersonPinCircleIcon
} from '@mui/icons-material';
import { setUser, clearNotifications } from '../redux/authSlice';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const socket = io(API_URL);

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
  <Paper elevation={2} sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
    <Typography variant="h6" sx={{ p: 2, bgcolor: 'common.white', borderBottom: '1px solid #e0e0e0' }}>{title}</Typography>
    {children}
  </Paper>
);

const BookingCard = ({ booking, onAction, isActionLoading, onNavigate }) => {
  const imageUrl = booking.service?.image 
    ? `${API_URL}${encodeURI(booking.service.image)}` 
    : 'https://via.placeholder.com/40?text=S';

  return (
    <ListItem>
      <ListItemAvatar>
        <Avatar 
          src={imageUrl} 
          sx={{ width: 40, height: 40 }}
          onError={(e) => {
            console.error('Failed to load service image:', imageUrl);
            e.target.src = 'https://via.placeholder.com/40?text=S';
          }}
        />
      </ListItemAvatar>
      <ListItemText 
        primary={
          <Typography 
            variant="body1" 
            sx={{ cursor: 'pointer', color: 'primary.main' }} 
            onClick={() => onNavigate('/provider/dashboard')}
          >
            {booking.service?.name || 'Unknown Service'}
          </Typography>
        } 
        secondary={`With ${booking.customerDetails?.name || 'Anonymous'} at ${new Date(booking.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
      />
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {booking.status === 'assigned' && (
          <>
            <Button 
              size="small" 
              variant="contained" 
              color="success" 
              onClick={() => onAction(booking._id, 'accept')} 
              disabled={isActionLoading[booking._id]}
              startIcon={isActionLoading[booking._id] ? <CircularProgress size={16} /> : <CheckCircleIcon />}
            >
              Accept
            </Button>
            <Button 
              size="small" 
              variant="outlined" 
              color="error" 
              onClick={() => onAction(booking._id, 'reject')} 
              disabled={isActionLoading[booking._id]}
              startIcon={isActionLoading[booking._id] ? <CircularProgress size={16} /> : <CancelIcon />}
            >
              Reject
            </Button>
          </>
        )}
        {booking.status === 'in-progress' && (
          <Button 
            size="small" 
            variant="contained" 
            color="primary" 
            onClick={() => onAction(booking._id, 'complete')} 
            disabled={isActionLoading[booking._id]}
            startIcon={isActionLoading[booking._id] ? <CircularProgress size={16} /> : <CheckIcon />}
          >
            Complete
          </Button>
        )}
      </Box>
    </ListItem>
  );
};

const HowItWorksSection = () => {
  const steps = [
    { icon: <NotificationsIcon color="primary" sx={{ fontSize: 40 }} />, title: "Receive Job Requests", description: "Get notified instantly about new bookings in your area." },
    { icon: <CalendarTodayIcon color="secondary" sx={{ fontSize: 40 }} />, title: "Manage Schedule", description: "Accept jobs and manage your calendar efficiently." },
    { icon: <MonetizationOnIcon color="success" sx={{ fontSize: 40 }} />, title: "Earn Securely", description: "Receive payments securely after completing the job." },
    { icon: <StarIcon sx={{ color: '#ffb400', fontSize: 40 }} />, title: "Build Reputation", description: "Get rated by customers and grow your business." },
  ];
  return (
    <DashboardCard title="How ServiceHub Helps Providers">
      <Grid container spacing={2}>
        {steps.map((step) => (
          <Grid item xs={12} sm={6} md={3} key={step.title}>
            <Paper elevation={1} sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', height: '100%' }}>
              {step.icon}
              <Typography variant="h6" sx={{ mt: 1, mb: 1 }}>{step.title}</Typography>
              <Typography variant="body2" color="text.secondary">{step.description}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </DashboardCard>
  );
};

function ProviderHome() {
  const { user, token, notifications = [] } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [dashboardData, setDashboardData] = useState({
    stats: {
      newBookingsCount: 0,
      activeJobsCount: 0,
      weeklyEarnings: 0,
      rating: 0,
    },
    newBookings: [],
    todaysSchedule: [],
    workHistory: [],
    profile: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [tabValue, setTabValue] = useState(0);

  const fetchProviderHomeData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [profileRes, bookingsRes, prevWorksRes] = await Promise.all([
        axios.get(`${API_URL}/api/users/profile`, config),
        axios.get(`${API_URL}/api/bookings/my-bookings`, config),
        axios.get(`${API_URL}/api/bookings/previous-works`, config)
      ]);

      const profile = profileRes.data;
      const allBookings = bookingsRes.data;
      const workHistory = prevWorksRes.data.sort((a, b) => new Date(b.scheduledTime) - new Date(a.scheduledTime));

      const newBookings = allBookings.filter(b => b.status === 'assigned');
      const activeJobs = allBookings.filter(b => b.status === 'in-progress');

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todaysSchedule = allBookings.filter(b => {
        const scheduleDate = new Date(b.scheduledTime);
        return scheduleDate >= today && scheduleDate < tomorrow;
      });

      setDashboardData({
        stats: {
          newBookingsCount: newBookings.length,
          activeJobsCount: activeJobs.length,
          weeklyEarnings: profile.profile?.weeklyEarnings || 0,
          rating: profile.profile?.averageRating || 0,
        },
        newBookings: newBookings.slice(0, 3),
        todaysSchedule: todaysSchedule,
        workHistory: workHistory.slice(0, 3),
        profile,
      });

      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load homepage data. Please try again.');
      console.error('Fetch error:', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!user || user.role !== 'provider') {
      navigate('/login');
      return;
    }
    fetchProviderHomeData();

    const handleConnect = () => socket.emit('joinRoom', user._id);
    socket.on('connect', handleConnect);
    if (socket.connected) handleConnect();

    const handleNewBooking = (data) => {
      setSnackbar({ open: true, message: data.message, severity: 'success' });
      fetchProviderHomeData();
    };

    const handleBookingUpdate = () => {
      console.log('Received bookingStatusUpdate, refreshing data');
      fetchProviderHomeData();
    };

    const handleFeedbackSubmitted = (data) => {
      setSnackbar({ 
        open: true, 
        message: `New feedback received for ${data.feedback.serviceName || 'service'}: ${data.feedback.rating}/5`, 
        severity: 'success' 
      });
      fetchProviderHomeData();
    };

    socket.on('newBookingAssigned', handleNewBooking);
    socket.on('bookingStatusUpdate', handleBookingUpdate);
    socket.on('feedbackSubmitted', handleFeedbackSubmitted);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('newBookingAssigned', handleNewBooking);
      socket.off('bookingStatusUpdate', handleBookingUpdate);
      socket.off('feedbackSubmitted', handleFeedbackSubmitted);
    };
  }, [user, navigate, fetchProviderHomeData]);

  const handleBookingAction = async (bookingId, action) => {
    const booking = [...dashboardData.newBookings, ...dashboardData.todaysSchedule].find(b => b._id === bookingId);
    if (!booking) {
      setSnackbar({ open: true, message: 'Booking not found.', severity: 'error' });
      return;
    }
    if (action === 'accept' || action === 'reject') {
      if (booking.status !== 'assigned') {
        setSnackbar({ open: true, message: `Booking must be in "assigned" state to be ${action}ed.`, severity: 'error' });
        return;
      }
    }
    if (action === 'complete' && booking.status !== 'in-progress') {
      setSnackbar({ open: true, message: 'Booking must be in "in-progress" state to be completed.', severity: 'error' });
      return;
    }

    setActionLoading(prev => ({ ...prev, [bookingId]: true }));
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      let url = `${API_URL}/api/bookings/${bookingId}/${action}`;
      let payload = {};
      if (action === 'complete') {
        url = `${API_URL}/api/bookings/${bookingId}/status`;
        payload = { status: 'completed' };
      }
      await axios.put(url, payload, config);
      setSnackbar({ open: true, message: `Booking successfully ${action}ed!`, severity: 'success' });
      fetchProviderHomeData();
    } catch (err) {
      setSnackbar({ 
        open: true, 
        message: `Failed to ${action} booking: ${err.response?.data?.message || err.message}`, 
        severity: 'error' 
      });
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
      const response = await axios.put(
        `${API_URL}/api/users/profile`, 
        { availability: newAvailability }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      dispatch(setUser({ user: response.data, token }));
      setSnackbar({ open: true, message: `Availability set to ${newAvailability}`, severity: 'success' });
    } catch (err) {
      dispatch(setUser({ user: { ...user, profile: { ...user.profile, availability: originalAvailability } }, token }));
      setSnackbar({ 
        open: true, 
        message: `Failed to update availability: ${err.response?.data?.message || err.message}`, 
        severity: 'error' 
      });
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    if (newValue !== 3) {
      dispatch(clearNotifications());
    }
  };

  const handleCloseSnackbar = () => setSnackbar(prev => ({ ...prev, open: false }));

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Container sx={{ py: 8 }}><Alert severity="error">{error}</Alert></Container>;
  }

  if (!user || !dashboardData.profile) return null;

  return (
    <Box sx={{ py: { xs: 6, md: 9 }, bgcolor: '#f4f6f8', minHeight: '100vh' }}>
      <Container maxWidth="lg">
        <Typography variant="h4" component="h1" sx={{ mb: 1, textAlign: { xs: 'center', md: 'left' } }}>
          Welcome back, {user.name}!
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4, textAlign: { xs: 'center', md: 'left' } }}>
          Here is your business summary on ServiceHub.
        </Typography>

        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          centered 
          variant="scrollable" 
          scrollButtons="auto" 
          sx={{ mb: 4, backgroundColor: 'white', borderRadius: 2, boxShadow: 1 }}
        >
          <Tab label="Overview" />
          <Tab label={<Badge color="error" badgeContent={dashboardData.stats.newBookingsCount} max={9}>New Bookings</Badge>} />
          <Tab label={<Badge color="error" badgeContent={dashboardData.stats.activeJobsCount} max={9}>Active Jobs</Badge>} />
          <Tab label={<Badge color="error" badgeContent={notifications.length} max={9}>Notifications</Badge>} />
        </Tabs>

        {tabValue === 0 && (
          <>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <StatCard icon={<NotificationsIcon color="primary" />} title="New Job Requests" value={dashboardData.stats.newBookingsCount} />
              <StatCard icon={<EventIcon color="secondary" />} title="Active Jobs" value={dashboardData.stats.activeJobsCount} />
              <StatCard icon={<MonetizationOnIcon color="success" />} title="This Week's Earnings" value={`₹${dashboardData.stats.weeklyEarnings.toLocaleString()}`} />
              <StatCard icon={<StarIcon sx={{ color: '#ffb400' }} />} title="Your Rating" value={dashboardData.stats.rating.toFixed(1)} />
            </Grid>

            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <DashboardCard title="Profile Summary">
                  <CardContent sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      {dashboardData.profile.profile?.image ? (
                        <Avatar 
                          src={`${API_URL}${encodeURI(dashboardData.profile.profile.image)}`} 
                          sx={{ width: 100, height: 100 }}
                          onError={(e) => {
                            console.error('Failed to load profile image:', `${API_URL}${dashboardData.profile.profile.image}`);
                            e.target.src = 'https://via.placeholder.com/100?text=U';
                          }}
                        />
                      ) : (
                        <Avatar sx={{ width: 100, height: 100, fontSize: '2.5rem' }}>
                          {dashboardData.profile.name.charAt(0)}
                        </Avatar>
                      )}
                    </Box>
                    <Box>
                      <Typography sx={{ mb: 1 }}><strong>Name:</strong> {dashboardData.profile.name}</Typography>
                      <Typography sx={{ mb: 1 }}><strong>Email:</strong> {dashboardData.profile.email}</Typography>
                      <Typography sx={{ mb: 1 }}><strong>Phone:</strong> {dashboardData.profile.phone || 'N/A'}</Typography>
                      <Typography sx={{ mb: 1 }}><strong>Location:</strong> {dashboardData.profile.profile?.location?.fullAddress || 'N/A'}</Typography>
                      <Typography sx={{ mb: 1 }}><strong>Skills:</strong> {dashboardData.profile.profile?.skills?.join(', ') || 'N/A'}</Typography>
                    </Box>
                  </CardContent>
                </DashboardCard>

                <HowItWorksSection />
              </Grid>
              <Grid item xs={12} md={4}>
                <DashboardCard title="Your Status">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, flexWrap: 'wrap' }}>
                    <Typography variant="h6">Availability</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography color={user.profile?.availability === 'Available' ? 'success.main' : 'text.secondary'}>
                        {user.profile?.availability || 'Unavailable'}
                      </Typography>
                      <Switch 
                        checked={user.profile?.availability === 'Available'} 
                        onChange={handleAvailabilityToggle} 
                        color="success" 
                      />
                    </Box>
                  </Box>
                </DashboardCard>
                <DashboardCard title="Quick Actions">
                  <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Button 
                      fullWidth 
                      variant="contained" 
                      startIcon={<AccountCircleIcon />} 
                      onClick={() => navigate('/provider/dashboard')}
                    >
                      Manage Full Dashboard
                    </Button>
                    <Button 
                      fullWidth 
                      variant="outlined" 
                      startIcon={<CalendarTodayIcon />} 
                      onClick={() => navigate('/provider/dashboard')}
                    >
                      View My Schedule
                    </Button>
                  </Box>
                </DashboardCard>
              </Grid>
            </Grid>
          </>
        )}

        {tabValue === 1 && (
          <DashboardCard title="Action Required: New Job Requests">
            {dashboardData.newBookings.length > 0 ? (
              <List disablePadding>
                {dashboardData.newBookings.map((booking, index) => (
                  <React.Fragment key={booking._id}>
                    <BookingCard 
                      booking={booking} 
                      onAction={handleBookingAction} 
                      isActionLoading={actionLoading}
                      onNavigate={navigate}
                    />
                    {index < dashboardData.newBookings.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
                You have no new job requests.
              </Typography>
            )}
          </DashboardCard>
        )}

        {tabValue === 2 && (
          <DashboardCard title="Today's Schedule">
            {dashboardData.todaysSchedule.length > 0 ? (
              <List disablePadding>
                {dashboardData.todaysSchedule.map((booking, index) => (
                  <React.Fragment key={booking._id}>
                    <BookingCard 
                      booking={booking} 
                      onAction={handleBookingAction} 
                      isActionLoading={actionLoading}
                      onNavigate={navigate}
                    />
                    {index < dashboardData.todaysSchedule.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
                No bookings scheduled for today.
              </Typography>
            )}
          </DashboardCard>
        )}

        {tabValue === 3 && (
          <DashboardCard title="Your Notifications">
            {notifications.length > 0 ? (
              <List disablePadding>
                {notifications.map((notif) => (
                  <ListItem key={notif.id} divider>
                    <ListItemAvatar><NotificationsIcon color="primary" /></ListItemAvatar>
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

        <DashboardCard title="Recent Work History">
          {dashboardData.workHistory.length > 0 ? (
            dashboardData.workHistory.map((work) => (
              <Card key={work._id} variant="outlined" sx={{ mb: 2, boxShadow: 2 }}>
                <CardContent>
                  <Typography 
                    variant="h6" 
                    sx={{ cursor: 'pointer', color: 'primary.main' }} 
                    onClick={() => navigate('/provider/dashboard')}
                  >
                    {work.service?.name || 'Unknown Service'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Booking ID: #{work._id.slice(-6).toUpperCase()}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <PersonPinCircleIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2">Customer: {work.customer?.name || 'N/A'}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <EventIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2">
                      Completed: {new Date(work.scheduledTime).toLocaleDateString()}
                    </Typography>
                  </Box>
                  {work.feedback && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>Customer Feedback</Typography>
                      <Rating value={work.feedback.rating} readOnly size="small" />
                      <Typography variant="body2" color="text.secondary">{work.feedback.comment}</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
              No past jobs available.
            </Typography>
          )}
        </DashboardCard>

        <Snackbar 
          open={snackbar.open} 
          autoHideDuration={4000} 
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
}

export default ProviderHome;
import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import {
  Box, Typography, Button, Container, Grid, CircularProgress, Alert,
  List, ListItem, ListItemIcon, Card, CardHeader, CardContent, CardActions, Chip, Divider, ListItemText,Paper
} from '@mui/material';
import { CheckCircle as CheckCircleIcon, Star as StarIcon, Work as WorkIcon } from '@mui/icons-material';
import { setUser } from '../redux/authSlice';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import LoadingScreen from '../components/LoadingScreen';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const socket = io(API_URL, { autoConnect: false });

function PricingPage() {
  const { user, token } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const [plans, setPlans] = useState([]);
  const [subscriptionDetails, setSubscriptionDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submittingPlanId, setSubmittingPlanId] = useState(null);

  const fetchData = useCallback(async () => {
    if (!token) {
      setError('No authentication token found');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      // Fetch plans, profile, and subscription details in parallel
      const [plansRes, profileRes, subscriptionRes] = await Promise.all([
        axios.get(`${API_URL}/api/plans`, config),
        axios.get(`${API_URL}/api/users/profile`, config),
        axios.get(`${API_URL}/api/users/subscription-details`, config)
      ]);

      // Update Redux store with the freshest user data
      dispatch(setUser({ user: profileRes.data, token }));
      
      const freePlan = {
        name: 'Basic',
        price: 0,
        features: ['Standard support', '20% commission rate'],
        bookingLimit: 5
      };
      setPlans([freePlan, ...plansRes.data]);
      setSubscriptionDetails(subscriptionRes.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load page data.');
    } finally {
      setLoading(false);
    }
  }, [token, dispatch]);

  useEffect(() => {
    fetchData();
    if (token) {
      socket.auth = { token };
      socket.connect();
      socket.on('subscriptionWarning', (data) => {
        setSubscriptionDetails((prev) => ({ ...prev, subscriptionStatusMessage: data.message }));
      });
      socket.on('subscriptionUpdated', (updatedUser) => {
        dispatch(setUser({ user: updatedUser, token }));
        fetchData();
      });
    }
    return () => {
      socket.off('subscriptionWarning');
      socket.off('subscriptionUpdated');
      socket.disconnect();
    };
  }, [fetchData, token, dispatch]);

  const handleSubscribe = async (priceId) => {
    setSubmittingPlanId(priceId);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = await axios.post(`${API_URL}/api/subscriptions/create-checkout-session`, { priceId }, config);
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError('Could not initiate subscription. Please try again.');
      setSubmittingPlanId(null);
    }
  };

 if (loading) {
  return <LoadingScreen title="Loading Plans" message="Please wait while we fetch our latest pricing..." />;
}
  return (
    <Box sx={{ py: 9, bgcolor: '#f4f6f8' }}>
      <Container maxWidth="lg">
        <Typography variant="h3" align="center" gutterBottom>Choose Your Plan</Typography>
        <Typography variant="h6" align="center" color="text.secondary" sx={{ mb: 4 }}>Unlock powerful features to grow your business.</Typography>
        
        {/* Subscription Details Section */}
        {subscriptionDetails && (
          <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
            <Typography variant="h5" gutterBottom>Your Subscription</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body1">
                <strong>Plan:</strong> {(subscriptionDetails.subscriptionTier || 'free').charAt(0).toUpperCase() + (subscriptionDetails.subscriptionTier || 'free').slice(1)}
                <Chip
                  label={subscriptionDetails.subscriptionStatus || 'Inactive'}
                  color={subscriptionDetails.subscriptionStatus === 'active' ? 'success' : subscriptionDetails.subscriptionStatus === 'past_due' ? 'error' : 'default'}
                  size="small"
                  sx={{ ml: 1 }}
                />
              </Typography>
              <Typography variant="body1">
                <strong>Bookings:</strong> {subscriptionDetails.currentBookingCount || 0} / {subscriptionDetails.bookingLimit === 0 ? 'Unlimited' : subscriptionDetails.bookingLimit}
              </Typography>
              {subscriptionDetails.subscriptionStatusMessage && (
                <Typography variant="body1" color={subscriptionDetails.subscriptionStatus === 'past_due' ? 'error' : 'warning'}>
                  <strong>Status:</strong> {subscriptionDetails.subscriptionStatusMessage}
                </Typography>
              )}
              {subscriptionDetails.subscriptionStatus === 'past_due' && (
                <Button
                  variant="contained"
                  color="primary"
                  sx={{ mt: 2, alignSelf: 'flex-start' }}
                  onClick={() => handleSubscribe(subscriptionDetails.stripePriceId)}
                  disabled={!!submittingPlanId}
                >
                  {submittingPlanId ? <CircularProgress size={24} /> : 'Renew Subscription'}
                </Button>
              )}
            </Box>
          </Paper>
        )}

        {error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}
        <Grid container spacing={4} alignItems="stretch">
          {plans.map((plan) => (
            <Grid item xs={12} md={4} key={plan.name}>
              <Card 
                elevation={plan.name === 'Pro' ? 8 : 2}
                sx={{ 
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  border: plan.name === 'Pro' ? '2px solid' : '1px solid', 
                  borderColor: plan.name === 'Pro' ? 'primary.main' : 'grey.300', 
                  borderRadius: 4 
                }}
              >
                {plan.name === 'Pro' && <Chip icon={<StarIcon />} label="Recommended" color="primary" sx={{ position: 'absolute', top: 16, right: 16 }}/>}
                <CardHeader title={plan.name} titleTypographyProps={{ align: 'center', variant: 'h4' }} sx={{ bgcolor: 'grey.100' }}/>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', mb: 2 }}>
                    <Typography component="h2" variant="h3">₹{plan.price}</Typography>
                    <Typography variant="h6" color="text.secondary">/month</Typography>
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  
                  <Box sx={{ mb: 2 }}>
                    <List dense>
                      <ListItem>
                        <ListItemIcon sx={{minWidth: 32}}><WorkIcon color="action" /></ListItemIcon>
                        <ListItemText 
                          primary={<strong>{plan.bookingLimit === 0 ? 'Unlimited Bookings' : `${plan.bookingLimit} Bookings`}</strong>}
                          secondary="per month"
                        />
                      </ListItem>
                    </List>
                  </Box>

                  <List>
                    {plan.features.map((feature) => (
                      <ListItem key={feature} disableGutters>
                        <ListItemIcon sx={{ minWidth: 32 }}><CheckCircleIcon color="success" fontSize="small"/></ListItemIcon>
                        <ListItemText primary={feature} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
                <CardActions sx={{ p: 2, mt: 'auto' }}>
                  {user?.subscriptionTier === plan.name?.toLowerCase() ? (
                    <Button fullWidth variant="contained" disabled>Current Plan</Button>
                  ) : plan.price === 0 ? (
                    <Button fullWidth variant="outlined" disabled>Your Default Plan</Button>
                  ) : (
                    <Button fullWidth variant="contained" onClick={() => handleSubscribe(plan.stripePriceId)} disabled={!!submittingPlanId}>
                      {submittingPlanId === plan.stripePriceId ? <CircularProgress size={24} /> : 'Choose Plan'}
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}

export default PricingPage;


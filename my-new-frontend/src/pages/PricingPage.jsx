import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {
  Box, Typography, Button, Container, Grid, CircularProgress, Alert,
  List, ListItem, ListItemIcon, Card, CardHeader, CardContent, CardActions, Chip,ListItemText
} from '@mui/material';
import { CheckCircle as CheckCircleIcon, Star as StarIcon } from '@mui/icons-material';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function PricingPage() {
  const { user, token } = useSelector((state) => state.auth);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submittingPlanId, setSubmittingPlanId] = useState(null);

  const fetchPlans = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = await axios.get(`${API_URL}/api/plans`, config);
      const freePlan = {
          name: 'Basic',
          price: 0,
          features: ['Up to 5 bookings per month', 'Standard support', '20% commission rate']
      };
      setPlans([freePlan, ...data]);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch plans.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

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
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ py: 9, bgcolor: '#f4f6f8' }}>
      <Container maxWidth="lg">
        <Typography variant="h3" align="center" gutterBottom>Choose Your Plan</Typography>
        <Typography variant="h6" align="center" color="text.secondary" sx={{ mb: 6 }}>Unlock powerful features to grow your business.</Typography>
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
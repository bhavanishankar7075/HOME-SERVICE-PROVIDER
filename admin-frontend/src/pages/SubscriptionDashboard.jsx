import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Snackbar,
  Alert,
  Button,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { logout } from '../store/authSlice';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const socket = io(API_URL, { autoConnect: false });

const SubscriptionDashboard = () => {
  const { user, token } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ open: false, text: '', severity: 'success' });

  const fetchSubscriptions = async () => {
    if (!token || !user || user.role !== 'admin') {
      setMessage({ open: true, text: 'Not authorized. Please log in as admin.', severity: 'error' });
      dispatch(logout());
      navigate('/login');
      return;
    }
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(`${API_URL}/api/subscriptions`, config);
      console.log('[fetchSubscriptions] Raw subscriptions data:', response.data);
      const transformedSubscriptions = Array.isArray(response.data)
        ? response.data.map(sub => {
            console.log('[fetchSubscriptions] Processing subscription:', {
              subscriptionId: sub._id,
              providerId: sub.provider?._id,
              providerName: sub.provider?.name,
              providerExists: !!sub.provider,
              providerLocation: sub.provider?.profile?.location?.fullAddress
            });
            return {
              _id: sub._id,
              providerName: sub.provider?.name || 'Unknown Provider',
              planType: sub.planType || 'N/A',
              totalRevenue: sub.totalRevenue || 0,
              subscriptionFee: sub.subscriptionFee || 0,
              paymentStatus: sub.paymentStatus || 'N/A',
              startDate: sub.startDate,
              endDate: sub.endDate,
              providerLocation: sub.provider?.profile?.location?.fullAddress || 'N/A'
            };
          })
        : [];
      console.log('[fetchSubscriptions] Transformed subscriptions:', transformedSubscriptions);
      setSubscriptions(transformedSubscriptions);
    } catch (error) {
      console.error('[fetchSubscriptions] Error:', error.response?.data || error);
      setMessage({
        open: true,
        text: `Failed to load subscriptions: ${error.response?.data?.message || error.message}`,
        severity: 'error',
      });
      if (error.response?.status === 401) {
        dispatch(logout());
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSubscription = async (subscriptionId, updates) => {
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.put(`${API_URL}/api/subscriptions/${subscriptionId}`, updates, config);
      const updatedSubscription = {
        _id: response.data._id,
        providerName: response.data.provider?.name || 'Unknown Provider',
        planType: response.data.planType || 'N/A',
        totalRevenue: response.data.totalRevenue || 0,
        subscriptionFee: response.data.subscriptionFee || 0,
        paymentStatus: response.data.paymentStatus || 'N/A',
        startDate: response.data.startDate,
        endDate: response.data.endDate,
        providerLocation: response.data.provider?.profile?.location?.fullAddress || 'N/A'
      };
      setSubscriptions((prev) =>
        prev.map((sub) => (sub._id === subscriptionId ? updatedSubscription : sub))
      );
      setMessage({
        open: true,
        text: `Subscription updated successfully for ${updatedSubscription.providerName}`,
        severity: 'success',
      });
    } catch (error) {
      console.error('[handleUpdateSubscription] Error:', error.response?.data || error);
      setMessage({
        open: true,
        text: `Failed to update subscription: ${error.response?.data?.message || error.message}`,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubscription = async (subscriptionId) => {
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`${API_URL}/api/subscriptions/${subscriptionId}`, config);
      setSubscriptions((prev) => prev.filter((sub) => sub._id !== subscriptionId));
      setMessage({
        open: true,
        text: `Subscription deleted successfully`,
        severity: 'warning',
      });
    } catch (error) {
      console.error('[handleDeleteSubscription] Error:', error.response?.data || error);
      setMessage({
        open: true,
        text: `Failed to delete subscription: ${error.response?.data?.message || error.message}`,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      console.log('[useEffect] Invalid user or role, redirecting to login');
      dispatch(logout());
      navigate('/login');
      return;
    }

    fetchSubscriptions();

    const handleConnect = () => {
      console.log('[socket] Connected, joining room: admin_room');
      socket.emit('joinRoom', 'admin_room');
    };

    socket.on('connect', handleConnect);
    socket.connect();

    const handleSubscriptionCreated = (data) => {
      console.log('[socket] Received subscriptionCreated:', data);
      const newSubscription = {
        _id: data.subscription._id,
        providerName: data.providerName || 'Unknown Provider',
        planType: data.subscription.planType || 'N/A',
        totalRevenue: data.subscription.totalRevenue || 0,
        subscriptionFee: data.subscription.subscriptionFee || 0,
        paymentStatus: data.subscription.paymentStatus || 'N/A',
        startDate: data.subscription.startDate,
        endDate: data.subscription.endDate,
        providerLocation: data.subscription.provider?.profile?.location?.fullAddress || 'N/A'
      };
      setSubscriptions((prev) => [...prev, newSubscription]);
      setMessage({
        open: true,
        text: `New subscription created for ${data.providerName || 'Unknown Provider'}`,
        severity: 'success',
      });
    };

    const handleSubscriptionUpdated = (data) => {
      console.log('[socket] Received subscriptionUpdated:', data);
      const updatedSubscription = {
        _id: data.subscription._id,
        providerName: data.providerName || 'Unknown Provider',
        planType: data.subscription.planType || 'N/A',
        totalRevenue: data.subscription.totalRevenue || 0,
        subscriptionFee: data.subscription.subscriptionFee || 0,
        paymentStatus: data.subscription.paymentStatus || 'N/A',
        startDate: data.subscription.startDate,
        endDate: data.subscription.endDate,
        providerLocation: data.subscription.provider?.profile?.location?.fullAddress || 'N/A'
      };
      setSubscriptions((prev) =>
        prev.map((sub) =>
          sub._id === data.subscription._id ? updatedSubscription : sub
        )
      );
      setMessage({
        open: true,
        text: `Subscription updated for ${data.providerName || 'Unknown Provider'}`,
        severity: 'info',
      });
    };

    const handleSubscriptionDeleted = (data) => {
      console.log('[socket] Received subscriptionDeleted:', data);
      setSubscriptions((prev) => prev.filter((sub) => sub._id !== data.subscriptionId));
      setMessage({
        open: true,
        text: `Subscription deleted for ${data.providerName || 'Unknown Provider'}`,
        severity: 'warning',
      });
    };

    const handleRevenueUpdated = (data) => {
      console.log('[socket] Received revenueUpdated:', data);
      const updatedSubscription = {
        _id: data.subscription._id,
        providerName: data.providerName || 'Unknown Provider',
        planType: data.subscription.planType || 'N/A',
        totalRevenue: data.subscription.totalRevenue || 0,
        subscriptionFee: data.subscription.subscriptionFee || 0,
        paymentStatus: data.subscription.paymentStatus || 'N/A',
        startDate: data.subscription.startDate,
        endDate: data.subscription.endDate,
        providerLocation: data.subscription.provider?.profile?.location?.fullAddress || 'N/A'
      };
      setSubscriptions((prev) =>
        prev.map((sub) =>
          sub._id === data.subscription._id ? updatedSubscription : sub
        )
      );
      setMessage({
        open: true,
        text: `Revenue updated for ${data.providerName || 'Unknown Provider'}: ₹${data.totalRevenue || 0}`,
        severity: 'info',
      });
    };

    socket.on('subscriptionCreated', handleSubscriptionCreated);
    socket.on('subscriptionUpdated', handleSubscriptionUpdated);
    socket.on('subscriptionDeleted', handleSubscriptionDeleted);
    socket.on('revenueUpdated', handleRevenueUpdated);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('subscriptionCreated', handleSubscriptionCreated);
      socket.off('subscriptionUpdated', handleSubscriptionUpdated);
      socket.off('subscriptionDeleted', handleSubscriptionDeleted);
      socket.off('revenueUpdated', handleRevenueUpdated);
      socket.disconnect();
    };
  }, [user, token, navigate, dispatch]);

  const columns = [
    { field: 'providerName', headerName: 'Provider Name', width: 200 },
    {
      field: 'planType',
      headerName: 'Plan Type',
      width: 150,
      valueFormatter: ({ value }) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : 'N/A'),
    },
    {
      field: 'totalRevenue',
      headerName: 'Total Revenue',
      width: 150,
      valueFormatter: ({ value }) => `₹${(value || 0).toFixed(2)}`,
    },
    {
      field: 'subscriptionFee',
      headerName: 'Subscription Fee',
      width: 150,
      valueFormatter: ({ value }) => `₹${(value || 0).toFixed(2)}`,
    },
    {
      field: 'paymentStatus',
      headerName: 'Payment Status',
      width: 150,
      valueFormatter: ({ value }) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : 'N/A'),
    },
    {
      field: 'startDate',
      headerName: 'Start Date',
      width: 150,
      valueFormatter: ({ value }) => (value ? new Date(value).toLocaleDateString() : 'N/A'),
    },
    {
      field: 'endDate',
      headerName: 'End Date',
      width: 150,
      valueFormatter: ({ value }) => (value ? new Date(value).toLocaleDateString() : 'N/A'),
    },
    {
      field: 'providerLocation',
      headerName: 'Provider Location',
      width: 200,
      valueFormatter: ({ value }) => value || 'N/A',
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleUpdateSubscription(params.row._id, {
              paymentStatus: params.row.paymentStatus === 'completed' ? 'pending' : 'completed'
            })}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Toggle Status'}
          </Button>
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={() => handleDeleteSubscription(params.row._id)}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </Box>
      ),
    },
  ];

  if (loading && !subscriptions.length) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, maxWidth: '1200px', mx: 'auto', bgcolor: '#f4f6f8', minHeight: '100vh' }}>
      <Typography variant="h3" sx={{ mb: 4, fontWeight: 'bold', color: '#1a3c34', textAlign: 'center' }}>
        Admin Subscription Dashboard
      </Typography>
      <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 3 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>All Provider Subscriptions</Typography>
        {subscriptions.length > 0 ? (
          <Box sx={{ height: 400, width: '100%' }}>
            <DataGrid
              rows={subscriptions}
              columns={columns}
              getRowId={(row) => row._id}
              pageSize={5}
              rowsPerPageOptions={[5, 10, 20]}
              disableSelectionOnClick
              sx={{
                '& .MuiDataGrid-columnHeaders': {
                  background: 'linear-gradient(90deg, #1a3c34, #2a6a5e)',
                  color: 'white',
                },
                '& .MuiDataGrid-row:hover': {
                  backgroundColor: 'rgba(26, 60, 52, 0.1)',
                },
              }}
            />
          </Box>
        ) : (
          <Typography>No subscriptions found.</Typography>
        )}
      </Paper>
      <Snackbar
        open={message.open}
        autoHideDuration={4000}
        onClose={() => setMessage({ ...message, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={message.severity} sx={{ width: '100%' }}>
          {message.text}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SubscriptionDashboard;
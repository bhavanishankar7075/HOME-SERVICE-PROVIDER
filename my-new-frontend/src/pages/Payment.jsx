import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress, Snackbar, Alert, TextField } from '@mui/material';
import { Refund, Edit } from '@mui/icons-material';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import LoadingScreen from '../components/LoadingScreen';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Payments = () => {
  const { token } = useSelector((state) => state.auth);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ open: false, text: '', severity: 'success' });
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const socket = io(API_URL, {
      withCredentials: true,
      extraHeaders: { Authorization: `Bearer ${token || localStorage.getItem('token')}` },
    });

    const fetchPayments = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_URL}/api/payments`, {
          headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` },
        });
        setPayments(response.data);
      } catch (error) {
        setMessage({ open: true, text: error.response?.data?.message || 'Failed to load payments', severity: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();

    socket.on('paymentsUpdated', () => {
      fetchPayments();
      setMessage({ open: true, text: 'Payments updated in real-time!', severity: 'info' });
    });

    return () => socket.disconnect();
  }, [token]);

  const handleUpdateStatus = async (id, status) => {
    try {
      const response = await axios.put(`${API_URL}/api/payments/${id}/status`, { status }, {
        headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` },
      });
      setMessage({ open: true, text: 'Payment status updated successfully', severity: 'success' });
      setPayments(payments.map((payment) => (payment._id === id ? response.data : payment)));
    } catch (error) {
      setMessage({ open: true, text: error.response?.data?.message || 'Failed to update payment status', severity: 'error' });
    }
  };

  const handleRefund = async (id) => {
    try {
      await axios.post(`${API_URL}/api/payments/${id}/refund`, {}, {
        headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` },
      });
      setMessage({ open: true, text: 'Payment refunded successfully', severity: 'success' });
      setPayments(payments.map((payment) => (payment._id === id ? { ...payment, status: 'refunded' } : payment)));
    } catch (error) {
      setMessage({ open: true, text: error.response?.data?.message || 'Failed to process refund', severity: 'error' });
    }
  };

  const filteredPayments = payments.filter((payment) =>
    payment.userId?.name.toLowerCase().includes(search.toLowerCase()) ||
    payment.bookingId?.service?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box sx={{ p: 4, maxWidth: '1200px', mx: 'auto', bgcolor: '#f4f6f8', minHeight: '100vh' }}>
      <Typography variant="h4" sx={{ mb: 3, color: '#1a3c34', fontWeight: 'bold' }}>
        Manage Payments
      </Typography>
      <TextField
        label="Search by User or Service"
        variant="outlined"
        fullWidth
        sx={{ mb: 3 }}
        Value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {loading ? (
       <LoadingScreen 
  title="Processing Payment" 
  message="Please wait, do not refresh the page..." 
/>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', color: '#2c5282' }}>User</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#2c5282' }}>Service</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#2c5282' }}>Amount</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#2c5282' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#2c5282' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPayments.map((payment) => (
                <TableRow key={payment._id}>
                  <TableCell>{payment.userId?.name || 'Unknown'}</TableCell>
                  <TableCell>{payment.bookingId?.service?.name || 'Unknown'}</TableCell>
                  <TableCell>${payment.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <select
                      value={payment.status}
                      onChange={(e) => handleUpdateStatus(payment._id, e.target.value)}
                      style={{ padding: '5px' }}
                      disabled={payment.status === 'refunded'}
                    >
                      <option value="pending">Pending</option>
                      <option value="succeeded">Succeeded</option>
                      <option value="failed">Failed</option>
                      <option value="refunded">Refunded</option>
                    </select>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="contained"
                      color="warning"
                      startIcon={<Refund />}
                      onClick={() => handleRefund(payment._id)}
                      disabled={payment.status !== 'succeeded'}
                    >
                      Refund
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Snackbar
        open={message.open}
        autoHideDuration={4000}
        onClose={() => setMessage({ ...message, open: false })}
      >
        <Alert severity={message.severity}>{message.text}</Alert>
      </Snackbar>
    </Box>
  );
};

export default Payments;
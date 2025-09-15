import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress, Snackbar, Alert, TextField } from '@mui/material';
import { Delete, Edit } from '@mui/icons-material';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

const Orders = () => {
  const { token } = useSelector((state) => state.auth);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ open: false, text: '', severity: 'success' });
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const socket = io('http://localhost:5000', {
      withCredentials: true,
      extraHeaders: { Authorization: `Bearer ${token || localStorage.getItem('token')}` },
    });

    const fetchOrders = async () => {
      setLoading(true);
      try {
        const response = await axios.get('http://localhost:5000/api/orders', {
          headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` },
        });
        setOrders(response.data);
      } catch (error) {
        setMessage({ open: true, text: error.response?.data?.message || 'Failed to load orders', severity: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();

    socket.on('ordersUpdated', () => {
      fetchOrders();
      setMessage({ open: true, text: 'Orders updated in real-time!', severity: 'info' });
    });

    return () => socket.disconnect();
  }, [token]);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/orders/${id}`, {
        headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` },
      });
      setMessage({ open: true, text: 'Order deleted successfully', severity: 'success' });
      setOrders(orders.filter((order) => order._id !== id));
    } catch (error) {
      setMessage({ open: true, text: error.response?.data?.message || 'Failed to delete order', severity: 'error' });
    }
  };

  const handleUpdate = async (id, status) => {
    try {
      const response = await axios.put(`http://localhost:5000/api/orders/${id}`, { status }, {
        headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` },
      });
      setMessage({ open: true, text: 'Order updated successfully', severity: 'success' });
      setOrders(orders.map((order) => (order._id === id ? response.data : order)));
    } catch (error) {
      setMessage({ open: true, text: error.response?.data?.message || 'Failed to update order', severity: 'error' });
    }
  };

  const filteredOrders = orders.filter((order) =>
    order.serviceId?.name.toLowerCase().includes(search.toLowerCase()) ||
    order.userId?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box sx={{ p: 4, maxWidth: '1200px', mx: 'auto', bgcolor: '#f4f6f8', minHeight: '100vh' }}>
      <Typography variant="h4" sx={{ mb: 3, color: '#1a3c34', fontWeight: 'bold' }}>
        Manage Orders
      </Typography>
      <TextField
        label="Search by Service or User"
        variant="outlined"
        fullWidth
        sx={{ mb: 3 }}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', color: '#2c5282' }}>User</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#2c5282' }}>Service</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#2c5282' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#2c5282' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order._id}>
                  <TableCell>{order.userId?.name || 'Unknown'}</TableCell>
                  <TableCell>{order.serviceId?.name || 'Unknown'}</TableCell>
                  <TableCell>
                    <select
                      value={order.status}
                      onChange={(e) => handleUpdate(order._id, e.target.value)}
                      style={{ padding: '5px' }}
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<Delete />}
                      onClick={() => handleDelete(order._id)}
                      sx={{ mr: 1 }}
                    >
                      Delete
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

export default Orders;
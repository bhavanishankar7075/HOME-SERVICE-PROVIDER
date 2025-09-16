import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import io from 'socket.io-client';
import {
  Box, Typography, Grid, Paper, CircularProgress, Snackbar, Alert, Tabs, Tab,
  Dialog, DialogActions, DialogContent, DialogTitle, Divider, Avatar, Card, CardContent, CardActions,
  List, ListItem, ListItemIcon, ListItemText, Button, Chip, Toolbar, IconButton, TextField,
  CardMedia, Select, MenuItem, FormControl, InputLabel, DialogContentText
} from '@mui/material';
import { 
    Menu, CalendarToday, AccessTime, LocationOn, Person, Phone, Payment, Paid, ArrowBack
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const socket = io(API_URL);

// A new, more detailed booking card for the admin view
const AdminBookingCard = ({ booking, onAssign }) => {
    return (
        <Card sx={{ display: 'flex', mb: 2, boxShadow: 2 }}>
            <CardMedia
                component="img"
                sx={{ width: 150, display: { xs: 'none', sm: 'block' } }}
                image={booking.service?.image ? `${API_URL}${booking.service.image}` : `https://via.placeholder.com/150?text=No+Image`}
                alt={booking.service?.name}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography component="div" variant="h6">
                            {booking.service?.name}
                        </Typography>
                        <Chip 
                            label={booking.status}
                            color={
                                booking.status === 'completed' ? 'success' :
                                booking.status === 'pending' ? 'warning' :
                                booking.status === 'assigned' ? 'primary' :
                                booking.status === 'in-progress' ? 'info' : 'error'
                            }
                            size="small"
                            sx={{ textTransform: 'capitalize' }}
                        />
                    </Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        ID: #{booking._id.slice(-6).toUpperCase()}
                    </Typography>
                    
                    <Grid container spacing={1} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}><Person sx={{ mr: 1, fontSize: '1rem' }} /> {booking.customerDetails?.name}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}><Phone sx={{ mr: 1, fontSize: '1rem' }} /> {booking.customerDetails?.phone}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}><CalendarToday sx={{ mr: 1, fontSize: '1rem' }} /> {new Date(booking.scheduledTime).toLocaleString()}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                           <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}><LocationOn sx={{ mr: 1, fontSize: '1rem' }} /> {booking.location}</Typography>
                        </Grid>
                         <Grid item xs={12} sm={6}>
                           <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}><Payment sx={{ mr: 1, fontSize: '1rem' }} /> {booking.paymentDetails?.method}</Typography>
                        </Grid>
                         <Grid item xs={12} sm={6}>
                           <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}><Paid sx={{ mr: 1, fontSize: '1rem' }} /> Payment: {booking.paymentDetails?.status}</Typography>
                        </Grid>
                    </Grid>
                </CardContent>
                <CardActions sx={{ alignSelf: 'flex-end', p: 2 }}>
                    {booking.status === 'pending' && (
                        <Button size="small" variant="contained" onClick={() => onAssign(booking)}>Assign Provider</Button>
                    )}
                </CardActions>
            </Box>
        </Card>
    );
};

const BookingManagement = () => {
  const { token, user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ open: false, text: '', severity: 'info' });
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [suitableProviders, setSuitableProviders] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    location: '',
    date: new Date().toISOString().split('T')[0], // Default to today's date
  });

  const fetchBookings = useCallback(async () => {
    if (!token || user?.role !== 'admin') {
      setMessage({ open: true, text: 'Unauthorized access', severity: 'error' });
      navigate('/login');
      return;
    }
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = await axios.get(`${API_URL}/api/bookings/all-bookings`, config);
      setBookings(Array.isArray(data) ? data : []);
    } catch (error) {
      setMessage({ 
        open: true, 
        text: `Failed to fetch bookings: ${error.response?.data?.message || error.message}`, 
        severity: 'error' 
      });
    } finally {
      setLoading(false);
    }
  }, [token, user, navigate]);

  useEffect(() => {
    fetchBookings();
    socket.emit('joinAdminRoom');
    const handleBookingUpdate = (data) => {
      if (data && data.message) {
        setMessage({ open: true, text: data.message, severity: 'info' });
      }
      fetchBookings();
    };
    socket.on('bookingStatusUpdate', handleBookingUpdate);
    return () => {
      socket.off('bookingStatusUpdate', handleBookingUpdate);
    };
  }, [fetchBookings]);

  const handleOpenAssignModal = async (booking) => {
    if (!booking?._id || !/^[0-9a-fA-F]{24}$/.test(booking._id)) {
      setMessage({ open: true, text: 'Invalid booking ID', severity: 'error' });
      console.error('Invalid booking ID:', booking._id);
      return;
    }
    console.log('Selected booking ID:', booking._id);
    setSelectedBooking(booking);
    setAssignModalOpen(true);
    setLoadingProviders(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/admin/providers/active`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          location: booking.location,
          services: booking.service?.category
        }
      });
      console.log('Fetched providers:', data);
      setSuitableProviders(Array.isArray(data) ? data : []);
      if (data.length === 0) {
        setMessage({
          open: true,
          text: `No providers found for service (${booking.service?.name}), location (${booking.location}), or time (${new Date(booking.scheduledTime).toLocaleString()}). Try adjusting the location or time.`,
          severity: 'warning',
        });
      }
    } catch (error) {
      console.error('Error fetching providers:', error.response?.data || error.message);
      setMessage({ 
        open: true, 
        text: `Failed to find providers: ${error.response?.data?.message || error.message}`, 
        severity: 'error' 
      });
    } finally {
      setLoadingProviders(false);
    }
  };

  const handleAssignProvider = async (providerId) => {
    setSelectedProviderId(providerId);
    setConfirmDialogOpen(true);
  };

  const confirmAssignProvider = async () => {
    if (!selectedBooking?._id || !selectedProviderId || assigning) return;
    setAssigning(true);
    try {
      const { data } = await axios.put(
        `${API_URL}/api/bookings/${selectedBooking._id}/assign-provider`,
        { providerId: selectedProviderId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Assignment response:', data);
      setAssignModalOpen(false);
      setConfirmDialogOpen(false);
      setMessage({ open: true, text: 'Provider assigned successfully', severity: 'success' });
      fetchBookings();
    } catch (error) {
      console.error('Error assigning provider:', error.response?.data || error.message);
      setMessage({
        open: true,
        text: `Failed to assign provider: ${error.response?.data?.message || error.message}`,
        severity: 'error',
      });
    } finally {
      setAssigning(false);
      setSelectedProviderId(null);
    }
  };

  const handleCloseConfirmDialog = () => {
    setConfirmDialogOpen(false);
    setSelectedProviderId(null);
  };

  const filteredBookings = useMemo(() => {
    const sortedBookings = [...bookings].sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt); // Newest first
    });
    console.log('Sorted bookings by createdAt:', sortedBookings.map(b => ({ id: b._id, createdAt: b.createdAt })));
    
    return sortedBookings
      .filter(booking => {
        if (filters.status === 'all') return true;
        return booking.status === filters.status;
      })
      .filter(booking => {
        const searchTerm = filters.search.toLowerCase();
        return (
          booking.customerDetails?.name.toLowerCase().includes(searchTerm) ||
          booking.service?.name.toLowerCase().includes(searchTerm)
        );
      })
      .filter(booking => {
        if (!filters.location) return true;
        return booking.location.toLowerCase().includes(filters.location.toLowerCase());
      })
      .filter(booking => {
        if (!filters.date) return true;
        const bookingDate = new Date(booking.scheduledTime).toISOString().split('T')[0];
        return bookingDate === filters.date;
      });
  }, [bookings, filters]);

  if (loading) return <CircularProgress sx={{ display: 'block', margin: 'auto', mt: 4 }} />;

  return (
    <Box sx={{ p: 3 }}>
      <Toolbar />
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/admin/dashboard')}
          sx={{ mr: 2 }}
        >
          Back to Dashboard
        </Button>
        <Typography variant="h4">Booking Management</Typography>
      </Box>
      
      <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          label="Search by Customer or Service"
          variant="outlined"
          value={filters.search}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          sx={{ flexGrow: 1, minWidth: '200px' }}
        />
        <TextField
          label="Filter by Location"
          variant="outlined"
          value={filters.location}
          onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
          sx={{ minWidth: '200px' }}
        />
        <TextField
          label="Filter by Date"
          type="date"
          value={filters.date}
          onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: '200px' }}
        />
        <Button
          variant="outlined"
          onClick={() => setFilters(prev => ({ ...prev, date: '' }))}
          sx={{ minWidth: '100px' }}
        >
          Clear Date
        </Button>
        <FormControl sx={{ minWidth: '200px' }}>
          <InputLabel>Filter by Status</InputLabel>
          <Select
            value={filters.status}
            label="Filter by Status"
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="assigned">Assigned</MenuItem>
            <MenuItem value="in-progress">In-Progress</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      <Grid container spacing={3} sx={{ maxWidth: '1200px', mx: 'auto', mb: 4 }}>
        {filteredBookings.length > 0 ? filteredBookings.map(booking => (
          <Grid item xs={12} sm={6} md={4} key={booking._id}>
            <AdminBookingCard booking={booking} onAssign={handleOpenAssignModal} />
          </Grid>
        )) : (
          <Grid item xs={12}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography>No bookings found that match your filters</Typography>
            </Paper>
          </Grid>
        )}
      </Grid>

      <Dialog open={assignModalOpen} onClose={() => setAssignModalOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Assign Provider for Booking #{selectedBooking?._id.slice(-6).toUpperCase()}</DialogTitle>
        <DialogContent>
          <Typography gutterBottom><strong>Service:</strong> {selectedBooking?.service?.name}</Typography>
          <Typography gutterBottom><strong>Customer:</strong> {selectedBooking?.customerDetails?.name}</Typography>
          <Typography gutterBottom><strong>Location:</strong> {selectedBooking?.location}</Typography>
          <Typography gutterBottom><strong>Time:</strong> {selectedBooking?.scheduledTime ? new Date(selectedBooking.scheduledTime).toLocaleString() : 'N/A'}</Typography>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6">Suitable Providers</Typography>
          {loadingProviders ? (
            <CircularProgress sx={{ display: 'block', mx: 'auto', my: 2 }} />
          ) : suitableProviders.length > 0 ? (
            <List>
              {suitableProviders.map(provider => (
                <ListItem
                  key={provider._id}
                  secondaryAction={
                    <Button
                      edge="end"
                      variant="contained"
                      disabled={assigning}
                      onClick={() => handleAssignProvider(provider._id)}
                    >
                      {assigning ? <CircularProgress size={24} /> : 'Assign'}
                    </Button>
                  }
                >
                  <ListItemIcon>
                    <Avatar src={provider.profile.image ? `${API_URL}${provider.profile.image}` : ''}>
                      {provider.name.charAt(0)}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={provider.name}
                    secondary={
                      <>
                        <Typography variant="body2">Skills: {provider.profile.skills?.join(', ') || 'None'}</Typography>
                        <Typography variant="body2">City: {provider.profile.location?.details?.city || 'Not Set'}</Typography>
                        <Typography variant="body2">Full Address: {provider.profile.location?.fullAddress || 'Not Set'}</Typography>
                        <Typography variant="body2">Availability: {provider.profile.availability || 'Not Set'}</Typography>
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography>No providers found for service ({selectedBooking?.service?.name}), location ({selectedBooking?.location}), or time ({selectedBooking?.scheduledTime ? new Date(selectedBooking.scheduledTime).toLocaleString() : 'N/A'}). Try adjusting the location or time.</Typography>
              <Button
                variant="outlined"
                sx={{ mt: 2 }}
                onClick={() => handleOpenAssignModal(selectedBooking)}
              >
                Retry
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignModalOpen(false)} disabled={assigning}>Cancel</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmDialogOpen} onClose={handleCloseConfirmDialog} fullWidth maxWidth="xs">
        <DialogTitle>Confirm Provider Assignment</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to assign this provider to booking #{selectedBooking?._id.slice(-6).toUpperCase()}?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmDialog} disabled={assigning}>Cancel</Button>
          <Button onClick={confirmAssignProvider} variant="contained" disabled={assigning}>
            {assigning ? <CircularProgress size={24} /> : 'Confirm'}
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
};

export default BookingManagement;


































































































//main-1
/* import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import io from 'socket.io-client';
import {
  Box, Typography, Grid, Paper, CircularProgress, Snackbar, Alert, Tabs, Tab,
  Dialog, DialogActions, DialogContent, DialogTitle, Divider, Avatar, Card, CardContent, CardActions,
  List, ListItem, ListItemIcon, ListItemText, Button, Chip, Toolbar, IconButton, TextField,
  CardMedia, Select, MenuItem, FormControl, InputLabel, DialogContentText
} from '@mui/material';
import { 
    Menu, CalendarToday, AccessTime, LocationOn, Person, Phone, Payment, Paid, ArrowBack
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const socket = io(API_URL);

// A new, more detailed booking card for the admin view
const AdminBookingCard = ({ booking, onAssign }) => {
    return (
        <Card sx={{ display: 'flex', mb: 2, boxShadow: 2 }}>
            <CardMedia
                component="img"
                sx={{ width: 150, display: { xs: 'none', sm: 'block' } }}
                image={booking.service?.image ? `${API_URL}${booking.service.image}` : `https://via.placeholder.com/150?text=No+Image`}
                alt={booking.service?.name}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography component="div" variant="h6">
                            {booking.service?.name}
                        </Typography>
                        <Chip 
                            label={booking.status}
                            color={
                                booking.status === 'completed' ? 'success' :
                                booking.status === 'pending' ? 'warning' :
                                booking.status === 'assigned' ? 'primary' :
                                booking.status === 'in-progress' ? 'info' : 'error'
                            }
                            size="small"
                            sx={{ textTransform: 'capitalize' }}
                        />
                    </Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        ID: #{booking._id.slice(-6).toUpperCase()}
                    </Typography>
                    
                    <Grid container spacing={1} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}><Person sx={{ mr: 1, fontSize: '1rem' }} /> {booking.customerDetails?.name}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}><Phone sx={{ mr: 1, fontSize: '1rem' }} /> {booking.customerDetails?.phone}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}><CalendarToday sx={{ mr: 1, fontSize: '1rem' }} /> {new Date(booking.scheduledTime).toLocaleString()}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                           <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}><LocationOn sx={{ mr: 1, fontSize: '1rem' }} /> {booking.location}</Typography>
                        </Grid>
                         <Grid item xs={12} sm={6}>
                           <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}><Payment sx={{ mr: 1, fontSize: '1rem' }} /> {booking.paymentDetails?.method}</Typography>
                        </Grid>
                         <Grid item xs={12} sm={6}>
                           <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}><Paid sx={{ mr: 1, fontSize: '1rem' }} /> Payment: {booking.paymentDetails?.status}</Typography>
                        </Grid>
                    </Grid>
                </CardContent>
                <CardActions sx={{ alignSelf: 'flex-end', p: 2 }}>
                    {booking.status === 'pending' && (
                        <Button size="small" variant="contained" onClick={() => onAssign(booking)}>Assign Provider</Button>
                    )}
                </CardActions>
            </Box>
        </Card>
    );
};

const BookingManagement = () => {
  const { token, user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ open: false, text: '', severity: 'info' });
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [suitableProviders, setSuitableProviders] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    location: '',
    date: new Date().toISOString().split('T')[0], // Default to today's date
  });

  const fetchBookings = useCallback(async () => {
    if (!token || user?.role !== 'admin') {
      setMessage({ open: true, text: 'Unauthorized access', severity: 'error' });
      navigate('/login');
      return;
    }
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = await axios.get(`${API_URL}/api/bookings/all-bookings`, config);
      setBookings(Array.isArray(data) ? data : []);
    } catch (error) {
      setMessage({ 
        open: true, 
        text: `Failed to fetch bookings: ${error.response?.data?.message || error.message}`, 
        severity: 'error' 
      });
    } finally {
      setLoading(false);
    }
  }, [token, user, navigate]);

  useEffect(() => {
    fetchBookings();
    socket.emit('joinAdminRoom');
    const handleBookingUpdate = (data) => {
      if (data && data.message) {
        setMessage({ open: true, text: data.message, severity: 'info' });
      }
      fetchBookings();
    };
    socket.on('bookingStatusUpdate', handleBookingUpdate);
    return () => {
      socket.off('bookingStatusUpdate', handleBookingUpdate);
    };
  }, [fetchBookings]);

  const handleOpenAssignModal = async (booking) => {
    if (!booking?._id || !/^[0-9a-fA-F]{24}$/.test(booking._id)) {
      setMessage({ open: true, text: 'Invalid booking ID', severity: 'error' });
      console.error('Invalid booking ID:', booking._id);
      return;
    }
    console.log('Selected booking ID:', booking._id);
    setSelectedBooking(booking);
    setAssignModalOpen(true);
    setLoadingProviders(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/bookings/${booking._id}/find-providers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Fetched providers:', data);
      setSuitableProviders(Array.isArray(data) ? data : []);
      if (data.length === 0) {
        setMessage({
          open: true,
          text: `No providers found for service (${booking.service?.name}), location (${booking.location}), or time (${new Date(booking.scheduledTime).toLocaleString()}). Try adjusting the location or time.`,
          severity: 'warning',
        });
      }
    } catch (error) {
      console.error('Error fetching providers:', error.response?.data || error.message);
      setMessage({ 
        open: true, 
        text: `Failed to find providers: ${error.response?.data?.message || error.message}`, 
        severity: 'error' 
      });
    } finally {
      setLoadingProviders(false);
    }
  };

  const handleAssignProvider = async (providerId) => {
    setSelectedProviderId(providerId);
    setConfirmDialogOpen(true);
  };

  const confirmAssignProvider = async () => {
    if (!selectedBooking?._id || !selectedProviderId || assigning) return;
    setAssigning(true);
    try {
      const { data } = await axios.put(
        `${API_URL}/api/bookings/${selectedBooking._id}/assign-provider`,
        { providerId: selectedProviderId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Assignment response:', data);
      setAssignModalOpen(false);
      setConfirmDialogOpen(false);
      setMessage({ open: true, text: 'Provider assigned successfully', severity: 'success' });
      fetchBookings();
    } catch (error) {
      console.error('Error assigning provider:', error.response?.data || error.message);
      setMessage({
        open: true,
        text: `Failed to assign provider: ${error.response?.data?.message || error.message}`,
        severity: 'error',
      });
    } finally {
      setAssigning(false);
      setSelectedProviderId(null);
    }
  };

  const handleCloseConfirmDialog = () => {
    setConfirmDialogOpen(false);
    setSelectedProviderId(null);
  };

  const filteredBookings = useMemo(() => {
    const sortedBookings = [...bookings].sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt); // Newest first
    });
    console.log('Sorted bookings by createdAt:', sortedBookings.map(b => ({ id: b._id, createdAt: b.createdAt })));
    
    return sortedBookings
      .filter(booking => {
        if (filters.status === 'all') return true;
        return booking.status === filters.status;
      })
      .filter(booking => {
        const searchTerm = filters.search.toLowerCase();
        return (
          booking.customerDetails?.name.toLowerCase().includes(searchTerm) ||
          booking.service?.name.toLowerCase().includes(searchTerm)
        );
      })
      .filter(booking => {
        if (!filters.location) return true;
        return booking.location.toLowerCase().includes(filters.location.toLowerCase());
      })
      .filter(booking => {
        if (!filters.date) return true;
        const bookingDate = new Date(booking.scheduledTime).toISOString().split('T')[0];
        return bookingDate === filters.date;
      });
  }, [bookings, filters]);

  if (loading) return <CircularProgress sx={{ display: 'block', margin: 'auto', mt: 4 }} />;

  return (
    <Box sx={{ p: 3 }}>
      <Toolbar />
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/admin/dashboard')}
          sx={{ mr: 2 }}
        >
          Back to Dashboard
        </Button>
        <Typography variant="h4">Booking Management</Typography>
      </Box>
      
      <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          label="Search by Customer or Service"
          variant="outlined"
          value={filters.search}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          sx={{ flexGrow: 1, minWidth: '200px' }}
        />
        <TextField
          label="Filter by Location"
          variant="outlined"
          value={filters.location}
          onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
          sx={{ minWidth: '200px' }}
        />
        <TextField
          label="Filter by Date"
          type="date"
          value={filters.date}
          onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: '200px' }}
        />
        <Button
          variant="outlined"
          onClick={() => setFilters(prev => ({ ...prev, date: '' }))}
          sx={{ minWidth: '100px' }}
        >
          Clear Date
        </Button>
        <FormControl sx={{ minWidth: '200px' }}>
          <InputLabel>Filter by Status</InputLabel>
          <Select
            value={filters.status}
            label="Filter by Status"
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="assigned">Assigned</MenuItem>
            <MenuItem value="in-progress">In-Progress</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      <Grid container spacing={3} sx={{ maxWidth: '1200px', mx: 'auto', mb: 4 }}>
        {filteredBookings.length > 0 ? filteredBookings.map(booking => (
          <Grid item xs={12} sm={6} md={4} key={booking._id}>
            <AdminBookingCard booking={booking} onAssign={handleOpenAssignModal} />
          </Grid>
        )) : (
          <Grid item xs={12}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography>No bookings found that match your filters</Typography>
            </Paper>
          </Grid>
        )}
      </Grid>

      <Dialog open={assignModalOpen} onClose={() => setAssignModalOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Assign Provider for Booking #{selectedBooking?._id.slice(-6).toUpperCase()}</DialogTitle>
        <DialogContent>
          <Typography gutterBottom><strong>Service:</strong> {selectedBooking?.service?.name}</Typography>
          <Typography gutterBottom><strong>Customer:</strong> {selectedBooking?.customerDetails?.name}</Typography>
          <Typography gutterBottom><strong>Location:</strong> {selectedBooking?.location}</Typography>
          <Typography gutterBottom><strong>Time:</strong> {selectedBooking?.scheduledTime ? new Date(selectedBooking.scheduledTime).toLocaleString() : 'N/A'}</Typography>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6">Suitable Providers</Typography>
          {loadingProviders ? (
            <CircularProgress sx={{ display: 'block', mx: 'auto', my: 2 }} />
          ) : suitableProviders.length > 0 ? (
            <List>
              {suitableProviders.map(provider => (
                <ListItem
                  key={provider._id}
                  secondaryAction={
                    <Button
                      edge="end"
                      variant="contained"
                      disabled={assigning}
                      onClick={() => handleAssignProvider(provider._id)}
                    >
                      {assigning ? <CircularProgress size={24} /> : 'Assign'}
                    </Button>
                  }
                >
                  <ListItemIcon>
                    <Avatar src={provider.profile.image ? `${API_URL}${provider.profile.image}` : ''}>
                      {provider.name.charAt(0)}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={provider.name}
                    secondary={
                      <>
                        <Typography variant="body2">Skills: {provider.profile.skills?.join(', ') || 'None'}</Typography>
                        <Typography variant="body2">City: {provider.profile.location?.details?.city || 'Not Set'}</Typography>
                        <Typography variant="body2">Full Address: {provider.profile.location?.fullAddress || 'Not Set'}</Typography>
                        <Typography variant="body2">Availability: {provider.profile.availability || 'Not Set'}</Typography>
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography>No providers found for service ({selectedBooking?.service?.name}), location ({selectedBooking?.location}), or time ({selectedBooking?.scheduledTime ? new Date(selectedBooking.scheduledTime).toLocaleString() : 'N/A'}). Try adjusting the location or time.</Typography>
              <Button
                variant="outlined"
                sx={{ mt: 2 }}
                onClick={() => handleOpenAssignModal(selectedBooking)}
              >
                Retry
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignModalOpen(false)} disabled={assigning}>Cancel</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmDialogOpen} onClose={handleCloseConfirmDialog} fullWidth maxWidth="xs">
        <DialogTitle>Confirm Provider Assignment</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to assign this provider to booking #{selectedBooking?._id.slice(-6).toUpperCase()}?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmDialog} disabled={assigning}>Cancel</Button>
          <Button onClick={confirmAssignProvider} variant="contained" disabled={assigning}>
            {assigning ? <CircularProgress size={24} /> : 'Confirm'}
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
};

export default BookingManagement; */


























































/* import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import io from 'socket.io-client';
import {
  Box, Typography, Grid, Paper, CircularProgress, Snackbar, Alert, Tabs, Tab,
  Dialog, DialogActions, DialogContent, DialogTitle, Divider, Avatar, Card, CardContent, CardActions,
  List, ListItem, ListItemIcon, ListItemText, Button, Chip, Toolbar, IconButton, TextField,
  CardMedia, Select, MenuItem, FormControl, InputLabel, DialogContentText
} from '@mui/material';
import { 
    Menu, CalendarToday, AccessTime, LocationOn, Person, Phone, Payment, Paid, ArrowBack
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const socket = io(API_URL);

// A new, more detailed booking card for the admin view
const AdminBookingCard = ({ booking, onAssign }) => {
    return (
        <Card sx={{ display: 'flex', mb: 2, boxShadow: 2 }}>
            <CardMedia
                component="img"
                sx={{ width: 150, display: { xs: 'none', sm: 'block' } }}
                image={booking.service?.image ? `${API_URL}${booking.service.image}` : `https://via.placeholder.com/150?text=No+Image`}
                alt={booking.service?.name}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography component="div" variant="h6">
                            {booking.service?.name}
                        </Typography>
                        <Chip 
                            label={booking.status}
                            color={
                                booking.status === 'completed' ? 'success' :
                                booking.status === 'pending' ? 'warning' :
                                booking.status === 'assigned' ? 'primary' :
                                booking.status === 'in-progress' ? 'info' : 'error'
                            }
                            size="small"
                            sx={{ textTransform: 'capitalize' }}
                        />
                    </Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        ID: #{booking._id.slice(-6).toUpperCase()}
                    </Typography>
                    
                    <Grid container spacing={1} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}><Person sx={{ mr: 1, fontSize: '1rem' }} /> {booking.customerDetails?.name}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}><Phone sx={{ mr: 1, fontSize: '1rem' }} /> {booking.customerDetails?.phone}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}><CalendarToday sx={{ mr: 1, fontSize: '1rem' }} /> {new Date(booking.scheduledTime).toLocaleString()}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                           <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}><LocationOn sx={{ mr: 1, fontSize: '1rem' }} /> {booking.location}</Typography>
                        </Grid>
                         <Grid item xs={12} sm={6}>
                           <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}><Payment sx={{ mr: 1, fontSize: '1rem' }} /> {booking.paymentDetails?.method}</Typography>
                        </Grid>
                         <Grid item xs={12} sm={6}>
                           <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}><Paid sx={{ mr: 1, fontSize: '1rem' }} /> Payment: {booking.paymentDetails?.status}</Typography>
                        </Grid>
                    </Grid>
                </CardContent>
                <CardActions sx={{ alignSelf: 'flex-end', p: 2 }}>
                    {booking.status === 'pending' && (
                        <Button size="small" variant="contained" onClick={() => onAssign(booking)}>Assign Provider</Button>
                    )}
                </CardActions>
            </Box>
        </Card>
    );
};

const BookingManagement = () => {
  const { token, user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ open: false, text: '', severity: 'info' });
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [suitableProviders, setSuitableProviders] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    location: '',
    date: new Date().toISOString().split('T')[0], // Default to today's date
  });

  const fetchBookings = useCallback(async () => {
    if (!token || user?.role !== 'admin') {
      setMessage({ open: true, text: 'Unauthorized access', severity: 'error' });
      navigate('/login');
      return;
    }
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = await axios.get(`${API_URL}/api/bookings/all-bookings`, config);
      setBookings(Array.isArray(data) ? data : []);
    } catch (error) {
      setMessage({ 
        open: true, 
        text: `Failed to fetch bookings: ${error.response?.data?.message || error.message}`, 
        severity: 'error' 
      });
    } finally {
      setLoading(false);
    }
  }, [token, user, navigate]);

  useEffect(() => {
    fetchBookings();
    socket.emit('joinAdminRoom');
    const handleBookingUpdate = (data) => {
      if (data && data.message) {
        setMessage({ open: true, text: data.message, severity: 'info' });
      }
      fetchBookings();
    };
    socket.on('bookingStatusUpdate', handleBookingUpdate);
    return () => {
      socket.off('bookingStatusUpdate', handleBookingUpdate);
    };
  }, [fetchBookings]);

  const handleOpenAssignModal = async (booking) => {
    if (!booking?._id || !/^[0-9a-fA-F]{24}$/.test(booking._id)) {
      setMessage({ open: true, text: 'Invalid booking ID', severity: 'error' });
      console.error('Invalid booking ID:', booking._id);
      return;
    }
    console.log('Selected booking ID:', booking._id);
    setSelectedBooking(booking);
    setAssignModalOpen(true);
    setLoadingProviders(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/bookings/${booking._id}/find-providers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Fetched providers:', data);
      setSuitableProviders(Array.isArray(data) ? data : []);
      if (data.length === 0) {
        setMessage({
          open: true,
          text: `No providers match the service (${booking.service?.name}), location (${booking.location}), or time (${new Date(booking.scheduledTime).toLocaleString()})`,
          severity: 'warning',
        });
      }
    } catch (error) {
      console.error('Error fetching providers:', error.response?.data || error.message);
      setMessage({ 
        open: true, 
        text: `Failed to find providers: ${error.response?.data?.message || error.message}`, 
        severity: 'error' 
      });
    } finally {
      setLoadingProviders(false);
    }
  };

  const handleAssignProvider = async (providerId) => {
    setSelectedProviderId(providerId);
    setConfirmDialogOpen(true);
  };

  const confirmAssignProvider = async () => {
    if (!selectedBooking?._id || !selectedProviderId || assigning) return;
    setAssigning(true);
    try {
      const { data } = await axios.put(
        `${API_URL}/api/bookings/${selectedBooking._id}/assign-provider`,
        { providerId: selectedProviderId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Assignment response:', data);
      setAssignModalOpen(false);
      setConfirmDialogOpen(false);
      setMessage({ open: true, text: 'Provider assigned successfully', severity: 'success' });
      fetchBookings();
    } catch (error) {
      console.error('Error assigning provider:', error.response?.data || error.message);
      setMessage({
        open: true,
        text: `Failed to assign provider: ${error.response?.data?.message || error.message}`,
        severity: 'error',
      });
    } finally {
      setAssigning(false);
      setSelectedProviderId(null);
    }
  };

  const handleCloseConfirmDialog = () => {
    setConfirmDialogOpen(false);
    setSelectedProviderId(null);
  };

  const filteredBookings = useMemo(() => {
    const sortedBookings = [...bookings].sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt); // Newest first
    });
    console.log('Sorted bookings by createdAt:', sortedBookings.map(b => ({ id: b._id, createdAt: b.createdAt })));
    
    return sortedBookings
      .filter(booking => {
        if (filters.status === 'all') return true;
        return booking.status === filters.status;
      })
      .filter(booking => {
        const searchTerm = filters.search.toLowerCase();
        return (
          booking.customerDetails?.name.toLowerCase().includes(searchTerm) ||
          booking.service?.name.toLowerCase().includes(searchTerm)
        );
      })
      .filter(booking => {
        if (!filters.location) return true;
        return booking.location.toLowerCase().includes(filters.location.toLowerCase());
      })
      .filter(booking => {
        if (!filters.date) return true;
        const bookingDate = new Date(booking.scheduledTime).toISOString().split('T')[0];
        return bookingDate === filters.date;
      });
  }, [bookings, filters]);

  if (loading) return <CircularProgress sx={{ display: 'block', margin: 'auto', mt: 4 }} />;

  return (
    <Box sx={{ p: 3 }}>
      <Toolbar />
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/admin/dashboard')}
          sx={{ mr: 2 }}
        >
          Back to Dashboard
        </Button>
        <Typography variant="h4">Booking Management</Typography>
      </Box>
      
      <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          label="Search by Customer or Service"
          variant="outlined"
          value={filters.search}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          sx={{ flexGrow: 1, minWidth: '200px' }}
        />
        <TextField
          label="Filter by Location"
          variant="outlined"
          value={filters.location}
          onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
          sx={{ minWidth: '200px' }}
        />
        <TextField
          label="Filter by Date"
          type="date"
          value={filters.date}
          onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: '200px' }}
        />
        <Button
          variant="outlined"
          onClick={() => setFilters(prev => ({ ...prev, date: '' }))}
          sx={{ minWidth: '100px' }}
        >
          Clear Date
        </Button>
        <FormControl sx={{ minWidth: '200px' }}>
          <InputLabel>Filter by Status</InputLabel>
          <Select
            value={filters.status}
            label="Filter by Status"
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="assigned">Assigned</MenuItem>
            <MenuItem value="in-progress">In-Progress</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      <Grid container spacing={3} sx={{ maxWidth: '1200px', mx: 'auto', mb: 4 }}>
        {filteredBookings.length > 0 ? filteredBookings.map(booking => (
          <Grid item xs={12} sm={6} md={4} key={booking._id}>
            <AdminBookingCard booking={booking} onAssign={handleOpenAssignModal} />
          </Grid>
        )) : (
          <Grid item xs={12}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography>No bookings found that match your filters</Typography>
            </Paper>
          </Grid>
        )}
      </Grid>

      <Dialog open={assignModalOpen} onClose={() => setAssignModalOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Assign Provider for Booking #{selectedBooking?._id.slice(-6).toUpperCase()}</DialogTitle>
        <DialogContent>
          <Typography gutterBottom><strong>Service:</strong> {selectedBooking?.service?.name}</Typography>
          <Typography gutterBottom><strong>Customer:</strong> {selectedBooking?.customerDetails?.name}</Typography>
          <Typography gutterBottom><strong>Location:</strong> {selectedBooking?.location}</Typography>
          <Typography gutterBottom><strong>Time:</strong> {selectedBooking?.scheduledTime ? new Date(selectedBooking.scheduledTime).toLocaleString() : 'N/A'}</Typography>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6">Suitable Providers</Typography>
          {loadingProviders ? (
            <CircularProgress sx={{ display: 'block', mx: 'auto', my: 2 }} />
          ) : suitableProviders.length > 0 ? (
            <List>
              {suitableProviders.map(provider => (
                <ListItem
                  key={provider._id}
                  secondaryAction={
                    <Button
                      edge="end"
                      variant="contained"
                      disabled={assigning}
                      onClick={() => handleAssignProvider(provider._id)}
                    >
                      {assigning ? <CircularProgress size={24} /> : 'Assign'}
                    </Button>
                  }
                >
                  <ListItemIcon>
                    <Avatar src={provider.profile.image ? `${API_URL}${provider.profile.image}` : ''}>
                      {provider.name.charAt(0)}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={provider.name}
                    secondary={
                      <>
                        <Typography variant="body2">Skills: {provider.profile.skills?.join(', ') || 'None'}</Typography>
                        <Typography variant="body2">Location: {provider.profile.location?.fullAddress || 'Not Set'}</Typography>
                        <Typography variant="body2">Availability: {provider.profile.availability || 'Not Set'}</Typography>
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography>No providers match the service ({selectedBooking?.service?.name}), location ({selectedBooking?.location}), or time ({selectedBooking?.scheduledTime ? new Date(selectedBooking.scheduledTime).toLocaleString() : 'N/A'})</Typography>
              <Button
                variant="outlined"
                sx={{ mt: 2 }}
                onClick={() => handleOpenAssignModal(selectedBooking)}
              >
                Retry
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignModalOpen(false)} disabled={assigning}>Cancel</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmDialogOpen} onClose={handleCloseConfirmDialog} fullWidth maxWidth="xs">
        <DialogTitle>Confirm Provider Assignment</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to assign this provider to booking #{selectedBooking?._id.slice(-6).toUpperCase()}?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmDialog} disabled={assigning}>Cancel</Button>
          <Button onClick={confirmAssignProvider} variant="contained" disabled={assigning}>
            {assigning ? <CircularProgress size={24} /> : 'Confirm'}
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
};

export default BookingManagement; */








































/* import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import io from 'socket.io-client';
import {
  Box, Typography, Grid, Paper, CircularProgress, Snackbar, Alert, Tabs, Tab,
  Dialog, DialogActions, DialogContent, DialogTitle, Divider, Avatar, Card, CardContent, CardActions,
  List, ListItem, ListItemIcon, ListItemText, Button, Chip, Toolbar, IconButton, TextField,
  CardMedia, Select, MenuItem, FormControl, InputLabel, DialogContentText
} from '@mui/material';
import { 
    Menu, CalendarToday, AccessTime, LocationOn, Person, Phone, Payment, Paid
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const socket = io(API_URL);

// A new, more detailed booking card for the admin view
const AdminBookingCard = ({ booking, onAssign }) => {
    return (
        <Card sx={{ display: 'flex', mb: 2, boxShadow: 2 }}>
            <CardMedia
                component="img"
                sx={{ width: 150, display: { xs: 'none', sm: 'block' } }}
                image={booking.service?.image ? `${API_URL}${booking.service.image}` : `https://via.placeholder.com/150?text=No+Image`}
                alt={booking.service?.name}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography component="div" variant="h6">
                            {booking.service?.name}
                        </Typography>
                        <Chip 
                            label={booking.status}
                            color={
                                booking.status === 'completed' ? 'success' :
                                booking.status === 'pending' ? 'warning' :
                                booking.status === 'assigned' ? 'primary' :
                                booking.status === 'in-progress' ? 'info' : 'error'
                            }
                            size="small"
                            sx={{ textTransform: 'capitalize' }}
                        />
                    </Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        ID: #{booking._id.slice(-6).toUpperCase()}
                    </Typography>
                    
                    <Grid container spacing={1} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}><Person sx={{ mr: 1, fontSize: '1rem' }} /> {booking.customerDetails?.name}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}><Phone sx={{ mr: 1, fontSize: '1rem' }} /> {booking.customerDetails?.phone}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}><CalendarToday sx={{ mr: 1, fontSize: '1rem' }} /> {new Date(booking.scheduledTime).toLocaleString()}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                           <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}><LocationOn sx={{ mr: 1, fontSize: '1rem' }} /> {booking.location}</Typography>
                        </Grid>
                         <Grid item xs={12} sm={6}>
                           <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}><Payment sx={{ mr: 1, fontSize: '1rem' }} /> {booking.paymentDetails?.method}</Typography>
                        </Grid>
                         <Grid item xs={12} sm={6}>
                           <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}><Paid sx={{ mr: 1, fontSize: '1rem' }} /> Payment: {booking.paymentDetails?.status}</Typography>
                        </Grid>
                    </Grid>
                </CardContent>
                <CardActions sx={{ alignSelf: 'flex-end', p: 2 }}>
                    {booking.status === 'pending' && (
                        <Button size="small" variant="contained" onClick={() => onAssign(booking)}>Assign Provider</Button>
                    )}
                </CardActions>
            </Box>
        </Card>
    );
};

const BookingManagement = () => {
  const { token, user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ open: false, text: '', severity: 'info' });
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [suitableProviders, setSuitableProviders] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState(null);
  const [filters, setFilters] = useState({ status: 'all', search: '', location: '' });

  const fetchBookings = useCallback(async () => {
    if (!token || user?.role !== 'admin') {
      setMessage({ open: true, text: 'Unauthorized access', severity: 'error' });
      navigate('/login');
      return;
    }
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = await axios.get(`${API_URL}/api/bookings/all-bookings`, config);
      setBookings(Array.isArray(data) ? data : []);
    } catch (error) {
      setMessage({ 
        open: true, 
        text: `Failed to fetch bookings: ${error.response?.data?.message || error.message}`, 
        severity: 'error' 
      });
    } finally {
      setLoading(false);
    }
  }, [token, user, navigate]);

  useEffect(() => {
    fetchBookings();
    socket.emit('joinAdminRoom');
    const handleBookingUpdate = (data) => {
      if (data && data.message) {
        setMessage({ open: true, text: data.message, severity: 'info' });
      }
      fetchBookings();
    };
    socket.on('bookingStatusUpdate', handleBookingUpdate);
    return () => {
      socket.off('bookingStatusUpdate', handleBookingUpdate);
    };
  }, [fetchBookings]);

  const handleOpenAssignModal = async (booking) => {
    if (!booking?._id || !/^[0-9a-fA-F]{24}$/.test(booking._id)) {
      setMessage({ open: true, text: 'Invalid booking ID', severity: 'error' });
      console.error('Invalid booking ID:', booking._id);
      return;
    }
    console.log('Selected booking ID:', booking._id);
    setSelectedBooking(booking);
    setAssignModalOpen(true);
    setLoadingProviders(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/bookings/${booking._id}/find-providers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Fetched providers:', data);
      setSuitableProviders(Array.isArray(data) ? data : []);
      if (data.length === 0) {
        setMessage({
          open: true,
          text: `No providers match the service (${booking.service?.name}), location (${booking.location}), or time (${new Date(booking.scheduledTime).toLocaleString()})`,
          severity: 'warning',
        });
      }
    } catch (error) {
      console.error('Error fetching providers:', error.response?.data || error.message);
      setMessage({ 
        open: true, 
        text: `Failed to find providers: ${error.response?.data?.message || error.message}`, 
        severity: 'error' 
      });
    } finally {
      setLoadingProviders(false);
    }
  };

  const handleAssignProvider = async (providerId) => {
    setSelectedProviderId(providerId);
    setConfirmDialogOpen(true);
  };

  const confirmAssignProvider = async () => {
    if (!selectedBooking?._id || !selectedProviderId || assigning) return;
    setAssigning(true);
    try {
      const { data } = await axios.put(
        `${API_URL}/api/bookings/${selectedBooking._id}/assign-provider`,
        { providerId: selectedProviderId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Assignment response:', data);
      setAssignModalOpen(false);
      setConfirmDialogOpen(false);
      setMessage({ open: true, text: 'Provider assigned successfully', severity: 'success' });
      fetchBookings();
    } catch (error) {
      console.error('Error assigning provider:', error.response?.data || error.message);
      setMessage({
        open: true,
        text: `Failed to assign provider: ${error.response?.data?.message || error.message}`,
        severity: 'error',
      });
    } finally {
      setAssigning(false);
      setSelectedProviderId(null);
    }
  };

  const handleCloseConfirmDialog = () => {
    setConfirmDialogOpen(false);
    setSelectedProviderId(null);
  };

  const filteredBookings = useMemo(() => {
    return bookings
      .filter(booking => {
        if (filters.status === 'all') return true;
        return booking.status === filters.status;
      })
      .filter(booking => {
        const searchTerm = filters.search.toLowerCase();
        return (
          booking.customerDetails?.name.toLowerCase().includes(searchTerm) ||
          booking.service?.name.toLowerCase().includes(searchTerm)
        );
      })
      .filter(booking => {
        if (!filters.location) return true;
        return booking.location.toLowerCase().includes(filters.location.toLowerCase());
      });
  }, [bookings, filters]);

  if (loading) return <CircularProgress sx={{ display: 'block', margin: 'auto', mt: 4 }} />;

  return (
    <Box sx={{ p: 3 }}>
      <Toolbar />
      <Typography variant="h4" gutterBottom>Booking Management</Typography>
      
      <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          label="Search by Customer or Service"
          variant="outlined"
          value={filters.search}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          sx={{ flexGrow: 1, minWidth: '300px' }}
        />
        <TextField
          label="Filter by Location"
          variant="outlined"
          value={filters.location}
          onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
          sx={{ minWidth: '200px' }}
        />
        <FormControl sx={{ minWidth: '200px' }}>
          <InputLabel>Filter by Status</InputLabel>
          <Select
            value={filters.status}
            label="Filter by Status"
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="assigned">Assigned</MenuItem>
            <MenuItem value="in-progress">In-Progress</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      <Grid container spacing={2}>
        {filteredBookings.length > 0 ? filteredBookings.map(booking => (
          <Grid item xs={12} key={booking._id}>
            <AdminBookingCard booking={booking} onAssign={handleOpenAssignModal} />
          </Grid>
        )) : (
          <Grid item xs={12}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography>No bookings found that match your filters</Typography>
            </Paper>
          </Grid>
        )}
      </Grid>

      <Dialog open={assignModalOpen} onClose={() => setAssignModalOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Assign Provider for Booking #{selectedBooking?._id.slice(-6).toUpperCase()}</DialogTitle>
        <DialogContent>
          <Typography gutterBottom><strong>Service:</strong> {selectedBooking?.service?.name}</Typography>
          <Typography gutterBottom><strong>Customer:</strong> {selectedBooking?.customerDetails?.name}</Typography>
          <Typography gutterBottom><strong>Location:</strong> {selectedBooking?.location}</Typography>
          <Typography gutterBottom><strong>Time:</strong> {selectedBooking?.scheduledTime ? new Date(selectedBooking.scheduledTime).toLocaleString() : 'N/A'}</Typography>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6">Suitable Providers</Typography>
          {loadingProviders ? (
            <CircularProgress sx={{ display: 'block', mx: 'auto', my: 2 }} />
          ) : suitableProviders.length > 0 ? (
            <List>
              {suitableProviders.map(provider => (
                <ListItem
                  key={provider._id}
                  secondaryAction={
                    <Button
                      edge="end"
                      variant="contained"
                      disabled={assigning}
                      onClick={() => handleAssignProvider(provider._id)}
                    >
                      {assigning ? <CircularProgress size={24} /> : 'Assign'}
                    </Button>
                  }
                >
                  <ListItemIcon>
                    <Avatar src={provider.profile.image ? `${API_URL}${provider.profile.image}` : ''}>
                      {provider.name.charAt(0)}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={provider.name}
                    secondary={
                      <>
                        <Typography variant="body2">Skills: {provider.profile.skills?.join(', ') || 'None'}</Typography>
                        <Typography variant="body2">Location: {provider.profile.location?.fullAddress || 'Not Set'}</Typography>
                        <Typography variant="body2">Availability: {provider.profile.availability || 'Not Set'}</Typography>
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography>No providers match the service ({selectedBooking?.service?.name}), location ({selectedBooking?.location}), or time ({selectedBooking?.scheduledTime ? new Date(selectedBooking.scheduledTime).toLocaleString() : 'N/A'})</Typography>
              <Button
                variant="outlined"
                sx={{ mt: 2 }}
                onClick={() => handleOpenAssignModal(selectedBooking)}
              >
                Retry
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignModalOpen(false)} disabled={assigning}>Cancel</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmDialogOpen} onClose={handleCloseConfirmDialog} fullWidth maxWidth="xs">
        <DialogTitle>Confirm Provider Assignment</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to assign this provider to booking #{selectedBooking?._id.slice(-6).toUpperCase()}?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmDialog} disabled={assigning}>Cancel</Button>
          <Button onClick={confirmAssignProvider} variant="contained" disabled={assigning}>
            {assigning ? <CircularProgress size={24} /> : 'Confirm'}
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
};

export default BookingManagement; */
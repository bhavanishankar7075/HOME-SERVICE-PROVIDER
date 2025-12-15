import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import io from 'socket.io-client';
import {
  Box, Typography, Grid, Paper, CircularProgress, Snackbar, Alert,
  Dialog, DialogActions, DialogContent, DialogTitle, Divider, Avatar,
  List, ListItem, ListItemIcon, ListItemText, Button, Chip, Toolbar, TextField,
  CardMedia, Select, MenuItem, FormControl, InputLabel, DialogContentText
} from '@mui/material';
import { 
    ArrowBack,
    LocationOn 
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import AdminLoadingScreen from '../Components/AdminLoadingScreen';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const socket = io(API_URL);

// FINAL Card Component: All cards are now guaranteed to be the exact same size.
const AdminBookingCard = ({ booking, onAssign, onViewDetails }) => {
    return (
        <Paper 
            elevation={3} 
            sx={{ 
                height: '210px',
                p: 2.5,
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxSizing: 'border-box', // Ensures padding and border are included in the height
                border: '2px solid red', // <-- TEMPORARY BORDER FOR DEBUGGING. RETAINED AS REQUESTED.
            }}
        >
            {/* Top section with info */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, overflow: 'hidden', flexGrow: 1 }}>
                <CardMedia
                    component="img"
                    sx={{ 
                        width: 130,
                        height: '100%',
                        maxHeight: '130px',
                        borderRadius: '12px',
                        objectFit: 'cover',
                        flexShrink: 0 
                    }}
                    image={booking.service?.image || `https://via.placeholder.com/130x130?text=No+Image`}
                    alt={booking.service?.name}
                />
                <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
                    {/* DEFINITIVE FIX #1: Service Title is now forced to a single line and truncated. */}
                    <Typography 
                        variant="h5" 
                        component="div" 
                        title={booking.service?.name} 
                        sx={{ 
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}
                    >
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
                        sx={{ textTransform: 'capitalize', my: 1, alignSelf: 'flex-start' }}
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        ID: #{booking._id.slice(-6).toUpperCase()}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', mt: 0.5, overflow: 'hidden', flex: 1 }}>
                       <LocationOn sx={{ fontSize: '1.1rem', mr: 1, flexShrink: 0 }} />
                       {/* DEFINITIVE FIX #2: Address is forced to a single line and truncated. */}
                       <Typography 
                           variant="body2" 
                           title={booking.location} 
                           sx={{ 
                               flex: 1,
                               whiteSpace: 'nowrap',
                               overflow: 'hidden',
                               textOverflow: 'ellipsis'
                           }}
                        > 
                           {booking.location}
                       </Typography>
                    </Box>
                </Box>
            </Box>

            {/* Bottom section with action buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, width: '100%', pt: 1.5, borderTop: '1px solid #eee' }}>
                <Button variant="outlined" size="small" onClick={() => onViewDetails(booking)}>
                    View Details
                </Button>
                <Button 
                    variant="contained" 
                    size="small" 
                    onClick={() => onAssign(booking)}
                    disabled={booking.status !== 'pending'}
                >
                    Assign Provider
                </Button>
            </Box>
        </Paper>
    );
};


const BookingManagement = () => {
  const { token, user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ open: false, text: '', severity: 'info' });
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [suitableProviders, setSuitableProviders] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all', search: '', location: '', date: '', 
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
      setMessage({ open: true, text: `Failed to fetch bookings: ${error.response?.data?.message || error.message}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [token, user, navigate]);

  useEffect(() => {
    fetchBookings();
    socket.emit('joinAdminRoom');
    const handleBookingUpdate = () => fetchBookings();
    socket.on('bookingUpdated', handleBookingUpdate);
    return () => socket.off('bookingUpdated', handleBookingUpdate);
  }, [fetchBookings]);

  const handleOpenDetailsModal = (booking) => {
    setSelectedBooking(booking);
    setDetailsModalOpen(true);
  };

  const handleOpenAssignModal = (booking) => {
    if (!booking?._id || !/^[0-9a-fA-F]{24}$/.test(booking._id)) {
      setMessage({ open: true, text: 'Invalid booking ID', severity: 'error' });
      return;
    }
    setSelectedBooking(booking);
    setAssignModalOpen(true);
    setLoadingProviders(true);
    setSuitableProviders([]);
    
    axios.get(`${API_URL}/api/admin/providers/active`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { location: booking.location, services: booking.service?.category }
    }).then(response => {
        const providers = Array.isArray(response.data) ? response.data : [];
        setSuitableProviders(providers);
        if (providers.length === 0) {
          setMessage({ open: true, text: `No suitable providers found.`, severity: 'warning' });
        }
    }).catch(error => {
        const errorMessage = error.response?.data?.message || error.message;
        setMessage({ open: true, text: `Failed to find providers: ${errorMessage}`, severity: 'error' });
    }).finally(() => {
        setLoadingProviders(false);
    });
  };

  const handleAssignProvider = (providerId) => {
    setSelectedProviderId(providerId);
    setConfirmDialogOpen(true);
  };

  const confirmAssignProvider = async () => {
    if (!selectedBooking?._id || !selectedProviderId || assigning) return;
    setAssigning(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${API_URL}/api/admin/bookings/${selectedBooking._id}/assign-provider`, { providerId: selectedProviderId }, config);
      setAssignModalOpen(false);
      setConfirmDialogOpen(false);
      setMessage({ open: true, text: 'Provider assigned successfully', severity: 'success' });
      fetchBookings();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to assign provider';
      setMessage({ open: true, text: errorMessage, severity: 'error' });
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
    const sortedBookings = [...bookings].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return sortedBookings
      .filter(booking => filters.status === 'all' || booking.status === filters.status)
      .filter(booking => {
        const searchTerm = filters.search.toLowerCase();
        return (booking.customerDetails?.name.toLowerCase().includes(searchTerm) || booking.service?.name.toLowerCase().includes(searchTerm));
      })
      .filter(booking => !filters.location || booking.location.toLowerCase().includes(filters.location.toLowerCase()))
      .filter(booking => {
        if (!filters.date) return true;
        const bookingDate = new Date(booking.scheduledTime).toISOString().split('T')[0];
        return bookingDate === filters.date;
      });
  }, [bookings, filters]);

  if (loading) {
    return <AdminLoadingScreen message="Loading Bookings..." />;
  }

  return (
    <Box sx={{ p: 3, backgroundColor: '#f4f6f8', minHeight: '100vh' }}>
      <Toolbar />
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/admin/dashboard')} sx={{ mr: 2 }}>
          Back to Dashboard
        </Button>
        <Typography variant="h4" sx={{ fontWeight: 'bold' ,display:'flex',justifyContent:'center',alignItems:'center',pl:50}}>Booking Management</Typography>
      </Box>
      
      <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', borderRadius: '12px' }}>
        <TextField label="Search by Customer or Service" variant="outlined" value={filters.search} onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))} sx={{ flexGrow: 1, minWidth: '200px' }} />
        <TextField label="Filter by Location" variant="outlined" value={filters.location} onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))} sx={{ minWidth: '200px' }} />
        <TextField label="Filter by Date" type="date" value={filters.date} onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))} InputLabelProps={{ shrink: true }} sx={{ minWidth: '200px' }} />
        <Button variant="outlined" onClick={() => setFilters(prev => ({ ...prev, date: '' }))} sx={{ minWidth: '100px' }}>
          Clear Date
        </Button>
        <FormControl sx={{ minWidth: '200px' }}>
          <InputLabel>Filter by Status</InputLabel>
          <Select value={filters.status} label="Filter by Status" onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}>
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="assigned">Assigned</MenuItem>
            <MenuItem value="in-progress">In-Progress</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>
      </Paper>
      
      <Grid container spacing={3}>
        {filteredBookings.length > 0 ? filteredBookings.map(booking => (
          <Grid item xs={12} md={6} key={booking._id}>
            <AdminBookingCard 
              booking={booking} 
              onAssign={handleOpenAssignModal} 
              onViewDetails={handleOpenDetailsModal} 
            />
          </Grid>
        )) : (
          <Grid item xs={12}>
            <Paper sx={{ p: 3, textAlign: 'center', borderRadius: '12px' }}>
              <Typography>No bookings found that match your filters</Typography>
            </Paper>
          </Grid>
        )}
      </Grid>
      
      {/* Dialog for Viewing Booking Details */}
      <Dialog open={detailsModalOpen} onClose={() => setDetailsModalOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Booking Details</DialogTitle>
        <DialogContent dividers>
            {selectedBooking && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography variant="h6" gutterBottom>{selectedBooking.service?.name}</Typography>
                    <Divider />
                    <Typography><strong>ID:</strong> #{selectedBooking._id.slice(-6).toUpperCase()}</Typography>
                    <Typography><strong>Status:</strong> <Chip label={selectedBooking.status} size="small" sx={{textTransform: 'capitalize'}}/></Typography>
                    <Divider />
                    <Typography><strong>Customer:</strong> {selectedBooking.customerDetails?.name}</Typography>
                    <Typography><strong>Phone:</strong> {selectedBooking.customerDetails?.phone}</Typography>
                    <Typography><strong>Scheduled:</strong> {new Date(selectedBooking.scheduledTime).toLocaleString()}</Typography>
                    <Typography><strong>Location:</strong> {selectedBooking.location}</Typography>
                    <Divider />
                    <Typography><strong>Payment Method:</strong> {selectedBooking.paymentDetails?.method}</Typography>
                    <Typography><strong>Payment Status:</strong> {selectedBooking.paymentDetails?.status}</Typography>
                </Box>
            )}
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setDetailsModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>


      {/* Dialog for Assigning Provider */}
      <Dialog open={assignModalOpen} onClose={() => setAssignModalOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Assign Provider for Booking #{selectedBooking?._id?.slice(-6).toUpperCase()}</DialogTitle>
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
                <ListItem key={provider._id} secondaryAction={
                    <Button edge="end" variant="contained" disabled={assigning || !provider.isEligible} onClick={() => handleAssignProvider(provider._id)}>
                      {assigning && selectedProviderId === provider._id ? <CircularProgress size={24} /> : 'Assign'}
                    </Button>
                }>
                  <ListItemIcon><Avatar src={provider.profile.image || ''}>{provider.name.charAt(0)}</Avatar></ListItemIcon>
                  <ListItemText
                    primary={provider.name}
                    secondary={
                      <>
                        <Typography variant="body2">Skills: {provider.profile.skills?.join(', ') || 'None'}</Typography>
                        <Typography variant="body2">City: {provider.profile.location?.details?.city || 'Not Set'}</Typography>
                        <Typography variant="body2">Availability: {provider.profile.availability || 'Not Set'}</Typography>
                        <Typography variant="body2">
                          Subscription: {provider.subscriptionTier ? provider.subscriptionTier.charAt(0).toUpperCase() + provider.subscriptionTier.slice(1) : 'Basic'}
                          <Chip
                            label={provider.subscriptionStatus || 'Inactive'}
                            color={provider.subscriptionStatus === 'active' ? 'success' : provider.subscriptionStatus === 'past_due' ? 'error' : 'default'}
                            size="small"
                            sx={{ ml: 1 }}
                          />
                        </Typography>
                        <Typography variant="body2">Bookings: {provider.currentBookingCount || 0} / {provider.bookingLimit === 0 ? 'Unlimited' : provider.bookingLimit}</Typography>
                        {!provider.isEligible && (
                          <Typography variant="body2" color="error">
                            Ineligible: {provider.eligibilityReason || 'Unknown reason'}
                          </Typography>
                        )}
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography sx={{ mt: 2, textAlign: 'center' }}>No providers found for the selected criteria.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignModalOpen(false)} disabled={assigning}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onClose={handleCloseConfirmDialog} fullWidth maxWidth="xs">
        <DialogTitle>Confirm Assignment</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you want to assign this provider?</DialogContentText>
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
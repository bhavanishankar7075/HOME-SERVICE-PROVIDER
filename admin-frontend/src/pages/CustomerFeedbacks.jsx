import React, { useEffect, useState, useCallback } from 'react';
import { 
  Box, Typography, Table, TableBody, TableCell, TableHead, TableRow, Button, TextField, Grid, 
  CircularProgress, Snackbar, Alert, Select, MenuItem, FormControl, InputLabel, IconButton, 
  TableContainer, Pagination, Rating 
} from '@mui/material';
import { Sort as SortIcon, FileDownload as FileDownloadIcon } from '@mui/icons-material';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import '../styles/CustomerFeedback.css';

const API_URL = 'http://localhost:5000';

const CustomerFeedbacks = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [newFeedback, setNewFeedback] = useState({ bookingId: '', rating: '', comment: '' });
  const [editingFeedback, setEditingFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ open: false, text: '', severity: 'success' });
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const { token } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);

  const fetchFeedbacks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/feedback`, {
        headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` },
      });
      const feedbacksData = response.data;
      // Debug logging for each feedback
      feedbacksData.forEach(feedback => {
        const customerImageUrl = feedback.bookingId?.customer?.profile?.image 
          ? `${API_URL}${encodeURI(feedback.bookingId.customer.profile.image)}` 
          : null;
        console.log('Feedback Debug:', {
          feedbackId: feedback._id,
          bookingId: feedback.bookingId?._id,
          customerId: feedback.bookingId?.customer?._id,
          customerExists: !!feedback.bookingId?.customer,
          profileExists: !!feedback.bookingId?.customer?.profile,
          profileRaw: feedback.bookingId?.customer?.profile,
          imagePath: feedback.bookingId?.customer?.profile?.image,
          customerImageUrl
        });
      });
      setFeedbacks(feedbacksData);
    } catch (error) {
      console.error('Error fetching feedbacks:', error.message);
      setMessage({ open: true, text: error.response?.data?.message || 'Failed to fetch feedbacks.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchFeedbacks();

    const socketInstance = io(API_URL, {
      withCredentials: true,
      extraHeaders: { Authorization: `Bearer ${token || localStorage.getItem('token')}` },
    });
    setSocket(socketInstance);

    socketInstance.on('connect_error', () => {
      setMessage({ open: true, text: 'Real-time updates unavailable. Refreshing data...', severity: 'warning' });
      fetchFeedbacks();
    });

    socketInstance.on('feedbacksUpdated', async () => {
      await fetchFeedbacks();
      setMessage({ open: true, text: 'Feedback list updated in real-time!', severity: 'info' });
    });

    return () => {
      socketInstance.disconnect();
      setSocket(null);
    };
  }, [token, navigate, fetchFeedbacks]);

  const validateFeedback = (feedback) => {
    if (!feedback.bookingId) return 'Booking ID is required';
    if (!feedback.rating || isNaN(feedback.rating) || feedback.rating < 1 || feedback.rating > 5) {
      return 'Rating must be a number between 1 and 5';
    }
    return null;
  };

  const handleAddFeedback = async () => {
    const error = validateFeedback(newFeedback);
    if (error) {
      setMessage({ open: true, text: error, severity: 'error' });
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/feedback`, newFeedback, {
        headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` },
      });
      setNewFeedback({ bookingId: '', rating: '', comment: '' });
      setMessage({ open: true, text: 'Feedback added successfully!', severity: 'success' });
      await fetchFeedbacks();
    } catch (error) {
      console.error('Error adding feedback:', error.response?.data || error.message);
      setMessage({ open: true, text: error.response?.data?.message || 'Failed to add feedback.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditFeedback = async (id) => {
    const error = validateFeedback(editingFeedback);
    if (error) {
      setMessage({ open: true, text: error, severity: 'error' });
      return;
    }

    setLoading(true);
    try {
      await axios.put(`${API_URL}/api/feedback/${id}`, editingFeedback, {
        headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` },
      });
      setEditingFeedback(null);
      setMessage({ open: true, text: 'Feedback updated successfully!', severity: 'success' });
      await fetchFeedbacks();
    } catch (error) {
      console.error('Error editing feedback:', error.response?.data || error.message);
      setMessage({ open: true, text: error.response?.data?.message || 'Failed to update feedback.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFeedback = async (id) => {
    setLoading(true);
    try {
      await axios.delete(`${API_URL}/api/feedback/${id}`, {
        headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` },
      });
      setFeedbacks(feedbacks.filter((f) => f._id !== id));
      setMessage({ open: true, text: 'Feedback deleted successfully!', severity: 'success' });
    } catch (error) {
      console.error('Error deleting feedback:', error.response?.data || error.message);
      setMessage({ open: true, text: error.response?.data?.message || 'Failed to delete feedback.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Booking ID', 'Customer', 'Customer Image', 'Provider', 'Service', 'Rating', 'Comment', 'Submitted At'];
    const rows = filteredFeedbacks.map(f => [
      f.bookingId?._id || 'N/A',
      f.bookingId?.customer?.name || f.userId?.name || 'N/A',
      f.bookingId?.customer?.profile?.image ? `${API_URL}${encodeURI(f.bookingId.customer.profile.image)}` : 'N/A',
      f.bookingId?.provider?.name || 'N/A',
      f.bookingId?.service?.name || 'N/A',
      f.rating,
      `"${f.comment.replace(/"/g, '""')}"`,
      new Date(f.createdAt).toLocaleString(),
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `feedbacks_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSortToggle = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  const filteredFeedbacks = feedbacks
    .filter(f => 
      (ratingFilter === 'all' || f.rating === Number(ratingFilter)) &&
      (f.comment.toLowerCase().includes(search.toLowerCase()) ||
       f.bookingId?.service?.name.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

  const paginatedFeedbacks = filteredFeedbacks.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const totalPages = Math.ceil(filteredFeedbacks.length / rowsPerPage);

  return (
    <Box className="feedbacks-container" sx={{ p: { xs: 2, sm: 3, md: 4 }, maxWidth: '1400px', mx: 'auto', bgcolor: '#f4f6f8' }}>
      <Typography variant="h4" className="feedbacks-title" sx={{ mb: 3, fontWeight: 'bold', color: '#1a3c34', textAlign: 'center' }}>
        Admin Feedback Management
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 3, alignItems: 'center' }}>
        <Button
          variant="contained"
          onClick={() => navigate('/admin/dashboard')}
          className="feedbacks-back"
          sx={{ bgcolor: '#4a90e2', '&:hover': { bgcolor: '#357abd' } }}
        >
          Back to Dashboard
        </Button>
        <Button
          variant="contained"
          onClick={handleExportCSV}
          startIcon={<FileDownloadIcon />}
          sx={{ bgcolor: '#28a745', '&:hover': { bgcolor: '#218838' } }}
        >
          Export as CSV
        </Button>
      </Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Search by Comment or Service"
            variant="outlined"
            fullWidth
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <FormControl fullWidth>
            <InputLabel>Filter by Rating</InputLabel>
            <Select
              value={ratingFilter}
              onChange={(e) => { setRatingFilter(e.target.value); setPage(1); }}
              label="Filter by Rating"
            >
              <MenuItem value="all">All Ratings</MenuItem>
              {[1, 2, 3, 4, 5].map(r => (
                <MenuItem key={r} value={r}>{r} Star{r !== 1 ? 's' : ''}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Button
            variant="outlined"
            startIcon={<SortIcon />}
            onClick={handleSortToggle}
            sx={{ height: '56px', width: '100%' }}
          >
            Sort by Date ({sortOrder === 'desc' ? 'Newest First' : 'Oldest First'})
          </Button>
        </Grid>
      </Grid>
      <Box className="feedbacks-add" sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Add New Feedback</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Booking ID"
              value={newFeedback.bookingId}
              onChange={(e) => setNewFeedback({ ...newFeedback, bookingId: e.target.value })}
              variant="outlined"
              fullWidth
              margin="normal"
              required
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Rating (1-5)"
              type="number"
              value={newFeedback.rating}
              onChange={(e) => setNewFeedback({ ...newFeedback, rating: e.target.value })}
              variant="outlined"
              fullWidth
              margin="normal"
              required
              inputProps={{ min: 1, max: 5 }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Comment"
              value={newFeedback.comment}
              onChange={(e) => setNewFeedback({ ...newFeedback, comment: e.target.value })}
              variant="outlined"
              fullWidth
              margin="normal"
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              onClick={handleAddFeedback}
              className="feedbacks-add-button"
              disabled={loading}
              sx={{ bgcolor: '#4a90e2', '&:hover': { bgcolor: '#357abd' } }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Add Feedback'}
            </Button>
          </Grid>
        </Grid>
      </Box>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer sx={{ maxWidth: '100%', overflowX: 'auto', mb: 3 }}>
          <Table className="feedbacks-table">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', minWidth: 120 }}>Booking</TableCell>
                <TableCell sx={{ fontWeight: 'bold', minWidth: 100 }}>Customer Image</TableCell>
                <TableCell sx={{ fontWeight: 'bold', minWidth: 150 }}>Customer</TableCell>
                <TableCell sx={{ fontWeight: 'bold', minWidth: 150 }}>Provider</TableCell>
                <TableCell sx={{ fontWeight: 'bold', minWidth: 150 }}>Service</TableCell>
                <TableCell sx={{ fontWeight: 'bold', minWidth: 120 }}>Rating</TableCell>
                <TableCell sx={{ fontWeight: 'bold', minWidth: 200 }}>Comment</TableCell>
                <TableCell sx={{ fontWeight: 'bold', minWidth: 150 }}>Submitted At</TableCell>
                <TableCell sx={{ fontWeight: 'bold', minWidth: 200 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedFeedbacks.map((feedback) => {
                const customerImageUrl = feedback.bookingId?.customer?.profile?.image 
                  ? `${API_URL}${encodeURI(feedback.bookingId.customer.profile.image)}` 
                  : 'https://via.placeholder.com/40?text=U';
                return (
                  <TableRow key={feedback._id}>
                    <TableCell>{feedback.bookingId?._id?.slice(-6).toUpperCase() || 'N/A'}</TableCell>
                    <TableCell>
                      <img
                        src={customerImageUrl}
                        alt="Customer"
                        style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
                        onError={(e) => {
                          console.error('Failed to load customer image:', customerImageUrl);
                          e.target.src = 'https://via.placeholder.com/40?text=U';
                        }}
                      />
                    </TableCell>
                    <TableCell>{feedback.bookingId?.customer?.name || feedback.userId?.name || 'N/A'}</TableCell>
                    <TableCell>{feedback.bookingId?.provider?.name || 'N/A'}</TableCell>
                    <TableCell>{feedback.bookingId?.service?.name || 'N/A'}</TableCell>
                    <TableCell>
                      <Rating value={Number(feedback.rating)} readOnly size="small" />
                    </TableCell>
                    <TableCell>{feedback.comment || 'N/A'}</TableCell>
                    <TableCell>{new Date(feedback.createdAt).toLocaleString()}</TableCell>
                    <TableCell>
                      {editingFeedback?._id === feedback._id ? (
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <TextField
                            label="Rating (1-5)"
                            type="number"
                            value={editingFeedback.rating}
                            onChange={(e) => setEditingFeedback({ ...editingFeedback, rating: e.target.value })}
                            variant="outlined"
                            size="small"
                            inputProps={{ min: 1, max: 5 }}
                            sx={{ width: 80 }}
                          />
                          <TextField
                            label="Comment"
                            value={editingFeedback.comment}
                            onChange={(e) => setEditingFeedback({ ...editingFeedback, comment: e.target.value })}
                            variant="outlined"
                            size="small"
                            sx={{ flexGrow: 1, minWidth: 150 }}
                          />
                          <Button
                            variant="contained"
                            onClick={() => handleEditFeedback(feedback._id)}
                            className="feedbacks-add-button"
                            disabled={loading}
                            sx={{ bgcolor: '#4a90e2', '&:hover': { bgcolor: '#357abd' } }}
                          >
                            Save
                          </Button>
                          <Button
                            variant="contained"
                            onClick={() => setEditingFeedback(null)}
                            className="feedbacks-back"
                            disabled={loading}
                            sx={{ bgcolor: '#e53e3e', '&:hover': { bgcolor: '#c53030' } }}
                          >
                            Cancel
                          </Button>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Button
                            variant="contained"
                            onClick={() => setEditingFeedback({ ...feedback, rating: feedback.rating, comment: feedback.comment })}
                            className="feedbacks-add-button"
                            sx={{ bgcolor: '#4a90e2', '&:hover': { bgcolor: '#357abd' } }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="contained"
                            onClick={() => handleDeleteFeedback(feedback._id)}
                            className="feedbacks-back"
                            disabled={loading}
                            sx={{ bgcolor: '#e53e3e', '&:hover': { bgcolor: '#c53030' } }}
                          >
                            Delete
                          </Button>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {totalPages > 1 && (
        <Pagination
          count={totalPages}
          page={page}
          onChange={(e, value) => setPage(value)}
          sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}
          color="primary"
        />
      )}
      <Snackbar
        open={message.open}
        autoHideDuration={4000}
        onClose={() => setMessage({ ...message, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setMessage({ ...message, open: false })}
          severity={message.severity}
          sx={{ width: '100%', borderRadius: 2 }}
        >
          {message.text}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CustomerFeedbacks;
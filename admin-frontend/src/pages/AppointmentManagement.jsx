import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell, TableHead, TableRow, IconButton, Dialog, DialogActions,
  DialogContent, DialogTitle, CircularProgress, Snackbar, Alert, Grid,TextField
} from '@mui/material';
import { Edit, Delete, Save, Close, ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';

const AppointmentManagement = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ open: false, text: '', severity: 'success' });
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editedAppointment, setEditedAppointment] = useState({});
  const token = localStorage.getItem('token');
  const socket = io('http://localhost:5000', {
    withCredentials: true,
    extraHeaders: { Authorization: `Bearer ${token}` },
  });

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/admin/appointments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAppointments(response.data);
    } catch (error) {
      console.error('Error fetching appointments:', error.response?.data || error.message);
      setMessage({
        open: true,
        text: `Failed to load appointments: ${error.response?.data?.message || error.message}`,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setMessage({ open: true, text: 'No authentication token found. Please log in.', severity: 'error' });
      navigate('/');
      return;
    }
    fetchAppointments();

    socket.on('appointmentUpdated', (data) => {
      setAppointments((prev) => prev.map((a) => (a._id === data._id ? data : a)));
      setMessage({ open: true, text: 'Appointment updated in real-time!', severity: 'info' });
    });

    socket.on('appointmentDeleted', (data) => {
      setAppointments((prev) => prev.filter((a) => a._id !== data._id));
      setMessage({ open: true, text: 'Appointment deleted in real-time!', severity: 'info' });
    });

    return () => socket.disconnect();
  }, [token, navigate]);

  const handleEdit = (appointment) => {
    setSelectedAppointment(appointment);
    setEditedAppointment({ ...appointment });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await axios.put(`http://localhost:5000/api/admin/appointments/${editedAppointment._id}`, editedAppointment, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAppointments(appointments.map((a) => (a._id === editedAppointment._id ? response.data : a)));
      socket.emit('appointmentUpdated', response.data);
      setMessage({ open: true, text: 'Appointment updated successfully!', severity: 'success' });
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating appointment:', error.response?.data || error.message);
      setMessage({
        open: true,
        text: `Failed to update appointment: ${error.response?.data?.message || error.message}`,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this appointment?')) {
      setLoading(true);
      try {
        await axios.delete(`http://localhost:5000/api/admin/appointments/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAppointments(appointments.filter((a) => a._id !== id));
        socket.emit('appointmentDeleted', { _id: id });
        setMessage({ open: true, text: 'Appointment deleted successfully!', severity: 'success' });
      } catch (error) {
        console.error('Error deleting appointment:', error.response?.data || error.message);
        setMessage({
          open: true,
          text: `Failed to delete appointment: ${error.response?.data?.message || error.message}`,
          severity: 'error',
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDialogClose = () => {
    setEditDialogOpen(false);
    setSelectedAppointment(null);
    setEditedAppointment({});
  };

  return (
    <Box sx={{ p: 4, maxWidth: '1360px', mx: 'auto', bgcolor: '#f4f6f8', minHeight: '100vh', ml: { md: '240px' } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Button
          variant="contained"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/admin/dashboard')}
          sx={{ bgcolor: '#4a90e2', '&:hover': { bgcolor: '#357abd' }, borderRadius: 2, mr: 2 }}
        >
          Back to Dashboard
        </Button>
      </Box>

      <Typography variant="h3" sx={{ mb: 2, fontWeight: 'bold', color: '#1a3c34', textAlign: 'center' }}>
        Appointment Management
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : appointments.length === 0 ? (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Alert severity="info">No appointments found.</Alert>
        </Box>
      ) : (
        <Paper sx={{ p: 3, borderRadius: 2, bgcolor: '#ffffff' }}>
          <Table aria-label="appointments table">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', color: '#2c5282' }}>Provider</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#2c5282' }}>Customer</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#2c5282' }}>Service</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#2c5282' }}>Time</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#2c5282' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#2c5282' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {appointments.map((app) => (
                <TableRow key={app._id} sx={{ '&:hover': { backgroundColor: '#f0f4f8' } }}>
                  <TableCell>{app.providerId.name}</TableCell>
                  <TableCell>{app.customerId.name}</TableCell>
                  <TableCell>{app.serviceId.name}</TableCell>
                  <TableCell>{new Date(app.scheduledTime).toLocaleString()}</TableCell>
                  <TableCell>{app.status}</TableCell>
                  <TableCell>
                    <IconButton color="primary" onClick={() => handleEdit(app)} sx={{ mr: 1 }}>
                      <Edit />
                    </IconButton>
                    <IconButton color="error" onClick={() => handleDelete(app._id)}>
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Dialog open={editDialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Appointment</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Status"
            fullWidth
            value={editedAppointment.status || ''}
            onChange={(e) => setEditedAppointment({ ...editedAppointment, status: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Scheduled Time"
            type="datetime-local"
            fullWidth
            value={editedAppointment.scheduledTime ? new Date(editedAppointment.scheduledTime).toISOString().slice(0, 16) : ''}
            onChange={(e) => setEditedAppointment({ ...editedAppointment, scheduledTime: new Date(e.target.value).toISOString() })}
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} startIcon={<Close />} sx={{ color: '#e53e3e' }}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            startIcon={<Save />}
            variant="contained"
            disabled={loading}
            sx={{ bgcolor: '#4a90e2', '&:hover': { bgcolor: '#357abd' } }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={message.open}
        autoHideDuration={4000}
        onClose={() => setMessage({ ...message, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setMessage({ ...message, open: false })}
          severity={message.severity}
          sx={{ width: '100%', borderRadius: 2, boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' }}
        >
          {message.text}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AppointmentManagement;
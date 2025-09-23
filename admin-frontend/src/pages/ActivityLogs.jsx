import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow, Button, CircularProgress, Snackbar, Alert,
  IconButton, Checkbox, TextField, Tooltip, TablePagination, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle
} from '@mui/material';
import { Delete, ArrowBack, Refresh } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from "./axiosInstance";
import { useSelector,  } from 'react-redux';
import io from 'socket.io-client';

const ActivityLogs = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
      const { token, isAuthenticated, user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ open: false, text: '', severity: 'success' });
  const [selectedLogs, setSelectedLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openDialog, setOpenDialog] = useState(false);
  
  const socket = io('http://localhost:5000', {
    withCredentials: true,
    extraHeaders: { Authorization: `Bearer ${token}` },
    transports: ['websocket', 'polling'],
    cors: {
      origin: 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/admin/logs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLogs(response.data);
      setSelectedLogs([]);
    } catch (error) {
      console.error('Error fetching logs:', error.response?.data || error.message);
      setMessage({
        open: true,
        text: `Failed to load logs: ${error.response?.data?.message || error.message}`,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

 /*  useEffect(() => {
    if (!token) {
      setMessage({ open: true, text: 'No authentication token found. Please log in.', severity: 'error' });
      navigate('/');
      return;
    }
    fetchLogs(); */




  useEffect(() => {
        console.log('ActivityLogs: Mounting, auth state:', { token, isAuthenticated, user });
        if (!token || !isAuthenticated || user?.role !== 'admin') {
          console.log('ActivityLogs: Invalid auth state, redirecting to /admin/login');
          navigate('/admin/login', { replace: true });
          return;
        }
        fetchLogs();



    socket.on('connect_error', (err) => {
      console.error('Socket.IO connection error:', err.message);
    });

    socket.on('logDeleted', (data) => {
      setLogs(prevLogs => prevLogs.filter(log => log._id !== data._id));
      setMessage({ open: true, text: 'Log deleted successfully!', severity: 'success' });
    });

    return () => socket.disconnect();
  }, [token, navigate]);

  const handleDeleteLog = async (logId) => {
    if (window.confirm('Are you sure you want to delete this log?')) {
      setLoading(true);
      try {
        await axios.delete(`http://localhost:5000/api/admin/logs/${logId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLogs(logs.filter(log => log._id !== logId));
        setMessage({ open: true, text: 'Log deleted successfully!', severity: 'success' });
      } catch (error) {
        console.error('Error deleting log:', error.response?.data || error.message);
        setMessage({ open: true, text: `Failed to delete log: ${error.response?.data?.message || error.message}`, severity: 'error' });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBulkDelete = () => {
    setOpenDialog(true);
  };

 // In ActivityLogs.jsx, update handleDialogClose
const handleDialogClose = async (confirm) => {
  setOpenDialog(false);
  if (confirm) {
    setLoading(true);
    try {
      console.log('Sending request to:', 'http://localhost:5000/api/admin/logs/bulk-delete');
      console.log('Sending logIds for bulk delete:', selectedLogs);
      const response = await axios.post('http://localhost:5000/api/admin/logs/bulk-delete', {
        logIds: selectedLogs,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Response:', response.data);
      setLogs(logs.filter(log => !selectedLogs.includes(log._id)));
      setSelectedLogs([]);
      setMessage({ open: true, text: 'Logs deleted successfully!', severity: 'success' });
    } catch (error) {
      console.error('Error deleting logs:', error.response?.data || error.message);
      setMessage({ open: true, text: `Failed to delete logs: ${error.response?.data?.message || error.message}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  }
};

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedLogs(logs.map(log => log._id));
    } else {
      setSelectedLogs([]);
    }
  };

  const handleSelectLog = (logId) => {
    setSelectedLogs(prev => 
      prev.includes(logId) ? prev.filter(id => id !== logId) : [...prev, logId]
    );
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const filteredLogs = logs.filter(log =>
    log.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.details?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    new Date(log.timestamp).toLocaleString().toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedLogs = filteredLogs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box sx={{ p: 4, maxWidth: '1360px', mx: 'auto', bgcolor: '#f4f6f8', minHeight: '100vh', ml: { md: '240px' } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Button
            variant="contained"
            startIcon={<ArrowBack />}
            onClick={() => navigate('/admin/dashboard')}
            sx={{ bgcolor: '#4a90e2', '&:hover': { bgcolor: '#357abd' }, borderRadius: 2, mr: 2 }}
          >
            Back to Dashboard
          </Button>
          <Button
            variant="contained"
            onClick={handleBulkDelete}
            disabled={selectedLogs.length === 0 || loading}
            sx={{ bgcolor: '#e53e3e', '&:hover': { bgcolor: '#c53030' }, borderRadius: 2, mr: 2 }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Bulk Delete'}
          </Button>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <TextField
            label="Search (User, Action, Details, Timestamp)"
            variant="outlined"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ width: '300px', mr: 2 }}
          />
          <Tooltip title="Refresh Logs">
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={fetchLogs}
              disabled={loading}
              sx={{ bgcolor: '#4a90e2', '&:hover': { bgcolor: '#357abd' }, borderRadius: 2 }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Refresh'}
            </Button>
          </Tooltip>
        </Box>
      </Box>

      <Typography variant="h3" sx={{ mb: 2, fontWeight: 'bold', color: '#1a3c34', textAlign: 'center' }}>
        Activity Logs
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : logs.length === 0 ? (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Alert severity="info">No activity logs found.</Alert>
        </Box>
      ) : (
        <Paper sx={{ p: 3, borderRadius: 2, bgcolor: '#ffffff', overflowX: 'auto' }}>
          <Table aria-label="activity logs table" sx={{ minWidth: 800 }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#2c5282' }}>
                <TableCell sx={{ fontWeight: 'bold', color: '#ffffff' }}>
                  <Checkbox
                    checked={selectedLogs.length === logs.length && logs.length > 0}
                    onChange={handleSelectAll}
                    color="primary"
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#ffffff' }}>User</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#ffffff' }}>Action</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#ffffff' }}>Timestamp</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#ffffff' }}>Details</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#ffffff' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedLogs.map((log) => (
                <TableRow key={log._id} sx={{ '&:hover': { backgroundColor: '#f0f4f8' } }}>
                  <TableCell>
                    <Checkbox
                      checked={selectedLogs.includes(log._id)}
                      onChange={() => handleSelectLog(log._id)}
                      color="primary"
                    />
                  </TableCell>
                  <TableCell>{log.userName || 'N/A'}</TableCell>
                  <TableCell>{log.action || 'N/A'}</TableCell>
                  <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                  <TableCell>{log.details || 'N/A'}</TableCell>
                  <TableCell>
                    <Tooltip title="Delete Log">
                      <IconButton color="error" onClick={() => handleDeleteLog(log._id)} disabled={loading}>
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredLogs.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            sx={{ mt: 2 }}
          />
        </Paper>
      )}

      <Dialog
        open={openDialog}
        onClose={() => handleDialogClose(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete {selectedLogs.length} logs? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleDialogClose(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={() => handleDialogClose(true)} color="error" autoFocus>
            Delete
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

export default ActivityLogs;
import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Tabs, Tab, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, CircularProgress, Snackbar, Alert, IconButton
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import io from 'socket.io-client';
import { Refresh, ArrowBack } from '@mui/icons-material';
import AdminLoadingScreen from '../Components/AdminLoadingScreen';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const FaqsContacts = () => {
  const navigate = useNavigate();
  const { token } = useSelector((state) => state.auth);
  const [tabValue, setTabValue] = useState(0);
  const [faqs, setFaqs] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ open: false, text: '', severity: 'success' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (!token) {
        navigate('/admin');
        return;
      }

      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [faqsResponse, contactsResponse] = await Promise.all([
        axios.get(`${API_URL}/api/faqs`, config),
        axios.get(`${API_URL}/api/contact`, config),
      ]);

      setFaqs(faqsResponse.data || []);
      setContacts(contactsResponse.data || []);
    } catch (error) {
      console.error('Fetch data error:', error.message, error.response?.data);
      setMessage({ open: true, text: 'Error fetching FAQs or contact messages.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [token, navigate]);

  useEffect(() => {
    fetchData();

    const socket = io(API_URL, { reconnection: true });
    socket.on('connect', () => {
      socket.emit('joinAdminRoom');
      console.log('Socket connected, joined admin_room');
    });

    socket.on('newContactMessage', (contact) => {
      setContacts((prev) => [contact, ...prev]);
      setMessage({ open: true, text: `New contact message from ${contact.name}`, severity: 'info' });
      console.log('New contact message received:', contact);
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchData]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ p: 3, bgcolor: '#f4f6f8', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">FAQs & Contact Messages</Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => navigate('/admin/dashboard')}
            sx={{ mr: 2 }}
          >
            Back to Dashboard
          </Button>
          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={fetchData}
            disabled={loading}
            sx={{ bgcolor: '#4a90e2', '&:hover': { bgcolor: '#357abd' } }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Refresh'}
          </Button>
        </Box>
      </Box>

      <Paper sx={{ p: 2, borderRadius: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          sx={{ mb: 2 }}
          centered
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab label="FAQs" />
          <Tab label="Contact Messages" />
        </Tabs>

        {loading ? (<AdminLoadingScreen message="Loading FAQs & Contacts..." /> 
        ) : (
          <>
            {tabValue === 0 && (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Question</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Answer</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Created At</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {faqs.length > 0 ? (
                      faqs.map((faq) => (
                        <TableRow key={faq._id}>
                          <TableCell>{faq.question}</TableCell>
                          <TableCell>{faq.answer}</TableCell>
                          <TableCell>{new Date(faq.createdAt).toLocaleString()}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          No FAQs available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            {tabValue === 1 && (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Message</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Created At</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {contacts.length > 0 ? (
                      contacts.map((contact) => (
                        <TableRow key={contact._id}>
                          <TableCell>{contact.name}</TableCell>
                          <TableCell>{contact.email}</TableCell>
                          <TableCell>{contact.message}</TableCell>
                          <TableCell>{new Date(contact.createdAt).toLocaleString()}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          No contact messages available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )}
      </Paper>

      <Snackbar
        open={message.open}
        autoHideDuration={6000}
        onClose={() => setMessage({ ...message, open: false })}
      >
        <Alert
          onClose={() => setMessage({ ...message, open: false })}
          severity={message.severity}
          sx={{ width: '100%' }}
        >
          {message.text}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FaqsContacts;
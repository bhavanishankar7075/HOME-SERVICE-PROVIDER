import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, List, ListItem, ListItemText, Divider, Button, CircularProgress, Snackbar, Alert, IconButton
} from '@mui/material';
import { ArrowBack, CheckCircle } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { format } from 'date-fns';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ContactMessages = () => {
  const navigate = useNavigate();
  const { token } = useSelector((state) => state.auth);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ open: false, text: '', severity: 'success' });

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      console.log('Fetching contact messages with token:', token.substring(0, 10) + '...');
      const response = await axios.get(`${API_URL}/api/contact`, config).catch(err => {
        console.error('Error fetching contact messages:', err.response?.status, err.response?.data);
        throw err;
      });
      setMessages(response.data);
    } catch (error) {
      setMessage({ open: true, text: 'Error fetching contact messages.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }
    fetchMessages();
  }, [token, navigate]);

  const handleMarkResponded = async (id) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(`${API_URL}/api/contact/${id}/responded`, {}, config);
      setMessages(messages.map(msg => msg._id === id ? { ...msg, responded: true } : msg));
      setMessage({ open: true, text: 'Message marked as responded.', severity: 'success' });
    } catch (error) {
      setMessage({ open: true, text: 'Error marking message as responded.', severity: 'error' });
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/admin/dashboard')} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h5">Contact Messages</Typography>
      </Box>
      {loading ? (
        <CircularProgress sx={{ display: 'block', mx: 'auto' }} />
      ) : (
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <List>
            {messages.length === 0 ? (
              <Typography sx={{ textAlign: 'center', color: '#6B7280' }}>
                No contact messages yet.
              </Typography>
            ) : (
              messages.map((msg, index) => (
                <React.Fragment key={msg._id}>
                  <ListItem>
                    <ListItemText
                      primary={`From: ${msg.name}`}
                      secondary={
                        <>
                          <Typography component="span" sx={{ color: '#6B7280' }}>
                            Email: {msg.email}
                          </Typography>
                          <br />
                          <Typography component="span" sx={{ color: '#6B7280' }}>
                            Message: {msg.message}
                          </Typography>
                          <br />
                          <Typography component="span" sx={{ color: '#6B7280' }}>
                            Received: {format(new Date(msg.createdAt), 'PPp')}
                          </Typography>
                          <br />
                          <Typography component="span" sx={{ color: msg.responded ? '#2ECC71' : '#E74C3C' }}>
                            Status: {msg.responded ? 'Responded' : 'Pending'}
                          </Typography>
                        </>
                      }
                      sx={{ '& .MuiListItemText-primary': { fontWeight: 'bold', color: '#1F2937' } }}
                    />
                    {!msg.responded && (
                      <Button
                        variant="outlined"
                        startIcon={<CheckCircle />}
                        onClick={() => handleMarkResponded(msg._id)}
                        sx={{ ml: 2 }}
                      >
                        Mark Responded
                      </Button>
                    )}
                  </ListItem>
                  {index < messages.length - 1 && <Divider />}
                </React.Fragment>
              ))
            )}
          </List>
        </Paper>
      )}
      <Snackbar open={message.open} autoHideDuration={6000} onClose={() => setMessage({ ...message, open: false })}>
        <Alert onClose={() => setMessage({ ...message, open: false })} severity={message.severity} sx={{ width: '100%' }}>
          {message.text}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ContactMessages;
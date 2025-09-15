import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import io from 'socket.io-client'; // <-- 1. Import Socket.IO
import { Box, Typography, Paper, List, ListItem, ListItemText, Divider, CircularProgress, Alert, Avatar, ListItemAvatar } from '@mui/material';

// --- 2. Initialize the socket connection ---
const socket = io('http://localhost:5000');

const CustomerMessages = () => {
  const { token, user } = useSelector((state) => state.auth);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMessages = async () => {
      if (!token) {
        setError('Authentication required to view messages.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:5000/api/users/messages', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessages(response.data);
        setError('');
      } catch (err) {
        console.error("Failed to fetch customer messages:", err);
        setError(err.response?.data?.message || 'Failed to fetch your messages.');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // --- 3. Set up real-time listener for replies ---
    if (user) {
      // Handler to update a message when a reply comes in
      const handleNewReply = (updatedMessage) => {
        setMessages((prevMessages) => 
          prevMessages.map(msg => 
            msg._id === updatedMessage._id ? updatedMessage : msg
          )
        );
      };

      socket.emit('joinRoom', user._id); // Join personal room
      socket.on('newAdminReply', handleNewReply); // Listen for replies

      // Clean up the listener when the component unmounts
      return () => {
        socket.off('newAdminReply', handleNewReply);
      };
    }
  }, [token, user]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 4 }, maxWidth: 900, margin: 'auto', mt: 5 }}>
      <Typography variant="h4" gutterBottom component="h1">
        My Sent Messages
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Here are the inquiries you've sent to the admin and their replies.
      </Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Paper elevation={3}>
        {messages.length > 0 ? (
          <List sx={{ padding: 0 }}>
            {messages.map((msg, index) => (
              <React.Fragment key={msg._id}>
                <ListItem alignItems="flex-start" sx={{ p: 2 }}>
                  <ListItemAvatar>
                    <Avatar 
                      alt={msg.providerId?.name || 'P'} 
                      src={msg.providerId?.profile?.image ? `http://localhost:5000${msg.providerId.profile.image}` : '/default-avatar.png'}
                    />
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography component="span" variant="body1" sx={{ fontWeight: 'bold' }}>
                        Inquiry about: {msg.providerName || 'N/A'}
                      </Typography>
                    }
                    secondary={
                      <>
                        <Typography component="p" variant="body2" sx={{ my: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                          {msg.message}
                        </Typography>

                        {/* --- 4. ADDED UI TO DISPLAY THE ADMIN'S REPLY --- */}
                        {msg.adminReply && msg.adminReply.text && (
                          <Box sx={{ mt: 2, p: 2, bgcolor: '#e3f2fd', borderRadius: 1, border: '1px solid #bbdefb' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#1565c0' }}>
                              Admin Reply (on {new Date(msg.adminReply.repliedAt).toLocaleDateString()}):
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              {msg.adminReply.text}
                            </Typography>
                          </Box>
                        )}
                        {/* ------------------------------------------- */}

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                          <Typography component="span" variant="caption" color="text.secondary">
                            Sent: {new Date(msg.createdAt).toLocaleString()}
                          </Typography>
                          <Typography 
                            component="span" 
                            variant="caption" 
                            sx={{ 
                              fontWeight: 'bold', 
                              color: msg.status === 'new' ? 'orange' : (msg.status === 'replied' ? 'blue' : 'green'),
                              textTransform: 'uppercase'
                            }}
                          >
                            Status: {msg.status}
                          </Typography>
                        </Box>
                      </>
                    }
                  />
                </ListItem>
                {index < messages.length - 1 && <Divider component="li" />}
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Typography sx={{ p: 4, textAlign: 'center' }}>
            You haven't sent any messages yet.
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

export default CustomerMessages;
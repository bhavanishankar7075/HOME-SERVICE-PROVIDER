import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import io from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

import {
  Box, Typography, Paper, CircularProgress, Alert, ToggleButton, ToggleButtonGroup, Card, CardContent, CardActions,
  IconButton, Tooltip, TextField, Modal, Button, Checkbox, Avatar, Chip,
} from '@mui/material';
import { MarkEmailRead as MarkReadIcon, Delete as DeleteIcon, Reply as ReplyIcon, ArrowBack} from '@mui/icons-material';

const socket = io('http://localhost:5000');

const modalStyle = {
  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
  width: { xs: '90%', sm: 500 }, bgcolor: 'background.paper', border: '2px solid #000',
  boxShadow: 24, p: 4, borderRadius: 2
};

const AdminMessages = () => {
  const { token } = useSelector((state) => state.auth);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('new');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [isReplyModalOpen, setReplyModalOpen] = useState(false);
  const [currentMessage, setCurrentMessage] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMessages = async () => {
      if (!token) {
        setError('Authentication required.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:5000/api/admin/messages', {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000 // **FIX: Added a 10-second timeout**
        });
        setMessages(response.data);
      } catch (err) {
        if (err.code === 'ECONNABORTED') {
          setError('The request timed out. The server might be busy or down.');
        } else {
          setError(err.response?.data?.message || 'Failed to fetch messages.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();

    socket.on('newAdminMessage', (newMessage) => {
      setMessages((prev) => [newMessage, ...prev]);
    });

    return () => {
      socket.off('newAdminMessage');
    };
  }, [token]);

  const filteredMessages = useMemo(() => {
    let filtered = messages;
    if (filter !== 'all') {
      filtered = filtered.filter((msg) => msg.status === filter);
    }
    if (searchQuery) {
      const lowercasedQuery = searchQuery.toLowerCase();
      filtered = filtered.filter((msg) =>
        msg.customerId?.name?.toLowerCase().includes(lowercasedQuery) ||
        msg.providerName?.toLowerCase().includes(lowercasedQuery) ||
        msg.message?.toLowerCase().includes(lowercasedQuery)
      );
    }
    return filtered;
  }, [messages, filter, searchQuery]);

  const handleFilterChange = (event, newFilter) => {
    if (newFilter !== null) setFilter(newFilter);
  };

  const handleMarkAsRead = async (id) => {
    try {
      const { data: updatedMessage } = await axios.put(`http://localhost:5000/api/admin/messages/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(messages.map((msg) => (msg._id === id ? updatedMessage : msg)));
    } catch (err) {
      console.error("Failed to mark as read:", err);
      setError("Could not update message status.");
    }
  };

  const handleDeleteMessage = async (id) => {
    if (window.confirm('Are you sure you want to delete this message permanently?')) {
      try {
        await axios.delete(`http://localhost:5000/api/admin/messages/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessages(messages.filter((msg) => msg._id !== id));
      } catch (err) {
        console.error("Failed to delete message:", err);
        setError("Could not delete message.");
      }
    }
  };
  
  const handleOpenReplyModal = (msg) => {
    setCurrentMessage(msg);
    setReplyText('');
    setReplyModalOpen(true);
  };
  const handleCloseReplyModal = () => setReplyModalOpen(false);

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    setIsReplying(true);
    try {
      await axios.post(`http://localhost:5000/api/admin/messages/${currentMessage._id}/reply`, 
        { replyMessage: replyText }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages(messages.map(msg => msg._id === currentMessage._id ? { ...msg, status: 'read' } : msg));
      handleCloseReplyModal();
    } catch (err) {
      setError('Failed to send reply.');
    } finally {
      setIsReplying(false);
    }
  };

  const handleSelectMessage = (id) => {
    setSelectedMessages((prev) =>
      prev.includes(id) ? prev.filter((msgId) => msgId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedMessages(filteredMessages.map((msg) => msg._id));
    } else {
      setSelectedMessages([]);
    }
  };
  
  const handleBulkDelete = async () => {
    if (window.confirm(`Delete ${selectedMessages.length} selected messages?`)) {
      try {
        await axios.post('http://localhost:5000/api/admin/messages/bulk-delete', 
          { messageIds: selectedMessages }, 
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMessages(messages.filter((msg) => !selectedMessages.includes(msg._id)));
        setSelectedMessages([]);
      } catch (err) {
        setError('Failed to delete messages.');
      }
    }
  };

  const handleBulkMarkAsRead = async () => {
    try {
      await axios.post('http://localhost:5000/api/admin/messages/bulk-read', 
        { messageIds: selectedMessages }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages(messages.map(msg => selectedMessages.includes(msg._id) ? { ...msg, status: 'read' } : msg));
      setSelectedMessages([]);
    } catch (err) {
      setError('Failed to mark messages as read.');
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, maxWidth: 1200, margin: 'auto' }}>
      <Paper elevation={2} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4" component="h1">Customer Messages</Typography>
          <TextField
            label="Search Messages"
            variant="outlined"
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ width: { xs: '100%', md: 300 } }}
          />
          <Button variant="contained" startIcon={<ArrowBack />} onClick={() => navigate("/admin/dashboard")}>
                        Back to Dashboard
                      </Button>
          <ToggleButtonGroup color="primary" value={filter} exclusive onChange={handleFilterChange}>
            <ToggleButton value="new">New</ToggleButton>
            <ToggleButton value="read">Read</ToggleButton>
            <ToggleButton value="all">All</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        {selectedMessages.length > 0 && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.lighter', borderRadius: 1, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="subtitle1">{selectedMessages.length} selected</Typography>
            <Button variant="contained" onClick={handleBulkMarkAsRead}>Mark as Read</Button>
            <Button variant="outlined" color="error" onClick={handleBulkDelete}>Delete</Button>
          </Box>
        )}
      </Paper>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {filteredMessages.length > 0 ? (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, p: 1 }}>
            <Checkbox
              indeterminate={selectedMessages.length > 0 && selectedMessages.length < filteredMessages.length}
              checked={filteredMessages.length > 0 && selectedMessages.length === filteredMessages.length}
              onChange={handleSelectAll}
            />
            <Typography>Select All Visible</Typography>
          </Box>
          <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' } }}>
            {filteredMessages.map((msg) => (
              <Card key={msg._id} elevation={3} sx={{ display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Checkbox checked={selectedMessages.includes(msg._id)} onChange={() => handleSelectMessage(msg._id)} />
                    <Chip label={msg.status} color={msg.status === 'new' ? 'warning' : 'success'} size="small" />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                    <Avatar>{msg.customerId?.name?.charAt(0) || 'U'}</Avatar>
                    <Box>
                      <Typography variant="h6" component="div">{msg.customerId?.name || 'Unknown User'}</Typography>
                      <Typography variant="caption" color="text.secondary">{new Date(msg.createdAt).toLocaleString()}</Typography>
                    </Box>
                  </Box>
                  <Typography color="text.secondary" sx={{ mt: 2, mb: 1.5, fontWeight: 'bold' }}>
                    Regarding: {msg.providerName || 'N/A'}
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f9f9f9' }}>
                    <Typography variant="body2">{msg.message}</Typography>
                  </Paper>
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end', p: 2, borderTop: '1px solid #eee' }}>
                  <Tooltip title="Reply to Customer"><IconButton color="success" onClick={() => handleOpenReplyModal(msg)}><ReplyIcon /></IconButton></Tooltip>
                  {msg.status === 'new' && <Tooltip title="Mark as Read"><IconButton color="primary" onClick={() => handleMarkAsRead(msg._id)}><MarkReadIcon /></IconButton></Tooltip>}
                  <Tooltip title="Delete Message"><IconButton color="error" onClick={() => handleDeleteMessage(msg._id)}><DeleteIcon /></IconButton></Tooltip>
                </CardActions>
              </Card>
            ))}
          </Box>
        </Box>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}><Typography variant="h6">No messages to display.</Typography></Paper>
      )}

      {/* Reply Modal */}
      <Modal open={isReplyModalOpen} onClose={handleCloseReplyModal}>
        <Box sx={modalStyle}>
          <Typography variant="h6">Reply to {currentMessage?.customerId?.name}</Typography>
          <Paper variant="outlined" sx={{ p: 2, my: 2, bgcolor: '#f9f9f9' }}>
            <Typography variant="subtitle2">Original Message:</Typography>
            <Typography variant="body2">{currentMessage?.message}</Typography>
          </Paper>
          <TextField label="Your Reply" multiline rows={5} fullWidth value={replyText} onChange={(e) => setReplyText(e.target.value)} />
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={handleCloseReplyModal}>Cancel</Button>
            <Button variant="contained" onClick={handleSendReply} disabled={isReplying}>
              {isReplying ? <CircularProgress size={24} /> : 'Send Reply'}
            </Button>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
};

export default AdminMessages;
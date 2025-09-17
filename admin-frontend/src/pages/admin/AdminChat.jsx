import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import io from 'socket.io-client';
import {
  Box, Grid, Paper, Typography, List, ListItemButton, ListItemAvatar, Avatar,
  ListItemText, CircularProgress, TextField, IconButton, Divider, Chip
} from '@mui/material';
import { Send as SendIcon, MarkChatUnread as MarkChatUnreadIcon } from '@mui/icons-material';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const socket = io(API_URL);

const MessageBubble = ({ message }) => {
    const isUser = message.sender === 'user';
    const isAdmin = message.text.startsWith('Admin:');
    const senderName = isUser ? 'Customer' : 'Assistant';
    
    return (
        <Box sx={{ display: 'flex', justifyContent: isUser ? 'flex-start' : 'flex-end', mb: 2 }}>
            <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', ml: 1 }}>{senderName}</Typography>
                <Paper
                    elevation={2}
                    sx={{
                        p: 1.5,
                        borderRadius: isUser ? '20px 20px 20px 5px' : '20px 20px 5px 20px',
                        bgcolor: isUser ? 'grey.200' : 'primary.main',
                        color: isUser ? 'black' : 'white',
                        border: isAdmin ? '2px solid' : 'none',
                        borderColor: 'secondary.main',
                    }}
                >
                    <Typography variant="body1">{message.text}</Typography>
                </Paper>
            </Box>
        </Box>
    );
};

const AdminChat = () => {
    const { token } = useSelector((state) => state.auth);
    const [conversations, setConversations] = useState([]);
    const [selectedConvo, setSelectedConvo] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);

    const fetchConversations = useCallback(async () => {
        try {
            const { data } = await axios.get(`${API_URL}/api/chat/admin/all`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setConversations(data);
        } catch (error) {
            console.error("Failed to fetch conversations", error);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchConversations();
        socket.emit('joinAdminRoom');

        const handleChatAttention = (updatedConvo) => {
            setConversations(prev => [updatedConvo, ...prev.filter(c => c._id !== updatedConvo._id)]);
        };

        socket.on('chatNeedsAttention', handleChatAttention);
        
        return () => {
            socket.off('chatNeedsAttention', handleChatAttention);
        };
    }, [fetchConversations]);
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSelectConversation = async (conversation) => {
        setSelectedConvo(conversation);
        setMessages([]); // Clear previous messages
        try {
            const convoRes = await axios.get(`${API_URL}/api/chat`, { 
                headers: { Authorization: `Bearer ${token}` },
                params: { userId: conversation.userId._id } // Assuming an endpoint to fetch specific user's chat
            });
            setMessages(convoRes.data.messages);
        } catch (error) {
            console.error("Failed to fetch messages for conversation", error);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedConvo) return;

        const payload = {
            conversationId: selectedConvo._id,
            text: newMessage,
        };
        
        try {
            const { data } = await axios.post(`${API_URL}/api/chat/admin/send`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessages(prev => [...prev, data]);
            setNewMessage('');
        } catch (error) {
            console.error("Failed to send admin message", error);
        }
    };

    if (loading) return <CircularProgress />;

    return (
        <Paper sx={{ display: 'flex', height: 'calc(100vh - 80px)', boxShadow: 3 }}>
            <Grid container>
                <Grid item xs={12} sm={4} sx={{ borderRight: 1, borderColor: 'divider', height: '100%', overflowY: 'auto' }}>
                    <Typography variant="h6" sx={{ p: 2 }}>Conversations</Typography>
                    <List component="nav">
                        {conversations.map((convo) => (
                            <ListItemButton
                                key={convo._id}
                                selected={selectedConvo?._id === convo._id}
                                onClick={() => handleSelectConversation(convo)}
                            >
                                <ListItemAvatar>
                                    <Avatar>{convo.userId.name.charAt(0)}</Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={convo.userId.name}
                                    secondary={convo.userId.email}
                                />
                                {convo.status === 'needs_attention' && <MarkChatUnreadIcon color="error" />}
                            </ListItemButton>
                        ))}
                    </List>
                </Grid>
                <Grid item xs={12} sm={8} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    {selectedConvo ? (
                        <>
                            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                                <Typography variant="h6">{selectedConvo.userId.name}</Typography>
                            </Box>
                            <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto' }}>
                                {messages.map((msg, index) => (
                                    <MessageBubble key={index} message={msg} />
                                ))}
                                <div ref={messagesEndRef} />
                            </Box>
                            <Box component="form" onSubmit={handleSendMessage} sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex' }}>
                                <TextField
                                    fullWidth
                                    variant="outlined"
                                    size="small"
                                    placeholder="Type your message as an admin..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                />
                                <IconButton type="submit" color="primary">
                                    <SendIcon />
                                </IconButton>
                            </Box>
                        </>
                    ) : (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'text.secondary' }}>
                            <Typography>Select a conversation to start chatting</Typography>
                        </Box>
                    )}
                </Grid>
            </Grid>
        </Paper>
    );
};

export default AdminChat;
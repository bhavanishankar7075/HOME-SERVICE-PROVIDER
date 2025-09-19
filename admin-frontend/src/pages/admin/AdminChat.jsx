import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import {
    Box, Grid, Paper, Typography, List, ListItemButton, ListItemAvatar, Avatar,
    ListItemText, CircularProgress, TextField, IconButton, Divider, Button, Alert, Chip,
    AppBar, Toolbar, Drawer, InputAdornment
} from '@mui/material';
import {
    Send as SendIcon, MarkChatUnread as MarkChatUnreadIcon, Close as CloseIcon,
    Replay as ReopenIcon, Delete as DeleteIcon, Search as SearchIcon,
    ArrowBack as ArrowBackIcon, Menu as MenuIcon
} from '@mui/icons-material';

import './AdminChat.css'

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const socket = io(API_URL);

const MessageBubble = ({ message }) => {
    const isUser = message.sender === 'user';
    const isAdmin = message.text.startsWith('Admin:');
    const senderName = isUser ? 'Customer' : (isAdmin ? 'Admin' : 'Assistant');

    return (
        <Box sx={{ display: 'flex', justifyContent: isUser ? 'flex-start' : 'flex-end', mb: 2 }}>
            <Box sx={{ maxWidth: '70%', mx: 1 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, ml: isUser ? 1 : 0, mr: isUser ? 0 : 1, textAlign: isUser ? 'left' : 'right' }}>
                    {senderName} • {new Date(message.createdAt).toLocaleTimeString()}
                </Typography>
                <Paper
                    elevation={3}
                    sx={{
                        p: 1.5,
                        borderRadius: isUser ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
                        bgcolor: isUser ? 'grey.100' : isAdmin ? 'secondary.light' : 'primary.light',
                        color: isUser ? 'text.primary' : 'white',
                        border: isAdmin ? '1px solid' : 'none',
                        borderColor: 'secondary.main',
                        wordBreak: 'break-word'
                    }}
                >
                    <Typography variant="body2">{message.text}</Typography>
                </Paper>
            </Box>
        </Box>
    );
};

const AdminChat = () => {
    const { token } = useSelector((state) => state.auth);
    const navigate = useNavigate();
    const [conversations, setConversations] = useState([]);
    const [filteredConversations, setFilteredConversations] = useState([]);
    const [selectedConvo, setSelectedConvo] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isTyping, setIsTyping] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [drawerOpen, setDrawerOpen] = useState(false);
    const chatContainerRef = useRef(null);

    const fetchConversations = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await axios.get(`${API_URL}/api/chat/admin/all`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const validConversations = data.filter(convo => convo.userId !== null);
            setConversations(validConversations);
            setFilteredConversations(validConversations);
            if (validConversations.length < data.length) {
                setError('Some conversations could not be loaded due to missing user data.');
            }
        } catch (error) {
            setError('Failed to fetch conversations. Please try again.');
            console.error('Fetch conversations error:', error);
        } finally {
            setLoading(false);
        }
    }, [token]);

    const handleSelectConversation = useCallback(async (conversation) => {
        if (!conversation.userId) {
            setError('Cannot load messages for this conversation: User data is missing.');
            return;
        }
        if (selectedConvo?._id === conversation._id) {
            if (chatContainerRef.current) {
                chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
            return;
        }
        setSelectedConvo(conversation);
        setMessages([]); // Clear messages for smooth transition
        setError(null);
        setDrawerOpen(false);
        try {
            const { data } = await axios.get(`${API_URL}/api/chat/admin/conversations/${conversation._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessages(data);
            // Force scroll to end after messages are set
            if (chatContainerRef.current) {
                chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                console.log('Scrolled to end on select:', conversation._id);
            }
        } catch (error) {
            setError('Failed to fetch messages. Please try again.');
            console.error('Fetch messages error:', error);
        }
    }, [token, selectedConvo]);

    const handleCloseConversation = useCallback(async () => {
        if (!selectedConvo) return;
        try {
            await axios.post(`${API_URL}/api/chat/admin/close`, { conversationId: selectedConvo._id }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setConversations(prev =>
                prev.map(c => c._id === selectedConvo._id ? { ...c, status: 'closed' } : c)
            );
            setFilteredConversations(prev =>
                prev.map(c => c._id === selectedConvo._id ? { ...c, status: 'closed' } : c)
            );
            setSelectedConvo({ ...selectedConvo, status: 'closed' });
        } catch (error) {
            setError('Failed to close conversation. Please try again.');
            console.error('Close conversation error:', error);
        }
    }, [selectedConvo, token]);

    const handleReopenConversation = useCallback(async () => {
        if (!selectedConvo) return;
        try {
            await axios.post(`${API_URL}/api/chat/admin/reopen`, { conversationId: selectedConvo._id }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setConversations(prev =>
                prev.map(c => c._id === selectedConvo._id ? { ...c, status: 'open' } : c)
            );
            setFilteredConversations(prev =>
                prev.map(c => c._id === selectedConvo._id ? { ...c, status: 'open' } : c)
            );
            setSelectedConvo({ ...selectedConvo, status: 'open' });
        } catch (error) {
            setError('Failed to reopen conversation. Please try again.');
            console.error('Reopen conversation error:', error);
        }
    }, [selectedConvo, token]);

    const handleDeleteConversation = useCallback(async (conversationId) => {
        if (!window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) return;
        try {
            await axios.post(`${API_URL}/api/chat/admin/delete`, { conversationId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setConversations(prev => prev.filter(c => c._id !== conversationId));
            setFilteredConversations(prev => prev.filter(c => c._id !== conversationId));
            if (selectedConvo?._id === conversationId) {
                setSelectedConvo(null);
                setMessages([]);
            }
        } catch (error) {
            setError('Failed to delete conversation. Please try again.');
            console.error('Delete conversation error:', error);
        }
    }, [selectedConvo, token]);

    const handleSendMessage = useCallback(async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedConvo || selectedConvo.status === 'closed') return;

        const optimisticMessage = {
            sender: 'model',
            text: `Admin: ${newMessage}`,
            isOptimistic: true,
            createdAt: new Date().toISOString()
        };
        setMessages(prev => [...prev, optimisticMessage]);
        setNewMessage('');
        setError(null);

        try {
            await axios.post(`${API_URL}/api/chat/admin/send`, {
                conversationId: selectedConvo._id,
                text: newMessage
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            setError('Failed to send message. Please try again.');
            console.error('Send message error:', error);
            setMessages(prev => prev.filter(msg => !msg.isOptimistic));
        }
    }, [newMessage, selectedConvo, token]);

    const handleTyping = useCallback((e) => {
        setNewMessage(e.target.value);
        if (selectedConvo && e.target.value.trim()) {
            socket.emit('adminTyping', { conversationId: selectedConvo._id });
        }
    }, [selectedConvo]);

    const handleSearch = useCallback((e) => {
        const term = e.target.value.toLowerCase();
        setSearchTerm(term);
        setFilteredConversations(
            conversations.filter(convo =>
                (convo.userId?.name?.toLowerCase().includes(term) || convo.userId?.email?.toLowerCase().includes(term))
            )
        );
    }, [conversations]);

    useEffect(() => {
        fetchConversations();
        socket.emit('joinAdminRoom');

        const handleChatAttention = (updatedConvo) => {
            if (updatedConvo.userId) {
                setConversations(prev => [updatedConvo, ...prev.filter(c => c._id !== updatedConvo._id)]);
                setFilteredConversations(prev => [updatedConvo, ...prev.filter(c => c._id !== updatedConvo._id)]);
            }
        };

        const handleAdminMessageSent = ({ conversationId, message }) => {
            if (selectedConvo?._id === conversationId) {
                setMessages(prev => {
                    const withoutOptimistic = prev.filter(msg => !msg.isOptimistic);
                    return [...withoutOptimistic, message];
                });
            }
        };

        const handleNewUserMessage = ({ conversationId, message }) => {
            if (selectedConvo?._id === conversationId) {
                setMessages(prev => [...prev, message]);
            }
        };

        const handleConversationClosed = ({ conversationId }) => {
            if (selectedConvo?._id === conversationId) {
                setSelectedConvo(prev => ({ ...prev, status: 'closed' }));
            }
            setConversations(prev =>
                prev.map(c => c._id === conversationId ? { ...c, status: 'closed' } : c)
            );
            setFilteredConversations(prev =>
                prev.map(c => c._id === conversationId ? { ...c, status: 'closed' } : c)
            );
        };

        const handleConversationReopened = ({ conversationId }) => {
            if (selectedConvo?._id === conversationId) {
                setSelectedConvo(prev => ({ ...prev, status: 'open' }));
            }
            setConversations(prev =>
                prev.map(c => c._id === conversationId ? { ...c, status: 'open' } : c)
            );
            setFilteredConversations(prev =>
                prev.map(c => c._id === conversationId ? { ...c, status: 'open' } : c)
            );
        };

        const handleConversationDeleted = ({ conversationId }) => {
            setConversations(prev => prev.filter(c => c._id !== conversationId));
            setFilteredConversations(prev => prev.filter(c => c._id !== conversationId));
            if (selectedConvo?._id === conversationId) {
                setSelectedConvo(null);
                setMessages([]);
            }
        };

        const handleUserTyping = ({ conversationId }) => {
            if (selectedConvo?._id === conversationId) {
                setIsTyping(true);
                setTimeout(() => setIsTyping(false), 3000);
            }
        };

        socket.on('chatNeedsAttention', handleChatAttention);
        socket.on('adminMessageSent', handleAdminMessageSent);
        socket.on('newUserMessage', handleNewUserMessage);
        socket.on('conversationClosed', handleConversationClosed);
        socket.on('conversationReopened', handleConversationReopened);
        socket.on('conversationDeleted', handleConversationDeleted);
        socket.on('userTyping', handleUserTyping);

        return () => {
            socket.off('chatNeedsAttention', handleChatAttention);
            socket.off('adminMessageSent', handleAdminMessageSent);
            socket.off('newUserMessage', handleNewUserMessage);
            socket.off('conversationClosed', handleConversationClosed);
            socket.off('conversationReopened', handleConversationReopened);
            socket.off('conversationDeleted', handleConversationDeleted);
            socket.off('userTyping', handleUserTyping);
            socket.emit('leaveAdminRoom');
        };
    }, [fetchConversations, selectedConvo]);

    useEffect(() => {
        if (messages.length > 0 || isTyping) {
            if (chatContainerRef.current) {
                chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                console.log('Scrolled to end on update:', messages.length, isTyping);
            }
        }
    }, [messages, isTyping]);

    const toggleDrawer = () => {
        setDrawerOpen(!drawerOpen);
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: 'background.default' }}>
                <CircularProgress size={60} thickness={4} />
            </Box>
        );
    }

    return (
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
            <AppBar position="fixed" elevation={1} sx={{ bgcolor: 'primary.main', zIndex: 1201 }}>
                <Toolbar>
                    <IconButton edge="start" color="inherit" onClick={() => navigate('/admin/dashboard')} sx={{ mr: 1 }}>
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 500 }}>
                        Admin Chat
                    </Typography>
                    <IconButton color="inherit" onClick={toggleDrawer} sx={{ display: { sm: 'none' } }}>
                        <MenuIcon />
                    </IconButton>
                </Toolbar>
            </AppBar>
            <Box sx={{ flexGrow: 1, display: 'flex', mt: '64px', overflow: 'hidden' }}>
                <Drawer
                    variant="temporary"
                    open={drawerOpen}
                    onClose={toggleDrawer}
                    sx={{
                        display: { xs: 'block', sm: 'none' },
                        '& .MuiDrawer-paper': {
                            width: 'min(80vw, 300px)',
                            bgcolor: 'background.paper',
                            borderRight: 1,
                            borderColor: 'divider',
                            overflowY: 'visible'
                        }
                    }}
                >
                    <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
                        <Typography variant="h6">Conversations</Typography>
                    </Box>
                    <TextField
                        fullWidth
                        variant="outlined"
                        size="small"
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={handleSearch}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            )
                        }}
                        sx={{ mx: 2, mt: 2, mb: 1, maxWidth: '260px' }}
                    />
                    {error && <Alert severity="error" sx={{ mx: 2, mb: 2, maxWidth: '260px' }}>{error}</Alert>}
                    <List sx={{ flexGrow: 1 }}>
                        {filteredConversations.map((convo) => (
                            <ListItemButton
                                key={convo._id}
                                selected={selectedConvo?._id === convo._id}
                                onClick={() => handleSelectConversation(convo)}
                                disabled={!convo.userId}
                                sx={{
                                    py: 1,
                                    px: 2,
                                    '&.Mui-selected': { bgcolor: 'primary.light', color: 'white' },
                                    '&.Mui-selected:hover': { bgcolor: 'primary.dark' }
                                }}
                            >
                                <ListItemAvatar>
                                    <Avatar sx={{ bgcolor: convo.status === 'needs_attention' ? 'error.main' : 'primary.main', width: 36, height: 36 }}>
                                        {convo.userId?.name?.charAt(0) || '?'}
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={convo.userId?.name || 'Unknown User'}
                                    secondary={convo.userId?.email || 'No email'}
                                    primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 'medium', noWrap: false }}
                                    secondaryTypographyProps={{ fontSize: '0.8rem', color: 'text.secondary', noWrap: false }}
                                />
                                <Chip
                                    label={convo.status}
                                    size="small"
                                    color={convo.status === 'closed' ? 'default' : convo.status === 'needs_attention' ? 'error' : 'primary'}
                                    sx={{ fontSize: '0.75rem' }}
                                />
                                {convo.status === 'needs_attention' && <MarkChatUnreadIcon color="error" sx={{ ml: 1, fontSize: '1.2rem' }} />}
                            </ListItemButton>
                        ))}
                    </List>
                </Drawer>
                <Box
                    component={Paper}
                    elevation={0}
                    sx={{
                        flexGrow: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        height: 'calc(100vh - 64px)',
                        borderRadius: 0,
                        bgcolor: 'background.paper'
                    }}
                >
                    <Grid container sx={{ flexGrow: 1, flexWrap: 'nowrap' }}>
                        <Grid
                            item
                            xs={12}
                            sm={4}
                            md={3}
                            sx={{
                                borderRight: { sm: 1 },
                                borderColor: 'divider',
                                display: { xs: 'none', sm: 'block' },
                                width: { sm: '300px' },
                                minWidth: '300px',
                                bgcolor: 'background.paper',
                                overflowY: 'visible'
                            }}
                        >
                            <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white', position: 'sticky', top: 0, zIndex: 1 }}>
                                <Typography variant="h6">Conversations</Typography>
                            </Box>
                            <TextField
                                fullWidth
                                variant="outlined"
                                size="small"
                                placeholder="Search by name or email..."
                                value={searchTerm}
                                onChange={handleSearch}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon />
                                        </InputAdornment>
                                    )
                                }}
                                sx={{ mx: 2, mt: 2, mb: 1, maxWidth: '260px' }}
                            />
                            {error && <Alert severity="error" sx={{ mx: 2, mb: 2, maxWidth: '260px' }}>{error}</Alert>}
                            <List sx={{ flexGrow: 1 }}>
                                {filteredConversations.map((convo) => (
                                    <ListItemButton
                                        key={convo._id}
                                        selected={selectedConvo?._id === convo._id}
                                        onClick={() => handleSelectConversation(convo)}
                                        disabled={!convo.userId}
                                        sx={{
                                            py: 1,
                                            px: 2,
                                            '&.Mui-selected': { bgcolor: 'primary.light', color: 'white' },
                                            '&.Mui-selected:hover': { bgcolor: 'primary.dark' }
                                        }}
                                    >
                                        <ListItemAvatar>
                                            <Avatar sx={{ bgcolor: convo.status === 'needs_attention' ? 'error.main' : 'primary.main', width: 36, height: 36 }}>
                                                {convo.userId?.name?.charAt(0) || '?'}
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={convo.userId?.name || 'Unknown User'}
                                            secondary={convo.userId?.email || 'No email'}
                                            primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 'medium', noWrap: false }}
                                            secondaryTypographyProps={{ fontSize: '0.8rem', color: 'text.secondary', noWrap: false }}
                                        />
                                        <Chip
                                            label={convo.status}
                                            size="small"
                                            color={convo.status === 'closed' ? 'default' : convo.status === 'needs_attention' ? 'error' : 'primary'}
                                            sx={{ fontSize: '0.75rem' }}
                                        />
                                        {convo.status === 'needs_attention' && <MarkChatUnreadIcon color="error" sx={{ ml: 1, fontSize: '1.2rem' }} />}
                                    </ListItemButton>
                                ))}
                            </List>
                        </Grid>
                        <Grid
                            item
                            xs={12}
                            sm={8}
                            md={9}
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                height: 'calc(100vh - 64px)',
                                overflow: 'hidden'
                            }}
                        >
                            {selectedConvo ? (
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        height: '100%'
                                    }}
                                    ref={chatContainerRef}
                                    className="chat-container"
                                >
                                    <Box sx={{
                                        p: 2,
                                        borderBottom: 1,
                                        borderColor: 'divider',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        bgcolor: 'grey.50',
                                        position: 'sticky',
                                        top: 0,
                                        zIndex: 1
                                    }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <IconButton
                                                color="primary"
                                                onClick={() => setSelectedConvo(null)}
                                                sx={{ display: { xs: 'inline-flex', sm: 'none' } }}
                                            >
                                                <ArrowBackIcon />
                                            </IconButton>
                                            <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                                                {selectedConvo.userId?.name || 'Unknown User'}
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                {selectedConvo.userId?.email || 'No email'}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Chip
                                                label={selectedConvo.status}
                                                size="small"
                                                color={selectedConvo.status === 'closed' ? 'default' : selectedConvo.status === 'needs_attention' ? 'error' : 'primary'}
                                            />
                                            {selectedConvo.status !== 'closed' ? (
                                                <Button
                                                    variant="outlined"
                                                    color="error"
                                                    size="small"
                                                    startIcon={<CloseIcon />}
                                                    onClick={handleCloseConversation}
                                                    sx={{ textTransform: 'none' }}
                                                >
                                                    Close
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="outlined"
                                                    color="success"
                                                    size="small"
                                                    startIcon={<ReopenIcon />}
                                                    onClick={handleReopenConversation}
                                                    sx={{ textTransform: 'none' }}
                                                >
                                                    Reopen
                                                </Button>
                                            )}
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                size="small"
                                                startIcon={<DeleteIcon />}
                                                onClick={() => handleDeleteConversation(selectedConvo._id)}
                                                sx={{ textTransform: 'none' }}
                                            >
                                                Delete
                                            </Button>
                                        </Box>
                                    </Box>
                                    <Box
                                        sx={{
                                            flexGrow: 1,
                                            p: 2,
                                            overflowY: 'auto',
                                            bgcolor: 'white',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 1
                                        }}
                                        className="chat-messages"
                                    >
                                        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                                        {messages.length === 0 && !error && (
                                            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', mt: 4 }}>
                                                No messages yet.
                                            </Typography>
                                        )}
                                        {messages.map((msg, index) => (
                                            <MessageBubble key={`${msg.createdAt}-${msg.text}-${index}`} message={msg} />
                                        ))}
                                        {isTyping && (
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, alignSelf: 'flex-start', mb: 2, ml: 2 }}>
                                                <CircularProgress size={16} thickness={5} />
                                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                    Customer is typing...
                                                </Typography>
                                            </Box>
                                        )}
                                    </Box>
                                    {selectedConvo.status !== 'closed' && (
                                        <Box
                                            component="form"
                                            onSubmit={handleSendMessage}
                                            sx={{
                                                p: 2,
                                                borderTop: 1,
                                                borderColor: 'divider',
                                                bgcolor: 'grey.50',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                position: 'sticky',
                                                bottom: 0,
                                                zIndex: 1
                                            }}
                                        >
                                            <TextField
                                                fullWidth
                                                variant="outlined"
                                                size="small"
                                                placeholder="Type your message as an admin..."
                                                value={newMessage}
                                                onChange={handleTyping}
                                                sx={{ bgcolor: 'white', borderRadius: 1 }}
                                            />
                                            <IconButton type="submit" color="primary" disabled={!newMessage.trim()}>
                                                <SendIcon />
                                            </IconButton>
                                        </Box>
                                    )}
                                </Box>
                            ) : (
                                <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: 'white' }}>
                                    <Typography variant="h6" color="text.secondary">
                                        Select a conversation to start chatting
                                    </Typography>
                                </Box>
                            )}
                        </Grid>
                    </Grid>
                </Box>
            </Box>
        </Box>
    );
};

export default AdminChat;





































































/* import React, { useEffect, useState, useCallback, useRef } from 'react';
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

export default AdminChat; */
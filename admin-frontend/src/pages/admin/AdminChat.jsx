import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import {
    Box, Paper, Typography, List, ListItemButton, ListItemAvatar, Avatar,
    ListItemText, CircularProgress, TextField, IconButton, Alert, Chip,
    AppBar, Toolbar, Drawer, InputAdornment, Tooltip, Stack, Menu, MenuItem,
    CssBaseline, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button
} from '@mui/material';
import {
    Send as SendIcon, MarkChatUnread as MarkChatUnreadIcon, Close as CloseIcon,
    Restore as RestoreIcon, DeleteOutline as DeleteIcon, Search as SearchIcon,
    ArrowBack as ArrowBackIcon, Menu as MenuIcon, MoreVert as MoreVertIcon,
    DeleteSweep as ClearChatIcon
} from '@mui/icons-material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { blue, grey, red, green } from '@mui/material/colors';
import AdminLoadingScreen from '../../Components/AdminLoadingScreen';

const modernTheme = createTheme({
    palette: {
        primary: {
            main: blue[600],
            light: blue[50],
            contrastText: '#ffffff',
        },
        secondary: {
            main: grey[800],
        },
        background: {
            default: '#f4f7f9',
            paper: '#ffffff',
        },
        text: {
            primary: grey[900],
            secondary: grey[600],
        },
        error: {
            main: red.A400,
        },
        success: {
            main: green[600],
        },
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h6: {
            fontWeight: 600,
        },
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    borderRadius: 8,
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    fontWeight: 500,
                }
            }
        }
    },
});

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const socket = io(API_URL);

const MessageBubble = React.memo(({ message }) => {
    const isUser = message.sender === 'user';
    const isAdmin = message.text.startsWith('Admin:');
    const senderName = isUser ? 'Customer' : (isAdmin ? 'Admin' : 'Assistant');

    return (
        <Stack
            direction="column"
            alignItems={isUser ? 'flex-start' : 'flex-end'}
            sx={{ mb: 2, px: 1 }}
        >
            <Paper
                elevation={1}
                sx={{
                    p: 1.5,
                    maxWidth: '75%',
                    borderRadius: isUser ? '20px 20px 20px 5px' : '20px 20px 5px 20px',
                    bgcolor: isUser ? 'background.paper' : 'primary.main',
                    color: isUser ? 'text.primary' : 'primary.contrastText',
                    wordBreak: 'break-word',
                    boxShadow: '0px 2px 5px rgba(0,0,0,0.05)',
                }}
            >
                <Typography variant="body2">{message.text}</Typography>
            </Paper>
            <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, px: 1 }}>
                {senderName} • {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Typography>
        </Stack>
    );
});

const ConversationList = React.memo(({ conversations, selectedConvo, handleSelectConversation, searchTerm, handleSearch, error }) => {
    const filteredConversations = useMemo(() => {
        if (!searchTerm) return conversations;
        return conversations.filter(convo =>
            (convo.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || convo.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [conversations, searchTerm]);

    const getStatusChipProps = (status) => {
        switch (status) {
            case 'needs_attention': return { color: 'error', variant: 'filled' };
            case 'open': return { color: 'success', variant: 'outlined' };
            case 'closed': return { color: 'default', variant: 'outlined' };
            default: return { color: 'default', variant: 'outlined' };
        }
    };

    return (
        <Stack sx={{ height: '100%', bgcolor: 'background.paper' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Conversations</Typography>
                <TextField
                    fullWidth
                    variant="outlined"
                    size="small"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={handleSearch}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon color="action" />
                            </InputAdornment>
                        ),
                        sx: { borderRadius: '25px', bgcolor: 'background.default' }
                    }}
                />
            </Box>
            {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}
            <List sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>
                {filteredConversations.length > 0 ? filteredConversations.map((convo) => (
                    <ListItemButton
                        key={convo._id}
                        selected={selectedConvo?._id === convo._id}
                        onClick={() => handleSelectConversation(convo)}
                        disabled={!convo.userId}
                        sx={{
                            borderRadius: 2,
                            mb: 1,
                            '&.Mui-selected': {
                                bgcolor: 'primary.light',
                                '&:hover': { bgcolor: 'primary.light' },
                            },
                        }}
                    >
                        <ListItemAvatar>
                            <Avatar sx={{ bgcolor: convo.status === 'needs_attention' ? 'error.main' : 'primary.main' }}>
                                {convo.userId?.name?.charAt(0).toUpperCase() || '?'}
                            </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                            primary={convo.userId?.name || 'Unknown User'}
                            secondary={convo.userId?.email || 'No email'}
                            primaryTypographyProps={{ fontWeight: 'medium', noWrap: true }}
                            secondaryTypographyProps={{ noWrap: true }}
                        />
                        <Stack alignItems="flex-end">
                            <Chip
                                label={convo.status.replace('_', ' ')}
                                size="small"
                                {...getStatusChipProps(convo.status)}
                            />
                            {convo.status === 'needs_attention' && <MarkChatUnreadIcon color="error" sx={{ fontSize: '1rem', mt: 0.5 }} />}
                        </Stack>
                    </ListItemButton>
                )) : (
                    <Typography sx={{ textAlign: 'center', p: 3, color: 'text.secondary' }}>No conversations found.</Typography>
                )}
            </List>
        </Stack>
    );
});

const ChatWindow = ({
    selectedConvo,
    messages,
    messagesLoading,
    error,
    isTyping,
    newMessage,
    handleTyping,
    handleSendMessage,
    handleCloseConversation,
    handleReopenConversation,
    handleDeleteConversation,
    handleClearChatHistory,
}) => {
    const chatContainerRef = useRef(null);
    const [anchorEl, setAnchorEl] = useState(null);

    useEffect(() => {
        if (!messagesLoading && chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages, isTyping, messagesLoading]);

    const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
    const handleMenuClose = () => setAnchorEl(null);

    const menuAction = (action) => {
        action();
        handleMenuClose();
    };

    if (!selectedConvo) {
        return (
            <Stack flexGrow={1} justifyContent="center" alignItems="center" sx={{ bgcolor: 'background.default', p: 4 }}>
                <Typography variant="h6" color="text.secondary">Select a conversation</Typography>
                <Typography color="text.secondary">Choose from the list to start chatting.</Typography>
            </Stack>
        );
    }

    return (
        <Stack sx={{ height: '100%', bgcolor: 'background.paper', overflow: 'hidden' }}>
            <Toolbar sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Stack direction="row" alignItems="center" spacing={2} flexGrow={1}>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>{selectedConvo.userId?.name?.charAt(0).toUpperCase() || '?'}</Avatar>
                    <Box>
                        <Typography variant="h6" noWrap>{selectedConvo.userId?.name || 'Unknown User'}</Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>{selectedConvo.userId?.email || 'No email'}</Typography>
                    </Box>
                </Stack>
                <IconButton onClick={handleMenuOpen}>
                    <MoreVertIcon />
                </IconButton>
                <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
                    {selectedConvo.status !== 'closed' ? (
                        <MenuItem onClick={() => menuAction(handleCloseConversation)}>
                            <CloseIcon sx={{ mr: 1 }} fontSize="small" /> Close Conversation
                        </MenuItem>
                    ) : (
                        <MenuItem onClick={() => menuAction(handleReopenConversation)}>
                            <RestoreIcon sx={{ mr: 1 }} fontSize="small" /> Reopen Conversation
                        </MenuItem>
                    )}
                    <MenuItem onClick={() => menuAction(handleClearChatHistory)}>
                        <ClearChatIcon sx={{ mr: 1 }} fontSize="small" /> Clear History
                    </MenuItem>
                    <MenuItem onClick={() => menuAction(() => handleDeleteConversation(selectedConvo._id))} sx={{color: 'error.main'}}>
                        <DeleteIcon sx={{ mr: 1 }} fontSize="small" /> Delete Conversation
                    </MenuItem>
                </Menu>
            </Toolbar>

            <Box
                ref={chatContainerRef}
                sx={{
                    flexGrow: 1,
                    overflowY: 'auto',
                    bgcolor: 'background.default',
                    position: 'relative',
                }}
            >
                {messagesLoading && (
                    <Stack
                        sx={{
                            position: 'absolute',
                            top: 0, left: 0, width: '100%', height: '100%',
                            alignItems: 'center', justifyContent: 'center',
                            bgcolor: 'rgba(244, 247, 249, 0.8)',
                            zIndex: 10,
                            backdropFilter: 'blur(2px)',
                        }}
                    >
                        <CircularProgress />
                    </Stack>
                )}
                
                <Box sx={{ p: 3 }}>
                    {error ? (
                        <Alert severity="error">{error}</Alert>
                    ) : messages.length === 0 && !messagesLoading ? (
                        <Typography sx={{ textAlign: 'center', color: 'text.secondary' }}>No messages yet.</Typography>
                    ) : (
                        messages.map((msg, index) => <MessageBubble key={`${msg._id}-${index}`} message={msg} />)
                    )}
                    {isTyping && (
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ position: 'sticky', bottom: 0 }}>
                            <CircularProgress size={16} />
                            <Typography variant="caption" color="text.secondary">Customer is typing...</Typography>
                        </Stack>
                    )}
                </Box>
            </Box>

            {selectedConvo.status !== 'closed' && (
                <Paper
                    component="form"
                    onSubmit={handleSendMessage}
                    elevation={2}
                    sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper', borderRadius: 0 }}
                >
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <TextField
                            fullWidth
                            variant="outlined"
                            size="small"
                            placeholder="Type your message as an admin..."
                            value={newMessage}
                            onChange={handleTyping}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '20px' } }}
                        />
                        <Tooltip title="Send Message">
                            <span>
                                <IconButton type="submit" color="primary" disabled={!newMessage.trim()} sx={{bgcolor: 'primary.main', color: 'white', '&:hover': {bgcolor: 'primary.dark'}}}>
                                    <SendIcon />
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Stack>
                </Paper>
            )}
        </Stack>
    );
};

const AdminChat = () => {
    const { token } = useSelector((state) => state.auth);
    const navigate = useNavigate();
    const [conversations, setConversations] = useState([]);
    const [selectedConvo, setSelectedConvo] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isTyping, setIsTyping] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [confirmProps, setConfirmProps] = useState({ open: false, title: '', message: '', onConfirm: () => {} });

    const fetchConversations = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await axios.get(`${API_URL}/api/chat/admin/all`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const validConversations = data.filter(convo => convo.userId !== null);
            setConversations(validConversations);
        } catch (error) {
            setError('Failed to fetch conversations.');
        } finally {
            setLoading(false);
        }
    }, [token]);

    const handleSelectConversation = useCallback(async (conversation) => {
        if (!conversation.userId || selectedConvo?._id === conversation._id) return;
        setSelectedConvo(conversation);
        setMessagesLoading(true);
        setError(null);
        setDrawerOpen(false);

        try {
            // If the conversation has 'needs_attention' status, update it to 'open'
            if (conversation.status === 'needs_attention') {
                await axios.post(`${API_URL}/api/chat/admin/reopen`, { conversationId: conversation._id }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setConversations(prev =>
                    prev.map(c => c._id === conversation._id ? { ...c, status: 'open' } : c)
                );
                setSelectedConvo({ ...conversation, status: 'open' });
            }

            const { data } = await axios.get(`${API_URL}/api/chat/admin/conversations/${conversation._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessages(data);
        } catch (error) {
            setError('Failed to fetch messages.');
            setMessages([]);
        } finally {
            setMessagesLoading(false);
        }
    }, [selectedConvo, token]);

    const handleStatusChange = useCallback(async (endpoint, status) => {
        if (!selectedConvo) return;
        try {
            await axios.post(`${API_URL}/api/chat/admin/${endpoint}`, { conversationId: selectedConvo._id }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const updatedConvo = { ...selectedConvo, status };
            setSelectedConvo(updatedConvo);
            setConversations(prev =>
                prev.map(c => c._id === selectedConvo._id ? updatedConvo : c)
            );
        } catch (err) {
            setError(`Failed to ${endpoint} conversation.`);
        }
    }, [selectedConvo, token]);

    const handleCloseConversation = () => handleStatusChange('close', 'closed');
    const handleReopenConversation = () => handleStatusChange('reopen', 'open');

    const handleDeleteConversation = useCallback((conversationId) => {
        setConfirmProps({
            open: true,
            title: 'Delete Conversation?',
            message: 'Are you sure you want to permanently delete this conversation? This action cannot be undone.',
            onConfirm: async () => {
                try {
                    await axios.post(`${API_URL}/api/chat/admin/delete`, { conversationId }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setConversations(prev => prev.filter(c => c._id !== conversationId));
                    if (selectedConvo?._id === conversationId) {
                        setSelectedConvo(null);
                        setMessages([]);
                    }
                } catch (error) {
                    setError('Failed to delete conversation.');
                }
                setConfirmProps({ open: false });
            }
        });
    }, [selectedConvo, token]);

    const handleClearChatHistory = useCallback(() => {
        if (!selectedConvo) return;
        setConfirmProps({
            open: true,
            title: 'Clear Chat History?',
            message: 'This will permanently remove all messages from this conversation, but the conversation itself will remain. This action cannot be undone.',
            onConfirm: async () => {
                try {
                    await axios.delete(`${API_URL}/api/chat/admin/clear/${selectedConvo._id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setMessages([]);
                } catch (error) {
                    setError('Failed to clear chat history.');
                }
                setConfirmProps({ open: false });
            }
        });
    }, [selectedConvo, token]);

    const handleSendMessage = useCallback(async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedConvo || selectedConvo.status === 'closed') return;
        
        const optimisticMessage = {
            _id: `optimistic-${Date.now()}`,
            sender: 'model',
            text: `Admin: ${newMessage}`,
            isOptimistic: true,
            createdAt: new Date().toISOString()
        };
        setMessages(prev => [...prev, optimisticMessage]);
        setNewMessage('');
        setError(null);

        try {
            await axios.post(`${API_URL}/api/chat/admin/send`, 
                { conversationId: selectedConvo._id, text: newMessage },
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch (error) {
            setError('Failed to send message.');
            setMessages(prev => prev.filter(msg => !msg.isOptimistic));
        }
    }, [newMessage, selectedConvo, token]);
    
    const handleTyping = (e) => setNewMessage(e.target.value);
    const handleSearch = (e) => setSearchTerm(e.target.value);
    
    useEffect(() => {
        fetchConversations();
        socket.emit('joinAdminRoom');

        const updateConversationInList = (updatedConvo) => {
            if (updatedConvo.userId) {
                setConversations(prev => [
                    updatedConvo,
                    ...prev.filter(c => c._id !== updatedConvo._id)
                ]);
            }
        };

        const handleNewMessage = ({ conversationId, message }) => {
            if (selectedConvo?._id === conversationId) {
                setMessages(prev => {
                    const withoutOptimistic = prev.filter(msg => !msg.isOptimistic);
                    return [...withoutOptimistic, message];
                });
            }
        };

        const handleConversationStatusUpdate = ({ conversationId, status }) => {
            if (selectedConvo?._id === conversationId) {
                setSelectedConvo(prev => ({ ...prev, status }));
            }
            setConversations(prev => prev.map(c => c._id === conversationId ? { ...c, status } : c));
        };
        
        const handleUserTyping = ({ conversationId }) => {
            if (selectedConvo?._id === conversationId) {
                setIsTyping(true);
                const timer = setTimeout(() => setIsTyping(false), 3000);
                return () => clearTimeout(timer);
            }
        };

        socket.on('chatNeedsAttention', updateConversationInList);
        socket.on('adminMessageSent', handleNewMessage);
        socket.on('newUserMessage', handleNewMessage);
        socket.on('conversationClosed', ({ conversationId }) => handleConversationStatusUpdate({ conversationId, status: 'closed'}));
        socket.on('conversationReopened', ({ conversationId }) => handleConversationStatusUpdate({ conversationId, status: 'open'}));
        socket.on('userTyping', handleUserTyping);

        return () => {
            socket.off('chatNeedsAttention');
            socket.off('adminMessageSent');
            socket.off('newUserMessage');
            socket.off('conversationClosed');
            socket.off('conversationReopened');
            socket.off('userTyping');
        };
    }, [fetchConversations, selectedConvo]);
    
  if (loading) {
  return <AdminLoadingScreen message="Loading Conversations..." />;
}
    const conversationListComponent = (
        <ConversationList
            conversations={conversations}
            selectedConvo={selectedConvo}
            handleSelectConversation={handleSelectConversation}
            searchTerm={searchTerm}
            handleSearch={handleSearch}
            error={error}
        />
    );
    
    return (
        <ThemeProvider theme={modernTheme}>
            <CssBaseline />
            <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
                <AppBar position="static" elevation={1} sx={{ bgcolor: 'primary.main' }}>
                    <Toolbar>
                        <IconButton edge="start" color="inherit" onClick={() => navigate('/admin/dashboard')} sx={{ mr: 1 }}><ArrowBackIcon /></IconButton>
                        <Typography variant="h6" sx={{ flexGrow: 1 }}>Admin Chat</Typography>
                        <IconButton color="inherit" onClick={() => setDrawerOpen(true)} sx={{ display: { sm: 'none' } }}><MenuIcon /></IconButton>
                    </Toolbar>
                </AppBar>
                
                <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
                    <Drawer
                        variant="temporary"
                        open={drawerOpen}
                        onClose={() => setDrawerOpen(false)}
                        sx={{
                            display: { xs: 'block', sm: 'none' },
                            '& .MuiDrawer-paper': { width: '80%', maxWidth: 320 },
                        }}
                    >
                        {conversationListComponent}
                    </Drawer>
                    <Box
                        sx={{
                            width: 340,
                            flexShrink: 0,
                            display: { xs: 'none', sm: 'block' },
                            borderRight: 1,
                            borderColor: 'divider',
                        }}
                    >
                        {conversationListComponent}
                    </Box>

                    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                        <ChatWindow
                            selectedConvo={selectedConvo}
                            messages={messages}
                            messagesLoading={messagesLoading}
                            error={error}
                            isTyping={isTyping}
                            newMessage={newMessage}
                            handleTyping={handleTyping}
                            handleSendMessage={handleSendMessage}
                            handleCloseConversation={handleCloseConversation}
                            handleReopenConversation={handleReopenConversation}
                            handleDeleteConversation={handleDeleteConversation}
                            handleClearChatHistory={handleClearChatHistory}
                        />
                    </Box>
                </Box>
            </Box>
            <Dialog
                open={confirmProps.open}
                onClose={() => setConfirmProps({ open: false })}
            >
                <DialogTitle>{confirmProps.title}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{confirmProps.message}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmProps({ open: false })}>Cancel</Button>
                    <Button onClick={confirmProps.onConfirm} color="error" autoFocus>
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
        </ThemeProvider>
    );
};

export default AdminChat;

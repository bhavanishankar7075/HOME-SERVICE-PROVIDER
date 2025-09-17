// src/components/ChatWidget.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Box, Paper, Typography, TextField, IconButton, Fab, Avatar } from '@mui/material';
import { Send as SendIcon, Chat as ChatIcon, Close as CloseIcon } from '@mui/icons-material';
import { useChat } from '../context/ChatContext';

const MessageBubble = ({ message }) => {
    const isUser = message.sender === 'user';
    return (
        <Box sx={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', mb: 2 }}>
            <Paper
                elevation={2}
                sx={{
                    p: 1.5,
                    borderRadius: isUser ? '20px 20px 5px 20px' : '20px 20px 20px 5px',
                    bgcolor: isUser ? 'primary.main' : 'grey.200',
                    color: isUser ? 'white' : 'black',
                    maxWidth: '80%',
                }}
            >
                <Typography variant="body1">{message.text}</Typography>
            </Paper>
        </Box>
    );
};

const ChatWidget = () => {
    const { isChatOpen, setIsChatOpen, messages, sendMessage, isLoading } = useChat();
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleSend = () => {
        if (newMessage.trim()) {
            sendMessage(newMessage);
            setNewMessage('');
        }
    };

    return (
        <>
            <Fab
                color="primary"
                onClick={() => setIsChatOpen(true)}
                sx={{ position: 'fixed', bottom: 32, right: 32, zIndex: 1300, display: isChatOpen ? 'none' : 'flex' }}
            >
                <ChatIcon />
            </Fab>

            <Paper
                elevation={8}
                sx={{
                    position: 'fixed',
                    bottom: 32,
                    right: 32,
                    width: { xs: 'calc(100% - 32px)', sm: 370 },
                    height: { xs: 'calc(100% - 96px)', sm: 500 },
                    zIndex: 1300,
                    display: isChatOpen ? 'flex' : 'none',
                    flexDirection: 'column',
                    borderRadius: 4,
                    transform: isChatOpen ? 'translateY(0)' : 'translateY(100px)',
                    opacity: isChatOpen ? 1 : 0,
                    transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
                }}
            >
                <Box sx={{
                    p: 2,
                    bgcolor: 'primary.main',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <Typography variant="h6">ServiceHub Assistant</Typography>
                    <IconButton onClick={() => setIsChatOpen(false)} sx={{ color: 'white' }}>
                        <CloseIcon />
                    </IconButton>
                </Box>
                <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto' }}>
                    {messages.map((msg, index) => <MessageBubble key={index} message={msg} />)}
                    {isLoading && (
                        <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                            <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'grey.600' }}>
                                Assistant is typing...
                            </Typography>
                        </Box>
                    )}
                    <div ref={messagesEndRef} />
                </Box>
                <Box component="form" onSubmit={(e) => { e.preventDefault(); handleSend(); }} sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', alignItems: 'center' }}>
                    <TextField
                        fullWidth
                        variant="outlined"
                        size="small"
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                    />
                    <IconButton color="primary" type="submit">
                        <SendIcon />
                    </IconButton>
                </Box>
            </Paper>
        </>
    );
};

export default ChatWidget;
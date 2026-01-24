import React, { useState, useEffect, useRef } from 'react';
import { Box, Paper, Typography, TextField, IconButton, Fab, Stack, Avatar, Badge } from '@mui/material';
import { keyframes } from '@mui/system';
import { Send as SendIcon, Chat as ChatIcon, Close as CloseIcon } from '@mui/icons-material';
import { useChat } from '../context/ChatContext'; 
import logo from '../assets/service-hub-logo.png'; 

const bounce = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
`;

const ping = keyframes`
  75%, 100% {
    transform: scale(2.5);
    opacity: 0;
  }
`;

const TypingIndicator = () => (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', p: 1.5 }}>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'grey.400', animation: `${bounce} 1s infinite 0s` }} />
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'grey.400', animation: `${bounce} 1s infinite 0.2s` }} />
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'grey.400', animation: `${bounce} 1s infinite 0.4s` }} />
    </Stack>
);

const MessageBubble = React.memo(({ message }) => {
    const isUser = message.sender === 'user';
    const isAdmin = message.text.startsWith('Admin:');
    const senderName = isUser ? 'You' : (isAdmin ? 'Admin' : 'ServiceHub Assistant');

    return (
        <Stack direction="column" alignItems={isUser ? 'flex-end' : 'flex-start'} sx={{ mb: 2 }}>
            <Paper
                elevation={0}
                sx={{
                    p: '10px 14px',
                    borderRadius: isUser ? '20px 20px 5px 20px' : '20px 20px 20px 5px',
                    bgcolor: isUser ? 'primary.main' : '#E5E5EA',
                    color: isUser ? 'white' : 'black',
                    maxWidth: '85%',
                    wordBreak: 'break-word',
                }}
            >
                <Typography variant="body1">{isAdmin ? message.text.replace('Admin:', '').trim() : message.text}</Typography>
            </Paper>
            <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, px: 1 }}>
                {senderName} • {message.createdAt ? new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </Typography>
        </Stack>
    );
});

const ChatWidget = () => {
    const { isChatOpen, setIsChatOpen, hasNewMessage, setHasNewMessage, messages, sendMessage, isLoading, conversationStatus, isTyping, adminActive } = useChat();
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading, isTyping]);
    
    const handleOpenChat = () => {
        if (hasNewMessage) {
            setHasNewMessage(false);
        }
        setIsChatOpen(true);
    };

    const handleSend = () => {
        if (newMessage.trim()) {
            sendMessage(newMessage);
            setNewMessage('');
        }
    };

    const shouldShowTypingIndicator = isLoading || isTyping;

    return (
        <>
            <Badge
                color="error"
                variant="dot"
                invisible={!hasNewMessage || isChatOpen}
                sx={{
                    position: 'fixed',
                    bottom: 32,
                    right: 32,
                    zIndex: 1300,
                    display: isChatOpen ? 'none' : 'block',
                    '& .MuiBadge-dot': {
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        border: '2px solid white',
                        '&::after': {
                            position: 'absolute',
                            top: '-1px',
                            left: '-1px',
                            width: '100%',
                            height: '100%',
                            borderRadius: '50%',
                            animation: `${ping} 1.5s infinite ease-out`,
                            content: '""',
                            border: '1px solid currentColor',
                        },
                    },
                }}
            >
                <Fab
                    color="primary"
                    onClick={handleOpenChat}
                    sx={{
                        boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.25)',
                        background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                    }}
                >
                    <ChatIcon />
                </Fab>
            </Badge>

            <Paper
                elevation={0}
                sx={{
                    position: 'fixed',
                    bottom: { xs: 0, sm: 32 },
                    right: { xs: 0, sm: 32 },
                    width: { xs: '100%', sm: 380 },
                    height: { xs: '100%', sm: 'calc(100% - 96px)', md: 600 },
                    maxHeight: { xs: '100%', sm: 600 },
                    zIndex: 1301,
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: { xs: 0, sm: '16px' },
                    boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.15)',
                    transform: isChatOpen ? 'scale(1)' : 'scale(0.9)',
                    opacity: isChatOpen ? 1 : 0,
                    transformOrigin: 'bottom right',
                    visibility: isChatOpen ? 'visible' : 'hidden',
                    transition: 'transform 0.2s ease-out, opacity 0.2s ease-out, visibility 0.2s',
                    bgcolor: 'background.paper',
                    overflow: 'hidden',
                }}
            >
                {/* Chat Header */}
                <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{
                        p: 2,
                        bgcolor: 'primary.main',
                        color: 'white',
                        flexShrink: 0,
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Badge
                            overlap="circular"
                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                            variant="dot"
                            sx={{
                                '& .MuiBadge-dot': {
                                    backgroundColor: '#44b700',
                                    width: 10,
                                    height: 10,
                                    borderRadius: '50%',
                                    border: '2px solid white',
                                },
                            }}
                        >
                            <Avatar src={logo} alt="ServiceHub Logo" />
                        </Badge>
                        <Box>
                            <Typography variant="h6" component="div" sx={{ lineHeight: 1.2 }}>ServiceHub</Typography>
                            <Typography variant="caption">{adminActive ? 'We are here to help!' : 'We typically reply within minutes.'}</Typography>
                        </Box>
                    </Stack>
                    <IconButton onClick={() => setIsChatOpen(false)} sx={{ color: 'white' }}>
                        <CloseIcon />
                    </IconButton>
                </Stack>

                {/* Messages Area */}
                <Box
                    sx={{
                        flexGrow: 1,
                        p: 2,
                        overflowY: 'auto',
                        bgcolor: '#f4f7f9',
                        '&::-webkit-scrollbar': { width: '6px' },
                        '&::-webkit-scrollbar-track': { background: '#f1f1f1' },
                        '&::-webkit-scrollbar-thumb': { background: '#ccc', borderRadius: '3px' },
                        '&::-webkit-scrollbar-thumb:hover': { background: '#aaa' },
                    }}
                >
                    {messages.length === 0 && !shouldShowTypingIndicator && (
                        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', p: 3 }}>
                            Start a conversation with our {adminActive ? 'Admin' : 'Assistant'}! We're happy to help.
                        </Typography>
                    )}
                    {messages.map((msg, index) => (
                        <MessageBubble key={`${msg.createdAt}-${index}`} message={msg} />
                    ))}
                    {shouldShowTypingIndicator && <TypingIndicator />}
                    {conversationStatus === 'closed' && (
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic', textAlign: 'center', mt: 2 }}>
                            This conversation is closed.
                        </Typography>
                    )}
                    <div ref={messagesEndRef} />
                </Box>

                {/* Input Area */}
                <Box
                    component="form"
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    sx={{
                        p: 2,
                        borderTop: 1,
                        borderColor: 'divider',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        bgcolor: 'background.paper',
                        flexShrink: 0,
                    }}
                >
                    <TextField
                        fullWidth
                        variant="outlined"
                        size="small"
                        placeholder={conversationStatus === 'closed' ? 'Ask a new question...' : 'Type a message...'}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        disabled={isLoading}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '20px',
                            },
                        }}
                    />
                    <IconButton
                        color="primary"
                        type="submit"
                        disabled={isLoading || !newMessage.trim()}
                        sx={{
                            bgcolor: 'primary.main',
                            color: 'white',
                            '&:hover': { bgcolor: 'primary.dark' },
                            '&.Mui-disabled': { bgcolor: 'grey.300' }
                        }}
                    >
                        <SendIcon />
                    </IconButton>
                </Box>
            </Paper>
        </>
    );
};

export default ChatWidget;


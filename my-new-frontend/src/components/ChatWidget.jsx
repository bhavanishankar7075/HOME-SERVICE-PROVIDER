import React, { useState, useEffect, useRef } from 'react';
import { Box, Paper, Typography, TextField, IconButton, Fab, Stack, Avatar, Badge } from '@mui/material';
import { keyframes } from '@mui/system';
import { Send as SendIcon, Chat as ChatIcon, Close as CloseIcon } from '@mui/icons-material';
import { useChat } from '../context/ChatContext'; // Your existing context hook
import logo from '../assets/service-hub-logo.png'; // Your existing logo path

// Animation for the typing indicator
const bounce = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
`;

// === NEW ANIMATION FOR A VISIBLE NOTIFICATION DOT ===
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
                    // === VISIBILITY FIX APPLIED HERE ===
                    '& .MuiBadge-dot': {
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        border: '2px solid white',
                        // The animated "ping" effect
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













































































































//main
/* import React, { useState, useEffect, useRef } from 'react';
import { Box, Paper, Typography, TextField, IconButton, Fab } from '@mui/material';
import { Send as SendIcon, Chat as ChatIcon, Close as CloseIcon } from '@mui/icons-material';
import { useChat } from '../context/ChatContext';
import logo from '../assets/service-hub-logo.png'; // Replace with your actual logo path

const MessageBubble = ({ message }) => {
    const isUser = message.sender === 'user';
    const isAdmin = message.text.startsWith('Admin:');
    const senderName = isUser ? 'You' : (isAdmin ? 'Admin' : 'ServiceHub Assistant');

    return (
        <Box sx={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', mb: 2 }}>
            <Box sx={{ maxWidth: '80%' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, ml: 1 }}>
                    {senderName}
                </Typography>
                <Paper
                    elevation={2}
                    sx={{
                        p: 1.5,
                        borderRadius: isUser ? '20px 20px 5px 20px' : '20px 20px 20px 5px',
                        bgcolor: isUser ? 'primary.main' : isAdmin ? 'secondary.main' : 'grey.200',
                        color: isUser ? 'white' : isAdmin ? 'white' : 'black',
                        maxWidth: '100%',
                    }}
                >
                    <Typography variant="body1">{isAdmin ? message.text.replace('Admin:', '').trim() : message.text}</Typography>
                </Paper>
                {message.createdAt && (
                    <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block', textAlign: isUser ? 'right' : 'left' }}>
                        {new Date(message.createdAt).toLocaleTimeString()}
                    </Typography>
                )}
            </Box>
        </Box>
    );
};

const ChatWidget = () => {
    const { isChatOpen, setIsChatOpen, messages, sendMessage, isLoading, conversationStatus, isTyping, adminActive } = useChat();
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading, isTyping]);

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
                    bgcolor: 'background.paper',
                }}
            >
                <Box sx={{
                    p: 2,
                    bgcolor: 'primary.main',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTopLeftRadius: 4,
                    borderTopRightRadius: 4,
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <img src={logo} alt="Home Service Provider" style={{ height: 32, marginRight: 8 }} />
                        <Typography variant="h6">Home Service Provider</Typography>
                    </Box>
                    <IconButton onClick={() => setIsChatOpen(false)} sx={{ color: 'white' }}>
                        <CloseIcon />
                    </IconButton>
                </Box>
                <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto', bgcolor: 'background.default' }}>
                    {messages.length === 0 && (
                        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                            Start a conversation with our {adminActive ? 'Admin' : 'Assistant'}!
                        </Typography>
                    )}
                    {messages.map((msg, index) => (
                        <MessageBubble key={msg.createdAt + msg.text + index} message={msg} />
                    ))}
                    {isLoading && (
                        <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                            <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'grey.600' }}>
                                {adminActive ? 'Admin is typing...' : 'Assistant is typing...'}
                            </Typography>
                        </Box>
                    )}
                    {isTyping && (
                        <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                            <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'grey.600' }}>
                                Admin is typing...
                            </Typography>
                        </Box>
                    )}
                    {conversationStatus === 'closed' && (
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                            <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                                This conversation is closed. You can ask the AI any questions.
                            </Typography>
                        </Box>
                    )}
                    <div ref={messagesEndRef} />
                </Box>
                <Box component="form" onSubmit={(e) => { e.preventDefault(); handleSend(); }} sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', bgcolor: 'grey.100' }}>
                    <TextField
                        fullWidth
                        variant="outlined"
                        size="small"
                        placeholder={conversationStatus === 'closed' ? 'Ask the AI a question...' : adminActive ? 'Message the admin...' : 'Type a message...'}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        sx={{ bgcolor: 'white' }}
                        disabled={isLoading}
                    />
                    <IconButton color="primary" type="submit" disabled={isLoading}>
                        <SendIcon />
                    </IconButton>
                </Box>
            </Paper>
        </>
    );
};

export default ChatWidget; */
























































//main
/* import React, { useState, useEffect, useRef } from 'react';
import { Box, Paper, Typography, TextField, IconButton, Fab } from '@mui/material';
import { Send as SendIcon, Chat as ChatIcon, Close as CloseIcon } from '@mui/icons-material';
import { useChat } from '../context/ChatContext';
import logo from '../assets/service-hub-logo.png'; // Replace with your actual logo path

const MessageBubble = ({ message }) => {
    const isUser = message.sender === 'user';
    const isAdmin = message.text.startsWith('Admin:');
    const senderName = isUser ? 'You' : (isAdmin ? 'Admin' : 'ServiceHub Assistant');

    return (
        <Box sx={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', mb: 2 }}>
            <Box sx={{ maxWidth: '80%' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, ml: 1 }}>
                    {senderName}
                </Typography>
                <Paper
                    elevation={2}
                    sx={{
                        p: 1.5,
                        borderRadius: isUser ? '20px 20px 5px 20px' : '20px 20px 20px 5px',
                        bgcolor: isUser ? 'primary.main' : isAdmin ? 'secondary.main' : 'grey.200',
                        color: isUser ? 'white' : isAdmin ? 'white' : 'black',
                        maxWidth: '100%',
                    }}
                >
                    <Typography variant="body1">{isAdmin ? message.text.replace('Admin:', '').trim() : message.text}</Typography>
                </Paper>
                {message.createdAt && (
                    <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block', textAlign: isUser ? 'right' : 'left' }}>
                        {new Date(message.createdAt).toLocaleTimeString()}
                    </Typography>
                )}
            </Box>
        </Box>
    );
};

const ChatWidget = () => {
    const { isChatOpen, setIsChatOpen, messages, sendMessage, isLoading, conversationStatus, isTyping, adminActive } = useChat();
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading, isTyping]);

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
                    bgcolor: 'background.paper',
                }}
            >
                <Box sx={{
                    p: 2,
                    bgcolor: 'primary.main',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTopLeftRadius: 4,
                    borderTopRightRadius: 4,
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <img src={logo} alt="Home Service Provider" style={{ height: 32, marginRight: 8 }} />
                        <Typography variant="h6">Home Service Provider</Typography>
                    </Box>
                    <IconButton onClick={() => setIsChatOpen(false)} sx={{ color: 'white' }}>
                        <CloseIcon />
                    </IconButton>
                </Box>
                <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto', bgcolor: 'background.default' }}>
                    {messages.length === 0 && (
                        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                            Start a conversation with our {adminActive ? 'Admin' : 'Assistant'}!
                        </Typography>
                    )}
                    {messages.map((msg, index) => (
                        <MessageBubble key={msg.createdAt + msg.text + index} message={msg} />
                    ))}
                    {isLoading && (
                        <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                            <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'grey.600' }}>
                                {adminActive ? 'Admin is typing...' : 'Assistant is typing...'}
                            </Typography>
                        </Box>
                    )}
                    {isTyping && (
                        <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                            <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'grey.600' }}>
                                Admin is typing...
                            </Typography>
                        </Box>
                    )}
                    {conversationStatus === 'closed' && (
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                            <Typography variant="body2" sx={{ color: 'error.main', fontStyle: 'italic' }}>
                                This conversation is closed.
                            </Typography>
                        </Box>
                    )}
                    <div ref={messagesEndRef} />
                </Box>
                {conversationStatus !== 'closed' && (
                    <Box component="form" onSubmit={(e) => { e.preventDefault(); handleSend(); }} sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', bgcolor: 'grey.100' }}>
                        <TextField
                            fullWidth
                            variant="outlined"
                            size="small"
                            placeholder={adminActive ? 'Message the admin...' : 'Type a message...'}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            sx={{ bgcolor: 'white' }}
                        />
                        <IconButton color="primary" type="submit">
                            <SendIcon />
                        </IconButton>
                    </Box>
                )}
            </Paper>
        </>
    );
};

export default ChatWidget; */















































/* // src/components/ChatWidget.jsx
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

export default ChatWidget; */
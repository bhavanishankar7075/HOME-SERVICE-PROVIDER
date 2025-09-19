import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import io from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const socket = io(API_URL);

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [conversationId, setConversationId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [conversationStatus, setConversationStatus] = useState('open');
    const [isTyping, setIsTyping] = useState(false);
    const [adminActive, setAdminActive] = useState(false);
    const { token, user } = useSelector(state => state.auth);

    const getHistory = useCallback(async () => {
        if (token && user?._id) {
            try {
                setIsLoading(true);
                const { data } = await axios.get(`${API_URL}/api/chat/conversations`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setConversationId(data._id || null);
                setMessages(data.messages?.map(msg => ({
                    sender: msg.sender,
                    text: msg.text,
                    createdAt: msg.createdAt || new Date().toISOString()
                })) || []);
                setConversationStatus(data.status || 'open');
                setAdminActive(!!data.adminActive);
            } catch (error) {
                console.error("Failed to fetch chat history:", error);
                setMessages(prev => [...prev, {
                    sender: 'model',
                    text: "Failed to load chat history. Please try again.",
                    createdAt: new Date().toISOString()
                }]);
            } finally {
                setIsLoading(false);
            }
        }
    }, [token, user?._id]);

    useEffect(() => {
        if (user?._id) {
            getHistory();
        } else {
            setMessages([]);
            setConversationId(null);
            setConversationStatus('open');
            setAdminActive(false);
            socket.emit('leaveRoom', user?._id);
        }
    }, [user?._id, getHistory]);

    useEffect(() => {
        if (user?._id) {
            const handleConnect = () => socket.emit('joinRoom', user._id);
            socket.on('connect', handleConnect);
            if (socket.connected) handleConnect();

            const handleNewMessage = (message) => {
                setMessages(prev => {
                    const withoutOptimistic = prev.filter(msg => !(msg.isOptimistic && msg.sender === message.sender && msg.text === message.text));
                    return [...withoutOptimistic, {
                        sender: message.sender,
                        text: message.text,
                        createdAt: message.createdAt || new Date().toISOString()
                    }];
                });
                setIsLoading(false);
            };

            const handleConversationClosed = ({ conversationId: incomingId }) => {
                if (incomingId === conversationId) {
                    setConversationStatus('closed');
                    setAdminActive(false);
                    setMessages(prev => [...prev, {
                        sender: 'model',
                        text: "This conversation has been closed by an admin.",
                        createdAt: new Date().toISOString()
                    }]);
                }
            };

            const handleUserTyping = ({ conversationId: incomingId }) => {
                if (incomingId === conversationId) {
                    setIsTyping(true);
                    setTimeout(() => setIsTyping(false), 3000);
                }
            };

            socket.on('newMessage', handleNewMessage);
            socket.on('conversationClosed', handleConversationClosed);
            socket.on('userTyping', handleUserTyping);

            return () => {
                socket.off('connect', handleConnect);
                socket.off('newMessage', handleNewMessage);
                socket.off('conversationClosed', handleConversationClosed);
                socket.off('userTyping', handleUserTyping);
                socket.emit('leaveRoom', user?._id);
            };
        }
    }, [user?._id, conversationId]);

    const sendMessage = async (text) => {
        if (!text.trim() || !conversationId) return;

        const userMessage = {
            sender: 'user',
            text,
            createdAt: new Date().toISOString(),
            isOptimistic: true
        };
        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        try {
            await axios.post(`${API_URL}/api/chat/send`, { conversationId, text }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Backend should emit 'newMessage' event to update state
        } catch (error) {
            const errMessage = {
                sender: 'model',
                text: "Sorry, I couldn't connect. Please try again.",
                createdAt: new Date().toISOString()
            };
            setMessages(prev => [...prev.filter(msg => !msg.isOptimistic), errMessage]);
            setIsLoading(false);
        }
    };

    const value = {
        isChatOpen,
        setIsChatOpen,
        messages,
        sendMessage,
        isLoading,
        conversationStatus,
        isTyping,
        adminActive
    };

    return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export default ChatProvider;




































/* // src/context/ChatContext.js
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import io from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const socket = io(API_URL);

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [conversationId, setConversationId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const { token, user } = useSelector(state => state.auth);

    const getHistory = useCallback(async () => {
        if (token) {
            try {
                const { data } = await axios.get(`${API_URL}/api/chat`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setConversationId(data.conversationId);
                setMessages(data.messages);
            } catch (error) {
                console.error("Failed to fetch chat history:", error);
            }
        }
    }, [token]);

    useEffect(() => {
        if (user) {
            getHistory();
        } else {
            // Clear chat when user logs out
            setMessages([]);
            setConversationId(null);
        }
    }, [user, getHistory]);

    useEffect(() => {
        if (user?._id) {
            const handleConnect = () => socket.emit('joinRoom', user._id);
            socket.on('connect', handleConnect);
            if (socket.connected) handleConnect();

            const handleNewMessage = (message) => {
                setMessages(prev => [...prev, message]);
                setIsLoading(false);
            };
            socket.on('newMessage', handleNewMessage);

            return () => {
                socket.off('connect', handleConnect);
                socket.off('newMessage', handleNewMessage);
            };
        }
    }, [user]);
    
    const sendMessage = async (text) => {
        if (!text.trim() || !conversationId) return;

        const userMessage = { sender: 'user', text };
        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        try {
            await axios.post(`${API_URL}/api/chat`, { conversationId, text }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            const errMessage = { sender: 'model', text: "Sorry, I couldn't connect. Please try again." };
            setMessages(prev => [...prev, errMessage]);
            setIsLoading(false);
        }
    };

    const value = {
        isChatOpen,
        setIsChatOpen,
        messages,
        sendMessage,
        isLoading
    };

    return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
 */




































































/* import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import io from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const socket = io(API_URL);

const ChatContext = createContext();

// FIX: This line must be exported so other components can use the hook.
export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [conversationId, setConversationId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const { token, user } = useSelector(state => state.auth);

    const getHistory = useCallback(async () => {
        if (token) {
            try {
                const { data } = await axios.get(`${API_URL}/api/chat`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setConversationId(data.conversationId);
                setMessages(data.messages);
            } catch (error) {
                console.error("Failed to fetch chat history:", error);
            }
        }
    }, [token]);

    useEffect(() => {
        if (user) {
            getHistory();
        } else {
            setMessages([]);
            setConversationId(null);
        }
    }, [user, getHistory]);

    useEffect(() => {
        if (user?._id) {
            const handleConnect = () => socket.emit('joinRoom', user._id);
            socket.on('connect', handleConnect);
            if (socket.connected) handleConnect();

            const handleNewMessage = (message) => {
                setMessages(prev => [...prev, message]);
                setIsLoading(false);
            };
            socket.on('newMessage', handleNewMessage);

            return () => {
                socket.off('connect', handleConnect);
                socket.off('newMessage', handleNewMessage);
            };
        }
    }, [user]);
    
    const sendMessage = async (text) => {
        if (!text.trim() || !conversationId) return;

        const userMessage = { sender: 'user', text };
        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        try {
            await axios.post(`${API_URL}/api/chat`, { conversationId, text }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            const errMessage = { sender: 'model', text: "Sorry, I couldn't connect. Please try again." };
            setMessages(prev => [...prev, errMessage]);
            setIsLoading(false);
        }
    };

    const value = {
        isChatOpen,
        setIsChatOpen,
        messages,
        sendMessage,
        isLoading
    };

    return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}; */
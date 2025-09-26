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
    // FIX 1: Add state to track if there's a new, unread message.
    const [hasNewMessage, setHasNewMessage] = useState(false);
    const { token, user } = useSelector(state => state.auth);

    const getHistory = useCallback(async () => {
        if (token && user?._id) {
            try {
                setIsLoading(true);
                const { data } = await axios.get(`${API_URL}/api/chat`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log('Fetched conversation data:', data);
                setConversationId(data.conversationId || data._id || null);
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
                console.log('New message received:', message);

                // FIX 2: Check if the chat is closed. If so, set the notification state.
                if (!isChatOpen) {
                    setHasNewMessage(true);
                }

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
                        text: "This conversation has been closed by an admin. You can still ask the AI any questions.",
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
        // By adding isChatOpen here, the socket listener will always have the latest value.
    }, [user?._id, conversationId, isChatOpen]);

    const sendMessage = async (text) => {
        if (!text.trim() || !conversationId) return;

        const userMessage = {
            sender: 'user',
            text: conversationStatus === 'closed' ? `AI Query: ${text}` : text,
            createdAt: new Date().toISOString(),
            isOptimistic: true
        };
        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        try {
            const { data } = await axios.post(`${API_URL}/api/chat`, { conversationId, text: userMessage.text }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('Message sent response:', data);
        } catch (error) {
            console.error('Send message error:', error);
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
        adminActive,
        // FIX 3: Export the new state and its setter for the widget to use.
        hasNewMessage,
        setHasNewMessage
    };

    return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export default ChatProvider;

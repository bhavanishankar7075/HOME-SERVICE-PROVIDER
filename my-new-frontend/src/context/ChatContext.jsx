// src/context/ChatContext.js
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
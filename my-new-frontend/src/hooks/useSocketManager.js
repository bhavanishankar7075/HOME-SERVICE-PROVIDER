
 // src/hooks/useSocketManager.js

import { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import io from 'socket.io-client';
import { setUser } from '../redux/authSlice';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Create a single, persistent socket instance for the entire app
const socket = io(API_URL, {
  autoConnect: false, // We will connect manually
  reconnection: true,
  reconnectionDelay: 1000,
});

export const useSocketManager = () => {
  const { user, token } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  // Use a ref to store the latest user ID to avoid re-running the effect unnecessarily
  const userIdRef = useRef(user?._id);
  userIdRef.current = user?._id;

  useEffect(() => {
    const handleUserUpdate = (updatedUser) => {
      // Ensure the update is for the currently logged-in user
      if (userIdRef.current && updatedUser?._id === userIdRef.current) {
        console.log('[SocketManager] Received user update from server:', updatedUser);
        dispatch(setUser({ user: updatedUser, token }));
      }
    };

    // Add the listener once
    socket.on('userUpdated', handleUserUpdate);

    if (user && token) {
      if (!socket.connected) {
        socket.connect();
      }

      socket.on('connect', () => {
        console.log('[SocketManager] Socket connected:', socket.id);
        socket.emit('joinRoom', user._id);
      });
    } else {
      if (socket.connected) {
        socket.disconnect();
      }
    }

    // Cleanup function to remove the listener when the app closes
    return () => {
      socket.off('userUpdated', handleUserUpdate);
    };
  }, [token, user, dispatch]); // Rerun if the user logs in/out
}; 
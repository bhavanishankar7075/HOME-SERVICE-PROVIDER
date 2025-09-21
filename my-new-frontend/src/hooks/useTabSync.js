// src/hooks/useTabSync.js

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { clearUser } from '../redux/authSlice'; // Adjust the path if necessary

export const useTabSync = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const handleStorageChange = (event) => {
      // We only care about changes to our redux-persist key.
      if (event.key === 'persist:root') {
        // If the storage is cleared or the auth state is empty in the new value,
        // it means a logout happened in another tab.
        if (!event.newValue) {
          console.log('Auth state cleared from another tab. Logging out.');
          dispatch(clearUser());
          return;
        }

        try {
          const newState = JSON.parse(event.newValue);
          // Check if the auth slice in the new state is empty or user is null
          if (!newState.auth || !newState.auth.token) {
             console.log('User logged out from another tab. Syncing logout.');
             dispatch(clearUser());
          }
        } catch (error) {
          console.error('Failed to parse storage event value:', error);
        }
      }
    };

    // Add the event listener when the component mounts
    window.addEventListener('storage', handleStorageChange);

    // Remove the event listener when the component unmounts
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [dispatch]); // Dependency array ensures this effect runs only once
};
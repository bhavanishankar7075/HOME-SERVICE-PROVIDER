import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  needsVerification: false,
  location: '',
  notifications: [],
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      const { user, token } = action.payload;
      console.log('authSlice: Setting user with payload:', action.payload, 'Current state:', state);
      state.user = user;
      state.token = token;
      state.isAuthenticated = !!token;
      state.isLoading = false;
      state.needsVerification = false;
    },
    clearUser: (state) => {
      console.log('authSlice: Clearing user, stack:', new Error().stack);
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.needsVerification = false;
      state.location = '';
      state.notifications = [];
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setNeedsVerification: (state, action) => {
      console.log('authSlice: Setting needsVerification', action.payload);
      state.needsVerification = action.payload;
    },
    setLocation: (state, action) => {
      state.location = action.payload || '';
    },
    addNotification: (state, action) => {
      state.notifications.unshift(action.payload);
      if (state.notifications.length > 10) {
        state.notifications.pop();
      }
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
  },
});

export const {
  setUser,
  clearUser,
  setLoading,
  setNeedsVerification,
  setLocation,
  addNotification,
  clearNotifications,
} = authSlice.actions;
export default authSlice.reducer;

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  location: '',
  notifications: [], // This line is required
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      const { user, token } = action.payload;
      state.user = user;
      state.token = token;
      state.isAuthenticated = !!token;
      state.isLoading = false;
    },
    clearUser: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.location = '';
      state.notifications = []; // This line is required
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
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

export const { setUser, clearUser, setLoading, setLocation, addNotification, clearNotifications } = authSlice.actions;
export default authSlice.reducer;

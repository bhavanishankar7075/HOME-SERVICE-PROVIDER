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










































/* import { createSlice } from '@reduxjs/toolkit';

// The initial state should be clean, without reading from localStorage.
// redux-persist will handle populating this from storage on app load.
const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  location: '', // Start with an empty location
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
    // Simply clear the state. redux-persist will automatically update localStorage.
    clearUser: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.location = ''; // This will also be persisted as an empty string
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    // Simply update the state. redux-persist handles the storage.
    setLocation: (state, action) => {
      state.location = action.payload || '';
    },
  },
});

export const { setUser, clearUser, setLoading, setLocation } = authSlice.actions;
export default authSlice.reducer;
 */

































/* import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  location: localStorage.getItem('selectedLocation') || '', // Added location
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
      state.location = ''; // Clear location on logout
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('selectedLocation'); // Clear location from localStorage
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setLocation: (state, action) => {
      state.location = action.payload || '';
      localStorage.setItem('selectedLocation', state.location); // Sync with localStorage
    },
  },
});

export const { setUser, clearUser, setLoading, setLocation } = authSlice.actions; // Added clearUser and setLocation exports
export default authSlice.reducer; */


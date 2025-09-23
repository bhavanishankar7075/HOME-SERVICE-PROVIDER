import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  needsVerification: false,
  location: '',
  notifications: [],
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action) {
      console.log('authSlice: Setting user with payload:', action.payload);
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.needsVerification = false;
      state.error = null;
    },
    setLoading(state, action) {
      state.isLoading = action.payload;
    },
    setNeedsVerification(state, action) {
      state.needsVerification = action.payload;
      state.isLoading = false;
    },
    setError(state, action) {
      state.error = action.payload;
      state.isLoading = false;
    },
    loginFailure(state, action) {
      console.log('authSlice: Login failure with payload:', action.payload);
      state.error = action.payload;
      state.isLoading = false;
      state.isAuthenticated = false;
    },
    clearUser(state) {
      console.log('authSlice: Clearing user state');
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.needsVerification = false;
      state.error = null;
      state.isLoading = false;
    },
    logout: (state, action) => {
      console.log('authSlice: Logging out');
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.needsVerification = false;
      state.error = null;
      state.isLoading = false;
    },
  },
});

export const { setUser, setLoading, setNeedsVerification, setError, loginFailure, clearUser, logout } = authSlice.actions;
export default authSlice.reducer;
















































/* import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  token: null,
  selectedLocation: null,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      state.loading = false;
      state.user = action.payload.user;
      state.token = action.payload.token;
    },
    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.error = null;
      state.selectedLocation = null;
    },
    setLocation: (state, action) => {
      state.selectedLocation = action.payload;
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, logout, setLocation } = authSlice.actions;
export default authSlice.reducer; */
import { createSlice } from '@reduxjs/toolkit';

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
export default authSlice.reducer;
// src/redux/service.slice.js
import { createSlice } from '@reduxjs/toolkit';

const serviceSlice = createSlice({
  name: 'services', // Must match the store reducer key
  initialState: { items: [], loading: false, error: null },
  reducers: {
    setServices: (state, action) => {
      state.items = action.payload; // Update items with the payload
      state.loading = false;
      state.error = null;
      console.log('Services set:', state.items); // Log the updated items
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
      console.log('Loading state:', state.loading);
    },
    setError: (state, action) => {
      state.loading = false;
      state.error = action.payload;
      console.log('Error state:', state.error);
    },
  },
});

export const { setServices, setLoading, setError } = serviceSlice.actions;
export const selectServices = (state) => state.services.items; // Ensure this matches the state structure
export default serviceSlice.reducer;
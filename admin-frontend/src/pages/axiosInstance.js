/* import axios from 'axios';
import { store } from '../store';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

axiosInstance.interceptors.request.use(
  (config) => {
    const state = store.getState();
    const token = state.auth.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('axiosInstance: Added Authorization header with token:', token);
    }
    return config;
  },
  (error) => {
    console.error('axiosInstance: Request interceptor error:', error);
    return Promise.reject(error);
  }
);

export default axiosInstance; */


import axios from 'axios';
import { store } from '../store';
import { clearUser } from '../store/authSlice'; // Use the clearUser action you already have

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

axiosInstance.interceptors.request.use(
  (config) => {
    const state = store.getState();
    const token = state.auth.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.log('axiosInstance: Session expired, clearing user state');
      store.dispatch(clearUser()); 
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
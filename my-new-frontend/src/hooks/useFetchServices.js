// src/hooks/useFetchServices.js
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { setServices, setLoading, setError } from '../redux/services.slice';
import { selectAuth } from '../redux/authSlice';

const useFetchServices = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, token } = useSelector(selectAuth);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!isAuthenticated && !token) {
        console.log('User not authenticated, skipping service fetch');
        return;
      }

      dispatch(setLoading(true));
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axios.get('http://localhost:5000/api/services', { headers });
        console.log('Fetch services response (raw):', response.status, response.data);
        const formattedData = response.data.map(service => ({
          ...service,
          id: service._id,
          image: service.image || 'https://via.placeholder.com/300?text=No+Image',
        }));
        console.log('Formatted data (full):', JSON.stringify(formattedData, null, 2));
        if (isMounted) {
          dispatch(setServices(formattedData));
          console.log('Dispatch setServices completed');
        }
      } catch (error) {
        console.error('Fetch services error:', error.response?.status, error.response?.data || error.message);
        if (isMounted) {
          dispatch(setError(error.response?.data || error.message));
        }
      } finally {
        if (isMounted) {
          dispatch(setLoading(false));
          console.log('Fetch completed');
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [dispatch, isAuthenticated, token]);

  const { items: services, loading, error } = useSelector((state) => {
    const servicesState = state.services || { items: [], loading: false, error: null };
    console.log('Selector services state:', servicesState); // Log the state being selected
    return servicesState;
  });
  console.log('Current services state:', services); // Log the destructured services

  return { services, loading, error };
};

export default useFetchServices;
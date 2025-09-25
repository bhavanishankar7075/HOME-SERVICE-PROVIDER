import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Box, Typography, Button, TextField, Alert } from '@mui/material';
import axios from 'axios';
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Booking = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [service, setService] = useState(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [status, setStatus] = useState('pending');
  const [error, setError] = useState(null);
  const [bookingId, setBookingId] = useState(null);

  useEffect(() => {
    const fetchService = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/services/${serviceId}`);
        setService(response.data);
      } catch (err) {
        setError('Service not found.');
      }
    };
    fetchService();

    const socket = io(API_URL);
    socket.on('booking_update', (data) => {
      if (data.bookingId === bookingId) setStatus(data.status);
    });
    return () => socket.disconnect();
  }, [serviceId, bookingId]);

  const handleBookService = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const response = await axios.post(`${API_URL}/api/bookings`, {
        serviceId,
        userId: user._id,
        date,
        time,
        status: 'pending',
      });
      setBookingId(response.data._id);
      setStatus('confirmed');
      setError(null);
    } catch (err) {
      setError('Booking failed. Please try again.');
    }
  };

  const handleCancelBooking = async () => {
    if (bookingId) {
      try {
        await axios.delete(`${API_URL}/api/bookings/${bookingId}`);
        setStatus('cancelled');
        setBookingId(null);
        setError(null);
      } catch (err) {
        setError('Cancellation failed.');
      }
    }
  };

  if (!service) return <Typography>Loading...</Typography>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Typography variant="h4">Book {service.name}</Typography>
      <Typography>Price: ₹{service.price}</Typography>
      <form onSubmit={handleBookService}>
        <TextField
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          fullWidth
          margin="normal"
        />
        <TextField
          label="Time"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          required
          fullWidth
          margin="normal"
        />
        <Button type="submit" variant="contained" color="primary" disabled={status === 'confirmed' || status === 'cancelled'}>
          Book Now
        </Button>
        {status === 'confirmed' && (
          <Button variant="contained" color="secondary" onClick={handleCancelBooking} sx={{ ml: 2 }}>
            Cancel Booking
          </Button>
        )}
      </form>
      <Typography variant="body1">Status: {status}</Typography>
    </Box>
  );
};

export default Booking;
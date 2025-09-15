import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';


const Booking = () => {
  const navigate = useNavigate();

  return (
    <Box className="booking-container">
      <Paper className="booking-card">
        <Typography variant="h4" className="booking-title">
          Booking Management
        </Typography>
        <Typography variant="body1" className="booking-description">
          Manage and view all booking details for services here. Select a booking to update its status or view customer information.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          className="booking-button"
          onClick={() => navigate('/admin/dashboard')}
        >
          Back to Dashboard
        </Button>
      </Paper>
    </Box>
  );
};

export default Booking;
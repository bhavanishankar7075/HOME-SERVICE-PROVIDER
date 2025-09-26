import React, { useContext, useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { setUser } from "../redux/authSlice";
import { ServicesContext } from "../context/ServicesContext";
import io from "socket.io-client";
import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import {
  Box, Typography, Grid, Card, CardMedia, CardContent, Button, CircularProgress, Slider,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem,
  Paper, Avatar, CardActions, Tooltip, Snackbar, Alert, Rating, Container,
  Chip, GlobalStyles, Stepper, Step, StepLabel, RadioGroup, FormControlLabel, Radio, FormLabel
} from "@mui/material";
import {
  FilterList as FilterIcon, RestartAlt as ClearIcon, CalendarMonth as ScheduleIcon, Info as InfoIcon,
  CleaningServices as CleaningIcon, Plumbing as PlumbingIcon, ElectricalServices as ElectricalIcon,
  Home as HomeIcon, CheckCircle, Visibility as VisibilityIcon, Brush as BrushIcon,
  Carpenter as CarpenterIcon, Grass as GrassIcon, Verified as VerifiedIcon,
  Star as StarIcon, SupportAgent as SupportIcon
} from "@mui/icons-material";
import "../styles/Services.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const socket = io(API_URL);
const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;

const categoryIcons = {
  "Cleaning": <CleaningIcon sx={{ color: '#4F46E5' }} />,
  "Plumbing": <PlumbingIcon sx={{ color: '#4F46E5' }} />,
  "Electrical": <ElectricalIcon sx={{ color: '#4F46E5' }} />,
  "Home Maintenance": <HomeIcon sx={{ color: '#4F46E5' }} />,
  "Painting": <BrushIcon sx={{ color: '#4F46E5' }} />,
  "Carpentry": <CarpenterIcon sx={{ color: '#4F46E5' }} />,
  "Landscaping": <GrassIcon sx={{ color: '#4F46E5' }} />,
  "default": <InfoIcon sx={{ color: '#4F46E5' }} />,
};

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
    return () => { clearTimeout(handler); };
  }, [value, delay]);
  return debouncedValue;
};

const CheckoutForm = ({ onPaymentSuccess, onPaymentError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements) return;
    setIsProcessing(true);
    const { error } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });
    if (error) {
      onPaymentError(error.message);
    } else {
      onPaymentSuccess();
    }
    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <Button
        type="submit"
        disabled={isProcessing || !stripe || !elements}
        fullWidth
        variant="contained"
        sx={{ mt: 3, bgcolor: '#4F46E5', '&:hover': { bgcolor: '#4338CA' }, borderRadius: 2 }}
      >
        {isProcessing ? <CircularProgress size={24} /> : "Pay Now"}
      </Button>
    </form>
  );
};

const scrollbarStyles = (
  <GlobalStyles
    styles={{
      '*::-webkit-scrollbar': { width: '0px', height: '0px' }, // Hide scrollbar
      '*::-webkit-scrollbar-track': { background: '#f1f1f1', borderRadius: '4px' },
      '*::-webkit-scrollbar-thumb': { background: '#888', borderRadius: '4px' },
      '*::-webkit-scrollbar-thumb:hover': { background: '#555' },
    }}
  />
);

const Services = () => {
  const { services, loading, fetchServices, message, setMessage } = useContext(ServicesContext);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, token, location: userLocation } = useSelector((state) => state.auth);
  const [featuredServices, setFeaturedServices] = useState([]);
  const [filters, setFilters] = useState({
    category: "all",
    priceRange: [0, 50000],
    searchTerm: "",
    sort: "name_asc",
  });
  const debouncedSearchTerm = useDebounce(filters.searchTerm, 500);
  const [selectedService, setSelectedService] = useState(null);
  const [isScheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [scheduleData, setScheduleData] = useState({ date: '', time: '', location: '' });
  const [paymentMethod, setPaymentMethod] = useState('Stripe');
  const [newBooking, setNewBooking] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [availableTimes, setAvailableTimes] = useState([]);
  const [isTimeFetching, setIsTimeFetching] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState('');
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);

  useEffect(() => {
    const syncUserProfile = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const { data } = await axios.get(`${API_URL}/api/users/profile`, config);
        dispatch(setUser({ user: data, token }));
      } catch (error) {
        console.error("Failed to sync user profile:", error);
      }
    };
    if (token) {
      syncUserProfile();
    }
    axios.get(`${API_URL}/api/services/featured`)
      .then(res => setFeaturedServices(res.data))
      .catch(err => console.error("Failed to fetch featured services:", err));
    if (!STRIPE_PUBLISHABLE_KEY) {
      console.error("Stripe Publishable Key is not set. Stripe payments will not work.");
    }
  }, [token, dispatch]);

  useEffect(() => {
    const handleServiceUpdate = () => { fetchServices(); };
    socket.on("serviceUpdated", handleServiceUpdate);
    socket.on("serviceDeleted", handleServiceUpdate);
    socket.on("serviceAdded", handleServiceUpdate);
    socket.on("feedbacksUpdated", handleServiceUpdate);
    return () => {
      socket.off("serviceUpdated", handleServiceUpdate);
      socket.off("serviceDeleted", handleServiceUpdate);
      socket.off("serviceAdded", handleServiceUpdate);
      socket.off("feedbacksUpdated", handleServiceUpdate);
    };
  }, [fetchServices]);

  useEffect(() => {
    if (userLocation || user?.profile?.location?.fullAddress) {
      setScheduleData(prev => ({ ...prev, location: user?.profile?.location?.fullAddress || userLocation }));
    }
  }, [userLocation, user]);

  const filteredAndSortedServices = useMemo(() => {
    let result = services || [];
    if (debouncedSearchTerm) result = result.filter(s => s.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
    if (filters.category !== "all") result = result.filter(s => s.category === filters.category);
    result = result.filter(s => s.price >= filters.priceRange[0] && s.price <= filters.priceRange[1]);
    
    const sortedResult = [...result];
    switch (filters.sort) {
      case "price_asc": sortedResult.sort((a, b) => a.price - b.price); break;
      case "price_desc": sortedResult.sort((a, b) => b.price - a.price); break;
      case "rating_desc": sortedResult.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0)); break;
      default: sortedResult.sort((a, b) => a.name.localeCompare(b.name)); break;
    }
    return sortedResult;
  }, [services, debouncedSearchTerm, filters.category, filters.priceRange, filters.sort]);

  const fetchAvailability = useCallback(async (serviceId, date) => {
    setIsTimeFetching(true);
    setAvailableTimes([]);
    try {
      const res = await axios.get(`${API_URL}/api/services/${serviceId}/availability?date=${date}`);
      setAvailableTimes(res.data);
    } catch (error) {
      console.error("Failed to fetch availability", error);
    } finally {
      setIsTimeFetching(false);
    }
  }, []);

  const handleOpenSchedule = (service) => {
    if (!token) return navigate('/login');
    const today = new Date().toISOString().split("T")[0];
    setSelectedService(service);
    setScheduleData({ date: today, time: "", location: user?.profile?.location?.fullAddress || userLocation || "" });
    setActiveStep(0);
    setScheduleError('');
    setNewBooking(null);
    setClientSecret('');
    setPaymentMethod('Stripe');
    setScheduleModalOpen(true);
    fetchAvailability(service._id, today);
  };

  const handleCloseSchedule = () => setScheduleModalOpen(false);

  const handleDateChange = (e) => {
    setScheduleData({ ...scheduleData, date: e.target.value, time: "" });
    if (selectedService) fetchAvailability(selectedService._id, e.target.value);
  };

  const handleTimeSelect = (time) => setScheduleData({ ...scheduleData, time });

  const handleScheduleBack = () => setActiveStep(prev => prev - 1);

  const handleCreateBookingAndProceed = async () => {
    setScheduleLoading(true);
    setScheduleError('');
    try {
      const scheduledTime = new Date(`${scheduleData.date}T${scheduleData.time}:00`).toISOString();
      const bookingPayload = {
        serviceId: selectedService._id,
        scheduledTime,
        location: scheduleData.location,
        paymentMethod,
         timeSlot: scheduleData.time,
      };
      const bookingRes = await axios.post(`${API_URL}/api/bookings`, bookingPayload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const createdBooking = bookingRes.data;
      setNewBooking(createdBooking);
      if (paymentMethod === 'COD') {
        await axios.post(`${API_URL}/api/payments/confirm-cod`, { bookingId: createdBooking._id }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setActiveStep(3);
      } else if (paymentMethod === 'Stripe') {
        const intentRes = await axios.post(`${API_URL}/api/payments/create-stripe-intent`, { bookingId: createdBooking._id }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setClientSecret(intentRes.data.clientSecret);
        setActiveStep(2);
      }
    } catch (error) {
      setScheduleError(error.response?.data?.message || "An unexpected error occurred.");
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleQuickView = (service) => {
    setSelectedService(service);
    setIsQuickViewOpen(true);
  };

  const getImageUrl = (image) => image || 'https://via.placeholder.com/300x200?text=Service+Image'; // <-- UPDATED

  const categories = [
    { name: 'Home Maintenance', icon: <HomeIcon sx={{ color: '#4F46E5' }} /> },
    { name: 'Plumbing', icon: <PlumbingIcon sx={{ color: '#4F46E5' }} /> },
    { name: 'Cleaning', icon: <CleaningIcon sx={{ color: '#4F46E5' }} /> },
    { name: 'Electrical', icon: <ElectricalIcon sx={{ color: '#4F46E5' }} /> },
    { name: 'Painting', icon: <BrushIcon sx={{ color: '#4F46E5' }} /> },
    { name: 'Carpentry', icon: <CarpenterIcon sx={{ color: '#4F46E5' }} /> },
    { name: 'Landscaping', icon: <GrassIcon sx={{ color: '#4F46E5' }} /> },
  ];

  const whyChooseUs = [
    { title: 'Trusted Professionals', description: 'Our vetted experts ensure top-quality service.', icon: <VerifiedIcon sx={{ color: '#4F46E5' }} /> },
    { title: 'Convenient Booking', description: 'Schedule services at your preferred time.', icon: <ScheduleIcon sx={{ color: '#4F46E5' }} /> },
    { title: 'Customer Satisfaction', description: 'High ratings from thousands of happy customers.', icon: <StarIcon sx={{ color: '#4F46E5' }} /> },
    { title: '24/7 Support', description: 'Our team is here to assist you anytime.', icon: <SupportIcon sx={{ color: '#4F46E5' }} /> },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: '#F9FAFB' }}>
        <CircularProgress size={60} sx={{ color: '#4F46E5' }} />
        <Typography variant="h6" sx={{ ml: 2, color: '#4B5563' }}>Loading Services...</Typography>
      </Box>
    );
  }

  const proceedButtonText = paymentMethod === 'Stripe' ? 'Proceed to Payment' : 'Confirm COD Booking';

  return (
    <Box sx={{ bgcolor: '#F9FAFB', minHeight: '100vh', pt: 8 }}>
      {scrollbarStyles}
      <Box component="main" sx={{ flexGrow: 1, px: { xs: 2, sm: 4, lg: 6 }, py: 6 }}>
        {/* Popular Categories Section */}
        <Box component="section" sx={{ py: 4, bgcolor: 'white', borderRadius: 4, boxShadow: 2, mb: 6 }}>
          <Container maxWidth="lg">
            <Typography variant="h4" sx={{ fontSize: { xs: '1.5rem', md: '2rem' }, fontWeight: 'bold', textAlign: 'center', color: '#1F2937', mb: 4 }}>
              Service Categories
            </Typography>
            <Grid container spacing={2} justifyContent="center">
              {categories.map((category, index) => (
                <Grid item xs={6} sm={4} md={2} key={index}>
                  <Chip
                    icon={category.icon}
                    label={category.name}
                    onClick={() => setFilters(prev => ({ ...prev, category: category.name === filters.category ? 'all' : category.name }))}
                    sx={{
                      bgcolor: filters.category === category.name ? '#4F46E5' : '#EFF6FF',
                      color: filters.category === category.name ? 'white' : '#1F2937',
                      fontWeight: 'medium',
                      fontSize: { xs: '0.85rem', sm: '0.95rem' },
                      px: 1,
                      py: 2,
                      borderRadius: 2,
                      '&:hover': { bgcolor: filters.category === category.name ? '#4338CA' : '#DBEAFE', cursor: 'pointer' },
                      width: '100%',
                      justifyContent: 'flex-start',
                    }}
                  />
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>

        {/* Filters Section */}
        <Box component="section" sx={{ py: 4, bgcolor: '#F9FAFB', mb: 6 }}>
          <Container maxWidth="lg">
            <Paper sx={{ p: 3, borderRadius: 4, boxShadow: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <FilterIcon sx={{ color: '#4F46E5', fontSize: 28 }} />
                <Typography variant="h6" sx={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>
                  Filter & Sort Services
                </Typography>
              </Box>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    label="Search Services"
                    variant="outlined"
                    size="small"
                    value={filters.searchTerm}
                    onChange={e => setFilters(p => ({ ...p, searchTerm: e.target.value }))}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'white' } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={filters.category}
                      label="Category"
                      onChange={e => setFilters(p => ({ ...p, category: e.target.value }))}
                      sx={{ borderRadius: 2, bgcolor: 'white' }}
                    >
                      <MenuItem value="all">All Categories</MenuItem>
                      {categories.map(cat => (
                        <MenuItem key={cat.name} value={cat.name}>{cat.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Sort By</InputLabel>
                    <Select
                      value={filters.sort}
                      label="Sort By"
                      onChange={e => setFilters(p => ({ ...p, sort: e.target.value }))}
                      sx={{ borderRadius: 2, bgcolor: 'white' }}
                    >
                      <MenuItem value="name_asc">Name (A-Z)</MenuItem>
                      <MenuItem value="price_asc">Price: Low to High</MenuItem>
                      <MenuItem value="price_desc">Price: High to Low</MenuItem>
                      <MenuItem value="rating_desc">Rating: High to Low</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<ClearIcon />}
                    onClick={() => setFilters({ category: "all", priceRange: [0, 50000], searchTerm: "", sort: "name_asc" })}
                    sx={{ borderColor: '#4F46E5', color: '#4F46E5', bgcolor: 'white', '&:hover': { bgcolor: '#EFF6FF' }, borderRadius: 2 }}
                  >
                    Reset Filters
                  </Button>
                </Grid>
                <Grid item xs={12}>
                  <Typography gutterBottom sx={{ fontSize: '0.9rem', color: '#1F2937' }}>
                    Price Range (₹{filters.priceRange[0].toLocaleString('en-IN')} - ₹{filters.priceRange[1].toLocaleString('en-IN')})
                  </Typography>
                  <Slider
                    value={filters.priceRange}
                    onChange={(e, val) => setFilters(p => ({ ...p, priceRange: val }))}
                    valueLabelDisplay="auto"
                    min={0}
                    max={50000}
                    step={500}
                    sx={{ color: '#4F46E5' }}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Container>
        </Box>

        {/* Featured Services Section */}
        <Box component="section" sx={{ py: 6, bgcolor: 'white', borderRadius: 4, boxShadow: 2, mb: 6 }}>
          <Container maxWidth="lg">
            <Typography variant="h4" sx={{ fontSize: { xs: '1.5rem', md: '2rem' }, fontWeight: 'bold', textAlign: 'center', color: '#1F2937', mb: 4 }}>
              Featured Services
            </Typography>
            <Grid container spacing={4}>
              {filteredAndSortedServices.length > 0 ? filteredAndSortedServices.slice(0, 6).map(service => (
                <Grid item xs={12} sm={6} md={4} key={service._id}>
                  <Card sx={{ height: '100%', minHeight: '400px', display: 'flex', flexDirection: 'column', borderRadius: 4, boxShadow: 3, '&:hover': { boxShadow: 6, transform: 'translateY(-4px)' }, transition: 'all 0.3s' }}>
                    <CardMedia
                      component="img"
                      height="200"
                      image={getImageUrl(service.image)}
                      alt={service.name}
                      sx={{ objectFit: 'cover', bgcolor: '#F9FAFB' }}
                      onError={(e) => {
                        console.error(`Image load error for ${service.name}:`, e.target.src);
                        e.target.src = 'https://via.placeholder.com/300x200?text=Service+Image';
                      }}
                    />
                    <CardContent sx={{ flexGrow: 1, p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 'medium', color: '#1F2937' }}>
                          {service.name}
                        </Typography>
                        <Tooltip title={service.category}>
                          <Avatar sx={{ bgcolor: '#EFF6FF', width: 32, height: 32 }}>{categoryIcons[service.category] || categoryIcons.default}</Avatar>
                        </Tooltip>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Rating name="read-only" value={service.averageRating || 0} readOnly precision={0.1} size="small" />
                        <Typography sx={{ ml: 1, color: '#6B7280', fontSize: '0.85rem' }}>
                          ({(service.averageRating || 0).toFixed(1)}/5, {service.feedbackCount || 0} reviews)
                        </Typography>
                      </Box>
                      <Typography variant="h6" sx={{ color: '#4F46E5', mb: 1 }}>₹{service.price.toLocaleString('en-IN')}</Typography>
                      <Typography variant="body2" sx={{ color: '#6B7280', fontSize: '0.85rem' }}>
                        {service.description.substring(0, 80)}{service.description.length > 80 && '...'}
                      </Typography>
                    </CardContent>
                    <CardActions sx={{ p: 2, justifyContent: 'space-between', bgcolor: '#F9FAFB' }}>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button size="small" startIcon={<InfoIcon />} onClick={() => navigate(`/services/${service._id}`)} sx={{ color: '#4F46E5', fontSize: '0.8rem' }}>
                          Details
                        </Button>
                        <Button size="small" startIcon={<VisibilityIcon />} onClick={() => handleQuickView(service)} sx={{ color: '#4F46E5', fontSize: '0.8rem' }}>
                          Quick View
                        </Button>
                      </Box>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<ScheduleIcon />}
                        onClick={() => handleOpenSchedule(service)}
                        sx={{ bgcolor: '#4F46E5', '&:hover': { bgcolor: '#4338CA' }, fontSize: '0.8rem' }}
                      >
                        Schedule
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              )) : (
                <Grid item xs={12}>
                  <Typography sx={{ textAlign: 'center', color: '#6B7280' }}>No services found for the selected filters.</Typography>
                </Grid>
              )}
            </Grid>
          </Container>
        </Box>

        {/* All Services Section */}
        <Box component="section" sx={{ py: 6, bgcolor: '#F9FAFB', mb: 6 }}>
          <Container maxWidth="lg">
            <Typography variant="h4" sx={{ fontSize: { xs: '1.5rem', md: '2rem' }, fontWeight: 'bold', textAlign: 'center', color: '#1F2937', mb: 4 }}>
              All Services
            </Typography>
            <Grid container spacing={4}>
              {filteredAndSortedServices.length > 0 ? filteredAndSortedServices.map(service => (
                <Grid item xs={12} sm={6} md={4} key={service._id}>
                  <Card sx={{ height: '100%', minHeight: '400px', display: 'flex', flexDirection: 'column', borderRadius: 4, boxShadow: 3, '&:hover': { boxShadow: 6, transform: 'translateY(-4px)' }, transition: 'all 0.3s' }}>
                    <CardMedia
                      component="img"
                      height="200"
                      image={getImageUrl(service.image)}
                      alt={service.name}
                      sx={{ objectFit: 'cover', bgcolor: '#F9FAFB' }}
                      onError={(e) => {
                        console.error(`Image load error for ${service.name}:`, e.target.src);
                        e.target.src = 'https://via.placeholder.com/300x200?text=Service+Image';
                      }}
                    />
                    <CardContent sx={{ flexGrow: 1, p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 'medium', color: '#1F2937' }}>
                          {service.name}
                        </Typography>
                        <Tooltip title={service.category}>
                          <Avatar sx={{ bgcolor: '#EFF6FF', width: 32, height: 32 }}>{categoryIcons[service.category] || categoryIcons.default}</Avatar>
                        </Tooltip>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Rating name="read-only" value={service.averageRating || 0} readOnly precision={0.1} size="small" />
                        <Typography sx={{ ml: 1, color: '#6B7280', fontSize: '0.85rem' }}>
                          ({(service.averageRating || 0).toFixed(1)}/5, {service.feedbackCount || 0} reviews)
                        </Typography>
                      </Box>
                      <Typography variant="h6" sx={{ color: '#4F46E5', mb: 1 }}>₹{service.price.toLocaleString('en-IN')}</Typography>
                      <Typography variant="body2" sx={{ color: '#6B7280', fontSize: '0.85rem' }}>
                        {service.description.substring(0, 80)}{service.description.length > 80 && '...'}
                      </Typography>
                    </CardContent>
                    <CardActions sx={{ p: 2, justifyContent: 'space-between', bgcolor: '#F9FAFB' }}>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button size="small" startIcon={<InfoIcon />} onClick={() => navigate(`/services/${service._id}`)} sx={{ color: '#4F46E5', fontSize: '0.8rem' }}>
                          Details
                        </Button>
                        <Button size="small" startIcon={<VisibilityIcon />} onClick={() => handleQuickView(service)} sx={{ color: '#4F46E5', fontSize: '0.8rem' }}>
                          Quick View
                        </Button>
                      </Box>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<ScheduleIcon />}
                        onClick={() => handleOpenSchedule(service)}
                        sx={{ bgcolor: '#4F46E5', '&:hover': { bgcolor: '#4338CA' }, fontSize: '0.8rem' }}
                      >
                        Schedule
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              )) : (
                <Grid item xs={12}>
                  <Typography sx={{ textAlign: 'center', color: '#6B7280' }}>No services found for the selected filters.</Typography>
                </Grid>
              )}
            </Grid>
          </Container>
        </Box>

        {/* Why Choose Us Section */}
        <Box component="section" sx={{ py: 6, bgcolor: 'white', borderRadius: 4, boxShadow: 2, mb: 6 }}>
          <Container maxWidth="lg">
            <Typography variant="h4" sx={{ fontSize: { xs: '1.5rem', md: '2rem' }, fontWeight: 'bold', textAlign: 'center', color: '#1F2937', mb: 4 }}>
              Why Choose Us
            </Typography>
            <Typography variant="body1" sx={{ textAlign: 'center', color: '#6B7280', mb: 6, maxWidth: '600px', mx: 'auto' }}>
              Discover why thousands of customers trust us for their home service needs.
            </Typography>
            <Grid container spacing={4}>
              {whyChooseUs.map((item, index) => (
                <Grid item xs={12} sm={6} md={3} key={index}>
                  <Box sx={{ textAlign: 'center', p: 2, borderRadius: 2, bgcolor: '#EFF6FF', '&:hover': { boxShadow: 3, transform: 'translateY(-4px)' }, transition: 'all 0.3s' }}>
                    <Box sx={{ fontSize: 40, mb: 2, color: '#4F46E5' }}>{item.icon}</Box>
                    <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 'medium', color: '#1F2937', mb: 1 }}>
                      {item.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#6B7280', fontSize: '0.9rem' }}>
                      {item.description}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>

        {/* Schedule Modal */}
        <Dialog 
          open={isScheduleModalOpen} 
          onClose={handleCloseSchedule} 
          maxWidth="sm" 
          fullWidth 
          sx={{ 
            '& .MuiDialog-paper': { 
              borderRadius: 4, 
              maxHeight: { xs: '90vh', lg: 'min(90vh, 700px)' }, // Cap height on lg/xl screens
              minHeight: { lg: activeStep === 2 ? '600px' : 'auto' } // Ensure enough height for Payment step
            } 
          }}
        >
          <DialogTitle sx={{ bgcolor: '#4F46E5', color: 'white', py:1, px: 1, mb: 2, textAlign: 'center', fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
            Book Service: {selectedService?.name || 'Service'}
          </DialogTitle>
          <DialogContent sx={{
            pt: 3,
            pb: 2,
            bgcolor: '#F9FAFB',
            /* overflowY: activeStep === 2 ? 'auto' : 'hidden',
            scrollbarWidth: 'none', // Firefox
            '&::-webkit-scrollbar': { display: 'none' }, // Chrome, Safari
            '-ms-overflow-style': 'none', // IE, Edge */
            minHeight: { lg: activeStep === 2 ? '400px' : 'auto' },
            className: 'custom-scrollbar' // Ensure enough space for Payment step
          }}>
            <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
              <Step><StepLabel>Details</StepLabel></Step>
              <Step><StepLabel>Payment</StepLabel></Step>
              <Step><StepLabel>Processing</StepLabel></Step>
              <Step><StepLabel>Confirmed</StepLabel></Step>
            </Stepper>
            {scheduleError && <Alert severity="error" sx={{ mb: 2 }}>{scheduleError}</Alert>}
            {activeStep === 0 && (
              <Box>
                <TextField
                  label="Date"
                  type="date"
                  value={scheduleData.date}
                  onChange={handleDateChange}
                  fullWidth
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: new Date().toISOString().split("T")[0] }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'white' } }}
                />
                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, color: '#1F2937', fontSize: '0.9rem' }}>Available Slots:</Typography>
                {isTimeFetching ? (
                  <CircularProgress size={24} />
                ) : (
                  <Grid container spacing={1}>
                    {availableTimes.length > 0 ? (
                      availableTimes.map(time => (
                        <Grid item xs={4} sm={3} key={time}>
                          <Button
                            fullWidth
                            variant={scheduleData.time === time ? "contained" : "outlined"}
                            onClick={() => handleTimeSelect(time)}
                            sx={{ borderColor: '#4F46E5', color: scheduleData.time === time ? 'white' : '#4F46E5', bgcolor: scheduleData.time === time ? '#4F46E5' : 'white', '&:hover': { bgcolor: scheduleData.time === time ? '#4338CA' : '#EFF6FF' }, fontSize: '0.8rem' }}
                          >
                            {time}
                          </Button>
                        </Grid>
                      ))
                    ) : (
                      <Grid item xs={12}>
                        <Typography sx={{ color: '#6B7280', fontSize: '0.9rem' }}>No available slots for this date.</Typography>
                      </Grid>
                    )}
                  </Grid>
                )}
              </Box>
            )}
            {activeStep === 1 && (
              <Box>
                <Typography variant="h6" sx={{ color: '#1F2937', mb: 2, fontSize: '1.1rem' }}>Confirm Your Details</Typography>
                <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: '#F9FAFB' }}>
                  <Typography sx={{ mb: 1, fontSize: '0.9rem' }}><strong>Service:</strong> {selectedService?.name || 'N/A'}</Typography>
                  <Typography sx={{ mb: 1, fontSize: '0.9rem' }}><strong>Price:</strong> ₹{selectedService?.price?.toLocaleString('en-IN') || '0'}</Typography>
                  <Typography sx={{ mb: 1, fontSize: '0.9rem' }}><strong>Date:</strong> {scheduleData.date ? new Date(scheduleData.date).toLocaleDateString() : 'N/A'}</Typography>
                  <Typography sx={{ mb: 1, fontSize: '0.9rem' }}><strong>Time:</strong> {scheduleData.time || 'N/A'}</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: '#F9FAFB' }}>
                  <Typography sx={{ mb: 1, fontSize: '0.9rem' }}><strong>Name:</strong> {user?.name || 'N/A'}</Typography>
                  <Typography sx={{ mb: 1, fontSize: '0.9rem' }}><strong>Email:</strong> {user?.email || 'N/A'}</Typography>
                  {user?.phone ? (
                    <Typography sx={{ mb: 1, fontSize: '0.9rem' }}><strong>Phone:</strong> {user.phone}</Typography>
                  ) : (
                    <Alert severity="warning" action={
                      <Button color="inherit" size="small" onClick={() => navigate('/profile')}>
                        UPDATE PROFILE
                      </Button>
                    }>
                      <Typography sx={{ fontSize: '0.9rem' }}>Please add a phone number to your profile to continue.</Typography>
                    </Alert>
                  )}
                  <TextField
                    label="Service Location"
                    value={scheduleData.location}
                    onChange={(e) => setScheduleData({ ...scheduleData, location: e.target.value })}
                    fullWidth
                    margin="normal"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'white' }, '& .MuiInputLabel-root': { fontSize: '0.9rem' } }}
                  />
                </Paper>
                <FormControl component="fieldset" fullWidth>
                  <FormLabel
                    component="legend"
                    sx={{
                      fontWeight: 'bold',
                      color: '#111827',
                      mb: 1,
                      fontSize: '1.1rem'
                    }}
                  >
                    Select Payment Method
                  </FormLabel>
                  <RadioGroup
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    sx={{ gap: 1.5 }}
                  >
                    <FormControlLabel
                      value="Stripe"
                      control={<Radio sx={{ '&.Mui-checked': { color: '#4338CA' } }} />}
                      label={
                        <Typography sx={{ fontWeight: 500, color: '#374151' }}>
                          Pay with Card (Stripe)
                        </Typography>
                      }
                      sx={{
                        p: 1.5,
                        width: '100%',
                        m: 0,
                        borderRadius: 2,
                        border: '1px solid #D1D5DB',
                        '&:hover': { bgcolor: '#F9FAFB' },
                        '&.Mui-checked': { borderColor: '#4338CA' }
                      }}
                    />
                    <FormControlLabel
                      value="COD"
                      control={<Radio sx={{ '&.Mui-checked': { color: '#4338CA' } }} />}
                      label={
                        <Typography sx={{ fontWeight: 500, color: '#374151' }}>
                          Cash on Delivery
                        </Typography>
                      }
                      sx={{
                        p: 1.5,
                        width: '100%',
                        m: 0,
                        borderRadius: 2,
                        border: '1px solid #D1D5DB',
                        '&:hover': { bgcolor: '#F9FAFB' },
                      }}
                    />
                  </RadioGroup>
                </FormControl>
              </Box>
            )}
            {activeStep === 2 && (
              <Box sx={{ minHeight: { lg: '400px' } }}>
                <Typography variant="h6" sx={{ color: '#1F2937', mb: 2, fontSize: '1.1rem' }}>Complete Your Payment</Typography>
                <Typography sx={{ color: '#6B7280', mb: 2, fontSize: '0.9rem' }}>Please enter your payment details below to confirm the booking.</Typography>
                {clientSecret && stripePromise && (
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <CheckoutForm 
                      onPaymentSuccess={() => setActiveStep(3)} 
                      onPaymentError={(errorMsg) => setScheduleError(errorMsg)}
                    />
                  </Elements>
                )}
              </Box>
            )}
            {activeStep === 3 && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CheckCircle color="success" sx={{ fontSize: 60 }} />
                <Typography variant="h5" sx={{ mt: 2, color: '#1F2937', fontSize: '1.25rem' }}>Booking Confirmed!</Typography>
                <Typography sx={{ color: '#6B7280', fontSize: '0.9rem' }}>Your booking is successful and is awaiting provider assignment. You will be notified shortly.</Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2, justifyContent: 'center', bgcolor: '#F9FAFB' }}>
            <Button onClick={handleCloseSchedule} sx={{ color: '#4F46E5', fontSize: '0.9rem' }}>Cancel</Button>
            {(activeStep === 1 || activeStep === 2) && (
              <Button onClick={handleScheduleBack} sx={{ color: '#4F46E5', fontSize: '0.9rem' }}>Back</Button>
            )}
            {activeStep === 0 && (
              <Button
                variant="contained"
                onClick={() => setActiveStep(1)}
                disabled={!scheduleData.time}
                sx={{ bgcolor: '#4F46E5', '&:hover': { bgcolor: '#4338CA' }, fontSize: '0.9rem' }}
              >
                Next
              </Button>
            )}
            {activeStep === 1 && (
              <Button
                variant="contained"
                onClick={handleCreateBookingAndProceed}
                disabled={scheduleLoading || !user?.phone}
                sx={{ bgcolor: '#4F46E5', '&:hover': { bgcolor: '#4338CA' }, fontSize: '0.9rem' }}
              >
                {scheduleLoading ? <CircularProgress size={24} /> : proceedButtonText}
              </Button>
            )}
            {activeStep === 3 && (
              <Button
                variant="contained"
                onClick={handleCloseSchedule}
                sx={{ bgcolor: '#4F46E5', '&:hover': { bgcolor: '#4338CA' }, fontSize: '0.9rem' }}
              >
                Done
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* Quick View Modal */}
        <Dialog open={isQuickViewOpen} onClose={() => setIsQuickViewOpen(false)} maxWidth="md" fullWidth sx={{ '& .MuiDialog-paper': { borderRadius: 4, maxHeight: '90vh' } }}>
          <DialogTitle sx={{ bgcolor: '#4F46E5', color: 'white', py: 2, px: 3, mb: 2, textAlign: 'center', fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
            {selectedService?.name || 'Service'}
          </DialogTitle>
          <DialogContent sx={{ pt: 3, pb: 2, overflowY: 'hidden', bgcolor: '#F9FAFB' }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={5}>
                <CardMedia
                  component="img"
                  height="300"
                  image={getImageUrl(selectedService?.image)}
                  alt={selectedService?.name || 'Service'}
                  sx={{ objectFit: 'cover', borderRadius: 2, bgcolor: 'white', width: '100%' }}
                  onError={(e) => {
                    console.error(`Image load error for ${selectedService?.name || 'Service'}:`, e.target.src);
                    e.target.src = 'https://via.placeholder.com/300x250?text=Service+Image';
                  }}
                />
              </Grid>
              <Grid item xs={12} md={7}>
                <Typography variant="body1" sx={{ color: '#1F2937', mb: 2, fontSize: '0.9rem' }}>
                  {selectedService?.description || 'No description available.'}
                </Typography>
                <Typography variant="h6" sx={{ color: '#4F46E5', mb: 1, fontSize: '1.1rem' }}>
                  ₹{selectedService?.price?.toLocaleString('en-IN') || '0'}
                </Typography>
                <Typography variant="subtitle1" sx={{ color: '#1F2937', mb: 1, fontSize: '0.9rem' }}>
                  Category: {selectedService?.category || 'N/A'}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Rating name="read-only" value={selectedService?.averageRating || 0} readOnly precision={0.1} size="small" />
                  <Typography sx={{ ml: 1, color: '#6B7280', fontSize: '0.85rem' }}>
                    ({(selectedService?.averageRating || 0).toFixed(1)}/5, {selectedService?.feedbackCount || 0} reviews)
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2, justifyContent: 'center', bgcolor: '#F9FAFB' }}>
            <Button onClick={() => setIsQuickViewOpen(false)} sx={{ color: '#4F46E5', fontSize: '0.9rem' }}>Close</Button>
            <Button
              variant="contained"
              onClick={() => { setIsQuickViewOpen(false); navigate(`/services/${selectedService?._id || ''}`); }}
              sx={{ bgcolor: '#4F46E5', '&:hover': { bgcolor: '#4338CA' }, fontSize: '0.9rem' }}
            >
              View Full Details
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={!!message?.open} autoHideDuration={6000} onClose={() => setMessage({ open: false })}>
          <Alert onClose={() => setMessage({ open: false })} severity={message?.severity || 'info'} sx={{ width: '100%' }}>
            {message?.text}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
};

export default Services;

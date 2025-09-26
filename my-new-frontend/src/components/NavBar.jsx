import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setUser, clearUser, setLocation, addNotification, clearNotifications } from '../redux/authSlice';
import { Search, Menu, Home as HomeIcon, LogOut, Bell, MapPin, Mail, User as UserIcon, LocateFixed, IndianRupee, Award } from 'lucide-react';
import {
  Box, Modal, Button, Typography, TextField, Alert, List, ListItem, ListItemText, Snackbar, Popover, Divider,
  Avatar, Chip, CircularProgress, ListItemAvatar, ListItemButton, IconButton, Paper, Grid, Badge
} from '@mui/material';
import { styled } from '@mui/material/styles';
import io from 'socket.io-client';
import axios from 'axios';
import '../styles/NavBar.css';
import serviceHubLogo from '../assets/service-hub-logo.png';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.REACT_APP_GOOGLE_MAPS_API_KEY;
const socket = io(API_URL, {
  reconnection: true,
  reconnectionAttempts: 5,
});

const useSocketNotifications = () => {
  const dispatch = useDispatch();
  const { user, notifications = [] } = useSelector((state) => state.auth || {});
  const [notificationMessage, setNotificationMessage] = useState({ open: false, text: '' });

  useEffect(() => {
    if (user?._id) {
      const handleConnect = () => {
        socket.emit('joinRoom', user._id);
        console.log('[useSocketNotifications] Joined room:', user._id);
      };
      socket.on('connect', handleConnect);
      if (socket.connected) handleConnect();

      const handleNewNotification = (data) => {
        const notification = {
          id: Date.now().toString(), // Ensure unique ID
          message: data.message,
          read: false,
          timestamp: new Date().toISOString()
        };
        dispatch(addNotification(notification));
        setNotificationMessage({ open: true, text: data.message });
        console.log('[useSocketNotifications] New notification:', notification);
      };

      socket.on('bookingStatusUpdate', handleNewNotification);
      socket.on('newBookingAssigned', handleNewNotification);
      socket.on('newAdminReply', handleNewNotification);

      // Fetch initial notifications from backend
      const fetchNotifications = async () => {
        try {
          const response = await axios.get(`${API_URL}/api/notifications`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          response.data.forEach((notif) => {
            dispatch(addNotification({
              id: notif._id || Date.now().toString(),
              message: notif.message,
              read: notif.read || false,
              timestamp: notif.createdAt || new Date().toISOString()
            }));
          });
          console.log('[useSocketNotifications] Fetched initial notifications:', response.data);
        } catch (error) {
          console.error('[useSocketNotifications] Error fetching notifications:', error.message);
        }
      };
      fetchNotifications();

      return () => {
        socket.off('connect', handleConnect);
        socket.off('bookingStatusUpdate', handleNewNotification);
        socket.off('newBookingAssigned', handleNewNotification);
        socket.off('newAdminReply', handleNewNotification);
      };
    }
  }, [user, dispatch]);

  return { setNotificationMessage, notificationCount: notifications.length };
};

const StyledBell = styled(Bell)(({ theme, hasnotifications }) => ({
  color: hasnotifications ? theme.palette.error.main : 'hsl(220 8.9% 46.1%)',
}));

const StyledChip = styled(Chip)(({ theme, subscription }) => ({
  backgroundColor: subscription === 'pro' || subscription === 'elite' ? '#FFD700' : theme.palette.grey[200],
  color: subscription === 'pro' || subscription === 'elite' ? '#000' : theme.palette.text.primary,
  fontWeight: 'medium',
  fontSize: '0.875rem',
  padding: '0 8px',
  height: '28px',
  borderRadius: '14px',
  '& .MuiChip-icon': {
    color: subscription === 'pro' || subscription === 'elite' ? '#000' : theme.palette.text.secondary,
  },
}));

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const Navbar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const authState = useSelector((state) => state.auth);
  const { user, token, location, notifications = [] } = authState || {};
  const isAuthenticated = !!token;

  const { setNotificationMessage, notificationCount } = useSocketNotifications();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationMessage, setLocalNotificationMessage] = useState({ open: false, text: '' });
  const [locationPopupOpen, setLocationPopupOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [locationError, setLocationError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [popularCities, setPopularCities] = useState([]);
  const locationInputRef = useRef(null);
  const autocompleteService = useRef(null);
  const placesService = useRef(null);
  const sessionTokenRef = useRef(null);

  const cityIcons = { 'Mumbai': '🏙️', 'Delhi': '🕌', 'Bangalore': '🌳', 'Visakhapatnam': '🚢', 'Chennai': '🏖️', 'Kolkata': '🚋', 'Hyderabad': '🍲' };

  useEffect(() => {
    const initGoogleMaps = () => {
      if (window.google?.maps?.places) {
        sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
        autocompleteService.current = new window.google.maps.places.AutocompleteService();
        placesService.current = new window.google.maps.places.PlacesService(document.createElement('div'));
        fetchPopularCities();
      }
    };
    if (locationPopupOpen) initGoogleMaps();
  }, [locationPopupOpen]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const performSearch = async () => {
      if (debouncedSearchQuery.trim() === '') {
        setSearchResults([]);
        return;
      }
      setIsSearchLoading(true);
      try {
        const { data } = await axios.get(`${API_URL}/api/services?name=${debouncedSearchQuery}`);
        setSearchResults(data);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsSearchLoading(false);
      }
    };
    if (debouncedSearchQuery) performSearch();
  }, [debouncedSearchQuery]);

  const fetchPopularCities = async () => {
    if (!placesService.current || popularCities.length > 0) return;
    try {
      const response = await new Promise((resolve, reject) => {
        placesService.current.textSearch(
          { query: 'major cities in India', type: 'locality', region: 'IN' },
          (results, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK) resolve(results);
            else reject(status);
          }
        );
      });
      const cities = response.slice(0, 8).map(place => ({ name: place.name, placeId: place.place_id })).filter(city => city.name);
      setPopularCities(cities);
    } catch (error) {
      console.error('Error fetching popular cities:', error);
    }
  };

  const handleLocationSearchChange = (e) => {
    const value = e.target.value;
    setLocationSearch(value);
    if (!value || !autocompleteService.current) {
      setSuggestions([]);
      return;
    }
    autocompleteService.current.getPlacePredictions(
      { input: value, componentRestrictions: { country: 'IN' }, sessionToken: sessionTokenRef.current },
      (predictions, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(predictions);
        } else {
          setSuggestions([]);
        }
      }
    );
  };

  const handleCitySelect = (placeId, fallbackName) => {
    if (!placesService.current) {
      setLocationError('Location services unavailable.');
      return;
    }
    placesService.current.getDetails(
      { placeId, fields: ['formatted_address'], sessionToken: sessionTokenRef.current },
      (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          const formattedAddress = place.formatted_address || fallbackName;
          dispatch(setLocation(formattedAddress));
          setLocationPopupOpen(false);
          setSuggestions([]);
          sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
        } else {
          setLocationError('Failed to fetch location details.');
        }
      }
    );
  };

  const detectCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const { data } = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`);
            if (data.status === 'OK' && data.results[0]) {
              const formattedAddress = data.results[0].formatted_address;
              dispatch(setLocation(formattedAddress));
              setLocationPopupOpen(false);
            } else {
              setLocationError(data.error_message || 'Failed to fetch location details.');
            }
          } catch (error) {
            setLocationError('Failed to fetch location. Check internet connection.');
          }
        },
        () => { setLocationError('Unable to access your location. Please enable location services.'); }
      );
    } else {
      setLocationError('Geolocation is not supported by your browser.');
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/services?name=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const handleLogout = useCallback(() => {
    dispatch(clearUser());
    dispatch(clearNotifications()); // Clear notifications on logout
    navigate('/home');
  }, [dispatch, navigate]);

  const handlePopoverOpen = (event) => setAnchorEl(event.currentTarget);
  const handlePopoverClose = () => setAnchorEl(null);

  const handleClearNotifications = () => {
    dispatch(clearNotifications());
    console.log('[handleClearNotifications] Cleared all notifications');
  };

  const handleFindProvidersClick = () => {
    if (!location) {
      setLocationError('Please select a location to find providers.');
      setLocationPopupOpen(true);
      return;
    }
    navigate('/providers');
  };

  const handleLogoClick = () => {
    if (isAuthenticated && user?.role === 'provider') {
      navigate('/providerhome');
    } else {
      navigate('/home');
    }
  };

  const open = Boolean(anchorEl);
  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  const navigationItems = user
    ? user.role === 'provider'
      ? [
          { label: 'Dashboard', href: '/provider/dashboard', icon: UserIcon },
          { label: 'Pricing', href: '/pricing', icon: IndianRupee }
        ]
      : [
          { label: 'Home', href: '/home', icon: HomeIcon },
          { label: 'Services', href: '/services', icon: UserIcon },
          { label: 'Find Providers', onClick: handleFindProvidersClick, icon: MapPin }
        ]
    : [
        { label: 'Home', href: '/home', icon: HomeIcon },
        { label: 'Services', href: '/services', icon: UserIcon },
        { label: 'Find Providers', onClick: handleFindProvidersClick, icon: MapPin }
      ];

  return (
    <nav className={`navbar ${isScrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-container">
        <div className="navbar-content">
          <div className="navbar-logo" onClick={handleLogoClick}>
            <img src={serviceHubLogo} alt="ServiceHub Logo" className="service-hub-logo" />
          </div>

          {isAuthenticated && user?.role === 'customer' && (
            <Box className="search-container" sx={{ position: 'relative' }}>
              <form onSubmit={handleSearchSubmit} className="search-form">
                <input type="text" placeholder="Search services..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="search-input" />
                <Search className="search-icon" />
              </form>
              {(isSearchLoading || searchResults.length > 0) && (
                <Paper sx={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1200, mt: 1 }}>
                  {isSearchLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress size={24} /></Box>
                  ) : (
                    <List dense>
                      {searchResults.map(service => (
                        <ListItemButton key={service._id} component={Link} to={`/services/${service._id}`} onClick={() => { setSearchQuery(''); setSearchResults([]); }}>
                          <ListItemAvatar><Avatar src={service.image || undefined}>{!service.image && service.name.charAt(0)}</Avatar></ListItemAvatar> 
                          <ListItemText primary={service.name} secondary={`₹${service.price}`} />
                        </ListItemButton>
                      ))}
                    </List>
                  )}
                </Paper>
              )}
            </Box>
          )}

          <div className="desktop-nav">
            {navigationItems.map((item) => (
              <button key={item.label} onClick={item.onClick ? item.onClick : () => navigate(item.href)} className="nav-button">
                <item.icon className="nav-icon" />
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="navbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="location-search-container" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin style={{ color: 'hsl(220 8.9% 46.1%)', cursor: 'pointer' }} onClick={() => setLocationPopupOpen(true)} />
              {location && <span className="location-display">{location.split(',')[0]}</span>}
            </div>

            {isAuthenticated && (
              <div className="notification-container">
                <IconButton onClick={handlePopoverOpen}>
                  <Badge badgeContent={notificationCount || 0} color="error" invisible={notificationCount === 0}>
                    <StyledBell hasnotifications={notificationCount > 0 ? 1 : 0} />
                  </Badge>
                </IconButton>
              </div>
            )}

            {isAuthenticated && user?.role === 'provider' && (
              <StyledChip
                icon={<Award />}
                label={`${user?.subscriptionTier ? user.subscriptionTier.charAt(0).toUpperCase() + user.subscriptionTier.slice(1) : 'Free'} Plan`}
                subscription={user?.subscriptionTier || 'free'}
              />
            )}

            {isAuthenticated ? (
              <div className="user-menu-container">
                <button className="user-avatar-btn">
                  <Avatar src={user?.profile?.image || ''}>
                    {user?.name?.charAt(0).toUpperCase()}
                  </Avatar>
                  <span className="user-name-display">{user?.name}</span>
                </button>
                <div className="user-dropdown">
                  <div className="user-info">
                    <p className="user-name">{user?.name}</p>
                    <p className="user-email">{user?.email}</p>
                  </div>
                  <hr className="dropdown-divider" />
                  <button onClick={() => navigate(user.role === 'provider' ? '/provider/dashboard' : '/profile')} className="dropdown-item"><UserIcon className="dropdown-icon" /> Profile</button>
                  {user.role === 'customer' && <button onClick={() => navigate('/my-messages')} className="dropdown-item"><Mail className="dropdown-icon" /> My Messages</button>}
                  <hr className="dropdown-divider" />
                  <button onClick={handleLogout} className="dropdown-item logout"><LogOut className="dropdown-icon" /> Sign out</button>
                </div>
              </div>
            ) : (
              <div className="auth-buttons">
                <button onClick={() => navigate('/login')} className="auth-btn login-btn">Login</button>
                <button onClick={() => navigate('/register')} className="auth-btn signup-btn">Sign Up</button>
              </div>
            )}
            <button className="mobile-menu-btn" onClick={toggleMobileMenu} aria-label="Toggle menu"><Menu className="menu-icon" /></button>
          </div>
        </div>
      </div>
      <Modal open={locationPopupOpen} onClose={() => setLocationPopupOpen(false)}>
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: { xs: '90%', sm: 500 }, bgcolor: 'background.paper', boxShadow: 24, p: 4, borderRadius: 2, maxHeight: '90vh', overflowY: 'auto' }}>
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>Select Your Location</Typography>
          <Button variant="contained" startIcon={<LocateFixed />} onClick={detectCurrentLocation} sx={{ mb: 2, width: '100%', py: 1.5 }}>Detect My Current Location</Button>
          {locationError && <Alert severity="error" sx={{ mb: 2 }}>{locationError}</Alert>}
          <TextField
            inputRef={locationInputRef}
            value={locationSearch}
            onChange={handleLocationSearchChange}
            placeholder="Search for your area, locality or city..."
            variant="outlined"
            fullWidth
            sx={{ mb: suggestions.length > 0 ? 1 : 2 }}
          />
          {suggestions.length > 0 && (
            <Paper sx={{ maxHeight: 200, overflowY: 'auto', mb: 2 }}>
              <List dense>
                {suggestions.map((suggestion) => (
                  <ListItemButton key={suggestion.place_id} onClick={() => handleCitySelect(suggestion.place_id, suggestion.description)}>
                    <ListItemText primary={suggestion.description} />
                  </ListItemButton>
                ))}
              </List>
            </Paper>
          )}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, color: 'text.secondary' }}>Popular Cities</Typography>
            <Grid container spacing={1}>
              {popularCities.map((city) => (
                <Grid item xs={6} key={city.placeId || city.name}>
                  <Button onClick={() => handleCitySelect(city.placeId, city.name)} variant="outlined" fullWidth sx={{ textAlign: 'left', justifyContent: 'flex-start', py: 1, textTransform: 'none' }}>
                    <span style={{ marginRight: 8, fontSize: '1.2em' }}>{cityIcons[city.name] || '📍'}</span>
                    {city.name}
                  </Button>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Box>
      </Modal>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handlePopoverClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ p: 2, maxWidth: 350 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Notifications</Typography>
            {notificationCount > 0 && <Button size="small" onClick={handleClearNotifications}>Clear All</Button>}
          </Box>
          <Divider sx={{ my: 1 }} />
          {notificationCount > 0 ? (
            <List dense>
              {notifications.map((notif) => (
                <ListItem key={notif.id}>
                  <ListItemText primary={notif.message} secondary={new Date(notif.timestamp || notif.id).toLocaleString()} />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography sx={{ p: 2, color: 'text.secondary' }}>No new notifications.</Typography>
          )}
        </Box>
      </Popover>

      <Snackbar
        open={notificationMessage.open}
        autoHideDuration={6000}
        onClose={() => setLocalNotificationMessage({ ...notificationMessage, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert
          onClose={() => setLocalNotificationMessage({ ...notificationMessage, open: false })}
          severity="info"
          sx={{ width: '100%', cursor: 'pointer' }}
          onClick={() => navigate(user?.role === 'customer' ? '/profile' : '/provider/dashboard')}
        >
          {notificationMessage.text}
        </Alert>
      </Snackbar>
    </nav>
  );
};

export default Navbar;












































































































//main
/* import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setUser, clearUser, setLocation, addNotification, clearNotifications } from '../redux/authSlice';
import { Search, Menu, Home as HomeIcon, LogOut, Bell, MapPin, Mail, User as UserIcon, LocateFixed, IndianRupee, Award } from 'lucide-react';
import {
  Box, Modal, Button, Typography, TextField, Alert, List, ListItem, ListItemText, Snackbar, Popover, Divider,
  Avatar, Chip, CircularProgress, ListItemAvatar, ListItemButton, IconButton, Paper, Grid, Badge
} from '@mui/material';
import { styled } from '@mui/material/styles';
import io from 'socket.io-client';
import axios from 'axios';
import '../styles/NavBar.css';
import serviceHubLogo from '../assets/service-hub-logo.png';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.REACT_APP_GOOGLE_MAPS_API_KEY;
const socket = io(API_URL, {
  reconnection: true,
  reconnectionAttempts: 5,
});

const useSocketNotifications = () => {
  const dispatch = useDispatch();
  const { user, notifications = [] } = useSelector((state) => state.auth || {});
  const [notificationMessage, setNotificationMessage] = useState({ open: false, text: '' });

  useEffect(() => {
    if (user?._id) {
      const handleConnect = () => {
        socket.emit('joinRoom', user._id);
        console.log('[useSocketNotifications] Joined room:', user._id);
      };
      socket.on('connect', handleConnect);
      if (socket.connected) handleConnect();

      const handleNewNotification = (data) => {
        const notification = {
          id: Date.now().toString(), // Ensure unique ID
          message: data.message,
          read: false,
          timestamp: new Date().toISOString()
        };
        dispatch(addNotification(notification));
        setNotificationMessage({ open: true, text: data.message });
        console.log('[useSocketNotifications] New notification:', notification);
      };

      socket.on('bookingStatusUpdate', handleNewNotification);
      socket.on('newBookingAssigned', handleNewNotification);
      socket.on('newAdminReply', handleNewNotification);

      // Fetch initial notifications from backend
      const fetchNotifications = async () => {
        try {
          const response = await axios.get(`${API_URL}/api/notifications`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          response.data.forEach((notif) => {
            dispatch(addNotification({
              id: notif._id || Date.now().toString(),
              message: notif.message,
              read: notif.read || false,
              timestamp: notif.createdAt || new Date().toISOString()
            }));
          });
          console.log('[useSocketNotifications] Fetched initial notifications:', response.data);
        } catch (error) {
          console.error('[useSocketNotifications] Error fetching notifications:', error.message);
        }
      };
      fetchNotifications();

      return () => {
        socket.off('connect', handleConnect);
        socket.off('bookingStatusUpdate', handleNewNotification);
        socket.off('newBookingAssigned', handleNewNotification);
        socket.off('newAdminReply', handleNewNotification);
      };
    }
  }, [user, dispatch]);

  return { setNotificationMessage, notificationCount: notifications.length };
};

const StyledBell = styled(Bell)(({ theme, hasnotifications }) => ({
  color: hasnotifications ? theme.palette.error.main : 'hsl(220 8.9% 46.1%)',
}));

const StyledChip = styled(Chip)(({ theme, subscription }) => ({
  backgroundColor: subscription === 'pro' || subscription === 'elite' ? '#FFD700' : theme.palette.grey[200],
  color: subscription === 'pro' || subscription === 'elite' ? '#000' : theme.palette.text.primary,
  fontWeight: 'medium',
  fontSize: '0.875rem',
  padding: '0 8px',
  height: '28px',
  borderRadius: '14px',
  '& .MuiChip-icon': {
    color: subscription === 'pro' || subscription === 'elite' ? '#000' : theme.palette.text.secondary,
  },
}));

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const Navbar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const authState = useSelector((state) => state.auth);
  const { user, token, location, notifications = [] } = authState || {};
  const isAuthenticated = !!token;

  const { setNotificationMessage, notificationCount } = useSocketNotifications();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationMessage, setLocalNotificationMessage] = useState({ open: false, text: '' });
  const [locationPopupOpen, setLocationPopupOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [locationError, setLocationError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [popularCities, setPopularCities] = useState([]);
  const locationInputRef = useRef(null);
  const autocompleteService = useRef(null);
  const placesService = useRef(null);
  const sessionTokenRef = useRef(null);

  const cityIcons = { 'Mumbai': '🏙️', 'Delhi': '🕌', 'Bangalore': '🌳', 'Visakhapatnam': '🚢', 'Chennai': '🏖️', 'Kolkata': '🚋', 'Hyderabad': '🍲' };

  useEffect(() => {
    const initGoogleMaps = () => {
      if (window.google?.maps?.places) {
        sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
        autocompleteService.current = new window.google.maps.places.AutocompleteService();
        placesService.current = new window.google.maps.places.PlacesService(document.createElement('div'));
        fetchPopularCities();
      }
    };
    if (locationPopupOpen) initGoogleMaps();
  }, [locationPopupOpen]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const performSearch = async () => {
      if (debouncedSearchQuery.trim() === '') {
        setSearchResults([]);
        return;
      }
      setIsSearchLoading(true);
      try {
        const { data } = await axios.get(`${API_URL}/api/services?name=${debouncedSearchQuery}`);
        setSearchResults(data);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsSearchLoading(false);
      }
    };
    if (debouncedSearchQuery) performSearch();
  }, [debouncedSearchQuery]);

  const fetchPopularCities = async () => {
    if (!placesService.current || popularCities.length > 0) return;
    try {
      const response = await new Promise((resolve, reject) => {
        placesService.current.textSearch(
          { query: 'major cities in India', type: 'locality', region: 'IN' },
          (results, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK) resolve(results);
            else reject(status);
          }
        );
      });
      const cities = response.slice(0, 8).map(place => ({ name: place.name, placeId: place.place_id })).filter(city => city.name);
      setPopularCities(cities);
    } catch (error) {
      console.error('Error fetching popular cities:', error);
    }
  };

  const handleLocationSearchChange = (e) => {
    const value = e.target.value;
    setLocationSearch(value);
    if (!value || !autocompleteService.current) {
      setSuggestions([]);
      return;
    }
    autocompleteService.current.getPlacePredictions(
      { input: value, componentRestrictions: { country: 'IN' }, sessionToken: sessionTokenRef.current },
      (predictions, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(predictions);
        } else {
          setSuggestions([]);
        }
      }
    );
  };

  const handleCitySelect = (placeId, fallbackName) => {
    if (!placesService.current) {
      setLocationError('Location services unavailable.');
      return;
    }
    placesService.current.getDetails(
      { placeId, fields: ['formatted_address'], sessionToken: sessionTokenRef.current },
      (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          const formattedAddress = place.formatted_address || fallbackName;
          dispatch(setLocation(formattedAddress));
          setLocationPopupOpen(false);
          setSuggestions([]);
          sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
        } else {
          setLocationError('Failed to fetch location details.');
        }
      }
    );
  };

  const detectCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const { data } = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`);
            if (data.status === 'OK' && data.results[0]) {
              const formattedAddress = data.results[0].formatted_address;
              dispatch(setLocation(formattedAddress));
              setLocationPopupOpen(false);
            } else {
              setLocationError(data.error_message || 'Failed to fetch location details.');
            }
          } catch (error) {
            setLocationError('Failed to fetch location. Check internet connection.');
          }
        },
        () => { setLocationError('Unable to access your location. Please enable location services.'); }
      );
    } else {
      setLocationError('Geolocation is not supported by your browser.');
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/services?name=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const handleLogout = useCallback(() => {
    dispatch(clearUser());
    dispatch(clearNotifications()); // Clear notifications on logout
    navigate('/home');
  }, [dispatch, navigate]);

  const handlePopoverOpen = (event) => setAnchorEl(event.currentTarget);
  const handlePopoverClose = () => setAnchorEl(null);

  const handleClearNotifications = () => {
    dispatch(clearNotifications());
    console.log('[handleClearNotifications] Cleared all notifications');
  };

  const handleFindProvidersClick = () => {
    if (!location) {
      setLocationError('Please select a location to find providers.');
      setLocationPopupOpen(true);
      return;
    }
    navigate('/providers');
  };

  const handleLogoClick = () => {
    if (isAuthenticated && user?.role === 'provider') {
      navigate('/providerhome');
    } else {
      navigate('/home');
    }
  };

  const open = Boolean(anchorEl);
  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  const navigationItems = user
    ? user.role === 'provider'
      ? [
          { label: 'Dashboard', href: '/provider/dashboard', icon: UserIcon },
          { label: 'Pricing', href: '/pricing', icon: IndianRupee }
        ]
      : [
          { label: 'Home', href: '/home', icon: HomeIcon },
          { label: 'Services', href: '/services', icon: UserIcon },
          { label: 'Find Providers', onClick: handleFindProvidersClick, icon: MapPin }
        ]
    : [
        { label: 'Home', href: '/home', icon: HomeIcon },
        { label: 'Services', href: '/services', icon: UserIcon },
        { label: 'Find Providers', onClick: handleFindProvidersClick, icon: MapPin }
      ];

  return (
    <nav className={`navbar ${isScrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-container">
        <div className="navbar-content">
          <div className="navbar-logo" onClick={handleLogoClick}>
            <img src={serviceHubLogo} alt="ServiceHub Logo" className="service-hub-logo" />
          </div>

          {isAuthenticated && user?.role === 'customer' && (
            <Box className="search-container" sx={{ position: 'relative' }}>
              <form onSubmit={handleSearchSubmit} className="search-form">
                <input type="text" placeholder="Search services..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="search-input" />
                <Search className="search-icon" />
              </form>
              {(isSearchLoading || searchResults.length > 0) && (
                <Paper sx={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1200, mt: 1 }}>
                  {isSearchLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress size={24} /></Box>
                  ) : (
                    <List dense>
                      {searchResults.map(service => (
                        <ListItemButton key={service._id} component={Link} to={`/services/${service._id}`} onClick={() => { setSearchQuery(''); setSearchResults([]); }}>
                          <ListItemAvatar><Avatar src={service.image ? `${API_URL}${service.image}` : undefined}>{!service.image && service.name.charAt(0)}</Avatar></ListItemAvatar>
                          <ListItemText primary={service.name} secondary={`₹${service.price}`} />
                        </ListItemButton>
                      ))}
                    </List>
                  )}
                </Paper>
              )}
            </Box>
          )}

          <div className="desktop-nav">
            {navigationItems.map((item) => (
              <button key={item.label} onClick={item.onClick ? item.onClick : () => navigate(item.href)} className="nav-button">
                <item.icon className="nav-icon" />
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="navbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="location-search-container" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin style={{ color: 'hsl(220 8.9% 46.1%)', cursor: 'pointer' }} onClick={() => setLocationPopupOpen(true)} />
              {location && <span className="location-display">{location.split(',')[0]}</span>}
            </div>

            {isAuthenticated && (
              <div className="notification-container">
                <IconButton onClick={handlePopoverOpen}>
                  <Badge badgeContent={notificationCount || 0} color="error" invisible={notificationCount === 0}>
                    <StyledBell hasnotifications={notificationCount > 0 ? 1 : 0} />
                  </Badge>
                </IconButton>
              </div>
            )}

            {isAuthenticated && user?.role === 'provider' && (
              <StyledChip
                icon={<Award />}
                label={`${user?.subscriptionTier ? user.subscriptionTier.charAt(0).toUpperCase() + user.subscriptionTier.slice(1) : 'Free'} Plan`}
                subscription={user?.subscriptionTier || 'free'}
              />
            )}

            {isAuthenticated ? (
              <div className="user-menu-container">
                <button className="user-avatar-btn">
                  <Avatar src={user?.profile?.image ? `${API_URL}${user.profile.image}` : ''}>
                    {user?.name?.charAt(0).toUpperCase()}
                  </Avatar>
                  <span className="user-name-display">{user?.name}</span>
                </button>
                <div className="user-dropdown">
                  <div className="user-info">
                    <p className="user-name">{user?.name}</p>
                    <p className="user-email">{user?.email}</p>
                  </div>
                  <hr className="dropdown-divider" />
                  <button onClick={() => navigate(user.role === 'provider' ? '/provider/dashboard' : '/profile')} className="dropdown-item"><UserIcon className="dropdown-icon" /> Profile</button>
                  {user.role === 'customer' && <button onClick={() => navigate('/my-messages')} className="dropdown-item"><Mail className="dropdown-icon" /> My Messages</button>}
                  <hr className="dropdown-divider" />
                  <button onClick={handleLogout} className="dropdown-item logout"><LogOut className="dropdown-icon" /> Sign out</button>
                </div>
              </div>
            ) : (
              <div className="auth-buttons">
                <button onClick={() => navigate('/login')} className="auth-btn login-btn">Login</button>
                <button onClick={() => navigate('/register')} className="auth-btn signup-btn">Sign Up</button>
              </div>
            )}
            <button className="mobile-menu-btn" onClick={toggleMobileMenu} aria-label="Toggle menu"><Menu className="menu-icon" /></button>
          </div>
        </div>
      </div>
      <Modal open={locationPopupOpen} onClose={() => setLocationPopupOpen(false)}>
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: { xs: '90%', sm: 500 }, bgcolor: 'background.paper', boxShadow: 24, p: 4, borderRadius: 2, maxHeight: '90vh', overflowY: 'auto' }}>
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>Select Your Location</Typography>
          <Button variant="contained" startIcon={<LocateFixed />} onClick={detectCurrentLocation} sx={{ mb: 2, width: '100%', py: 1.5 }}>Detect My Current Location</Button>
          {locationError && <Alert severity="error" sx={{ mb: 2 }}>{locationError}</Alert>}
          <TextField
            inputRef={locationInputRef}
            value={locationSearch}
            onChange={handleLocationSearchChange}
            placeholder="Search for your area, locality or city..."
            variant="outlined"
            fullWidth
            sx={{ mb: suggestions.length > 0 ? 1 : 2 }}
          />
          {suggestions.length > 0 && (
            <Paper sx={{ maxHeight: 200, overflowY: 'auto', mb: 2 }}>
              <List dense>
                {suggestions.map((suggestion) => (
                  <ListItemButton key={suggestion.place_id} onClick={() => handleCitySelect(suggestion.place_id, suggestion.description)}>
                    <ListItemText primary={suggestion.description} />
                  </ListItemButton>
                ))}
              </List>
            </Paper>
          )}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, color: 'text.secondary' }}>Popular Cities</Typography>
            <Grid container spacing={1}>
              {popularCities.map((city) => (
                <Grid item xs={6} key={city.placeId || city.name}>
                  <Button onClick={() => handleCitySelect(city.placeId, city.name)} variant="outlined" fullWidth sx={{ textAlign: 'left', justifyContent: 'flex-start', py: 1, textTransform: 'none' }}>
                    <span style={{ marginRight: 8, fontSize: '1.2em' }}>{cityIcons[city.name] || '📍'}</span>
                    {city.name}
                  </Button>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Box>
      </Modal>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handlePopoverClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ p: 2, maxWidth: 350 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Notifications</Typography>
            {notificationCount > 0 && <Button size="small" onClick={handleClearNotifications}>Clear All</Button>}
          </Box>
          <Divider sx={{ my: 1 }} />
          {notificationCount > 0 ? (
            <List dense>
              {notifications.map((notif) => (
                <ListItem key={notif.id}>
                  <ListItemText primary={notif.message} secondary={new Date(notif.timestamp || notif.id).toLocaleString()} />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography sx={{ p: 2, color: 'text.secondary' }}>No new notifications.</Typography>
          )}
        </Box>
      </Popover>

      <Snackbar
        open={notificationMessage.open}
        autoHideDuration={6000}
        onClose={() => setLocalNotificationMessage({ ...notificationMessage, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert
          onClose={() => setLocalNotificationMessage({ ...notificationMessage, open: false })}
          severity="info"
          sx={{ width: '100%', cursor: 'pointer' }}
          onClick={() => navigate(user?.role === 'customer' ? '/profile' : '/provider/dashboard')}
        >
          {notificationMessage.text}
        </Alert>
      </Snackbar>
    </nav>
  );
};

export default Navbar;  */








































































//min2
/* import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setUser, clearUser, setLocation, addNotification, clearNotifications } from '../redux/authSlice';
import { Search, Menu, Home as HomeIcon, LogOut, Bell, MapPin, Mail, User as UserIcon, LocateFixed } from 'lucide-react';
import {
  Box, Modal, Button, Typography, TextField, Alert, List, ListItem, ListItemText, Snackbar, Popover, Divider,
  Avatar, Badge, CircularProgress, ListItemAvatar, ListItemButton, IconButton, Paper, Grid
} from '@mui/material';
import { styled } from '@mui/material/styles';
import io from 'socket.io-client';
import axios from 'axios';
import '../styles/NavBar.css';
import serviceHubLogo from '../assets/service-hub-logo.png';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.REACT_APP_GOOGLE_MAPS_API_KEY;
const socket = io(API_URL, {
  reconnection: true,
  reconnectionAttempts: 5,
});

const useSocketNotifications = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth || {});
  const [notificationMessage, setNotificationMessage] = useState({ open: false, text: '' });

  useEffect(() => {
    if (user?._id) {
      const handleConnect = () => socket.emit('joinRoom', user._id);
      socket.on('connect', handleConnect);
      if (socket.connected) handleConnect();
      
      const handleNewNotification = (data) => {
        dispatch(addNotification({ ...data, id: Date.now(), read: false }));
        setNotificationMessage({ open: true, text: data.message });
      };

      socket.on('bookingStatusUpdate', handleNewNotification);
      socket.on('newBookingAssigned', handleNewNotification);
      socket.on('newAdminReply', handleNewNotification);

      return () => {
        socket.off('connect', handleConnect);
        socket.off('bookingStatusUpdate', handleNewNotification);
        socket.off('newBookingAssigned', handleNewNotification);
        socket.off('newAdminReply', handleNewNotification);
      };
    }
  }, [user, dispatch]);

  return { setNotificationMessage };
};

const StyledBell = styled(Bell)(({ theme, hasnotifications }) => ({
  color: hasnotifications ? theme.palette.error.main : 'hsl(220 8.9% 46.1%)',
}));

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};


const Navbar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const authState = useSelector((state) => state.auth);
  const { user, token, location, notifications = [] } = authState || {};
  const isAuthenticated = !!token;

  const { setNotificationMessage } = useSocketNotifications();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationMessage, setLocalNotificationMessage] = useState({ open: false, text: '' });
  const [locationPopupOpen, setLocationPopupOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [locationError, setLocationError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [popularCities, setPopularCities] = useState([]);
  const locationInputRef = useRef(null);
  const autocompleteService = useRef(null);
  const placesService = useRef(null);
  const sessionTokenRef = useRef(null);

  const cityIcons = { 'Mumbai': '🏙️', 'Delhi': '🕌', 'Bangalore': '🌳', 'Visakhapatnam': '🚢', 'Chennai': '🏖️', 'Kolkata': '🚋', 'Hyderabad': '🍲' };

  useEffect(() => {
    const initGoogleMaps = () => {
      if (window.google?.maps?.places) {
        sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
        autocompleteService.current = new window.google.maps.places.AutocompleteService();
        placesService.current = new window.google.maps.places.PlacesService(document.createElement('div'));
        fetchPopularCities();
      }
    };
    if (locationPopupOpen) initGoogleMaps();
  }, [locationPopupOpen]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const performSearch = async () => {
      if (debouncedSearchQuery.trim() === '') {
        setSearchResults([]);
        return;
      }
      setIsSearchLoading(true);
      try {
        const { data } = await axios.get(`${API_URL}/api/services?name=${debouncedSearchQuery}`);
        setSearchResults(data);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsSearchLoading(false);
      }
    };
    if (debouncedSearchQuery) performSearch();
  }, [debouncedSearchQuery]);

  const fetchPopularCities = async () => {
    if (!placesService.current || popularCities.length > 0) return;
    try {
      const response = await new Promise((resolve, reject) => {
        placesService.current.textSearch(
          { query: 'major cities in India', type: 'locality', region: 'IN' },
          (results, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK) resolve(results);
            else reject(status);
          }
        );
      });
      const cities = response.slice(0, 8).map(place => ({ name: place.name, placeId: place.place_id })).filter(city => city.name);
      setPopularCities(cities);
    } catch (error) {
      console.error('Error fetching popular cities:', error);
    }
  };

  const handleLocationSearchChange = (e) => {
    const value = e.target.value;
    setLocationSearch(value);
    if (!value || !autocompleteService.current) {
      setSuggestions([]);
      return;
    }
    autocompleteService.current.getPlacePredictions(
      { input: value, componentRestrictions: { country: 'IN' }, sessionToken: sessionTokenRef.current },
      (predictions, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(predictions);
        } else {
          setSuggestions([]);
        }
      }
    );
  };

  const handleCitySelect = (placeId, fallbackName) => {
    if (!placesService.current) {
      setLocationError('Location services unavailable.');
      return;
    }
    placesService.current.getDetails(
      { placeId, fields: ['formatted_address'], sessionToken: sessionTokenRef.current },
      (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          const formattedAddress = place.formatted_address || fallbackName;
          dispatch(setLocation(formattedAddress));
          setLocationPopupOpen(false);
          setSuggestions([]);
          sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
        } else {
          setLocationError('Failed to fetch location details.');
        }
      }
    );
  };

  const detectCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const { data } = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`);
            if (data.status === 'OK' && data.results[0]) {
              const formattedAddress = data.results[0].formatted_address;
              dispatch(setLocation(formattedAddress));
              setLocationPopupOpen(false);
            } else {
              setLocationError(data.error_message || 'Failed to fetch location details.');
            }
          } catch (error) {
            setLocationError('Failed to fetch location. Check internet connection.');
          }
        },
        () => { setLocationError('Unable to access your location. Please enable location services.'); }
      );
    } else {
      setLocationError('Geolocation is not supported by your browser.');
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/services?name=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const handleLogout = useCallback(() => {
    dispatch(clearUser());
    navigate('/home');
  }, [dispatch, navigate]);

  const handlePopoverOpen = (event) => setAnchorEl(event.currentTarget);
  const handlePopoverClose = () => setAnchorEl(null);

  const handleClearNotifications = () => dispatch(clearNotifications());

  const handleFindProvidersClick = () => {
    if (!location) {
      setLocationError('Please select a location to find providers.');
      setLocationPopupOpen(true);
      return;
    }
    navigate('/providers');
  };


  // This function checks the user's role before navigating
  const handleLogoClick = () => {
    // Check if the user is authenticated AND if their role is 'provider'
    if (isAuthenticated && user?.role === 'provider') {
      // If yes, navigate to the provider's dedicated homepage
      navigate('/providerhome');
    } else {
      // For customers or non-logged-in users, navigate to the public homepage
      navigate('/home');
    }
  };

  const open = Boolean(anchorEl);
  const notificationCount = notifications.length;
  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  const navigationItems = user
    ? user.role === 'provider'
      ? [{ label: 'Dashboard', href: '/provider/dashboard', icon: UserIcon }, { label: 'Pricing', href: '/pricing', icon: HomeIcon }]
      : [
          { label: 'Home', href: '/home', icon: HomeIcon },
          { label: 'Services', href: '/services', icon: UserIcon },
          { label: 'Find Providers', onClick: handleFindProvidersClick, icon: MapPin }
        ]
    : [
        { label: 'Home', href: '/home', icon: HomeIcon },
        { label: 'Services', href: '/services', icon: UserIcon },
        { label: 'Find Providers', onClick: handleFindProvidersClick, icon: MapPin }
      ];

  return (
    <nav className={`navbar ${isScrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-container">
        <div className="navbar-content">
         <div className="navbar-logo" onClick={handleLogoClick}>
            <img src={serviceHubLogo} alt="ServiceHub Logo" className="service-hub-logo" />
          </div>

          {isAuthenticated && user?.role === 'customer' && (
            <Box className="search-container" sx={{ position: 'relative' }}>
              <form onSubmit={handleSearchSubmit} className="search-form">
                <input type="text" placeholder="Search services..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="search-input" />
                <Search className="search-icon" />
              </form>
              {(isSearchLoading || searchResults.length > 0) && (
                <Paper sx={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1200, mt: 1 }}>
                  {isSearchLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress size={24} /></Box>
                  ) : (
                    <List dense>
                      {searchResults.map(service => (
                        <ListItemButton key={service._id} component={Link} to={`/services/${service._id}`} onClick={() => { setSearchQuery(''); setSearchResults([]); }}>
                          <ListItemAvatar><Avatar src={service.image ? `${API_URL}${service.image}` : undefined}>{!service.image && service.name.charAt(0)}</Avatar></ListItemAvatar>
                          <ListItemText primary={service.name} secondary={`₹${service.price}`} />
                        </ListItemButton>
                      ))}
                    </List>
                  )}
                </Paper>
              )}
            </Box>
          )}

          <div className="desktop-nav">
            {navigationItems.map((item) => (
              <button key={item.label} onClick={item.onClick ? item.onClick : () => navigate(item.href)} className="nav-button">
                <item.icon className="nav-icon" />
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="navbar-actions">
            <div className="location-search-container" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin style={{ color: 'hsl(220 8.9% 46.1%)', cursor: 'pointer' }} onClick={() => setLocationPopupOpen(true)} />
              {location && <span className="location-display">{location.split(',')[0]}</span>}
            </div>

            {isAuthenticated && (
              <div className="notification-container">
                <IconButton onClick={handlePopoverOpen}>
                  <Badge badgeContent={notificationCount} color="error">
                    <StyledBell hasnotifications={notificationCount > 0 ? 1 : 0} />
                  </Badge>
                </IconButton>
              </div>
            )}

            {isAuthenticated ? (
              <div className="user-menu-container">
                <button className="user-avatar-btn">
                  <Avatar src={user?.profile?.image ? `${API_URL}${user.profile.image}` : ''}>{user?.name?.charAt(0).toUpperCase()}</Avatar>
                  <span className="user-name-display">{user?.name}</span>
                </button>
                <div className="user-dropdown">
                  <div className="user-info"><p className="user-name">{user?.name}</p><p className="user-email">{user?.email}</p></div>
                  <hr className="dropdown-divider" />
                  <button onClick={() => navigate(user.role === 'provider' ? '/provider/dashboard' : '/profile')} className="dropdown-item"><UserIcon className="dropdown-icon" /> Profile</button>
                  {user.role === 'customer' && <button onClick={() => navigate('/my-messages')} className="dropdown-item"><Mail className="dropdown-icon" /> My Messages</button>}
                  <hr className="dropdown-divider" />
                  <button onClick={handleLogout} className="dropdown-item logout"><LogOut className="dropdown-icon" /> Sign out</button>
                </div>
              </div>
            ) : (
              <div className="auth-buttons">
                <button onClick={() => navigate('/login')} className="auth-btn login-btn">Login</button>
                <button onClick={() => navigate('/register')} className="auth-btn signup-btn">Sign Up</button>
              </div>
            )}
            <button className="mobile-menu-btn" onClick={toggleMobileMenu} aria-label="Toggle menu"><Menu className="menu-icon" /></button>
          </div>
        </div>
      </div>
      <Modal open={locationPopupOpen} onClose={() => setLocationPopupOpen(false)}>
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: { xs: '90%', sm: 500 }, bgcolor: 'background.paper', boxShadow: 24, p: 4, borderRadius: 2, maxHeight: '90vh', overflowY: 'auto' }}>
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>Select Your Location</Typography>
          <Button variant="contained" startIcon={<LocateFixed />} onClick={detectCurrentLocation} sx={{ mb: 2, width: '100%', py: 1.5 }}>Detect My Current Location</Button>
          {locationError && <Alert severity="error" sx={{ mb: 2 }}>{locationError}</Alert>}
          <TextField
            inputRef={locationInputRef}
            value={locationSearch}
            onChange={handleLocationSearchChange}
            placeholder="Search for your area, locality or city..."
            variant="outlined"
            fullWidth
            sx={{ mb: suggestions.length > 0 ? 1 : 2 }}
          />
          {suggestions.length > 0 && (
            <Paper sx={{ maxHeight: 200, overflowY: 'auto', mb: 2 }}>
              <List dense>
                {suggestions.map((suggestion) => (
                  <ListItemButton key={suggestion.place_id} onClick={() => handleCitySelect(suggestion.place_id, suggestion.description)}>
                    <ListItemText primary={suggestion.description} />
                  </ListItemButton>
                ))}
              </List>
            </Paper>
          )}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, color: 'text.secondary' }}>Popular Cities</Typography>
            <Grid container spacing={1}>
              {popularCities.map((city) => (
                <Grid item xs={6} key={city.placeId || city.name}>
                  <Button onClick={() => handleCitySelect(city.placeId, city.name)} variant="outlined" fullWidth sx={{ textAlign: 'left', justifyContent: 'flex-start', py: 1, textTransform: 'none' }}>
                    <span style={{ marginRight: 8, fontSize: '1.2em' }}>{cityIcons[city.name] || '📍'}</span>
                    {city.name}
                  </Button>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Box>
      </Modal>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handlePopoverClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ p: 2, maxWidth: 350 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Notifications</Typography>
            {notifications.length > 0 && <Button size="small" onClick={handleClearNotifications}>Clear All</Button>}
          </Box>
          <Divider sx={{ my: 1 }} />
          {notifications.length > 0 ? (
            <List dense>
              {notifications.map((notif) => (
                <ListItem key={notif.id}>
                  <ListItemText primary={notif.message} secondary={new Date(notif.id).toLocaleString()} />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography sx={{ p: 2, color: 'text.secondary' }}>No new notifications.</Typography>
          )}
        </Box>
      </Popover>

      <Snackbar
        open={notificationMessage.open}
        autoHideDuration={6000}
        onClose={() => setLocalNotificationMessage({ ...notificationMessage, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert
          onClose={() => setLocalNotificationMessage({ ...notificationMessage, open: false })}
          severity="info"
          sx={{ width: '100%', cursor: 'pointer' }}
          onClick={() => navigate(user?.role === 'customer' ? '/profile' : '/provider/dashboard')}
        >
          {notificationMessage.text}
        </Alert>
      </Snackbar>
    </nav>
  );
};

export default Navbar; */

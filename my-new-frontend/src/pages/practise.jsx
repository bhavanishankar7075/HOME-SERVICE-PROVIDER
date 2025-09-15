import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clearUser, setLocation, addNotification, clearNotifications } from '../redux/authSlice';
import { Search, Menu, Home as HomeIcon, LogOut, Bell, MapPin, Mail, User as UserIcon } from 'lucide-react';
import {
  Box, Modal, Button, Typography, TextField, Alert, List, ListItem, ListItemText, Snackbar, Popover, Divider,
  Avatar, Badge, CircularProgress, ListItemAvatar, ListItemButton
} from '@mui/material';
import { styled } from '@mui/material/styles';
import io from 'socket.io-client';
import '../styles/NavBar.css';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const socket = io(API_URL, {
    reconnection: true,
    reconnectionAttempts: 5,
});

const useSocketNotifications = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
  
    useEffect(() => {
      if (user?._id) {
        const handleConnect = () => {
          socket.emit('joinRoom', user._id);
        };
  
        socket.on('connect', handleConnect);
        if (socket.connected) {
          handleConnect();
        }
  
        const handleNewNotification = (data) => {
          dispatch(addNotification({ ...data, id: Date.now(), read: false }));
        };
  
        socket.on('bookingStatusUpdate', handleNewNotification);
        socket.on('newBookingAssigned', handleNewNotification);
  
        return () => {
          socket.off('connect', handleConnect);
          socket.off('bookingStatusUpdate', handleNewNotification);
          socket.off('newBookingAssigned', handleNewNotification);
        };
      }
    }, [user, dispatch]);
};

const StyledBell = styled(Bell, {
    shouldForwardProp: (prop) => prop !== 'hasnotifications',
  })(({ theme, hasnotifications }) => ({
    color: hasnotifications ? theme.palette.error.main : 'hsl(220 8.9% 46.1%)',
    transition: 'color 0.3s',
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
  const { user, token, location, notifications } = useSelector((state) => state.auth);

  useSocketNotifications();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationMessage, setNotificationMessage] = useState({ open: false, text: '' });
  const [locationPopupOpen, setLocationPopupOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [locationError, setLocationError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [popularCities, setPopularCities] = useState([]);
  const locationInputRef = useRef(null);
  const autocompleteService = useRef(null);
  const placesService = useRef(null);
  const sessionTokenRef = useRef(null);

  const cityIcons = {
    'Mumbai': '🏙️', 'Delhi': '🕌', 'Bangalore': '🌳', 'Chennai': '🏖️',
    'Kolkata': '🚋', 'Hyderabad': '🍲', 'Pune': '🏰', 'Ahmedabad': '🕌',
    'Visakhapatnam': '🚢',
  };

  useEffect(() => {
    if (window.google && window.google.maps && window.google.maps.places) {
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
      autocompleteService.current = new window.google.maps.places.AutocompleteService();
      placesService.current = new window.google.maps.places.PlacesService(document.createElement('div'));
      fetchPopularCities();
    } else {
      setLocationError('Google Maps API failed to load. Please try again later.');
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (location) {
      setLocationSearch(location);
    }
  }, [location]);

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
    performSearch();
  }, [debouncedSearchQuery]);
  
  const fetchPopularCities = async () => {
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
      const cities = response.slice(0, 8).map(place => ({
        name: place.name,
        placeId: place.place_id,
      })).filter(city => city.name);
      setPopularCities(cities);
    } catch (error) {
      console.error('Error fetching popular cities:', error);
      setLocationError('Failed to fetch popular cities.');
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
      { input: value, types: ['(cities)'], componentRestrictions: { country: 'IN' }, sessionToken: sessionTokenRef.current },
      (predictions, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
          setSuggestions(predictions || []);
          setLocationError('');
        } else {
          setSuggestions([]);
        }
      }
    );
  };

  const handleCitySelect = (placeId, fallbackName) => {
    placesService.current.getDetails(
      { placeId, fields: ['name', 'formatted_address'], sessionToken: sessionTokenRef.current },
      (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
          const formattedAddress = place.formatted_address || fallbackName || 'Unknown';
          dispatch(setLocation(formattedAddress));
          setLocationSearch('');
          setSuggestions([]);
          setLocationPopupOpen(false);
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
            const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`);
            const data = await response.json();
            if (data.status !== 'OK') {
              setLocationError(data.error_message || 'Failed to fetch location details.');
              return;
            }
            const formattedAddress = data.results[0]?.formatted_address || 'Unknown';
            dispatch(setLocation(formattedAddress));
            setLocationPopupOpen(false);
          } catch (error) {
            setLocationError('Failed to fetch location. Check internet connection.');
          }
        },
        () => {
          setLocationError('Unable to access your location. Please enable location services.');
        }
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

  const handleClearNotifications = () => {
    dispatch(clearNotifications());
  };

  const open = Boolean(anchorEl);
  const notificationCount = notifications.length;

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  const navigationItems = user
    ? user.role === 'provider'
      ? [{ label: 'Dashboard', href: '/provider/dashboard', icon: UserIcon }]
      : [{ label: 'Home', href: '/home', icon: HomeIcon }, { label: 'Services', href: '/services', icon: UserIcon }]
    : [{ label: 'Home', href: '/home', icon: HomeIcon }, { label: 'Services', href: '/services', icon: UserIcon }];
  
  const isAuthenticated = !!user;

  return (
    <nav className={`navbar ${isScrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-container">
        <div className="navbar-content">
          <div className="navbar-logo" onClick={() => navigate('/home')}>
            <HomeIcon style={{ color: 'white', width: '24px', height: '24px' }} />
            <div className="logo-text">
              <span className="logo-title">ServiceHub</span>
              <div className="logo-subtitle">Home Services</div>
            </div>
          </div>

          {isAuthenticated && user?.role === 'customer' && (
            <Box className="search-container" sx={{ position: 'relative' }}>
              <form onSubmit={handleSearchSubmit} className="search-form">
                <input
                  type="text"
                  placeholder="Search services..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
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
                          <ListItemAvatar>
                            <Avatar src={service.image ? `${API_URL}${service.image}` : undefined}>
                              {!service.image && service.name.charAt(0)}
                            </Avatar>
                          </ListItemAvatar>
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
              <button key={item.href} onClick={() => navigate(item.href)} className="nav-button">
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
                  <div className="user-info">
                    <p className="user-name">{user?.name}</p>
                    <p className="user-email">{user?.email}</p>
                  </div>
                  <hr className="dropdown-divider" />
                  <button onClick={() => navigate(user.role === 'provider' ? '/provider/dashboard' : '/profile')} className="dropdown-item">
                    <UserIcon className="dropdown-icon" /> Profile
                  </button>
                  {user.role === 'customer' && <button onClick={() => navigate('/my-messages')} className="dropdown-item"><Mail className="dropdown-icon" /> My Messages</button>}
                  <hr className="dropdown-divider" />
                  <button onClick={handleLogout} className="dropdown-item logout">
                    <LogOut className="dropdown-icon" /> Sign out
                  </button>
                </div>
              </div>
            ) : (
              <div className="auth-buttons">
                <button onClick={() => navigate('/login')} className="auth-btn login-btn">Login</button>
                <button onClick={() => navigate('/register')} className="auth-btn signup-btn">Sign Up</button>
              </div>
            )}

            <button className="mobile-menu-btn" onClick={toggleMobileMenu} aria-label="Toggle menu">
              <Menu className="menu-icon" />
            </button>
          </div>
        </div>
      </div>
      
      <Modal open={locationPopupOpen} onClose={() => setLocationPopupOpen(false)}>
        <Box className="location-modal">
          <Typography className="location-modal-title">Select Your Location</Typography>
          <Button className="detect-location-btn" onClick={detectCurrentLocation}>
            Detect My Location
          </Button>
          {locationError && <Alert severity="error">{locationError}</Alert>}
          <div className="location-search-section">
            <TextField
              inputRef={locationInputRef}
              value={locationSearch}
              onChange={handleLocationSearchChange}
              placeholder="Search for a city..."
              variant="outlined"
              fullWidth
              className="location-search-input"
            />
            {suggestions.length > 0 && (
              <List className="location-suggestions">
                {suggestions.map((suggestion) => (
                  <ListItem
                    key={suggestion.place_id}
                    button
                    onClick={() => handleCitySelect(suggestion.place_id, suggestion.description)}
                    className="city-option"
                  >
                    <span className="city-icon">📍</span>
                    <ListItemText primary={suggestion.description} />
                  </ListItem>
                ))}
              </List>
            )}
          </div>
          {popularCities.length > 0 && (
            <div className="popular-cities">
              <Typography className="popular-cities-title">Popular Cities</Typography>
              <div className="popular-cities-grid">
                {popularCities.map((city) => (
                  <Button
                    key={city.placeId || city}
                    onClick={() => handleCitySelect(city.placeId, city.name)}
                    className="popular-city-option"
                  >
                    <span className="city-icon">{cityIcons[city.name] || '📍'}</span>
                    {city.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
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
        onClose={() => setNotificationMessage({ ...notificationMessage, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert onClose={() => setNotificationMessage({ ...notificationMessage, open: false })} severity="info" sx={{ width: '100%', cursor: 'pointer' }} onClick={() => navigate('/profile')}>
          {notificationMessage.text}
        </Alert>
      </Snackbar>
    </nav>
  );
};

export default Navbar;
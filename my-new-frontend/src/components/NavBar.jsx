import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setUser, clearUser, setLocation, addNotification, clearNotifications } from '../redux/authSlice';
import {
  Search as SearchIcon, Menu as MenuIcon, Home as HomeIcon, LogOut, Bell, MapPin, Mail, User as UserIcon, LocateFixed, IndianRupee, Award, X as XIcon,
} from 'lucide-react';
import {
  Box, Modal, Button, Typography, TextField, Alert, List, ListItem, ListItemText, Snackbar, Popover, Divider,
  Avatar, Chip, CircularProgress, ListItemAvatar, ListItemButton, IconButton, Paper, Grid, Badge, AppBar, Toolbar,
  Drawer, ListItemIcon, Menu, MenuItem, Stack
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
        };
        socket.on('connect', handleConnect);
        if (socket.connected) handleConnect();
  
        const handleNewNotification = (data) => {
          const notification = {
            id: Date.now().toString(),
            message: data.message,
            read: false,
            timestamp: new Date().toISOString()
          };
          dispatch(addNotification(notification));
          setNotificationMessage({ open: true, text: data.message });
        };
  
        socket.on('bookingStatusUpdate', handleNewNotification);
        socket.on('newBookingAssigned', handleNewNotification);
        socket.on('newAdminReply', handleNewNotification);
  
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
  const { notificationCount } = useSocketNotifications();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState(null);
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState(null);
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
    const syncUserProfile = async () => {
      if (token && user && !user.profile) {
        try {
          const config = { headers: { Authorization: `Bearer ${token}` } };
          const { data } = await axios.get(`${API_URL}/api/users/profile`, config);
          dispatch(setUser({ user: data, token }));
        } catch (error) {
          console.error("Failed to sync user profile in Navbar:", error);
          if (error.response?.status === 401) {
            dispatch(clearUser());
          }
        }
      }
    };
    syncUserProfile();
  }, [token, user, dispatch]);

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
    dispatch(clearNotifications());
    navigate('/home');
    setUserMenuAnchorEl(null);
  }, [dispatch, navigate]);

  const handleNotificationPopoverOpen = (event) => setNotificationAnchorEl(event.currentTarget);
  const handleNotificationPopoverClose = () => setNotificationAnchorEl(null);
  const handleUserMenuOpen = (event) => setUserMenuAnchorEl(event.currentTarget);
  const handleUserMenuClose = () => setUserMenuAnchorEl(null);
  const handleClearNotifications = () => dispatch(clearNotifications());

  const handleFindProvidersClick = () => {
    if (!location) {
      setLocationError('Please select a location to find providers.');
      setLocationPopupOpen(true);
      return;
    }
    navigate('/providers');
  };

  const handleLogoClick = () => navigate(isAuthenticated && user?.role === 'provider' ? '/providerhome' : '/home');
  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  const navigationItems = user
    ? user.role === 'provider'
      ? [
          { label: 'Dashboard', href: '/provider/dashboard', icon: <UserIcon size={20} /> },
          { label: 'Pricing', href: '/pricing', icon: <IndianRupee size={20} /> }
        ]
      : [
          { label: 'Home', href: '/home', icon: <HomeIcon size={20} /> },
          { label: 'Services', href: '/services', icon: <UserIcon size={20} /> },
          { label: 'Find Providers', onClick: handleFindProvidersClick, icon: <MapPin size={20} /> }
        ]
    : [
        { label: 'Home', href: '/home', icon: <HomeIcon size={20} /> },
        { label: 'Services', href: '/services', icon: <UserIcon size={20} /> },
        { label: 'Find Providers', onClick: handleFindProvidersClick, icon: <MapPin size={20} /> }
      ];
  
  const mobileDrawer = (
    <Drawer anchor="left" open={mobileMenuOpen} onClose={toggleMobileMenu}>
      <Box sx={{ width: 280, p: 2, display: 'flex', flexDirection: 'column', height: '100%' }} role="presentation">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Menu</Typography>
          <IconButton onClick={toggleMobileMenu}><XIcon /></IconButton>
        </Box>
        <Divider />
        <List>
          {navigationItems.map((item) => (
            <ListItem key={item.label} disablePadding>
              <ListItemButton onClick={() => {
                item.onClick ? item.onClick() : navigate(item.href);
                toggleMobileMenu();
              }}>
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        <Box sx={{ mt: 'auto' }}>
            <Divider sx={{ my: 2 }} />
            {isAuthenticated ? (
                <Stack spacing={1}>
                    <Button fullWidth variant="contained" onClick={() => {navigate(user.role === 'provider' ? '/provider/dashboard' : '/profile'); toggleMobileMenu();}}>Profile</Button>
                    <Button fullWidth variant="outlined" color="error" onClick={() => {handleLogout(); toggleMobileMenu();}}>Logout</Button>
                </Stack>
            ) : (
                <Stack spacing={1}>
                    <Button fullWidth variant="contained" onClick={() => {navigate('/login'); toggleMobileMenu();}}>Login</Button>
                    <Button fullWidth variant="outlined" onClick={() => {navigate('/register'); toggleMobileMenu();}}>Sign Up</Button>
                </Stack>
            )}
        </Box>
      </Box>
    </Drawer>
  );

  return (
    <>
      <AppBar position="fixed" color="inherit" elevation={0} sx={{
        bgcolor: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        zIndex: 1400 // Ensuring Navbar is high enough
      }}>
        <Toolbar sx={{ justifyContent: 'space-between', height: '100px', px: { xs: 2, md: 4 } }}>
          
          {/* Logo Section */}
          <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', minWidth: '120px' }} onClick={handleLogoClick}>
            <img 
              src={serviceHubLogo} 
              alt="ServiceHub Logo" 
              style={{ width: '120px', height: 'auto' }} 
            />
          </Box>

          {/* Search Bar - Only for customers */}
          {isAuthenticated && user?.role === 'customer' && (
            <Box sx={{ 
              position: 'relative', 
              display: { xs: 'none', md: 'block' }, 
              mx: 3, 
              flexGrow: 0,
              width: '400px',
              flexShrink: 0
            }}>
              <form onSubmit={handleSearchSubmit}>
                <TextField 
                  fullWidth 
                  variant="outlined" 
                  size="small" 
                  placeholder="Search for services..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon size={20} style={{ marginRight: '8px', color: '#888' }} />,
                    sx: { borderRadius: '25px', bgcolor: 'rgba(0,0,0,0.04)' }
                  }} 
                />
              </form>
              {(isSearchLoading || searchResults.length > 0) && (
                /* THE FIX: zIndex: 1500 to go over the banner */
                <Paper sx={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1500, mt: 1, borderRadius: 2 }}>
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

          {/* Navigation Links - Centered */}
          <Stack
            direction="row"
            spacing={2}
            sx={{
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              justifyContent: 'center',
              flexGrow: 1,
              mx: 2
            }}
          >
            {navigationItems.map((item) => (
              <Button
                key={item.label}
                onClick={item.onClick ? item.onClick : () => navigate(item.href)}
                startIcon={item.icon}
                sx={{
                  textTransform: 'none',
                  color: 'text.primary',
                  fontWeight: 600,
                  fontSize: '1rem',
                  px: 2,
                  py: 1,
                  borderRadius: '12px',
                  position: 'relative',
                  transition: 'color 0.3s ease, background-color 0.3s ease',
                  '&:hover': {
                    color: 'primary.main',
                    backgroundColor: 'action.hover',
                    '&::after': {
                      width: '100%',
                    },
                  },
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    width: 0,
                    height: '2px',
                    backgroundColor: 'primary.main',
                    transition: 'width 0.3s ease-in-out',
                  },
                }}
              >
                {item.label}
              </Button>
            ))}
          </Stack>

          {/* Right Side Actions */}
          <Stack direction="row" spacing={{xs: 0.5, sm: 1}} alignItems="center" sx={{ minWidth: 'fit-content' }}>
            <Button onClick={() => setLocationPopupOpen(true)} startIcon={<MapPin size={20} />} sx={{
                textTransform: 'none', color: 'text.secondary', display: { xs: 'none', sm: 'inline-flex' },
                '&:hover': { backgroundColor: 'action.hover' }
            }}>
              {location ? location.split(',')[0] : 'Location'}
            </Button>
            <IconButton onClick={() => setLocationPopupOpen(true)} sx={{ display: { xs: 'inline-flex', sm: 'none' }}}>
                <MapPin size={22} />
            </IconButton>

            {isAuthenticated ? (
              <>
                <IconButton onClick={handleNotificationPopoverOpen} sx={{ '&:hover': { backgroundColor: 'action.hover' }}}>
                  <Badge badgeContent={notificationCount || 0} color="error">
                    <StyledBell hasnotifications={notificationCount > 0 ? 1 : 0} />
                  </Badge>
                </IconButton>

                {user?.role === 'provider' && (
                  <Box sx={{ display: { xs: 'none', md: 'block' }}}>
                    <StyledChip icon={<Award />} label={`${user?.subscriptionTier ? user.subscriptionTier.charAt(0).toUpperCase() + user.subscriptionTier.slice(1) : 'Free'} Plan`} subscription={user?.subscriptionTier || 'free'} />
                  </Box>
                )}

                <IconButton onClick={handleUserMenuOpen} sx={{ p: 0, ml: 1 }}>
                  <Avatar src={user?.profile?.image || ''} sx={{ width: 44, height: 44 }}>
                    {user?.name?.charAt(0).toUpperCase()}
                  </Avatar>
                </IconButton>
              </>
            ) : (
              <Stack direction="row" spacing={1} sx={{ display: { xs: 'none', md: 'flex' } }}>
                <Button variant="outlined" onClick={() => navigate('/login')} sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 600 }}>Login</Button>
                <Button variant="contained" onClick={() => navigate('/register')} sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}>Sign Up</Button>
              </Stack>
            )}

            <IconButton edge="end" onClick={toggleMobileMenu} sx={{ display: { md: 'none' }, '&:hover': { backgroundColor: 'action.hover' } }} aria-label="menu">
              <MenuIcon />
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>
      
      {mobileDrawer}
      
      <Modal open={locationPopupOpen} onClose={() => setLocationPopupOpen(false)}>
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: { xs: '90%', sm: 500 }, bgcolor: 'background.paper', boxShadow: 24, p: 4, borderRadius: 2, maxHeight: '90vh', overflowY: 'auto' }}>
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>Select Your Location</Typography>
            <Button variant="contained" startIcon={<LocateFixed />} onClick={detectCurrentLocation} sx={{ mb: 2, width: '100%', py: 1.5 }}>Detect My Current Location</Button>
            {locationError && <Alert severity="error" sx={{ mb: 2 }}>{locationError}</Alert>}
            <TextField
              inputRef={locationInputRef} value={locationSearch} onChange={handleLocationSearchChange}
              placeholder="Search for your area, locality or city..." variant="outlined" fullWidth
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

      <Popover open={Boolean(notificationAnchorEl)} anchorEl={notificationAnchorEl} onClose={handleNotificationPopoverClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Box sx={{ p: 2, maxWidth: 350, width: '90vw' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Notifications</Typography>
                {notificationCount > 0 && <Button size="small" onClick={handleClearNotifications}>Clear All</Button>}
            </Box>
            <Divider sx={{ my: 1 }} />
            {notificationCount > 0 ? (
                <List dense sx={{ maxHeight: 300, overflowY: 'auto' }}>
                  {notifications.map((notif) => (
                      <ListItem key={notif.id}>
                          <ListItemText primary={notif.message} secondary={new Date(notif.timestamp || notif.id).toLocaleString()} />
                      </ListItem>
                  ))}
                </List>
            ) : ( <Typography sx={{ p: 2, color: 'text.secondary' }}>No new notifications.</Typography> )}
        </Box>
      </Popover>

      <Menu anchorEl={userMenuAnchorEl} open={Boolean(userMenuAnchorEl)} onClose={handleUserMenuClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Box sx={{ px: 2, py: 1 }}>
            <Typography fontWeight="bold">{user?.name}</Typography>
            <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
        </Box>
        <Divider />
        <MenuItem onClick={() => { navigate(user.role === 'provider' ? '/provider/dashboard' : '/profile'); handleUserMenuClose(); }}>
            <ListItemIcon><UserIcon size={16} /></ListItemIcon> Profile
        </MenuItem>
        {user?.role === 'customer' && (
            <MenuItem onClick={() => { navigate('/my-messages'); handleUserMenuClose(); }}>
                <ListItemIcon><Mail size={16} /></ListItemIcon> My Messages
            </MenuItem>
        )}
        <Divider />
        <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
            <ListItemIcon><LogOut size={16} color="inherit" /></ListItemIcon> Sign out
        </MenuItem>
      </Menu>

      <Snackbar open={notificationMessage.open} autoHideDuration={6000} onClose={() => setLocalNotificationMessage({ ...notificationMessage, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
        <Alert onClose={() => setLocalNotificationMessage({ ...notificationMessage, open: false })} severity="info" sx={{ width: '100%', cursor: 'pointer' }} onClick={() => navigate(user?.role === 'customer' ? '/profile' : '/provider/dashboard')}>
          {notificationMessage.text}
        </Alert>
      </Snackbar>
    </>
  );
};

export default Navbar;
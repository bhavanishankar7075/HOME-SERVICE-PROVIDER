import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { clearUser } from '../redux/authSlice';
import { Phone, Mail, MapPin } from 'lucide-react';
import axios from 'axios';
import { Modal, Box, Typography, TextField, Button, CircularProgress, Alert } from '@mui/material';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
};

// Utility function to extract city from a full address
const getCityFromLocation = (location) => {
  if (!location || typeof location !== 'string') return null;
  // Split by comma and look for city (e.g., Visakhapatnam is often before state)
  const parts = location.split(',').map(part => part.trim());
  // Assuming city is before state (e.g., "Andhra Pradesh") or postal code
  const stateIndex = parts.findIndex(part => part.includes('Andhra Pradesh') || /\d{6}/.test(part));
  if (stateIndex > 0) {
    return parts[stateIndex - 1]; // City is typically just before state or postal code
  }
  // Fallback: Try to find a known city name or return first significant part
  const knownCities = ['Visakhapatnam', 'Hyderabad', 'Vijayawada', 'Guntur']; // Add more as needed
  const foundCity = parts.find(part => knownCities.includes(part));
  return foundCity || parts[0] || null; // Fallback to first part if no city found
};

const ProvidersList = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, token, location: reduxLocation } = useSelector((state) => state.auth);

  const [providers, setProviders] = useState([]);
  const [filteredProviders, setFilteredProviders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [skillsFilter, setSkillsFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [modalAlert, setModalAlert] = useState({ type: '', message: '' });

  useEffect(() => {
    const fetchProviders = async () => {
      setLoading(true);
      const selectedLocation = location.state?.location || reduxLocation;
      const city = getCityFromLocation(selectedLocation);

      // DEBUG: Log critical inputs
      console.log('[ProvidersList] Raw selected location:', selectedLocation);
      console.log('[ProvidersList] Extracted city:', city);
      console.log('[ProvidersList] Skills filter:', skillsFilter);
      console.log('[ProvidersList] User:', user ? { id: user.id, role: user.role } : 'No user');
      console.log('[ProvidersList] Token present:', !!token);

      if (!city) {
        setError('Please select a valid city to view providers.');
        setLoading(false);
        navigate('/location', { state: { error: 'Valid city is required to view providers' } });
        return;
      }
      if (!token || !user) {
        setError('Please log in to view providers.');
        setLoading(false);
        navigate('/login', { replace: true });
        return;
      }

      const allowedRoles = ['admin', 'customer'];
      if (!allowedRoles.includes(user.role)) {
        setError('Access Denied: You do not have permission to view this page.');
        setLoading(false);
        return;
      }

      const endpoint = `${API_URL}/api/admin/providers/active`;
      const params = { location: city }; // Use extracted city
      if (skillsFilter) {
        params.services = skillsFilter;
      }

      // DEBUG: Log full request details
      console.log('[ProvidersList] Sending request:', { endpoint, params });

      try {
        const response = await axios.get(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
          params,
        });
        setProviders(response.data);
        setError('');
        console.log('[ProvidersList] Providers fetched:', response.data.length);
      } catch (err) {
        // DEBUG: Log full error response
        console.error('[ProvidersList] Full error response:', err.response);
        console.error('[ProvidersList] Error fetching providers:', err.response?.data || err.message);

        if (err.response?.status === 401) {
          setError('Your session has expired. Please log in again.');
          dispatch(clearUser());
          navigate('/login', { replace: true });
        } else if (err.response?.status === 400) {
          setError('Invalid location or services filter. Please try a different location or filter.');
          setProviders([]);
        } else if (err.response?.status === 404) {
          setError('No active providers found for this location.');
          setProviders([]);
        } else {
          setError('Failed to fetch providers. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
  }, [location.state, reduxLocation, skillsFilter, token, user, navigate, dispatch]);

  useEffect(() => {
    let updatedProviders = [...providers];
    if (searchTerm) {
      updatedProviders = updatedProviders.filter(
        (provider) =>
          provider.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          provider.profile?.location?.fullAddress?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    updatedProviders.sort((a, b) => {
      if (sortBy === 'name') return a.name?.localeCompare(b.name) || 0;
      if (sortBy === 'location')
        return a.profile?.location?.fullAddress?.localeCompare(b.profile?.location?.fullAddress || '') || 0;
      return 0;
    });
    setFilteredProviders(updatedProviders);
  }, [providers, searchTerm, sortBy]);

  const handleContactClick = (provider) => {
    setSelectedProvider(provider);
    setIsModalOpen(true);
    setModalAlert({ type: '', message: '' });
    setMessage('');
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedProvider(null);
  };

  const handleSendMessage = async () => {
    if (!message.trim()) {
      setModalAlert({ type: 'error', message: 'Message cannot be empty.' });
      return;
    }
    setIsSending(true);
    setModalAlert({ type: '', message: '' });
    try {
      await axios.post(`${API_URL}/api/users/contact-admin`, {
        providerId: selectedProvider._id,
        providerName: selectedProvider.name,
        message: message,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setModalAlert({ type: 'success', message: 'Your message has been sent to the admin!' });
      setTimeout(() => {
        handleModalClose();
      }, 2000);
    } catch (err) {
      console.error('[ProvidersList] Failed to send message:', err);
      setModalAlert({ type: 'error', message: err.response?.data?.message || 'Failed to send message. Please try again.' });
    } finally {
      setIsSending(false);
    }
  };

  const handleRetry = () => {
    setError('');
    setLoading(true);
    navigate('/providers', { state: { location: reduxLocation }, replace: true });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl text-gray-600">Loading Providers...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-gray-100 -mt-[60px] sm:p-6 lg:p-8">
      <div className="pt-24 mb-6 text-center">
        <h1 className="text-3xl font-bold text-gray-800 sm:text-4xl">
          Active Providers
        </h1>
        <p className="mt-2 text-gray-600">
          Find the best service providers near you
        </p>
      </div>
      {error && (
        <div className="mb-4 text-center text-red-600">
          {error}
          <button
            className="ml-4 text-blue-600 underline"
            onClick={handleRetry}
          >
            Retry
          </button>
        </div>
      )}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:w-1/3">
          <input
            type="text"
            placeholder="Search by name or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="w-full sm:w-1/3">
          <input
            type="text"
            placeholder="Filter by services (e.g., Plumbing,Cleaning)"
            value={skillsFilter}
            onChange={(e) => setSkillsFilter(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="w-full sm:w-1/4">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="name">Sort by Name</option>
            <option value="location">Sort by Location</option>
          </select>
        </div>
      </div>
      {filteredProviders.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProviders.map((provider) => (
            <div
              key={provider._id}
              className="p-4 transition-shadow duration-300 bg-white rounded-lg shadow-md hover:shadow-lg"
            >
              <div className="flex items-center gap-4">
                <img
                  src={provider.profile?.image || `https://placehold.co/100/E2E8F0/4A5568?text=${provider.name?.charAt(0) || 'U'}`} // <-- UPDATED
                  alt={`${provider.name || 'Provider'}'s profile`}
                  className="object-cover w-12 h-12 border-2 border-gray-200 rounded-full"
                  onError={(e) => {
                    e.currentTarget.src = `https://placehold.co/100/E2E8F0/4A5568?text=${provider.name?.charAt(0) || 'U'}`;
                  }}
                />
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">
                    {provider.name || 'Unknown Provider'}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {provider.profile?.location?.fullAddress || 'Location not provided'}
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-gray-700">
                  <Phone className="w-4 h-4" />
                  <span>{provider.phone || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Mail className="w-4 h-4" />
                  <span>{provider.email || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin className="w-4 h-4" />
                  <span>{provider.profile?.location?.fullAddress || 'Not provided'}</span>
                </div>
                {provider.profile?.skills?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-gray-800">
                      Services:
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {provider.profile.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs text-blue-800 bg-blue-100 rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button
                className="w-full py-2 mt-4 text-white transition-colors duration-200 bg-blue-600 rounded-lg hover:bg-blue-700"
                onClick={() => handleContactClick(provider)}
              >
                Contact Provider
              </button>
            </div>
          ))}
        </div>
      ) : (
        !error && <p className="text-center text-gray-600">
          No providers found for this location.
        </p>
      )}

      <Modal
        open={isModalOpen}
        onClose={handleModalClose}
        aria-labelledby="contact-modal-title"
        aria-describedby="contact-modal-description"
      >
        <Box sx={modalStyle}>
          <Typography id="contact-modal-title" variant="h6" component="h2">
            Contact Admin about {selectedProvider?.name || 'Provider'}
          </Typography>
          <Typography id="contact-modal-description" sx={{ mt: 2, mb: 2 }}>
            Your message will be sent to an administrator who will coordinate with the provider.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Your Message"
            variant="outlined"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            margin="normal"
            disabled={isSending}
          />
          {modalAlert.message && (
            <Alert severity={modalAlert.type}>{modalAlert.message}</Alert>
          )}
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={handleModalClose} disabled={isSending}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSendMessage}
              disabled={isSending}
              startIcon={isSending ? <CircularProgress size={20} /> : null}
            >
              {isSending ? 'Sending...' : 'Send Message'}
            </Button>
          </Box>
        </Box>
      </Modal>
    </div>
  );
};

export default ProvidersList;



































































































//main
/* import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { clearUser } from '../redux/authSlice';
import { Phone, Mail, MapPin } from 'lucide-react';
import axios from 'axios';
import { Modal, Box, Typography, TextField, Button, CircularProgress, Alert } from '@mui/material';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
};

// Utility function to extract city from a full address
const getCityFromLocation = (location) => {
  if (!location || typeof location !== 'string') return null;
  // Split by comma and look for city (e.g., Visakhapatnam is often before state)
  const parts = location.split(',').map(part => part.trim());
  // Assuming city is before state (e.g., "Andhra Pradesh") or postal code
  const stateIndex = parts.findIndex(part => part.includes('Andhra Pradesh') || /\d{6}/.test(part));
  if (stateIndex > 0) {
    return parts[stateIndex - 1]; // City is typically just before state or postal code
  }
  // Fallback: Try to find a known city name or return first significant part
  const knownCities = ['Visakhapatnam', 'Hyderabad', 'Vijayawada', 'Guntur']; // Add more as needed
  const foundCity = parts.find(part => knownCities.includes(part));
  return foundCity || parts[0] || null; // Fallback to first part if no city found
};

const ProvidersList = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, token, location: reduxLocation } = useSelector((state) => state.auth);

  const [providers, setProviders] = useState([]);
  const [filteredProviders, setFilteredProviders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [skillsFilter, setSkillsFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [modalAlert, setModalAlert] = useState({ type: '', message: '' });

  useEffect(() => {
    const fetchProviders = async () => {
      setLoading(true);
      const selectedLocation = location.state?.location || reduxLocation;
      const city = getCityFromLocation(selectedLocation);

      // DEBUG: Log critical inputs
      console.log('[ProvidersList] Raw selected location:', selectedLocation);
      console.log('[ProvidersList] Extracted city:', city);
      console.log('[ProvidersList] Skills filter:', skillsFilter);
      console.log('[ProvidersList] User:', user ? { id: user.id, role: user.role } : 'No user');
      console.log('[ProvidersList] Token present:', !!token);

      if (!city) {
        setError('Please select a valid city to view providers.');
        setLoading(false);
        navigate('/location', { state: { error: 'Valid city is required to view providers' } });
        return;
      }
      if (!token || !user) {
        setError('Please log in to view providers.');
        setLoading(false);
        navigate('/login', { replace: true });
        return;
      }

      const allowedRoles = ['admin', 'customer'];
      if (!allowedRoles.includes(user.role)) {
        setError('Access Denied: You do not have permission to view this page.');
        setLoading(false);
        return;
      }

      const endpoint = `${API_URL}/api/admin/providers/active`;
      const params = { location: city }; // Use extracted city
      if (skillsFilter) {
        params.services = skillsFilter;
      }

      // DEBUG: Log full request details
      console.log('[ProvidersList] Sending request:', { endpoint, params });

      try {
        const response = await axios.get(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
          params,
        });
        setProviders(response.data);
        setError('');
        console.log('[ProvidersList] Providers fetched:', response.data.length);
      } catch (err) {
        // DEBUG: Log full error response
        console.error('[ProvidersList] Full error response:', err.response);
        console.error('[ProvidersList] Error fetching providers:', err.response?.data || err.message);

        if (err.response?.status === 401) {
          setError('Your session has expired. Please log in again.');
          dispatch(clearUser());
          navigate('/login', { replace: true });
        } else if (err.response?.status === 400) {
          setError('Invalid location or services filter. Please try a different location or filter.');
          setProviders([]);
        } else if (err.response?.status === 404) {
          setError('No active providers found for this location.');
          setProviders([]);
        } else {
          setError('Failed to fetch providers. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
  }, [location.state, reduxLocation, skillsFilter, token, user, navigate, dispatch]);

  useEffect(() => {
    let updatedProviders = [...providers];
    if (searchTerm) {
      updatedProviders = updatedProviders.filter(
        (provider) =>
          provider.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          provider.profile?.location?.fullAddress?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    updatedProviders.sort((a, b) => {
      if (sortBy === 'name') return a.name?.localeCompare(b.name) || 0;
      if (sortBy === 'location')
        return a.profile?.location?.fullAddress?.localeCompare(b.profile?.location?.fullAddress || '') || 0;
      return 0;
    });
    setFilteredProviders(updatedProviders);
  }, [providers, searchTerm, sortBy]);

  const handleContactClick = (provider) => {
    setSelectedProvider(provider);
    setIsModalOpen(true);
    setModalAlert({ type: '', message: '' });
    setMessage('');
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedProvider(null);
  };

  const handleSendMessage = async () => {
    if (!message.trim()) {
      setModalAlert({ type: 'error', message: 'Message cannot be empty.' });
      return;
    }
    setIsSending(true);
    setModalAlert({ type: '', message: '' });
    try {
      await axios.post(`${API_URL}/api/users/contact-admin`, {
        providerId: selectedProvider._id,
        providerName: selectedProvider.name,
        message: message,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setModalAlert({ type: 'success', message: 'Your message has been sent to the admin!' });
      setTimeout(() => {
        handleModalClose();
      }, 2000);
    } catch (err) {
      console.error('[ProvidersList] Failed to send message:', err);
      setModalAlert({ type: 'error', message: err.response?.data?.message || 'Failed to send message. Please try again.' });
    } finally {
      setIsSending(false);
    }
  };

  const handleRetry = () => {
    setError('');
    setLoading(true);
    navigate('/providers', { state: { location: reduxLocation }, replace: true });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl text-gray-600">Loading Providers...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-gray-100 -mt-[60px] sm:p-6 lg:p-8">
      <div className="pt-24 mb-6 text-center">
        <h1 className="text-3xl font-bold text-gray-800 sm:text-4xl">
          Active Providers
        </h1>
        <p className="mt-2 text-gray-600">
          Find the best service providers near you
        </p>
      </div>
      {error && (
        <div className="mb-4 text-center text-red-600">
          {error}
          <button
            className="ml-4 text-blue-600 underline"
            onClick={handleRetry}
          >
            Retry
          </button>
        </div>
      )}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:w-1/3">
          <input
            type="text"
            placeholder="Search by name or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="w-full sm:w-1/3">
          <input
            type="text"
            placeholder="Filter by services (e.g., Plumbing,Cleaning)"
            value={skillsFilter}
            onChange={(e) => setSkillsFilter(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="w-full sm:w-1/4">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="name">Sort by Name</option>
            <option value="location">Sort by Location</option>
          </select>
        </div>
      </div>
      {filteredProviders.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProviders.map((provider) => (
            <div
              key={provider._id}
              className="p-4 transition-shadow duration-300 bg-white rounded-lg shadow-md hover:shadow-lg"
            >
              <div className="flex items-center gap-4">
                <img
                  src={provider.profile?.image ? `${API_URL}${provider.profile.image}` : `https://placehold.co/100/E2E8F0/4A5568?text=${provider.name?.charAt(0) || 'U'}`}
                  alt={`${provider.name || 'Provider'}'s profile`}
                  className="object-cover w-12 h-12 border-2 border-gray-200 rounded-full"
                  onError={(e) => {
                    e.currentTarget.src = `https://placehold.co/100/E2E8F0/4A5568?text=${provider.name?.charAt(0) || 'U'}`;
                  }}
                />
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">
                    {provider.name || 'Unknown Provider'}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {provider.profile?.location?.fullAddress || 'Location not provided'}
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-gray-700">
                  <Phone className="w-4 h-4" />
                  <span>{provider.phone || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Mail className="w-4 h-4" />
                  <span>{provider.email || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin className="w-4 h-4" />
                  <span>{provider.profile?.location?.fullAddress || 'Not provided'}</span>
                </div>
                {provider.profile?.skills?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-gray-800">
                      Services:
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {provider.profile.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs text-blue-800 bg-blue-100 rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button
                className="w-full py-2 mt-4 text-white transition-colors duration-200 bg-blue-600 rounded-lg hover:bg-blue-700"
                onClick={() => handleContactClick(provider)}
              >
                Contact Provider
              </button>
            </div>
          ))}
        </div>
      ) : (
        !error && <p className="text-center text-gray-600">
          No providers found for this location.
        </p>
      )}

      <Modal
        open={isModalOpen}
        onClose={handleModalClose}
        aria-labelledby="contact-modal-title"
        aria-describedby="contact-modal-description"
      >
        <Box sx={modalStyle}>
          <Typography id="contact-modal-title" variant="h6" component="h2">
            Contact Admin about {selectedProvider?.name || 'Provider'}
          </Typography>
          <Typography id="contact-modal-description" sx={{ mt: 2, mb: 2 }}>
            Your message will be sent to an administrator who will coordinate with the provider.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Your Message"
            variant="outlined"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            margin="normal"
            disabled={isSending}
          />
          {modalAlert.message && (
            <Alert severity={modalAlert.type}>{modalAlert.message}</Alert>
          )}
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={handleModalClose} disabled={isSending}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSendMessage}
              disabled={isSending}
              startIcon={isSending ? <CircularProgress size={20} /> : null}
            >
              {isSending ? 'Sending...' : 'Send Message'}
            </Button>
          </Box>
        </Box>
      </Modal>
    </div>
  );
};

export default ProvidersList; */





































































































/* import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { clearUser } from '../redux/authSlice';
import { Phone, Mail, MapPin } from 'lucide-react';
import axios from 'axios';
import { Modal, Box, Typography, TextField, Button, CircularProgress, Alert } from '@mui/material';

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
};

const ProvidersList = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, token, location: reduxLocation } = useSelector((state) => state.auth);

  const [providers, setProviders] = useState([]);
  const [filteredProviders, setFilteredProviders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // --- New State for the Modal ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [modalAlert, setModalAlert] = useState({ type: '', message: '' });

  useEffect(() => {
    const fetchProviders = async () => {
      setLoading(true);
      const selectedLocation = location.state?.location || reduxLocation;

      if (!selectedLocation) {
        setError('Please select a location to view providers.');
        setLoading(false);
        navigate('/home');
        return;
      }
      if (!token || !user) {
        setError('Please log in to view providers.');
        setLoading(false);
        navigate('/login');
        return;
      }

      const allowedRoles = ['admin', 'customer'];
      if (!allowedRoles.includes(user.role)) {
        setError('Access Denied: You do not have permission to view this page.');
        setLoading(false);
        return;
      }

      const endpoint = 'http://localhost:5000/api/admin/providers/active';

      try {
        const response = await axios.get(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
          params: { location: selectedLocation },
        });
        setProviders(response.data);
        setError('');
      } catch (err) {
        console.error('Error fetching providers:', err.response?.data || err.message);

        if (err.response?.status === 401) {
          setError('Your session has expired. Please log in again.');
          dispatch(clearUser());
          navigate('/login');
        } else if (err.response?.status === 404) {
          setError('No active providers found for this location.');
          setProviders([]);
        } else {
          setError('Failed to fetch providers. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
  }, [location.state, reduxLocation, token, user, navigate, dispatch]);

  useEffect(() => {
    let updatedProviders = [...providers];
    if (searchTerm) {
      updatedProviders = updatedProviders.filter(
        (provider) =>
          provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          provider.profile?.location?.fullAddress?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    updatedProviders.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'location')
        return a.profile?.location?.fullAddress?.localeCompare(b.profile?.location?.fullAddress || '') || 0;
      return 0;
    });
    setFilteredProviders(updatedProviders);
  }, [providers, searchTerm, sortBy]);

  const handleContactClick = (provider) => {
    setSelectedProvider(provider);
    setIsModalOpen(true);
    setModalAlert({ type: '', message: '' });
    setMessage('');
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedProvider(null);
  };

  const handleSendMessage = async () => {
    if (!message.trim()) {
      setModalAlert({ type: 'error', message: 'Message cannot be empty.' });
      return;
    }
    setIsSending(true);
    setModalAlert({ type: '', message: '' });
    try {
      await axios.post('http://localhost:5000/api/users/contact-admin', {
        providerId: selectedProvider._id,
        providerName: selectedProvider.name,
        message: message,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setModalAlert({ type: 'success', message: 'Your message has been sent to the admin!' });
      setTimeout(() => {
        handleModalClose();
      }, 2000);

    } catch (err) {
      console.error("Failed to send message:", err);
      setModalAlert({ type: 'error', message: err.response?.data?.message || 'Failed to send message. Please try again.' });
    } finally {
      setIsSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl text-gray-600">Loading Providers...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-gray-100 -mt-[60px] sm:p-6 lg:p-8">
      <div className="pt-24 mb-6 text-center">
        <h1 className="text-3xl font-bold text-gray-800 sm:text-4xl">
          Active Providers
        </h1>
        <p className="mt-2 text-gray-600">
          Find the best service providers near you
        </p>
      </div>
      {error && (
        <div className="mb-4 text-center text-red-600">
          {error}
        </div>
      )}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:w-1/3">
          <input
            type="text"
            placeholder="Search by name or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="w-full sm:w-1/4">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="name">Sort by Name</option>
            <option value="location">Sort by Location</option>
          </select>
        </div>
      </div>
      {filteredProviders.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProviders.map((provider) => (
            <div
              key={provider._id}
              className="p-4 transition-shadow duration-300 bg-white rounded-lg shadow-md hover:shadow-lg"
            >
              <div className="flex items-center gap-4">
                <img
                  src={provider.profile?.image ? `http://localhost:5000${provider.profile.image}` : `https://placehold.co/100/E2E8F0/4A5568?text=${provider.name.charAt(0)}`}
                  alt={`${provider.name}'s profile`}
                  className="object-cover w-12 h-12 border-2 border-gray-200 rounded-full"
                  onError={(e) => {
                    e.currentTarget.src = `https://placehold.co/100/E2E8F0/4A5568?text=${provider.name.charAt(0)}`;
                  }}
                />
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">
                    {provider.name}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {provider.profile?.location?.fullAddress || 'Location not provided'}
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-gray-700">
                  <Phone className="w-4 h-4" />
                  <span>{provider.phone || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Mail className="w-4 h-4" />
                  <span>{provider.email}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin className="w-4 h-4" />
                  <span>{provider.profile?.location?.fullAddress || 'Not provided'}</span>
                </div>
                {provider.profile?.skills?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-gray-800">
                      Services:
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {provider.profile.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs text-blue-800 bg-blue-100 rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button
                className="w-full py-2 mt-4 text-white transition-colors duration-200 bg-blue-600 rounded-lg hover:bg-blue-700"
                onClick={() => handleContactClick(provider)}
              >
                Contact Provider
              </button>
            </div>
          ))}
        </div>
      ) : (
        !error && <p className="text-center text-gray-600">
          No providers found matching your criteria.
        </p>
      )}

      <Modal
        open={isModalOpen}
        onClose={handleModalClose}
        aria-labelledby="contact-modal-title"
      >
        <Box sx={modalStyle}>
          <Typography id="contact-modal-title" variant="h6" component="h2">
            Contact Admin about {selectedProvider?.name}
          </Typography>
          <Typography sx={{ mt: 2, mb: 2 }}>
            Your message will be sent to an administrator who will coordinate with the provider.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Your Message"
            variant="outlined"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            margin="normal"
            disabled={isSending}
          />
          {modalAlert.message && <Alert severity={modalAlert.type}>{modalAlert.message}</Alert>}
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={handleModalClose} disabled={isSending}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleSendMessage}
              disabled={isSending}
              startIcon={isSending ? <CircularProgress size={20} /> : null}
            >
              {isSending ? 'Sending...' : 'Send Message'}
            </Button>
          </Box>
        </Box>
      </Modal>
    </div>
  );
};

export default ProvidersList; */
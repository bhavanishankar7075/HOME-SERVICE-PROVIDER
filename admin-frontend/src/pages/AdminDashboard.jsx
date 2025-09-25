import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Button, Grid, Paper, CircularProgress, Snackbar, Alert, TextField,
  Drawer, List, ListItem, ListItemIcon, ListItemText, IconButton, Badge, Toolbar
} from '@mui/material';
import {
  Refresh, Logout, Menu, Dashboard as DashboardIcon, People as PeopleIcon,
  EventAvailable as EventAvailableIcon, Build as BuildIcon, Feedback as FeedbackIcon,
  ContactPhone as ContactPhoneIcon, Description as DescriptionIcon, ArrowBack,
  Settings as SettingsIcon, Mail as MailIcon, ContactMail as ContactMailIcon,
  LockReset as LockResetIcon, Chat as ChatIcon, Payments as PaymentsIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import axios from './axiosInstance';
import io from 'socket.io-client';
import { logout } from '../store/authSlice';
import '../styles/AdminDashboard.css';
import { Pie, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const socket = io(API_URL, {
  reconnection: true,
  reconnectionAttempts: Infinity,
});

const ChartContainer = ({ children }) => (
  <Box sx={{ width: '100%', height: { xs: '300px', md: '400px' }, overflow: 'hidden' }}>
    {children}
  </Box>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { token } = useSelector((state) => state.auth);

  const [revenue, setRevenue] = useState(0);
  const [bookingCount, setBookingCount] = useState(0);
  const [serviceCount, setServiceCount] = useState(0);
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [categoryStats, setCategoryStats] = useState({});
  const [monthlyRevenue, setMonthlyRevenue] = useState({});
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ open: false, text: '', severity: 'success' });
  const [adminName, setAdminName] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newMessageCount, setNewMessageCount] = useState(Number(localStorage.getItem('newMessageCount')) || 0);
  const [newBookingCount, setNewBookingCount] = useState(Number(localStorage.getItem('newBookingCount')) || 0);
  const [newContactCount, setNewContactCount] = useState(Number(localStorage.getItem('newContactCount')) || 0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (!token) {
        console.log('AdminDashboard: No token, redirecting to /');
        navigate('/');
        return;
      }

      const config = { headers: { Authorization: `Bearer ${token}` } };
      console.log('AdminDashboard: Fetching data with token:', token);
      const [
        revenueResponse,
        bookingsResponse,
        serviceResponse,
        feedbackResponse,
        categoryResponse,
        monthlyRevenueResponse,
        usersResponse,
      ] = await Promise.all([
        axios.get(`${API_URL}/api/dashboard/revenue`, config).catch(err => {
          console.error('AdminDashboard: Error fetching revenue:', err.response?.data || err.message);
          return { data: { total: 0 } };
        }),
        axios.get(`${API_URL}/api/bookings/all-bookings`, config).catch(err => {
          console.error('AdminDashboard: Error fetching bookings:', err.response?.data || err.message);
          return { data: [] };
        }),
        axios.get(`${API_URL}/api/dashboard/services/count`, config).catch(err => {
          console.error('AdminDashboard: Error fetching services:', err.response?.data || err.message);
          return { data: { count: 0 } };
        }),
        axios.get(`${API_URL}/api/dashboard/feedbacks/count`, config).catch(err => {
          console.error('AdminDashboard: Error fetching feedbacks:', err.response?.data || err.message);
          return { data: { count: 0 } };
        }),
        axios.get(`${API_URL}/api/dashboard/services/category-stats`, config).catch(err => {
          console.error('AdminDashboard: Error fetching category stats:', err.response?.data || err.message);
          return { data: {} };
        }),
        axios.get(`${API_URL}/api/dashboard/bookings/monthly-revenue`, config).catch(err => {
          console.error('AdminDashboard: Error fetching monthly revenue:', err.response?.data || err.message);
          return { data: {} };
        }),
        axios.get(`${API_URL}/api/admin/users`, config).catch(err => {
          console.error('AdminDashboard: Error fetching users:', err.response?.data || err.message);
          setMessage({ open: true, text: err.response?.data?.message || 'Failed to fetch user data.', severity: 'error' });
          return { data: [] };
        }),
      ]);

      const decodedToken = JSON.parse(atob(token.split('.')[1]));
      setAdminName(decodedToken.name || 'Admin');
      setNewName(decodedToken.name || 'Admin');
      setNewEmail(decodedToken.email || '');

      setRevenue(revenueResponse.data.total || 0);
      setBookingCount(bookingsResponse.data.length || 0);
      setServiceCount(serviceResponse.data.count || 0);
      setFeedbackCount(feedbackResponse.data.count || 0);
      setCategoryStats(categoryResponse.data || {});
      setMonthlyRevenue(monthlyRevenueResponse.data || {});
      setUsers(Array.isArray(usersResponse.data) ? usersResponse.data : []);
    } catch (error) {
      console.error('AdminDashboard: Fetch data error:', error.message, error.response?.data);
      setMessage({ open: true, text: 'Error fetching dashboard data. Some data may be unavailable.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [token, navigate]);

  useEffect(() => {
    console.log('AdminDashboard: Mounting, current auth state:', { token });
    fetchData();

    const handleConnect = () => {
      socket.emit('joinAdminRoom');
      console.log('AdminDashboard: Socket connected, joined admin_room');
    };

    socket.on('connect', handleConnect);
    if (socket.connected) {
      handleConnect();
    }

    const handleNewMessage = (newMessage) => {
      setNewMessageCount(prevCount => {
        const newCount = prevCount + 1;
        localStorage.setItem('newMessageCount', newCount);
        return newCount;
      });
      setMessage({ open: true, text: `New message from customer`, severity: 'info' });
    };

    const handleNewBooking = (data) => {
      if (data.bookingDetails.status === 'pending') {
        setNewBookingCount(prevCount => {
          const newCount = prevCount + 1;
          localStorage.setItem('newBookingCount', newCount);
          return newCount;
        });
        setMessage({ open: true, text: `New booking #${data.bookingDetails._id.toString().slice(-6)} created`, severity: 'info' });
        console.log('AdminDashboard: New pending booking notification received:', data.bookingDetails._id);
      }
    };

    const handleNewContact = (contact) => {
      setNewContactCount(prevCount => {
        const newCount = prevCount + 1;
        localStorage.setItem('newContactCount', newCount);
        return newCount;
      });
      setMessage({ open: true, text: `New contact message from ${contact.name}`, severity: 'info' });
      console.log('AdminDashboard: New contact message received:', contact);
    };

    const handleGenericUpdate = () => fetchData();

    socket.on('newAdminMessage', handleNewMessage);
    socket.on('newPendingBooking', handleNewBooking);
    socket.on('newContactMessage', handleNewContact);
    socket.on('userUpdated', handleGenericUpdate);
    socket.on('userDeleted', handleGenericUpdate);
    socket.on('appointmentUpdated', handleGenericUpdate);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('newAdminMessage', handleNewMessage);
      socket.off('newPendingBooking', handleNewBooking);
      socket.off('newContactMessage', handleNewContact);
      socket.off('userUpdated', handleGenericUpdate);
      socket.off('userDeleted', handleGenericUpdate);
      socket.off('appointmentUpdated', handleGenericUpdate);
    };
  }, [fetchData]);

  const handleLogout = () => {
    console.log('AdminDashboard: Logging out');
    localStorage.removeItem('token');
    localStorage.removeItem('newMessageCount');
    localStorage.removeItem('newBookingCount');
    localStorage.removeItem('newContactCount');
    dispatch(logout());
    navigate('/', { replace: true });
  };

  const handleRefresh = () => {
    console.log('AdminDashboard: Refreshing data');
    fetchData();
  };

  const toggleSidebar = () => {
    console.log('AdminDashboard: Toggling sidebar, current state:', sidebarOpen);
    setSidebarOpen(!sidebarOpen);
  };

  const handleNavigation = (path) => {
    console.log('AdminDashboard: Navigating to:', path);
    navigate(path);
    if (path === '/admin/bookings') {
      setNewBookingCount(0);
      localStorage.setItem('newBookingCount', 0);
    } else if (path === '/admin/messages') {
      setNewMessageCount(0);
      localStorage.setItem('newMessageCount', 0);
    } else if (path === '/admin/contacts' || path === '/admin/faqs-contacts') {
      setNewContactCount(0);
      localStorage.setItem('newContactCount', 0);
    }
  };

  const handleUpdateSettings = async () => {
    setLoading(true);
    try {
      await axios.put(
        `${API_URL}/api/admin/settings`,
        { name: newName, email: newEmail, password: newPassword || undefined },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAdminName(newName);
      setNewPassword('');
      setMessage({ open: true, text: 'Settings updated successfully!', severity: 'success' });
      setShowSettings(false);
    } catch (error) {
      console.error('AdminDashboard: Error updating settings:', error.response?.data || error.message);
      setMessage({ open: true, text: error.response?.data?.message || 'Error updating settings.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportUsers = () => {
    console.log('AdminDashboard: Exporting users');
    const csv = [
      'Name,Email,Role,Location,Status,SubscriptionTier',
      ...users.map(user => `"${user.name || ''}","${user.email || ''}","${user.role || 'N/A'}","${user.profile?.location?.fullAddress || 'N/A'}","${user.profile?.status || 'N/A'}","${user.subscription?.subscriptionTier || 'free'}"`),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users_export.csv';
    a.click();
  };

  const pieChartData = {
    labels: Object.keys(categoryStats).length ? Object.keys(categoryStats) : ['No Data'],
    datasets: [{
      data: Object.keys(categoryStats).length ? Object.values(categoryStats) : [1],
      backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
    }],
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const barChartData = {
    labels: months,
    datasets: [{
      label: 'Monthly Revenue (₹)',
      data: months.map(month => monthlyRevenue[month] || 0),
      backgroundColor: '#4a90e2',
    }],
  };

  const subscriptionCounts = users.reduce(
    (acc, user) => {
      const tier = user.subscription?.subscriptionTier || 'free';
      acc[tier] = (acc[tier] || 0) + 1;
      return acc;
    },
    { free: 0, pro: 0, elite: 0 }
  );

  const SidebarList = () => (
    <List>
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => handleNavigation('/admin/dashboard')}>
        <ListItemIcon sx={{ color: '#fff' }}><DashboardIcon /></ListItemIcon>
        <ListItemText primary="Dashboard" sx={{color: 'white'}}/>
      </ListItem>
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => handleNavigation('/admin/bookings')}>
        <ListItemIcon sx={{ color: '#fff' }}>
          <Badge color="error" badgeContent={newBookingCount} sx={{ '& .MuiBadge-badge': { fontSize: '0.75rem', height: '18px', minWidth: '18px', padding: '0 4px' } }}>
            <EventAvailableIcon />
          </Badge>
        </ListItemIcon>
        <ListItemText primary="Bookings" sx={{color: 'white'}}/>
      </ListItem>
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => handleNavigation('/admin/services')}>
        <ListItemIcon sx={{ color: '#fff' }}><BuildIcon /></ListItemIcon>
        <ListItemText primary="Services" sx={{color: 'white'}}/>
      </ListItem>
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => handleNavigation('/admin/messages')}>
        <ListItemIcon sx={{ color: '#fff' }}>
          <Badge color="error" badgeContent={newMessageCount} sx={{ '& .MuiBadge-badge': { fontSize: '0.75rem', height: '18px', minWidth: '18px', padding: '0 4px' } }}>
            <MailIcon />
          </Badge>
        </ListItemIcon>
        <ListItemText primary="Messages" sx={{color: 'white'}}/>
      </ListItem>
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => handleNavigation('/admin/contacts')}>
        <ListItemIcon sx={{ color: '#fff' }}>
          <Badge color="error" badgeContent={newContactCount} sx={{ '& .MuiBadge-badge': { fontSize: '0.75rem', height: '18px', minWidth: '18px', padding: '0 4px' } }}>
            <ContactPhoneIcon />
          </Badge>
        </ListItemIcon>
        <ListItemText primary="Contact" sx={{color: 'white'}}/>
      </ListItem>
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => handleNavigation('/admin/faqs-contacts')}>
        <ListItemIcon sx={{ color: '#fff' }}>
          <Badge color="error" badgeContent={newContactCount} sx={{ '& .MuiBadge-badge': { fontSize: '0.75rem', height: '18px', minWidth: '18px', padding: '0 4px' } }}>
            <ContactMailIcon />
          </Badge>
        </ListItemIcon>
        <ListItemText primary="FAQs & Contacts" sx={{color: 'white'}}/>
      </ListItem>
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => handleNavigation('/admin/feedbacks')}>
        <ListItemIcon sx={{ color: '#fff' }}><FeedbackIcon /></ListItemIcon>
        <ListItemText primary="Feedbacks" sx={{color: 'white'}}/>
      </ListItem>
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => handleNavigation('/admin/providers')}>
        <ListItemIcon sx={{ color: '#fff' }}><PeopleIcon /></ListItemIcon>
        <ListItemText primary="Providers" sx={{color: 'white'}}/>
      </ListItem>
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => handleNavigation('/admin/customers')}>
        <ListItemIcon sx={{ color: '#fff' }}><PeopleIcon /></ListItemIcon>
        <ListItemText primary="Customers" sx={{color: 'white'}}/>
      </ListItem>
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => handleNavigation('/admin/logs')}>
        <ListItemIcon sx={{ color: '#fff' }}><DescriptionIcon /></ListItemIcon>
        <ListItemText primary="Activity Logs" sx={{color: 'white'}}/>
      </ListItem>
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => handleNavigation('/admin/chats')}>
        <ListItemIcon sx={{ color: '#fff' }}><ChatIcon /></ListItemIcon>
        <ListItemText primary="Chats" sx={{color: 'white'}}/>
      </ListItem>
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => handleNavigation('/admin/plans')}>
        <ListItemIcon sx={{ color: '#fff' }}><PaymentsIcon /></ListItemIcon>
        <ListItemText primary="Plans" sx={{color: 'white'}}/>
      </ListItem>
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => handleNavigation('/admin/reset-password')}>
        <ListItemIcon sx={{ color: '#fff' }}><LockResetIcon /></ListItemIcon>
        <ListItemText primary="Reset Password" sx={{color: 'white'}}/>
      </ListItem>
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => setShowSettings(true)}>
        <ListItemIcon sx={{ color: '#fff' }}><SettingsIcon /></ListItemIcon>
        <ListItemText primary="Settings" sx={{color: 'white'}}/>
      </ListItem>
      <ListItem button sx={{ cursor: 'pointer' }} onClick={handleLogout}>
        <ListItemIcon sx={{ color: '#fff' }}><Logout /></ListItemIcon>
        <ListItemText primary="Logout" sx={{color: 'white'}}/>
      </ListItem>
    </List>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f4f6f8' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: 240,
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            width: 240,
            boxSizing: 'border-box',
            bgcolor: '#2c5282',
            color: '#fff',
            overflowY: 'auto',
            scrollbarWidth: 'auto',
            '&::-webkit-scrollbar': { width: '8px' },
            '&::-webkit-scrollbar-track': { background: '#1a3c34' },
            '&::-webkit-scrollbar-thumb': { background: '#4a90e2', borderRadius: '4px' }
          }
        }}
      >
        <Toolbar />
        <SidebarList />
      </Drawer>
      <Drawer
        variant="temporary"
        open={sidebarOpen}
        onClose={toggleSidebar}
        sx={{
          display: { md: 'none' },
          '& .MuiDrawer-paper': {
            width: 240,
            boxSizing: 'border-box',
            bgcolor: '#2c5282',
            color: '#fff',
            overflowY: 'auto',
            scrollbarWidth: 'auto',
            '&::-webkit-scrollbar': { width: '8px' },
            '&::-webkit-scrollbar-track': { background: '#1a3c34' },
            '&::-webkit-scrollbar-thumb': { background: '#4a90e2', borderRadius: '4px' }
          }
        }}
      >
        <SidebarList />
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - 240px)` } }}>
        <Toolbar />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <IconButton onClick={toggleSidebar} sx={{ display: { md: 'none' } }}><Menu /></IconButton>
          <Typography variant="h4">Welcome, {adminName}!</Typography>
          <Box>
            <Button variant="contained" sx={{ mr: 2 }} startIcon={<Refresh />} onClick={handleRefresh} disabled={loading}>
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Refresh Data'}
            </Button>
          </Box>
        </Box>

        {loading ? <CircularProgress sx={{ display: 'block', margin: 'auto' }} /> :
          showSettings ? (
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => setShowSettings(false)} sx={{ mb: 2 }}>Back to Dashboard</Button>
              <Typography variant="h6">Admin Settings</Typography>
              <TextField label="New Name" value={newName} onChange={(e) => setNewName(e.target.value)} fullWidth sx={{ mb: 2, mt: 2 }} />
              <TextField label="New Email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} fullWidth sx={{ mb: 2 }} />
              <TextField label="New Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} fullWidth sx={{ mb: 3 }} />
              <Button variant="contained" onClick={handleUpdateSettings} disabled={loading}>Save Settings</Button>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}><Paper sx={{ p: 2, textAlign: 'center' }}><Typography variant="h6">Total Revenue</Typography><Typography variant="h5">₹{revenue.toFixed(2)}</Typography></Paper></Grid>
              <Grid item xs={12} sm={6} md={3}><Paper sx={{ p: 2, textAlign: 'center' }}><Typography variant="h6">Total Bookings</Typography><Typography variant="h5">{bookingCount}</Typography></Paper></Grid>
              <Grid item xs={12} sm={6} md={3}><Paper sx={{ p: 2, textAlign: 'center' }}><Typography variant="h6">Total Services</Typography><Typography variant="h5">{serviceCount}</Typography></Paper></Grid>
              <Grid item xs={12} sm={6} md={3}><Paper sx={{ p: 2, textAlign: 'center' }}><Typography variant="h6">Total Feedbacks</Typography><Typography variant="h5">{feedbackCount}</Typography></Paper></Grid>
              <Grid item xs={12} sm={6} md={4}><Paper sx={{ p: 2, textAlign: 'center' }}><Typography variant="h6">Active Providers</Typography><Typography variant="h5">{users.filter(u => u.role === 'provider' && u.profile?.status === 'active').length}</Typography></Paper></Grid>
              <Grid item xs={12} sm={6} md={4}><Paper sx={{ p: 2, textAlign: 'center' }}><Typography variant="h6">Active Customers</Typography><Typography variant="h5">{users.filter(u => u.role === 'customer').length}</Typography></Paper></Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h6">Active Subscription Plans</Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                    <Typography variant="body1">Free: {subscriptionCounts.free}</Typography>
                    <Typography variant="body1">Pro: {subscriptionCounts.pro}</Typography>
                    <Typography variant="body1">Elite: {subscriptionCounts.elite}</Typography>
                  </Box>
                </Paper>
              </Grid>
              <Grid item xs={12} lg={6}>
                <Paper sx={{ p: 2, borderRadius: 2 }}><Typography variant="h6">Category Distribution</Typography><ChartContainer><Pie data={pieChartData} options={{ responsive: true, maintainAspectRatio: false }} /></ChartContainer></Paper>
              </Grid>
              <Grid item xs={12} lg={6}>
                <Paper sx={{ p: 2, borderRadius: 2 }}><Typography variant="h6">Monthly Revenue</Typography><ChartContainer><Bar data={barChartData} options={{ responsive: true, maintainAspectRatio: false }} /></ChartContainer></Paper>
              </Grid>
              <Grid item xs={12}>
                <Paper sx={{ p: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
                  <Button variant="contained" onClick={handleExportUsers}>Export Users</Button>
                </Paper>
              </Grid>
            </Grid>
          )
        }
      </Box>
      <Snackbar open={message.open} autoHideDuration={6000} onClose={() => setMessage({ ...message, open: false })}>
        <Alert onClose={() => setMessage({ ...message, open: false })} severity={message.severity || 'info'} sx={{ width: '100%' }}>
          {message.text}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminDashboard;













































































































































































//main
/* import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Button, Grid, Paper, CircularProgress, Snackbar, Alert, TextField,
  Drawer, List, ListItem, ListItemIcon, ListItemText, IconButton, Badge, Toolbar
} from '@mui/material';
import { Refresh, Logout, Menu, Dashboard, People, Assignment, Feedback, CalendarToday, Description, ArrowBack, Settings, Mail, ContactMail } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import io from 'socket.io-client';
import { Pie, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js';
import { logout } from '../store/authSlice';
import '../styles/AdminDashboard.css';

ChartJS.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const socket = io(API_URL, {
    reconnection: true,
    reconnectionAttempts: Infinity,
});

const ChartContainer = ({ children }) => (
  <Box sx={{ width: '100%', height: { xs: '300px', md: '400px' }, overflow: 'hidden' }}>
    {children}
  </Box>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { token } = useSelector((state) => state.auth);

  const [revenue, setRevenue] = useState(0);
  const [bookingCount, setBookingCount] = useState(0);
  const [serviceCount, setServiceCount] = useState(0);
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [categoryStats, setCategoryStats] = useState({});
  const [monthlyRevenue, setMonthlyRevenue] = useState({});
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ open: false, text: '', severity: 'success' });
  const [adminName, setAdminName] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [newBookingCount, setNewBookingCount] = useState(0);
  const [newContactCount, setNewContactCount] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (!token) {
        navigate('/');
        return;
      }

      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [
        revenueResponse,
        bookingsResponse,
        serviceResponse,
        feedbackResponse,
        categoryResponse,
        monthlyRevenueResponse,
        usersResponse,
      ] = await Promise.all([
        axios.get(`${API_URL}/api/dashboard/revenue`, config),
        axios.get(`${API_URL}/api/bookings/all-bookings`, config).catch(err => {
          console.error('Error fetching bookings:', err.response?.status, err.response?.data);
          throw err;
        }),
        axios.get(`${API_URL}/api/dashboard/services/count`, config),
        axios.get(`${API_URL}/api/dashboard/feedbacks/count`, config),
        axios.get(`${API_URL}/api/dashboard/services/category-stats`, config),
        axios.get(`${API_URL}/api/dashboard/bookings/monthly-revenue`, config),
        axios.get(`${API_URL}/api/admin/users`, config),
     ]);
      
      const decodedToken = JSON.parse(atob(token.split('.')[1]));
      setAdminName(decodedToken.name || 'Admin');
      setNewName(decodedToken.name || 'Admin');
      setNewEmail(decodedToken.email || '');

      setRevenue(revenueResponse.data.total || 0);
      setBookingCount(bookingsResponse.data.length || 0);
      setServiceCount(serviceResponse.data.count || 0);
      setFeedbackCount(feedbackResponse.data.count || 0);
      setCategoryStats(categoryResponse.data || {});
      setMonthlyRevenue(monthlyRevenueResponse.data || {});
      setUsers(usersResponse.data || []);
   } catch (error) {
      console.error('Fetch data error:', error.message, error.response?.data);
      setMessage({ open: true, text: 'Error fetching dashboard data.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [token, navigate]);

  useEffect(() => {
    fetchData();

    const handleConnect = () => {
        socket.emit('joinAdminRoom');
        console.log('Socket connected, joined admin_room');
    };

    socket.on('connect', handleConnect);
    if (socket.connected) {
        handleConnect();
    }
    
    const handleNewMessage = (newMessage) => {
        setNewMessageCount(prevCount => prevCount + 1);
        setMessage({ open: true, text: `New message from customer`, severity: 'info' });
    };

    const handleNewBooking = (data) => {
        if (data.bookingDetails.status === 'pending') {
            setNewBookingCount(prevCount => prevCount + 1);
            setMessage({ open: true, text: `New booking #${data.bookingDetails._id.toString().slice(-6)} created`, severity: 'info' });
            console.log('New pending booking notification received:', data.bookingDetails._id);
        }
    };

    const handleNewContact = (contact) => {
        setNewContactCount(prevCount => prevCount + 1);
        setMessage({ open: true, text: `New contact message from ${contact.name}`, severity: 'info' });
        console.log('New contact message received:', contact);
    };

    const handleGenericUpdate = () => fetchData();

    socket.on('newAdminMessage', handleNewMessage);
    socket.on('newPendingBooking', handleNewBooking);
    socket.on('newContactMessage', handleNewContact);
    socket.on('userUpdated', handleGenericUpdate);
    socket.on('userDeleted', handleGenericUpdate);
    socket.on('appointmentUpdated', handleGenericUpdate);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('newAdminMessage', handleNewMessage);
      socket.off('newPendingBooking', handleNewBooking);
      socket.off('newContactMessage', handleNewContact);
      socket.off('userUpdated', handleGenericUpdate);
      socket.off('userDeleted', handleGenericUpdate);
      socket.off('appointmentUpdated', handleGenericUpdate);
    };
  }, [fetchData]);
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    dispatch(logout());
    navigate('/', { replace: true });
  };

  const handleRefresh = () => fetchData();
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  
  const handleUpdateSettings = async () => {
    setLoading(true);
    try {
      await axios.put(
        `${API_URL}/api/admin/settings`,
        { name: newName, email: newEmail, password: newPassword || undefined },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAdminName(newName);
      setNewPassword('');
      setMessage({ open: true, text: 'Settings updated successfully!', severity: 'success' });
      setShowSettings(false);
    } catch (error) {
      setMessage({ open: true, text: 'Error updating settings.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportUsers = () => {
    const csv = [
      'Name,Email,Role,Location,Status',
      ...users.map(user => `"${user.name || ''}","${user.email || ''}","${user.role || 'N/A'}","${user.profile?.location?.fullAddress || 'N/A'}","${user.profile?.status || 'N/A'}"`).join('\n'),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users_export.csv';
    a.click();
  };

  const pieChartData = {
    labels: Object.keys(categoryStats).length ? Object.keys(categoryStats) : ['No Data'],
    datasets: [{
      data: Object.keys(categoryStats).length ? Object.values(categoryStats) : [1],
      backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
    }],
  };

  const barChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [{
      label: 'Monthly Revenue (₹)',
      data: Object.values(monthlyRevenue),
      backgroundColor: '#4a90e2',
    }],
  };
  
  const SidebarList = () => (
    <List>
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => navigate('/admin/dashboard')}><ListItemIcon sx={{ color: '#fff' }}><Dashboard /></ListItemIcon><ListItemText primary="Dashboard" sx={{color: 'white'}}/></ListItem>
      <ListItem 
        button 
        sx={{ cursor: 'pointer' }} 
        onClick={() => {
          navigate('/admin/bookings');
          setNewBookingCount(0);
          console.log('Navigated to bookings, cleared newBookingCount');
        }}
      >
        <ListItemIcon sx={{ color: '#fff' }}>
          <Badge color="error" badgeContent={newBookingCount} sx={{ '& .MuiBadge-badge': { fontSize: '0.75rem', height: '18px', minWidth: '18px', padding: '0 4px' } }}>
            <Assignment />
          </Badge>
        </ListItemIcon>
        <ListItemText primary="Bookings" sx={{color: 'white'}}/>
      </ListItem>
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => navigate('/admin/services')}><ListItemIcon sx={{ color: '#fff' }}><Assignment /></ListItemIcon><ListItemText primary="Services" sx={{color: 'white'}}/></ListItem>
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => navigate('/admin/messages')}>
        <ListItemIcon sx={{ color: '#fff' }}>
          <Badge color="error" badgeContent={newMessageCount} sx={{ '& .MuiBadge-badge': { fontSize: '0.75rem', height: '18px', minWidth: '18px', padding: '0 4px' } }}>
            <Mail />
          </Badge>
        </ListItemIcon>
        <ListItemText primary="Messages" sx={{color: 'white'}}/>
      </ListItem>
      <ListItem 
        button 
        sx={{ cursor: 'pointer' }} 
        onClick={() => {
          navigate('/admin/contacts');
          setNewContactCount(0);
          console.log('Navigated to contacts, cleared newContactCount');
        }}
      >
        <ListItemIcon sx={{ color: '#fff' }}>
          <Badge color="error" badgeContent={newContactCount} sx={{ '& .MuiBadge-badge': { fontSize: '0.75rem', height: '18px', minWidth: '18px', padding: '0 4px' } }}>
            <Mail />
          </Badge>
        </ListItemIcon>
        <ListItemText primary="Contact" sx={{color: 'white'}}/>
      </ListItem>
      <ListItem 
        button 
        sx={{ cursor: 'pointer' }} 
        onClick={() => {
          navigate('/admin/faqs-contacts');
          setNewContactCount(0);
          console.log('Navigated to faqs-contacts, cleared newContactCount');
        }}
      >
        <ListItemIcon sx={{ color: '#fff' }}>
          <Badge color="error" badgeContent={newContactCount} sx={{ '& .MuiBadge-badge': { fontSize: '0.75rem', height: '18px', minWidth: '18px', padding: '0 4px' } }}>
            <ContactMail />
          </Badge>
        </ListItemIcon>
        <ListItemText primary="FAQs & Contacts" sx={{color: 'white'}}/>
      </ListItem>
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => navigate('/admin/feedbacks')}><ListItemIcon sx={{ color: '#fff' }}><Feedback /></ListItemIcon><ListItemText primary="Feedbacks" sx={{color: 'white'}}/></ListItem>
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => navigate('/admin/providers')}><ListItemIcon sx={{ color: '#fff' }}><People /></ListItemIcon><ListItemText primary="Providers" sx={{color: 'white'}}/></ListItem>
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => navigate('/admin/customers')}><ListItemIcon sx={{ color: '#fff' }}><People /></ListItemIcon><ListItemText primary="Customers" sx={{color: 'white'}}/></ListItem>
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => navigate('/admin/logs')}><ListItemIcon sx={{ color: '#fff' }}><Description /></ListItemIcon><ListItemText primary="Activity Logs" sx={{color: 'white'}}/></ListItem>
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => navigate('/admin/chats')}><ListItemIcon sx={{ color: '#fff' }}><Description /></ListItemIcon><ListItemText primary="Chats" sx={{color: 'white'}}/></ListItem>
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => navigate('/admin/plans')}><ListItemIcon sx={{ color: '#fff' }}><Description /></ListItemIcon><ListItemText primary="Plans" sx={{color: 'white'}}/></ListItem>
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => navigate('/admin/reset/password')}><ListItemIcon sx={{ color: '#fff' }}><Description /></ListItemIcon><ListItemText primary="Reset Password" sx={{color: 'white'}}/></ListItem>
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => setShowSettings(true)}><ListItemIcon sx={{ color: '#fff' }}><Settings /></ListItemIcon><ListItemText primary="Settings" sx={{color: 'white'}}/></ListItem>
      <ListItem button sx={{ cursor: 'pointer' }} onClick={handleLogout}><ListItemIcon sx={{ color: '#fff' }}><Logout /></ListItemIcon><ListItemText primary="Logout" sx={{color: 'white'}}/></ListItem>
    </List>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f4f6f8' }}>
        <Drawer variant="permanent" sx={{ width: 240, display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: 240, boxSizing: 'border-box', bgcolor: '#2c5282', color: '#fff' } }}>
            <Toolbar />
            <SidebarList />
        </Drawer>
        <Drawer variant="temporary" open={sidebarOpen} onClose={toggleSidebar} sx={{ display: { md: 'none' }, '& .MuiDrawer-paper': { width: 240, boxSizing: 'border-box', bgcolor: '#2c5282', color: '#fff' } }}>
            <SidebarList />
        </Drawer>
        <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - 240px)` } }}>
            <Toolbar />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
              <IconButton onClick={toggleSidebar} sx={{ display: { md: 'none' } }}><Menu /></IconButton>
              <Typography variant="h4">Welcome, {adminName}!</Typography>
              <Box>
                <Button variant="contained" sx={{mr: 2}} startIcon={<Refresh />} onClick={handleRefresh} disabled={loading}>
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Refresh Data'}
                </Button>
              </Box>
            </Box>

            {loading ? <CircularProgress sx={{display: 'block', margin: 'auto'}} /> : 
              showSettings ? (
                <Paper sx={{ p: 3, borderRadius: 2 }}>
                  <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => setShowSettings(false)} sx={{ mb: 2 }}>Back to Dashboard</Button>
                  <Typography variant="h6">Admin Settings</Typography>
                  <TextField label="New Name" value={newName} onChange={(e) => setNewName(e.target.value)} fullWidth sx={{ mb: 2, mt: 2 }} />
                  <TextField label="New Email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} fullWidth sx={{ mb: 2 }} />
                  <TextField label="New Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} fullWidth sx={{ mb: 3 }} />
                  <Button variant="contained" onClick={handleUpdateSettings} disabled={loading}>Save Settings</Button>
                </Paper>
              ) : (
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={3}><Paper sx={{ p: 2, textAlign: 'center' }}>Total Revenue<Typography variant="h5">₹{revenue.toFixed(2)}</Typography></Paper></Grid>
                  <Grid item xs={12} sm={6} md={3}><Paper sx={{ p: 2, textAlign: 'center' }}>Total Bookings<Typography variant="h5">{bookingCount}</Typography></Paper></Grid>
                  <Grid item xs={12} sm={6} md={3}><Paper sx={{ p: 2, textAlign: 'center' }}>Total Services<Typography variant="h5">{serviceCount}</Typography></Paper></Grid>
                  <Grid item xs={12} sm={6} md={3}><Paper sx={{ p: 2, textAlign: 'center' }}>Total Feedbacks<Typography variant="h5">{feedbackCount}</Typography></Paper></Grid>
                  <Grid item xs={12} sm={6} md={4}><Paper sx={{ p: 2, textAlign: 'center' }}>Active Providers<Typography variant="h4">{users.filter(u => u.role === 'provider' && u.profile?.status === 'active').length}</Typography></Paper></Grid>
                  <Grid item xs={12} sm={6} md={4}><Paper sx={{ p: 2, textAlign: 'center' }}>Active Customers<Typography variant="h4">{users.filter(u => u.role === 'customer').length}</Typography></Paper></Grid>
                
                  <Grid item xs={12} lg={6}>
                    <Paper sx={{p: 2, borderRadius: 2}}><Typography variant="h6">Category Distribution</Typography><ChartContainer><Pie data={pieChartData} options={{responsive: true, maintainAspectRatio: false}} /></ChartContainer></Paper>
                  </Grid>
                  <Grid item xs={12} lg={6}>
                    <Paper sx={{p: 2, borderRadius: 2}}><Typography variant="h6">Monthly Revenue</Typography><ChartContainer><Bar data={barChartData} options={{responsive: true, maintainAspectRatio: false}} /></ChartContainer></Paper>
                  </Grid>

                  <Grid item xs={12}>
                      <Paper sx={{p: 2, display: 'flex', gap: 2, justifyContent: 'center'}}>
                          <Button variant="contained" onClick={handleExportUsers}>Export Users</Button>
                     </Paper>
                  </Grid>
                </Grid>
              )
            }
        </Box>
      <Snackbar open={message.open} autoHideDuration={6000} onClose={() => setMessage({ ...message, open: false })}>
        <Alert onClose={() => setMessage({ ...message, open: false })} severity={message.severity || 'info'} sx={{ width: '100%' }}>
            {message.text}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminDashboard; */




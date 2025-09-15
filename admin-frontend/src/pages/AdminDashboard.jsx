import React, { useEffect, useState, useCallback } from 'react';
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
  const [appointments, setAppointments] = useState([]);
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
        appointmentsResponse,
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
        axios.get(`${API_URL}/api/admin/appointments`, config),
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
      setAppointments(appointmentsResponse.data || []);
      setNewBookingCount(appointmentsResponse.data.filter(app => app.status === 'pending').length);
      console.log('New booking count updated:', appointmentsResponse.data.filter(app => app.status === 'pending').length);
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

  const handleExportAppointments = () => {
    const csv = [
      'Provider,Customer,Service,Scheduled Time,Status',
      ...appointments.map(app => `"${app.providerId?.name || ''}","${app.customerId?.name || ''}","${app.serviceId?.name || ''}","${new Date(app.scheduledTime).toISOString() || ''}","${app.status || ''}"`).join('\n'),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'appointments_export.csv';
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
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => navigate('/admin')}><ListItemIcon sx={{ color: '#fff' }}><Dashboard /></ListItemIcon><ListItemText primary="Dashboard" sx={{color: 'white'}}/></ListItem>
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
                  <Grid item xs={12} sm={6} md={4}><Paper sx={{ p: 2, textAlign: 'center' }}>Pending Appointments<Typography variant="h4">{appointments.filter(app => app.status === 'pending').length}</Typography></Paper></Grid>
                  
                  <Grid item xs={12} lg={6}>
                    <Paper sx={{p: 2, borderRadius: 2}}><Typography variant="h6">Category Distribution</Typography><ChartContainer><Pie data={pieChartData} options={{responsive: true, maintainAspectRatio: false}} /></ChartContainer></Paper>
                  </Grid>
                  <Grid item xs={12} lg={6}>
                    <Paper sx={{p: 2, borderRadius: 2}}><Typography variant="h6">Monthly Revenue</Typography><ChartContainer><Bar data={barChartData} options={{responsive: true, maintainAspectRatio: false}} /></ChartContainer></Paper>
                  </Grid>

                  <Grid item xs={12}>
                      <Paper sx={{p: 2, display: 'flex', gap: 2, justifyContent: 'center'}}>
                          <Button variant="contained" onClick={handleExportUsers}>Export Users</Button>
                          <Button variant="contained" onClick={handleExportAppointments}>Export Appointments</Button>
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






















































/* import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Button, Grid, Paper, CircularProgress, Snackbar, Alert, TextField,
  Drawer, List, ListItem, ListItemIcon, ListItemText, IconButton, Badge, Toolbar
} from '@mui/material';
import { Refresh, Logout, Menu, Dashboard, People, Assignment, Feedback, CalendarToday, Description, ArrowBack, Settings, Mail } from '@mui/icons-material';
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
  const [appointments, setAppointments] = useState([]);
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
  const [newContactCount, setNewContactCount] = useState(0); // Added for contact messages

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
        appointmentsResponse,
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
        axios.get(`${API_URL}/api/admin/appointments`, config),
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
      setAppointments(appointmentsResponse.data || []);
      setNewBookingCount(appointmentsResponse.data.filter(app => app.status === 'pending').length);
      console.log('New booking count updated:', appointmentsResponse.data.filter(app => app.status === 'pending').length);
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

  const handleExportAppointments = () => {
    const csv = [
      'Provider,Customer,Service,Scheduled Time,Status',
      ...appointments.map(app => `"${app.providerId?.name || ''}","${app.customerId?.name || ''}","${app.serviceId?.name || ''}","${new Date(app.scheduledTime).toISOString() || ''}","${app.status || ''}"`).join('\n'),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'appointments_export.csv';
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
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => navigate('/admin')}><ListItemIcon sx={{ color: '#fff' }}><Dashboard /></ListItemIcon><ListItemText primary="Dashboard" sx={{color: 'white'}}/></ListItem>
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
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => navigate('/admin/feedbacks')}><ListItemIcon sx={{ color: '#fff' }}><Feedback /></ListItemIcon><ListItemText primary="Feedbacks" sx={{color: 'white'}}/></ListItem>
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => navigate('/admin/providers')}><ListItemIcon sx={{ color: '#fff' }}><People /></ListItemIcon><ListItemText primary="Providers" sx={{color: 'white'}}/></ListItem>
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => navigate('/admin/customers')}><ListItemIcon sx={{ color: '#fff' }}><People /></ListItemIcon><ListItemText primary="Customers" sx={{color: 'white'}}/></ListItem>
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => navigate('/admin/logs')}><ListItemIcon sx={{ color: '#fff' }}><Description /></ListItemIcon><ListItemText primary="Activity Logs" sx={{color: 'white'}}/></ListItem>
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
                  <Grid item xs={12} sm={6} md={4}><Paper sx={{ p: 2, textAlign: 'center' }}>Pending Appointments<Typography variant="h4">{appointments.filter(app => app.status === 'pending').length}</Typography></Paper></Grid>
                  
                  <Grid item xs={12} lg={6}>
                    <Paper sx={{p: 2, borderRadius: 2}}><Typography variant="h6">Category Distribution</Typography><ChartContainer><Pie data={pieChartData} options={{responsive: true, maintainAspectRatio: false}} /></ChartContainer></Paper>
                  </Grid>
                  <Grid item xs={12} lg={6}>
                    <Paper sx={{p: 2, borderRadius: 2}}><Typography variant="h6">Monthly Revenue</Typography><ChartContainer><Bar data={barChartData} options={{responsive: true, maintainAspectRatio: false}} /></ChartContainer></Paper>
                  </Grid>

                  <Grid item xs={12}>
                      <Paper sx={{p: 2, display: 'flex', gap: 2, justifyContent: 'center'}}>
                          <Button variant="contained" onClick={handleExportUsers}>Export Users</Button>
                          <Button variant="contained" onClick={handleExportAppointments}>Export Appointments</Button>
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















































/* import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Button, Grid, Paper, CircularProgress, Snackbar, Alert, TextField,
  Drawer, List, ListItem, ListItemIcon, ListItemText, IconButton, Badge, Toolbar
} from '@mui/material';
import { Refresh, Logout, Menu, Dashboard, People, Assignment, Feedback, CalendarToday, Description, ArrowBack, Settings, Mail } from '@mui/icons-material';
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
  const [appointments, setAppointments] = useState([]);
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
        appointmentsResponse,
      ] = await Promise.all([
        axios.get(`${API_URL}/api/dashboard/revenue`, config),
        axios.get(`${API_URL}/api/bookings/all-bookings`, config),
        axios.get(`${API_URL}/api/dashboard/services/count`, config),
        axios.get(`${API_URL}/api/dashboard/feedbacks/count`, config),
        axios.get(`${API_URL}/api/dashboard/services/category-stats`, config),
        axios.get(`${API_URL}/api/dashboard/bookings/monthly-revenue`, config),
        axios.get(`${API_URL}/api/admin/users`, config),
        axios.get(`${API_URL}/api/admin/appointments`, config),
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
      setAppointments(appointmentsResponse.data || []);
      setNewBookingCount(appointmentsResponse.data.filter(app => app.status === 'pending').length);
      console.log('New booking count updated:', appointmentsResponse.data.filter(app => app.status === 'pending').length);
    } catch (error) {
      setMessage({ open: true, text: 'Error fetching dashboard data.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [token, navigate]);

  useEffect(() => {
    fetchData();

    const handleConnect = () => {
        socket.emit('joinAdminRoom');
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

    const handleGenericUpdate = () => fetchData();

    socket.on('newAdminMessage', handleNewMessage);
    socket.on('newPendingBooking', handleNewBooking);
    socket.on('userUpdated', handleGenericUpdate);
    socket.on('userDeleted', handleGenericUpdate);
    socket.on('appointmentUpdated', handleGenericUpdate);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('newAdminMessage', handleNewMessage);
      socket.off('newPendingBooking', handleNewBooking);
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

  const handleExportAppointments = () => {
    const csv = [
      'Provider,Customer,Service,Scheduled Time,Status',
      ...appointments.map(app => `"${app.providerId?.name || ''}","${app.customerId?.name || ''}","${app.serviceId?.name || ''}","${new Date(app.scheduledTime).toISOString() || ''}","${app.status || ''}"`).join('\n'),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'appointments_export.csv';
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
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => navigate('/admin')}><ListItemIcon sx={{ color: '#fff' }}><Dashboard /></ListItemIcon><ListItemText primary="Dashboard" sx={{color: 'white'}}/></ListItem>
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
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => navigate('/admin/messages')}><ListItemIcon sx={{ color: '#fff' }}><Badge color="error" badgeContent={newMessageCount}><Mail /></Badge></ListItemIcon><ListItemText primary="Messages" sx={{color: 'white'}}/></ListItem>
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => navigate('/admin/feedbacks')}><ListItemIcon sx={{ color: '#fff' }}><Feedback /></ListItemIcon><ListItemText primary="Feedbacks" sx={{color: 'white'}}/></ListItem>
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => navigate('/admin/providers')}><ListItemIcon sx={{ color: '#fff' }}><People /></ListItemIcon><ListItemText primary="Providers" sx={{color: 'white'}}/></ListItem>
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => navigate('/admin/customers')}><ListItemIcon sx={{ color: '#fff' }}><People /></ListItemIcon><ListItemText primary="Customers" sx={{color: 'white'}}/></ListItem>
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => navigate('/admin/logs')}><ListItemIcon sx={{ color: '#fff' }}><Description /></ListItemIcon><ListItemText primary="Activity Logs" sx={{color: 'white'}}/></ListItem>
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
                  <Grid item xs={12} sm={6} md={4}><Paper sx={{ p: 2, textAlign: 'center' }}>Pending Appointments<Typography variant="h4">{appointments.filter(app => app.status === 'pending').length}</Typography></Paper></Grid>
                  
                  <Grid item xs={12} lg={6}>
                    <Paper sx={{p: 2, borderRadius: 2}}><Typography variant="h6">Category Distribution</Typography><ChartContainer><Pie data={pieChartData} options={{responsive: true, maintainAspectRatio: false}} /></ChartContainer></Paper>
                  </Grid>
                  <Grid item xs={12} lg={6}>
                    <Paper sx={{p: 2, borderRadius: 2}}><Typography variant="h6">Monthly Revenue</Typography><ChartContainer><Bar data={barChartData} options={{responsive: true, maintainAspectRatio: false}} /></ChartContainer></Paper>
                  </Grid>

                  <Grid item xs={12}>
                      <Paper sx={{p: 2, display: 'flex', gap: 2, justifyContent: 'center'}}>
                          <Button variant="contained" onClick={handleExportUsers}>Export Users</Button>
                          <Button variant="contained" onClick={handleExportAppointments}>Export Appointments</Button>
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
















































/* import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Button, Grid, Paper, CircularProgress, Snackbar, Alert, TextField,
  Drawer, List, ListItem, ListItemIcon, ListItemText, IconButton, Badge, Toolbar
} from '@mui/material';
import { Refresh, Logout, Menu, Dashboard, People, Assignment, Feedback, CalendarToday, Description, ArrowBack, Settings, Mail } from '@mui/icons-material';
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
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ open: false, text: '', severity: 'success' });
  const [adminName, setAdminName] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newMessageCount, setNewMessageCount] = useState(0);

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
        appointmentsResponse,
      ] = await Promise.all([
        axios.get(`${API_URL}/api/dashboard/revenue`, config),
        axios.get(`${API_URL}/api/bookings/all-bookings`, config),
        axios.get(`${API_URL}/api/dashboard/services/count`, config),
        axios.get(`${API_URL}/api/dashboard/feedbacks/count`, config),
        axios.get(`${API_URL}/api/dashboard/services/category-stats`, config),
        axios.get(`${API_URL}/api/dashboard/bookings/monthly-revenue`, config),
        axios.get(`${API_URL}/api/admin/users`, config),
        axios.get(`${API_URL}/api/admin/appointments`, config),
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
      setAppointments(appointmentsResponse.data || []);
    } catch (error) {
      setMessage({ open: true, text: 'Error fetching dashboard data.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [token, navigate]);

  useEffect(() => {
    fetchData();

    const handleConnect = () => {
        console.log("Admin socket connected, joining room...");
        socket.emit('joinAdminRoom');
    };

    socket.on('connect', handleConnect);
    if (socket.connected) {
        handleConnect();
    }

    const handleNewMessage = (newMessage) => {
        setNewMessageCount(prev => prev + 1);
        setMessage({ open: true, text: `New message from ${newMessage.customerId.name}`, severity: 'info' });
    };

    const handleGenericUpdate = (eventName, data) => {
        setMessage({ open: true, text: `Data updated: ${eventName}`, severity: 'info' });
        fetchData();
    };

    socket.on('newAdminMessage', handleNewMessage);
    socket.on('revenueUpdated', (data) => setRevenue(data.total || 0));
    socket.on('ordersUpdated', (data) => setBookingCount(data.count || 0));
    socket.on('servicesUpdated', (data) => setServiceCount(data.count || 0));
    socket.on('feedbacksUpdated', (data) => setFeedbackCount(data.count || 0));
    socket.on('userUpdated', () => handleGenericUpdate('userUpdated'));
    socket.on('userDeleted', () => handleGenericUpdate('userDeleted'));
    socket.on('appointmentUpdated', () => handleGenericUpdate('appointmentUpdated'));

    return () => {
      socket.off('connect', handleConnect);
      socket.off('newAdminMessage', handleNewMessage);
      socket.off('revenueUpdated');
      socket.off('ordersUpdated');
      socket.off('servicesUpdated');
      socket.off('feedbacksUpdated');
      socket.off('userUpdated');
      socket.off('userDeleted');
      socket.off('appointmentUpdated');
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

  const handleExportAppointments = () => {
    const csv = [
      'Provider,Customer,Service,Scheduled Time,Status',
      ...appointments.map(app => `"${app.providerId?.name || ''}","${app.customerId?.name || ''}","${app.serviceId?.name || ''}","${new Date(app.scheduledTime).toISOString() || ''}","${app.status || ''}"`).join('\n'),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'appointments_export.csv';
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
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => navigate('/admin')}><ListItemIcon sx={{ color: '#fff' }}><Dashboard /></ListItemIcon><ListItemText primary="Dashboard" sx={{color: 'white'}}/></ListItem>
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => navigate('/admin/bookings')}><ListItemIcon sx={{ color: '#fff' }}><Assignment /></ListItemIcon><ListItemText primary="Bookings" sx={{color: 'white'}}/></ListItem>
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => navigate('/admin/services')}><ListItemIcon sx={{ color: '#fff' }}><Assignment /></ListItemIcon><ListItemText primary="Services" sx={{color: 'white'}}/></ListItem>
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => navigate('/admin/messages')}><ListItemIcon sx={{ color: '#fff' }}><Badge color="error" badgeContent={newMessageCount}><Mail /></Badge></ListItemIcon><ListItemText primary="Messages" sx={{color: 'white'}}/></ListItem>
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => navigate('/admin/feedbacks')}><ListItemIcon sx={{ color: '#fff' }}><Feedback /></ListItemIcon><ListItemText primary="Feedbacks" sx={{color: 'white'}}/></ListItem>
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => navigate('/admin/providers')}><ListItemIcon sx={{ color: '#fff' }}><People /></ListItemIcon><ListItemText primary="Providers" sx={{color: 'white'}}/></ListItem>
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => navigate('/admin/customers')}><ListItemIcon sx={{ color: '#fff' }}><People /></ListItemIcon><ListItemText primary="Customers" sx={{color: 'white'}}/></ListItem>
      <ListItem button sx={{ cursor: 'pointer' }} onClick={() => navigate('/admin/logs')}><ListItemIcon sx={{ color: '#fff' }}><Description /></ListItemIcon><ListItemText primary="Activity Logs" sx={{color: 'white'}}/></ListItem>
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
                  <Grid item xs={12} sm={6} md={4}><Paper sx={{ p: 2, textAlign: 'center' }}>Pending Appointments<Typography variant="h4">{appointments.filter(app => app.status === 'pending').length}</Typography></Paper></Grid>
                  
                  <Grid item xs={12} lg={6}>
                    <Paper sx={{p: 2, borderRadius: 2}}><Typography variant="h6">Category Distribution</Typography><ChartContainer><Pie data={pieChartData} options={{responsive: true, maintainAspectRatio: false}} /></ChartContainer></Paper>
                  </Grid>
                  <Grid item xs={12} lg={6}>
                    <Paper sx={{p: 2, borderRadius: 2}}><Typography variant="h6">Monthly Revenue</Typography><ChartContainer><Bar data={barChartData} options={{responsive: true, maintainAspectRatio: false}} /></ChartContainer></Paper>
                  </Grid>

                  <Grid item xs={12}>
                      <Paper sx={{p: 2, display: 'flex', gap: 2, justifyContent: 'center'}}>
                          <Button variant="contained" onClick={handleExportUsers}>Export Users</Button>
                          <Button variant="contained" onClick={handleExportAppointments}>Export Appointments</Button>
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
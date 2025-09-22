import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  CircularProgress,
  Snackbar,
  Alert,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Switch,
  TableContainer,
  TableSortLabel,
  Avatar,
  Chip,
  styled
} from "@mui/material";
import {
  Edit,
  Delete,
  Add,
  Save,
  Close,
  Menu,
  People,
  CalendarToday,
  Description,
  Dashboard,
  CancelOutlined,
  CheckCircle,
  ArrowBack,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import io from "socket.io-client";
import "../styles/ProviderManagement.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const socket = io(API_URL);

// Styled Chip for subscription plan, matching Navbar.jsx styling
const StyledSubscriptionChip = styled(Chip)(({ theme, subscription }) => ({
  backgroundColor: subscription === 'pro' || subscription === 'elite' ? '#FFD700' : theme.palette.grey[200],
  color: subscription === 'pro' || subscription === 'elite' ? '#000' : theme.palette.text.primary,
  fontWeight: 'medium',
  fontSize: '0.875rem',
  padding: '0 8px',
  height: '28px',
  borderRadius: '14px',
}));

const ProviderManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ open: false, text: "", severity: "success" });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editedUser, setEditedUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('name');
  const token = localStorage.getItem("token");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(response.data.filter((user) => user.role === "provider"));
    } catch (error) {
      setMessage({ open: true, text: "Failed to load providers.", severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [token]);
  
  const fetchAppointments = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/appointments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAppointments(response.data);
    } catch (error) {
      console.error("Error fetching appointments:", error.response?.data || error.message);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }
    fetchUsers();
    fetchAppointments();

    const handleUserUpdate = (data) => {
      if (data.role === 'provider') {
        setUsers((prev) => prev.map((u) => (u._id === data._id ? data : u)));
      }
    };
    const handleUserDelete = (data) => {
      setUsers((prev) => prev.filter((u) => u._id !== data._id));
    };

    socket.on("userUpdated", handleUserUpdate);
    socket.on("userDeleted", handleUserDelete);

    return () => {
        socket.off("userUpdated", handleUserUpdate);
        socket.off("userDeleted", handleUserDelete);
    };
  }, [token, navigate, fetchUsers, fetchAppointments]);

  const handleEdit = (user) => {
    setEditedUser({
        ...user,
        profile: {
          ...user.profile,
          skills: Array.isArray(user.profile.skills) ? user.profile.skills.join(', ') : '',
        }
    });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const isNewUser = !editedUser._id;
      const url = isNewUser ? `${API_URL}/api/auth/register` : `${API_URL}/api/admin/users/${editedUser._id}`;
      const method = isNewUser ? 'post' : 'put';
      const skillsArray = typeof editedUser.profile.skills === 'string' 
        ? editedUser.profile.skills.split(',').map(s => s.trim()).filter(Boolean) 
        : editedUser.profile.skills;
      
      const payload = {
          ...editedUser,
          profile: { ...editedUser.profile, skills: skillsArray },
          role: 'provider'
      };

      if (isNewUser && !editedUser.password) {
        throw new Error("Password is required for new providers.");
      }

      await axios[method](url, payload, { headers: { Authorization: `Bearer ${token}` } });
      setMessage({ open: true, text: `Provider ${isNewUser ? 'added' : 'updated'} successfully!`, severity: "success" });
      setEditDialogOpen(false);
      fetchUsers();
    } catch (error) {
      setMessage({ open: true, text: `Failed to save provider: ${error.response?.data?.message || error.message}`, severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this provider?")) {
      setLoading(true);
      try {
        await axios.delete(`${API_URL}/api/admin/users/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMessage({ open: true, text: "Provider deleted successfully!", severity: "success" });
        fetchUsers();
      } catch (error) {
        setMessage({ open: true, text: "Failed to delete provider.", severity: "error" });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAddProvider = () => {
    setEditedUser({
      role: "provider", 
      name: '', 
      email: '', 
      phone: '', 
      password: '',
      profile: { 
        skills: [], 
        availability: "Unavailable", 
        location: { fullAddress: "" }, 
        image: "", 
        status: "active" 
      },
    });
    setEditDialogOpen(true);
  };

  const handleDialogClose = () => {
    setEditDialogOpen(false);
    setEditedUser(null);
  };

  const toggleUserStatus = async (userId) => {
    setLoading(true);
    try {
      await axios.put(`${API_URL}/api/admin/users/${userId}/toggle-status`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchUsers();
    } catch (error) {
      setMessage({ open: true, text: "Failed to update provider status.", severity: "error" });
    } finally {
      setLoading(false);
    }
  };
  
  const toggleAvailability = async (userId) => {
    setLoading(true);
    try {
      await axios.put(`${API_URL}/api/admin/users/${userId}/toggle-availability`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchUsers();
    } catch (error) {
      setMessage({ open: true, text: "Failed to update provider availability.", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const getComparator = (order, orderBy) => {
    return order === 'desc'
      ? (a, b) => {
          const aValue = orderBy === 'location' ? (a.profile?.location?.fullAddress || 'N/A') 
                       : orderBy === 'subscriptionTier' ? (a.subscriptionTier || 'free') 
                       : a[orderBy];
          const bValue = orderBy === 'location' ? (b.profile?.location?.fullAddress || 'N/A') 
                       : orderBy === 'subscriptionTier' ? (b.subscriptionTier || 'free') 
                       : b[orderBy];
          return bValue < aValue ? -1 : 1;
        }
      : (a, b) => {
          const aValue = orderBy === 'location' ? (a.profile?.location?.fullAddress || 'N/A') 
                       : orderBy === 'subscriptionTier' ? (a.subscriptionTier || 'free') 
                       : a[orderBy];
          const bValue = orderBy === 'location' ? (b.profile?.location?.fullAddress || 'N/A') 
                       : orderBy === 'subscriptionTier' ? (b.subscriptionTier || 'free') 
                       : b[orderBy];
          return aValue < bValue ? -1 : 1;
        };
  };

  const sortedUsers = [...users].sort(getComparator(order, orderBy));

  const filteredAndSortedProviders = sortedUsers
    .filter(user => 
        (user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
         user.email.toLowerCase().includes(searchQuery.toLowerCase())) &&
        (skillFilter ? user.profile.skills.some(skill => skill.toLowerCase().includes(skillFilter.toLowerCase())) : true)
    );
  
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const exportProviders = () => {
    const csv = [
      "Name,Email,Phone,Location,Availability,Skills,Image,Status,SubscriptionTier",
      ...users.map(user =>
        `${user.name},${user.email},${user.phone || "N/A"},"${user.profile?.location?.fullAddress || "N/A"}",${user.profile?.availability || "N/A"},"${(user.profile?.skills || []).join(", ")}",${user.profile?.image || "N/A"},${user.profile?.status || "N/A"},${user.subscriptionTier || "free"}`
      ).join("\n"),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "providers_export.csv";
    a.click();
  };

  return (
    <Box sx={{ p: 4, maxWidth: "1600px", mx: "auto", bgcolor: "#f4f6f8", minHeight: "100vh" }}>
        <Typography variant="h3" sx={{ mb: 2, fontWeight: "bold", color: "#1a3c34", textAlign: "center" }}>
            Provider Management
        </Typography>

        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 4, flexWrap: 'wrap', gap: 2 }}>
            <Button variant="contained" startIcon={<ArrowBack />} onClick={() => navigate("/admin/dashboard")}>
              Back to Dashboard
            </Button>
            <Box>
                <Button variant="contained" sx={{mr: 2}} startIcon={<Add />} onClick={handleAddProvider}>
                    Add Provider
                </Button>
                <Button variant="outlined" onClick={exportProviders}>
                    Export Providers
                </Button>
            </Box>
        </Box>
        
        <Paper sx={{p: 2, mb: 4, display: 'flex', gap: 2, flexWrap: 'wrap'}}>
            <TextField label="Search by Name or Email" variant="outlined" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} sx={{flexGrow: 1, minWidth: '250px'}}/>
            <TextField label="Filter by Skill" variant="outlined" value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)} sx={{flexGrow: 1, minWidth: '200px'}}/>
        </Paper>

        {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}><CircularProgress /></Box>
        ) : (
            <>
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Paper sx={{ p: 3, textAlign: "center", borderRadius: 3, boxShadow: 3 }}>
                            <Typography variant="h6" sx={{ color: "#2c5282", fontWeight: "medium" }}>Active Providers</Typography>
                            <Typography variant="h4" sx={{ color: "#1a3c34", fontWeight: "bold" }}>
                                {users.filter((user) => user.profile?.status === "active").length}
                            </Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Paper sx={{ p: 3, textAlign: "center", borderRadius: 3, boxShadow: 3 }}>
                            <Typography variant="h6" sx={{ color: "#2c5282", fontWeight: "medium" }}>Pending Appointments</Typography>
                            <Typography variant="h4" sx={{ color: "#1a3c34", fontWeight: "bold" }}>
                                {appointments.filter((app) => app.status === "pending").length}
                            </Typography>
                        </Paper>
                    </Grid>
                </Grid>

                <Paper elevation={3} sx={{ p: 3, borderRadius: 2, bgcolor: "#ffffff" }}>
                    <TableContainer sx={{ overflowX: 'auto' }}>
                        <Table aria-label="provider table">
                            <TableHead>
                                <TableRow>
                                    <TableCell><TableSortLabel active={orderBy === 'name'} direction={orderBy === 'name' ? order : 'asc'} onClick={() => handleSort('name')}>Provider</TableSortLabel></TableCell>
                                    <TableCell>Contact</TableCell>
                                    <TableCell><TableSortLabel active={orderBy === 'location'} direction={orderBy === 'location' ? order : 'asc'} onClick={() => handleSort('location')}>Location</TableSortLabel></TableCell>
                                    <TableCell>Skills</TableCell>
                                    <TableCell>Availability</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell><TableSortLabel active={orderBy === 'subscriptionTier'} direction={orderBy === 'subscriptionTier' ? order : 'asc'} onClick={() => handleSort('subscriptionTier')}>Subscription Plan</TableSortLabel></TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredAndSortedProviders.map((user) => (
                                    <TableRow key={user._id} hover>
                                        <TableCell component="th" scope="row">
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <Avatar src={user.profile?.image ? `${API_URL}${user.profile.image}` : ''} sx={{ mr: 2 }}>{user.name.charAt(0)}</Avatar>
                                                <Typography variant="body1" fontWeight="medium">{user.name}</Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{user.email}</Typography>
                                            <Typography variant="body2" color="text.secondary">{user.phone}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{user.profile?.location?.fullAddress || "N/A"}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', maxWidth: '250px' }}>
                                                {(user.profile?.skills || []).map(skill => <Chip key={skill} label={skill} size="small" />)}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Switch checked={user.profile?.availability === "Available"} onChange={() => toggleAvailability(user._id)} />
                                        </TableCell>
                                        <TableCell>
                                            <Switch checked={user.profile?.status === "active"} onChange={() => toggleUserStatus(user._id)} color="success" />
                                        </TableCell>
                                        <TableCell>
                                            <StyledSubscriptionChip
                                                label={`${user.subscriptionTier ? user.subscriptionTier.charAt(0).toUpperCase() + user.subscriptionTier.slice(1) : 'Free'} Plan`}
                                                subscription={user.subscriptionTier || 'free'}
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton color="primary" onClick={() => handleEdit(user)}><Edit /></IconButton>
                                            <IconButton color="error" onClick={() => handleDelete(user._id)}><Delete /></IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </>
        )}

        <Dialog open={editDialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
            <DialogTitle>{editedUser?._id ? "Edit Provider" : "Add New Provider"}</DialogTitle>
            <DialogContent>
                <TextField 
                    margin="dense" 
                    label="Name" 
                    fullWidth 
                    value={editedUser?.name || ""} 
                    onChange={(e) => setEditedUser({ ...editedUser, name: e.target.value })} 
                />
                <TextField 
                    margin="dense" 
                    label="Email" 
                    fullWidth 
                    value={editedUser?.email || ""} 
                    onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })} 
                />
                {!editedUser?._id && (
                    <TextField 
                        margin="dense" 
                        label="Password" 
                        type="password" 
                        helperText="Required for new providers" 
                        fullWidth 
                        onChange={(e) => setEditedUser({ ...editedUser, password: e.target.value })} 
                    />
                )}
                <TextField 
                    margin="dense" 
                    label="Phone" 
                    fullWidth 
                    value={editedUser?.phone || ""} 
                    onChange={(e) => setEditedUser({ ...editedUser, phone: e.target.value })} 
                />
                <TextField 
                    margin="dense" 
                    label="Skills (comma-separated)" 
                    fullWidth 
                    value={editedUser?.profile?.skills || ""} 
                    onChange={(e) => setEditedUser({ ...editedUser, profile: { ...editedUser.profile, skills: e.target.value }})}
                />
                <TextField 
                    margin="dense" 
                    label="Availability (e.g., YYYY-MM-DD HH:mm-HH:mm)" 
                    fullWidth 
                    value={editedUser?.profile?.availability || ""} 
                    onChange={(e) => setEditedUser({ ...editedUser, profile: { ...editedUser.profile, availability: e.target.value }})}
                />
                <TextField 
                    margin="dense" 
                    label="Location" 
                    fullWidth 
                    value={editedUser?.profile?.location?.fullAddress || ""} 
                    onChange={(e) => setEditedUser({ ...editedUser, profile: { ...editedUser.profile, location: { ...editedUser.profile.location, fullAddress: e.target.value }}})}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleDialogClose}>Cancel</Button>
                <Button onClick={handleSave} variant="contained" disabled={loading}>
                    {loading ? <CircularProgress size={24}/> : 'Save'}
                </Button>
            </DialogActions>
        </Dialog>
      
        <Snackbar 
            open={message.open} 
            autoHideDuration={4000} 
            onClose={() => setMessage({ ...message, open: false })} 
            anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
            <Alert 
                onClose={() => setMessage({ ...message, open: false })} 
                severity={message.severity} 
                sx={{ width: "100%" }}
            >
                {message.text}
            </Alert>
        </Snackbar>
    </Box>
  );
};

export default ProviderManagement;































































































//main
/* import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  CircularProgress,
  Snackbar,
  Alert,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Switch,
  TableContainer,
  TableSortLabel,
  Avatar,
  Chip
} from "@mui/material";
import {
  Edit,
  Delete,
  Add,
  Save,
  Close,
  Menu,
  People,
  CalendarToday,
  Description,
  Dashboard,
  CancelOutlined,
  CheckCircle,
  ArrowBack,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import io from "socket.io-client";
import "../styles/ProviderManagement.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const socket = io(API_URL);

const ProviderManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ open: false, text: "", severity: "success" });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editedUser, setEditedUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('name');
  const token = localStorage.getItem("token");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(response.data.filter((user) => user.role === "provider"));
    } catch (error) {
      setMessage({ open: true, text: "Failed to load providers.", severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [token]);
  
  const fetchAppointments = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/appointments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAppointments(response.data);
    } catch (error) {
      console.error("Error fetching appointments:", error.response?.data || error.message);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }
    fetchUsers();
    fetchAppointments();

    const handleUserUpdate = (data) => {
      if (data.role === 'provider') {
        setUsers((prev) => prev.map((u) => (u._id === data._id ? data : u)));
      }
    };
    const handleUserDelete = (data) => {
      setUsers((prev) => prev.filter((u) => u._id !== data._id));
    };

    socket.on("userUpdated", handleUserUpdate);
    socket.on("userDeleted", handleUserDelete);

    return () => {
        socket.off("userUpdated", handleUserUpdate);
        socket.off("userDeleted", handleUserDelete);
    };
  }, [token, navigate, fetchUsers, fetchAppointments]);

  const handleEdit = (user) => {
    setEditedUser({
        ...user,
        profile: {
          ...user.profile,
          skills: Array.isArray(user.profile.skills) ? user.profile.skills.join(', ') : '',
        }
    });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const isNewUser = !editedUser._id;
      const url = isNewUser ? `${API_URL}/api/auth/register` : `${API_URL}/api/admin/users/${editedUser._id}`;
      const method = isNewUser ? 'post' : 'put';
      const skillsArray = typeof editedUser.profile.skills === 'string' 
        ? editedUser.profile.skills.split(',').map(s => s.trim()).filter(Boolean) 
        : editedUser.profile.skills;
      
      const payload = {
          ...editedUser,
          profile: { ...editedUser.profile, skills: skillsArray },
          role: 'provider'
      };

      if (isNewUser && !editedUser.password) {
        throw new Error("Password is required for new providers.");
      }

      await axios[method](url, payload, { headers: { Authorization: `Bearer ${token}` } });
      setMessage({ open: true, text: `Provider ${isNewUser ? 'added' : 'updated'} successfully!`, severity: "success" });
      setEditDialogOpen(false);
      fetchUsers();
    } catch (error) {
      setMessage({ open: true, text: `Failed to save provider: ${error.response?.data?.message || error.message}`, severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this provider?")) {
      setLoading(true);
      try {
        await axios.delete(`${API_URL}/api/admin/users/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMessage({ open: true, text: "Provider deleted successfully!", severity: "success" });
        fetchUsers();
      } catch (error) {
        setMessage({ open: true, text: "Failed to delete provider.", severity: "error" });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAddProvider = () => {
    setEditedUser({
      role: "provider", 
      name: '', 
      email: '', 
      phone: '', 
      password: '',
      profile: { 
        skills: [], 
        availability: "Unavailable", 
        location: { fullAddress: "" }, 
        image: "", 
        status: "active" 
      },
    });
    setEditDialogOpen(true);
  };

  const handleDialogClose = () => {
    setEditDialogOpen(false);
    setEditedUser(null);
  };

  const toggleUserStatus = async (userId) => {
    setLoading(true);
    try {
      await axios.put(`${API_URL}/api/admin/users/${userId}/toggle-status`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchUsers();
    } catch (error) {
      setMessage({ open: true, text: "Failed to update provider status.", severity: "error" });
    } finally {
      setLoading(false);
    }
  };
  
  const toggleAvailability = async (userId) => {
    setLoading(true);
    try {
      await axios.put(`${API_URL}/api/admin/users/${userId}/toggle-availability`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchUsers();
    } catch (error) {
      setMessage({ open: true, text: "Failed to update provider availability.", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const getComparator = (order, orderBy) => {
    return order === 'desc'
      ? (a, b) => {
          const aValue = orderBy === 'location' ? (a.profile?.location?.fullAddress || 'N/A') : a[orderBy];
          const bValue = orderBy === 'location' ? (b.profile?.location?.fullAddress || 'N/A') : b[orderBy];
          return bValue < aValue ? -1 : 1;
        }
      : (a, b) => {
          const aValue = orderBy === 'location' ? (a.profile?.location?.fullAddress || 'N/A') : a[orderBy];
          const bValue = orderBy === 'location' ? (b.profile?.location?.fullAddress || 'N/A') : b[orderBy];
          return aValue < bValue ? -1 : 1;
        };
  };

  const sortedUsers = [...users].sort(getComparator(order, orderBy));

  const filteredAndSortedProviders = sortedUsers
    .filter(user => 
        (user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
         user.email.toLowerCase().includes(searchQuery.toLowerCase())) &&
        (skillFilter ? user.profile.skills.some(skill => skill.toLowerCase().includes(skillFilter.toLowerCase())) : true)
    );
  
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const exportProviders = () => {
    const csv = [
      "Name,Email,Phone,Location,Availability,Skills,Image,Status",
      ...users.map(user =>
        `${user.name},${user.email},${user.phone || "N/A"},"${user.profile?.location?.fullAddress || "N/A"}",${user.profile?.availability || "N/A"},"${(user.profile?.skills || []).join(", ")}",${user.profile?.image || "N/A"},${user.profile?.status || "N/A"}`
      ).join("\n"),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "providers_export.csv";
    a.click();
  };

  return (
    <Box sx={{ p: 4, maxWidth: "1600px", mx: "auto", bgcolor: "#f4f6f8", minHeight: "100vh" }}>
        <Typography variant="h3" sx={{ mb: 2, fontWeight: "bold", color: "#1a3c34", textAlign: "center" }}>
            Provider Management
        </Typography>

        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 4, flexWrap: 'wrap', gap: 2 }}>
            <Button variant="contained" startIcon={<ArrowBack />} onClick={() => navigate("/admin/dashboard")}>
              Back to Dashboard
            </Button>
            <Box>
                <Button variant="contained" sx={{mr: 2}} startIcon={<Add />} onClick={handleAddProvider}>
                    Add Provider
                </Button>
                <Button variant="outlined" onClick={exportProviders}>
                    Export Providers
                </Button>
            </Box>
        </Box>
        
        <Paper sx={{p: 2, mb: 4, display: 'flex', gap: 2, flexWrap: 'wrap'}}>
            <TextField label="Search by Name or Email" variant="outlined" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} sx={{flexGrow: 1, minWidth: '250px'}}/>
            <TextField label="Filter by Skill" variant="outlined" value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)} sx={{flexGrow: 1, minWidth: '200px'}}/>
        </Paper>

        {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}><CircularProgress /></Box>
        ) : (
            <>
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Paper sx={{ p: 3, textAlign: "center", borderRadius: 3, boxShadow: 3 }}>
                            <Typography variant="h6" sx={{ color: "#2c5282", fontWeight: "medium" }}>Active Providers</Typography>
                            <Typography variant="h4" sx={{ color: "#1a3c34", fontWeight: "bold" }}>
                                {users.filter((user) => user.profile?.status === "active").length}
                            </Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Paper sx={{ p: 3, textAlign: "center", borderRadius: 3, boxShadow: 3 }}>
                            <Typography variant="h6" sx={{ color: "#2c5282", fontWeight: "medium" }}>Pending Appointments</Typography>
                            <Typography variant="h4" sx={{ color: "#1a3c34", fontWeight: "bold" }}>
                                {appointments.filter((app) => app.status === "pending").length}
                            </Typography>
                        </Paper>
                    </Grid>
                </Grid>

                <Paper elevation={3} sx={{ p: 3, borderRadius: 2, bgcolor: "#ffffff" }}>
                    <TableContainer sx={{ overflowX: 'auto' }}>
                        <Table aria-label="provider table">
                            <TableHead>
                                <TableRow>
                                    <TableCell><TableSortLabel active={orderBy === 'name'} direction={orderBy === 'name' ? order : 'asc'} onClick={() => handleSort('name')}>Provider</TableSortLabel></TableCell>
                                    <TableCell>Contact</TableCell>
                                    <TableCell><TableSortLabel active={orderBy === 'location'} direction={orderBy === 'location' ? order : 'asc'} onClick={() => handleSort('location')}>Location</TableSortLabel></TableCell>
                                    <TableCell>Skills</TableCell>
                                    <TableCell>Availability</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredAndSortedProviders.map((user) => (
                                    <TableRow key={user._id} hover>
                                        <TableCell component="th" scope="row">
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <Avatar src={user.profile?.image ? `${API_URL}${user.profile.image}` : ''} sx={{ mr: 2 }}>{user.name.charAt(0)}</Avatar>
                                                <Typography variant="body1" fontWeight="medium">{user.name}</Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{user.email}</Typography>
                                            <Typography variant="body2" color="text.secondary">{user.phone}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{user.profile?.location?.fullAddress || "N/A"}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', maxWidth: '250px' }}>
                                                {(user.profile?.skills || []).map(skill => <Chip key={skill} label={skill} size="small" />)}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Switch checked={user.profile?.availability === "Available"} onChange={() => toggleAvailability(user._id)} />
                                        </TableCell>
                                        <TableCell>
                                            <Switch checked={user.profile?.status === "active"} onChange={() => toggleUserStatus(user._id)} color="success" />
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton color="primary" onClick={() => handleEdit(user)}><Edit /></IconButton>
                                            <IconButton color="error" onClick={() => handleDelete(user._id)}><Delete /></IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </>
        )}

        <Dialog open={editDialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
            <DialogTitle>{editedUser?._id ? "Edit Provider" : "Add New Provider"}</DialogTitle>
            <DialogContent>
                <TextField 
                    margin="dense" 
                    label="Name" 
                    fullWidth 
                    value={editedUser?.name || ""} 
                    onChange={(e) => setEditedUser({ ...editedUser, name: e.target.value })} 
                />
                <TextField 
                    margin="dense" 
                    label="Email" 
                    fullWidth 
                    value={editedUser?.email || ""} 
                    onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })} 
                />
                {!editedUser?._id && (
                    <TextField 
                        margin="dense" 
                        label="Password" 
                        type="password" 
                        helperText="Required for new providers" 
                        fullWidth 
                        onChange={(e) => setEditedUser({ ...editedUser, password: e.target.value })} 
                    />
                )}
                <TextField 
                    margin="dense" 
                    label="Phone" 
                    fullWidth 
                    value={editedUser?.phone || ""} 
                    onChange={(e) => setEditedUser({ ...editedUser, phone: e.target.value })} 
                />
                <TextField 
                    margin="dense" 
                    label="Skills (comma-separated)" 
                    fullWidth 
                    value={editedUser?.profile?.skills || ""} 
                    onChange={(e) => setEditedUser({ ...editedUser, profile: { ...editedUser.profile, skills: e.target.value }})}
                />
                <TextField 
                    margin="dense" 
                    label="Availability (e.g., YYYY-MM-DD HH:mm-HH:mm)" 
                    fullWidth 
                    value={editedUser?.profile?.availability || ""} 
                    onChange={(e) => setEditedUser({ ...editedUser, profile: { ...editedUser.profile, availability: e.target.value }})}
                />
                <TextField 
                    margin="dense" 
                    label="Location" 
                    fullWidth 
                    value={editedUser?.profile?.location?.fullAddress || ""} 
                    onChange={(e) => setEditedUser({ ...editedUser, profile: { ...editedUser.profile, location: { ...editedUser.profile.location, fullAddress: e.target.value }}})}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleDialogClose}>Cancel</Button>
                <Button onClick={handleSave} variant="contained" disabled={loading}>
                    {loading ? <CircularProgress size={24}/> : 'Save'}
                </Button>
            </DialogActions>
        </Dialog>
      
        <Snackbar 
            open={message.open} 
            autoHideDuration={4000} 
            onClose={() => setMessage({ ...message, open: false })} 
            anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
            <Alert 
                onClose={() => setMessage({ ...message, open: false })} 
                severity={message.severity} 
                sx={{ width: "100%" }}
            >
                {message.text}
            </Alert>
        </Snackbar>
    </Box>
  );
};

export default ProviderManagement; */










































































/* import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  CircularProgress,
  Snackbar,
  Alert,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Switch,
  TableContainer,
  TableSortLabel,
  Avatar,
  Chip
} from "@mui/material";
import {
  Edit,
  Delete,
  Add,
  Save,
  Close,
  Menu,
  People,
  CalendarToday,
  Description,
  Dashboard,
  CancelOutlined,
  CheckCircle,
  ArrowBack,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import io from "socket.io-client";
import "../styles/ProviderManagement.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const socket = io(API_URL);

const ProviderManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ open: false, text: "", severity: "success" });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editedUser, setEditedUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('name');
  const token = localStorage.getItem("token");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(response.data.filter((user) => user.role === "provider"));
    } catch (error) {
      setMessage({ open: true, text: "Failed to load providers.", severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [token]);
  
  const fetchAppointments = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/appointments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAppointments(response.data);
    } catch (error) {
      console.error("Error fetching appointments:", error.response?.data || error.message);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }
    fetchUsers();
    fetchAppointments();

    const handleUserUpdate = (data) => {
      if (data.role === 'provider') {
        setUsers((prev) => prev.map((u) => (u._id === data._id ? data : u)));
      }
    };
    const handleUserDelete = (data) => {
      setUsers((prev) => prev.filter((u) => u._id !== data._id));
    };

    socket.on("userUpdated", handleUserUpdate);
    socket.on("userDeleted", handleUserDelete);

    return () => {
        socket.off("userUpdated", handleUserUpdate);
        socket.off("userDeleted", handleUserDelete);
    };
  }, [token, navigate, fetchUsers, fetchAppointments]);

  const handleEdit = (user) => {
    setEditedUser({
        ...user,
        profile: {
          ...user.profile,
          skills: Array.isArray(user.profile.skills) ? user.profile.skills.join(', ') : '',
        }
    });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const isNewUser = !editedUser._id;
      const url = isNewUser ? `${API_URL}/api/auth/register` : `${API_URL}/api/admin/users/${editedUser._id}`;
      const method = isNewUser ? 'post' : 'put';
      const skillsArray = typeof editedUser.profile.skills === 'string' 
        ? editedUser.profile.skills.split(',').map(s => s.trim()).filter(Boolean) 
        : editedUser.profile.skills;
      
      const payload = {
          ...editedUser,
          profile: { ...editedUser.profile, skills: skillsArray },
          role: 'provider'
      };

      if (isNewUser && !editedUser.password) {
        throw new Error("Password is required for new providers.");
      }

      await axios[method](url, payload, { headers: { Authorization: `Bearer ${token}` } });
      setMessage({ open: true, text: `Provider ${isNewUser ? 'added' : 'updated'} successfully!`, severity: "success" });
      setEditDialogOpen(false);
      fetchUsers();
    } catch (error) {
      setMessage({ open: true, text: `Failed to save provider: ${error.response?.data?.message || error.message}`, severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this provider?")) {
      setLoading(true);
      try {
        await axios.delete(`${API_URL}/api/admin/users/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMessage({ open: true, text: "Provider deleted successfully!", severity: "success" });
        fetchUsers();
      } catch (error) {
        setMessage({ open: true, text: "Failed to delete provider.", severity: "error" });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAddProvider = () => {
    setEditedUser({
      role: "provider", name: '', email: '', phone: '', password: '',
      profile: { skills: [], availability: "Unavailable", location: { fullAddress: "" }, image: "", status: "active" },
    });
    setEditDialogOpen(true);
  };

  const handleDialogClose = () => {
    setEditDialogOpen(false);
    setEditedUser(null);
  };

  const toggleUserStatus = async (userId) => {
    setLoading(true);
    try {
      await axios.put(`${API_URL}/api/admin/users/${userId}/toggle-status`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchUsers();
    } catch (error) {
      setMessage({ open: true, text: "Failed to update provider status.", severity: "error" });
    } finally {
      setLoading(false);
    }
  };
  
  const toggleAvailability = async (userId) => {
    setLoading(true);
    try {
      await axios.put(`${API_URL}/api/admin/users/${userId}/toggle-availability`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchUsers();
    } catch (error) {
      setMessage({ open: true, text: "Failed to update provider availability.", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const getComparator = (order, orderBy) => {
    return order === 'desc'
      ? (a, b) => (b[orderBy] < a[orderBy] ? -1 : 1)
      : (a, b) => (a[orderBy] < b[orderBy] ? -1 : 1);
  };

  const sortedUsers = [...users].sort(getComparator(order, orderBy));

  const filteredAndSortedProviders = sortedUsers
    .filter(user => 
        (user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
         user.email.toLowerCase().includes(searchQuery.toLowerCase())) &&
        (skillFilter ? user.profile.skills.some(skill => skill.toLowerCase().includes(skillFilter.toLowerCase())) : true)
    );
  
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const exportProviders = () => {
    const csv = [
      "Name,Email,Phone,Location,Availability,Skills,Image,Status",
      ...users.map(user =>
        `${user.name},${user.email},${user.phone || "N/A"},"${user.profile?.location || "N/A"}",${user.profile?.availability || "N/A"},"${(user.profile?.skills || []).join(", ")}",${user.profile?.image || "N/A"},${user.profile?.status || "N/A"}`
      ).join("\n"),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "providers_export.csv";
    a.click();
  };

  return (
    <Box sx={{ p: 4, maxWidth: "1600px", mx: "auto", bgcolor: "#f4f6f8", minHeight: "100vh" }}>
        <Typography variant="h3" sx={{ mb: 2, fontWeight: "bold", color: "#1a3c34", textAlign: "center" }}>
            Provider Management
        </Typography>

        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 4, flexWrap: 'wrap', gap: 2 }}>
            <Button variant="contained" startIcon={<ArrowBack />} onClick={() => navigate("/admin/dashboard")}>
              Back to Dashboard
            </Button>
            <Box>
                <Button variant="contained" sx={{mr: 2}} startIcon={<Add />} onClick={handleAddProvider}>
                    Add Provider
                </Button>
                <Button variant="outlined" onClick={exportProviders}>
                    Export Providers
                </Button>
            </Box>
        </Box>
        
        <Paper sx={{p: 2, mb: 4, display: 'flex', gap: 2, flexWrap: 'wrap'}}>
            <TextField label="Search by Name or Email" variant="outlined" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} sx={{flexGrow: 1, minWidth: '250px'}}/>
            <TextField label="Filter by Skill" variant="outlined" value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)} sx={{flexGrow: 1, minWidth: '200px'}}/>
        </Paper>

        {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}><CircularProgress /></Box>
        ) : (
            <>
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Paper sx={{ p: 3, textAlign: "center", borderRadius: 3, boxShadow: 3 }}>
                            <Typography variant="h6" sx={{ color: "#2c5282", fontWeight: "medium" }}>Active Providers</Typography>
                            <Typography variant="h4" sx={{ color: "#1a3c34", fontWeight: "bold" }}>
                                {users.filter((user) => user.profile?.status === "active").length}
                            </Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Paper sx={{ p: 3, textAlign: "center", borderRadius: 3, boxShadow: 3 }}>
                            <Typography variant="h6" sx={{ color: "#2c5282", fontWeight: "medium" }}>Pending Appointments</Typography>
                            <Typography variant="h4" sx={{ color: "#1a3c34", fontWeight: "bold" }}>
                                {appointments.filter((app) => app.status === "pending").length}
                            </Typography>
                        </Paper>
                    </Grid>
                </Grid>

                <Paper elevation={3} sx={{ p: 3, borderRadius: 2, bgcolor: "#ffffff" }}>
                    <TableContainer>
                        <Table aria-label="provider table">
                            <TableHead>
                                <TableRow>
                                    <TableCell><TableSortLabel active={orderBy === 'name'} direction={orderBy === 'name' ? order : 'asc'} onClick={() => handleSort('name')}>Provider</TableSortLabel></TableCell>
                                    <TableCell>Contact</TableCell>
                                    <TableCell>Skills</TableCell>
                                    <TableCell>Availability</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredAndSortedProviders.map((user) => (
                                    <TableRow key={user._id} hover>
                                        <TableCell component="th" scope="row">
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <Avatar src={user.profile?.image ? `${API_URL}${user.profile.image}` : ''} sx={{ mr: 2 }}>{user.name.charAt(0)}</Avatar>
                                                <Typography variant="body1" fontWeight="medium">{user.name}</Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{user.email}</Typography>
                                            <Typography variant="body2" color="text.secondary">{user.phone}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', maxWidth: '250px' }}>
                                                {(user.profile?.skills || []).map(skill => <Chip key={skill} label={skill} size="small" />)}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Switch checked={user.profile?.availability === "Available"} onChange={() => toggleAvailability(user._id)} />
                                        </TableCell>
                                        <TableCell>
                                            <Switch checked={user.profile?.status === "active"} onChange={() => toggleUserStatus(user._id)} color="success" />
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton color="primary" onClick={() => handleEdit(user)}><Edit /></IconButton>
                                            <IconButton color="error" onClick={() => handleDelete(user._id)}><Delete /></IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </>
        )}

        <Dialog open={editDialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
            <DialogTitle>{editedUser?._id ? "Edit Provider" : "Add New Provider"}</DialogTitle>
            <DialogContent>
                <TextField margin="dense" label="Name" fullWidth value={editedUser?.name || ""} onChange={(e) => setEditedUser({ ...editedUser, name: e.target.value })} />
                <TextField margin="dense" label="Email" fullWidth value={editedUser?.email || ""} onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })} />
                {!editedUser?._id && <TextField margin="dense" label="Password" type="password" helperText="Required for new providers" fullWidth onChange={(e) => setEditedUser({ ...editedUser, password: e.target.value })} />}
                <TextField margin="dense" label="Phone" fullWidth value={editedUser?.phone || ""} onChange={(e) => setEditedUser({ ...editedUser, phone: e.target.value })} />
                <TextField margin="dense" label="Skills (comma-separated)" fullWidth value={editedUser?.profile?.skills || ""} onChange={(e) => setEditedUser({ ...editedUser, profile: { ...editedUser.profile, skills: e.target.value }})} />
                <TextField margin="dense" label="Availability (e.g., YYYY-MM-DD HH:mm-HH:mm)" fullWidth value={editedUser?.profile?.availability || ""} onChange={(e) => setEditedUser({ ...editedUser, profile: { ...editedUser.profile, availability: e.target.value }})} />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleDialogClose}>Cancel</Button>
                <Button onClick={handleSave} variant="contained" disabled={loading}>{loading ? <CircularProgress size={24}/> : 'Save'}</Button>
            </DialogActions>
        </Dialog>
      
        <Snackbar open={message.open} autoHideDuration={4000} onClose={() => setMessage({ ...message, open: false })} anchorOrigin={{ vertical: "top", horizontal: "center" }}>
            <Alert onClose={() => setMessage({ ...message, open: false })} severity={message.severity} sx={{ width: "100%" }}>
                {message.text}
            </Alert>
        </Snackbar>
    </Box>
  );
};

export default ProviderManagement; */
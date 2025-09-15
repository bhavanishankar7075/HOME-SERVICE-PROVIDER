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
  Avatar
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
  Home,
  ArrowBack,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import io from "socket.io-client";
import "../styles/CustomerManagement.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const socket = io(API_URL);

const CustomerManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ open: false, text: "", severity: "success" });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editedUser, setEditedUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('name');
  const token = localStorage.getItem("token");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [usersResponse, appointmentsResponse] = await Promise.all([
        axios.get(`${API_URL}/api/admin/users`, config),
        axios.get(`${API_URL}/api/admin/appointments`, config)
      ]);
      
      setUsers(usersResponse.data.filter(user => user.role === 'customer'));
      setAppointments(appointmentsResponse.data);
    } catch (error) {
      setMessage({ open: true, text: `Failed to load data: ${error.response?.data?.message || error.message}`, severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }
    fetchData();

    const handleUserUpdate = (data) => {
        if (data.role === 'customer') {
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
  }, [token, navigate, fetchData]);

  const handleEdit = (user) => {
    setEditedUser({ ...user });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
        const isNewUser = !editedUser._id;
        const url = isNewUser ? `${API_URL}/api/auth/register` : `${API_URL}/api/admin/users/${editedUser._id}`;
        const method = isNewUser ? 'post' : 'put';
        const payload = { ...editedUser, role: 'customer' };

        if (isNewUser && !editedUser.password) {
            throw new Error("Password is required for new customers.");
        }
        
        await axios[method](url, payload, { headers: { Authorization: `Bearer ${token}` } });
        setMessage({ open: true, text: `Customer ${isNewUser ? 'added' : 'updated'} successfully!`, severity: "success" });
        setEditDialogOpen(false);
        fetchData();
    } catch (error) {
        setMessage({ open: true, text: `Failed to save customer: ${error.response?.data?.message || error.message}`, severity: "error" });
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this customer?")) {
      setLoading(true);
      try {
        await axios.delete(`${API_URL}/api/admin/users/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMessage({ open: true, text: "Customer deleted successfully!", severity: "success" });
        fetchData();
      } catch (error) {
        setMessage({ open: true, text: `Failed to delete customer: ${error.response?.data?.message || error.message}`, severity: "error" });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAddCustomer = () => {
    setEditedUser({ role: "customer", name: '', email: '', phone: '', password: '', profile: { location: { fullAddress: "" } } });
    setEditDialogOpen(true);
  };

  const handleDialogClose = () => {
    setEditDialogOpen(false);
    setEditedUser(null);
  };
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const exportCustomers = () => {
    const csv = [
      "Name,Email,Phone,Location",
      ...users.map(
        (user) => `${user.name || ""},${user.email || ""},${user.phone || ""},"${user.profile?.location?.fullAddress || ""}"`
      ).join("\n"),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "customers_export.csv";
    a.click();
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

  const filteredAndSortedUsers = [...users]
    .filter(
      (user) =>
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort(getComparator(order, orderBy));

  return (
    <Box sx={{ p: 4, maxWidth: "1600px", mx: "auto", bgcolor: "#f4f6f8", minHeight: "100vh" }}>
      <Typography variant="h3" sx={{ mb: 2, fontWeight: "bold", color: "#1a3c34", textAlign: "center" }}>
        Customer Management
      </Typography>

      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Button variant="contained" startIcon={<ArrowBack />} onClick={() => navigate("/admin")}>
            Back to Dashboard
        </Button>
        <TextField label="Search by Name or Email" variant="outlined" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} sx={{ width: "300px" }}/>
        <Box>
            <Button variant="contained" startIcon={<Add />} onClick={handleAddCustomer} sx={{mr: 2}}>
                Add Customer
            </Button>
            <Button variant="outlined" onClick={exportCustomers}>
                Export Customers
            </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}><CircularProgress /></Box>
      ) : (
        <>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6}>
              <Paper sx={{ p: 3, textAlign: "center", borderRadius: 3, boxShadow: 3 }}>
                <Typography variant="h6" sx={{ color: "#2c5282", fontWeight: "medium" }}>Total Customers</Typography>
                <Typography variant="h4" sx={{ color: "#1a3c34", fontWeight: "bold" }}>{users.length}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Paper sx={{ p: 3, textAlign: "center", borderRadius: 3, boxShadow: 3 }}>
                <Typography variant="h6" sx={{ color: "#2c5282", fontWeight: "medium" }}>Pending Appointments</Typography>
                <Typography variant="h4" sx={{ color: "#1a3c34", fontWeight: "bold" }}>
                  {appointments.filter((app) => app.status === "pending").length}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 3 }}>
            <Table aria-label="customer table">
              <TableHead>
                <TableRow>
                  <TableCell><TableSortLabel active={orderBy === 'name'} direction={orderBy === 'name' ? order : 'asc'} onClick={() => handleSort('name')}>Customer</TableSortLabel></TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Feedback</TableCell>
                  <TableCell>Booked Services</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAndSortedUsers.map((user) => (
                  <TableRow key={user._id} sx={{ "&:hover": { backgroundColor: "#f0f4f8" } }}>
                    <TableCell>
                        <Box sx={{display: 'flex', alignItems: 'center'}}>
                            <Avatar src={user.profile?.image ? `${API_URL}${user.profile.image}` : ''} sx={{mr: 2}}>{user.name.charAt(0)}</Avatar>
                            <Typography variant="body1" fontWeight="medium">{user.name}</Typography>
                        </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{user.email}</Typography>
                      <Typography variant="body2" color="text.secondary">{user.phone}</Typography>
                    </TableCell>
                    <TableCell>{user.profile?.location?.fullAddress || "Not set"}</TableCell>
                    <TableCell>{(user.profile?.feedback || []).length} items</TableCell>
                    <TableCell>{(user.profile?.bookedServices || []).length} services</TableCell>
                    <TableCell align="right">
                      <IconButton color="primary" onClick={() => handleEdit(user)}><Edit /></IconButton>
                      <IconButton color="error" onClick={() => handleDelete(user._id)}><Delete /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      <Dialog open={editDialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editedUser?._id ? "Edit Customer" : "Add New Customer"}</DialogTitle>
        <DialogContent>
          <TextField margin="dense" label="Name" fullWidth value={editedUser?.name || ""} onChange={(e) => setEditedUser({ ...editedUser, name: e.target.value })} variant="standard" />
          <TextField margin="dense" label="Email" fullWidth value={editedUser?.email || ""} onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })} variant="standard" />
          {!editedUser?._id && <TextField margin="dense" label="Password" type="password" required fullWidth onChange={(e) => setEditedUser({ ...editedUser, password: e.target.value })} variant="standard" />}
          <TextField margin="dense" label="Phone" fullWidth value={editedUser?.phone || ""} onChange={(e) => setEditedUser({ ...editedUser, phone: e.target.value })} variant="standard" />
          <TextField margin="dense" label="Location (Full Address)" fullWidth value={editedUser?.profile?.location?.fullAddress || ""} 
            onChange={(e) => setEditedUser({ ...editedUser, profile: { ...editedUser.profile, location: { ...editedUser.profile?.location, fullAddress: e.target.value } } })} variant="standard" 
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} startIcon={<Close />}>Cancel</Button>
          <Button onClick={handleSave} startIcon={<Save />} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} color="inherit" /> : "Save"}
          </Button>
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

export default CustomerManagement;
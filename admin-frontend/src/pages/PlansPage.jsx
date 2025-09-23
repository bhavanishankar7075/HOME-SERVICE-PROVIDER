import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  Box, Typography, Button, Container, Paper, Grid, CircularProgress, Alert,
  Dialog, DialogActions, DialogContent, DialogTitle, TextField, Snackbar,
  List, ListItem, ListItemIcon, ListItemText, Card, CardHeader, CardContent, CardActions, Divider,
  IconButton, DialogContentText, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,Chip
} from '@mui/material';
import { Add as AddIcon, CheckCircle as CheckCircleIcon, Edit as EditIcon, Delete as DeleteIcon, ArrowBack } from '@mui/icons-material';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function PlansPage() {
  const { token } = useSelector((state) => state.auth);

  const [plans, setPlans] = useState([]);
  const [providers, setProviders] = useState([]); // New state for provider subscriptions
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [modalMode, setModalMode] = useState('create');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState(null);
  const [confirmCancelSubscriptionOpen, setConfirmCancelSubscriptionOpen] = useState(false); // New state for subscription cancellation
  const [providerToCancel, setProviderToCancel] = useState(null); // New state for provider to cancel

  const [planData, setPlanData] = useState({
    name: '',
    price: '',
    features: '',
    bookingLimit: '',
  });

  const fetchPlansAndProviders = useCallback(async () => {
    if (!token) {
      setError('No authentication token found');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      // Fetch plans
      const { data: plansData } = await axios.get(`${API_URL}/api/plans`, config);
      setPlans(Array.isArray(plansData) ? plansData : []);
      // Fetch provider subscriptions
      const { data: providersData } = await axios.get(`${API_URL}/api/admin/providers/subscriptions`, config);
      setProviders(Array.isArray(providersData) ? providersData : []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch plans or provider subscriptions.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPlansAndProviders();
  }, [fetchPlansAndProviders]);

  const handleOpenModal = (mode = 'create', plan = null) => {
    setModalMode(mode);
    if (mode === 'edit' && plan) {
      setSelectedPlan(plan);
      setPlanData({
        name: plan.name,
        price: plan.price.toString(),
        features: plan.features.join(', '),
        bookingLimit: plan.bookingLimit?.toString() || '0',
      });
    } else {
      setSelectedPlan(null);
      setPlanData({ name: '', price: '', features: '', bookingLimit: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setPlanData({ name: '', price: '', features: '', bookingLimit: '' });
    setSelectedPlan(null);
    setModalMode('create');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPlanData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateOrUpdatePlan = async () => {
    if (!planData.name || !planData.price || !planData.features || !planData.bookingLimit) {
      setSnackbar({ open: true, message: 'Please fill all fields, including booking limit.', severity: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const featuresArray = planData.features.split(',').map(feature => feature.trim()).filter(f => f);
      
      const payload = {
        name: planData.name,
        price: Number(planData.price),
        features: featuresArray,
        bookingLimit: Number(planData.bookingLimit),
      };

      if (modalMode === 'create') {
        await axios.post(`${API_URL}/api/plans`, payload, config);
        setSnackbar({ open: true, message: 'Plan created successfully!', severity: 'success' });
      } else {
        await axios.put(`${API_URL}/api/plans/${selectedPlan._id}`, payload, config);
        setSnackbar({ open: true, message: 'Plan updated successfully!', severity: 'success' });
      }

      handleCloseModal();
      fetchPlansAndProviders();
    } catch (err) {
      const errorMessage = err.response?.data?.message || `Failed to ${modalMode === 'create' ? 'create' : 'update'} plan.`;
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDeleteConfirm = (plan) => {
    setPlanToDelete(plan);
    setConfirmDeleteOpen(true);
  };

  const handleCloseDeleteConfirm = () => {
    setConfirmDeleteOpen(false);
    setPlanToDelete(null);
  };

  const handleDeletePlan = async () => {
    if (!planToDelete) return;
    setIsSubmitting(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`${API_URL}/api/plans/${planToDelete._id}`, config);
      setSnackbar({ open: true, message: 'Plan deleted successfully!', severity: 'success' });
      handleCloseDeleteConfirm();
      fetchPlansAndProviders();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to delete plan.';
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCancelSubscriptionConfirm = (provider) => {
    setProviderToCancel(provider);
    setConfirmCancelSubscriptionOpen(true);
  };

  const handleCloseCancelSubscriptionConfirm = () => {
    setConfirmCancelSubscriptionOpen(false);
    setProviderToCancel(null);
  };

  const handleCancelProviderSubscription = async () => {
    if (!providerToCancel) return;
    setIsSubmitting(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${API_URL}/api/admin/providers/${providerToCancel._id}/cancel-subscription`, {}, config);
      setSnackbar({ open: true, message: `Subscription for ${providerToCancel.name} canceled successfully!`, severity: 'success' });
      handleCloseCancelSubscriptionConfirm();
      fetchPlansAndProviders();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to cancel provider subscription.';
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <Container sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          component={Link}
          to="/admin/dashboard"
        >
          Back to Dashboard
        </Button>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>Manage Subscription Plans</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenModal('create')}>
          Create New Plan
        </Button>
      </Box>

      {loading ? (
        <CircularProgress sx={{ display: 'block', mx: 'auto' }} />
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <>
          {/* Plans Section */}
          <Typography variant="h5" sx={{ mb: 2 }}>Subscription Plans</Typography>
          {plans.length === 0 ? (
            <Alert severity="info">No plans available. Create a new plan to get started.</Alert>
          ) : (
            <Grid container spacing={3}>
              {plans.map((plan) => (
                <Grid item xs={12} md={6} lg={4} key={plan._id}>
                  <Card elevation={3} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <CardHeader
                      title={plan.name}
                      subheader={`₹${plan.price} / month`}
                      sx={{ bgcolor: 'primary.main', color: 'white' }}
                      titleTypographyProps={{ variant: 'h5' }}
                    />
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Monthly Booking Limit: {plan.bookingLimit === 0 ? 'Unlimited' : plan.bookingLimit}
                      </Typography>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle1" sx={{ mb: 2 }}>Features:</Typography>
                      <List dense>
                        {plan.features.map((feature, index) => (
                          <ListItem key={index}>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <CheckCircleIcon color="success" fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary={feature} />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                    <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
                      <IconButton color="primary" onClick={() => handleOpenModal('edit', plan)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton color="error" onClick={() => handleOpenDeleteConfirm(plan)}>
                        <DeleteIcon />
                      </IconButton>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {/* Provider Subscriptions Section */}
          <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>Provider Subscriptions</Typography>
          {providers.length === 0 ? (
            <Alert severity="info">No providers found.</Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Subscription Tier</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Bookings (Current/Limit)</TableCell>
                    <TableCell>Expiry Warning</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {providers.map((provider) => (
                    <TableRow key={provider._id}>
                      <TableCell>{provider.name}</TableCell>
                      <TableCell>{provider.email}</TableCell>
                      <TableCell>{provider.subscriptionTier || 'Free'}</TableCell>
                      <TableCell>
                        <Chip
                          label={provider.subscriptionStatus || 'Inactive'}
                          color={provider.subscriptionStatus === 'past_due' ? 'error' : provider.subscriptionStatus === 'active' ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{provider.currentBookingCount || 0} / {provider.bookingLimit === 0 ? 'Unlimited' : provider.bookingLimit}</TableCell>
                      <TableCell>{provider.subscriptionStatusMessage || 'N/A'}</TableCell>
                      <TableCell>
                        {provider.subscriptionTier !== 'free' && ( 
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            onClick={() => handleOpenCancelSubscriptionConfirm(provider)}
                          >
                            Cancel Subscription
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      <Dialog open={isModalOpen} onClose={handleCloseModal}>
        <DialogTitle>{modalMode === 'create' ? 'Create New Plan' : 'Edit Plan'}</DialogTitle>
        <DialogContent>
          <TextField autoFocus margin="dense" name="name" label="Plan Name (Pro or Elite)" type="text" fullWidth variant="outlined" value={planData.name} onChange={handleInputChange} />
          <TextField margin="dense" name="price" label="Price (e.g., 499)" type="number" fullWidth variant="outlined" value={planData.price} onChange={handleInputChange} />
          <TextField
            margin="dense"
            name="bookingLimit"
            label="Monthly Booking Limit"
            type="number"
            fullWidth
            variant="outlined"
            value={planData.bookingLimit}
            onChange={handleInputChange}
            helperText="Enter 0 for unlimited bookings."
          />
          <TextField margin="dense" name="features" label="Features (comma-separated)" type="text" fullWidth variant="outlined" multiline rows={3} value={planData.features} onChange={handleInputChange} helperText="Example: Unlimited Bookings, Reduced Commission" />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleCreateOrUpdatePlan} variant="contained" disabled={isSubmitting}>
            {isSubmitting ? <CircularProgress size={24} /> : modalMode === 'create' ? 'Create' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmDeleteOpen} onClose={handleCloseDeleteConfirm}>
        <DialogTitle>Confirm Plan Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the plan "{planToDelete?.name}"? This action cannot be undone.
            {planToDelete && <Typography variant="body2" color="error" sx={{ mt: 1 }}>Note: Ensure no users are subscribed to this plan.</Typography>}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteConfirm} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleDeletePlan} variant="contained" color="error" disabled={isSubmitting}>
            {isSubmitting ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmCancelSubscriptionOpen} onClose={handleCloseCancelSubscriptionConfirm}>
        <DialogTitle>Confirm Subscription Cancellation</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to cancel the subscription for "{providerToCancel?.name}"? This will downgrade them to the Free plan.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCancelSubscriptionConfirm} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleCancelProviderSubscription} variant="contained" color="error" disabled={isSubmitting}>
            {isSubmitting ? <CircularProgress size={24} /> : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity || 'info'} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default PlansPage;






































































































//main
/*import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  Box, Typography, Button, Container, Paper, Grid, CircularProgress, Alert,
  Dialog, DialogActions, DialogContent, DialogTitle, TextField, Snackbar,
  List, ListItem, ListItemIcon, ListItemText, Card, CardHeader, CardContent, CardActions,Divider,
  IconButton, DialogContentText
} from '@mui/material';
import { Add as AddIcon, CheckCircle as CheckCircleIcon, Edit as EditIcon, Delete as DeleteIcon, ArrowBack } from '@mui/icons-material';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function PlansPage() {
  const { token } = useSelector((state) => state.auth);

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [modalMode, setModalMode] = useState('create');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState(null);

  const [planData, setPlanData] = useState({
    name: '',
    price: '',
    features: '',
    bookingLimit: '', // <-- NEW field in state
  });

  const fetchPlans = useCallback(async () => {
    if (!token) {
      setError('No authentication token found');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = await axios.get(`${API_URL}/api/plans`, config);
      setPlans(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch plans.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleOpenModal = (mode = 'create', plan = null) => {
    setModalMode(mode);
    if (mode === 'edit' && plan) {
      setSelectedPlan(plan);
      setPlanData({
        name: plan.name,
        price: plan.price.toString(),
        features: plan.features.join(', '),
        bookingLimit: plan.bookingLimit?.toString() || '0', // <-- NEW: Populate booking limit
      });
    } else {
      setSelectedPlan(null);
      setPlanData({ name: '', price: '', features: '', bookingLimit: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setPlanData({ name: '', price: '', features: '', bookingLimit: '' });
    setSelectedPlan(null);
    setModalMode('create');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPlanData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateOrUpdatePlan = async () => {
    if (!planData.name || !planData.price || !planData.features || !planData.bookingLimit) {
      setSnackbar({ open: true, message: 'Please fill all fields, including booking limit.', severity: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const featuresArray = planData.features.split(',').map(feature => feature.trim()).filter(f => f);
      
      const payload = {
        name: planData.name,
        price: Number(planData.price),
        features: featuresArray,
        bookingLimit: Number(planData.bookingLimit), // <-- NEW: Include booking limit in payload
      };

      if (modalMode === 'create') {
        await axios.post(`${API_URL}/api/plans`, payload, config);
        setSnackbar({ open: true, message: 'Plan created successfully!', severity: 'success' });
      } else {
        await axios.put(`${API_URL}/api/plans/${selectedPlan._id}`, payload, config);
        setSnackbar({ open: true, message: 'Plan updated successfully!', severity: 'success' });
      }

      handleCloseModal();
      fetchPlans();
    } catch (err) {
      const errorMessage = err.response?.data?.message || `Failed to ${modalMode === 'create' ? 'create' : 'update'} plan.`;
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDeleteConfirm = (plan) => {
    setPlanToDelete(plan);
    setConfirmDeleteOpen(true);
  };

  const handleCloseDeleteConfirm = () => {
    setConfirmDeleteOpen(false);
    setPlanToDelete(null);
  };

  const handleDeletePlan = async () => {
    if (!planToDelete) return;
    setIsSubmitting(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`${API_URL}/api/plans/${planToDelete._id}`, config);
      setSnackbar({ open: true, message: 'Plan deleted successfully!', severity: 'success' });
      handleCloseDeleteConfirm();
      fetchPlans();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to delete plan.';
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <Container sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          component={Link}
          to="/admin/dashboard"
        >
          Back to Dashboard
        </Button>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>Manage Subscription Plans</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenModal('create')}>
          Create New Plan
        </Button>
      </Box>

      {loading ? (
        <CircularProgress sx={{ display: 'block', mx: 'auto' }} />
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : plans.length === 0 ? (
        <Alert severity="info">No plans available. Create a new plan to get started.</Alert>
      ) : (
        <Grid container spacing={3}>
          {plans.map((plan) => (
            <Grid item xs={12} md={6} lg={4} key={plan._id}>
              <Card elevation={3} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <CardHeader
                  title={plan.name}
                  subheader={`₹${plan.price} / month`}
                  sx={{ bgcolor: 'primary.main', color: 'white' }}
                  titleTypographyProps={{ variant: 'h5' }}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Monthly Booking Limit: {plan.bookingLimit === 0 ? 'Unlimited' : plan.bookingLimit}
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" sx={{ mb: 2 }}>Features:</Typography>
                  <List dense>
                    {plan.features.map((feature, index) => (
                      <ListItem key={index}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <CheckCircleIcon color="success" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={feature} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
                  <IconButton color="primary" onClick={() => handleOpenModal('edit', plan)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton color="error" onClick={() => handleOpenDeleteConfirm(plan)}>
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={isModalOpen} onClose={handleCloseModal}>
        <DialogTitle>{modalMode === 'create' ? 'Create New Plan' : 'Edit Plan'}</DialogTitle>
        <DialogContent>
          <TextField autoFocus margin="dense" name="name" label="Plan Name (Pro or Elite)" type="text" fullWidth variant="outlined" value={planData.name} onChange={handleInputChange} />
          <TextField margin="dense" name="price" label="Price (e.g., 499)" type="number" fullWidth variant="outlined" value={planData.price} onChange={handleInputChange}/>
          
          <TextField
            margin="dense"
            name="bookingLimit"
            label="Monthly Booking Limit"
            type="number"
            fullWidth
            variant="outlined"
            value={planData.bookingLimit}
            onChange={handleInputChange}
            helperText="Enter 0 for unlimited bookings."
          />

          <TextField margin="dense" name="features" label="Features (comma-separated)" type="text" fullWidth variant="outlined" multiline rows={3} value={planData.features} onChange={handleInputChange} helperText="Example: Unlimited Bookings, Reduced Commission"/>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleCreateOrUpdatePlan} variant="contained" disabled={isSubmitting}>
            {isSubmitting ? <CircularProgress size={24} /> : modalMode === 'create' ? 'Create' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmDeleteOpen} onClose={handleCloseDeleteConfirm}>
        <DialogTitle>Confirm Plan Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the plan "{planToDelete?.name}"? This action cannot be undone.
            {planToDelete && <Typography variant="body2" color="error" sx={{ mt: 1 }}>Note: Ensure no users are subscribed to this plan.</Typography>}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteConfirm} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleDeletePlan} variant="contained" color="error" disabled={isSubmitting}>
            {isSubmitting ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity || 'info'} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default PlansPage;*/























































































//main
/* 
import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom'; // Added for navigation
import axios from 'axios';
import {
  Box, Typography, Button, Container, Paper, Grid, CircularProgress, Alert,
  Dialog, DialogActions, DialogContent, DialogTitle, TextField, Snackbar,
  List, ListItem, ListItemIcon, ListItemText, Card, CardHeader, CardContent, CardActions,
  IconButton, DialogContentText
} from '@mui/material';
import { Add as AddIcon, CheckCircle as CheckCircleIcon, Edit as EditIcon, Delete as DeleteIcon, ArrowBack } from '@mui/icons-material';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function PlansPage() {
  const { token } = useSelector((state) => state.auth);

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [modalMode, setModalMode] = useState('create');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState(null);

  const [planData, setPlanData] = useState({
    name: '',
    price: '',
    features: '',
  });

  const fetchPlans = useCallback(async () => {
    if (!token) {
      setError('No authentication token found');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = await axios.get(`${API_URL}/api/plans`, config);
      setPlans(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch plans.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleOpenModal = (mode = 'create', plan = null) => {
    setModalMode(mode);
    if (mode === 'edit' && plan) {
      setSelectedPlan(plan);
      setPlanData({
        name: plan.name,
        price: plan.price.toString(),
        features: plan.features.join(', '),
      });
    } else {
      setSelectedPlan(null);
      setPlanData({ name: '', price: '', features: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setPlanData({ name: '', price: '', features: '' });
    setSelectedPlan(null);
    setModalMode('create');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPlanData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateOrUpdatePlan = async () => {
    if (!planData.name || !planData.price || !planData.features) {
      setSnackbar({ open: true, message: 'Please fill all fields.', severity: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const featuresArray = planData.features.split(',').map(feature => feature.trim()).filter(f => f);
      
      const payload = {
        name: planData.name,
        price: Number(planData.price),
        features: featuresArray,
      };

      if (modalMode === 'create') {
        await axios.post(`${API_URL}/api/plans`, payload, config);
        setSnackbar({ open: true, message: 'Plan created successfully!', severity: 'success' });
      } else {
        await axios.put(`${API_URL}/api/plans/${selectedPlan._id}`, payload, config);
        setSnackbar({ open: true, message: 'Plan updated successfully!', severity: 'success' });
      }

      handleCloseModal();
      fetchPlans();
    } catch (err) {
      const errorMessage = err.response?.data?.message || `Failed to ${modalMode === 'create' ? 'create' : 'update'} plan.`;
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
      console.error(`[${modalMode}Plan] Error:`, err.response?.data || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDeleteConfirm = (plan) => {
    setPlanToDelete(plan);
    setConfirmDeleteOpen(true);
  };

  const handleCloseDeleteConfirm = () => {
    setConfirmDeleteOpen(false);
    setPlanToDelete(null);
  };

  const handleDeletePlan = async () => {
    if (!planToDelete) return;
    setIsSubmitting(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`${API_URL}/api/plans/${planToDelete._id}`, config);
      setSnackbar({ open: true, message: 'Plan deleted successfully!', severity: 'success' });
      handleCloseDeleteConfirm();
      fetchPlans();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to delete plan.';
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
      console.error('[deletePlan] Error:', err.response?.data || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <Container sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, gap: 2 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          component={Link}
          to="/admin/dashboard"
        >
          Back to Dashboard
        </Button>
        <Typography variant="h4" component="h1">Manage Subscription Plans</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenModal('create')}>
          Create New Plan
        </Button>
      </Box>

      {loading ? (
        <CircularProgress sx={{ display: 'block', mx: 'auto' }} />
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : plans.length === 0 ? (
        <Alert severity="info">No plans available. Create a new plan to get started.</Alert>
      ) : (
        <Grid container spacing={3}>
          {plans.map((plan) => (
            <Grid item xs={12} md={6} lg={4} key={plan._id}>
              <Card elevation={3}>
                <CardHeader
                  title={plan.name}
                  subheader={`₹${plan.price} / month`}
                  sx={{ bgcolor: 'primary.main', color: 'white' }}
                  titleTypographyProps={{ variant: 'h5' }}
                />
                <CardContent>
                  <Typography variant="subtitle1" sx={{ mb: 2 }}>Features:</Typography>
                  <List dense>
                    {plan.features.map((feature, index) => (
                      <ListItem key={index}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <CheckCircleIcon color="success" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={feature} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
                  <IconButton color="primary" onClick={() => handleOpenModal('edit', plan)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton color="error" onClick={() => handleOpenDeleteConfirm(plan)}>
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={isModalOpen} onClose={handleCloseModal}>
        <DialogTitle>{modalMode === 'create' ? 'Create a New Subscription Plan' : 'Edit Subscription Plan'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Plan Name (Pro or Elite)"
            type="text"
            fullWidth
            variant="outlined"
            value={planData.name}
            onChange={handleInputChange}
            helperText="Must be 'Pro' or 'Elite'"
          />
          <TextField
            margin="dense"
            name="price"
            label="Price (e.g., 499)"
            type="number"
            fullWidth
            variant="outlined"
            value={planData.price}
            onChange={handleInputChange}
            helperText="Enter price in INR"
          />
          <TextField
            margin="dense"
            name="features"
            label="Features (comma-separated)"
            type="text"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={planData.features}
            onChange={handleInputChange}
            helperText="Example: Unlimited Bookings, Reduced Commission, Pro Badge"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleCreateOrUpdatePlan} variant="contained" disabled={isSubmitting}>
            {isSubmitting ? <CircularProgress size={24} /> : modalMode === 'create' ? 'Create' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmDeleteOpen} onClose={handleCloseDeleteConfirm}>
        <DialogTitle>Confirm Plan Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the plan "{planToDelete?.name}"? This action cannot be undone.
            {planToDelete && <Typography variant="body2" color="error" sx={{ mt: 1 }}>Note: Ensure no users are subscribed to this plan.</Typography>}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteConfirm} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleDeletePlan} variant="contained" color="error" disabled={isSubmitting}>
            {isSubmitting ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default PlansPage; */











































































































/* import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {
  Box, Typography, Button, Container, Paper, Grid, CircularProgress, Alert,
  Dialog, DialogActions, DialogContent, DialogTitle, TextField, Snackbar,
  List, ListItem, ListItemIcon, ListItemText, Card, CardHeader, CardContent
} from '@mui/material';
import { Add as AddIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function PlansPage() {
  const { token } = useSelector((state) => state.auth); 
  
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const [newPlanData, setNewPlanData] = useState({
    name: '',
    price: '',
    features: '' 
  });

  const fetchPlans = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = await axios.get(`${API_URL}/api/plans`, config);
      setPlans(data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch plans.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleOpenModal = () => setIsModalOpen(true);
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setNewPlanData({ name: '', price: '', features: '' });
  };

  // --- FIX IS HERE: This function now correctly builds the payload ---
  const handleCreatePlan = async () => {
    if (!newPlanData.name || !newPlanData.price || !newPlanData.features) {
      setSnackbar({ open: true, message: 'Please fill all fields.', severity: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      // Correctly split the comma-separated features string into an array
      const featuresArray = newPlanData.features.split(',').map(feature => feature.trim());

      const payload = {
        name: newPlanData.name,
        price: Number(newPlanData.price),
        features: featuresArray
      };
      
      await axios.post(`${API_URL}/api/plans`, payload, config);
      
      setSnackbar({ open: true, message: 'Plan created successfully!', severity: 'success' });
      handleCloseModal();
      fetchPlans(); // Refresh the list of plans
    } catch (err) {
      // Show the specific error from the backend if available
      setSnackbar({ open: true, message: err.response?.data?.message || 'Failed to create plan.', severity: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewPlanData(prev => ({ ...prev, [name]: value }));
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <Container sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">Manage Subscription Plans</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenModal}>
          Create New Plan
        </Button>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <Grid container spacing={3}>
          {plans.map((plan) => (
            <Grid item xs={12} md={6} lg={4} key={plan._id}>
              <Card elevation={3}>
                <CardHeader
                  title={plan.name}
                  subheader={`₹${plan.price} / month`}
                  sx={{ bgcolor: 'primary.main', color: 'white' }}
                  titleTypographyProps={{ variant: 'h5' }}
                />
                <CardContent>
                  <Typography variant="subtitle1" sx={{ mb: 2 }}>Features:</Typography>
                  <List dense>
                    {plan.features.map((feature, index) => (
                      <ListItem key={index}>
                        <ListItemIcon sx={{ minWidth: 32 }}><CheckCircleIcon color="success" fontSize="small"/></ListItemIcon>
                        <ListItemText primary={feature} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={isModalOpen} onClose={handleCloseModal}>
        <DialogTitle>Create a New Subscription Plan</DialogTitle>
        <DialogContent>
          <TextField autoFocus margin="dense" name="name" label="Plan Name (e.g., Pro)" type="text" fullWidth variant="outlined" value={newPlanData.name} onChange={handleInputChange}/>
          <TextField margin="dense" name="price" label="Price (e.g., 499)" type="number" fullWidth variant="outlined" value={newPlanData.price} onChange={handleInputChange}/>
          <TextField margin="dense" name="features" label="Features (comma-separated)" type="text" fullWidth variant="outlined" multiline rows={3} value={newPlanData.features} onChange={handleInputChange} helperText="Example: Unlimited Bookings, Reduced Commission, Pro Badge"/>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Cancel</Button>
          <Button onClick={handleCreatePlan} variant="contained" disabled={isSubmitting}>
            {isSubmitting ? <CircularProgress size={24} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default PlansPage; */
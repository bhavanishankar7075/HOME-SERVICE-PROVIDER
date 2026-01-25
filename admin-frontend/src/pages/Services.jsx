import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Grid,
  IconButton,
  Card,
  CardContent,
  CardActions,
  Snackbar,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Alert,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import { Edit, Delete, Clear, Add, Remove } from "@mui/icons-material";
import axios from "axios";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Pagination from "@mui/material/Pagination";
import io from "socket.io-client";
import "../styles/Services.css";
import AdminLoadingScreen from "../Components/AdminLoadingScreen";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const Services = () => {
  const [services, setServices] = useState([]);
  const [newService, setNewService] = useState({
    name: "",
    description: "",
    price: "",
    category: "Home Maintenance",
    image: null,
    imageUrl: null,
    additionalImages: [],
    offer: "",
    deal: "",
  });
  const [editingService, setEditingService] = useState(null);
  const [message, setMessage] = useState({
    open: false,
    text: "",
    severity: "success",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [priceRange, setPriceRange] = useState([0, 100000]);
  const [offerFilter, setOfferFilter] = useState("");
  const [dealFilter, setDealFilter] = useState("");
  const [sortFilter, setSortFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selectedServices, setSelectedServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    id: null,
    isBulk: false,
  });
  const servicesPerPage = 5;
  const { token } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const additionalImagesInputRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    fetchServices();
    socketRef.current = io(API_URL, {
      withCredentials: true,
      extraHeaders: {
        Authorization: `Bearer ${token || localStorage.getItem("token")}`,
      },
    });

    const handleConnectError = (error) => {
      console.error("Socket connection error:", error);
      setMessage({
        open: true,
        text: "Real-time updates unavailable. Refreshing data...",
        severity: "warning",
      });
      fetchServices();
    };

    const handleServiceAdded = (addedService) => {
      setServices((prev) => [addedService, ...prev]);
      setMessage({
        open: true,
        text: `A new service was added: ${addedService.name}`,
        severity: "info",
      });
    };
    const handleServiceUpdated = (updatedService) => {
      setServices((prevServices) =>
        prevServices.map((service) =>
          service._id === updatedService._id ? updatedService : service,
        ),
      );
    };
    const handleServiceDeleted = ({ _id }) => {
      setServices((prevServices) =>
        prevServices.filter((service) => service._id !== _id),
      );
    };
    const handleServicesBulkDeleted = ({ serviceIds }) => {
      setServices((prevServices) =>
        prevServices.filter((service) => !serviceIds.includes(service._id)),
      );
      setSelectedServices([]);
    };

    socketRef.current.on("connect_error", handleConnectError);
    socketRef.current.on("serviceAdded", handleServiceAdded);
    socketRef.current.on("serviceUpdated", handleServiceUpdated);
    socketRef.current.on("serviceDeleted", handleServiceDeleted);
    socketRef.current.on("servicesBulkDeleted", handleServicesBulkDeleted);

    return () => {
      if (socketRef.current) {
        socketRef.current.off("connect_error", handleConnectError);
        socketRef.current.off("serviceAdded", handleServiceAdded);
        socketRef.current.off("serviceUpdated", handleServiceUpdated);
        socketRef.current.off("serviceDeleted", handleServiceDeleted);
        socketRef.current.off("servicesBulkDeleted", handleServicesBulkDeleted);
        socketRef.current.disconnect();
      }
    };
  }, [token]);

  useEffect(() => {
    fetchServices();
  }, [
    page,
    searchTerm,
    categoryFilter,
    priceRange,
    offerFilter,
    dealFilter,
    sortFilter,
  ]);

  const validateService = (service) => {
    if (!service.name) return "Name is required";
    if (!service.description) return "Description is required";
    if (!service.price || isNaN(service.price) || service.price <= 0)
      return "Price must be a positive number";
    if (!service.category) return "Category is required";
    return null;
  };

  const fetchServices = async () => {
    setLoading(true);
    try {
      const authToken = token || localStorage.getItem("token");
      if (!authToken) {
        setMessage({
          open: true,
          text: "No authentication token found. Please log in.",
          severity: "error",
        });
        return;
      }
      const response = await axios.get(`${API_URL}/api/services`, {
        headers: { Authorization: `Bearer ${authToken}` },
        params: {
          name: searchTerm,
          category: categoryFilter,
          price_gte: priceRange[0],
          price_lte: priceRange[1],
          offer: offerFilter,
          deal: dealFilter,
          sort: sortFilter,
        },
      });
      setServices(response.data);
    } catch (error) {
      console.error(
        "Fetch services error:",
        error.response?.data || error.message,
      );
      setMessage({
        open: true,
        text: error.response?.data?.msg || "Error fetching services.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddService = async () => {
    const error = validateService(newService);
    if (error) {
      setMessage({ open: true, text: error, severity: "error" });
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", newService.name);
      formData.append("description", newService.description);
      formData.append("price", newService.price);
      formData.append("category", newService.category);
      formData.append("offer", newService.offer);
      formData.append("deal", newService.deal);
      if (newService.image) {
        formData.append("image", newService.image);
      }
      newService.additionalImages.forEach((img) => {
        if (img.file) formData.append("additionalImages", img.file);
      });
      await axios.post(`${API_URL}/api/services`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      setNewService({
        name: "",
        description: "",
        price: "",
        category: "Home Maintenance",
        image: null,
        imageUrl: null,
        additionalImages: [],
        offer: "",
        deal: "",
      });
      setMessage({
        open: true,
        text: "Service added successfully!",
        severity: "success",
      });
      if (fileInputRef.current) fileInputRef.current.value = null;
      if (additionalImagesInputRef.current)
        additionalImagesInputRef.current.value = null;
    } catch (error) {
      console.error(
        "Error adding service:",
        error.response?.data || error.message,
      );
      setMessage({
        open: true,
        text: error.response?.data?.msg || "Error adding service.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditService = async (id) => {
    const error = validateService(editingService);
    if (error) {
      setMessage({ open: true, text: error, severity: "error" });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", editingService.name);
      formData.append("description", editingService.description);
      formData.append("price", editingService.price);
      formData.append("category", editingService.category);
      formData.append("offer", editingService.offer);
      formData.append("deal", editingService.deal);
      if (editingService.image instanceof File) {
        formData.append("image", editingService.image);
      } else if (editingService.imageUrl === null) {
        formData.append("image", "");
      }
      const retainedImageUrls = editingService.additionalImages
        .filter((img) => img.url && !img.file)
        .map((img) => img.url)
        .filter((url) => url);
      if (retainedImageUrls.length > 0) {
        formData.append("retainedImageUrls", JSON.stringify(retainedImageUrls));
      }
      editingService.additionalImages.forEach((img) => {
        if (img.file) formData.append("additionalImages", img.file);
      });
      const availableSlotsObj = Object.fromEntries(
        editingService.availableSlots.entries
          ? editingService.availableSlots.entries()
          : Object.entries(editingService.availableSlots),
      );
      formData.append("availableSlots", JSON.stringify(availableSlotsObj));

      // Backend will emit 'serviceUpdated'
      await axios.put(`${API_URL}/api/services/${id}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      setEditingService(null);
      setMessage({
        open: true,
        text: "Service updated successfully!",
        severity: "success",
      });
    } catch (error) {
      console.error(
        "Error editing service:",
        error.response?.data || error.message,
      );
      setMessage({
        open: true,
        text: error.response?.data?.msg || "Error updating service.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteService = (id) => {
    setDeleteDialog({ open: true, id, isBulk: false });
  };

  const confirmDeleteService = async () => {
    setLoading(true);
    try {
      // Backend will emit 'serviceDeleted'
      await axios.delete(`${API_URL}/api/services/${deleteDialog.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage({
        open: true,
        text: "Service deleted successfully!",
        severity: "success",
      });
    } catch (error) {
      console.error(
        "Error deleting service:",
        error.response?.data || error.message,
      );
      setMessage({
        open: true,
        text: error.response?.data?.msg || "Error deleting service.",
        severity: "error",
      });
    } finally {
      setDeleteDialog({ open: false, id: null, isBulk: false });
      setLoading(false);
    }
  };

  const handleBulkDelete = () => {
    if (selectedServices.length === 0) {
      setMessage({
        open: true,
        text: "No services selected for deletion.",
        severity: "warning",
      });
      return;
    }
    setDeleteDialog({ open: true, id: null, isBulk: true });
  };

  const confirmBulkDelete = async () => {
    setLoading(true);
    try {
      // Backend will emit 'servicesBulkDeleted'
      await axios.post(
        `${API_URL}/api/services/bulk-delete`,
        { serviceIds: selectedServices },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setMessage({
        open: true,
        text: "Services deleted successfully!",
        severity: "success",
      });
    } catch (error) {
      console.error(
        "Error bulk deleting services:",
        error.response?.data || error.message,
      );
      setMessage({
        open: true,
        text: error.response?.data?.msg || "Error deleting services.",
        severity: "error",
      });
    } finally {
      setDeleteDialog({ open: false, id: null, isBulk: false });
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewService({
        ...newService,
        image: file,
        imageUrl: URL.createObjectURL(file),
      });
    }
  };

  const handleAdditionalImageChange = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setNewService((prev) => ({
      ...prev,
      additionalImages: [...prev.additionalImages, ...newImages],
    }));
  };

  const handleEditImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEditingService((prev) => ({
        ...prev,
        image: file,
        imageUrl: URL.createObjectURL(file),
      }));
    }
  };

  const handleEditAdditionalImageChange = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setEditingService((prev) => ({
      ...prev,
      additionalImages: [...prev.additionalImages, ...newImages],
    }));
  };

  const removeImage = (type, index) => {
    if (type === "main") {
      setEditingService((prev) => ({ ...prev, image: null, imageUrl: null }));
    } else if (type === "additional") {
      setEditingService((prev) => ({
        ...prev,
        additionalImages: prev.additionalImages.filter((_, i) => i !== index),
      }));
    }
  };

  const handleSlotUpdate = async (serviceId, date, times) => {
    try {
      await axios.put(
        `${API_URL}/api/admin/services/slots`,
        { serviceId, date, times },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setMessage({
        open: true,
        text: `Slots for ${date} updated successfully!`,
        severity: "success",
      });
    } catch (error) {
      setMessage({
        open: true,
        text: "Failed to update slots.",
        severity: "error",
      });
    }
  };

  const addScheduleSlot = () => {
    const newDate = prompt(
      "Enter a date for the new slots (YYYY-MM-DD):",
      new Date().toISOString().split("T")[0],
    );
    if (
      newDate &&
      /^\d{4}-\d{2}-\d{2}$/.test(newDate) &&
      !editingService.availableSlots.has(newDate)
    ) {
      setEditingService((prev) => {
        const newSlots = new Map(prev.availableSlots);
        newSlots.set(newDate, []);
        return { ...prev, availableSlots: newSlots };
      });
    } else if (newDate) {
      alert("Invalid date format or date already exists.");
    }
  };

  const updateScheduleTime = (date, index, value) => {
    setEditingService((prev) => {
      const newSlots = new Map(prev.availableSlots);
      const slots = newSlots.get(date) || [];
      const updatedSlots = [...slots];
      updatedSlots[index] = value;
      newSlots.set(date, updatedSlots);
      return { ...prev, availableSlots: newSlots };
    });
  };

  const addTimeSlot = (date) => {
    const time = prompt("Add a time slot (HH:MM):", "09:00");
    if (time && /^\d{2}:\d{2}$/.test(time)) {
      setEditingService((prev) => {
        const newSlots = new Map(prev.availableSlots);
        const slots = newSlots.get(date) || [];
        const updatedSlots = [...slots, time].sort();
        newSlots.set(date, updatedSlots);
        handleSlotUpdate(prev._id, date, updatedSlots);
        return { ...prev, availableSlots: newSlots };
      });
    } else if (time) {
      alert("Invalid time format. Please use HH:MM.");
    }
  };

  const removeTimeSlot = (date, index) => {
    setEditingService((prev) => {
      const newSlots = new Map(prev.availableSlots);
      const slots = newSlots.get(date) || [];
      const updatedSlots = slots.filter((_, i) => i !== index);
      if (updatedSlots.length > 0) {
        newSlots.set(date, updatedSlots);
      } else {
        newSlots.delete(date);
      }
      handleSlotUpdate(prev._id, date, updatedSlots);
      return { ...prev, availableSlots: newSlots };
    });
  };

  const filteredServices = services
    .filter(
      (service) =>
        service.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (!categoryFilter || service.category === categoryFilter) &&
        service.price >= priceRange[0] &&
        service.price <= priceRange[1] &&
        (!offerFilter ||
          (offerFilter === "yes" ? service.offer : !service.offer)) &&
        (!dealFilter || (dealFilter === "yes" ? service.deal : !service.deal)),
    )
    .sort((a, b) => {
      if (sortFilter === "price_asc") return a.price - b.price;
      if (sortFilter === "price_desc") return b.price - a.price;
      if (sortFilter === "createdAt_asc")
        return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortFilter === "createdAt_desc")
        return new Date(b.createdAt) - new Date(a.createdAt);
      return 0;
    });

  const paginatedServices = filteredServices.slice(
    (page - 1) * servicesPerPage,
    page * servicesPerPage,
  );

  const handleCloseMessage = () => {
    setMessage({ ...message, open: false });
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialog({ open: false, id: null, isBulk: false });
  };

  const clearFilters = () => {
    setSearchTerm("");
    setCategoryFilter("");
    setPriceRange([0, 100000]);
    setOfferFilter("");
    setDealFilter("");
    setSortFilter("");
  };

  const toggleServiceAvailability = async (service) => {
    try {
      await axios.patch(
        `${API_URL}/api/services/${service._id}/toggle-availability`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setMessage({
        open: true,
        text: `Service marked as ${!service.isAvailable ? "Available" : "Unavailable"}`,
        severity: "success",
      });
    } catch (error) {
      setMessage({
        open: true,
        text:
          error.response?.data?.msg || "Failed to update service availability",
        severity: "error",
      });
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: "1400px", mx: "auto", bgcolor: "#f4f6f8" }}>
      <Typography
        variant="h3"
        sx={{ mb: 3, fontWeight: "bold", color: "#1a3c34" }}
      >
        Manage Services
      </Typography>
      <Button
        variant="contained"
        onClick={() => navigate("/admin/dashboard")}
        sx={{
          mb: 3,
          bgcolor: "#4a90e2",
          "&:hover": { bgcolor: "#357abd" },
          borderRadius: 2,
        }}
      >
        Back to Dashboard
      </Button>

      <Box
        sx={{
          mb: 4,
          p: 4,
          bgcolor: "#ffffff",
          borderRadius: 2,
          boxShadow: "0 6px 12px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Typography
          variant="h5"
          sx={{ mb: 3, fontWeight: "medium", color: "#2c5282" }}
        >
          Add New Service
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Name"
              value={newService.name}
              onChange={(e) =>
                setNewService({ ...newService, name: e.target.value })
              }
              variant="outlined"
              fullWidth
              required
              sx={{ bgcolor: "white", borderRadius: 1 }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Description"
              value={newService.description}
              onChange={(e) =>
                setNewService({ ...newService, description: e.target.value })
              }
              variant="outlined"
              fullWidth
              required
              sx={{ bgcolor: "white", borderRadius: 1 }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Price (₹)"
              value={newService.price}
              onChange={(e) =>
                setNewService({ ...newService, price: e.target.value })
              }
              variant="outlined"
              fullWidth
              type="number"
              inputProps={{ min: 0 }}
              required
              sx={{ bgcolor: "white", borderRadius: 1 }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth variant="outlined">
              <InputLabel>Category</InputLabel>
              <Select
                value={newService.category}
                onChange={(e) =>
                  setNewService({ ...newService, category: e.target.value })
                }
                label="Category"
                required
              >
                <MenuItem value="Home Maintenance">Home Maintenance</MenuItem>
                <MenuItem value="Cleaning">Cleaning</MenuItem>
                <MenuItem value="Plumbing">Plumbing</MenuItem>
                <MenuItem value="Electrical">Electrical</MenuItem>
                <MenuItem value="Painting">Painting</MenuItem>
                <MenuItem value="Carpentry">Carpentry</MenuItem>
                <MenuItem value="Landscaping">Landscaping</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Offer (e.g., 10% Off)"
              value={newService.offer}
              onChange={(e) =>
                setNewService({ ...newService, offer: e.target.value })
              }
              variant="outlined"
              fullWidth
              sx={{ bgcolor: "white", borderRadius: 1 }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Deal Tag (e.g., Hot Deal)"
              value={newService.deal}
              onChange={(e) =>
                setNewService({ ...newService, deal: e.target.value })
              }
              variant="outlined"
              fullWidth
              sx={{ bgcolor: "white", borderRadius: 1 }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            {newService.imageUrl && (
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <img
                  src={newService.imageUrl}
                  alt="Main Preview"
                  style={{
                    width: "120px",
                    height: "120px",
                    objectFit: "cover",
                    borderRadius: 8,
                  }}
                />
                <IconButton
                  onClick={() =>
                    setNewService({
                      ...newService,
                      image: null,
                      imageUrl: null,
                    })
                  }
                  color="error"
                  sx={{ ml: 1 }}
                >
                  <Delete />
                </IconButton>
              </Box>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              ref={fileInputRef}
              style={{ marginTop: "16px" }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            {newService.additionalImages.map(
              (img, index) =>
                img.url && (
                  <Box
                    key={index}
                    sx={{ display: "flex", alignItems: "center", mb: 2 }}
                  >
                    <img
                      src={img.url}
                      alt={`Additional Preview ${index}`}
                      style={{
                        width: "120px",
                        height: "120px",
                        objectFit: "cover",
                        borderRadius: 8,
                      }}
                    />
                    <IconButton
                      onClick={() =>
                        setNewService({
                          ...newService,
                          additionalImages: newService.additionalImages.filter(
                            (_, i) => i !== index,
                          ),
                        })
                      }
                      color="error"
                      sx={{ ml: 1 }}
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                ),
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleAdditionalImageChange}
              ref={additionalImagesInputRef}
              style={{ marginTop: "16px" }}
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              onClick={handleAddService}
              disabled={loading}
              sx={{
                bgcolor: "#4a90e2",
                "&:hover": { bgcolor: "#357abd" },
                borderRadius: 2,
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Add Service"
              )}
            </Button>
          </Grid>
        </Grid>
      </Box>

      <Box
        sx={{
          mb: 4,
          p: 4,
          bgcolor: "#ffffff",
          borderRadius: 2,
          boxShadow: "0 6px 12px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Typography
          variant="h5"
          sx={{ mb: 3, fontWeight: "medium", color: "#2c5282" }}
        >
          Filter Services
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Search by Name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              variant="outlined"
              fullWidth
              sx={{ bgcolor: "white", borderRadius: 1 }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth variant="outlined">
              <InputLabel>Category</InputLabel>
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                label="Category"
              >
                <MenuItem value="">
                  <em>All</em>
                </MenuItem>
                <MenuItem value="Home Maintenance">Home Maintenance</MenuItem>
                <MenuItem value="Cleaning">Cleaning</MenuItem>
                <MenuItem value="Plumbing">Plumbing</MenuItem>
                <MenuItem value="Electrical">Electrical</MenuItem>
                <MenuItem value="Painting">Painting</MenuItem>
                <MenuItem value="Carpentry">Carpentry</MenuItem>
                <MenuItem value="Landscaping">Landscaping</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth variant="outlined">
              <InputLabel>Offer</InputLabel>
              <Select
                value={offerFilter}
                onChange={(e) => setOfferFilter(e.target.value)}
                label="Offer"
              >
                <MenuItem value="">
                  <em>All</em>
                </MenuItem>
                <MenuItem value="yes">With Offer</MenuItem>
                <MenuItem value="no">Without Offer</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth variant="outlined">
              <InputLabel>Deal</InputLabel>
              <Select
                value={dealFilter}
                onChange={(e) => setDealFilter(e.target.value)}
                label="Deal"
              >
                <MenuItem value="">
                  <em>All</em>
                </MenuItem>
                <MenuItem value="yes">With Deal</MenuItem>
                <MenuItem value="no">Without Deal</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth variant="outlined">
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortFilter}
                onChange={(e) => setSortFilter(e.target.value)}
                label="Sort By"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                <MenuItem value="price_asc">Price (Low to High)</MenuItem>
                <MenuItem value="price_desc">Price (High to Low)</MenuItem>
                <MenuItem value="createdAt_asc">Oldest First</MenuItem>
                <MenuItem value="createdAt_desc">Newest First</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button
              variant="contained"
              onClick={clearFilters}
              startIcon={<Clear />}
              sx={{
                bgcolor: "#718096",
                "&:hover": { bgcolor: "#4a5568" },
                height: "100%",
                borderRadius: 2,
              }}
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Button
          variant="contained"
          onClick={handleBulkDelete}
          disabled={selectedServices.length === 0 || loading}
          sx={{
            mb: 3,
            bgcolor: "#e53e3e",
            "&:hover": { bgcolor: "#c53030" },
            borderRadius: 2,
          }}
        >
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            "Bulk Delete"
          )}
        </Button>
        {loading && !paginatedServices.length ? (
          <AdminLoadingScreen message="Loading Services..." />
        ) : (
          paginatedServices.map((service) => (
            <Card
              key={service._id}
              sx={{
                mb: 3,
                boxShadow: "0 8px 16px rgba(0, 0, 0, 0.1)",
                borderRadius: 3,
                bgcolor: "#ffffff",
                "&:hover": { boxShadow: "0 12px 24px rgba(0, 0, 0, 0.15)" },
                transition: "box-shadow 0.3s ease-in-out",
              }}
            >
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <Checkbox
                    checked={selectedServices.includes(service._id)}
                    onChange={(e) => {
                      if (e.target.checked)
                        setSelectedServices([...selectedServices, service._id]);
                      else
                        setSelectedServices(
                          selectedServices.filter((id) => id !== service._id),
                        );
                    }}
                  />
                  <Typography
                    variant="h6"
                    sx={{ color: "#2c5282", flexGrow: 1, fontWeight: "bold" }}
                  >
                    {service.name}
                  </Typography>
                </Box>
                <Typography variant="body1" sx={{ color: "#4a5568", mb: 1 }}>
                  Description: {service.description}
                </Typography>
                <Typography variant="body1" sx={{ color: "#4a5568", mb: 1 }}>
                  Price: ₹{service.price.toLocaleString("en-IN")}
                </Typography>
                <Typography variant="body1" sx={{ color: "#4a5568", mb: 1 }}>
                  Category: {service.category}
                </Typography>
                <Typography variant="body1" sx={{ color: "#4a5568", mb: 1 }}>
                  Created By: {service.createdBy?.name || "Unknown"}
                </Typography>
                <Typography variant="body1" sx={{ color: "#4a5568", mb: 1 }}>
                  Created At: {new Date(service.createdAt).toLocaleString()}
                </Typography>
                {service.offer && (
                  <Typography
                    variant="body1"
                    sx={{ color: "#e53e3e", fontWeight: "medium", mb: 1 }}
                  >
                    Offer: {service.offer}
                  </Typography>
                )}
                {service.deal && (
                  <Typography
                    variant="body1"
                    sx={{ color: "#2b6cb0", fontWeight: "medium", mb: 1 }}
                  >
                    Deal: {service.deal}
                  </Typography>
                )}
                {service.image && (
                  <img
                    src={service.image} // <-- UPDATED
                    alt={service.name}
                    style={{
                      width: "150px",
                      height: "150px",
                      objectFit: "cover",
                      borderRadius: 8,
                      marginTop: "16px",
                    }}
                    onError={(e) => {
                      e.target.src =
                        "https://via.placeholder.com/300.png?text=No+Image";
                    }}
                  />
                )}
                {service.additionalImages &&
                  service.additionalImages.length > 0 && (
                    <Box
                      sx={{ display: "flex", flexWrap: "wrap", gap: 2, mt: 2 }}
                    >
                      {service.additionalImages.map((img, index) => (
                        <img
                          key={index}
                          src={img} // <-- UPDATED
                          alt={`Additional ${index}`}
                          style={{
                            width: "150px",
                            height: "150px",
                            objectFit: "cover",
                            borderRadius: 8,
                          }}
                          onError={(e) => {
                            e.target.src =
                              "https://via.placeholder.com/300.png?text=No+Image";
                          }}
                        />
                      ))}
                    </Box>
                  )}
              </CardContent>

              {/*   <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
                <IconButton
                  onClick={() => setEditingService({
                    ...service,
                    imageUrl: service.image || null, // <-- UPDATED
                    additionalImages: service.additionalImages.map(img => ({ url: img })), // <-- UPDATED
                    availableSlots: service.availableSlots ? new Map(Object.entries(service.availableSlots)) : new Map(),
                  })}
                  sx={{ color: '#4a90e2', '&:hover': { color: '#357abd' } }}
                >
                  <Edit />
                </IconButton>
                <IconButton
                  onClick={() => handleDeleteService(service._id)}
                  sx={{ color: '#e53e3e', '&:hover': { color: '#c53030' } }}
                >
                  <Delete />
                </IconButton>
              </CardActions> */}

              <CardActions sx={{ justifyContent: "space-between", p: 2 }}>
                {/* ✅ Available / Unavailable Toggle Button */}
                <Button
                  variant="contained"
                  size="small"
                  color={service.isAvailable ? "success" : "error"}
                  onClick={() => toggleServiceAvailability(service)}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: "bold",
                  }}
                >
                  {service.isAvailable ? "Available" : "Unavailable"}
                </Button>

                {/* Edit & Delete Actions */}
                <Box>
                  <IconButton
                    onClick={() =>
                      setEditingService({
                        ...service,
                        imageUrl: service.image || null, // <-- UPDATED
                        additionalImages: service.additionalImages.map(
                          (img) => ({ url: img }),
                        ), // <-- UPDATED
                        availableSlots: service.availableSlots
                          ? new Map(Object.entries(service.availableSlots))
                          : new Map(),
                      })
                    }
                    sx={{ color: "#4a90e2", "&:hover": { color: "#357abd" } }}
                  >
                    <Edit />
                  </IconButton>

                  <IconButton
                    onClick={() => handleDeleteService(service._id)}
                    sx={{ color: "#e53e3e", "&:hover": { color: "#c53030" } }}
                  >
                    <Delete />
                  </IconButton>
                </Box>
              </CardActions>

              {editingService?._id === service._id && (
                <CardContent
                  sx={{ bgcolor: "#f9fafb", borderRadius: 2, mt: 2 }}
                >
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="Name"
                        value={editingService.name}
                        onChange={(e) =>
                          setEditingService({
                            ...editingService,
                            name: e.target.value,
                          })
                        }
                        variant="outlined"
                        fullWidth
                        required
                        sx={{ bgcolor: "white", borderRadius: 1 }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="Description"
                        value={editingService.description}
                        onChange={(e) =>
                          setEditingService({
                            ...editingService,
                            description: e.target.value,
                          })
                        }
                        variant="outlined"
                        fullWidth
                        required
                        sx={{ bgcolor: "white", borderRadius: 1 }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="Price (₹)"
                        value={editingService.price}
                        onChange={(e) =>
                          setEditingService({
                            ...editingService,
                            price: e.target.value,
                          })
                        }
                        variant="outlined"
                        fullWidth
                        type="number"
                        inputProps={{ min: 0 }}
                        required
                        sx={{ bgcolor: "white", borderRadius: 1 }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth variant="outlined">
                        <InputLabel>Category</InputLabel>
                        <Select
                          value={editingService.category}
                          onChange={(e) =>
                            setEditingService({
                              ...editingService,
                              category: e.target.value,
                            })
                          }
                          label="Category"
                          required
                        >
                          <MenuItem value="Home Maintenance">
                            Home Maintenance
                          </MenuItem>
                          <MenuItem value="Cleaning">Cleaning</MenuItem>
                          <MenuItem value="Plumbing">Plumbing</MenuItem>
                          <MenuItem value="Electrical">Electrical</MenuItem>
                          <MenuItem value="Painting">Painting</MenuItem>
                          <MenuItem value="Carpentry">Carpentry</MenuItem>
                          <MenuItem value="Landscaping">Landscaping</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="Offer (e.g., 10% Off)"
                        value={editingService.offer}
                        onChange={(e) =>
                          setEditingService({
                            ...editingService,
                            offer: e.target.value,
                          })
                        }
                        variant="outlined"
                        fullWidth
                        sx={{ bgcolor: "white", borderRadius: 1 }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="Deal Tag (e.g., Hot Deal)"
                        value={editingService.deal}
                        onChange={(e) =>
                          setEditingService({
                            ...editingService,
                            deal: e.target.value,
                          })
                        }
                        variant="outlined"
                        fullWidth
                        sx={{ bgcolor: "white", borderRadius: 1 }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      {editingService.imageUrl && (
                        <Box
                          sx={{ display: "flex", alignItems: "center", mb: 2 }}
                        >
                          <img
                            src={editingService.imageUrl}
                            alt="Main Preview"
                            style={{
                              width: "150px",
                              height: "150px",
                              objectFit: "cover",
                              borderRadius: 8,
                            }}
                          />
                          <IconButton
                            onClick={() => removeImage("main")}
                            color="error"
                            sx={{ ml: 1 }}
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleEditImageChange}
                        ref={fileInputRef}
                        style={{ marginTop: "16px" }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      {editingService.additionalImages.map(
                        (img, index) =>
                          img.url && (
                            <Box
                              key={index}
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                mb: 2,
                              }}
                            >
                              <img
                                src={img.url}
                                alt={`Additional Preview ${index}`}
                                style={{
                                  width: "150px",
                                  height: "150px",
                                  objectFit: "cover",
                                  borderRadius: 8,
                                }}
                              />
                              <IconButton
                                onClick={() => removeImage("additional", index)}
                                color="error"
                                sx={{ ml: 1 }}
                              >
                                <Delete />
                              </IconButton>
                            </Box>
                          ),
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleEditAdditionalImageChange}
                        ref={additionalImagesInputRef}
                        style={{ marginTop: "16px" }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Typography
                        variant="h6"
                        sx={{ mb: 2, fontWeight: "medium", color: "#2c5282" }}
                      >
                        Manage Schedule
                      </Typography>
                      <Button
                        variant="outlined"
                        onClick={addScheduleSlot}
                        sx={{
                          mb: 2,
                          color: "#4a90e2",
                          borderColor: "#4a90e2",
                          "&:hover": { bgcolor: "#e6f0fa" },
                        }}
                      >
                        Add New Date
                      </Button>
                      {Array.from(
                        (editingService.availableSlots || new Map()).entries(),
                      ).map(([date, times]) => (
                        <Box
                          key={date}
                          sx={{
                            mb: 3,
                            p: 2,
                            bgcolor: "#fff",
                            borderRadius: 2,
                            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                          }}
                        >
                          <Typography sx={{ mb: 1, fontWeight: "bold" }}>
                            Date: {date}
                          </Typography>
                          {times.map((time, index) => (
                            <Box
                              key={index}
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                mb: 1,
                              }}
                            >
                              <TextField
                                label={`Time ${index + 1}`}
                                value={time || ""}
                                onChange={(e) =>
                                  updateScheduleTime(
                                    date,
                                    index,
                                    e.target.value,
                                  )
                                }
                                variant="outlined"
                                sx={{
                                  mr: 2,
                                  bgcolor: "white",
                                  borderRadius: 1,
                                  width: "150px",
                                }}
                                type="time"
                              />
                              <IconButton
                                onClick={() => removeTimeSlot(date, index)}
                                color="error"
                              >
                                <Remove />
                              </IconButton>
                            </Box>
                          ))}
                          <Button
                            variant="contained"
                            onClick={() => addTimeSlot(date)}
                            sx={{
                              mb: 1,
                              bgcolor: "#4a90e2",
                              "&:hover": { bgcolor: "#357abd" },
                              borderRadius: 2,
                            }}
                          >
                            <Add /> Add Time Slot
                          </Button>
                        </Box>
                      ))}
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        variant="contained"
                        onClick={() => handleEditService(editingService._id)}
                        disabled={loading}
                        sx={{
                          bgcolor: "#4a90e2",
                          "&:hover": { bgcolor: "#357abd" },
                          mr: 2,
                          borderRadius: 2,
                        }}
                      >
                        {loading ? (
                          <CircularProgress size={24} color="inherit" />
                        ) : (
                          "Save"
                        )}
                      </Button>
                      <Button
                        variant="contained"
                        onClick={() => setEditingService(null)}
                        disabled={loading}
                        sx={{
                          bgcolor: "#718096",
                          "&:hover": { bgcolor: "#4a5568" },
                          borderRadius: 2,
                        }}
                      >
                        Cancel
                      </Button>
                    </Grid>
                  </Grid>
                </CardContent>
              )}
            </Card>
          ))
        )}
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <Pagination
            count={Math.ceil(filteredServices.length / servicesPerPage)}
            page={page}
            onChange={(e, value) => setPage(value)}
            color="primary"
            sx={{
              "& .MuiPaginationItem-root": {
                color: "#4a90e2",
                fontWeight: "bold",
              },
            }}
          />
        </Box>
      </Box>

      <Button
        variant="contained"
        onClick={() => navigate("/admin/bookings")}
        sx={{
          bgcolor: "#4a90e2",
          "&:hover": { bgcolor: "#357abd" },
          borderRadius: 2,
        }}
      >
        Next: Bookings
      </Button>

      <Snackbar
        open={message.open}
        autoHideDuration={4000}
        onClose={handleCloseMessage}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseMessage}
          severity={message.severity}
          sx={{
            width: "100%",
            borderRadius: 2,
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
          }}
        >
          {message.text}
        </Alert>
      </Snackbar>

      <Dialog
        open={deleteDialog.open}
        onClose={handleCloseDeleteDialog}
        aria-labelledby="delete-dialog-title"
      >
        <DialogTitle id="delete-dialog-title">
          {deleteDialog.isBulk
            ? "Confirm Bulk Deletion"
            : "Confirm Service Deletion"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {deleteDialog.isBulk
              ? `Are you sure you want to delete ${selectedServices.length} selected service(s)? This action cannot be undone.`
              : "Are you sure you want to delete this service? This action cannot be undone."}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} sx={{ color: "#718096" }}>
            Cancel
          </Button>
          <Button
            onClick={
              deleteDialog.isBulk ? confirmBulkDelete : confirmDeleteService
            }
            sx={{
              bgcolor: "#e53e3e",
              color: "white",
              "&:hover": { bgcolor: "#c53030" },
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Services;

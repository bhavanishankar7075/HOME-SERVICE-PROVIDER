import React, { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { ServicesContext } from "../context/ServicesContext";
import {
  Box,
  Typography,
  Button,
  Grid,
  Paper,
  CardMedia,
  Rating,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Skeleton,
  Container,
  Toolbar,
  Fade,
  Grow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
  AlertTitle,
  CircularProgress,
  Avatar,
  Stepper,
  Step,
  StepLabel,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
} from "@mui/material";
import {
  CheckCircleOutline as CheckCircleIcon,
  VerifiedUser as VerifiedUserIcon,
  SupportAgent as SupportAgentIcon,
  Build as BuildIcon,
  Share as ShareIcon,
  ExpandMore as ExpandMoreIcon,
  Send as SendIcon,
  FormatListBulleted as FormatListBulletedIcon,
} from "@mui/icons-material";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import axios from "axios";
import LoadingScreen from "../components/LoadingScreen";
import "../styles/ServiceDetails.css";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = STRIPE_PUBLISHABLE_KEY
  ? loadStripe(STRIPE_PUBLISHABLE_KEY)
  : null;

const CheckoutForm = ({ onPaymentSuccess, onPaymentError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements) return;
    setIsProcessing(true);
    const { error } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });
    if (error) {
      setErrorMessage(error.message);
      onPaymentError(error.message);
    } else {
      onPaymentSuccess();
    }
    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <Button
        type="submit"
        disabled={isProcessing || !stripe || !elements}
        fullWidth
        variant="contained"
        sx={{
          mt: 3,
          py: 1.5,
          bgcolor: "#4F46E5",
          "&:hover": { bgcolor: "#4338CA" },
        }}
      >
        {isProcessing ? <CircularProgress size={24} /> : "Pay Now"}
      </Button>
      {errorMessage && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {errorMessage}
        </Alert>
      )}
    </form>
  );
};

const ServiceDetails = () => {
  const { id } = useParams();
  const { services, loading: servicesLoading } = useContext(ServicesContext);
  const navigate = useNavigate();
  const {
    user,
    location: userLocation,
    token,
  } = useSelector((state) => state.auth);

  const [service, setService] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);
  const [feedbackError, setFeedbackError] = useState("");
  const [isBookingModalOpen, setBookingModalOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [bookingData, setBookingData] = useState({ location: "" });
  const [paymentMethod, setPaymentMethod] = useState("Stripe");
  const [clientSecret, setClientSecret] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [faqs, setFaqs] = useState([]);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [contactLoading, setContactLoading] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactError, setContactError] = useState("");
  const [isShareDialogOpen, setShareDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const getImageUrl = (imagePath) =>
    imagePath || "https://via.placeholder.com/600x400?text=Image+Not+Available"; // <-- UPDATED

  useEffect(() => {
    const currentService = services.find((s) => s._id === id);
    if (currentService) {
      setService(currentService);
      // Fetch feedbacks
      const fetchServiceFeedbacks = async () => {
        setLoadingFeedbacks(true);
        setFeedbackError("");
        try {
          const config = token
            ? { headers: { Authorization: `Bearer ${token}` } }
            : {};
          const { data } = await axios.get(
            `${API_URL}/api/feedback?serviceId=${id}`,
            config
          );
          console.log("Feedbacks fetched:", data);
          setFeedbacks(data);
        } catch (error) {
          console.error(
            "Failed to fetch feedbacks:",
            error.message,
            error.response?.data
          );
          setFeedbackError(
            error.response?.status === 401
              ? "Please log in to view feedback"
              : "Failed to load feedback"
          );
          setFeedbacks([]);
        } finally {
          setLoadingFeedbacks(false);
        }
      };
      // Fetch FAQs
      const fetchFaqs = async () => {
        try {
          const { data } = await axios.get(
            `${API_URL}/api/faqs?serviceId=${id}`
          );
          setFaqs(data);
        } catch (error) {
          console.error("Failed to fetch FAQs:", error.message);
          // Fallback mock FAQs
          setFaqs([
            {
              question: "What is included in this service?",
              answer:
                currentService?.inclusions?.join(", ") ||
                "All necessary tasks and materials.",
            },
            {
              question: "How long does the service take?",
              answer: "Typically 1-2 hours, depending on the complexity.",
            },
            {
              question: "Is there a warranty?",
              answer: "Yes, we offer a 30-day satisfaction guarantee.",
            },
          ]);
        }
      };
      fetchServiceFeedbacks();
      fetchFaqs();
    }
  }, [id, services, token]);

  const handleShare = () => {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => {
        setCopied(true);
        setShareDialogOpen(true);
        setTimeout(() => setCopied(false), 3000);
      })
      .catch((error) => {
        console.error("Error copying link:", error);
      });
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setContactLoading(true);
    setContactError("");
    setContactSuccess(false);
    try {
      await axios.post(`${API_URL}/api/contact`, contactForm);
      setContactSuccess(true);
      setContactForm({ name: "", email: "", message: "" });
    } catch (error) {
      setContactError(
        error.response?.data?.message || "Failed to send message"
      );
    } finally {
      setContactLoading(false);
    }
  };

  const handleOpenBooking = () => {
    if (!token) return navigate("/login");
    setBookingData({
      location: user?.profile?.location?.fullAddress || userLocation || "",
    });
    setActiveStep(0);
    setBookingError("");
    setClientSecret("");
    setPaymentMethod("Stripe");
    setBookingModalOpen(true);
  };

  const handleCloseBooking = () => setBookingModalOpen(false);

  const handleCreateBookingAndProceed = async () => {
    setBookingLoading(true);
    setBookingError("");
    try {
      if (!token) {
        setBookingError("Please log in to book a service");
        return;
      }
      const bookingPayload = {
        serviceId: service._id,
        scheduledTime: new Date().toISOString(),
        location: bookingData.location,
        paymentMethod,
        isImmediate: true,
      };
      const bookingRes = await axios.post(
        `${API_URL}/api/bookings`,
        bookingPayload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const createdBooking = bookingRes.data;

      if (paymentMethod === "COD") {
        await axios.post(
          `${API_URL}/api/payments/confirm-cod`,
          { bookingId: createdBooking._id },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setActiveStep(2);
      } else if (paymentMethod === "Stripe") {
        const intentRes = await axios.post(
          `${API_URL}/api/payments/create-stripe-intent`,
          { bookingId: createdBooking._id },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setClientSecret(intentRes.data.clientSecret);
        setActiveStep(1);
      }
    } catch (error) {
      setBookingError(
        error.response?.data?.message || "An unexpected error occurred."
      );
    } finally {
      setBookingLoading(false);
    }
  };

  /*   if (servicesLoading || !service) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          bgcolor: "#F9FAFB",
        }}
      >
        <CircularProgress size={60} sx={{ color: "#4F46E5" }} />
      </Box>
    );
  } */

  if (servicesLoading || !service) {
    return (
      <LoadingScreen
        title="Loading Service"
        message="Getting the details ready for you..."
      />
    );
  }

  return (
    <>
      <Toolbar />
      {/* Hero Banner */}
      <Box
        sx={{
          position: "relative",
          height: { xs: "60vh", md: "70vh" },
          background: `linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,0.3)), url(${getImageUrl(
            service.image
          )})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          color: "white",
          mb: 6,
        }}
      >
        <Box>
          <Fade in={true} timeout={1000}>
            <Typography
              variant="h2"
              sx={{
                fontWeight: "bold",
                fontSize: { xs: "2rem", md: "3.5rem" },
                mb: 2,
              }}
            >
              {service.name}
            </Typography>
          </Fade>
          <Typography
            variant="h6"
            sx={{
              mb: 4,
              fontSize: { xs: "1rem", md: "1.25rem" },
              maxWidth: "600px",
              mx: "auto",
            }}
          >
            Experience top-quality service with our verified professionals!
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={handleOpenBooking}
            sx={{
              bgcolor: "#4F46E5",
              "&:hover": { bgcolor: "#4338CA" },
              px: 4,
              py: 1.5,
              fontSize: "1rem",
            }}
          >
            Book Now
          </Button>
        </Box>
      </Box>

      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Grid container spacing={5}>
          <Grid item xs={12} md={8}>
            {/* Service Overview */}
            <Grow in={true} timeout={800}>
              <Box sx={{ mb: 8 }}>
                <Typography
                  variant="h4"
                  fontWeight="bold"
                  sx={{ color: "#1F2937", mb: 3 }}
                >
                  Service Overview
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: "#6B7280",
                    fontSize: "1rem",
                    lineHeight: 1.7,
                    mb: 3,
                  }}
                >
                  {service.description}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Rating
                    value={service.averageRating || 0}
                    readOnly
                    precision={0.1}
                  />
                  <Typography sx={{ color: "#6B7280", fontSize: "0.9rem" }}>
                    ({(service.averageRating || 0).toFixed(1)}/5,{" "}
                    {service.feedbackCount || 0} reviews)
                  </Typography>
                  <Chip
                    label={service.category}
                    sx={{
                      bgcolor: "#4F46E5",
                      color: "white",
                      "&:hover": { bgcolor: "#4338CA" },
                    }}
                  />
                </Box>
              </Box>
            </Grow>

            <Divider sx={{ my: 6 }} />

            {/* What's Included */}
            <Grow in={true} timeout={1000}>
              <Box sx={{ mb: 8 }}>
                <Typography
                  variant="h4"
                  fontWeight="bold"
                  sx={{ color: "#1F2937", mb: 3 }}
                >
                  What's Included
                </Typography>
                <List>
                  {(service.inclusions || []).map((item, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <CheckCircleIcon
                          color="success"
                          sx={{ fontSize: "1.5rem" }}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={item}
                        sx={{
                          "& .MuiListItemText-primary": {
                            fontSize: "1rem",
                            color: "#1F2937",
                          },
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            </Grow>

            <Divider sx={{ my: 6 }} />

            {/* How It Works */}
            <Grow in={true} timeout={1200}>
              <Box sx={{ mb: 8 }}>
                <Typography
                  variant="h4"
                  fontWeight="bold"
                  sx={{ color: "#1F2937", mb: 3 }}
                >
                  How It Works
                </Typography>
                <Grid container spacing={3}>
                  {[
                    {
                      icon: (
                        <BuildIcon
                          sx={{ color: "#4F46E5", fontSize: "2rem" }}
                        />
                      ),
                      title: "Book Instantly",
                      desc: "Click 'Book Now' to schedule your service immediately.",
                    },
                    {
                      icon: (
                        <VerifiedUserIcon
                          sx={{ color: "#4F46E5", fontSize: "2rem" }}
                        />
                      ),
                      title: "We Assign a Pro",
                      desc: "Our system assigns the best professional for your needs.",
                    },
                    {
                      icon: (
                        <SupportAgentIcon
                          sx={{ color: "#4F46E5", fontSize: "2rem" }}
                        />
                      ),
                      title: "Enjoy Your Service",
                      desc: "Relax as our certified provider delivers top-quality service.",
                    },
                  ].map((item) => (
                    <Grid
                      item
                      xs={12}
                      sm={4}
                      key={item.title}
                      sx={{ display: "flex" }}
                    >
                      <Paper
                        elevation={3}
                        sx={{
                          p: 3,
                          textAlign: "center",
                          borderRadius: 3,
                          height: "100%",
                          width: "100%",
                          bgcolor: "#F9FAFB",
                          transition: "transform 0.3s",
                          "&:hover": {
                            transform: "translateY(-5px)",
                            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                          },
                        }}
                      >
                        <Avatar
                          sx={{
                            bgcolor: "#E0E7FF",
                            mx: "auto",
                            mb: 2,
                            width: 56,
                            height: 56,
                          }}
                        >
                          {item.icon}
                        </Avatar>
                        <Typography
                          variant="h6"
                          sx={{ color: "#1F2937", mb: 1 }}
                        >
                          {item.title}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#6B7280" }}>
                          {item.desc}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
                <Box sx={{ mt: 4 }}>
                  <Typography
                    variant="h6"
                    sx={{ color: "#1F2937", mb: 2, fontWeight: "medium" }}
                  >
                    Why Choose Our Process?
                  </Typography>
                  <List dense>
                    {[
                      "Fast and seamless booking experience",
                      "Vetted professionals for reliable service",
                      "Real-time updates on your booking status",
                      "24/7 customer support for any queries",
                    ].map((benefit, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <FormatListBulletedIcon
                            sx={{ color: "#4F46E5", fontSize: "1.2rem" }}
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={benefit}
                          sx={{
                            "& .MuiListItemText-primary": {
                              fontSize: "0.9rem",
                              color: "#1F2937",
                            },
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </Box>
            </Grow>

            <Divider sx={{ my: 6 }} />

            {/* Customer Reviews */}
            <Grow in={true} timeout={1400}>
              <Box sx={{ mb: 8 }}>
                <Typography
                  variant="h4"
                  fontWeight="bold"
                  sx={{ color: "#1F2937", mb: 4, textAlign: "center" }}
                >
                  Customer Reviews
                </Typography>
                {loadingFeedbacks ? (
                  <Grid container spacing={3}>
                    {[1, 2, 3].map((_, index) => (
                      <Grid item xs={12} sm={4} key={index}>
                        <Skeleton
                          variant="rectangular"
                          height={200}
                          sx={{ borderRadius: 3 }}
                        />
                      </Grid>
                    ))}
                  </Grid>
                ) : feedbackError ? (
                  <Paper sx={{ p: 4, borderRadius: 3, textAlign: "center" }}>
                    <Typography sx={{ color: "#6B7280" }}>
                      {feedbackError}
                    </Typography>
                    <Button
                      variant="outlined"
                      onClick={() => navigate("/login")}
                      sx={{ mt: 2, color: "#4F46E5", borderColor: "#4F46E5" }}
                    >
                      Log In to View
                    </Button>
                  </Paper>
                ) : feedbacks.length > 0 ? (
                  <Grid container spacing={3}>
                    {feedbacks.slice(0, 3).map((feedback) => (
                      <Grid item xs={12} sm={4} key={feedback._id}>
                        <Paper
                          elevation={4}
                          sx={{
                            p: 3,
                            borderRadius: 3,
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                            transition: "box-shadow 0.3s",
                            "&:hover": {
                              boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                            },
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              mb: 2,
                            }}
                          >
                            <Avatar
                              src={getImageUrl(
                                feedback.bookingId?.customer?.profile?.image
                              )}
                              alt={feedback.bookingId?.customer?.name}
                              sx={{ width: 48, height: 48, mr: 2 }}
                              onError={(e) => {
                                e.target.src =
                                  "https://via.placeholder.com/48?text=U";
                              }}
                            />
                            <Typography
                              variant="subtitle1"
                              sx={{ fontWeight: "bold" }}
                            >
                              {feedback.bookingId?.customer?.name ||
                                "Anonymous"}
                            </Typography>
                          </Box>
                          <Rating
                            value={Number(feedback.rating)}
                            readOnly
                            sx={{ mb: 2 }}
                          />
                          <Typography
                            variant="body2"
                            sx={{
                              color: "#6B7280",
                              fontStyle: "italic",
                              flexGrow: 1,
                            }}
                          >
                            "{feedback.comment}"
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Paper sx={{ p: 4, borderRadius: 3, textAlign: "center" }}>
                    <Typography sx={{ color: "#6B7280" }}>
                      No customer reviews yet. Be the first!
                    </Typography>
                  </Paper>
                )}
              </Box>
            </Grow>

            <Divider sx={{ my: 6 }} />

            {/* FAQs */}
            <Grow in={true} timeout={1600}>
              <Box sx={{ mb: 8 }}>
                <Typography
                  variant="h4"
                  fontWeight="bold"
                  sx={{ color: "#1F2937", mb: 4, textAlign: "center" }}
                >
                  Frequently Asked Questions
                </Typography>
                {faqs.length > 0 ? (
                  faqs.map((faq, index) => (
                    <Accordion
                      key={index}
                      sx={{
                        mb: 2,
                        borderRadius: 2,
                        "&:before": { display: "none" },
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                    >
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography sx={{ fontWeight: "medium" }}>
                          {faq.question}
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography sx={{ color: "#6B7280" }}>
                          {faq.answer}
                        </Typography>
                      </AccordionDetails>
                    </Accordion>
                  ))
                ) : (
                  <Typography sx={{ color: "#6B7280", textAlign: "center" }}>
                    No FAQs available for this service.
                  </Typography>
                )}
              </Box>
            </Grow>

            <Divider sx={{ my: 6 }} />

            {/* Other Services */}
            <Grow in={true} timeout={1800}>
              <Box sx={{ mb: 8 }}>
                <Typography
                  variant="h4"
                  fontWeight="bold"
                  sx={{ color: "#1F2937", mb: 4, textAlign: "center" }}
                >
                  Other Services
                </Typography>
                <Grid container spacing={3}>
                  {services
                    .filter((s) => s._id !== id)
                    .slice(0, 3)
                    .map((otherService) => (
                      <Grid
                        item
                        xs={12}
                        sm={4}
                        key={otherService._id}
                        sx={{ display: "flex" }}
                      >
                        <Paper
                          elevation={3}
                          sx={{
                            p: 2,
                            borderRadius: 3,
                            textAlign: "center",
                            transition: "transform 0.3s",
                            height: "100%", // Add this line
                            width: "100%",
                            "&:hover": {
                              transform: "translateY(-5px)",
                              boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                            },
                          }}
                        >
                          <CardMedia
                            component="img"
                            image={getImageUrl(otherService.image)}
                            alt={otherService.name}
                            sx={{ height: 140, borderRadius: 2, mb: 2 }}
                            onError={(e) => {
                              e.target.src =
                                "https://via.placeholder.com/140?text=Service";
                            }}
                          />
                          <Typography
                            variant="h6"
                            sx={{ color: "#1F2937", mb: 1 }}
                          >
                            {otherService.name}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ color: "#6B7280", mb: 2 }}
                          >
                            ₹{otherService.price.toLocaleString("en-IN")}
                          </Typography>
                          <Button
                            variant="outlined"
                            onClick={() =>
                              navigate(`/services/${otherService._id}`)
                            }
                            sx={{ color: "#4F46E5", borderColor: "#4F46E5" }}
                          >
                            View Details
                          </Button>
                        </Paper>
                      </Grid>
                    ))}
                </Grid>
              </Box>
            </Grow>

            <Divider sx={{ my: 6 }} />

            {/* Get in Touch */}
            <Grow in={true} timeout={2000}>
              <Box sx={{ mb: 8 }}>
                <Typography
                  variant="h4"
                  fontWeight="bold"
                  sx={{ color: "#1F2937", mb: 4, textAlign: "center" }}
                >
                  Get in Touch
                </Typography>
                <Paper
                  sx={{
                    p: 4,
                    borderRadius: 3,
                    maxWidth: 600,
                    mx: "auto",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                  }}
                >
                  {contactSuccess ? (
                    <Box sx={{ textAlign: "center" }}>
                      <CheckCircleIcon
                        color="success"
                        sx={{ fontSize: 60, mb: 2 }}
                      />
                      <Typography variant="h6" sx={{ color: "#1F2937", mb: 2 }}>
                        Message Sent Successfully!
                      </Typography>
                      <Typography sx={{ color: "#6B7280", mb: 2 }}>
                        We've received your inquiry and will respond to{" "}
                        {contactForm.email} soon.
                      </Typography>
                      <Button
                        variant="contained"
                        onClick={() => setContactSuccess(false)}
                        sx={{
                          bgcolor: "#4F46E5",
                          "&:hover": { bgcolor: "#4338CA" },
                        }}
                      >
                        Send Another Message
                      </Button>
                    </Box>
                  ) : (
                    <form onSubmit={handleContactSubmit}>
                      <TextField
                        label="Name"
                        value={contactForm.name}
                        onChange={(e) =>
                          setContactForm({
                            ...contactForm,
                            name: e.target.value,
                          })
                        }
                        fullWidth
                        margin="normal"
                        required
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: 2,
                            bgcolor: "white",
                          },
                        }}
                      />
                      <TextField
                        label="Email"
                        type="email"
                        value={contactForm.email}
                        onChange={(e) =>
                          setContactForm({
                            ...contactForm,
                            email: e.target.value,
                          })
                        }
                        fullWidth
                        margin="normal"
                        required
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: 2,
                            bgcolor: "white",
                          },
                        }}
                      />
                      <TextField
                        label="Message"
                        value={contactForm.message}
                        onChange={(e) =>
                          setContactForm({
                            ...contactForm,
                            message: e.target.value,
                          })
                        }
                        fullWidth
                        margin="normal"
                        multiline
                        rows={4}
                        required
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: 2,
                            bgcolor: "white",
                          },
                        }}
                      />
                      {contactError && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                          {contactError}
                        </Alert>
                      )}
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={contactLoading}
                        sx={{
                          mt: 2,
                          bgcolor: "#4F46E5",
                          "&:hover": { bgcolor: "#4338CA" },
                          py: 1.2,
                        }}
                        startIcon={<SendIcon />}
                      >
                        {contactLoading ? (
                          <CircularProgress size={24} />
                        ) : (
                          "Send Message"
                        )}
                      </Button>
                    </form>
                  )}
                </Paper>
              </Box>
            </Grow>
          </Grid>

          {/* Sidebar */}
          <Grid item xs={12} md={4}>
            <Paper
              sx={{
                p: 3,
                borderRadius: 3,
                position: "sticky",
                top: 80,
                boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                bgcolor: "white",
              }}
            >
              <CardMedia
                component="img"
                image={getImageUrl(service.image)}
                alt={service.name}
                sx={{
                  borderRadius: 2,
                  width: "100%",
                  height: 180,
                  objectFit: "cover",
                  bgcolor: "#F9FAFB",
                  mb: 3,
                }}
                onError={(e) => {
                  e.target.src =
                    "https://via.placeholder.com/300x180?text=Service+Image";
                }}
              />
              <Typography
                variant="h4"
                fontWeight="bold"
                sx={{ color: "#4F46E5", textAlign: "center", mb: 1 }}
              >
                ₹{service.price.toLocaleString("en-IN")}
              </Typography>
              <Typography
                variant="body1"
                sx={{ color: "#6B7280", textAlign: "center", mb: 2 }}
              >
                per service
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
                <Rating
                  value={service.averageRating || 0}
                  readOnly
                  precision={0.1}
                />
                <Typography
                  sx={{ ml: 1, color: "#6B7280", fontSize: "0.9rem" }}
                >
                  ({(service.averageRating || 0).toFixed(1)}/5)
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
                <Tooltip title="Share Service">
                  <IconButton onClick={handleShare}>
                    <ShareIcon sx={{ color: "#4F46E5", fontSize: "1.5rem" }} />
                  </IconButton>
                </Tooltip>
              </Box>
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleOpenBooking}
                sx={{
                  py: 1.5,
                  fontWeight: "bold",
                  bgcolor: "#4F46E5",
                  "&:hover": { bgcolor: "#4338CA" },
                }}
              >
                Book Now
              </Button>
              <Divider sx={{ my: 3 }} />
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon fontSize="small" color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Verified Professionals"
                    sx={{
                      "& .MuiListItemText-primary": {
                        fontSize: "0.9rem",
                        color: "#1F2937",
                      },
                    }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon fontSize="small" color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Satisfaction Guaranteed"
                    sx={{
                      "& .MuiListItemText-primary": {
                        fontSize: "0.9rem",
                        color: "#1F2937",
                      },
                    }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon fontSize="small" color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Instant Booking"
                    sx={{
                      "& .MuiListItemText-primary": {
                        fontSize: "0.9rem",
                        color: "#1F2937",
                      },
                    }}
                  />
                </ListItem>
              </List>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* Share Dialog */}
      <Dialog
        open={isShareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        sx={{ "& .MuiDialog-paper": { borderRadius: 3 } }}
      >
        <DialogTitle
          sx={{ bgcolor: "#4F46E5", color: "white", textAlign: "center" }}
        >
          Share This Service
        </DialogTitle>
        <DialogContent sx={{ p: 3, bgcolor: "#F9FAFB" }}>
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <CardMedia
              component="img"
              image={getImageUrl(service.image)}
              alt={service.name}
              sx={{ width: "100%", height: 150, borderRadius: 2, mb: 2 }}
              onError={(e) => {
                e.target.src =
                  "https://via.placeholder.com/300x150?text=Service+Image";
              }}
            />
            <Typography variant="h6" sx={{ color: "#1F2937", mb: 1 }}>
              {service.name}
            </Typography>
            <Typography variant="body2" sx={{ color: "#6B7280", mb: 2 }}>
              ₹{service.price.toLocaleString("en-IN")}
            </Typography>
            <TextField
              value={window.location.href}
              fullWidth
              InputProps={{ readOnly: true }}
              variant="outlined"
              label="Service Link"
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            />
            {copied && (
              <Alert severity="success" sx={{ mt: 2 }}>
                Link copied to clipboard!
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", bgcolor: "#F9FAFB" }}>
          <Button
            onClick={() => setShareDialogOpen(false)}
            sx={{ color: "#4F46E5" }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={isBookingModalOpen}
        onClose={handleCloseBooking}
        maxWidth="sm"
        fullWidth
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: 4,
            // This ensures the dialog itself can contain the fixed and scrolling parts
            display: "flex",
            flexDirection: "column",
            maxHeight: "90vh", 
          },
        }}
      >
        <DialogTitle
          sx={{
            bgcolor: "#4F46E5",
            color: "white",
            py: 2,
            px: 3,
            textAlign: "center",
          }}
        >
          Confirm Booking: {service?.name || "Service"}
        </DialogTitle>

        <DialogContent
          sx={{
            p: 0,
            bgcolor: "#F9FAFB",
            flex: "1 1 auto",
            overflow: "hidden",
          }}
        >
          {/* The Stepper stays outside the scrollable area so it's always visible. */}
          <Stepper activeStep={activeStep} sx={{ p: 3, pb: 2 }}>
            <Step>
              <StepLabel>Confirm Details</StepLabel>
            </Step>
            <Step>
              <StepLabel>Payment</StepLabel>
            </Step>
            <Step>
              <StepLabel>Confirmed</StepLabel>
            </Step>
          </Stepper>
          <Box sx={{ overflowY: "auto", p: 3, pt: 0 }}>
            {bookingError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {bookingError}
              </Alert>
            )}

            {activeStep === 0 && (
              <Box>
                <Typography
                  variant="h6"
                  sx={{ color: "#1F2937", mb: 2, fontSize: "1.1rem" }}
                >
                  Your Details
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
                  <Typography sx={{ mb: 1, fontSize: "0.9rem" }}>
                    <strong>Service:</strong> {service?.name || "N/A"}
                  </Typography>
                  <Typography sx={{ mb: 1, fontSize: "0.9rem" }}>
                    <strong>Price:</strong> ₹
                    {service?.price?.toLocaleString("en-IN") || "0"}
                  </Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
                  <Typography sx={{ mb: 1, fontSize: "0.9rem" }}>
                    <strong>Name:</strong> {user?.name || "N/A"}
                  </Typography>
                  <Typography sx={{ mb: 1, fontSize: "0.9rem" }}>
                    <strong>Email:</strong> {user?.email || "N/A"}
                  </Typography>
                  {user?.phone ? (
                    <Typography sx={{ mb: 1, fontSize: "0.9rem" }}>
                      <strong>Phone:</strong> {user.phone}
                    </Typography>
                  ) : (
                    <Alert
                      severity="warning"
                      action={
                        <Button
                          color="inherit"
                          size="small"
                          onClick={() => navigate("/profile")}
                        >
                          UPDATE PROFILE
                        </Button>
                      }
                    >
                      <AlertTitle>Phone Number Required</AlertTitle>
                      Please add a phone number to your profile to continue.
                    </Alert>
                  )}
                  <TextField
                    label="Service Location"
                    value={bookingData.location}
                    onChange={(e) =>
                      setBookingData({
                        ...bookingData,
                        location: e.target.value,
                      })
                    }
                    fullWidth
                    margin="normal"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                        bgcolor: "white",
                      },
                      "& .MuiInputLabel-root": { fontSize: "0.9rem" },
                    }}
                  />
                </Paper>
                <Typography
                  variant="h6"
                  sx={{ color: "#1F2937", mb: 1, fontSize: "1.1rem" }}
                >
                  Select Payment Method
                </Typography>
                <RadioGroup
                  row
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  sx={{ justifyContent: "center" }}
                >
                  <FormControlLabel
                    value="Stripe"
                    control={
                      <Radio
                        sx={{
                          color: "#4F46E5",
                          "&.Mui-checked": { color: "#4F46E5" },
                        }}
                      />
                    }
                    label={
                      <Typography sx={{ fontSize: "0.9rem" }}>
                        Pay with Card
                      </Typography>
                    }
                  />
                  <FormControlLabel
                    value="COD"
                    control={
                      <Radio
                        sx={{
                          color: "#4F46E5",
                          "&.Mui-checked": { color: "#4F46E5" },
                        }}
                      />
                    }
                    label={
                      <Typography sx={{ fontSize: "0.9rem" }}>
                        Cash on Delivery
                      </Typography>
                    }
                  />
                </RadioGroup>
              </Box>
            )}

            {activeStep === 1 && (
              <Box>
                <Typography
                  variant="h6"
                  sx={{ color: "#1F2937", mb: 2, fontSize: "1.1rem" }}
                >
                  Complete Your Payment
                </Typography>
                <Typography
                  sx={{ color: "#6B7280", mb: 2, fontSize: "0.9rem" }}
                >
                  Enter your payment details to confirm the booking.
                </Typography>
                {clientSecret && stripePromise && (
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <CheckoutForm
                      onPaymentSuccess={() => setActiveStep(2)}
                      onPaymentError={(errorMsg) => setBookingError(errorMsg)}
                    />
                  </Elements>
                )}
              </Box>
            )}

            {activeStep === 2 && (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <CheckCircleIcon color="success" sx={{ fontSize: 60 }} />
                <Typography
                  variant="h5"
                  sx={{ mt: 2, color: "#1F2937", fontSize: "1.25rem" }}
                >
                  Booking Confirmed!
                </Typography>
                <Typography sx={{ color: "#6B7280", fontSize: "0.9rem" }}>
                  We have received your request and will assign a provider
                  shortly.
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>

        {/* The DialogActions are also outside the scrollable area and will remain fixed. */}
        <DialogActions
          sx={{
            p: 2,
            justifyContent: "center",
            bgcolor: "#F9FAFB",
            borderTop: "1px solid #E5E7EB",
          }}
        >
          {activeStep < 2 ? (
            <Button onClick={handleCloseBooking} sx={{ color: "#4F46E5" }}>
              Cancel
            </Button>
          ) : null}

          {activeStep === 1 && (
            <Button onClick={() => setActiveStep(0)} sx={{ color: "#4F46E5" }}>
              Back
            </Button>
          )}

          {activeStep === 0 && (
            <Button
              variant="contained"
              onClick={handleCreateBookingAndProceed}
              disabled={bookingLoading || !user?.phone}
              sx={{ bgcolor: "#4F46E5", "&:hover": { bgcolor: "#4338CA" } }}
            >
              {bookingLoading ? (
                <CircularProgress size={24} color="inherit" />
              ) : paymentMethod === "Stripe" ? (
                "Proceed to Payment"
              ) : (
                "Confirm Booking"
              )}
            </Button>
          )}

          {activeStep === 2 && (
            <Button
              variant="contained"
              onClick={() => {
                handleCloseBooking();
                navigate("/profile");
              }}
              sx={{ bgcolor: "#4F46E5", "&:hover": { bgcolor: "#4338CA" } }}
            >
              View My Bookings
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ServiceDetails;

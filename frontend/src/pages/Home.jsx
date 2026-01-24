import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Carousel from 'react-material-ui-carousel';
import { ServicesContext } from '../context/ServicesContext';
import {
  Button, Card, CardActionArea, CardContent, CardMedia, Typography, Box, CircularProgress, Alert, Container, Grid, Paper,
  Autocomplete, TextField, InputAdornment, Accordion, AccordionSummary, AccordionDetails, Skeleton, Avatar, Rating,
} from '@mui/material';
import {
  Search as SearchIcon, ArrowForward as ArrowForwardIcon, ExpandMore as ExpandMoreIcon, EventAvailable as EventAvailableIcon,
  PinDrop as PinDropIcon, DoneAll as DoneAllIcon, VerifiedUser as VerifiedUserIcon, CalendarMonth as CalendarMonthIcon,
  Shield as ShieldIcon, SupportAgent as SupportAgentIcon, Payment as PaymentIcon, Percent as PercentIcon, ArrowBack as ArrowBackIcon,
  SentimentVerySatisfied as SentimentVerySatisfiedIcon, CurrencyRupee as CurrencyRupeeIcon, CleanHands as CleanHandsIcon,
  Plumbing as PlumbingIcon, Bolt as BoltIcon, Kitchen as KitchenIcon, FormatPaint as FormatPaintIcon, Carpenter as CarpenterIcon,
  BugReport as BugReportIcon, Yard as YardIcon, Group as GroupIcon, Handshake as HandshakeIcon, Star as StarIcon
} from '@mui/icons-material';
import axios from 'axios';
import io from 'socket.io-client';
import '../styles/Home.css'; 
import partener1 from '../assets/partener-1.png';
import partener3 from '../assets/partener-3.png';
import partener4 from '../assets/partener-4.png';
import partener5 from '../assets/partener-5.png';
import partener6 from '../assets/partener-6.png';
import plumbingImg from "../assets/plumbing-image.jpg";
import paintingImg from '../assets/paintaing.png';

const partners = [
  { name: 'Urban Company', logo: partener1 },
  { name: 'Housejoy', logo: 'https://d2dgt4tr79mk87.cloudfront.net/manufacturer/Agri.png' },
  { name: 'Angi', logo: partener3 },
  { name: 'Thumbtack', logo: partener4 },
  { name: 'Mr Right', logo: partener5 },
  { name: 'Joboy', logo: partener6 },
];

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const categories = [
  { name: 'Cleaning', icon: <CleanHandsIcon sx={{ fontSize: 40 }} /> },
  { name: 'Plumbing', icon: <PlumbingIcon sx={{ fontSize: 40 }} /> },
  { name: 'Electrical', icon: <BoltIcon sx={{ fontSize: 40 }} /> },
  { name: 'Appliances', icon: <KitchenIcon sx={{ fontSize: 40 }} /> },
  { name: 'Painting', icon: <FormatPaintIcon sx={{ fontSize: 40 }} /> },
  { name: 'Carpentry', icon: <CarpenterIcon sx={{ fontSize: 40 }} /> },
  { name: 'Pest Control', icon: <BugReportIcon sx={{ fontSize: 40 }} /> },
  { name: 'Gardening', icon: <YardIcon sx={{ fontSize: 40 }} /> },
];

const blogPosts = [
  {
    id: 1,
    title: "5 Essential Plumbing Tips for Every Homeowner",
    excerpt: "Prevent common plumbing disasters with these simple, actionable tips that can save you...",
    image: plumbingImg,
    fullContent: "To prevent clogs, never pour grease down the drain. Use a drain strainer to catch hair and food particles. Once a month, flush drains with a mix of hot water and vinegar. Regularly check for leaks under sinks and around toilets to catch problems early. Finally, know where your main water shut-off valve is in case of an emergency.",
  },
  {
    id: 2,
    title: "How to Choose the Right Paint for Your Walls",
    excerpt: "Choosing the right paint is more than just picking a color. We break down the different types...",
    image: paintingImg,
    fullContent: "For high-traffic areas like hallways and kitchens, choose a satin or semi-gloss finish. For bedrooms, a matte or eggshell finish provides a smooth look. Always use a primer before painting, especially when covering a dark color.",
  },
];

const faqs = [
  { question: 'How do I book a service?', answer: 'Simply select your service, choose a time, and confirm. Your profile details are used automatically for a fast checkout!' },
  { question: 'Are the service providers background-checked?', answer: 'Absolutely. Every professional on our platform undergoes a rigorous verification process, including background checks.' },
  { question: 'What if I am not satisfied with the service?', answer: 'Your satisfaction is our priority. If you are not happy, contact our support team within 24 hours.' },
];

const scrollingServices = [
  { name: 'Plumbing', image: 'https://cdn-icons-png.flaticon.com/128/3013/3013774.png' },
  { name: 'Electrician', image: 'https://cdn-icons-png.flaticon.com/128/1048/1048943.png' },
  { name: 'Cleaning', image: 'https://cdn-icons-png.flaticon.com/128/2966/2966279.png' },
  { name: 'Painting', image: 'https://cdn-icons-png.flaticon.com/128/69/69842.png' },
  { name: 'Carpentry', image: 'https://cdn-icons-png.flaticon.com/128/2179/2179373.png' },
  { name: 'AC Repair', image: 'https://cdn-icons-png.flaticon.com/128/816/816922.png' },
];

const StatsSection = ({ stats }) => {
  const statItems = [
    { label: 'Happy Customers', value: stats.totalCustomers || '1,200+', icon: <GroupIcon /> },
    { label: 'Services Completed', value: stats.totalBookings || '4,500+', icon: <EventAvailableIcon /> },
    { label: 'Expert Partners', value: stats.totalProviders || '150+', icon: <HandshakeIcon /> },
    { label: 'Average Rating', value: '4.8/5', icon: <StarIcon /> },
  ];

  return (
    <Box sx={{ bgcolor: 'white', py: 4, borderBottom: '1px solid #edf2f7' }}>
      <Container>
        <Grid container spacing={2}>
          {statItems.map((item, idx) => (
            <Grid item xs={6} md={3} key={idx}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#4F46E5' }}>{item.value}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, color: 'text.secondary' }}>
                  {item.icon}
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.label}</Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

const HeroSection = ({ handleNavigation }) => (
  <Box component="section" sx={{ 
    background: 'linear-gradient(135deg, #4F46E5, #A855F7, #EC4899)', 
    color: 'white', 
    py: { xs: 8, md: 12, lg: 15 }, // Responsive vertical padding
    textAlign: 'center',
    width: '100%'
  }}>
    <Container>
      <Typography variant="h1" sx={{ fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4rem' }, fontWeight: 800, mb: 2, lineHeight: 1.2 }}>
        Professional Home Services,<br /> On Your Schedule
      </Typography>
      <Typography variant="h5" sx={{ mb: 5, opacity: 0.9, maxWidth: '800px', mx: 'auto', px: 2 }}>
        Book highly-rated professionals for cleaning, plumbing, electrical work and more in just 60 seconds.
      </Typography>
      <Button
        variant="contained"
        size="large"
        sx={{ bgcolor: 'white', color: '#4F46E5', '&:hover': { bgcolor: '#F3F4F6' }, fontWeight: 'bold', py: 2, px: 6, borderRadius: 10, fontSize: '1.1rem', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}
        onClick={() => handleNavigation('/services')}
      >
        Explore Services
      </Button>
    </Container>
  </Box>
);

const ServiceMarquee = () => {
  const extendedServices = [...scrollingServices, ...scrollingServices, ...scrollingServices];
  return (
    <Box sx={{ py: 3, bgcolor: '#fdfdfd', borderBottom: '1px solid #E5E7EB' }}>
      <Box sx={{ overflow: 'hidden' }}>
        <Box className="marquee-content" sx={{ display: 'flex', animation: 'marquee 30s linear infinite' }}>
          {extendedServices.map((service, index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', mx: 5, minWidth: 140 }}>
              <img src={service.image} alt={service.name} style={{ height: '32px', marginRight: '12px' }} />
              <Typography sx={{ fontWeight: 600, color: '#374151' }}>{service.name}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

const AdvantageSection = () => {
  const items = [
    { icon: <CalendarMonthIcon />, text: 'ON DEMAND' },
    { icon: <VerifiedUserIcon />, text: 'VERIFIED PARTNERS' },
    { icon: <ShieldIcon />, text: 'SERVICE WARRANTY' },
    { icon: <PercentIcon />, text: 'TRANSPARENT PRICING' },
    { icon: <PaymentIcon />, text: 'SECURE PAYMENTS' },
    { icon: <SupportAgentIcon />, text: '24/7 SUPPORT' },
  ];
  return (
    <Box component="section" sx={{ py: 8, bgcolor: 'white' }}>
      <Container>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 6, textAlign: 'center', letterSpacing: -0.5 }}>
          THE SERVICEHUB ADVANTAGE
        </Typography>
        <Grid container spacing={2} justifyContent="center">
          {items.map(item => (
            <Grid item xs={4} sm={4} md={2} key={item.text}>
              <Box sx={{ textAlign: 'center' }}>
                <Box sx={{ fontSize: 40, mb: 1, color: '#4F46E5' }}>{item.icon}</Box>
                <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', color: '#4b5563' }}>{item.text}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

const ServiceExplorerSection = ({ services, searchQuery, setSearchQuery, selectedCategory, setSelectedCategory }) => (
  <Box component="section" sx={{ py: 10, bgcolor: '#F9FAFB' }}>
    <Container>
      <Typography variant="h4" sx={{ fontWeight: 800, textAlign: 'center', mb: 1 }}>Find the Perfect Service</Typography>
      <Typography sx={{ textAlign: 'center', color: 'text.secondary', mb: 6 }}>Search through our curated list of professional services</Typography>
      <Box sx={{ maxWidth: '650px', mx: 'auto', mb: 6 }}>
        <Autocomplete
          fullWidth
          freeSolo
          options={services}
          getOptionLabel={(option) => option.name || ""}
          onInputChange={(e, val) => setSearchQuery(val)}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="What do you need help with?"
              sx={{ bgcolor: 'white', borderRadius: 2 }}
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="primary" />
                  </InputAdornment>
                ),
              }}
            />
          )}
        />
      </Box>
      <Grid container spacing={2} justifyContent="center">
        {categories.map((cat) => (
          <Grid item xs={3} sm={4} md={1.5} key={cat.name}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: 4,
                border: '1px solid',
                borderColor: selectedCategory === cat.name ? '#4F46E5' : '#E5E7EB',
                '&:hover': { boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', transform: 'translateY(-4px)' },
                transition: '0.3s',
                cursor: 'pointer',
                bgcolor: selectedCategory === cat.name ? '#EEF2FF' : 'white',
                p: 2,
                textAlign: 'center'
              }}
              onClick={() => setSelectedCategory(prev => prev === cat.name ? '' : cat.name)}
            >
              <Box sx={{ color: selectedCategory === cat.name ? '#4F46E5' : '#6B7280' }}>
                {cat.icon}
                <Typography sx={{ fontWeight: 600, mt: 1, fontSize: '0.8rem' }}>{cat.name}</Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Container>
  </Box>
);

const FeaturedServicesSection = ({ featuredServices, getImageUrl, handleNavigation, loading }) => {
    return (
        <Box component="section" sx={{ py: 10, bgcolor: 'white' }}>
            <Container>
                <Typography variant="h4" sx={{ fontWeight: 800, textAlign: 'center', color: '#1F2937', mb: 6 }}>
                    Most Popular Services
                </Typography>
                {loading ? (
                    <Grid container spacing={4} justifyContent="center">
                        {[1, 2, 3].map((_, index) => (
                            <Grid item xs={12} sm={6} md={4} key={index}>
                                <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 4 }} />
                            </Grid>
                        ))}
                    </Grid>
                ) : (
                    featuredServices.length > 0 && (
                        <Carousel autoPlay interval={5000} animation="slide" navButtonsAlwaysVisible sx={{ borderRadius: 4, overflow: 'hidden' }}>
                            {featuredServices.map(service => (
                                <Paper key={service._id} sx={{ position: 'relative', height: 450 }}>
                                    <CardMedia
                                        component="img"
                                        image={getImageUrl(service.image)}
                                        sx={{ height: '100%', objectFit: 'cover' }}
                                    />
                                    <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: 6, color: 'white', background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)' }}>
                                        <Typography variant="h4" sx={{ fontWeight: 800 }}>{service.name}</Typography>
                                        <Button variant="contained" size="large" sx={{ mt: 3, px: 4, borderRadius: 2, bgcolor: '#4F46E5' }} onClick={() => handleNavigation(`/services/${service._id}`)}>
                                            Book Now
                                        </Button>
                                    </Box>
                                </Paper>
                            ))}
                        </Carousel>
                    )
                )}
            </Container>
        </Box>
    );
};

const HowItWorksSection = () => {
  const steps = [
    { icon: <EventAvailableIcon sx={{ fontSize: 45 }} />, title: "1. Pick Service", desc: "Select from 50+ services" },
    { icon: <PinDropIcon sx={{ fontSize: 45 }} />, title: "2. Set Schedule", desc: "Choose date and time" },
    { icon: <DoneAllIcon sx={{ fontSize: 45 }} />, title: "3. Service Delivery", desc: "Relax while experts work" },
  ];
  return (
    <Box component="section" sx={{ py: 12, bgcolor: '#F9FAFB' }}>
      <Container>
        <Typography variant="h4" sx={{ fontWeight: 800, textAlign: 'center', mb: 8 }}>How It Works</Typography>
        <Grid container spacing={4} justifyContent="center">
          {steps.map((step, index) => (
            <Grid item xs={12} md={3.5} key={index}>
              <Paper elevation={0} sx={{ p: 5, textAlign: 'center', borderRadius: 4, border: '1px solid #E5E7EB' }}>
                <Box sx={{ color: '#4F46E5', mb: 3 }}>{step.icon}</Box>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>{step.title}</Typography>
                <Typography variant="body2" color="text.secondary">{step.desc}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

const GuaranteesSection = () => {
  const guarantees = [
    { icon: <VerifiedUserIcon />, title: "Verified Pros", description: "Background checked and experts." },
    { icon: <CurrencyRupeeIcon />, title: "Fixed Prices", description: "Know the cost before you book." },
    { icon: <SentimentVerySatisfiedIcon />, title: "100% Quality", description: "Insurance and re-work cover." },
  ];
  return (
    <Box component="section" sx={{ py: 10, bgcolor: 'white' }}>
      <Container>
        <Grid container spacing={6}>
          {guarantees.map(item => (
            <Grid item xs={12} md={4} key={item.title}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ color: '#4F46E5', fontSize: 40 }}>{item.icon}</Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>{item.title}</Typography>
                  <Typography variant="body2" sx={{ color: '#6B7280' }}>{item.description}</Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

const FeedbackSection = ({ feedbacks, getImageUrl, feedbackLoading }) => {
    return (
        <Box component="section" sx={{ py: 12, bgcolor: '#F9FAFB' }}>
            <Container>
                <Typography variant="h4" sx={{ fontWeight: 800, textAlign: 'center', mb: 8 }}>Customer Experiences</Typography>
                <Grid container spacing={4}>
                    {feedbackLoading ? [1,2,3].map(i => <Grid item xs={12} md={4} key={i}><Skeleton height={200}/></Grid>) :
                    feedbacks.slice(0, 3).map(feedback => (
                        <Grid item xs={12} md={4} key={feedback._id}>
                            <Paper sx={{ p: 4, borderRadius: 4, height: '100%' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <Avatar src={getImageUrl(feedback.bookingId?.customer?.profile?.image)} sx={{ width: 50, height: 50, mr: 2 }} />
                                    <Typography sx={{ fontWeight: 700 }}>{feedback.bookingId?.customer?.name || 'User'}</Typography>
                                </Box>
                                <Rating value={feedback.rating} readOnly size="small" sx={{ mb: 2 }} />
                                <Typography variant="body2" sx={{ fontStyle: 'italic', color: '#4b5563' }}>"{feedback.comment}"</Typography>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>
            </Container>
        </Box>
    );
};

const TrustedPartnersSection = () => (
  <Box component="section" sx={{ py: 8, bgcolor: 'white' }}>
    <Container>
      <Typography variant="overline" sx={{ fontWeight: 800, color: '#4b5563', textAlign: 'center', display: 'block', mb: 4 }}>
        TRUSTED BY INDUSTRY LEADERS
      </Typography>
      <Box sx={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
        <Box 
          className="marquee-content" 
          sx={{ 
            display: 'flex', 
            animation: 'marquee 25s linear infinite', 
            width: 'max-content' 
          }}
        >
          {/* Doubling the map ensures the loop is continuous without gaps */}
          {[...partners, ...partners].map((p, i) => (
            <Box 
              key={i} 
              component="img" 
              src={p.logo} 
              alt={p.name} 
              sx={{ 
                height: 50, 
                mx: 5, 
                filter: 'none', // Logic to make logos colorful/visible
                opacity: 1      // Logic to remove the light/faded look
              }} 
            />
          ))}
        </Box>
      </Box>
    </Container>
  </Box>
);





















const Home = () => {
  const navigate = useNavigate();
  const { services, loading, message } = useContext(ServicesContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [liveStats, setLiveStats] = useState({});
  const [feedbacks, setFeedbacks] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const { token } = useSelector((state) => state.auth);

  const fetchFeedbacks = useCallback(async () => {
    if (!token) {
      setFeedbackLoading(false);
      return; 
    }
    setFeedbackLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/feedback`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFeedbacks(response.data || []);
    } catch (error) {
      setErrorMessage('Could not load customer feedback.');
    } finally {
      setFeedbackLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const fetchLiveStats = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/dashboard/stats`);
        setLiveStats(res.data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };
    fetchLiveStats();
    fetchFeedbacks();
    const socket = io(API_URL);
    socket.on('statsUpdated', fetchLiveStats);
    socket.on('feedbacksUpdated', fetchFeedbacks);
    return () => socket.disconnect();
  }, [fetchFeedbacks]);

  const handleNavigation = (path) => navigate(path);
  const filteredServices = services.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) && (selectedCategory ? s.category === selectedCategory : true));
  const getImageUrl = (image) => image || 'https://via.placeholder.com/400';

  if (message.open || errorMessage) {
    return (
      <Container sx={{ mt: 15 }}>
        <Alert severity="error">{message.open ? message.text : errorMessage}</Alert>
      </Container>
    );
  }

  return (
    /* FIXED: Added 'mt' (margin-top) to ensure the entire page starts AFTER the fixed Navbar height */
    <Box component="main" sx={{ 
      bgcolor: 'white', 
      mt: { xs: '64px', md: '75px', lg: '85px' } // Responsive margin-top to match navbar height
    }}>
      {/* 1. Hero Section - Now starts correctly below Navbar */}
      <HeroSection handleNavigation={handleNavigation} />

      {/* 2. Professional Stats Section */}
      <StatsSection stats={liveStats} />

      {/* 3. Dynamic Marquee */}
      <ServiceMarquee />

      {/* 4. Advantage Cards */}
      <AdvantageSection />

      {/* 5. Explorer Search */}
      <ServiceExplorerSection
        services={services}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
      />

      {/* 6. Popular Services Carousel */}
      <FeaturedServicesSection
        featuredServices={filteredServices.slice(0, 5)}
        getImageUrl={getImageUrl}
        handleNavigation={handleNavigation}
        loading={loading}
      />

      {/* 7. Process & Social Proof */}
      <HowItWorksSection />
      <GuaranteesSection />
      <FeedbackSection 
        feedbacks={feedbacks} 
        getImageUrl={getImageUrl} 
        feedbackLoading={feedbackLoading}
      />
      
      <TrustedPartnersSection />



      {/* 8. Call to Action */}
      <Box sx={{ py: 12, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: 'white', textAlign: 'center' }}>
        <Container>
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 4 }}>Ready to experience better living?</Typography>
          <Button
            variant="contained"
            size="large"
            sx={{ bgcolor: 'white', color: '#4F46E5', fontWeight: 800, px: 6, py: 2, borderRadius: 10 }}
            onClick={() => handleNavigation('/services')}
          >
            Book Now
          </Button>
        </Container>
      </Box>
    </Box>
  );
};

export default Home;
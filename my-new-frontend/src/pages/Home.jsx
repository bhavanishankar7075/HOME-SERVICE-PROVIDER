import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Carousel from 'react-material-ui-carousel';
import { ServicesContext } from '../context/ServicesContext';
import {
  Button, Card, CardActionArea, CardContent, CardMedia, Typography, Box, CircularProgress, Alert, Container, Grid, Paper,
  Autocomplete, TextField, InputAdornment, Accordion, AccordionSummary, AccordionDetails, Skeleton, Avatar, Rating,
} from '@mui/material';
// No longer importing or returning LoadingScreen: import LoadingScreen from '../components/LoadingScreen'; 
import {
  Search as SearchIcon, ArrowForward as ArrowForwardIcon, ExpandMore as ExpandMoreIcon, EventAvailable as EventAvailableIcon,
  PinDrop as PinDropIcon, DoneAll as DoneAllIcon, VerifiedUser as VerifiedUserIcon, CalendarMonth as CalendarMonthIcon,
  Shield as ShieldIcon, SupportAgent as SupportAgentIcon, Payment as PaymentIcon, Percent as PercentIcon, ArrowBack as ArrowBackIcon,
  SentimentVerySatisfied as SentimentVerySatisfiedIcon, CurrencyRupee as CurrencyRupeeIcon, CleanHands as CleanHandsIcon,
  Plumbing as PlumbingIcon, Bolt as BoltIcon, Kitchen as KitchenIcon, FormatPaint as FormatPaintIcon, Carpenter as CarpenterIcon,
  BugReport as BugReportIcon, Yard as YardIcon,
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

const announcements = [
  'Limited Time: 25% off!',
  'New same-day plumbing services available!',
  'Join our loyalty program for discounts!',
];

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
    fullContent: "To prevent clogs, never pour grease down the drain. Use a drain strainer to catch hair and food particles. Once a month, flush drains with a mix of hot water and vinegar. Regularly check for leaks under sinks and around toilets to catch problems early. Finally, know where your main water shut-off valve is in case of an emergency. Following these steps can save you from costly repairs.",
  },
  {
    id: 2,
    title: "How to Choose the Right Paint for Your Walls",
    excerpt: "Choosing the right paint is more than just picking a color. We break down the different types...",
    image: paintingImg,
    fullContent: "For high-traffic areas like hallways and kitchens, choose a satin or semi-gloss finish as they are easier to clean. For bedrooms and living rooms, a matte or eggshell finish provides a smooth, low-reflection look. Always use a primer before painting, especially when covering a dark color with a lighter one. Consider using low-VOC or zero-VOC paints for better indoor air quality.",
  },
];

const faqs = [
  { question: 'How do I book a service?', answer: 'Simply select your service, choose a time, and confirm. Your profile details are used automatically for a fast checkout!' },
  { question: 'Are the service providers background-checked?', answer: 'Absolutely. Every professional on our platform undergoes a rigorous verification process, including background checks, to ensure your safety and peace of mind.' },
  { question: 'What if I am not satisfied with the service?', answer: 'Your satisfaction is our priority. If you are not happy with the service, please contact our support team within 24 hours, and we will arrange a rework or provide a suitable resolution.' },
  { question: 'What is your cancellation policy?', answer: 'You can cancel any booking free of charge up to 24 hours before the scheduled service time. Cancellations made within 24 hours may be subject to a small fee.' },
];

const scrollingServices = [
  { name: 'Plumbing', image: 'https://cdn-icons-png.flaticon.com/128/3013/3013774.png' },
  { name: 'Electrician', image: 'https://cdn-icons-png.flaticon.com/128/1048/1048943.png' },
  { name: 'Cleaning', image: 'https://cdn-icons-png.flaticon.com/128/2966/2966279.png' },
  { name: 'Painting', image: 'https://cdn-icons-png.flaticon.com/128/69/69842.png' },
  { name: 'Carpentry', image: 'https://cdn-icons-png.flaticon.com/128/2179/2179373.png' },
  { name: 'AC Repair', image: 'https://cdn-icons-png.flaticon.com/128/816/816922.png' },
];

const HeroSection = ({ handleNavigation }) => (
  <Box component="section" sx={{ background: 'linear-gradient(135deg, #4F46E5, #A855F7, #EC4899)', color: 'white', py: { xs: 12, md: 16 }, textAlign: 'center' }}>
    <Container>
      <Typography variant="h1" sx={{ fontSize: { xs: '2.5rem', sm: '3.5rem' }, fontWeight: 'bold' }}>
        Reliable Home Services, On Demand
      </Typography>
      <Typography variant="h5" sx={{ my: 4, maxWidth: '800px', mx: 'auto' }}>
        Your trusted partner for top-quality professionals.
      </Typography>
      <Button
        variant="contained"
        size="large"
        sx={{ bgcolor: 'white', color: '#4F46E5', '&:hover': { bgcolor: '#F3F4F6' }, fontWeight: 'bold', py: 1.5, px: 4, borderRadius: 8 }}
        onClick={() => handleNavigation('/services')}
      >
        Explore Services
      </Button>
    </Container>
  </Box>
);

const ServiceMarquee = () => {
  const extendedServices = [...scrollingServices, ...scrollingServices, ...scrollingServices]; // Triple copy for smoother loop
  return (
    <Box sx={{ py: 4, bgcolor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
      <Box sx={{ overflow: 'hidden' }}>
        <Box className="marquee-content" sx={{ display: 'flex', animation: 'marquee 35s linear infinite' }}>
          {extendedServices.map((service, index) => (
            <Box key={index} sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              mx: 4,
              minWidth: 150 
            }}>
              <img src={service.image} alt={service.name} style={{ height: '48px', marginBottom: '8px' }} />
              <Typography sx={{ fontWeight: 'medium', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                {service.name}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};


const AdvantageSection = () => {
  const items = [
    { icon: <CalendarMonthIcon />, text: 'ON DEMAND / SCHEDULED' },
    { icon: <VerifiedUserIcon />, text: 'VERIFIED PARTNERS' },
    { icon: <ShieldIcon />, text: 'SERVICE WARRANTY' },
    { icon: <PercentIcon />, text: 'TRANSPARENT PRICING' },
    { icon: <PaymentIcon />, text: 'ONLINE PAYMENTS' },
    { icon: <SupportAgentIcon />, text: 'SUPPORT' },
  ];
  return (
    <Box component="section" sx={{ py: { xs: 6, md: 8 }, bgcolor: 'white' }}>
      <Container>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 5, textAlign: 'center' }}>
          THE SERVICEHUB ADVANTAGE
        </Typography>
        <Grid container spacing={{ xs: 2, md: 0 }} justifyContent="center">
          {items.map(item => (
            <Grid item xs={4} sm={4} md={2} key={item.text}>
              <Box sx={{ textAlign: 'center', p: { xs: 1, sm: 2 } }}>
                <Box sx={{ fontSize: 40, mb: 1, color: 'primary.main' }}>{item.icon}</Box>
                <Typography variant="body2" sx={{ fontWeight: '600', fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>{item.text}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};


const ServiceExplorerSection = ({ services, searchQuery, setSearchQuery, selectedCategory, setSelectedCategory }) => (
  <Box component="section" sx={{ py: { xs: 8, md: 10 }, bgcolor: '#F9FAFB' }}>
    <Container>
      <Typography variant="h4" sx={{ fontWeight: 'bold', textAlign: 'center' }}>Find the Perfect Service</Typography>
      <Typography sx={{ textAlign: 'center', color: 'text.secondary', mb: 4 }}>Get instant suggestions for what you need.</Typography>
      <Box sx={{ maxWidth: '700px', mx: 'auto', mb: 5 }}>
        <Autocomplete
          fullWidth
          freeSolo
          options={services}
          getOptionLabel={(option) => option.name || ""}
          onInputChange={(e, val) => setSearchQuery(val)}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Search for 'AC Repair'..."
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
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
                borderRadius: 3,
                border: '1px solid',
                borderColor: selectedCategory === cat.name ? 'primary.main' : '#E5E7EB',
                '&:hover': { boxShadow: 4, transform: 'translateY(-4px)' },
                transition: 'all 0.2s ease-in-out',
                cursor: 'pointer',
                bgcolor: selectedCategory === cat.name ? 'primary.lighter' : 'white',
                height: '100%',
              }}
              onClick={() => setSelectedCategory(prev => prev === cat.name ? '' : cat.name)}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 2, height: '100%', color: selectedCategory === cat.name ? 'primary.main' : 'text.primary' }}>
                {cat.icon}
                <Typography sx={{ fontWeight: 'medium', mt: 1, textAlign: 'center', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{cat.name}</Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Container>
  </Box>
);

const FeaturedServicesSection = ({ featuredServices, getImageUrl, handleNavigation, loading }) => {
    // Render Skeletons if loading is true, otherwise render the Carousel
    const placeholderCount = 3;
    const isReady = featuredServices.length > 0 && !loading;

    return (
        <Box component="section" sx={{ py: { xs: 8, md: 10 }, bgcolor: 'white' }}>
            <Container>
                <Typography variant="h4" sx={{ fontWeight: 'bold', textAlign: 'center', color: '#1F2937', mb: 8 }}>
                    Our Most Popular Services
                </Typography>

                {loading ? (
                    // Skeleton/Placeholder for loading state
                    <Grid container spacing={4} justifyContent="center">
                        {Array.from({ length: placeholderCount }).map((_, index) => (
                            <Grid item xs={12} sm={6} md={4} key={index}>
                                <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 4 }} />
                                <Box sx={{ pt: 0.5 }}>
                                    <Skeleton />
                                    <Skeleton width="60%" />
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                ) : (
                    // Actual Carousel when ready
                    featuredServices.length > 0 && (
                        <Carousel autoPlay interval={5000} animation="slide" navButtonsAlwaysVisible sx={{ borderRadius: 4, boxShadow: 6, overflow: 'hidden' }}>
                            {featuredServices.map(service => (
                                <Paper key={service._id} sx={{ position: 'relative', overflow: 'hidden', '&:hover .zoom-image': { transform: 'scale(1.1)' } }}>
                                    <CardMedia
                                        component="img"
                                        image={getImageUrl(service.image)}
                                        className="zoom-image"
                                        sx={{ height: 400, objectFit: 'cover', transition: 'transform 0.4s ease' }}
                                    />
                                    <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: 4, color: 'white', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
                                        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>{service.name}</Typography>
                                        <Button variant="contained" sx={{ mt: 2 }} onClick={() => handleNavigation(`/services/${service._id}`)}>
                                            Book Now
                                        </Button>
                                    </Box>
                                </Paper>
                            ))}
                        </Carousel>
                    )
                )}
                {!loading && featuredServices.length === 0 && (
                    <Typography sx={{ textAlign: 'center', color: 'text.secondary' }}>
                        No featured services available at the moment.
                    </Typography>
                )}
            </Container>
        </Box>
    );
};


const HowItWorksSection = () => {
  const steps = [
    { icon: <EventAvailableIcon sx={{ fontSize: 40 }} />, title: "1. Pick Your Service & Time" },
    { icon: <PinDropIcon sx={{ fontSize: 40 }} />, title: "2. Confirm Your Details ToPlace Services" },
    { icon: <DoneAllIcon sx={{ fontSize: 40 }} />, title: "3. Relax as We Handle It Carefully" },
  ];
  return (
    <Box component="section" sx={{ py: { xs: 8, md: 12 }, bgcolor: '#F9FAFB' }}>
      <Container>
        <Typography variant="h4" sx={{ fontWeight: 'bold', textAlign: 'center', mb: 8 }}>
          Your Hassle-Free Booking Flow
        </Typography>
        <Grid container spacing={{ xs: 4, sm: 3, md: 4 }} alignItems="center" justifyContent="center">
          {steps.map((step, index) => (
            <React.Fragment key={step.title}>
              <Grid item xs={12} sm={4} md={index === 1 ? 4 : 3.5}>
                <Paper elevation={6} sx={{ p: 4, textAlign: 'center', borderRadius: 4, height: '100%' }}>
                  <Box sx={{ color: 'primary.main', mb: 2 }}>{step.icon}</Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{step.title}</Typography>
                </Paper>
              </Grid>
              {index < 2 && (
                <Grid item md={0.5} sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', justifyContent: 'center' }}>
                  <ArrowForwardIcon sx={{ color: '#D1D5DB', fontSize: 40 }} />
                </Grid>
              )}
            </React.Fragment>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};


const GuaranteesSection = () => {
  const guarantees = [
    { icon: <VerifiedUserIcon color="primary" />, title: "Verified Professionals", description: "Every expert is background-checked and trained to ensure quality and safety." },
    { icon: <CurrencyRupeeIcon color="primary" />, title: "Transparent Pricing", description: "No hidden fees. You see the final price upfront before you book any service." },
    { icon: <SentimentVerySatisfiedIcon color="primary" />, title: "Satisfaction Guarantee", description: "We're not happy until you are. We promise to make it right if you're not satisfied." },
  ];
  return (
    <Box component="section" sx={{ py: { xs: 8, md: 12 }, bgcolor: 'white' }}>
      <Container>
        <Typography variant="h4" sx={{ fontWeight: 'bold', textAlign: 'center', color: '#1F2937', mb: 8 }}>
          Our Promise To You
        </Typography>
        <Grid container spacing={4}>
          {guarantees.map(item => (
            <Grid item xs={12} md={4} key={item.title}>
              <Box sx={{ textAlign: 'center' }}>
                <Box sx={{ fontSize: 50 }}>{item.icon}</Box>
                <Typography variant="h6" sx={{ fontWeight: 'bold', my: 2 }}>{item.title}</Typography>
                <Typography sx={{ color: '#6B7280' }}>{item.description}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

const FeedbackSection = ({ feedbacks, getImageUrl, feedbackLoading }) => {
    const placeholderCount = 3;

    return (
        <Box component="section" sx={{ py: { xs: 8, md: 12 }, bgcolor: '#F9FAFB' }}>
            <Container>
                <Typography variant="h4" sx={{ fontWeight: 'bold', textAlign: 'center', color: '#1F2937', mb: 8 }}>
                    What Our Customers Say
                </Typography>
                
                {feedbackLoading ? (
                    // Skeleton/Placeholder for loading state
                    <Grid container spacing={4} alignItems="stretch">
                        {Array.from({ length: placeholderCount }).map((_, index) => (
                            <Grid item xs={12} md={4} key={index}>
                                <Paper elevation={6} sx={{ p: 4, borderRadius: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <Skeleton variant="circular" width={56} height={56} sx={{ mr: 2 }} />
                                        <Box>
                                            <Skeleton width={100} height={20} />
                                            <Skeleton width={80} height={15} sx={{ mt: 0.5 }} />
                                        </Box>
                                    </Box>
                                    <Skeleton width="100%" height={24} sx={{ mb: 2 }} />
                                    <Skeleton variant="text" height={15} />
                                    <Skeleton variant="text" height={15} width="80%" />
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                ) : feedbacks.length > 0 ? (
                    // Actual feedback when ready
                    <Grid container spacing={4} alignItems="stretch">
                        {feedbacks.slice(0, 3).map(feedback => (
                            <Grid item xs={12} md={4} key={feedback._id}>
                                <Paper elevation={6} sx={{ p: 4, borderRadius: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <Avatar
                                            src={getImageUrl(feedback.bookingId?.customer?.profile?.image)}
                                            alt={feedback.bookingId?.customer?.name || 'Anonymous'}
                                            sx={{ width: 56, height: 56, mr: 2 }}
                                            onError={(e) => {
                                                e.target.src = `${API_URL}/images/default-user.png`;
                                            }}
                                        />
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                                {feedback.bookingId?.customer?.name || 'Anonymous'}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Rating value={Number(feedback.rating) || 0} readOnly sx={{ mb: 2 }} />
                                    <Typography variant="body1" sx={{ fontStyle: 'italic', color: 'text.secondary', flexGrow: 1 }}>
                                        "{feedback.comment || 'No comment provided'}"
                                    </Typography>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                ) : (
                    <Typography sx={{ textAlign: 'center', color: 'text.secondary' }}>
                        No customer reviews yet. Be the first!
                    </Typography>
                )}
            </Container>
        </Box>
    );
};


const BlogSection = () => {
  const [expandedBlogId, setExpandedBlogId] = useState(null);
  const selectedPost = blogPosts.find(p => p.id === expandedBlogId);

  const BlogListView = () => (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 'bold', textAlign: 'center', mb: 8 }}>
        Tips & Insights
      </Typography>
      <Grid container spacing={4} alignItems="stretch">
        {blogPosts.map(post => (
          <Grid item xs={12} md={6} key={post.id}>
            <Card elevation={2} sx={{ display: 'flex', flexDirection: 'column', borderRadius: 3, height: '100%', '&:hover': { boxShadow: 6 } }}>
              <CardMedia component="img" image={post.image} sx={{ height: 200 }} />
              <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', flexGrow: 1 }}>{post.title}</Typography>
                <Typography sx={{ my: 1, color: 'text.secondary' }}>{post.excerpt}</Typography>
                <Button onClick={() => setExpandedBlogId(post.id)} endIcon={<ArrowForwardIcon />} sx={{ alignSelf: 'flex-start' }}>
                  Read More
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  const BlogDetailView = () => (
    <Paper elevation={4} sx={{ p: { xs: 2, md: 4 }, borderRadius: 3 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => setExpandedBlogId(null)} sx={{ mb: 2 }}>
        Back to All Tips
      </Button>
      <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 2 }}>{selectedPost?.title}</Typography>
      <CardMedia component="img" image={selectedPost?.image} sx={{ borderRadius: 2, height: 300, mb: 3 }} />
      <Typography sx={{ lineHeight: 1.8 }}>{selectedPost?.fullContent}</Typography>
    </Paper>
  );

  return (
    <Box component="section" sx={{ py: { xs: 8, md: 10 }, bgcolor: 'white' }}>
      <Container>
        {expandedBlogId ? <BlogDetailView /> : <BlogListView />}
      </Container>
    </Box>
  );
};

const TrustedPartnersSection = () => {
  const extendedPartners = [...partners, ...partners];
  return (
    <Box component="section" sx={{ py: { xs: 8, md: 10 }, bgcolor: '#F9FAFB' }}>
      <Container>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#374151', mb: 5, textAlign: 'center' }}>
          OUR TRUSTED PARTNERS
        </Typography>
        <Box sx={{ overflow: 'hidden' }}>
          <Box className="marquee-content" sx={{ display: 'flex', alignItems: 'center', animation: 'marquee 40s linear infinite' }}>
            {extendedPartners.map((p, i) => (
              <Box
                key={i}
                component="img"
                src={p.logo}
                alt={p.name}
                sx={{
                  height: 60,
                  mx: 6,
                  objectFit: 'contain',
                  opacity: 0.9,
                  bgcolor: 'white',
                  transition: 'all 0.3s',
                  '&:hover': {
                    transform: 'scale(1.1)',
                    opacity: 1,
                    filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.2))',
                  },
                }}
              />
            ))}
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

const FaqSection = () => (
  <Box component="section" sx={{ py: { xs: 8, md: 10 }, bgcolor: 'white' }}>
    <Container maxWidth="md">
      <Typography variant="h4" sx={{ fontWeight: 'bold', textAlign: 'center', mb: 8 }}>
        Frequently Asked Questions
      </Typography>
      {faqs.map(faq => (
        <Accordion key={faq.question} sx={{ boxShadow: 1, borderRadius: 2, '&:before': { display: 'none' }, mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">{faq.question}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography sx={{ color: 'text.secondary' }}>{faq.answer}</Typography>
          </AccordionDetails>
        </Accordion>
      ))}
    </Container>
  </Box>
);

const CtaSection = ({ handleNavigation }) => (
  <Box component="section" sx={{ py: { xs: 12, md: 16 }, background: 'linear-gradient(135deg, #4F46E5, #A855F7)', color: 'white', textAlign: 'center' }}>
    <Container>
      <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
        Ready to Transform Your Home?
      </Typography>
      <Button
        variant="contained"
        size="large"
        sx={{ bgcolor: 'white', color: '#4F46E5', '&:hover': { bgcolor: '#F3F4F6' }, fontWeight: 'bold', py: 1.5, px: 5, mt: 4, borderRadius: 8 }}
        onClick={() => handleNavigation('/services')}
      >
        Book a Service Now
      </Button>
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
      // If token is missing, we still want to show the page structure, just without data
      setFeedbackLoading(false);
      return; 
    }
    setFeedbackLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/feedback`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFeedbacks(response.data || []);
      setErrorMessage(null);
    } catch (error) {
      console.error('Error fetching feedbacks:', error.response?.data?.message || error.message);
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
  const getImageUrl = (image) => image || 'https://via.placeholder.com/400?text=No+Image';

  // --- START MODIFIED LOADER LOGIC ---
  // The global error message logic can remain, as it's an application-level failure
  if (message.open || errorMessage) {
    return (
      <Box sx={{
        maxWidth: '1200px',
        mx: 'auto',
        p: 4,
        mt: '70px'
      }}>
        <Alert severity="error">{message.open ? message.text : errorMessage}</Alert>
      </Box>
    );
  }
  // --- END MODIFIED LOADER LOGIC ---

  
  const TOP_BANNER_HEIGHT = '50px'; 
  const NAVBAR_HEIGHT = '100px'; // Set this to your actual Navbar height (e.g., '56px' or '64px') 

  return (
    <Box sx={{
      bgcolor: '#F9FAFB',
      // The content starts below both the Navbar and the Fixed Banner
      pt: `calc(${NAVBAR_HEIGHT} + ${TOP_BANNER_HEIGHT})`, 
    }}>
      {/* 1. FIXED TOP BANNER with Marquee Animation */}
      <Box sx={{ 
        position: 'fixed', 
        top: NAVBAR_HEIGHT, // Banner sits below the Navbar
        left: 0, 
        width: '100%', 
        zIndex: 1100, 
        bgcolor: '#4F46E5', 
        color: 'white', 
        py: 1.5, 
        overflow: 'hidden',
        height: TOP_BANNER_HEIGHT,
        display: 'flex', 
        alignItems: 'center',
        boxShadow: 3 
      }}>
        <Box 
          className="marquee-content" 
          sx={{ 
            display: 'flex', 
            animation: 'marquee 15s linear infinite' 
          }}
        >
          {[...announcements, ...announcements].map((ann, i) => (
            <Typography key={i} sx={{ mx: 4, whiteSpace: 'nowrap', fontWeight: 'bold' }}>
              {ann}
            </Typography>
          ))}
        </Box>
      </Box>

      <main>
        <HeroSection handleNavigation={handleNavigation} />
        <ServiceMarquee />
        <AdvantageSection />
        <ServiceExplorerSection
          services={services}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
        />
        {/* Pass the loading state down to the components */}
        <FeaturedServicesSection
          featuredServices={filteredServices.slice(0, 5)}
          getImageUrl={getImageUrl}
          handleNavigation={handleNavigation}
          loading={loading} // <-- PASS LOADING STATE
        />
        <HowItWorksSection />
        <GuaranteesSection />
        {/* Pass the feedbackLoading state down to the component */}
        <FeedbackSection 
            feedbacks={feedbacks} 
            getImageUrl={getImageUrl} 
            feedbackLoading={feedbackLoading} // <-- PASS LOADING STATE
        />
        <BlogSection />
        <TrustedPartnersSection />
        <FaqSection />
        <CtaSection handleNavigation={handleNavigation} />
      </main>
    </Box>
  );
};

export default Home;
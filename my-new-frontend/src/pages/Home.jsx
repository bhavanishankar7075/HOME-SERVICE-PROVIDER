import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Carousel from 'react-material-ui-carousel';
import { ServicesContext } from '../context/ServicesContext';
import {
  Button, Card, CardActionArea, CardContent, CardMedia, Typography, Box, CircularProgress, Alert, Container, Grid, Paper,
  Autocomplete, TextField, InputAdornment, Accordion, AccordionSummary, AccordionDetails, Stack, Divider, Collapse, Avatar, Rating,
} from '@mui/material';
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
import plumbingImg from "../assets/plumbing-image .jpg";
import paintingImg from '../assets/paintaing.png'

const partners = [
  { name: 'Urban Company', logo: partener1 },
  { name: 'Housejoy', logo: 'https://d2dgt4tr79mk87.cloudfront.net/manufacturer/Agri.png' },
  { name: 'Angi', logo: partener3 },
  { name: 'Thumbtack', logo: partener4 },
  { name: 'Mr Right', logo: partener5 },
  { name: 'Joboy', logo: partener6 },
];



const API_URL = 'http://localhost:5000';

const announcements = [ 'Limited Time: 25% off!', 'New same-day plumbing services available!', 'Join our loyalty program for discounts!', ];
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
/* const partners = [
    { name: 'Urban Company', logo: ("../assets/partener-1.png") }, { name: 'Housejoy', logo: ("https://d2dgt4tr79mk87.cloudfront.net/manufacturer/Agri.png") },
    { name: 'Angi', logo: ('../assets/partener-3.png') }, { name: 'Thumbtack', logo: ('../assets/partener-4.png') },
    { name: 'Mr Right', logo: ('../assets/partener-5.png') }, { name: 'Joboy', logo: ('../assets/partener-6.png') },
];
 */

/* const blogPosts = [
    { id: 1, title: '5 Essential Plumbing Tips for Every Homeowner', excerpt: 'Prevent common plumbing disasters with these simple, actionable tips that can save you...', image: ('../assets/plumbing-image.png'), fullContent: 'To prevent clogs, never pour grease down the drain. Use a drain strainer to catch hair and food particles. Once a month, flush drains with a mix of hot water and vinegar. Regularly check for leaks under sinks and around toilets to catch problems early. Finally, know where your main water shut-off valve is in case of an emergency. Following these steps can save you from costly repairs.'},
    { id: 2, title: 'How to Choose the Right Paint for Your Walls', excerpt: 'Choosing the right paint is more than just picking a color. We break down the different types...', image: 'https://images.pexels.com/photos/5662857/pexels-photo-5662857.jpeg?auto=compress&cs=tinysrgb&w=600', fullContent: 'For high-traffic areas like hallways and kitchens, choose a satin or semi-gloss finish as they are easier to clean. For bedrooms and living rooms, a matte or eggshell finish provides a smooth, low-reflection look. Always use a primer before painting, especially when covering a dark color with a lighter one. Consider using low-VOC or zero-VOC paints for better indoor air quality.' },
]; */



const blogPosts = [
  {
    id: 1,
    title: "5 Essential Plumbing Tips for Every Homeowner",
    excerpt:
      "Prevent common plumbing disasters with these simple, actionable tips that can save you...",
    image: plumbingImg, // ✅ imported image
    fullContent:
      "To prevent clogs, never pour grease down the drain. Use a drain strainer to catch hair and food particles. Once a month, flush drains with a mix of hot water and vinegar. Regularly check for leaks under sinks and around toilets to catch problems early. Finally, know where your main water shut-off valve is in case of an emergency. Following these steps can save you from costly repairs.",
  },
  {
    id: 2,
    title: "How to Choose the Right Paint for Your Walls",
    excerpt:
      "Choosing the right paint is more than just picking a color. We break down the different types...",
    image:paintingImg, 
    fullContent:
      "For high-traffic areas like hallways and kitchens, choose a satin or semi-gloss finish as they are easier to clean. For bedrooms and living rooms, a matte or eggshell finish provides a smooth, low-reflection look. Always use a primer before painting, especially when covering a dark color with a lighter one. Consider using low-VOC or zero-VOC paints for better indoor air quality.",
  },
];


const faqs = [
    { question: 'How do I book a service?', answer: 'Simply select your service, choose a time, and confirm. Your profile details are used automatically for a fast checkout!' },
    { question: 'Are the service providers background-checked?', answer: 'Absolutely. Every professional on our platform undergoes a rigorous verification process, including background checks, to ensure your safety and peace of mind.' },
    { question: 'What if I am not satisfied with the service?', answer: 'Your satisfaction is our priority. If you are not happy with the service, please contact our support team within 24 hours, and we will arrange a rework or provide a suitable resolution.' },
    { question: 'What is your cancellation policy?', answer: 'You can cancel any booking free of charge up to 24 hours before the scheduled service time. Cancellations made within 24 hours may be subject to a small fee.' },
];
const scrollingServices = [
    { name: 'Plumbing', image: 'https://cdn-icons-png.flaticon.com/128/3013/3013774.png' }, { name: 'Electrician', image: 'https://cdn-icons-png.flaticon.com/128/1048/1048943.png' },
    { name: 'Cleaning', image: 'https://cdn-icons-png.flaticon.com/128/2966/2966279.png' }, { name: 'Painting', image: 'https://cdn-icons-png.flaticon.com/128/69/69842.png' },
    { name: 'Carpentry', image: 'https://cdn-icons-png.flaticon.com/128/2179/2179373.png' }, { name: 'AC Repair', image: 'https://cdn-icons-png.flaticon.com/128/816/816922.png' },
];

const HeroSection = ({ handleNavigation }) => (
    <Box component="section" sx={{ background: 'linear-gradient(135deg, #4F46E5, #A855F7, #EC4899)', color: 'white', py: { xs: 12, md: 16 }, textAlign: 'center' }}>
        <Container><Typography variant="h1" sx={{ fontSize: { xs: '2.5rem', sm: '3.5rem' }, fontWeight: 'bold' }}>Reliable Home Services, On Demand</Typography><Typography variant="h5" sx={{ my: 4, maxWidth: '800px', mx: 'auto' }}>Your trusted partner for top-quality professionals.</Typography><Button variant="contained" size="large" sx={{ bgcolor: 'white', color: '#4F46E5', '&:hover': { bgcolor: '#F3F4F6' }, fontWeight: 'bold', py: 1.5, px: 4, borderRadius: 8 }} onClick={() => handleNavigation('/services')}>Explore Services</Button></Container>
    </Box>
);

const ServiceMarquee = () => {
    const extendedServices = [...scrollingServices, ...scrollingServices];
    return (
        <Box sx={{ py: 4, bgcolor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
            <Box sx={{ overflow: 'hidden' }}>
                <Box className="marquee-content" sx={{ display: 'flex', animation: 'marquee 30s linear infinite' }}>
                    {extendedServices.map((service, index) => (
                        <Box key={index} sx={{ textAlign: 'center', mx: 4, minWidth: 150 }}>
                            <img src={service.image} alt={service.name} style={{ height: '48px' }} />
                            <Typography sx={{ fontWeight: 'medium', color: 'text.secondary', mt: 1 }}>{service.name}</Typography>
                        </Box>
                    ))}
                </Box>
            </Box>
        </Box>
    );
};

const AdvantageSection = () => {
    const items = [ { icon: <CalendarMonthIcon />, text: 'ON DEMAND / SCHEDULED' }, { icon: <VerifiedUserIcon />, text: 'VERIFIED PARTNERS' }, { icon: <ShieldIcon />, text: 'SERVICE WARRANTY' }, { icon: <PercentIcon />, text: 'TRANSPARENT PRICING' }, { icon: <PaymentIcon />, text: 'ONLINE PAYMENTS' }, { icon: <SupportAgentIcon />, text: 'SUPPORT' }, ];
    return (
        <Box component="section" sx={{ py: { xs: 6, md: 8 }, bgcolor: 'white' }}>
            <Container><Typography variant="h5" sx={{ fontWeight: 'bold', mb: 5, textAlign: 'center' }}>THE SERVICEHUB ADVANTAGE</Typography><Paper elevation={0} variant="outlined" sx={{ borderRadius: 3 }}><Stack direction="row" divider={<Divider orientation="vertical" flexItem />} justifyContent="space-around" sx={{ flexWrap: 'wrap', py: 3 }}>{items.map(item => (<Box key={item.text} sx={{ textAlign: 'center', p: 2, minWidth: 160 }}><Box sx={{ fontSize: 40, mb: 1 }}>{item.icon}</Box><Typography variant="body2" sx={{ fontWeight: '600' }}>{item.text}</Typography></Box>))}</Stack></Paper></Container>
        </Box>
    );
};

const ServiceExplorerSection = ({ services, searchQuery, setSearchQuery, selectedCategory, setSelectedCategory }) => (
    <Box component="section" sx={{ py: { xs: 8, md: 10 }, bgcolor: '#F9FAFB' }}>
        <Container><Typography variant="h4" sx={{ fontWeight: 'bold', textAlign: 'center' }}>Find the Perfect Service</Typography><Typography sx={{ textAlign: 'center', color: 'text.secondary', mb: 4 }}>Get instant suggestions for what you need.</Typography><Box sx={{ maxWidth: '700px', mx: 'auto', mb: 5 }}><Autocomplete fullWidth freeSolo options={services} getOptionLabel={(option) => option.name || ""} onInputChange={(e, val) => setSearchQuery(val)} renderInput={(params) => (<TextField {...params} placeholder="Search for 'AC Repair'..." InputProps={{ ...params.InputProps, startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>), }} />)}/></Box><Grid container spacing={2} justifyContent="center">{categories.map((cat) => (<Grid item xs={6} sm={4} md={1.5} key={cat.name}><Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: selectedCategory === cat.name ? 'primary.main' : '#E5E7EB', '&:hover': { boxShadow: 4, transform: 'translateY(-4px)' }, transition: 'all 0.2s ease-in-out', cursor: 'pointer', bgcolor: selectedCategory === cat.name ? 'primary.lighter' : 'white', }} onClick={() => setSelectedCategory(prev => prev === cat.name ? '' : cat.name)}><Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 2, color: selectedCategory === cat.name ? 'primary.main' : 'text.primary' }}>{cat.icon}<Typography sx={{ fontWeight: 'medium', mt: 1, textAlign: 'center' }}>{cat.name}</Typography></Box></Paper></Grid>))}</Grid></Container>
    </Box>
);

const FeaturedServicesSection = ({ featuredServices, getImageUrl, handleNavigation }) => (
    <Box component="section" sx={{ py: { xs: 8, md: 10 }, bgcolor: 'white' }}>
      <Container>
        <Typography variant="h4" sx={{ fontWeight: 'bold', textAlign: 'center', color: '#1F2937', mb: 8 }}>Our Most Popular Services</Typography>
        {featuredServices.length > 0 && (
          <Carousel autoPlay interval={5000} animation="slide" navButtonsAlwaysVisible sx={{ borderRadius: 4, boxShadow: 6, overflow: 'hidden' }}>
            {featuredServices.map(service => (
                <Paper key={service._id} sx={{ position: 'relative', overflow: 'hidden', '&:hover .zoom-image': { transform: 'scale(1.1)' } }}>
                    <CardMedia component="img" image={getImageUrl(service.image)} className="zoom-image" sx={{ height: 400, objectFit: 'cover', transition: 'transform 0.4s ease' }}/>
                    <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: 4, color: 'white', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
                        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>{service.name}</Typography>
                        <Button variant="contained" sx={{ mt: 2 }} onClick={() => handleNavigation(`/services/${service._id}`)}>Book Now</Button>
                    </Box>
                </Paper>
            ))}
          </Carousel>
        )}
      </Container>
    </Box>
);

const HowItWorksSection = () => {
    const steps = [ { icon: <EventAvailableIcon sx={{ fontSize: 40 }} />, title: "1. Pick Your Service & Time" }, { icon: <PinDropIcon sx={{ fontSize: 40 }} />, title: "2. Confirm Your Details" }, { icon: <DoneAllIcon sx={{ fontSize: 40 }} />, title: "3. Relax as We Handle It" }, ];
    return (
        <Box component="section" sx={{ py: { xs: 8, md: 12 }, bgcolor: '#F9FAFB' }}>
            <Container><Typography variant="h4" sx={{ fontWeight: 'bold', textAlign: 'center', mb: 8 }}>Your Hassle-Free Booking Flow</Typography><Grid container spacing={4} alignItems="stretch">{steps.map((step, index) => (<React.Fragment key={step.title}><Grid item xs={12} md={index === 1 ? 4 : 3.5}><Paper elevation={6} sx={{ p: 4, textAlign: 'center', borderRadius: 4, height: '100%' }}><Box sx={{ color: 'primary.main', mb: 2 }}>{step.icon}</Box><Typography variant="h6" sx={{ fontWeight: 'bold' }}>{step.title}</Typography></Paper></Grid>{index < 2 && (<Grid item md={0.5} sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', justifyContent: 'center' }}><ArrowForwardIcon sx={{ color: '#D1D5DB', fontSize: 40 }} /></Grid>)}</React.Fragment>))}</Grid></Container>
        </Box>
    );
};

const GuaranteesSection = () => {
    const guarantees = [ { icon: <VerifiedUserIcon color="primary" />, title: "Verified Professionals", description: "Every expert is background-checked and trained to ensure quality and safety." }, { icon: <CurrencyRupeeIcon color="primary" />, title: "Transparent Pricing", description: "No hidden fees. You see the final price upfront before you book any service." }, { icon: <SentimentVerySatisfiedIcon color="primary" />, title: "Satisfaction Guarantee", description: "We're not happy until you are. We promise to make it right if you're not satisfied." }, ];
    return (
        <Box component="section" sx={{ py: { xs: 8, md: 12 }, bgcolor: 'white' }}>
            <Container><Typography variant="h4" sx={{ fontWeight: 'bold', textAlign: 'center', color: '#1F2937', mb: 8 }}>Our Promise To You</Typography><Grid container spacing={4}>{guarantees.map(item => (<Grid item xs={12} md={4} key={item.title}><Box sx={{ textAlign: 'center' }}><Box sx={{ fontSize: 50 }}>{item.icon}</Box><Typography variant="h6" sx={{ fontWeight: 'bold', my: 2 }}>{item.title}</Typography><Typography sx={{ color: '#6B7280' }}>{item.description}</Typography></Box></Grid>))}</Grid></Container>
        </Box>
    );
};

const FeedbackSection = ({ feedbacks, getImageUrl }) => (
    <Box component="section" sx={{ py: { xs: 8, md: 12 }, bgcolor: '#F9FAFB' }}>
        <Container>
            <Typography variant="h4" sx={{ fontWeight: 'bold', textAlign: 'center', color: '#1F2937', mb: 8 }}>What Our Customers Say</Typography>
            {feedbacks.length > 0 ? (
                <Grid container spacing={4} alignItems="stretch">
                    {feedbacks.slice(0, 3).map(feedback => (
                        <Grid item xs={12} md={4} key={feedback._id}>
                            <Paper elevation={6} sx={{ p: 4, borderRadius: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <Avatar src={getImageUrl(feedback.bookingId?.customer?.profile?.image)} alt={feedback.bookingId?.customer?.name} sx={{ width: 56, height: 56, mr: 2 }} />
                                    <Box>
                                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{feedback.bookingId?.customer?.name || 'Anonymous'}</Typography>
                                    </Box>
                                </Box>
                                <Rating value={Number(feedback.rating)} readOnly sx={{ mb: 2 }}/>
                                <Typography variant="body1" sx={{ fontStyle: 'italic', color: 'text.secondary', flexGrow: 1 }}>"{feedback.comment}"</Typography>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>
            ) : (
                <Typography sx={{ textAlign: 'center', color: 'text.secondary' }}>No customer reviews yet. Be the first!</Typography>
            )}
        </Container>
    </Box>
);

const BlogSection = () => {
    const [expandedBlogId, setExpandedBlogId] = useState(null);
    const selectedPost = blogPosts.find(p => p.id === expandedBlogId);

    const BlogListView = () => (
        <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', textAlign: 'center', mb: 8 }}>Tips & Insights</Typography>
            <Grid container spacing={4} alignItems="stretch">
                {blogPosts.map(post => (
                    <Grid item xs={12} md={6} key={post.id}>
                        <Card elevation={2} sx={{ display: 'flex', flexDirection: 'column', borderRadius: 3, height: '100%', '&:hover': { boxShadow: 6 } }}>
                            <CardMedia component="img" image={post.image} sx={{ height: 200 }} />
                            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                                <Typography variant="h6" sx={{ fontWeight: 'bold', flexGrow: 1 }}>{post.title}</Typography>
                                <Typography sx={{ my: 1, color: 'text.secondary' }}>{post.excerpt}</Typography>
                                <Button onClick={() => setExpandedBlogId(post.id)} endIcon={<ArrowForwardIcon />} sx={{ alignSelf: 'flex-start' }}>Read More</Button>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
    
    const BlogDetailView = () => (
        <Paper elevation={4} sx={{ p: { xs: 2, md: 4 }, borderRadius: 3 }}>
            <Button startIcon={<ArrowBackIcon />} onClick={() => setExpandedBlogId(null)} sx={{ mb: 2 }}>Back to All Tips</Button>
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

/* const TrustedPartnersSection = () => {
    const extendedPartners = [...partners, ...partners];
    return (
         <Box component="section" sx={{ py: { xs: 8, md: 10 }, bgcolor: '#F9FAFB' }}>
            <Container>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#374151', mb: 5, textAlign: 'center' }}>OUR TRUSTED PARTNERS</Typography>
                <Box sx={{ overflow: 'hidden' }}>
                    <Box className="marquee-content" sx={{ display: 'flex', alignItems: 'center', animation: 'marquee 30s linear infinite' }}>
                        {extendedPartners.map((p, i) => (<Box key={i} component="img" src={p.logo} alt={p.name} sx={{ height: 60, mx: 6, objectFit: 'contain', filter: 'grayscale(100%)', opacity: 9.0, transition: 'all 0.3s', '&:hover': { filter: 'none', opacity: 10 } }} />))}
                    </Box>
                </Box>
            </Container>
        </Box>    
    );
}; */



const TrustedPartnersSection = () => {
  const extendedPartners = [...partners, ...partners];

  return (
    <Box
      component="section"
      sx={{ py: { xs: 8, md: 10 }, bgcolor: "#F9FAFB" }}
    >
      <Container>
        <Typography
          variant="h5"
          sx={{
            fontWeight: "bold",
            color: "#374151",
            mb: 5,
            textAlign: "center",
          }}
        >
          OUR TRUSTED PARTNERS
        </Typography>

        <Box sx={{ overflow: "hidden" }}>
          <Box
            className="marquee-content"
            sx={{
              display: "flex",
              alignItems: "center",
              animation: "marquee 30s linear infinite",
            }}
          >
            {extendedPartners.map((p, i) => (
              <Box
                key={i}
                component="img"
                src={p.logo}
                alt={p.name}
                sx={{
                  height: 60,
                  mx: 6,
                  objectFit: "contain",
                  opacity: 0.9,
                  bgcolor:"white",
                  transition: "all 0.3s",
                  "&:hover": {
                    transform: "scale(1.1)",
                    opacity: 1,
                    filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.2))",
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
        <Container maxWidth="md"><Typography variant="h4" sx={{ fontWeight: 'bold', textAlign: 'center', mb: 8 }}>Frequently Asked Questions</Typography>{faqs.map(faq => (<Accordion key={faq.question} sx={{ boxShadow: 1, borderRadius: 2, '&:before': { display: 'none' }, mb: 2 }}><AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="h6">{faq.question}</Typography></AccordionSummary><AccordionDetails><Typography sx={{ color: 'text.secondary' }}>{faq.answer}</Typography></AccordionDetails></Accordion>))}</Container>
    </Box>
);

const CtaSection = ({ handleNavigation }) => (
    <Box component="section" sx={{ py: { xs: 12, md: 16 }, background: 'linear-gradient(135deg, #4F46E5, #A855F7)', color: 'white', textAlign: 'center' }}>
        <Container><Typography variant="h3" sx={{ fontWeight: 'bold' }}>Ready to Transform Your Home?</Typography><Button variant="contained" size="large" sx={{ bgcolor: 'white', color: '#4F46E5', '&:hover': { bgcolor: '#F3F4F6' }, fontWeight: 'bold', py: 1.5, px: 5, mt: 4, borderRadius: 8 }} onClick={() => handleNavigation('/services')}>Book a Service Now</Button></Container>
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
    const token = localStorage.getItem('token');

    const fetchFeedbacks = useCallback(async () => {
        setFeedbackLoading(true);
        try {
            const response = await axios.get(`${API_URL}/api/feedback`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setFeedbacks(response.data);
        } catch (error) {
            console.error('Error fetching feedbacks:', error);
        } finally {
            setFeedbackLoading(false);
        }
    }, [token]);
    
    useEffect(() => {
        const fetchLiveStats = async () => {
            try { const res = await axios.get(`${API_URL}/api/dashboard/stats`); setLiveStats(res.data); } catch (error) { console.error(error); }
        };
        fetchLiveStats();
        fetchFeedbacks();
        const socket = io(API_URL);
        socket.on('statsUpdated', fetchLiveStats);
        socket.on('feedbacksUpdated', fetchFeedbacks);
        return () => socket.disconnect();
    }, [fetchFeedbacks]);

    const handleNavigation = (path) => navigate(path);
    const filteredServices = services.filter(s => (s.name.toLowerCase().includes(searchQuery.toLowerCase())) && (selectedCategory ? s.category === selectedCategory : true));
    const getImageUrl = (image) => (image?.startsWith('http') ? image : `${API_URL}${image || '/Uploads/default.jpg'}`);

    if (loading || feedbackLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
    if (message.open) return <Box sx={{ p: 4 }}><Alert severity="error">{message.text}</Alert></Box>;

    return (
        <Box sx={{ bgcolor: '#F9FAFB', pt: 10 }}>
            <Box sx={{ zIndex: 1100, bgcolor: '#4F46E5', color: 'white', py: 1.5, overflow: 'hidden' }}>
                <Box className="marquee-content" sx={{ display: 'flex', animation: 'marquee 20s linear infinite' }}>{[...announcements, ...announcements].map((ann, i) => (<Typography key={i} sx={{ mx: 4, whiteSpace: 'nowrap' }}>{ann}</Typography>))}</Box>
            </Box>
            <main>
                <HeroSection handleNavigation={handleNavigation} />
                <ServiceMarquee />
                <AdvantageSection />
                <ServiceExplorerSection services={services} searchQuery={searchQuery} setSearchQuery={setSearchQuery} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} />
                <FeaturedServicesSection featuredServices={filteredServices.slice(0, 5)} getImageUrl={getImageUrl} handleNavigation={handleNavigation} />
                <HowItWorksSection />
                <GuaranteesSection />
                <FeedbackSection feedbacks={feedbacks} getImageUrl={getImageUrl} />
                <BlogSection />
                <TrustedPartnersSection />
                <FaqSection />
                <CtaSection handleNavigation={handleNavigation} />
            </main>
        </Box>
    );
};

export default Home;
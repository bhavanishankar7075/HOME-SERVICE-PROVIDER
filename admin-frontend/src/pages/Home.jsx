import React, { useEffect } from 'react'; // <-- Import useEffect
import { Box, Typography, Button, Grid, Container, Paper, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Dashboard, Insights, ContactMail, ArrowForward, VpnKey, PersonAdd } from '@mui/icons-material';
import logo from '../assets/insight.png'


const Home = () => {
  // --- All your logic remains untouched ---
  const navigate = useNavigate();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const adminName = useSelector((state) => state.auth.user?.name);

  // **THIS IS THE FIX**: This hook applies a style to the whole page to hide
  // the horizontal scrollbar while this component is visible. It cleans up
  // automatically when you navigate to another page.
  useEffect(() => {
    // Hide scrollbar on mount
    document.body.style.overflowX = 'hidden';

    // Restore scrollbar on unmount
    return () => {
      document.body.style.overflowX = 'auto';
    };
  }, []); // The empty array ensures this runs only once when the component is added and removed


  const features = [
    {
      icon: <Dashboard fontSize="large" color="primary" />,
      title: "Streamlined Operations",
      description: "Manage bookings, services, FAQs, and contact messages with an intuitive interface designed for maximum efficiency.",
      img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80"
    },
    {
      icon: <Insights fontSize="large" color="primary" />,
      title: "Real-Time Insights",
      description: "Monitor revenue, bookings, and performance metrics in real-time. Our powerful analytics help you make informed, data-driven decisions.",
      img: `${logo}`
    },
    {
      icon: <ContactMail fontSize="large" color="primary" />,
      title: "Customer Engagement",
      description: "Directly view and respond to customer inquiries and FAQs through the portal, enhancing satisfaction and building trust.",
      img: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1171&q=80"
    }
  ];

  const ActionButtons = () => (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
      {isAuthenticated ? (
        <Button
          variant="contained"
          size="large"
          onClick={() => navigate('/admin/dashboard')}
          endIcon={<ArrowForward />}
          sx={{ py: 1.5, px: 5, fontWeight: 'bold', borderRadius: '50px', boxShadow: '0px 8px 15px rgba(0, 0, 0, 0.1)' }}
        >
          Go to Dashboard
        </Button>
      ) : (
        <>
          <Button
            variant="contained"
            onClick={() => navigate('/admin/login')}
            startIcon={<VpnKey />}
            sx={{ py: 1.5, px: 5, borderRadius: '50px', bgcolor: 'white', color: '#2c5282', '&:hover': { bgcolor: '#f0f0f0' }, boxShadow: '0px 8px 15px rgba(0, 0, 0, 0.1)' }}
          >
            Admin Login
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate('/admin/signup')}
            startIcon={<PersonAdd />}
            sx={{ py: 1.5, px: 5, borderRadius: '50px', color: 'white', borderColor: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
          >
            Signup
          </Button>
        </>
      )}
    </Stack>
  );

  return (
    <Box sx={{ 
        width: '100vw',
        minHeight: '100vh',
        // The overflow is now handled by the useEffect hook above
        bgcolor: 'background.default', 
        color: 'text.primary' 
    }}>
      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #2c5282 0%, #4a90e2 100%)',
          color: 'white',
          py: { xs: 8, md: 12 },
          textAlign: 'center',
        }}
      >
        <Container maxWidth="md">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Typography variant="h2" sx={{ fontWeight: 'bold', mb: 2, fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4rem' } }}>
              {isAuthenticated ? `Welcome Back, ${adminName}!` : 'ServiceHub Admin Portal'}
            </Typography>
            <Typography variant="h6" sx={{ mb: 4, opacity: 0.9, maxWidth: '700px', mx: 'auto' }}>
              Efficiently manage services, bookings, and customer inquiries for your business in Visakhapatnam.
            </Typography>
            <ActionButtons />
          </motion.div>
        </Container>
      </Box>

      {/* Features Section */}
      <Container sx={{ py: { xs: 8, md: 12 } }}>
        <Typography variant="h3" sx={{ textAlign: 'center', mb: 8, color: 'primary.dark', fontWeight: 'bold' }}>
          A Better Way to Manage
        </Typography>
        <Stack spacing={{ xs: 8, md: 12 }}>
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Paper elevation={4} sx={{ p: {xs: 3, md: 4}, borderRadius: '16px', bgcolor: index % 2 === 0 ? 'white' : 'grey.50', overflow: 'hidden' }}>
                <Grid container spacing={{ xs: 4, md: 8 }} alignItems="center" direction={index % 2 === 0 ? 'row' : 'row-reverse'}>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ borderRadius: '12px', overflow: 'hidden', boxShadow: '0 16px 32px rgba(44, 82, 130, 0.2)', height: { xs: 250, md: 350 } }}>
                      <img src={feature.img} alt={feature.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
                      <Typography variant="h4" sx={{ color: 'primary.dark', fontWeight: 600, mb: 2 }}>
                        {feature.title}
                      </Typography>
                      <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3, lineHeight: 1.7 }}>
                        {feature.description}
                      </Typography>
                      <Button variant="contained" endIcon={<ArrowForward />} sx={{ borderRadius: '50px' }}>
                        Learn More
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </motion.div>
          ))}
        </Stack>
      </Container>

      {/* Combined CTA & About Section */}
      <Box sx={{ bgcolor: '#2c5282', color: 'white', py: { xs: 8, md: 12 } }}>
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 3 }}>
              Ready to Elevate Your Business?
            </Typography>
            <Typography sx={{ opacity: 0.9, maxWidth: '700px', mx: 'auto', mb: 5 }}>
              The Home Service Provider Admin Portal empowers you to manage operations seamlessly and gain real-time insights for better service delivery in Visakhapatnam. Get started today.
            </Typography>
            <ActionButtons />
          </motion.div>
        </Container>
      </Box>

      {/* Footer */}
      <Box component="footer" sx={{ py: 4, bgcolor: 'grey.100' }}>
         <Container maxWidth="md" sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              © {new Date().getFullYear()} ServiceHub. All Rights Reserved. Visakhapatnam, Andhra Pradesh.
            </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default Home;

import React from 'react';
import { Box, Typography, Button, Grid, Container, Paper, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Dashboard, Insights, ContactMail, ArrowForward } from '@mui/icons-material';

const Home = () => {
    const navigate = useNavigate();
    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
    const adminName = useSelector((state) => state.auth.user?.name);

    // --- Data for New Features Section ---
    const features = [
        {
            icon: <Dashboard fontSize="large" color="primary" />,
            title: "Streamlined Operations",
            description: "Manage bookings, services, FAQs, and contact messages with an intuitive interface designed for maximum efficiency.",
            img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80" // Placeholder image for data/dashboards
        },
        {
            icon: <Insights fontSize="large" color="primary" />,
            title: "Real-Time Insights",
            description: "Monitor revenue, bookings, and performance metrics in real-time. Our powerful analytics help you make informed, data-driven decisions.",
            img: "https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80" // Placeholder image for charts/growth
        },
        {
            icon: <ContactMail fontSize="large" color="primary" />,
            title: "Customer Engagement",
            description: "Directly view and respond to customer inquiries and FAQs through the portal, enhancing satisfaction and building trust.",
            img: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1171&q=80" // Placeholder image for communication/team
        }
    ];

    // --- Reusable Component for Action Buttons ---
    const ActionButtons = () => (
        <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap">
            {isAuthenticated ? (
                <Button
                    variant="contained"
                    size="large"
                    onClick={() => navigate('/admin/dashboard')}
                    sx={{ py: 1.5, px: 5, fontWeight: 'bold', bgcolor: 'white', color: '#2c5282', '&:hover': { bgcolor: '#e0e0e0' } }}
                >
                    Go to Dashboard
                </Button>
            ) : (
                <>
                    <Button
                        variant="contained"
                        onClick={() => navigate('/admin/login')}
                        sx={{ py: 1.5, px: 5, bgcolor: 'white', color: '#2c5282', '&:hover': { bgcolor: '#e0e0e0' } }}
                    >
                        Login
                    </Button>
                    <Button
                        variant="outlined"
                        onClick={() => navigate('/admin/signup')}
                        sx={{ py: 1.5, px: 5, color: 'white', borderColor: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
                    >
                        Signup
                    </Button>
                </>
            )}
        </Stack>
    );

    return (
        <Box sx={{ bgcolor: '#ffffff', minHeight: '100vh' }}>
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
                        <Typography variant="h2" sx={{ fontWeight: 'bold', mb: 2, fontSize: { xs: '2.5rem', md: '3.75rem' } }}>
                            {isAuthenticated ? `Welcome Back, ${adminName}!` : 'Welcome to the Admin Portal'}
                        </Typography>
                        <Typography variant="h6" sx={{ mb: 4, opacity: 0.9, maxWidth: '700px', mx: 'auto' }}>
                            Efficiently manage services, bookings, and customer inquiries for your business in Visakhapatnam.
                        </Typography>
                        <ActionButtons />
                    </motion.div>
                </Container>
            </Box>

            {/* --- NEW Features Section --- */}
            <Container sx={{ py: { xs: 6, md: 10 } }}>
                 <Typography variant="h3" sx={{ textAlign: 'center', mb: 8, color: '#2c5282', fontWeight: 'bold' }}>
                    A Better Way to Manage
                </Typography>
                <Stack spacing={10}>
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                        >
                            <Grid container spacing={{xs: 4, md: 8}} alignItems="center" direction={index % 2 === 0 ? 'row' : 'row-reverse'}>
                                <Grid item xs={12} md={6}>
                                    <Box sx={{
                                        borderRadius: '16px',
                                        overflow: 'hidden',
                                        boxShadow: '0 16px 32px rgba(44, 82, 130, 0.2)',
                                        height: {xs: 250, md: 350}
                                    }}>
                                        <img src={feature.img} alt={feature.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </Box>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Box sx={{textAlign: {xs: 'center', md: 'left'}}}>
                                        <Typography variant="h4" sx={{ color: '#2c5282', fontWeight: 600, mb: 2 }}>
                                            {feature.title}
                                        </Typography>
                                        <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3, lineHeight: 1.7 }}>
                                            {feature.description}
                                        </Typography>
                                        <Button
                                            variant="contained"
                                            endIcon={<ArrowForward />}
                                            sx={{bgcolor: '#4a90e2', '&:hover': { bgcolor: '#357abd' } }}
                                        >
                                            Learn More
                                        </Button>
                                    </Box>
                                </Grid>
                            </Grid>
                        </motion.div>
                    ))}
                </Stack>
            </Container>

            {/* About Section */}
            <Box sx={{ bgcolor: '#2c5282', color: 'white', py: 8 }}>
                <Container maxWidth="md" sx={{ textAlign: 'center' }}>
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
                        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 3 }}>
                            About Our Platform
                        </Typography>
                        <Typography sx={{ opacity: 0.9, maxWidth: '700px', mx: 'auto' }}>
                            The Home Service Provider Admin Portal empowers administrators to manage services, bookings, and customer inquiries efficiently. Based in Visakhapatnam, Andhra Pradesh, our platform ensures seamless operations and real-time insights for better service delivery.
                        </Typography>
                    </motion.div>
                </Container>
            </Box>

            {/* Final CTA Section */}
            <Container sx={{ py: { xs: 6, md: 10 }, textAlign: 'center' }}>
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
                    <Typography variant="h4" sx={{ mb: 4, color: '#2c5282', fontWeight: 'bold' }}>
                        Ready to Get Started?
                    </Typography>
                    <ActionButtons />
                </motion.div>
            </Container>
        </Box>
    );
};

export default Home;

import React from 'react';
import { Container, Typography, Grid, Box, Button, Card, CardContent } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import StarIcon from '@mui/icons-material/Star';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PeopleIcon from '@mui/icons-material/People';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BuildIcon from '@mui/icons-material/Build';
import MoodIcon from '@mui/icons-material/Mood';

const About = () => {
  const navigate = useNavigate();

  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
  };

  const cardHover = {
    hover: { scale: 1.05, boxShadow: '0 6px 12px rgba(0,0,0,0.15)', transition: { duration: 0.3 } },
  };

  return (
    <Container sx={{ py: 4, mt: 8, overflowX: 'hidden', bgcolor: '#f5f7fa' /* Light background to avoid white */ }}>
      <motion.div initial="hidden" animate="visible" variants={fadeIn}>
        <Typography variant="h4" gutterBottom sx={{ color: '#1a3c6b', fontWeight: 'bold', textAlign: 'center' }}>
          About Us
        </Typography>
      </motion.div>

      <Grid container spacing={4}>
        {/* Mission */}
        <Grid item xs={12}>
          <motion.div initial="hidden" animate="visible" variants={fadeIn}>
            <Typography variant="h5" sx={{ color: '#4a90e2', mb: 2 }}>
              Our Mission
            </Typography>
            <Typography variant="body1" sx={{ color: '#333', mb: 4, lineHeight: 1.6 }}>
              At Home Service Provider, we are committed to transforming home maintenance by connecting customers with trusted professionals in Visakhapatnam. Our mission is to deliver seamless, high-quality services that prioritize convenience, reliability, and customer satisfaction, making your home a better place.
            </Typography>
          </motion.div>
        </Grid>

        {/* About Home Service Provider */}
        <Grid item xs={12}>
          <motion.div initial="hidden" animate="visible" variants={fadeIn}>
            <Typography variant="h5" sx={{ color: '#4a90e2', mb: 2 }}>
              About Home Service Provider
            </Typography>
            <Typography variant="body1" sx={{ color: '#333', mb: 2, lineHeight: 1.6 }}>
              Based in Visakhapatnam, Home Service Provider is your trusted platform for all home maintenance needs. From plumbing and electrical repairs to cleaning, pest control, and more, we connect you with verified professionals who deliver exceptional service. Our goal is to simplify home care, ensuring your peace of mind.
            </Typography>
            <Typography variant="body1" sx={{ color: '#333', mb: 2, lineHeight: 1.6 }}>
              Founded with a vision to empower homeowners and businesses, we offer a user-friendly platform with real-time booking, transparent pricing, and dedicated support. Our local expertise in Visakhapatnam allows us to partner with skilled service providers who understand your needs and deliver results that exceed expectations.
            </Typography>
            <Typography variant="body1" sx={{ color: '#333', mb: 4, lineHeight: 1.6 }}>
              With thousands of successful bookings and a growing community of satisfied customers, Home Service Provider is redefining home maintenance. Whether it's a quick fix or a comprehensive service, we're here to make your life easier, one service at a time.
            </Typography>
          </motion.div>
        </Grid>

        {/* Our Values */}
        <Grid item xs={12}>
          <motion.div initial="hidden" animate="visible" variants={fadeIn}>
            <Typography variant="h5" sx={{ color: '#4a90e2', mb: 2, textAlign: 'center' }}>
              Our Values
            </Typography>
            <Grid container spacing={2}>
              {[
                { title: 'Trust', description: 'We partner with verified professionals to ensure reliable, safe services.', icon: <VerifiedUserIcon sx={{ fontSize: 40, color: '#4a90e2' }} /> },
                { title: 'Quality', description: 'Every service is delivered with precision and a commitment to excellence.', icon: <StarIcon sx={{ fontSize: 40, color: '#4a90e2' }} /> },
                { title: 'Convenience', description: 'Book services anytime, anywhere with our intuitive platform.', icon: <AccessTimeIcon sx={{ fontSize: 40, color: '#4a90e2' }} /> },
                { title: 'Community', description: 'We support Visakhapatnam’s local economy by empowering skilled providers.', icon: <PeopleIcon sx={{ fontSize: 40, color: '#4a90e2' }} /> },
              ].map((value, index) => (
                <Grid item xs={12} sm={6} md={3} key={index}>
                  <motion.div variants={cardHover} whileHover="hover">
                    <Card
                      sx={{
                        textAlign: 'center',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                        borderRadius: 2,
                        bgcolor: 'linear-gradient(135deg, #ffffff 0%, #e3f2fd 100%)',
                        p: 2,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <CardContent>
                        <Box sx={{ mb: 2 }}>{value.icon}</Box>
                        <Typography variant="h6" sx={{ color: '#1a3c6b', mb: 1 }}>
                          {value.title}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#666' }}>
                          {value.description}
                        </Typography>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </motion.div>
        </Grid>

        {/* Why Choose Us */}
        <Grid item xs={12}>
          <motion.div initial="hidden" animate="visible" variants={fadeIn}>
            <Typography variant="h5" sx={{ color: '#4a90e2', mb: 2, textAlign: 'center' }}>
              Why Choose Us
            </Typography>
            <Typography variant="body1" sx={{ color: '#333', mb: 2, textAlign: 'center', maxWidth: '800px', mx: 'auto' }}>
              Home Service Provider stands out for its commitment to customer satisfaction and innovative approach to home maintenance. Here’s why customers choose us:
            </Typography>
            <Box sx={{ pl: { xs: 2, md: 4 }, maxWidth: '800px', mx: 'auto' }}>
              {[
                'Verified Professionals: All providers undergo rigorous screening for quality and reliability.',
                'Transparent Pricing: No hidden fees, just clear and upfront costs.',
                '24/7 Support: Our team is always available to assist you.',
                'Fast Booking: Schedule services in minutes with our easy-to-use platform.',
              ].map((reason, index) => (
                <Typography key={index} variant="body1" sx={{ color: '#333', mb: 1, display: 'flex', alignItems: 'center' }}>
                  <CheckCircleIcon sx={{ color: '#4a90e2', mr: 1, fontSize: 20 }} /> {reason}
                </Typography>
              ))}
            </Box>
          </motion.div>
        </Grid>

        {/* Our Process */}
        <Grid item xs={12}>
          <motion.div initial="hidden" animate="visible" variants={fadeIn}>
            <Typography variant="h5" sx={{ color: '#4a90e2', mb: 2, textAlign: 'center' }}>
              Our Process
            </Typography>
            <Grid container spacing={2}>
              {[
                { step: '1. Book', description: 'Choose your service and schedule it online in just a few clicks.', icon: <CalendarTodayIcon sx={{ fontSize: 40, color: '#4a90e2' }} /> },
                { step: '2. Confirm', description: 'Receive instant confirmation with provider details and pricing.', icon: <CheckCircleIcon sx={{ fontSize: 40, color: '#4a90e2' }} /> },
                { step: '3. Service', description: 'Our professional arrives on time to deliver top-quality service.', icon: <BuildIcon sx={{ fontSize: 40, color: '#4a90e2' }} /> },
                { step: '4. Relax', description: 'Enjoy your home, worry-free, with our satisfaction guarantee.', icon: <MoodIcon sx={{ fontSize: 40, color: '#4a90e2' }} /> },
              ].map((step, index) => (
                <Grid item xs={12} sm={6} md={3} key={index}>
                  <motion.div variants={cardHover} whileHover="hover">
                    <Card
                      sx={{
                        textAlign: 'center',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                        borderRadius: 2,
                        bgcolor: 'linear-gradient(135deg, #ffffff 0%, #e3f2fd 100%)',
                        p: 2,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <CardContent>
                        <Box sx={{ mb: 2 }}>{step.icon}</Box>
                        <Typography variant="h6" sx={{ color: '#1a3c6b', mb: 1 }}>
                          {step.step}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#666' }}>
                          {step.description}
                        </Typography>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </motion.div>
        </Grid>

        {/* CTA */}
        <Grid item xs={12} sx={{ textAlign: 'center', mt: 4 }}>
          <motion.div initial="hidden" animate="visible" variants={fadeIn}>
            <Typography variant="h6" sx={{ color: '#1a3c6b', mb: 2 }}>
              Ready to experience hassle-free home services?
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/services')}
              sx={{
                bgcolor: '#4a90e2',
                '&:hover': { bgcolor: '#357abd', transform: 'scale(1.05)', transition: 'all 0.3s' },
                px: 4,
                py: 1.5,
                borderRadius: 2,
              }}
            >
              Explore Services
            </Button>
          </motion.div>
        </Grid>
      </Grid>
    </Container>
  );
};

export default About;
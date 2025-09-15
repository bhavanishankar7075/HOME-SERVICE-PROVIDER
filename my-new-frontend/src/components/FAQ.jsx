import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Accordion, AccordionSummary, AccordionDetails, TextField, Button, Box, Grid, Divider
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const FAQ = () => {
  const navigate = useNavigate();
  const [faqs, setFaqs] = useState([]);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchFAQs = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/faqs`, {
          params: { search: search || undefined },
        });
        setFaqs(response.data);
      } catch (error) {
        console.error('Error fetching FAQs:', error);
      }
    };
    fetchFAQs();
  }, [search]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  };

  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  return (
    <Container sx={{ py: 4, mt: 8, overflowX: 'hidden' /* 64px for NavBar */ }}>
      <Typography variant="h4" gutterBottom sx={{ color: '#1a3c6b', fontWeight: 'bold', textAlign: 'center' }}>
        Frequently Asked Questions
      </Typography>
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
            <TextField
              label="Search FAQs"
              variant="outlined"
              value={search}
              onChange={handleSearchChange}
              sx={{ width: { xs: '100%', sm: '80%' }, '& .MuiOutlinedInput-root': { borderRadius: 2, '&:hover fieldset': { borderColor: '#4a90e2' } } }}
            />
          </Box>
          <Box sx={{ maxWidth: '100%' }}>
            {faqs.length > 0 ? (
              faqs.map((faq, index) => (
                <Accordion
                  key={faq._id}
                  expanded={expanded === `panel${index}`}
                  onChange={handleAccordionChange(`panel${index}`)}
                  sx={{ mb: 1, boxShadow: '0 2px 5px rgba(0,0,0,0.1)', '&:hover': { boxShadow: '0 4px 10px rgba(0,0,0,0.2)', transition: 'all 0.3s' } }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#4a90e2' }} />}>
                    <Typography sx={{ fontWeight: 'medium', color: '#1a3c6b' }}>{faq.question}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography sx={{ color: '#333' }}>{faq.answer}</Typography>
                  </AccordionDetails>
                </Accordion>
              ))
            ) : (
              <Typography sx={{ textAlign: 'center', color: '#666' }}>
                No FAQs found. Try adjusting your search.
              </Typography>
            )}
          </Box>
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ color: '#1a3c6b', mb: 2 }}>
              Still have questions?
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/contact')}
              sx={{ bgcolor: '#4a90e2', '&:hover': { bgcolor: '#357abd', transform: 'scale(1.05)', transition: 'all 0.3s' } }}
            >
              Contact Support
            </Button>
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom sx={{ color: '#4a90e2' }}>
            Our Location
          </Typography>
          <Typography variant="body1" sx={{ mb: 1 }}>
            <strong>Address:</strong> 456 Coastal Road, Visakhapatnam, Andhra Pradesh, India
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            <strong>Phone:</strong> +91 891-234-5678
          </Typography>
          <Divider sx={{ my: 2, bgcolor: '#4a90e2' }} />
          <Box sx={{ height: '200px', borderRadius: 2, overflow: 'hidden' }}>
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3800.291263317695!2d83.2987083150836!3d17.686815987886255!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a39431389e6973f%3A0x3a5b1e0c0a7e8c9b!2sVisakhapatnam%2C%20Andhra%20Pradesh%2C%20India!5e0!3m2!1sen!2sin!4v1694567890123"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
            ></iframe>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
};

export default FAQ;
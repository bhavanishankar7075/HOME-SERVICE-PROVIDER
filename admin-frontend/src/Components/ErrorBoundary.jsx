import React, { Component } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material'; // <-- THE FIX: Imported Box and other components
import { ReportProblem as ErrorIcon } from '@mui/icons-material';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error: error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: '80vh',
            p: 3 
          }}
        >
          <Paper elevation={3} sx={{ p: 4, textAlign: 'center', maxWidth: '500px', borderRadius: 2 }}>
            <ErrorIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
            <Typography variant="h5" component="h1" gutterBottom>
              Something went wrong.
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              We've been notified of the issue and are working to fix it. Please try refreshing the page.
            </Typography>
            <Button 
              variant="contained" 
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
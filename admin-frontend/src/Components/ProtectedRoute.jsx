import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';

const ProtectedRoute = ({ children }) => {
  const { token, isLoading } = useSelector((state) => state.auth);
  const location = useLocation();

  console.log('ProtectedRoute: Checking auth state for route:', {
    token: !!token,
    isLoading,
    currentPath: location.pathname,
  });

  if (isLoading) {
    console.log('ProtectedRoute: State is loading, showing loading indicator');
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!token) {
    console.log('ProtectedRoute: No token, redirecting to /admin/login', { from: location.pathname });
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  console.log('ProtectedRoute: Access granted, rendering children');
  return children;
};

export default ProtectedRoute;
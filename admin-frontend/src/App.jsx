import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { AnimatePresence } from 'framer-motion';
import { store, persistor } from './store';
import ProtectedRoute from './Components/ProtectedRoute'
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import AdminSignup from './pages/AdminSignup';
import AdminVerifyOTP from './pages/AdminVerifyOTP';
import Home from './pages/Home';
import Services from './pages/Services';
import CustomerFeedbacks from './pages/CustomerFeedbacks';
import ProviderManagement from './pages/ProviderManagement';
import CustomerManagement from './pages/CustomerManagement';
import ActivityLogs from './pages/ActivityLogs';
import AdminSettings from './pages/AdminSettings';
import AdminMessages from './pages/AdminMessages';
import BookingManagement from './pages/BookingMangement'
import ContactMessages from './pages/ContactMessages';
import FaqsContacts from './pages/FaqsContacts';
import AdminChat from './pages/admin/AdminChat';
import AdminResetPassword from './pages/AdminResetPassword';
import SubscriptionDashboard from './pages/SubscriptionDashboard';
import PlansPage from './pages/PlansPage';
import { Box, CircularProgress, Typography } from '@mui/material';
import PageTransition from './Components/PageTransition'
import AdminLoadingScreen from './Components/AdminLoadingScreen';
import ScrollToTop from './Components/ScrollToTop';

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Home /></PageTransition>} />
        <Route path="/admin/login" element={<PageTransition><AdminLogin /></PageTransition>} />
        <Route path="/admin/signup" element={<PageTransition><AdminSignup /></PageTransition>} />
        <Route path="/admin/verify-otp" element={<PageTransition><AdminVerifyOTP /></PageTransition>} />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute>
              <PageTransition><AdminDashboard /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/bookings"
          element={
            <ProtectedRoute>
              <PageTransition><BookingManagement /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/services"
          element={
            <ProtectedRoute>
              <PageTransition><Services /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/feedbacks"
          element={
            <ProtectedRoute>
              <PageTransition><CustomerFeedbacks /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/providers"
          element={
            <ProtectedRoute>
              <PageTransition><ProviderManagement /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/customers"
          element={
            <ProtectedRoute>
              <PageTransition><CustomerManagement /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reset-password"
          element={
            <ProtectedRoute>
              <PageTransition><AdminResetPassword /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/logs"
          element={
            <ProtectedRoute>
              <PageTransition><ActivityLogs /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute>
              <PageTransition><AdminSettings /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/messages"
          element={
            <ProtectedRoute>
              <PageTransition><AdminMessages /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/contacts"
          element={
            <ProtectedRoute>
              <PageTransition><ContactMessages /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/faqs-contacts"
          element={
            <ProtectedRoute>
              <PageTransition><FaqsContacts /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/chats"
          element={
            <ProtectedRoute>
              <PageTransition><AdminChat /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/subscriptions"
          element={
            <ProtectedRoute>
              <PageTransition><SubscriptionDashboard /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/plans"
          element={
            <ProtectedRoute>
              <PageTransition><PlansPage /></PageTransition>
            </ProtectedRoute>
          }
        />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      console.log('App.jsx: Store state changed:', store.getState());
      console.log('App.jsx: localStorage persist:root:', localStorage.getItem('persist:root'));
    });
    return () => unsubscribe();
  }, []);

  return (
    <Provider store={store}>
      <PersistGate
        loading={<AdminLoadingScreen message="Initializing Admin Panel..." />}
        persistor={persistor}
        onBeforeLift={() => console.log('App.jsx: PersistGate hydrating...')}
      >
        {() => {
          setTimeout(() => {
            console.log('App.jsx: PersistGate hydrated, state:', store.getState());
            console.log('App.jsx: localStorage persist:root:', localStorage.getItem('persist:root'));
          }, 100);
          return (
            <Router>
              <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
                <Box component="main" sx={{ flex: 1 }}>
                  <AnimatedRoutes />
                  <ScrollToTop/>
                </Box>
              </Box>
            </Router>
          );
        }}
      </PersistGate>
    </Provider>
  );
}

export default App;

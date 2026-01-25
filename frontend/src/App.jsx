import React, { useEffect, useContext } from 'react';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { AnimatePresence } from 'framer-motion';
import { store, persistor } from './store/store';
import { useTabSync } from './hooks/useTabSync';
import ProtectedRoute from './components/ProtectedRoute';
import ProviderHome from './pages/ProviderHome';
import Navbar from './components/NavBar';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyOTP from './pages/VerifyOTP';
import ProviderDashboard from './pages/ProviderDashboard';
import Home from './pages/Home';
import Booking from './pages/Booking';
import Services from './pages/Services';
import ServiceDetails from './pages/ServiceDetails';
import UserDashboard from './pages/UserDashboard';
import ProvidersList from './pages/ProvidersList';
import CustomerMessages from './pages/CustomerMessages';
import Contact from './components/Contact';
import FAQ from './components/FAQ';
import About from './components/About';
// Footer import removed to prevent global rendering
import PageTransition from './components/PageTransition';
import { ChatProvider } from './context/ChatContext';
import ChatWidget from './components/ChatWidget';
import ResetPassword from './pages/ResetPassword';
import { ServicesProvider, ServicesContext } from './context/ServicesContext';
import ErrorBoundary from './components/ErrorBoundary';
import PricingPage from './pages/PricingPage';
import { useSocketManager } from './hooks/useSocketManager';
import LoadingScreen from './components/LoadingScreen';
import ScrollToTop from './components/ScrollToTop';
import { Box, CssBaseline } from '@mui/material';
import SubscriptionSuccess from './pages/SubscriptionSuccess';

// FooterWrapper removed as per request to move footer to specific components

// --- No changes to AnimatedRoutes ---
const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
        <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
        <Route path="/verify-otp" element={<PageTransition><VerifyOTP /></PageTransition>} />
        <Route path="/reset/password" element={<PageTransition><ResetPassword /></PageTransition>} />
        <Route path="/" element={<Navigate to="/home" />} />
        <Route path="/home" element={<PageTransition><Home /></PageTransition>} />
        <Route path="/services" element={<PageTransition><ErrorBoundary><Services /></ErrorBoundary></PageTransition>} />
        <Route path="/services/:id" element={<PageTransition><ServiceDetails /></PageTransition>} />
        <Route path="/providers" element={<PageTransition><ProvidersList /></PageTransition>} />
        <Route path="/contact" element={<PageTransition><Contact /></PageTransition>} />
        <Route path="/faq" element={<PageTransition><FAQ /></PageTransition>} />
        <Route path="/aboutus" element={<PageTransition><About /></PageTransition>} />
        <Route path="/providerhome" element={<ProtectedRoute><PageTransition><ProviderHome /></PageTransition></ProtectedRoute>} />
        <Route path="/provider/dashboard" element={<ProtectedRoute><PageTransition><ProviderDashboard /></PageTransition></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><PageTransition><UserDashboard /></PageTransition></ProtectedRoute>} />
        <Route path="/my-messages" element={<ProtectedRoute><PageTransition><CustomerMessages /></PageTransition></ProtectedRoute>} />
        <Route path="/bookings" element={<ProtectedRoute><PageTransition><Booking /></PageTransition></ProtectedRoute>} />
        <Route path="/pricing" element={<ProtectedRoute><PageTransition><PricingPage /></PageTransition></ProtectedRoute>} />
        <Route path="/subscription-success" element={<SubscriptionSuccess />} />
      </Routes>
    </AnimatePresence>
  );
};

const Layout = ({ children }) => {
  const { loading: isServicesLoading } = useContext(ServicesContext);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <Box sx={{ flex: '1 0 auto', display: 'flex', flexDirection: 'column' }}>
        {children}
      </Box>
      {/* Global FooterWrapper removed from here */}
      {!isServicesLoading && <ChatWidget />}
    </Box>
  );
};

const AppContent = () => {
  useTabSync();
  useSocketManager();
  
  const { loading: isServicesLoading } = useContext(ServicesContext);

  if (isServicesLoading) {
    return <LoadingScreen />;
  }

  return (
    <Layout>
      <AnimatedRoutes />
    </Layout>
  );
};

function App() {
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
    });
    return () => unsubscribe();
  }, []);

  return (
    <Provider store={store}>
      <PersistGate
        loading={<LoadingScreen title="Welcome" message="Initializing your experience..." />}
        persistor={persistor}
        onBeforeLift={() => console.log('App.jsx: PersistGate hydrating...')}
      >
        <ServicesProvider>
          <ChatProvider>
            <Router>
              <CssBaseline />
              <ScrollToTop />
              <AppContent />
            </Router>
          </ChatProvider>
        </ServicesProvider>
      </PersistGate>
    </Provider>
  );
}

export default App;


























































































/* import React, { useEffect } from 'react';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { AnimatePresence } from 'framer-motion';
import { store, persistor } from './store/store';
import { useTabSync } from './hooks/useTabSync';
import ProtectedRoute from './components/ProtectedRoute';
import ProviderHome from './pages/ProviderHome';
import Navbar from './components/NavBar';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyOTP from './pages/VerifyOTP';
import ProviderDashboard from './pages/ProviderDashboard';
import Home from './pages/Home';
import Booking from './pages/Booking';
import Services from './pages/Services';
import ServiceDetails from './pages/ServiceDetails';
import UserDashboard from './pages/UserDashboard';
import ProvidersList from './pages/ProvidersList';
import CustomerMessages from './pages/CustomerMessages';
import Contact from './components/Contact';
import FAQ from './components/FAQ';
import About from './components/About';
import Footer from './components/Footer';
import PageTransition from './components/PageTransition';
import { ChatProvider } from './context/ChatContext';
import ChatWidget from './components/ChatWidget';
import ResetPassword from './pages/ResetPassword';
import { ServicesProvider } from './context/ServicesContext';
import ErrorBoundary from './components/ErrorBoundary';
import PricingPage from './pages/PricingPage';
import { useSocketManager } from './hooks/useSocketManager';
import LoadingScreen from './components/LoadingScreen';
import { Box, CircularProgress, Typography } from '@mui/material';

const FooterWrapper = () => {
  const location = useLocation();
  const isAuthenticated = useSelector((state) => !!state.auth.token);
  const hideFooterRoutes = ['/login', '/register', '/verify-otp'];

  if (!isAuthenticated && hideFooterRoutes.includes(location.pathname)) {
    return null;
  }
  return <Footer />;
};

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
        <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
        <Route path="/verify-otp" element={<PageTransition><VerifyOTP /></PageTransition>} />
        <Route path="/reset/password" element={<PageTransition><ResetPassword /></PageTransition>} />
        <Route path="/" element={<Navigate to="/home" />} />
        <Route path="/home" element={<PageTransition><Home /></PageTransition>} />
        <Route path="/services" element={<PageTransition><ErrorBoundary><Services /></ErrorBoundary></PageTransition>} />
        <Route path="/services/:id" element={<PageTransition><ServiceDetails /></PageTransition>} />
        <Route path="/providers" element={<PageTransition><ProvidersList /></PageTransition>} />
        <Route path="/contact" element={<PageTransition><Contact /></PageTransition>} />
        <Route path="/faq" element={<PageTransition><FAQ /></PageTransition>} />
        <Route path="/about" element={<PageTransition><About /></PageTransition>} />
        <Route path="/providerhome" element={<ProtectedRoute><PageTransition><ProviderHome /></PageTransition></ProtectedRoute>} />
        <Route path="/provider/dashboard" element={<ProtectedRoute><PageTransition><ProviderDashboard /></PageTransition></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><PageTransition><UserDashboard /></PageTransition></ProtectedRoute>} />
        <Route path="/my-messages" element={<ProtectedRoute><PageTransition><CustomerMessages /></PageTransition></ProtectedRoute>} />
        <Route path="/bookings" element={<ProtectedRoute><PageTransition><Booking /></PageTransition></ProtectedRoute>} />
        <Route path="/pricing" element={<ProtectedRoute><PageTransition><PricingPage /></PageTransition></ProtectedRoute>} />
      </Routes>
    </AnimatePresence>
  );
};

const AppContent = () => {
  useTabSync();
  useSocketManager();

  return (
    <ServicesProvider>
      <ChatProvider>
        <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
          <Navbar />
          <Box component="main" sx={{ flex: 1 }}>
            <AnimatedRoutes />
          </Box>
          <FooterWrapper />
          <ChatWidget />
        </Box>
      </ChatProvider>
    </ServicesProvider>
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
        loading={<LoadingScreen title="Welcome" message="Initializing your experience..." />}
        persistor={persistor}
        onBeforeLift={() => console.log('App.jsx: PersistGate hydrating...')}
      >
        {() => {
          // Add slight delay to ensure hydration completes
          setTimeout(() => {
            console.log('App.jsx: PersistGate hydrated, state:', store.getState());
            console.log('App.jsx: localStorage persist:root:', localStorage.getItem('persist:root'));
          }, 100);
          return (
            <Router>
              <AppContent />
            </Router>
          );
        }}
      </PersistGate>
    </Provider>
  );
}

export default App;
 */
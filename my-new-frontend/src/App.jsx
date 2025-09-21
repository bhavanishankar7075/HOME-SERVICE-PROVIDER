
import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { AnimatePresence } from 'framer-motion';
import { store, persistor } from './store/store';
import { useTabSync } from './hooks/useTabSync';
import ProtectedRoute from './components/ProtectedRoute'; // This is essential
import ProviderHome from './pages/ProviderHome'; 
import Navbar from './components/NavBar';
import Login from './pages/Login';
import Register from './pages/Register';
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
import { Box } from '@mui/material';

const FooterWrapper = () => {
  const location = useLocation();
  const isAuthenticated = useSelector((state) => !!state.auth.token);
  const hideFooterRoutes = ['/login', '/register'];

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
                {/* --- PUBLIC ROUTES --- */}
                {/* Anyone can visit these pages at any time. */}
                <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
                <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
                <Route path="/reset/password" element={<PageTransition><ResetPassword /></PageTransition>} />
                <Route path="/" element={<Navigate to="/home" />} />
                <Route path="/home" element={<PageTransition><Home /></PageTransition>} />
                <Route path="/services" element={<PageTransition><ErrorBoundary><Services /></ErrorBoundary></PageTransition>} />
                <Route path="/services/:id" element={<PageTransition><ServiceDetails /></PageTransition>} />
                <Route path="/providers" element={<PageTransition><ProvidersList /></PageTransition>} />
                <Route path="/contact" element={<PageTransition><Contact /></PageTransition>} />
                <Route path="/faq" element={<PageTransition><FAQ /></PageTransition>} />
                <Route path="/about" element={<PageTransition><About /></PageTransition>} />

                {/* --- PRIVATE / PROTECTED ROUTES --- */}
                {/* Users will be redirected to /login if they are not authenticated. */}
                <Route 
                  path="/providerhome" // <-- ADD THE NEW ROUTE
                  element={<ProtectedRoute><PageTransition><ProviderHome /></PageTransition></ProtectedRoute>} 
                />
                <Route 
                  path="/provider/dashboard" 
                  element={<ProtectedRoute><PageTransition><ProviderDashboard /></PageTransition></ProtectedRoute>} 
                />
                <Route 
                  path="/profile" 
                  element={<ProtectedRoute><PageTransition><UserDashboard /></PageTransition></ProtectedRoute>} 
                />
                <Route 
                  path="/my-messages" 
                  element={<ProtectedRoute><PageTransition><CustomerMessages /></PageTransition></ProtectedRoute>} 
                />
                <Route 
                  path="/bookings" 
                  element={<ProtectedRoute><PageTransition><Booking /></PageTransition></ProtectedRoute>} 
                />
            </Routes>
        </AnimatePresence>
    );
};

const AppContent = () => {
  useTabSync();

  return (
    <Router>
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
    </Router>
  );
};

function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AppContent />
      </PersistGate>
    </Provider>
  );
}

export default App;

































//main
/*  import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { AnimatePresence } from 'framer-motion';
import { store, persistor } from './store/store';

import Navbar from './components/NavBar';
import Login from './pages/Login';
import Register from './pages/Register';
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
import { Box } from '@mui/material';

const FooterWrapper = () => {
  const location = useLocation();
  const isAuthenticated = useSelector((state) => state.auth?.isAuthenticated ?? false);
  const hideFooterRoutes = ['/login', '/register'];

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
                <Route path="/provider/dashboard" element={<PageTransition><ProviderDashboard /></PageTransition>} />
                <Route path="/" element={<Navigate to="/home" />} />
                <Route path="/home" element={<PageTransition><Home /></PageTransition>} />
                <Route path="/bookings" element={<PageTransition><Booking /></PageTransition>} />
                <Route path="/services" element={<PageTransition><ErrorBoundary><Services /></ErrorBoundary></PageTransition>} />
                <Route path="/services/:id" element={<PageTransition><ServiceDetails /></PageTransition>} />
                <Route path="/profile" element={<PageTransition><UserDashboard /></PageTransition>} />
                <Route path="/providers" element={<PageTransition><ProvidersList /></PageTransition>} />
                <Route path="/reset/password" element={<PageTransition><ResetPassword /></PageTransition>} />
                <Route path="/my-messages" element={<PageTransition><CustomerMessages /></PageTransition>} />
                <Route path="/contact" element={<PageTransition><Contact /></PageTransition>} />
                <Route path="/faq" element={<PageTransition><FAQ /></PageTransition>} />
                <Route path="/about" element={<PageTransition><About /></PageTransition>} />
            </Routes>
        </AnimatePresence>
    );
};

function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <Router>
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
        </Router>
      </PersistGate>
    </Provider>
  );
}

export default App;
 */ 




































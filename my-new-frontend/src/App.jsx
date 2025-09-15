import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { AnimatePresence } from 'framer-motion'; // Import AnimatePresence
import { store, persistor } from './store/store';

// Import all your components and pages
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
import PageTransition from './components/PageTransition'; // Ensure this component exists
import { ServicesProvider } from './context/ServicesContext';
import ErrorBoundary from './components/ErrorBoundary';
import { Box } from '@mui/material';

// This component remains unchanged and works perfectly
const FooterWrapper = () => {
  const location = useLocation();
  const isAuthenticated = useSelector((state) => state.auth?.isAuthenticated ?? false);
  const hideFooterRoutes = ['/login', '/register'];

  if (!isAuthenticated && hideFooterRoutes.includes(location.pathname)) {
    return null;
  }
  return <Footer />;
};

// --- NEW COMPONENT TO HANDLE ANIMATED ROUTING ---
const AnimatedRoutes = () => {
    const location = useLocation();

    return (
        // AnimatePresence is the key to enabling animations on component exit
        <AnimatePresence mode="wait">
            {/* The key prop is crucial for AnimatePresence to track route changes */}
            <Routes location={location} key={location.pathname}>
                {/* Each route's element is now wrapped with our PageTransition component */}
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
            <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
              <Navbar />
              <Box component="main" sx={{ flex: 1 }}>
                {/* The original Routes component is replaced by our new AnimatedRoutes component */}
                <AnimatedRoutes />
              </Box>
              <FooterWrapper />
            </Box>
          </ServicesProvider>
        </Router>
      </PersistGate>
    </Provider>
  );
}

export default App;





































/* import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
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
import { ServicesProvider } from './context/ServicesContext';
import ErrorBoundary from './components/ErrorBoundary';

const FooterWrapper = () => {
  const location = useLocation();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const hideFooterRoutes = ['/login', '/register'];

  return !hideFooterRoutes.includes(location.pathname) || isAuthenticated ? <Footer /> : null;
};

function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <Router>
          <ServicesProvider>
            <Navbar />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/provider/dashboard" element={<ProviderDashboard />} />
              <Route path="/" element={<Navigate to="/home" />} />
              <Route path="/home" element={<Home />} />
              <Route path="/bookings" element={<Booking />} />
              <Route path="/services" element={<ErrorBoundary><Services /></ErrorBoundary>} />
              <Route path="/services/:id" element={<ServiceDetails />} />
              <Route path="/profile" element={<UserDashboard />} />
              <Route path="/providers" element={<ProvidersList />} />
              <Route path="/my-messages" element={<CustomerMessages />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/about" element={<About />} />
            </Routes>
            <FooterWrapper />
          </ServicesProvider>
        </Router>
      </PersistGate>
    </Provider>
  );
}

export default App; */





























/* // src/App.jsx

import React from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { Provider } from "react-redux"; // <-- Import Provider
import { PersistGate } from "redux-persist/integration/react"; // <-- Import PersistGate
import { store, persistor } from "./store/store"; // <-- Import your store and persistor
import Navbar from "./components/NavBar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProviderDashboard from "./pages/ProviderDashboard";
import Home from "./pages/Home";
import Booking from "./pages/Booking";
import Services from "./pages/Services";
import ServiceDetails from "./pages/ServiceDetails";
import UserDashboard from "./pages/UserDashboard";
import ProvidersList from "./pages/ProvidersList";
import { ServicesProvider } from "./context/ServicesContext";
import ErrorBoundary from "./components/ErrorBoundary";
import CustomerMessages from "./pages/CustomerMessages";
import Footer from "./components/Footer"

function App() {
  return (
    // Wrap everything in the Provider and PersistGate
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <Router>
          <ServicesProvider>
            <Navbar />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/provider/dashboard" element={<ProviderDashboard />} />
              <Route path="/" element={<Navigate to="/home" />} />
              <Route path="/home" element={<Home />} />
              <Route path="/bookings" element={<Booking />} />
              <Route path="/services" element={<ErrorBoundary><Services /></ErrorBoundary>} />
              <Route path="/services/:id" element={<ServiceDetails />} />
              <Route path="/profile" element={<UserDashboard />} />
              <Route path="/providers" element={<ProvidersList />} />
              <Route path="/my-messages" element={<CustomerMessages />} />
             
            </Routes>
            <Footer />
          </ServicesProvider>
        </Router>
      </PersistGate>
    </Provider>
  );
}

export default App; */
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
import PageTransition from './components/PageTransition';

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
        loading={
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Loading application...</Typography>
          </Box>
        }
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












































































//main
/* import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import { store } from './store';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import AdminSignup from './pages/AdminSignup';
import Home from './pages/Home';
import Services from './pages/Services';
import CustomerFeedbacks from './pages/CustomerFeedbacks';
import ProviderManagement from './pages/ProviderManagement';
import CustomerManagement from './pages/CustomerManagement';
import ActivityLogs from './pages/ActivityLogs';
import AdminSettings from './pages/AdminSettings';
import AdminMessages from './pages/AdminMessages';
import BookingManagement from './pages/BookingManagement';
import ContactMessages from './pages/ContactMessages';
import FaqsContacts from './pages/FaqsContacts';
import AdminChat from './pages/admin/AdminChat';
import AdminResetPassword from './pages/AdminResetPassword';
import SubscriptionDashboard from './pages/SubscriptionDashboard';
import PlansPage from './pages/PlansPage';

const PrivateRoute = ({ element, roles }) => {
  if (!element || !roles) {
    console.error('PrivateRoute: Missing element or roles prop', { element, roles });
    return <Navigate to="/admin/login" />;
  }

  const { isAuthenticated, user, isLoading } = useSelector((state) => state.auth);
  const hasRequiredRole = roles.includes(user?.role) || !roles.length;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return isAuthenticated && hasRequiredRole ? element : <Navigate to="/admin/login" />;
};

function App() {
  return (
    <Provider store={store}>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/signup" element={<AdminSignup />} />
          <Route
            path="/admin/dashboard"
            element={<PrivateRoute element={<AdminDashboard />} roles={['admin']} />}
          />
          <Route
            path="/admin/bookings"
            element={<PrivateRoute element={<BookingManagement />} roles={['admin']} />}
          />
          <Route
            path="/admin/services"
            element={<PrivateRoute element={<Services />} roles={['admin']} />}
          />
          <Route
            path="/admin/feedbacks"
            element={<PrivateRoute element={<CustomerFeedbacks />} roles={['admin']} />}
          />
          <Route
            path="/admin/providers"
            element={<PrivateRoute element={<ProviderManagement />} roles={['admin']} />}
          />
          <Route
            path="/admin/customers"
            element={<PrivateRoute element={<CustomerManagement />} roles={['admin']} />}
          />
          <Route
            path="/admin/reset/password"
            element={<PrivateRoute element={<AdminResetPassword />} roles={['admin']} />}
          />
          <Route
            path="/admin/logs"
            element={<PrivateRoute element={<ActivityLogs />} roles={['admin']} />}
          />
          <Route
            path="/admin/settings"
            element={<PrivateRoute element={<AdminSettings />} roles={['admin']} />}
          />
          <Route
            path="/admin/messages"
            element={<PrivateRoute element={<AdminMessages />} roles={['admin']} />}
          />
          <Route
            path="/admin/contacts"
            element={<PrivateRoute element={<ContactMessages />} roles={['admin']} />}
          />
          <Route
            path="/admin/faqs-contacts"
            element={<PrivateRoute element={<FaqsContacts />} roles={['admin']} />}
          />
          <Route
            path="/admin/chats"
            element={<PrivateRoute element={<AdminChat />} roles={['admin']} />}
          />
          <Route
            path="/admin/subscriptions"
            element={<PrivateRoute element={<SubscriptionDashboard />} roles={['admin']} />}
          />
          <Route
            path="/admin/plans"
            element={<PrivateRoute element={<PlansPage />} roles={['admin']} />}
          />
        </Routes>
      </Router>
    </Provider>
  );
}

export default App; */









































































//main
/* import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './store';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import AdminSignup from './pages/AdminSignup';
import Home from './pages/Home';
import Services from './pages/Services';
import CustomerFeedbacks from './pages/CustomerFeedbacks';
import ProviderManagement from './pages/ProviderManagement';
import { useSelector } from 'react-redux';
import CustomerManagement from './pages/customerManagement';
import ActivityLogs from './pages/ActivityLogs';
import AdminSettings from './pages/AdminSettings';
import AdminMessages from './pages/AdminMessages';
import BookingManagement from './pages/BookingMangement';
import ContactMessages from './pages/ContactMessages';
import FaqsContacts from './pages/FaqsContacts';
import AdminChat from './pages/admin/AdminChat';
import AdminResetPassword from './pages/AdminResetPassword';
import SubscriptionDashboard from './pages/SubscriptionDashboard';
import PlansPage from './pages/PlansPage';

const PrivateRoute = ({ element, roles }) => {
  if (!element || !roles) {
    console.error('PrivateRoute: Missing element or roles prop', { element, roles });
    return <Navigate to="/admin/login" />;
  }

  const { token, user } = useSelector((state) => state.auth);
  const isAuthenticated = !!token;
  const hasRequiredRole = roles.includes(user?.role) || !roles.length;
  
  return isAuthenticated && hasRequiredRole ? element : <Navigate to="/admin/login" />;
};

function App() {
  return (
    <Provider store={store}>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/signup" element={<AdminSignup />} />
          <Route
            path="/admin/dashboard"
            element={<PrivateRoute element={<AdminDashboard />} roles={['admin']} />}
          />
          <Route
            path="/admin/bookings"
            element={<PrivateRoute element={<BookingManagement />} roles={['admin']} />}
          />
          <Route
            path="/admin/services"
            element={<PrivateRoute element={<Services />} roles={['admin']} />}
          />
          <Route
            path="/admin/feedbacks"
            element={<PrivateRoute element={<CustomerFeedbacks />} roles={['admin']} />}
          />
            <Route
            path="/admin/providers"
            element={<PrivateRoute element={<ProviderManagement />} roles={['admin']} />}
          />
            <Route
            path="/admin/customers"
            element={<PrivateRoute element={<CustomerManagement />} roles={['admin']} />}
          />
         <Route
            path="/admin/reset/password"
            element={<PrivateRoute element={<AdminResetPassword />} roles={['admin']} />}
          />
          <Route
            path="/admin/logs"
            element={<PrivateRoute element={<ActivityLogs />} roles={['admin']} />}
          />
          <Route
            path="/admin/settings"
            element={<PrivateRoute element={<AdminSettings />} roles={['admin']} />}
          />
          <Route
            path="/admin/messages"
            element={<PrivateRoute element={<AdminMessages />} roles={['admin']} />}
          />
          <Route
            path="/admin/contacts"
            element={<PrivateRoute element={<ContactMessages />} roles={['admin']} />}
          />
          <Route
            path="/admin/faqs-contacts"
            element={<PrivateRoute element={<FaqsContacts />} roles={['admin']} />}
          />
          <Route
            path="/admin/chats"
            element={<PrivateRoute element={<AdminChat />} roles={['admin']} />}
          />
          <Route
            path="/admin/subscriptions"
            element={<PrivateRoute element={<SubscriptionDashboard />} roles={['admin']} />}
          />
           <Route
            path="/admin/plans"
            element={<PrivateRoute element={<PlansPage />} roles={['admin']} />}
          />
        </Routes>
      </Router>
    </Provider>
  );
}

export default App; */

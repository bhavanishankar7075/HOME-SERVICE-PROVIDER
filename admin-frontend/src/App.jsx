import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
/* import AppointmentManagement from './pages/AppointmentManagement';
 */import ActivityLogs from './pages/ActivityLogs';
import AdminSettings from './pages/AdminSettings';
import AdminMessages from './pages/AdminMessages';
import BookingManagement from './pages/BookingMangement';
import ContactMessages from './pages/ContactMessages';
import FaqsContacts from './pages/FaqsContacts';
import AdminChat from './pages/admin/AdminChat';
import AdminResetPassword from './pages/AdminResetPassword';

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
        </Routes>
      </Router>
    </Provider>
  );
}

export default App;

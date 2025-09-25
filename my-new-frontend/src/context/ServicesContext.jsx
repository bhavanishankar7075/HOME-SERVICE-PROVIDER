import axios from "axios";
import { useState, useEffect, createContext, useContext, useCallback } from "react";
import io from "socket.io-client";

// FIX: Use the same environment variable as your other components for consistency.
const API_URL = import.meta.env.VITE_API_URL || import.meta.env.REACT_APP_API_URL || "http://localhost:5000";

export const ServicesContext = createContext();

export const ServicesProvider = ({ children }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ open: false, text: "", severity: "success" });

  // FIX: Renamed to fetchServices for clarity and consistency.
  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/services`);

      // FIX: Removed the complex and incorrect image path manipulation.
      // We will now store the raw data from the API. The component that
      // renders the image will be responsible for creating the full URL.
      setServices(response.data || []);

    } catch (error) {
      console.error("Fetch services error:", error.response?.data || error.message);
      setMessage({
        open: true,
        text: `Error fetching services: ${error.response?.data?.msg || error.message}`,
        severity: "error",
      });
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();

    // FIX: Use the API_URL variable for the socket connection.
    const socket = io(API_URL);

    // Listen for real-time updates from the server
    const handleUpdate = () => fetchServices();
    socket.on("serviceAdded", handleUpdate);
    socket.on("serviceUpdated", handleUpdate);
    socket.on("serviceDeleted", handleUpdate);

    return () => {
      socket.disconnect();
    };
  }, [fetchServices]);

  return (
    <ServicesContext.Provider value={{ services, loading, message, setMessage, fetchServices }}>
      {children}
    </ServicesContext.Provider>
  );
};

export const useServices = () => useContext(ServicesContext);
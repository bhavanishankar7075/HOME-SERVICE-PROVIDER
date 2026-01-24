import axios from "axios";
import { useState, useEffect, createContext, useContext, useCallback } from "react";
import io from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL || import.meta.env.REACT_APP_API_URL || "http://localhost:5000";

export const ServicesContext = createContext();

export const ServicesProvider = ({ children }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ open: false, text: "", severity: "success" });

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/services`);
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

    const socket = io(API_URL);
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
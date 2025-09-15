import React, { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';

const LocationModal = ({ onSelect }) => {
  const [location, setLocation] = useState('Select Location');
  const locations = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata'];

  const handleContinue = () => {
    if (location !== 'Select Location') {
      onSelect(location);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg">
        <h2 className="mb-4 text-xl font-bold">Select Your Location</h2>
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-6 h-6 text-gray-600" />
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option disabled>Select Location</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleContinue}
          className="w-full p-2 text-white transition bg-blue-600 rounded hover:bg-blue-700"
          disabled={location === 'Select Location'}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default LocationModal;
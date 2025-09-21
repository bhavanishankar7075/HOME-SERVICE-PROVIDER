// This file simulates a response from your backend API.

export const getMockProviderData = () => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        stats: {
          newBookings: 2,
          activeJobs: 1,
          weeklyEarnings: 4500,
          rating: 4.8,
        },
        newBookings: [
          { id: 'bk001', serviceName: 'Leaky Faucet Repair', customer: { name: 'Ravi Kumar', avatar: '/path/to/avatar1.jpg' }, time: '4:00 PM' },
          { id: 'bk002', serviceName: 'AC Installation', customer: { name: 'Priya Sharma', avatar: '/path/to/avatar2.jpg' }, time: '6:30 PM' },
        ],
        todaysSchedule: [
          { id: 'job001', serviceName: 'Switchboard Fixing', customer: { name: 'Amit Singh' }, location: 'Dwaraka Nagar', time: '11:00 AM' },
        ],
        recentFeedback: [
          { id: 'fb001', customer: { name: 'Sunita Rao', avatar: '/path/to/avatar3.jpg' }, rating: 5, comment: 'Very professional and quick service. Highly recommended!' },
        ],
        isAvailable: true,
      });
    }, 1000); // Simulate a 1-second network delay
  });
};
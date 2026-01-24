import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SubscriptionSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/providerhome', { replace: true });
  }, []);

  return null;
};

export default SubscriptionSuccess;

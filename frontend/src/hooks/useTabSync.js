import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { clearUser } from '../redux/authSlice';

export const useTabSync = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { token } = useSelector((state) => state.auth);

  useEffect(() => {
    const channel = new BroadcastChannel('auth-sync');

    const handleMessage = (event) => {
      if (event.data === 'logout' && token) {
        console.log('useTabSync: User logged out from another tab. Syncing logout.');
        dispatch(clearUser());
        navigate('/login');
      }
    };

    channel.addEventListener('message', handleMessage);

    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, [dispatch, navigate, token]);

  const broadcastLogout = () => {
    const channel = new BroadcastChannel('auth-sync');
    channel.postMessage('logout');
    channel.close();
  };

  return { broadcastLogout };
};


















































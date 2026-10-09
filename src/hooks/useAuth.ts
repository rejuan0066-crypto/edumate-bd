import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

export const useOptionalAuth = () => {
  const context = useContext(AuthContext);
  return context ?? { user: null, role: null, profile: null, session: null, loading: false };
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
};

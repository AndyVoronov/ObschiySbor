import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../lib/api';
import { getStoredAuth, setStoredAuth, clearStoredAuth, isAuthenticated } from '../lib/authStorage';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check stored auth on mount
  useEffect(() => {
    const auth = getStoredAuth();
    if (auth?.user && isAuthenticated()) {
      setUser(auth.user);
    }
    setLoading(false);
  }, []);

  const signIn = useCallback(async (email, password) => {
    const { data } = await authApi.login(email, password);
    setStoredAuth(data);
    setUser(data.user);
    return data;
  }, []);

  const signUp = useCallback(async (email, password, userData) => {
    const { data } = await authApi.register({
      email,
      password,
      full_name: userData.full_name || '',
      city: userData.city || '',
      interests: userData.interests || '',
      gender: userData.gender,
      referral_code: userData.referral_code,
    });
    setStoredAuth(data);
    setUser(data.user);
    return data;
  }, []);

  const signOut = useCallback(() => {
    clearStoredAuth();
    setUser(null);
  }, []);

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    // Hard timeout: NEVER block the app more than 4 seconds
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 4000);

    try {
      const currentUser = await base44.auth.me();
      if (currentUser) {
        setUser(currentUser);
        setIsAuthenticated(true);
      }
    } catch (error) {
      // auth_required, user_not_registered, or network error
      const reason = error?.data?.extra_data?.reason || error?.message || '';
      if (reason === 'user_not_registered') {
        setAuthError({ type: 'user_not_registered' });
      }
      // For auth_required and all other errors: just mark as unauthenticated
      // Public pages (Landing, Welcome*) work without auth
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      clearTimeout(timer);
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    base44.auth.logout();
  };

  const navigateToLogin = (nextUrl) => {
    base44.auth.redirectToLogin(nextUrl || window.location.href);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoading,
      // Legacy compat aliases used by App.jsx and other pages
      isLoadingAuth: isLoading,
      isLoadingPublicSettings: false,
      authError,
      appPublicSettings: null,
      logout,
      navigateToLogin,
      checkAppState: checkAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import React from 'react';
import useAuthStore from '@/stores/authStore';


import { setupApiInterceptors } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

// NOTE: useAuthStore is default export in your file; adjust import if needed.
// const { login, logout, isAuthenticated, user, signupInProgress } = useAuthStore(); // not allowed at top-level
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001/api/v1';
const AuthInitializer = ({ children }: { children: React.ReactNode }) => {
  const { login, logout, isAuthenticated, user, signupInProgress } = useAuthStore();
  const setLoading = useAuthStore((s) => s.setLoading); // <- store API to flip isLoading
  const location = useLocation();

  const [isAuthAndDataLoaded, setIsAuthAndDataLoaded] = useState(false); // combined loading local flag
  const hasSetupInterceptors = useRef(false);

  // initial auth check via react-query
  const { data, isLoading: isAuthQueryLoading, isError: isAuthQueryError } = useQuery({
    queryKey: ['authStatus', location.pathname],
    queryFn: async () => {
      try {

        const response = await axios.get(`${API_BASE_URL}/auth/check-auth`, {

          withCredentials: true,

        });

        return response.data;

      } catch (error) {

        throw error; 

      }
    },
    enabled: true,
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });

  // Set up interceptors once
  useEffect(() => {
    if (!hasSetupInterceptors.current) {
      setupApiInterceptors(logout);
      hasSetupInterceptors.current = true;
    }
  }, [logout]);

  // Manage global loading based on query lifecycle
  useEffect(() => {
    // When component mounts and query starts, mark loading true
    setLoading(true);

    return () => {
      // ensure we clear loading on unmount
      setLoading(false);
    };
  }, [setLoading]);

  // Handle auth query result
  useEffect(() => {
    if (!isAuthQueryLoading) {
      if (data?.success && data.user) {
        // user authenticated
        if (!isAuthenticated || user?._id !== data.user._id) {
          login(data.user, false); // login without toast
        }
      } else {
        // not authenticated
        if (!signupInProgress && isAuthenticated) {
          // only logout if not in signup flow and currently authenticated
          logout(true);
        }
      }

      // mark local completed and clear global loading
      setIsAuthAndDataLoaded(true);
      setLoading(false);
    }
  }, [
    isAuthQueryLoading,
    data,
    isAuthQueryError,
    login,
    logout,
    isAuthenticated,
    user,
    signupInProgress,
    setLoading,
  ]);

  // While local initializer not complete show skeleton
  if (!isAuthAndDataLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // render children once initialization complete
  return <>{children}</>;
};

export default AuthInitializer;

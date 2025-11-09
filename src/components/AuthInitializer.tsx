import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import React from 'react';
import useAuthStore from '@/stores/authStore';

import { Skeleton } from './ui/skeleton';

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
      <div className="flex flex-col min-h-screen">
        <header className="border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Skeleton className="h-8 w-24" />
            <div className="flex items-center space-x-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        </header>
        <main className="flex-grow container mx-auto p-8">
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-xl text-gray-700">Loading your session...</p>
            <div className="mt-8 w-full max-w-3xl space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  // render children once initialization complete
  return <>{children}</>;
};

export default AuthInitializer;

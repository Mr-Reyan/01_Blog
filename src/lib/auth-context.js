'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { rawAxios } from './api';
import api from './api';
import { getAccessToken, setTokens, clearTokens, getRefreshToken } from './tokens';
import { useRouter } from 'next/navigation';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();

  const fetchUser = async () => {
    const token = getAccessToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/me/');
      setUser(response.data);
    } catch (error) {
      // Token invalid, clear it
      clearTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (username, password) => {
    const response = await rawAxios.post('/auth/login/', {
      username,
      password,
    });
    const { access, refresh } = response.data;
    setTokens(access, refresh);
    
    // CRITICAL: Clear all cached queries to prevent data leakage between users
    queryClient.clear();
    
    // Fetch user data after login
    const userResponse = await api.get('/auth/me/');
    setUser(userResponse.data);
    
    return userResponse.data;
  };

  const logout = async () => {
    const refreshToken = getRefreshToken();
    
    // CRITICAL: Clear all cached queries to prevent data leakage
    queryClient.clear();
    
    // Always clear local state even if backend fails
    clearTokens();
    setUser(null);
    
    // Attempt to notify backend, but don't wait or throw
    if (refreshToken) {
      try {
        await api.post('/auth/logout/', { refresh: refreshToken });
      } catch (error) {
        // Silently ignore backend errors during logout
      }
    }
    
    router.push('/login');
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

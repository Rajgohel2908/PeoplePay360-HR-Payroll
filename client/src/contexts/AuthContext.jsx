// client/src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('peoplepay_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('peoplepay_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifyUser() {
      if (token) {
        try {
          const res = await api.get('/auth/profile');
          if (res.success) {
            setUser(res.data);
            localStorage.setItem('peoplepay_user', JSON.stringify(res.data));
          }
        } catch (err) {
          console.error('Session expired:', err.message);
          logout();
        }
      }
      setLoading(false);
    }
    verifyUser();
  }, [token]);

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    if (res.success) {
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem('peoplepay_token', res.data.token);
      localStorage.setItem('peoplepay_user', JSON.stringify(res.data.user));
      return res.data.user;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('peoplepay_token');
    localStorage.removeItem('peoplepay_user');
  };

  // Helper for quick demo role switcher
  const switchDemoRole = async (username, password) => {
    return await login(username, password);
  };

  const hasRole = (roles) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    const allowed = Array.isArray(roles) ? roles : [roles];
    return allowed.includes(user.role);
  };

  const isEmployeeOnly = user?.role === 'employee';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
        switchDemoRole,
        hasRole,
        isEmployeeOnly
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

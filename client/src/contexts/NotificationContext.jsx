// client/src/contexts/NotificationContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((msgOrObj, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    let message = msgOrObj;
    let toastType = type;
    if (typeof msgOrObj === 'object' && msgOrObj !== null) {
      message = msgOrObj.message || msgOrObj.title || 'Notification';
      toastType = msgOrObj.type || type;
    }
    setToasts(prev => [...prev, { id, message, type: toastType }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showSuccess = useCallback((msg) => addToast(msg, 'success'), [addToast]);
  const showError = useCallback((msg) => addToast(msg, 'error', 6000), [addToast]);
  const showWarning = useCallback((msg) => addToast(msg, 'warning', 5000), [addToast]);
  const showInfo = useCallback((msg) => addToast(msg, 'info'), [addToast]);

  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem('peoplepay_token');
    if (!token) return;
    try {
      const res = await api.get('/notifications');
      if (res && res.success) {
        setNotifications(res.data || []);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (err) {
      // Quiet fail if unauthenticated
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('peoplepay_token');
    if (token) {
      fetchNotifications();
    }
    const interval = setInterval(() => {
      const currentToken = localStorage.getItem('peoplepay_token');
      if (currentToken) {
        fetchNotifications();
      }
    }, 30000); // Polling every 30s
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      showSuccess('All notifications marked as read.');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        toasts,
        addToast,
        removeToast,
        showSuccess,
        showError,
        showWarning,
        showInfo
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export const useNotification = useNotifications;

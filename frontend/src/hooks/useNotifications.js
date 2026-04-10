import { useEffect, useState, useRef } from 'react';
import { notificationsApi, wsHelpers } from '../lib/api';
import { getAccessToken } from '../lib/authStorage';

/**
 * Хук для работы с уведомлениями через API + WebSocket
 * @param {string} userId - ID пользователя
 * @returns {Object} - Объект с уведомлениями и методами управления
 */
export const useNotifications = (userId) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [permission, setPermission] = useState('default');
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Запрос разрешения на уведомления
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);

      if (Notification.permission === 'default') {
        Notification.requestPermission().then((perm) => {
          setPermission(perm);
        });
      }
    }
  }, []);

  // Загрузка начальных уведомлений
  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = async () => {
      try {
        const { data } = await notificationsApi.list();
        if (data) {
          setNotifications(data);
          setUnreadCount(data.filter(n => !n.is_read).length);
        }
      } catch (err) {
        console.error('Error loading notifications:', err);
      }
    };

    fetchNotifications();
  }, [userId]);

  // WebSocket для real-time уведомлений
  useEffect(() => {
    if (!userId) return;

    const token = getAccessToken();
    if (!token) return;

    const connectWs = () => {
      try {
        const url = wsHelpers.getNotificationsUrl(token);
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => console.log('Notification WS connected');
        ws.onmessage = (event) => {
          try {
            const newNotification = JSON.parse(event.data);
            setNotifications((prev) => [newNotification, ...prev]);
            setUnreadCount((prev) => prev + 1);

            if ('Notification' in window && Notification.permission === 'granted') {
              const notification = new Notification('Общий сбор!', {
                body: newNotification.message,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: newNotification.id,
              });
              setTimeout(() => notification.close(), 5000);
              notification.onclick = () => {
                window.focus();
                if (newNotification.event_id) {
                  window.location.href = `/events/${newNotification.event_id}`;
                }
                notification.close();
              };
            }
          } catch (err) {
            console.error('Error parsing WS notification:', err);
          }
        };
        ws.onclose = () => {
          console.log('Notification WS closed, reconnecting...');
          reconnectTimeoutRef.current = setTimeout(connectWs, 5000);
        };
        ws.onerror = () => {
          ws.close();
        };
      } catch (err) {
        console.error('Error connecting notification WS:', err);
        reconnectTimeoutRef.current = setTimeout(connectWs, 10000);
      }
    };

    connectWs();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [userId]);

  // Отметить уведомление как прочитанное
  const markAsRead = async (notificationId) => {
    try {
      await notificationsApi.markRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  // Отметить все уведомления как прочитанные
  const markAllAsRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  // Удалить уведомление
  const deleteNotification = async (notificationId) => {
    try {
      await notificationsApi.delete(notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      const deletedNotification = notifications.find((n) => n.id === notificationId);
      if (deletedNotification && !deletedNotification.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  return {
    notifications,
    unreadCount,
    permission,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
};

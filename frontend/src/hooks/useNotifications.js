import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Хук для работы с real-time уведомлениями
 * @param {string} userId - ID пользователя
 * @returns {Object} - Объект с уведомлениями и методами управления
 */
export const useNotifications = (userId) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [permission, setPermission] = useState('default');

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
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    };

    fetchNotifications();
  }, [userId]);

  // Подписка на real-time обновления
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new;

          // Добавляем уведомление в список
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);

          // Показываем браузерное уведомление
          if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification('Общий сбор!', {
              body: newNotification.message,
              icon: '/favicon.ico',
              badge: '/favicon.ico',
              tag: newNotification.id,
            });

            // Автоматически закрываем через 5 секунд
            setTimeout(() => notification.close(), 5000);

            // Обработка клика по уведомлению
            notification.onclick = () => {
              window.focus();
              if (newNotification.event_id) {
                window.location.href = `/events/${newNotification.event_id}`;
              }
              notification.close();
            };
          }
        }
      )
      .subscribe();

    // Очистка при размонтировании
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Отметить уведомление как прочитанное
  const markAsRead = async (notificationId) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  // Отметить все уведомления как прочитанные
  const markAllAsRead = async () => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  };

  // Удалить уведомление
  const deleteNotification = async (notificationId) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (!error) {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      const deletedNotification = notifications.find((n) => n.id === notificationId);
      if (deletedNotification && !deletedNotification.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
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

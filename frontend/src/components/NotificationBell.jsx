import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './NotificationBell.css';

export default function NotificationBell() {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } =
    useNotifications(user?.id);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Закрытие дропдауна при клике вне его
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return t('notifications.justNow');
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} ${t('notifications.minutesAgo')}`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ${t('notifications.hoursAgo')}`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} ${t('notifications.daysAgo')}`;
    return date.toLocaleDateString('ru-RU');
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'event_update':
        return '📝';
      case 'event_cancelled':
        return '❌';
      case 'new_participant':
        return '👥';
      case 'event_reminder':
        return '⏰';
      default:
        return '🔔';
    }
  };

  return (
    <div className="notification-bell" ref={dropdownRef}>
      <button
        className="bell-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t('notifications.title')}
      >
        🔔
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>{t('notifications.title')}</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="mark-all-read">
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">
                <p>{t('notifications.noNotifications')}</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${notification.is_read ? 'read' : 'unread'}`}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="notification-content">
                    {notification.event_id ? (
                      <Link
                        to={`/events/${notification.event_id}`}
                        onClick={() => {
                          markAsRead(notification.id);
                          setIsOpen(false);
                        }}
                      >
                        <p className="notification-message">{notification.message}</p>
                      </Link>
                    ) : (
                      <p
                        className="notification-message"
                        onClick={() => markAsRead(notification.id)}
                      >
                        {notification.message}
                      </p>
                    )}
                    <span className="notification-time">
                      {formatDate(notification.created_at)}
                    </span>
                  </div>
                  <button
                    className="notification-delete"
                    onClick={() => deleteNotification(notification.id)}
                    aria-label="Удалить"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

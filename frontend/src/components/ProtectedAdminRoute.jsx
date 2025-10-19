import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

/**
 * Компонент для защиты админ/модератор роутов
 * Проверяет что пользователь авторизован И имеет роль moderator/admin
 */
const ProtectedAdminRoute = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [isModerator, setIsModerator] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkModeratorRole = async () => {
      if (!user) {
        setIsModerator(false);
        setChecking(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        const hasAccess = profile?.role === 'moderator' || profile?.role === 'admin';
        setIsModerator(hasAccess);
      } catch (error) {
        console.error('Ошибка проверки роли:', error);
        setIsModerator(false);
      } finally {
        setChecking(false);
      }
    };

    checkModeratorRole();
  }, [user]);

  // Показываем загрузку пока проверяем авторизацию и роль
  if (authLoading || checking) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        fontSize: '1.2rem',
        color: '#7f8c8d'
      }}>
        Проверка прав доступа...
      </div>
    );
  }

  // Если не авторизован - редирект на логин
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Если авторизован, но не модератор - редирект на главную с сообщением
  if (isModerator === false) {
    return (
      <div style={{
        maxWidth: '600px',
        margin: '4rem auto',
        padding: '2rem',
        textAlign: 'center',
        background: '#fff3cd',
        borderRadius: '10px',
        border: '2px solid #ffc107'
      }}>
        <h2 style={{ color: '#856404', marginBottom: '1rem' }}>
          Доступ запрещён
        </h2>
        <p style={{ color: '#856404', marginBottom: '1.5rem' }}>
          Эта страница доступна только модераторам и администраторам.
        </p>
        <a
          href="/"
          style={{
            display: 'inline-block',
            padding: '0.75rem 2rem',
            background: '#ffc107',
            color: '#000',
            textDecoration: 'none',
            borderRadius: '6px',
            fontWeight: 'bold',
            transition: 'background 0.2s'
          }}
        >
          Вернуться на главную
        </a>
      </div>
    );
  }

  // Если авторизован и модератор - показываем контент
  return children;
};

export default ProtectedAdminRoute;

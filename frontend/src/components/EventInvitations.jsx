import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './EventInvitations.css';

const EventInvitations = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});

  useEffect(() => {
    if (user) {
      fetchInvitations();
    }
  }, [user]);

  const fetchInvitations = async () => {
    try {
      setLoading(true);

      // Получаем все приглашения для текущего пользователя
      const { data, error } = await supabase
        .from('event_invitations')
        .select(`
          id,
          event_id,
          inviter_id,
          status,
          message,
          created_at,
          event:event_id (
            id,
            title,
            category,
            event_date,
            location,
            image_url,
            price
          ),
          inviter:inviter_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('invitee_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setInvitations(data || []);
    } catch (error) {
      console.error('Ошибка загрузки приглашений:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invitationId, eventId) => {
    try {
      setProcessing({ ...processing, [invitationId]: true });

      // Обновляем статус приглашения на 'accepted'
      const { error: updateError } = await supabase
        .from('event_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitationId);

      if (updateError) throw updateError;

      // Триггер базы данных автоматически добавит в участники
      alert('Вы приняли приглашение! Вы добавлены в участники события.');

      // Обновляем список приглашений
      await fetchInvitations();

      // Можно перейти на страницу события
      navigate(`/events/${eventId}`);
    } catch (error) {
      console.error('Ошибка принятия приглашения:', error);
      alert('Не удалось принять приглашение');
    } finally {
      setProcessing({ ...processing, [invitationId]: false });
    }
  };

  const handleReject = async (invitationId) => {
    try {
      setProcessing({ ...processing, [invitationId]: true });

      // Обновляем статус приглашения на 'rejected'
      const { error } = await supabase
        .from('event_invitations')
        .update({ status: 'rejected' })
        .eq('id', invitationId);

      if (error) throw error;

      alert('Вы отклонили приглашение');

      // Обновляем список приглашений
      await fetchInvitations();
    } catch (error) {
      console.error('Ошибка отклонения приглашения:', error);
      alert('Не удалось отклонить приглашение');
    } finally {
      setProcessing({ ...processing, [invitationId]: false });
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      board_games: '🎲',
      cycling: '🚴',
      hiking: '🥾',
      running: '🏃',
      yoga: '🧘',
      swimming: '🏊',
      football: '⚽',
      basketball: '🏀',
      volleyball: '🏐',
      tennis: '🎾',
      photography: '📷',
      painting: '🎨',
      music: '🎵',
      cinema: '🎬',
      theater: '🎭',
      cooking: '👨‍🍳',
      reading: '📚',
      language: '🗣️',
      dancing: '💃',
      travel: '✈️',
      other: '🎯'
    };
    return icons[category] || '🎯';
  };

  if (loading) {
    return <div className="invitations-loading">Загрузка приглашений...</div>;
  }

  return (
    <div className="event-invitations-container">
      {invitations.length === 0 ? (
        <div className="invitations-empty">
          <p>📭 У вас нет новых приглашений в события</p>
          <p className="hint">Когда друзья пригласят вас в события, они появятся здесь</p>
        </div>
      ) : (
        <div className="invitations-grid">
          {invitations.map(invitation => (
            <div key={invitation.id} className="invitation-card">
              <div className="invitation-header">
                <div className="inviter-info">
                  <div className="inviter-avatar">
                    {invitation.inviter.avatar_url ? (
                      <img src={invitation.inviter.avatar_url} alt={invitation.inviter.full_name} />
                    ) : (
                      <div className="avatar-placeholder-inv">👤</div>
                    )}
                  </div>
                  <div className="inviter-text">
                    <span className="inviter-name">{invitation.inviter.full_name || 'Пользователь'}</span>
                    <span className="invitation-action">пригласил вас на событие</span>
                  </div>
                </div>
                <span className="invitation-date">
                  {new Date(invitation.created_at).toLocaleDateString('ru-RU')}
                </span>
              </div>

              {invitation.message && (
                <div className="invitation-message-box">
                  <p className="message-label">💬 Сообщение:</p>
                  <p className="message-text">"{invitation.message}"</p>
                </div>
              )}

              <div className="event-preview">
                {invitation.event.image_url && (
                  <div className="event-image-preview">
                    <img src={invitation.event.image_url} alt={invitation.event.title} />
                  </div>
                )}
                <div className="event-info-preview">
                  <h3 className="event-title-preview">
                    {getCategoryIcon(invitation.event.category)} {invitation.event.title}
                  </h3>
                  <p className="event-date-preview">
                    📅 {new Date(invitation.event.event_date).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  <p className="event-location-preview">📍 {invitation.event.location}</p>
                  {invitation.event.price > 0 && (
                    <p className="event-price-preview">💰 {invitation.event.price} ₽</p>
                  )}
                </div>
              </div>

              <div className="invitation-actions">
                <button
                  className="btn-accept-inv"
                  onClick={() => handleAccept(invitation.id, invitation.event.id)}
                  disabled={processing[invitation.id]}
                >
                  {processing[invitation.id] ? 'Принимаю...' : '✓ Принять'}
                </button>
                <button
                  className="btn-reject-inv"
                  onClick={() => handleReject(invitation.id)}
                  disabled={processing[invitation.id]}
                >
                  {processing[invitation.id] ? 'Отклоняю...' : '✗ Отклонить'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventInvitations;

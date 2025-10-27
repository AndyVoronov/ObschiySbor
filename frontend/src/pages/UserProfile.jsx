import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import supabase from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import './UserProfile.css';

const UserProfile = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const { t } = useTranslation('common');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('created');
  const [events, setEvents] = useState({ created: [], participated: [] });

  useEffect(() => {
    if (userId) {
      loadUserProfile();
      loadUserEvents();
    }
  }, [userId]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      setError('');

      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      if (!data) {
        setError(t('userProfile.notFound'));
        return;
      }

      setProfile(data);
    } catch (err) {
      console.error('Error loading user profile:', err);
      setError(t('userProfile.errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  const loadUserEvents = async () => {
    try {
      // Загрузка созданных событий
      const { data: createdEvents, error: createdError } = await supabase
        .from('events')
        .select('*')
        .eq('creator_id', userId)
        .eq('moderation_status', 'active')
        .order('event_date', { ascending: false })
        .limit(20);

      if (createdError) throw createdError;

      // Загрузка событий, в которых участвует пользователь
      const { data: participations, error: participationsError } = await supabase
        .from('event_participants')
        .select(`
          event:events(*)
        `)
        .eq('user_id', userId)
        .eq('status', 'joined');

      if (participationsError) throw participationsError;

      const participatedEvents = participations
        ?.map(p => p.event)
        .filter(e => e && e.moderation_status === 'active')
        .filter(e => e.creator_id !== userId) // Исключаем собственные события
        .sort((a, b) => new Date(b.event_date) - new Date(a.event_date))
        .slice(0, 20);

      setEvents({
        created: createdEvents || [],
        participated: participatedEvents || []
      });
    } catch (err) {
      console.error('Error loading user events:', err);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAvatarUrl = (avatarUrl) => {
    if (!avatarUrl) return '/default-avatar.png';
    if (avatarUrl.startsWith('http')) return avatarUrl;
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${avatarUrl}`;
  };

  if (loading) {
    return <div className="loading">{t('common.loading')}</div>;
  }

  if (error || !profile) {
    return (
      <div className="user-profile-error">
        <h2>{error || t('userProfile.notFound')}</h2>
        <Link to="/" className="btn-primary">{t('common.back')}</Link>
      </div>
    );
  }

  // Если это профиль текущего пользователя, редирект на /profile
  if (user && user.id === userId) {
    window.location.href = '/profile';
    return null;
  }

  return (
    <div className="user-profile-container">
      <div className="user-profile-header">
        <div className="user-avatar-section">
          <img
            src={getAvatarUrl(profile.avatar_url)}
            alt={profile.full_name}
            className="user-avatar-large"
          />
        </div>
        <div className="user-info-section">
          <h1 className="user-name">{profile.full_name}</h1>
          {profile.city && (
            <p className="user-city">
              <span className="icon">📍</span>
              {profile.city}
            </p>
          )}
          {profile.bio && (
            <p className="user-bio">{profile.bio}</p>
          )}
          <div className="user-stats">
            <div className="stat-item">
              <span className="stat-value">{events.created.length}</span>
              <span className="stat-label">{t('userProfile.eventsCreated')}</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{events.participated.length}</span>
              <span className="stat-label">{t('userProfile.eventsParticipated')}</span>
            </div>
            {profile.level && (
              <div className="stat-item">
                <span className="stat-value">
                  {t('gamification.level')} {profile.level}
                </span>
                <span className="stat-label">{profile.experience_points} XP</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="user-events-section">
        <div className="tabs">
          <button
            className={`tab-button ${activeTab === 'created' ? 'active' : ''}`}
            onClick={() => setActiveTab('created')}
          >
            {t('userProfile.createdEvents')} ({events.created.length})
          </button>
          <button
            className={`tab-button ${activeTab === 'participated' ? 'active' : ''}`}
            onClick={() => setActiveTab('participated')}
          >
            {t('userProfile.participatedEvents')} ({events.participated.length})
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'created' && (
            <div className="events-list">
              {events.created.length === 0 ? (
                <p className="no-events">{t('userProfile.noCreatedEvents')}</p>
              ) : (
                <div className="events-grid">
                  {events.created.map(event => (
                    <Link
                      key={event.id}
                      to={`/events/${event.id}`}
                      className="event-card"
                    >
                      {event.image_url && (
                        <div className="event-image">
                          <img src={event.image_url} alt={event.title} />
                        </div>
                      )}
                      <div className="event-content">
                        <h3 className="event-title">{event.title}</h3>
                        <p className="event-category">
                          {t(`categories.${event.category}`)}
                        </p>
                        <p className="event-date">
                          <span className="icon">📅</span>
                          {formatDateTime(event.event_date)}
                        </p>
                        {event.location && (
                          <p className="event-location">
                            <span className="icon">📍</span>
                            {event.location}
                          </p>
                        )}
                        <div className="event-meta">
                          <span className="participants">
                            👥 {event.current_participants}/{event.max_participants}
                          </span>
                          {event.price > 0 && (
                            <span className="price">{event.price} ₽</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'participated' && (
            <div className="events-list">
              {events.participated.length === 0 ? (
                <p className="no-events">{t('userProfile.noParticipatedEvents')}</p>
              ) : (
                <div className="events-grid">
                  {events.participated.map(event => (
                    <Link
                      key={event.id}
                      to={`/events/${event.id}`}
                      className="event-card"
                    >
                      {event.image_url && (
                        <div className="event-image">
                          <img src={event.image_url} alt={event.title} />
                        </div>
                      )}
                      <div className="event-content">
                        <h3 className="event-title">{event.title}</h3>
                        <p className="event-category">
                          {t(`categories.${event.category}`)}
                        </p>
                        <p className="event-date">
                          <span className="icon">📅</span>
                          {formatDateTime(event.event_date)}
                        </p>
                        {event.location && (
                          <p className="event-location">
                            <span className="icon">📍</span>
                            {event.location}
                          </p>
                        )}
                        <div className="event-meta">
                          <span className="participants">
                            👥 {event.current_participants}/{event.max_participants}
                          </span>
                          {event.price > 0 && (
                            <span className="price">{event.price} ₽</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;

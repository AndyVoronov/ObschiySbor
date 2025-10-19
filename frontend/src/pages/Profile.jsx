import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import AvatarUpload from '../components/AvatarUpload';
import { OrganizerDashboard, ChartLoadingFallback } from '../components/LazyComponents';
import ConnectedAccounts from '../components/ConnectedAccounts';
import './Profile.css';

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [myEvents, setMyEvents] = useState([]);
  const [participatingEvents, setParticipatingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    full_name: '',
    city: '',
    interests: '',
    gender: '',
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchMyEvents();
      fetchParticipatingEvents();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Ошибка загрузки профиля:', error);
        // Если профиль не найден, создаём пустой объект
        setProfile({
          id: user.id,
          full_name: '',
          city: '',
          interests: '',
          gender: '',
        });
      } else {
        setProfile(data);
        setFormData({
          full_name: data.full_name || '',
          city: data.city || '',
          interests: data.interests || '',
          gender: data.gender || '',
        });
      }
    } catch (error) {
      console.error('Ошибка загрузки профиля:', error);
      // В случае любой ошибки создаём пустой профиль
      setProfile({
        id: user.id,
        full_name: '',
        city: '',
        interests: '',
        gender: '',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMyEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyEvents(data || []);
    } catch (error) {
      console.error('Ошибка загрузки событий:', error.message);
    }
  };

  const fetchParticipatingEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('event_participants')
        .select(`
          *,
          events (*)
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      setParticipatingEvents(data?.map(p => p.events) || []);
    } catch (error) {
      console.error('Ошибка загрузки участий:', error.message);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('profiles')
        .update(formData)
        .eq('id', user.id);

      if (error) throw error;

      setProfile({ ...profile, ...formData });
      setEditing(false);
    } catch (error) {
      console.error('Ошибка обновления профиля:', error.message);
    }
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  const handleAvatarUpdate = (newAvatarUrl) => {
    setProfile({ ...profile, avatar_url: newAvatarUrl });
  };

  const getGenderLabel = (gender) => {
    const labels = {
      male: '👨 Мужской',
      female: '👩 Женский',
      other: '⚧️ Другое'
    };
    return labels[gender] || '';
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Ошибка выхода:', error.message);
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-info">
          <div className="profile-avatar-section">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="profile-avatar" />
            ) : (
              <div className="profile-avatar-placeholder">👤</div>
            )}
          </div>
          <div>
            <h1>{profile?.full_name || 'Имя не указано'}</h1>
            <p className="profile-email">{user?.email}</p>
            {profile?.city && <p className="profile-city">📍 {profile.city}</p>}
            {profile?.gender && <p className="profile-gender">{getGenderLabel(profile.gender)}</p>}
          </div>
        </div>
        <div className="profile-header-actions">
          <button
            onClick={() => setEditing(!editing)}
            className="btn btn-secondary"
          >
            {editing ? 'Отмена' : 'Редактировать'}
          </button>
          <button
            onClick={handleSignOut}
            className="btn btn-danger"
          >
            🚪 Выход
          </button>
        </div>
      </div>

      {/* Табы */}
      <div className="profile-tabs">
        <button
          className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Профиль
        </button>
        <button
          className={`tab-button ${activeTab === 'accounts' ? 'active' : ''}`}
          onClick={() => setActiveTab('accounts')}
        >
          Подключенные аккаунты
        </button>
        <button
          className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Дашборд организатора
        </button>
      </div>

      {activeTab === 'profile' && (
        <>
          {editing && (
            <form onSubmit={handleSubmit} className="profile-edit-form">
              {/* Загрузка аватара */}
              <AvatarUpload
                currentAvatar={profile?.avatar_url}
                userId={user.id}
                onAvatarUpdate={handleAvatarUpdate}
              />

              <div className="form-group">
                <label htmlFor="full_name">Имя</label>
                <input
                  type="text"
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="gender">Пол</label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                >
                  <option value="">Не указан</option>
                  <option value="male">Мужской</option>
                  <option value="female">Женский</option>
                  <option value="other">Другое</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="city">Город</label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="interests">Интересы</label>
                <textarea
                  id="interests"
                  name="interests"
                  value={formData.interests}
                  onChange={handleChange}
                  rows="3"
                />
              </div>
              <button type="submit" className="btn btn-primary">
                Сохранить
              </button>
            </form>
          )}

          <div className="profile-events">
            <section className="events-section">
              <h2>Мои события ({myEvents.length})</h2>
              {myEvents.length === 0 ? (
                <p className="no-events">Вы еще не создали ни одного события</p>
              ) : (
                <div className="events-list">
                  {myEvents.map(event => (
                    <Link key={event.id} to={`/events/${event.id}`} className="event-item">
                      <h3>{event.title}</h3>
                      <p>{new Date(event.event_date).toLocaleDateString('ru-RU')}</p>
                      <span className="event-status">{event.status}</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="events-section">
              <h2>Участвую ({participatingEvents.length})</h2>
              {participatingEvents.length === 0 ? (
                <p className="no-events">Вы еще не участвуете ни в одном событии</p>
              ) : (
                <div className="events-list">
                  {participatingEvents.map(event => (
                    <Link key={event.id} to={`/events/${event.id}`} className="event-item">
                      <h3>{event.title}</h3>
                      <p>{new Date(event.event_date).toLocaleDateString('ru-RU')}</p>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}

      {activeTab === 'accounts' && (
        <ConnectedAccounts />
      )}

      {activeTab === 'dashboard' && (
        <Suspense fallback={<ChartLoadingFallback />}>
          <OrganizerDashboard userId={user.id} />
        </Suspense>
      )}
    </div>
  );
};

export default Profile;

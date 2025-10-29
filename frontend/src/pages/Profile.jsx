import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AvatarUpload from '../components/AvatarUpload';
import { OrganizerDashboard, ChartLoadingFallback } from '../components/LazyComponents';
import ConnectedAccounts from '../components/ConnectedAccounts';
import FriendsList from '../components/FriendsList';
import EventInvitations from '../components/EventInvitations';
import GamificationPanel from '../components/GamificationPanel';
import ReferralPanel from '../components/ReferralPanel';
import MergeAccountsPanel from '../components/MergeAccountsPanel';
import GameCard from '../components/GameCard';
import './Profile.css';

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const [profile, setProfile] = useState(null);
  const [myEvents, setMyEvents] = useState([]);
  const [participatingEvents, setParticipatingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [invitationsCount, setInvitationsCount] = useState(0);
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
      fetchInvitationsCount();
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
        console.error(t('profile.errorLoadingProfile'), error);
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
      console.error(t('profile.errorLoadingProfile'), error);
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
      console.error(t('profile.errorLoadingEvents'), error.message);
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
      console.error(t('profile.errorLoadingParticipations'), error.message);
    }
  };

  const fetchInvitationsCount = async () => {
    try {
      const { count, error } = await supabase
        .from('event_invitations')
        .select('*', { count: 'exact', head: true })
        .eq('invitee_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;
      setInvitationsCount(count || 0);
    } catch (error) {
      console.error('Ошибка загрузки количества приглашений:', error.message);
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
      console.error(t('profile.errorUpdatingProfile'), error.message);
    }
  };

  if (loading) {
    return <div className="loading">{t('common.loading')}</div>;
  }

  const handleAvatarUpdate = (newAvatarUrl) => {
    setProfile({ ...profile, avatar_url: newAvatarUrl });
  };

  const getGenderLabel = (gender) => {
    const labels = {
      male: `👨 ${t('profile.male')}`,
      female: `👩 ${t('profile.female')}`,
      other: `⚧️ ${t('profile.other')}`
    };
    return labels[gender] || '';
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error(t('profile.errorLogout'), error.message);
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
            <h1>{profile?.full_name || t('profile.noNameProvided')}</h1>
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
            {editing ? t('common.cancel') : t('common.edit')}
          </button>
          <button
            onClick={handleSignOut}
            className="btn btn-danger"
          >
            {t('profile.logout')}
          </button>
        </div>
      </div>

      {/* Табы - Desktop горизонтальные кнопки, Mobile выпадающий список */}
      <div className="profile-tabs-container">
        {/* Mobile: выпадающий список */}
        <select
          className="profile-tabs-select mobile-only"
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value)}
        >
          <option value="profile">{t('profile.title')}</option>
          <option value="invitations">
            {t('profile.invitations')} {invitationsCount > 0 && `(${invitationsCount})`}
          </option>
          <option value="friends">{t('profile.friends')}</option>
          <option value="accounts">{t('profile.connectedAccounts')}</option>
          <option value="progress">{t('gamification.title')}</option>
          <option value="referral">{t('referral.title')}</option>
          <option value="dashboard">{t('profile.dashboard')}</option>
          <option value="merge">{t('accountMerge.tabTitle')}</option>
        </select>

        {/* Desktop: горизонтальные кнопки */}
        <div className="profile-tabs desktop-only">
          <button
            className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            {t('profile.title')}
          </button>
          <button
            className={`tab-button ${activeTab === 'invitations' ? 'active' : ''}`}
            onClick={() => setActiveTab('invitations')}
          >
            {t('profile.invitations')}
            {invitationsCount > 0 && (
              <span className="tab-badge">{invitationsCount}</span>
            )}
          </button>
          <button
            className={`tab-button ${activeTab === 'friends' ? 'active' : ''}`}
            onClick={() => setActiveTab('friends')}
          >
            {t('profile.friends')}
          </button>
          <button
            className={`tab-button ${activeTab === 'accounts' ? 'active' : ''}`}
            onClick={() => setActiveTab('accounts')}
          >
            {t('profile.connectedAccounts')}
          </button>
          <button
            className={`tab-button ${activeTab === 'progress' ? 'active' : ''}`}
            onClick={() => setActiveTab('progress')}
          >
            {t('gamification.title')}
          </button>
          <button
            className={`tab-button ${activeTab === 'referral' ? 'active' : ''}`}
            onClick={() => setActiveTab('referral')}
          >
            {t('referral.title')}
          </button>
          <button
            className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            {t('profile.dashboard')}
          </button>
          <button
            className={`tab-button ${activeTab === 'merge' ? 'active' : ''}`}
            onClick={() => setActiveTab('merge')}
          >
            {t('accountMerge.tabTitle')}
          </button>
        </div>
      </div>

      {activeTab === 'profile' && (
        <>
          <GameCard userId={user.id} />

          {editing && (
            <form onSubmit={handleSubmit} className="profile-edit-form">
              {/* Загрузка аватара */}
              <AvatarUpload
                currentAvatar={profile?.avatar_url}
                userId={user.id}
                onAvatarUpdate={handleAvatarUpdate}
              />

              <div className="form-group">
                <label htmlFor="full_name">{t('profile.name')}</label>
                <input
                  type="text"
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="gender">{t('profile.gender')}</label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                >
                  <option value="">{t('profile.notSpecified')}</option>
                  <option value="male">{t('profile.male')}</option>
                  <option value="female">{t('profile.female')}</option>
                  <option value="other">{t('profile.other')}</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="city">{t('profile.city')}</label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="interests">{t('profile.interests')}</label>
                <textarea
                  id="interests"
                  name="interests"
                  value={formData.interests}
                  onChange={handleChange}
                  rows="3"
                />
              </div>
              <button type="submit" className="btn btn-primary">
                {t('common.save')}
              </button>
            </form>
          )}

          <div className="profile-events">
            <section className="events-section">
              <h2>{t('profile.myEvents')} ({myEvents.length})</h2>
              {myEvents.length === 0 ? (
                <p className="no-events">{t('profile.noEventsCreated')}</p>
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
              <h2>{t('profile.joinedEvents')} ({participatingEvents.length})</h2>
              {participatingEvents.length === 0 ? (
                <p className="no-events">{t('profile.noEventsJoined')}</p>
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

      {activeTab === 'invitations' && (
        <EventInvitations />
      )}

      {activeTab === 'friends' && (
        <FriendsList />
      )}

      {activeTab === 'accounts' && (
        <ConnectedAccounts />
      )}

      {activeTab === 'progress' && (
        <GamificationPanel userId={user.id} />
      )}

      {activeTab === 'referral' && (
        <ReferralPanel userId={user.id} />
      )}

      {activeTab === 'dashboard' && (
        <Suspense fallback={<ChartLoadingFallback />}>
          <OrganizerDashboard userId={user.id} />
        </Suspense>
      )}

      {activeTab === 'merge' && (
        <MergeAccountsPanel />
      )}
    </div>
  );
};

export default Profile;

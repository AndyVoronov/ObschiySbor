// Компонент для вкладки "Участники" - отображает список без сворачивания
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { eventsApi, friendsApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import './EventParticipants.css';

const EventDetailsParticipants = ({ eventId, creatorId, eventTitle }) => {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [friendships, setFriendships] = useState({});
  const [addingFriend, setAddingFriend] = useState({});

  useEffect(() => {
    if (user) {
      fetchParticipants();
      fetchFriendships();
    } else {
      fetchParticipants();
    }
  }, [eventId, user]);

  const fetchParticipants = async () => {
    try {
      setLoading(true);

      const { data } = await eventsApi.getParticipants(eventId);

      const participantsList = (data || []).map(p => ({
        ...p,
        joined_at: p.joined_at,
        is_creator: p.user_id === creatorId
      }));

      participantsList.sort((a, b) => {
        if (a.is_creator) return -1;
        if (b.is_creator) return 1;
        return new Date(b.joined_at) - new Date(a.joined_at);
      });

      setParticipants(participantsList);
    } catch (error) {
      console.error('Ошибка загрузки участников:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFriendships = async () => {
    if (!user) return;

    try {
      const { data } = await friendsApi.list();

      const friendshipMap = {};
      (data || []).forEach(friend => {
        friendshipMap[friend.id] = friend.status || 'accepted';
      });

      setFriendships(friendshipMap);
    } catch (error) {
      console.error('Ошибка загрузки дружеских связей:', error);
    }
  };

  const handleAddFriend = async (friendId) => {
    if (!user) return;

    setAddingFriend({ ...addingFriend, [friendId]: true });

    try {
      await friendsApi.request(friendId);

      setFriendships({ ...friendships, [friendId]: 'pending' });
      alert(t('profile.friends.requestSent'));
    } catch (error) {
      console.error('Ошибка добавления в друзья:', error);
      alert(t('profile.friends.addError'));
    } finally {
      setAddingFriend({ ...addingFriend, [friendId]: false });
    }
  };

  if (loading) {
    return (
      <div className="event-participants-tab">
        <div className="loading">{t('common.loading')}</div>
      </div>
    );
  }

  const getFriendButtonText = (participantId) => {
    if (friendships[participantId] === 'accepted') return '✓';
    if (friendships[participantId] === 'pending') return '⏳';
    return '+';
  };

  return (
    <div className="event-participants-tab">
      {loading ? (
        <div className="participants-loading">{t('eventParticipants.loading')}</div>
      ) : participants.length === 0 ? (
        <div className="participants-empty">{t('eventParticipants.empty')}</div>
      ) : (
        <div className="participants-grid">
          {participants.map(participant => (
            <div
              key={participant.id}
              className={`participant-card ${participant.is_creator ? 'creator' : ''}`}
            >
              <div className="participant-avatar">
                {participant.avatar_url ? (
                  <img src={participant.avatar_url} alt={participant.full_name} />
                ) : (
                  <div className="avatar-placeholder">👤</div>
                )}
                {participant.is_creator && (
                  <span className="creator-badge">★</span>
                )}
              </div>
              <div className="participant-info">
                <h4>{participant.full_name || t('eventParticipants.noName')}</h4>
                {participant.city && <span className="participant-city">📍 {participant.city}</span>}
                {participant.joined_at && (
                  <span className="participant-joined">
                    {new Date(participant.joined_at).toLocaleDateString('ru-RU')}
                  </span>
                )}
              </div>
              {user && user.id !== participant.id && (
                <div className="participant-actions">
                  <button
                    className={`btn-add-friend ${friendships[participant.id] ? 'disabled' : ''}`}
                    onClick={() => handleAddFriend(participant.id)}
                    disabled={friendships[participant.id] || addingFriend[participant.id]}
                    title={friendships[participant.id] === 'accepted' ? t('eventParticipants.alreadyFriendsTooltip') : friendships[participant.id] === 'pending' ? t('eventParticipants.pendingTooltip') : t('eventParticipants.addFriendTooltip')}
                  >
                    {addingFriend[participant.id] ? '⏳' : getFriendButtonText(participant.id)}
                  </button>
                  {user.id === creatorId && (
                    <button className="btn-invite" title={t('eventParticipants.inviteToEvent')}>
                      ✉️
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventDetailsParticipants;

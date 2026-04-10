import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { eventsApi, friendsApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import InviteFriendsModal from './InviteFriendsModal';
import './EventParticipants.css';

const EventParticipants = ({ eventId, creatorId, eventTitle }) => {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [friendships, setFriendships] = useState({}); // { userId: 'pending' | 'accepted' | null }
  const [addingFriend, setAddingFriend] = useState({});
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      fetchParticipants();
      fetchFriendships();
    }
  }, [eventId, isOpen, user]);

  const fetchParticipants = async () => {
    try {
      setLoading(true);

      const { data } = await eventsApi.getParticipants(eventId);

      // Формируем список участников с отметкой организатора
      const participantsList = (data || []).map(p => ({
        ...p,
        joined_at: p.joined_at,
        is_creator: p.user_id === creatorId
      }));

      // Сортируем: организатор первый, остальные по дате присоединения
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

      // Формируем объект с информацией о дружбе для каждого пользователя
      const friendshipsMap = {};
      (data || []).forEach(friend => {
        friendshipsMap[friend.id] = friend.status || 'accepted';
      });

      setFriendships(friendshipsMap);
    } catch (error) {
      console.error('Ошибка загрузки друзей:', error);
    }
  };

  const handleAddFriend = async (friendId) => {
    if (!user) return;

    setAddingFriend({ ...addingFriend, [friendId]: true });

    try {
      await friendsApi.request(friendId);

      // Обновляем локальное состояние
      setFriendships({ ...friendships, [friendId]: 'pending' });
    } catch (error) {
      console.error('Ошибка добавления в друзья:', error);
      alert(t('eventParticipants.addFriendError'));
    } finally {
      setAddingFriend({ ...addingFriend, [friendId]: false });
    }
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const getFriendButtonText = (participantId) => {
    const status = friendships[participantId];
    if (status === 'accepted') return `✓ ${t('eventParticipants.alreadyFriends')}`;
    if (status === 'pending') return `⏳ ${t('eventParticipants.friendRequestPending')}`;
    return `➕ ${t('eventParticipants.addFriend')}`;
  };

  return (
    <div className="event-participants">
      <button
        className="participants-toggle"
        onClick={handleToggle}
      >
        <span>👥 {t('eventParticipants.count')} ({participants.length || '...'}) </span>
        <span className={`toggle-icon ${isOpen ? 'open' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <div className="participants-list">
          {user && user.id === creatorId && (
            <div className="participants-actions-bar">
              <button
                className="btn-invite-friends"
                onClick={() => setShowInviteModal(true)}
              >
                ✉️ {t('eventParticipants.inviteFriends')}
              </button>
            </div>
          )}

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
      )}

      {/* Модальное окно приглашения друзей */}
      <InviteFriendsModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        eventId={eventId}
        eventTitle={eventTitle}
      />
    </div>
  );
};

export default EventParticipants;

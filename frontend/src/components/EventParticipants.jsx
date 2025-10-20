import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import InviteFriendsModal from './InviteFriendsModal';
import './EventParticipants.css';

const EventParticipants = ({ eventId, creatorId, eventTitle }) => {
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

      // Получаем всех участников события
      const { data, error } = await supabase
        .from('event_participants')
        .select(`
          user_id,
          joined_at,
          profiles (
            id,
            full_name,
            avatar_url,
            city
          )
        `)
        .eq('event_id', eventId)
        .order('joined_at', { ascending: false });

      if (error) throw error;

      // Также добавим организатора в список
      const { data: creatorData, error: creatorError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, city')
        .eq('id', creatorId)
        .single();

      if (creatorError) throw creatorError;

      // Формируем список участников
      const participantsList = data.map(p => ({
        ...p.profiles,
        joined_at: p.joined_at,
        is_creator: false
      }));

      // Добавляем организатора в начало списка
      if (creatorData) {
        participantsList.unshift({
          ...creatorData,
          joined_at: null,
          is_creator: true
        });
      }

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
      // Получаем все дружеские связи текущего пользователя
      const { data, error } = await supabase
        .from('friendships')
        .select('user_id, friend_id, status')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      if (error) throw error;

      // Формируем объект с информацией о дружбе для каждого пользователя
      const friendshipsMap = {};
      data.forEach(friendship => {
        const friendId = friendship.user_id === user.id ? friendship.friend_id : friendship.user_id;
        friendshipsMap[friendId] = friendship.status;
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
      // Отправляем запрос в друзья
      const { error } = await supabase
        .from('friendships')
        .insert({
          user_id: user.id,
          friend_id: friendId,
          status: 'pending'
        });

      if (error) throw error;

      // Обновляем локальное состояние
      setFriendships({ ...friendships, [friendId]: 'pending' });
    } catch (error) {
      console.error('Ошибка добавления в друзья:', error);
      alert('Не удалось отправить запрос в друзья');
    } finally {
      setAddingFriend({ ...addingFriend, [friendId]: false });
    }
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const getFriendButtonText = (participantId) => {
    const status = friendships[participantId];
    if (status === 'accepted') return '✓ Друзья';
    if (status === 'pending') return '⏳ Ожидание';
    return '➕ В друзья';
  };

  return (
    <div className="event-participants">
      <button
        className="participants-toggle"
        onClick={handleToggle}
      >
        <span>👥 Участники ({participants.length || '...'}) </span>
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
                ✉️ Пригласить друзей
              </button>
            </div>
          )}

          {loading ? (
            <div className="participants-loading">Загрузка...</div>
          ) : participants.length === 0 ? (
            <div className="participants-empty">Нет участников</div>
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
                      <span className="creator-badge">Организатор</span>
                    )}
                  </div>
                  <div className="participant-info">
                    <h4>{participant.full_name || 'Имя не указано'}</h4>
                    {participant.city && <p className="participant-city">📍 {participant.city}</p>}
                    {participant.joined_at && (
                      <p className="participant-joined">
                        Присоединился: {new Date(participant.joined_at).toLocaleDateString('ru-RU')}
                      </p>
                    )}
                  </div>
                  {user && user.id !== participant.id && (
                    <div className="participant-actions">
                      <button
                        className={`btn-add-friend ${friendships[participant.id] ? 'disabled' : ''}`}
                        onClick={() => handleAddFriend(participant.id)}
                        disabled={friendships[participant.id] || addingFriend[participant.id]}
                        title={friendships[participant.id] === 'accepted' ? 'Уже в друзьях' : friendships[participant.id] === 'pending' ? 'Ожидает подтверждения' : 'Добавить в друзья'}
                      >
                        {addingFriend[participant.id] ? '⏳' : getFriendButtonText(participant.id)}
                      </button>
                      {user.id === creatorId && (
                        <button className="btn-invite" title="Пригласить в другое событие">
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

import { useState, useEffect } from 'react';
import { friendsApi, eventsApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import './InviteFriendsModal.css';

const InviteFriendsModal = ({ isOpen, onClose, eventId, eventTitle }) => {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState({});
  const [selectedFriends, setSelectedFriends] = useState(new Set());
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      fetchFriends();
    }
  }, [isOpen, user, eventId]);

  const fetchFriends = async () => {
    try {
      setLoading(true);

      // Получаем всех принятых друзей
      const { data: friendsData } = await friendsApi.list();

      const friendsList = (friendsData || []).map(f => ({
        id: f.id,
        full_name: f.full_name,
        avatar_url: f.avatar_url,
        city: f.city,
      }));

      // Получаем список участников события, чтобы исключить уже участвующих
      const { data: participantsData } = await eventsApi.getParticipants(eventId);
      const participantIds = new Set((participantsData || []).map(p => p.user_id || p.id));

      // Фильтруем друзей (исключаем уже участников)
      const availableFriends = friendsList.filter(friend =>
        !participantIds.has(friend.id)
      );

      setFriends(availableFriends);
    } catch (error) {
      console.error('Ошибка загрузки друзей:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFriend = (friendId) => {
    const newSelected = new Set(selectedFriends);
    if (newSelected.has(friendId)) {
      newSelected.delete(friendId);
    } else {
      newSelected.add(friendId);
    }
    setSelectedFriends(newSelected);
  };

  const handleInvite = async () => {
    if (selectedFriends.size === 0) {
      alert('Выберите хотя бы одного друга для приглашения');
      return;
    }

    setInviting({ all: true });

    try {
      const userIds = Array.from(selectedFriends);

      await eventsApi.invite(eventId, userIds);

      alert(`Приглашения отправлены (${selectedFriends.size})`);
      setSelectedFriends(new Set());
      setMessage('');
      onClose();
    } catch (error) {
      console.error('Ошибка отправки приглашений:', error);
      alert('Не удалось отправить приглашения');
    } finally {
      setInviting({});
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Пригласить друзей</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-event-info">
          <p>Событие: <strong>{eventTitle}</strong></p>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="modal-loading">Загрузка...</div>
          ) : friends.length === 0 ? (
            <div className="modal-empty">
              <p>Нет доступных друзей для приглашения</p>
              <p className="hint">Все ваши друзья уже приглашены или участвуют в событии</p>
            </div>
          ) : (
            <>
              <div className="friends-list-modal">
                {friends.map(friend => (
                  <div
                    key={friend.id}
                    className={`friend-item-modal ${selectedFriends.has(friend.id) ? 'selected' : ''}`}
                    onClick={() => handleToggleFriend(friend.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFriends.has(friend.id)}
                      onChange={() => handleToggleFriend(friend.id)}
                      className="friend-checkbox"
                    />
                    <div className="friend-avatar-modal">
                      {friend.avatar_url ? (
                        <img src={friend.avatar_url} alt={friend.full_name} />
                      ) : (
                        <div className="avatar-placeholder-modal">👤</div>
                      )}
                    </div>
                    <div className="friend-info-modal">
                      <h4>{friend.full_name || 'Имя не указано'}</h4>
                      {friend.city && <p>📍 {friend.city}</p>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="invitation-message">
                <label htmlFor="message">Сообщение (опционально):</label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Добавьте личное сообщение к приглашению..."
                  rows={3}
                  maxLength={500}
                />
                <span className="char-count">{message.length}/500</span>
              </div>
            </>
          )}
        </div>

        {friends.length > 0 && (
          <div className="modal-footer">
            <button
              className="btn-cancel-modal"
              onClick={onClose}
              disabled={inviting.all}
            >
              Отмена
            </button>
            <button
              className="btn-invite-modal"
              onClick={handleInvite}
              disabled={inviting.all || selectedFriends.size === 0}
            >
              {inviting.all ? 'Отправка...' : `Пригласить (${selectedFriends.size})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InviteFriendsModal;

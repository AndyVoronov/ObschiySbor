import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import './FriendsList.css';

const FriendsList = () => {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' | 'requests' | 'sent'

  useEffect(() => {
    if (user) {
      fetchFriendships();
    }
  }, [user]);

  const fetchFriendships = async () => {
    try {
      setLoading(true);

      // Получаем все дружеские связи
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id,
          user_id,
          friend_id,
          status,
          created_at,
          user:user_id (id, full_name, avatar_url, city),
          friend:friend_id (id, full_name, avatar_url, city)
        `)
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      if (error) throw error;

      // Разделяем по статусам
      const acceptedFriends = [];
      const incoming = [];
      const outgoing = [];

      data.forEach(friendship => {
        const isInitiator = friendship.user_id === user.id;
        const friendData = isInitiator ? friendship.friend : friendship.user;

        if (friendship.status === 'accepted') {
          acceptedFriends.push({
            ...friendData,
            friendshipId: friendship.id,
            since: friendship.created_at
          });
        } else if (friendship.status === 'pending') {
          if (isInitiator) {
            // Я отправил запрос
            outgoing.push({
              ...friendData,
              friendshipId: friendship.id,
              sentAt: friendship.created_at
            });
          } else {
            // Мне отправили запрос
            incoming.push({
              ...friendData,
              friendshipId: friendship.id,
              receivedAt: friendship.created_at
            });
          }
        }
      });

      setFriends(acceptedFriends);
      setPendingRequests(incoming);
      setSentRequests(outgoing);
    } catch (error) {
      console.error('Ошибка загрузки друзей:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (friendshipId) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId);

      if (error) throw error;

      // Обновляем локальное состояние
      await fetchFriendships();
    } catch (error) {
      console.error('Ошибка принятия запроса:', error);
      alert('Не удалось принять запрос в друзья');
    }
  };

  const handleRejectRequest = async (friendshipId) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;

      // Обновляем локальное состояние
      await fetchFriendships();
    } catch (error) {
      console.error('Ошибка отклонения запроса:', error);
      alert('Не удалось отклонить запрос');
    }
  };

  const handleRemoveFriend = async (friendshipId) => {
    if (!confirm('Вы уверены, что хотите удалить этого друга?')) return;

    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;

      // Обновляем локальное состояние
      await fetchFriendships();
    } catch (error) {
      console.error('Ошибка удаления друга:', error);
      alert('Не удалось удалить друга');
    }
  };

  const handleCancelRequest = async (friendshipId) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;

      // Обновляем локальное состояние
      await fetchFriendships();
    } catch (error) {
      console.error('Ошибка отмены запроса:', error);
      alert('Не удалось отменить запрос');
    }
  };

  if (loading) {
    return <div className="friends-loading">Загрузка...</div>;
  }

  return (
    <div className="friends-list-container">
      <div className="friends-tabs">
        <button
          className={`friends-tab ${activeTab === 'friends' ? 'active' : ''}`}
          onClick={() => setActiveTab('friends')}
        >
          Друзья ({friends.length})
        </button>
        <button
          className={`friends-tab ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          Запросы ({pendingRequests.length})
        </button>
        <button
          className={`friends-tab ${activeTab === 'sent' ? 'active' : ''}`}
          onClick={() => setActiveTab('sent')}
        >
          Отправленные ({sentRequests.length})
        </button>
      </div>

      <div className="friends-content">
        {activeTab === 'friends' && (
          <div className="friends-grid">
            {friends.length === 0 ? (
              <div className="friends-empty">
                <p>У вас пока нет друзей</p>
                <p className="hint">Добавляйте людей в друзья на страницах событий!</p>
              </div>
            ) : (
              friends.map(friend => (
                <div key={friend.id} className="friend-card">
                  <div className="friend-avatar">
                    {friend.avatar_url ? (
                      <img src={friend.avatar_url} alt={friend.full_name} />
                    ) : (
                      <div className="avatar-placeholder">👤</div>
                    )}
                  </div>
                  <div className="friend-info">
                    <h4>{friend.full_name || 'Имя не указано'}</h4>
                    {friend.city && <p className="friend-city">📍 {friend.city}</p>}
                    <p className="friend-since">
                      Друзья с {new Date(friend.since).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                  <div className="friend-actions">
                    <button
                      className="btn-remove-friend"
                      onClick={() => handleRemoveFriend(friend.friendshipId)}
                      title="Удалить из друзей"
                    >
                      ❌
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="friends-grid">
            {pendingRequests.length === 0 ? (
              <div className="friends-empty">
                <p>Нет входящих запросов в друзья</p>
              </div>
            ) : (
              pendingRequests.map(request => (
                <div key={request.id} className="friend-card request">
                  <div className="friend-avatar">
                    {request.avatar_url ? (
                      <img src={request.avatar_url} alt={request.full_name} />
                    ) : (
                      <div className="avatar-placeholder">👤</div>
                    )}
                  </div>
                  <div className="friend-info">
                    <h4>{request.full_name || 'Имя не указано'}</h4>
                    {request.city && <p className="friend-city">📍 {request.city}</p>}
                    <p className="request-time">
                      Запрос получен {new Date(request.receivedAt).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                  <div className="friend-actions">
                    <button
                      className="btn-accept"
                      onClick={() => handleAcceptRequest(request.friendshipId)}
                      title="Принять"
                    >
                      ✓
                    </button>
                    <button
                      className="btn-reject"
                      onClick={() => handleRejectRequest(request.friendshipId)}
                      title="Отклонить"
                    >
                      ✗
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'sent' && (
          <div className="friends-grid">
            {sentRequests.length === 0 ? (
              <div className="friends-empty">
                <p>Нет отправленных запросов</p>
              </div>
            ) : (
              sentRequests.map(request => (
                <div key={request.id} className="friend-card sent">
                  <div className="friend-avatar">
                    {request.avatar_url ? (
                      <img src={request.avatar_url} alt={request.full_name} />
                    ) : (
                      <div className="avatar-placeholder">👤</div>
                    )}
                  </div>
                  <div className="friend-info">
                    <h4>{request.full_name || 'Имя не указано'}</h4>
                    {request.city && <p className="friend-city">📍 {request.city}</p>}
                    <p className="request-time">
                      Запрос отправлен {new Date(request.sentAt).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                  <div className="friend-actions">
                    <button
                      className="btn-cancel"
                      onClick={() => handleCancelRequest(request.friendshipId)}
                      title="Отменить запрос"
                    >
                      Отменить
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendsList;

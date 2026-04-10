import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { chatApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import EventChat from '../components/EventChat';
import './Chats.css';

function Chats() {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const [chatRooms, setChatRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadChatRooms();
    }
  }, [user]);

  const loadChatRooms = async () => {
    try {
      setLoading(true);

      // Получаем все чат-комнаты пользователя с данными о событиях, последнем сообщении и непрочитанных
      const { data: rooms } = await chatApi.getRooms();

      setChatRooms(rooms || []);
    } catch (error) {
      console.error('Ошибка загрузки чатов:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectRoom = (room) => {
    setSelectedRoom(room);
  };

  const closeChat = () => {
    setSelectedRoom(null);
  };

  if (loading) {
    return <div className="chats-loading">{t('chats.loading')}</div>;
  }

  return (
    <div className="chats-page">
      {chatRooms.length === 0 ? (
        <div className="no-chats">
          <p>{t('chats.noChats')}</p>
          <p>{t('chats.noChatsHint')}</p>
          <Link to="/events" className="btn btn-primary">
            {t('chats.findEvents')}
          </Link>
        </div>
      ) : (
        <div className="chats-container">
          {/* Список чатов */}
          <div className={`chats-list ${selectedRoom ? 'mobile-hidden' : ''}`}>
            {chatRooms.map((room) => (
              <div
                key={room.id}
                className={`chat-room-item ${selectedRoom?.id === room.id ? 'active' : ''}`}
                onClick={() => selectRoom(room)}
              >
                <div className="chat-room-image">
                  {room.events.image_url ? (
                    <img src={room.events.image_url} alt={room.events.title} />
                  ) : (
                    <div className="placeholder-image">💬</div>
                  )}
                </div>
                <div className="chat-room-info">
                  <h3>{room.events.title}</h3>
                  {room.lastMessage ? (
                    <p className="last-message">
                      <span className="message-author">
                        {room.lastMessage.profiles?.full_name || room.lastMessage.author_name}:
                      </span>{' '}
                      {room.lastMessage.message.length > 50
                        ? room.lastMessage.message.substring(0, 50) + '...'
                        : room.lastMessage.message}
                    </p>
                  ) : (
                    <p className="last-message no-messages">{t('chats.noMessages')}</p>
                  )}
                  <div className="chat-room-meta">
                    <span className="event-date">
                      📅 {new Date(room.events.event_date).toLocaleDateString('ru-RU')}
                    </span>
                    {room.unreadCount > 0 && (
                      <span className="unread-badge">{room.unreadCount}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Выбранный чат */}
          <div className={`chat-content ${selectedRoom ? 'mobile-visible' : ''}`}>
            {selectedRoom ? (
              <div className="selected-chat">
                <div className="chat-header-info">
                  <button className="mobile-back-button" onClick={closeChat}>
                    ← {t('chats.backToChats')}
                  </button>
                  <Link to={`/events/${selectedRoom.events.id}`} className="event-link">
                    <h2>{selectedRoom.events.title}</h2>
                  </Link>
                  <span className="event-status-badge">
                    {new Date(selectedRoom.events.event_date) > new Date() ? `🟢 ${t('chats.statusUpcoming')}` : `✅ ${t('chats.statusCompleted')}`}
                  </span>
                </div>
                <EventChat eventId={selectedRoom.events.id} />
              </div>
            ) : (
              <div className="no-chat-selected">
                <p>{t('chats.selectChat')}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Chats;

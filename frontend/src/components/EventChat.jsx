import { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { chatApi, wsHelpers, eventsApi } from '../lib/api';
import { getAccessToken } from '../lib/authStorage';
import { useAuth } from '../contexts/AuthContext';
import './EventChat.css';

const EventChat = forwardRef(({ eventId }, ref) => {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatRoomId, setChatRoomId] = useState(null);
  const [isParticipant, setIsParticipant] = useState(false);
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  useEffect(() => {
    if (eventId && user) {
      initChat();
    }
    return () => {
      cleanupWs();
    };
  }, [eventId, user]);

  // Expose refetch method to parent component
  useImperativeHandle(ref, () => ({
    refetch: () => {
      initChat();
    }
  }));

  // WebSocket для real-time обновления сообщений
  useEffect(() => {
    if (!chatRoomId || !user) return;

    const connectWs = useCallback(() => {
      const token = getAccessToken();
      if (!token) return;

      try {
        const url = wsHelpers.getChatUrl(chatRoomId, token);
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => console.log('Chat WS connected');
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            setMessages(prev => [...prev, msg]);
            scrollToBottom();
          } catch (err) {
            console.error('Error parsing chat WS message:', err);
          }
        };
        ws.onclose = () => {
          console.log('Chat WS closed, reconnecting...');
          reconnectTimeoutRef.current = setTimeout(connectWs, 5000);
        };
        ws.onerror = () => {
          ws.close();
        };
      } catch (err) {
        console.error('Error connecting chat WS:', err);
        reconnectTimeoutRef.current = setTimeout(connectWs, 10000);
      }
    }, [chatRoomId]);

    connectWs();

    return () => cleanupWs();
  }, [chatRoomId, user]);

  const cleanupWs = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  const initChat = async () => {
    try {
      // Проверяем участие (участник или создатель) — единый запрос через API
      // Сервер вернёт chat_room_id если доступ есть, иначе 403
      const { data: chatData } = await chatApi.getMessages(eventId);
      // Если дошли сюда — пользователь имеет доступ
      setIsParticipant(true);
      setChatRoomId(chatData?.room_id || eventId);
      setMessages(chatData?.messages || []);
      scrollToBottom();
    } catch (error) {
      if (error.response?.status === 403) {
        setIsParticipant(false);
      } else {
        console.error('Ошибка инициализации чата:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim()) return;

    try {
      await chatApi.sendMessage(eventId, { message: newMessage.trim() });

      setNewMessage('');
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      alert(t('eventChat.errorSending'));
    }
  };

  if (loading) {
    return <div className="chat-loading">{t('eventChat.loading')}</div>;
  }

  if (!isParticipant) {
    return (
      <div className="chat-not-participant">
        <p>{t('eventChat.notParticipant')}</p>
      </div>
    );
  }

  return (
    <div className="event-chat">
      <div className="chat-header">
        <h3>💬 {t('eventChat.title')}</h3>
        <span className="chat-participants-count">{messages.length} {t('chats.messages')}</span>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <p>{t('eventChat.noMessages')}</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`chat-message ${msg.user_id === user.id ? 'own-message' : ''}`}
            >
              <div className="message-avatar">
                {msg.avatar_url ? (
                  <img src={msg.avatar_url} alt="" />
                ) : (
                  <div className="avatar-placeholder">
                    {msg.full_name?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
              </div>
              <div className="message-content">
                <div className="message-header">
                  <span className="message-author">
                    {msg.full_name || t('eventChat.anonymous')}
                  </span>
                  <span className="message-time">
                    {new Date(msg.created_at).toLocaleString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: '2-digit'
                    })}
                  </span>
                </div>
                <div className="message-text">{msg.message}</div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="chat-input-form">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={t('eventChat.inputPlaceholder')}
          className="chat-input"
          maxLength={500}
        />
        <button type="submit" className="chat-send-btn" disabled={!newMessage.trim()}>
          {t('eventChat.sendButton')}
        </button>
      </form>
    </div>
  );
});

EventChat.displayName = 'EventChat';

export default EventChat;

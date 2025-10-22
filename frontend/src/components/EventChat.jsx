import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import './EventChat.css';

function EventChat({ eventId }) {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatRoom, setChatRoom] = useState(null);
  const [isParticipant, setIsParticipant] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (eventId && user) {
      initChat();
    }
  }, [eventId, user]);

  // Отдельный useEffect для подписки на real-time обновления
  useEffect(() => {
    if (!chatRoom) return;

    const subscription = supabase
      .channel(`chat-${chatRoom.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${chatRoom.id}`
        },
        async (payload) => {
          // Добавляем новое сообщение напрямую в стейт
          const { data: newMessageData } = await supabase
            .from('chat_messages')
            .select(`
              *,
              profiles:user_id (
                full_name,
                avatar_url
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (newMessageData) {
            setMessages(prev => [...prev, newMessageData]);
            scrollToBottom();
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [chatRoom]);

  const initChat = async () => {
    try {
      // Проверяем, является ли пользователь участником события
      const { data: participantData } = await supabase
        .from('event_participants')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .eq('status', 'joined')
        .single();

      // Проверяем, является ли пользователь создателем события
      const { data: eventData } = await supabase
        .from('events')
        .select('creator_id')
        .eq('id', eventId)
        .single();

      const isCreator = eventData?.creator_id === user.id;
      const isParticipantUser = !!participantData;

      setIsParticipant(isCreator || isParticipantUser);

      if (!isCreator && !isParticipantUser) {
        setLoading(false);
        return;
      }

      // Получаем или создаём чат-комнату
      let { data: room, error: roomError } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('event_id', eventId)
        .single();

      if (roomError && roomError.code === 'PGRST116') {
        // Комната не найдена, создаём её
        const { data: newRoom, error: createError } = await supabase
          .from('chat_rooms')
          .insert({ event_id: eventId })
          .select()
          .single();

        if (createError) throw createError;
        room = newRoom;
      } else if (roomError) {
        throw roomError;
      }

      setChatRoom(room);

      // Загружаем сообщения
      await loadMessages(room.id);
    } catch (error) {
      console.error('Ошибка инициализации чата:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (roomId) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      scrollToBottom();
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim() || !chatRoom) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: chatRoom.id,
          user_id: user.id,
          message: newMessage.trim()
        });

      if (error) throw error;

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
                {msg.profiles?.avatar_url ? (
                  <img src={msg.profiles.avatar_url} alt="" />
                ) : (
                  <div className="avatar-placeholder">
                    {msg.profiles?.full_name?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
              </div>
              <div className="message-content">
                <div className="message-header">
                  <span className="message-author">
                    {msg.profiles?.full_name || t('eventChat.anonymous')}
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
}

export default EventChat;

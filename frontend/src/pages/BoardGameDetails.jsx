import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './BoardGameDetails.css';

const BoardGameDetails = () => {
  const { id } = useParams();
  const [game, setGame] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGameDetails();
    fetchGameEvents();
  }, [id]);

  const fetchGameDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('board_games')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setGame(data);
    } catch (error) {
      console.error('Ошибка загрузки игры:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGameEvents = async () => {
    try {
      // Получаем события с этой игрой, которые ещё не прошли
      const now = new Date().toISOString();

      const { data: gameEventLinks, error: linksError } = await supabase
        .from('event_board_games')
        .select('event_id')
        .eq('board_game_id', id);

      if (linksError) throw linksError;

      const eventIds = gameEventLinks.map(link => link.event_id);

      if (eventIds.length > 0) {
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select(`
            *,
            profiles:creator_id (
              id,
              full_name,
              avatar_url
            )
          `)
          .in('id', eventIds)
          .gte('event_date', now)
          .eq('status', 'active')
          .order('event_date', { ascending: true });

        if (eventsError) throw eventsError;
        setEvents(eventsData || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки событий с игрой:', error);
    }
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  if (!game) {
    return <div className="error">Игра не найдена</div>;
  }

  return (
    <div className="board-game-details">
      <div className="game-header">
        {game.image_url && (
          <img src={game.image_url} alt={game.name} className="game-main-image" />
        )}
        <div className="game-info">
          <h1>{game.name}</h1>

          <div className="game-stats">
            <div className="stat-item">
              <span className="stat-icon">👥</span>
              <div>
                <div className="stat-value">{game.min_players}-{game.max_players}</div>
                <div className="stat-label">игроков</div>
              </div>
            </div>

            <div className="stat-item">
              <span className="stat-icon">⏱️</span>
              <div>
                <div className="stat-value">~{game.avg_playtime_minutes}</div>
                <div className="stat-label">минут</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {game.description && (
        <div className="game-description">
          <h2>Описание</h2>
          <p>{game.description}</p>
        </div>
      )}

      <div className="game-events">
        <h2>Активные события с этой игрой ({events.length})</h2>

        {events.length === 0 ? (
          <p className="no-events">Пока нет активных событий с этой игрой</p>
        ) : (
          <div className="events-list">
            {events.map(event => (
              <Link key={event.id} to={`/events/${event.id}`} className="event-card">
                {event.image_url && (
                  <img src={event.image_url} alt={event.title} className="event-image" />
                )}
                <div className="event-content">
                  <h3>{event.title}</h3>
                  <p className="event-date">
                    📅 {new Date(event.event_date).toLocaleString('ru-RU')}
                  </p>
                  <p className="event-location">📍 {event.location}</p>
                  <div className="event-footer">
                    <span className="participants">
                      👥 {event.current_participants}/{event.max_participants}
                    </span>
                    <span className="organizer">
                      Организатор: {event.profiles?.full_name || 'Неизвестно'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="back-link">
        <Link to="/events" className="btn btn-secondary">← Вернуться к событиям</Link>
      </div>
    </div>
  );
};

export default BoardGameDetails;

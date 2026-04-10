import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { eventsApi, dictionariesApi } from '../lib/api';
import './BoardGameDetails.css';

const BoardGameDetails = () => {
  const { id } = useParams();
  const { t } = useTranslation('common');
  const [game, setGame] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGameDetails();
    fetchGameEvents();
  }, [id]);

  const fetchGameDetails = async () => {
    try {
      const { data } = await dictionariesApi.getById('board_games', id);
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
      const { data } = await eventsApi.list({
        board_game_id: id,
        upcoming: true,
        status: 'active',
        sort: 'event_date',
        order: 'asc',
      });
      setEvents(data || []);
    } catch (error) {
      console.error('Ошибка загрузки событий с игрой:', error);
    }
  };

  if (loading) {
    return <div className="loading">{t('boardGame.loading')}</div>;
  }

  if (!game) {
    return <div className="error">{t('boardGame.notFound')}</div>;
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
                <div className="stat-label">{t('boardGame.players')}</div>
              </div>
            </div>

            <div className="stat-item">
              <span className="stat-icon">⏱️</span>
              <div>
                <div className="stat-value">~{game.avg_playtime_minutes}</div>
                <div className="stat-label">{t('boardGame.minutes')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {game.description && (
        <div className="game-description">
          <h2>{t('boardGame.description')}</h2>
          <p>{game.description}</p>
        </div>
      )}

      <div className="game-events">
        <h2>{t('boardGame.activeEvents')} ({events.length})</h2>

        {events.length === 0 ? (
          <p className="no-events">{t('boardGame.noActiveEvents')}</p>
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
                      {t('boardGame.organizer')}: {event.profiles?.full_name || event.creator_name || t('profile.noNameProvided')}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="back-link">
        <Link to="/events" className="btn btn-secondary">← {t('boardGame.backToEvents')}</Link>
      </div>
    </div>
  );
};

export default BoardGameDetails;

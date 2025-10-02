import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import EventRating from '../components/EventRating';
import EventsMapView from '../components/EventsMapView';
import './Events.css';

const Events = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
  const [filters, setFilters] = useState({
    category: '',
    search: '',
    startDateFrom: '',
    startDateTo: '',
    endDateFrom: '',
    endDateTo: '',
    // Фильтры по категориям
    games: '',           // для board_games
    difficulty: '',      // для cycling и hiking
    minDistance: '',     // для hiking
    maxDistance: '',     // для hiking
  });

  useEffect(() => {
    fetchEvents();
  }, [filters]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('events')
        .select(`
          *,
          profiles:creator_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (filters.category) {
        query = query.eq('category', filters.category);
      }

      if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      // Фильтры по дате начала
      if (filters.startDateFrom) {
        query = query.gte('event_date', filters.startDateFrom);
      }

      if (filters.startDateTo) {
        query = query.lte('event_date', filters.startDateTo);
      }

      // Фильтры по дате окончания
      if (filters.endDateFrom) {
        query = query.gte('end_date', filters.endDateFrom);
      }

      if (filters.endDateTo) {
        query = query.lte('end_date', filters.endDateTo);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Фильтрация по category_data на клиенте
      let filteredEvents = data || [];

      // Фильтр по играм (настольные игры)
      if (filters.category === 'board_games' && filters.games) {
        filteredEvents = filteredEvents.filter(event => {
          const games = event.category_data?.games || [];
          return games.some(game =>
            game.toLowerCase().includes(filters.games.toLowerCase())
          );
        });
      }

      // Фильтр по сложности (велопрогулки и походы)
      if ((filters.category === 'cycling' || filters.category === 'hiking') && filters.difficulty) {
        filteredEvents = filteredEvents.filter(event =>
          event.category_data?.difficulty === filters.difficulty
        );
      }

      // Фильтр по дистанции (походы)
      if (filters.category === 'hiking') {
        if (filters.minDistance) {
          filteredEvents = filteredEvents.filter(event => {
            const distance = parseFloat(event.category_data?.distance || 0);
            return distance >= parseFloat(filters.minDistance);
          });
        }
        if (filters.maxDistance) {
          filteredEvents = filteredEvents.filter(event => {
            const distance = parseFloat(event.category_data?.distance || 0);
            return distance <= parseFloat(filters.maxDistance);
          });
        }
      }

      setEvents(filteredEvents);
    } catch (error) {
      console.error('Ошибка загрузки событий:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="events-page">
      <div className="events-header">
        <h1>Поиск событий</h1>
        <div className="view-toggle">
          <button
            className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            📋 Список
          </button>
          <button
            className={`toggle-btn ${viewMode === 'map' ? 'active' : ''}`}
            onClick={() => setViewMode('map')}
          >
            🗺️ Карта
          </button>
        </div>
      </div>

      <div className="filters">
        <input
          type="text"
          name="search"
          placeholder="Поиск по названию..."
          value={filters.search}
          onChange={handleFilterChange}
          className="filter-input"
        />

        <select
          name="category"
          value={filters.category}
          onChange={handleFilterChange}
          className="filter-select"
        >
          <option value="">Все категории</option>
          <option value="board_games">Настольные игры</option>
          <option value="cycling">Велопрогулки</option>
          <option value="hiking">Походы</option>
        </select>

        <div className="date-filters">
          <div className="date-filter-group">
            <label>Начало события:</label>
            <div className="date-range">
              <input
                type="date"
                name="startDateFrom"
                placeholder="От"
                value={filters.startDateFrom}
                onChange={handleFilterChange}
                className="filter-input"
              />
              <span>—</span>
              <input
                type="date"
                name="startDateTo"
                placeholder="До"
                value={filters.startDateTo}
                onChange={handleFilterChange}
                className="filter-input"
              />
            </div>
          </div>

          <div className="date-filter-group">
            <label>Окончание события:</label>
            <div className="date-range">
              <input
                type="date"
                name="endDateFrom"
                placeholder="От"
                value={filters.endDateFrom}
                onChange={handleFilterChange}
                className="filter-input"
              />
              <span>—</span>
              <input
                type="date"
                name="endDateTo"
                placeholder="До"
                value={filters.endDateTo}
                onChange={handleFilterChange}
                className="filter-input"
              />
            </div>
          </div>
        </div>

        {/* Динамические фильтры по категориям */}
        {filters.category === 'board_games' && (
          <div className="category-filters">
            <label>Фильтр по играм:</label>
            <input
              type="text"
              name="games"
              placeholder="Название игры..."
              value={filters.games}
              onChange={handleFilterChange}
              className="filter-input"
            />
          </div>
        )}

        {(filters.category === 'cycling' || filters.category === 'hiking') && (
          <div className="category-filters">
            <label>Сложность:</label>
            <select
              name="difficulty"
              value={filters.difficulty}
              onChange={handleFilterChange}
              className="filter-select"
            >
              <option value="">Любая</option>
              <option value="легкая">Легкая</option>
              <option value="средняя">Средняя</option>
              <option value="сложная">Сложная</option>
            </select>
          </div>
        )}

        {filters.category === 'hiking' && (
          <div className="category-filters">
            <label>Дистанция (км):</label>
            <div className="distance-range">
              <input
                type="number"
                name="minDistance"
                placeholder="От"
                value={filters.minDistance}
                onChange={handleFilterChange}
                className="filter-input"
                min="0"
                step="0.1"
              />
              <span>—</span>
              <input
                type="number"
                name="maxDistance"
                placeholder="До"
                value={filters.maxDistance}
                onChange={handleFilterChange}
                className="filter-input"
                min="0"
                step="0.1"
              />
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="loading">Загрузка событий...</div>
      ) : events.length === 0 ? (
        <div className="no-events">
          <p>События не найдены</p>
          <Link to="/create-event" className="btn btn-primary">
            Создать первое событие
          </Link>
        </div>
      ) : viewMode === 'list' ? (
        <div className="events-grid">
          {events.map((event) => (
            <Link key={event.id} to={`/events/${event.id}`} className="event-card">
              {event.image_url && (
                <img src={event.image_url} alt={event.title} className="event-image" />
              )}
              <div className="event-content">
                <h3>{event.title}</h3>
                <p className="event-category">{getCategoryName(event.category)}</p>
                <EventRating eventId={event.id} compact={true} />
                <p className="event-date">
                  {new Date(event.event_date).toLocaleDateString('ru-RU')}
                </p>
                <p className="event-location">{event.location}</p>
                <div className="event-footer">
                  <span className="participants">
                    {event.current_participants}/{event.max_participants} участников
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EventsMapView events={events} />
      )}
    </div>
  );
};

const getCategoryName = (category) => {
  const categories = {
    board_games: 'Настольные игры',
    cycling: 'Велопрогулки',
    hiking: 'Походы',
  };
  return categories[category] || category;
};

export default Events;

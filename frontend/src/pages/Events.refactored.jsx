import { useState } from 'react';
import { Link } from 'react-router-dom';
import EventRating from '../components/EventRating';
import EventsMapView from '../components/EventsMapView';
import CategoryFilters from '../components/CategoryFilters';
import { useEvents } from '../hooks/useEvents';
import { getCategoryName, CATEGORIES } from '../constants/categories';
import './Events.css';

const Events = () => {
  const [viewMode, setViewMode] = useState('list');
  const [filters, setFilters] = useState({
    category: '',
    search: '',
    startDateFrom: '',
    startDateTo: '',
    endDateFrom: '',
    endDateTo: '',
    games: '',
    difficulty: '',
    minDistance: '',
    maxDistance: '',
  });

  const { events, loading, error } = useEvents(filters);

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  const handleCategoryFiltersChange = (newFilters) => {
    setFilters(newFilters);
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
          <option value={CATEGORIES.BOARD_GAMES}>{getCategoryName(CATEGORIES.BOARD_GAMES)}</option>
          <option value={CATEGORIES.CYCLING}>{getCategoryName(CATEGORIES.CYCLING)}</option>
          <option value={CATEGORIES.HIKING}>{getCategoryName(CATEGORIES.HIKING)}</option>
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
        <CategoryFilters
          category={filters.category}
          filters={filters}
          onChange={handleCategoryFiltersChange}
        />
      </div>

      {error && (
        <div className="error-message">
          Ошибка загрузки событий: {error}
        </div>
      )}

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

export default Events;

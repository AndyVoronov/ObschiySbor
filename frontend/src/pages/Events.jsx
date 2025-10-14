import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import EventRating from '../components/EventRating';
import EventStatusBadge from '../components/EventStatusBadge';
import EventsMapView from '../components/EventsMapView';
import CategoryFilters from '../components/CategoryFilters';
import { useEvents } from '../hooks/useEvents';
import { getCategoryName, CATEGORIES } from '../constants/categories';
import './Events.css';

const Events = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState('list');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    search: '',
    startDateFrom: '',
    startDateTo: '',
    endDateFrom: '',
    endDateTo: '',
    boardGameId: '',
    difficulty: '',
    minDistance: '',
    maxDistance: '',
  });

  // Читаем category из URL при загрузке И инициализируем filters один раз
  useEffect(() => {
    const categoryFromUrl = searchParams.get('category');
    if (categoryFromUrl && Object.values(CATEGORIES).includes(categoryFromUrl)) {
      setFilters(prev => ({
        ...prev,
        category: categoryFromUrl
      }));
    }
  }, []); // Убираем searchParams из зависимостей - выполняется только при монтировании

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
    <div className="container-custom py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          {filters.category && (
            <p className="text-sm text-foreground">
              Категория: {getCategoryName(filters.category)} • Найдено: {events.length}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <Link
              to="/create-event"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              ➕ Создать
            </Link>
          )}
          <div className="inline-flex rounded-lg border p-1 bg-muted">
            <button
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              📋 Список
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'map'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              🗺️ Карта
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg border mb-8">
        {/* Всегда видимая категория */}
        <div className="p-6 pb-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Категория
            </label>
            <select
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-input bg-background rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Все категории</option>
              <option value={CATEGORIES.BOARD_GAMES}>{getCategoryName(CATEGORIES.BOARD_GAMES)}</option>
              <option value={CATEGORIES.CYCLING}>{getCategoryName(CATEGORIES.CYCLING)}</option>
              <option value={CATEGORIES.HIKING}>{getCategoryName(CATEGORIES.HIKING)}</option>
              <option value={CATEGORIES.YOGA}>{getCategoryName(CATEGORIES.YOGA)}</option>
              <option value={CATEGORIES.COOKING}>{getCategoryName(CATEGORIES.COOKING)}</option>
              <option value={CATEGORIES.MUSIC_JAM}>{getCategoryName(CATEGORIES.MUSIC_JAM)}</option>
              <option value={CATEGORIES.SEMINAR}>{getCategoryName(CATEGORIES.SEMINAR)}</option>
              <option value={CATEGORIES.PICNIC}>{getCategoryName(CATEGORIES.PICNIC)}</option>
              <option value={CATEGORIES.PHOTO_WALK}>{getCategoryName(CATEGORIES.PHOTO_WALK)}</option>
              <option value={CATEGORIES.QUEST}>{getCategoryName(CATEGORIES.QUEST)}</option>
              <option value={CATEGORIES.DANCE}>{getCategoryName(CATEGORIES.DANCE)}</option>
              <option value={CATEGORIES.TOUR}>{getCategoryName(CATEGORIES.TOUR)}</option>
              <option value={CATEGORIES.VOLUNTEER}>{getCategoryName(CATEGORIES.VOLUNTEER)}</option>
              <option value={CATEGORIES.FITNESS}>{getCategoryName(CATEGORIES.FITNESS)}</option>
              <option value={CATEGORIES.THEATER}>{getCategoryName(CATEGORIES.THEATER)}</option>
              <option value={CATEGORIES.AUTO_TOUR}>{getCategoryName(CATEGORIES.AUTO_TOUR)}</option>
              <option value={CATEGORIES.CRAFT}>{getCategoryName(CATEGORIES.CRAFT)}</option>
              <option value={CATEGORIES.CONCERT}>{getCategoryName(CATEGORIES.CONCERT)}</option>
              <option value={CATEGORIES.SPORTS}>{getCategoryName(CATEGORIES.SPORTS)}</option>
              <option value={CATEGORIES.ECO_TOUR}>{getCategoryName(CATEGORIES.ECO_TOUR)}</option>
            </select>
          </div>
        </div>

        {/* Кнопка показа дополнительных фильтров */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-primary hover:text-primary/80 transition-colors border-t"
        >
          {showFilters ? '▲ Скрыть дополнительные фильтры' : '▼ Показать дополнительные фильтры'}
        </button>

      {/* Дополнительные фильтры */}
      {showFilters && (
        <div className="p-6 pt-4 space-y-4 border-t">
        {/* Поиск по названию */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Поиск по названию
          </label>
          <input
            type="text"
            name="search"
            placeholder="Введите название..."
            value={filters.search}
            onChange={handleFilterChange}
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Фильтры дат */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Начало события
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">От</label>
                <input
                  type="date"
                  name="startDateFrom"
                  value={filters.startDateFrom}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">До</label>
                <input
                  type="date"
                  name="startDateTo"
                  value={filters.startDateTo}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Окончание события
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">От</label>
                <input
                  type="date"
                  name="endDateFrom"
                  value={filters.endDateFrom}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">До</label>
                <input
                  type="date"
                  name="endDateTo"
                  value={filters.endDateTo}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
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
      )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-md mb-6">
          Ошибка загрузки событий: {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="text-muted-foreground">Загрузка событий...</div>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">События не найдены</p>
          <Link
            to="/create-event"
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Создать первое событие
          </Link>
        </div>
      ) : viewMode === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <Link
              key={event.id}
              to={`/events/${event.id}`}
              className="event-card group bg-card rounded-lg border overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
            >
              {event.image_url && (
                <div className="aspect-video w-full overflow-hidden bg-muted">
                  <img
                    src={event.image_url}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-lg text-foreground line-clamp-2 flex-1">
                    {event.title}
                  </h3>
                  <EventStatusBadge event={event} showEmoji={true} className="small" />
                </div>
                <p className="text-sm text-primary font-medium mb-2">
                  {getCategoryName(event.category)}
                </p>
                <EventRating eventId={event.id} compact={true} />
                <p className="text-sm text-muted-foreground mt-2">
                  📅 {new Date(event.event_date).toLocaleDateString('ru-RU')}
                </p>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  📍 {event.location}
                </p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <span className="text-sm text-muted-foreground">
                    👥 {event.current_participants}/{event.max_participants}
                  </span>
                  <span className="text-sm font-medium text-primary group-hover:text-primary/80">
                    Подробнее →
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

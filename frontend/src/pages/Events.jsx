import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import EventRating from '../components/EventRating';
import EventStatusBadge from '../components/EventStatusBadge';
import EventsMapView from '../components/EventsMapView';
import CategoryFilters from '../components/CategoryFilters';
import { useEvents } from '../hooks/useEvents';
import { useGeolocation } from '../hooks/useGeolocation';
import { addDistanceToEvents, filterEventsByDistance, sortEventsByDistance, formatDistance } from '../utils/geoUtils';
import { getCategoryName, CATEGORIES } from '../constants/categories';
import './Events.css';

const Events = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState('list');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('date'); // 'date' или 'distance'
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
    priceType: '', // 'free', 'paid', 'range'
    minPrice: '',
    maxPrice: '',
    status: '', // 'upcoming', 'ongoing', 'completed', 'cancelled'
    distanceFilter: '', // '5', '10', '25', '50' (км) - фильтр по расстоянию
  });

  // Геолокация пользователя
  const {
    location: userLocation,
    loading: locationLoading,
    error: locationError,
    requestLocation,
    clearLocation,
    hasLocation,
  } = useGeolocation();

  // Читаем category из URL и восстанавливаем сохраненные фильтры
  useEffect(() => {
    // Восстанавливаем фильтры из localStorage
    const savedFilters = localStorage.getItem('eventFilters');
    if (savedFilters) {
      try {
        const parsed = JSON.parse(savedFilters);
        setFilters(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Ошибка восстановления фильтров:', e);
      }
    }

    // Category из URL имеет приоритет над сохраненным
    const categoryFromUrl = searchParams.get('category');
    if (categoryFromUrl && Object.values(CATEGORIES).includes(categoryFromUrl)) {
      setFilters(prev => ({
        ...prev,
        category: categoryFromUrl
      }));
    }
  }, []); // Убираем searchParams из зависимостей - выполняется только при монтировании

  // Сохраняем фильтры в localStorage при изменении
  useEffect(() => {
    // Не сохраняем пустые значения
    const filtersToSave = Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== '' && value !== null)
    );
    if (Object.keys(filtersToSave).length > 0) {
      localStorage.setItem('eventFilters', JSON.stringify(filtersToSave));
    }
  }, [filters]);

  const { events: rawEvents, loading, error } = useEvents(filters);

  // Добавляем расстояния к событиям и применяем фильтры/сортировку
  const processedEvents = useMemo(() => {
    if (!rawEvents || rawEvents.length === 0) return [];

    let result = [...rawEvents];

    // Добавляем расстояние если есть геолокация
    if (hasLocation && userLocation) {
      result = addDistanceToEvents(result, userLocation.lat, userLocation.lng);
    }

    // Фильтруем по расстоянию если выбран фильтр
    if (filters.distanceFilter && hasLocation) {
      const maxDistance = parseFloat(filters.distanceFilter);
      result = filterEventsByDistance(result, maxDistance);
    }

    // Сортируем
    if (sortBy === 'distance' && hasLocation) {
      result = sortEventsByDistance(result, 'asc');
    }

    return result;
  }, [rawEvents, hasLocation, userLocation, filters.distanceFilter, sortBy]);

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  const handleCategoryFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  // Подсчет активных фильтров
  const countActiveFilters = () => {
    let count = 0;
    if (filters.category) count++;
    if (filters.search) count++;
    if (filters.startDateFrom || filters.startDateTo) count++;
    if (filters.endDateFrom || filters.endDateTo) count++;
    if (filters.priceType) count++;
    if (filters.status) count++;
    if (filters.boardGameId) count++;
    if (filters.difficulty) count++;
    if (filters.minDistance || filters.maxDistance) count++;
    if (filters.distanceFilter) count++;
    return count;
  };

  // Очистка всех фильтров
  const handleClearFilters = () => {
    const clearedFilters = {
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
      priceType: '',
      minPrice: '',
      maxPrice: '',
      status: '',
      distanceFilter: '',
    };
    setFilters(clearedFilters);
    setSortBy('date');
    localStorage.removeItem('eventFilters');
  };

  return (
    <div className="container-custom py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          {filters.category && (
            <p className="text-sm text-foreground">
              Категория: {getCategoryName(filters.category)} • Найдено: {processedEvents.length}
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
        <div className="border-t flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {showFilters ? '▲ Скрыть дополнительные фильтры' : '▼ Показать дополнительные фильтры'}
            {countActiveFilters() > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-primary rounded-full">
                {countActiveFilters()}
              </span>
            )}
          </button>
          {countActiveFilters() > 0 && (
            <button
              onClick={handleClearFilters}
              className="px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors border-l"
              title="Очистить все фильтры"
            >
              ✕ Очистить
            </button>
          )}
        </div>

      {/* Дополнительные фильтры */}
      {showFilters && (
        <div className="p-6 pt-4 space-y-4 border-t">
        {/* Умный поиск */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            🔍 Поиск
          </label>
          <input
            type="text"
            name="search"
            placeholder="Название, описание или адрес..."
            value={filters.search}
            onChange={handleFilterChange}
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Поиск по названию, описанию и локации события
          </p>
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

        {/* Фильтр по цене */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            💰 Цена
          </label>
          <select
            name="priceType"
            value={filters.priceType}
            onChange={handleFilterChange}
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring mb-2"
          >
            <option value="">Любая</option>
            <option value="free">Бесплатные</option>
            <option value="paid">Платные</option>
            <option value="range">Диапазон цен</option>
          </select>

          {filters.priceType === 'range' && (
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">От (₽)</label>
                <input
                  type="number"
                  name="minPrice"
                  min="0"
                  placeholder="0"
                  value={filters.minPrice}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">До (₽)</label>
                <input
                  type="number"
                  name="maxPrice"
                  min="0"
                  placeholder="10000"
                  value={filters.maxPrice}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          )}
        </div>

        {/* Фильтр по статусу */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            📊 Статус события
          </label>
          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Все статусы</option>
            <option value="upcoming">📅 Запланировано</option>
            <option value="ongoing">🔴 Идёт сейчас</option>
            <option value="completed">✅ Завершено</option>
            <option value="cancelled">❌ Отменено</option>
          </select>
        </div>

        {/* Фильтр по расстоянию */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            📍 Расстояние от меня
          </label>

          {!hasLocation ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Разрешите доступ к геолокации для поиска событий рядом
              </p>
              <button
                type="button"
                onClick={requestLocation}
                disabled={locationLoading}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {locationLoading ? '🔄 Определение местоположения...' : '📍 Определить моё местоположение'}
              </button>
              {locationError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {locationError}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded-md">
                <span className="text-sm text-green-800 dark:text-green-200">
                  ✓ Местоположение определено
                </span>
                <button
                  type="button"
                  onClick={clearLocation}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  ✕ Отключить
                </button>
              </div>

              <select
                name="distanceFilter"
                value={filters.distanceFilter}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Любое расстояние</option>
                <option value="5">До 5 км</option>
                <option value="10">До 10 км</option>
                <option value="25">До 25 км</option>
                <option value="50">До 50 км</option>
                <option value="100">До 100 км</option>
              </select>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSortBy('distance')}
                  className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
                    sortBy === 'distance'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Сортировать по расстоянию
                </button>
                {sortBy === 'distance' && (
                  <button
                    type="button"
                    onClick={() => setSortBy('date')}
                    className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    title="Сбросить сортировку"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          )}
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
      ) : processedEvents.length === 0 ? (
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
          {processedEvents.map((event) => (
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
                  {event.distance && (
                    <span className="ml-2 text-xs font-medium text-primary">
                      • {formatDistance(event.distance)}
                    </span>
                  )}
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
        <EventsMapView events={processedEvents} />
      )}
    </div>
  );
};

export default Events;

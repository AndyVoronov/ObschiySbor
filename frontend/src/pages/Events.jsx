import { useState, useEffect, useMemo, Suspense } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import EventRating from '../components/EventRating';
import EventStatusBadge from '../components/EventStatusBadge';
import { EventsMapView, MapLoadingFallback } from '../components/LazyComponents';
import LazyImage from '../components/LazyImage';
import CategoryFilters from '../components/CategoryFilters';
import { useEvents } from '../hooks/useEvents';
import { useGeolocation } from '../hooks/useGeolocation';
import { addDistanceToEvents, filterEventsByDistance, sortEventsByDistance, formatDistance } from '../utils/geoUtils';
import { getCategoryName, CATEGORIES } from '../constants/categories';
import './Events.css';

const Events = () => {
  const { user } = useAuth();
  const { t } = useTranslation('common');
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
    status: 'active', // 'upcoming', 'ongoing', 'completed', 'cancelled', 'active' (по умолчанию активные)
    distanceFilter: '', // '5', '10', '25', '50' (км) - фильтр по расстоянию
    eventType: '', // 'online', 'offline', '' (все)
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
    if (filters.eventType) count++;
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
      eventType: '',
    };
    setFilters(clearedFilters);
    setSortBy('date');
    localStorage.removeItem('eventFilters');
  };

  // Получаем отсортированный список категорий по алфавиту
  const sortedCategories = useMemo(() => {
    const categoryList = Object.values(CATEGORIES);
    return categoryList.sort((a, b) => {
      const nameA = getCategoryName(a, t).toLowerCase();
      const nameB = getCategoryName(b, t).toLowerCase();
      return nameA.localeCompare(nameB, t('app.name') === 'Obschiy Sbor!' ? 'en' : 'ru');
    });
  }, [t]);

  return (
    <div className="container-custom py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          {filters.category && (
            <p className="text-sm text-foreground">
              {t('events.categoryLabel')}: {getCategoryName(filters.category, t)} • {t('events.found')}: {processedEvents.length}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <Link
              to="/create-event"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              ➕ {t('events.create')}
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
              📋 {t('events.viewList')}
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'map'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              🗺️ {t('events.viewMap')}
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
              {t('events.categoryLabel')}
            </label>
            <select
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-input bg-background rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">{t('events.allCategories')}</option>
              {sortedCategories.map(category => (
                <option key={category} value={category}>
                  {getCategoryName(category, t)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Кнопка показа дополнительных фильтров */}
        <div className="border-t flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {showFilters ? `▲ ${t('events.hideMoreFilters')}` : `▼ ${t('events.showMoreFilters')}`}
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
              title={t('events.clearFilters')}
            >
              ✕ {t('events.clearAll')}
            </button>
          )}
        </div>

      {/* Дополнительные фильтры */}
      {showFilters && (
        <div className="p-6 pt-4 space-y-4 border-t">
        {/* Умный поиск */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            🔍 {t('events.searchLabel')}
          </label>
          <input
            type="text"
            name="search"
            placeholder={t('events.searchPlaceholder')}
            value={filters.search}
            onChange={handleFilterChange}
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t('events.searchHint')}
          </p>
        </div>

        {/* Фильтры дат */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('events.startDate')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t('events.from')}</label>
                <input
                  type="date"
                  name="startDateFrom"
                  value={filters.startDateFrom}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t('events.to')}</label>
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
              {t('events.endDate')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t('events.from')}</label>
                <input
                  type="date"
                  name="endDateFrom"
                  value={filters.endDateFrom}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t('events.to')}</label>
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
            💰 {t('events.priceLabel')}
          </label>
          <select
            name="priceType"
            value={filters.priceType}
            onChange={handleFilterChange}
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring mb-2"
          >
            <option value="">{t('events.priceAny')}</option>
            <option value="free">{t('events.priceFree')}</option>
            <option value="paid">{t('events.pricePaid')}</option>
            <option value="range">{t('events.priceRange')}</option>
          </select>

          {filters.priceType === 'range' && (
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t('events.minPrice')}</label>
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
                <label className="block text-xs text-muted-foreground mb-1">{t('events.maxPrice')}</label>
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
            📊 {t('events.statusLabel')}
          </label>
          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">{t('events.allStatuses')}</option>
            <option value="active">✨ {t('events.activeStatus')}</option>
            <option value="upcoming">📅 {t('events.upcomingStatus')}</option>
            <option value="ongoing">🔴 {t('events.ongoingNow')}</option>
            <option value="completed">✅ {t('events.completedStatus')}</option>
            <option value="cancelled">❌ {t('events.cancelledStatus')}</option>
          </select>
        </div>

        {/* Фильтр по типу мероприятия */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            🌐 {t('events.eventTypeLabel')}
          </label>
          <select
            name="eventType"
            value={filters.eventType}
            onChange={handleFilterChange}
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">{t('events.allTypes')}</option>
            <option value="offline">📍 {t('events.offlineInPerson')}</option>
            <option value="online">💻 {t('events.onlineInternet')}</option>
          </select>
        </div>

        {/* Фильтр по расстоянию */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            📍 {t('events.distanceLabel')}
          </label>

          {!hasLocation ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t('events.distanceHint')}
              </p>
              <button
                type="button"
                onClick={requestLocation}
                disabled={locationLoading}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {locationLoading ? `🔄 ${t('events.detectingLocation')}` : `📍 ${t('events.requestLocation')}`}
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
                  ✓ {t('events.locationDetermined')}
                </span>
                <button
                  type="button"
                  onClick={clearLocation}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  ✕ {t('events.disableLocation')}
                </button>
              </div>

              <select
                name="distanceFilter"
                value={filters.distanceFilter}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">{t('events.anyDistance')}</option>
                <option value="5">{t('events.upTo5km')}</option>
                <option value="10">{t('events.upTo10km')}</option>
                <option value="25">{t('events.upTo25km')}</option>
                <option value="50">{t('events.upTo50km')}</option>
                <option value="100">{t('events.upTo100km')}</option>
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
                  {t('events.sortByDistance')}
                </button>
                {sortBy === 'distance' && (
                  <button
                    type="button"
                    onClick={() => setSortBy('date')}
                    className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    title={t('events.resetSort')}
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
          {t('events.errorLoading')}: {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="text-muted-foreground">{t('events.loadingEvents')}</div>
        </div>
      ) : processedEvents.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">{t('events.noEventsFound')}</p>
          <Link
            to="/create-event"
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {t('events.createFirstEvent')}
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
                  <LazyImage
                    src={event.image_url}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    placeholder={
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        {t('events.loadingImage')}
                      </div>
                    }
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
                  {getCategoryName(event.category, t)}
                </p>
                <EventRating eventId={event.id} compact={true} />
                <p className="text-sm text-muted-foreground mt-2">
                  📅 {new Date(event.event_date).toLocaleDateString('ru-RU')}
                </p>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {event.event_type === 'online' ? (
                    <>💻 {t('events.online')} • {event.online_platform === 'zoom' ? 'Zoom' :
                      event.online_platform === 'google_meet' ? 'Google Meet' :
                      event.online_platform === 'telegram' ? 'Telegram' :
                      event.online_platform === 'discord' ? 'Discord' :
                      event.online_platform === 'skype' ? 'Skype' :
                      'Другое'}</>
                  ) : (
                    <>📍 {event.location}
                      {event.distance && (
                        <span className="ml-2 text-xs font-medium text-primary">
                          • {formatDistance(event.distance)}
                        </span>
                      )}
                    </>
                  )}
                </p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <span className="text-sm text-muted-foreground">
                    👥 {event.current_participants}/{event.max_participants}
                  </span>
                  <span className="text-sm font-medium text-primary group-hover:text-primary/80">
                    {t('events.moreDetails')} →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <Suspense fallback={<MapLoadingFallback />}>
          <EventsMapView events={processedEvents} />
        </Suspense>
      )}
    </div>
  );
};

export default Events;

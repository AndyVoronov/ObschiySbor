import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { applyCategoryFilters } from '../utils/eventFilters';

/**
 * Автоматически обновляет статусы событий в базе данных
 * Вызывает SQL функцию update_event_lifecycle_status()
 */
const updateEventStatuses = async () => {
  try {
    const { error } = await supabase.rpc('update_event_lifecycle_status');
    if (error) {
      console.error('Ошибка обновления статусов событий:', error);
    } else {
      console.log('Статусы событий обновлены');
    }
  } catch (err) {
    console.error('Ошибка вызова update_event_lifecycle_status:', err);
  }
};

/**
 * Функция загрузки событий с фильтрами
 */
const fetchEvents = async (filters) => {
  // Автоматически обновляем статусы событий перед загрузкой
  await updateEventStatuses();

  let query = supabase
    .from('events')
    .select(`
      id,
      title,
      description,
      category,
      event_date,
      end_date,
      location,
      latitude,
      longitude,
      max_participants,
      current_participants,
      price,
      image_url,
      lifecycle_status,
      creator_id,
      created_at,
      category_data,
      profiles:creator_id (
        id,
        full_name,
        avatar_url
      )
    `)
    .order('created_at', { ascending: false });

  // Базовые фильтры (выполняются на сервере)
  if (filters.category) {
    query = query.eq('category', filters.category);
  }

  // Улучшенный поиск по нескольким полям
  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,location.ilike.%${filters.search}%`);
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

  // Фильтры по цене
  if (filters.priceType === 'free') {
    query = query.eq('price', 0);
  } else if (filters.priceType === 'paid') {
    query = query.gt('price', 0);
  } else if (filters.priceType === 'range') {
    if (filters.minPrice) {
      query = query.gte('price', filters.minPrice);
    }
    if (filters.maxPrice) {
      query = query.lte('price', filters.maxPrice);
    }
  }

  // Фильтр по статусу события
  if (filters.status) {
    query = query.eq('lifecycle_status', filters.status);
  }

  const { data, error: queryError } = await query;

  if (queryError) throw queryError;

  // Фильтр по настольной игре (если выбрана)
  let filteredData = data || [];
  if (filters.boardGameId && filters.category === 'board_games') {
    const { data: gameEvents } = await supabase
      .from('event_board_games')
      .select('event_id')
      .eq('board_game_id', filters.boardGameId);

    const eventIds = new Set(gameEvents?.map(eg => eg.event_id) || []);
    filteredData = filteredData.filter(event => eventIds.has(event.id));
  }

  // Применяем фильтры по category_data на клиенте
  const filteredEvents = applyCategoryFilters(
    filteredData,
    filters.category,
    filters
  );

  return filteredEvents;
};

/**
 * Custom hook для загрузки и фильтрации событий с React Query
 */
export const useEvents = (filters = {}) => {
  const {
    data: events = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['events', filters],
    queryFn: () => fetchEvents(filters),
    staleTime: 2 * 60 * 1000, // 2 минуты - данные событий меняются чаще
    gcTime: 5 * 60 * 1000, // 5 минут - кэш для событий
  });

  return {
    events,
    loading,
    error: error?.message,
    refetch,
  };
};

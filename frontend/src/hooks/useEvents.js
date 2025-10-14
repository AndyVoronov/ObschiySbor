import { useState, useEffect, useCallback } from 'react';
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
 * Custom hook для загрузки и фильтрации событий
 */
export const useEvents = (filters) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Автоматически обновляем статусы событий перед загрузкой
      await updateEventStatuses();
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

      // Базовые фильтры (выполняются на сервере)
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

      setEvents(filteredEvents);
    } catch (err) {
      console.error('Ошибка загрузки событий:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, loading, error, refetch: fetchEvents };
};

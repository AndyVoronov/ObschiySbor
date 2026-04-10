import { useQuery } from '@tanstack/react-query';
import { eventsApi, rpcApi, dictionariesApi } from '../lib/api';
import { applyCategoryFilters } from '../utils/eventFilters';

const updateEventStatuses = async () => {
  try {
    await rpcApi.updateLifecycleStatus();
  } catch (err) {
    console.error('Ошибка обновления статусов событий:', err);
  }
};

const fetchEvents = async (filters) => {
  await updateEventStatuses();

  const params = {};
  if (filters.category) params.category = filters.category;
  if (filters.search) params.search = filters.search;
  if (filters.status) params.status = filters.status;
  if (filters.priceType === 'free') params.price_type = 'free';
  else if (filters.priceType === 'paid') params.price_type = 'paid';
  else if (filters.priceType === 'range') {
    if (filters.minPrice) params.min_price = filters.minPrice;
    if (filters.maxPrice) params.max_price = filters.maxPrice;
  }
  if (filters.startDateFrom) params.start_date_from = filters.startDateFrom;
  if (filters.startDateTo) params.start_date_to = filters.startDateTo;

  const { data: events } = await eventsApi.list(params);
  let filteredData = events || [];

  // Board game filtering (client-side since backend doesn't support it in list)
  if (filters.boardGameId && filters.category === 'board_games') {
    // We'd need board game info per event - skip for now or fetch separately
    // Backend returns events, board game filtering can be done when viewing individual events
  }

  const filteredEvents = applyCategoryFilters(filteredData, filters.category, filters);
  return filteredEvents;
};

export const useEvents = (filters = {}) => {
  const {
    data: events = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['events', filters],
    queryFn: () => fetchEvents(filters),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  return {
    events,
    loading,
    error: error?.message,
    refetch,
  };
};

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

/**
 * Загрузка одного события по ID
 */
const fetchEvent = async (eventId) => {
  // Автоматически обновляем статусы событий перед загрузкой
  try {
    await supabase.rpc('update_event_lifecycle_status');
  } catch (statusError) {
    console.error('Ошибка обновления статусов:', statusError);
  }

  const { data, error } = await supabase
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
      updated_at,
      category_data,
      gender_filter,
      profiles:creator_id (
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('id', eventId)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Загрузка настольных игр для события
 */
const fetchBoardGames = async (eventId) => {
  const { data, error } = await supabase
    .from('event_board_games')
    .select(`
      board_games (
        id,
        name,
        description,
        min_players,
        max_players,
        avg_playtime_minutes,
        image_url
      )
    `)
    .eq('event_id', eventId);

  if (error) throw error;
  return data?.map(item => item.board_games) || [];
};

/**
 * Проверка участия пользователя в событии
 */
const checkParticipation = async (eventId, userId) => {
  if (!userId) return false;

  const { data, error } = await supabase
    .from('event_participants')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
};

/**
 * Присоединение к событию
 */
const joinEvent = async ({ eventId, userId, genderFilter }) => {
  // Проверка фильтра по полу
  if (genderFilter && genderFilter !== 'all') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('gender')
      .eq('id', userId)
      .single();

    if (!profile?.gender) {
      throw new Error('GENDER_NOT_SET');
    }

    if (genderFilter !== profile.gender) {
      throw new Error('GENDER_MISMATCH');
    }
  }

  // Добавляем участника
  const { error } = await supabase
    .from('event_participants')
    .insert([{
      event_id: eventId,
      user_id: userId,
      status: 'joined',
    }]);

  if (error) throw error;

  // Обновляем количество участников
  const { error: updateError } = await supabase.rpc('increment_participants', {
    event_id: eventId
  });

  if (updateError && updateError.code !== '42883') {
    throw updateError;
  }

  return true;
};

/**
 * Выход из события
 */
const leaveEvent = async ({ eventId, userId }) => {
  const { error } = await supabase
    .from('event_participants')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', userId);

  if (error) throw error;

  // Обновляем количество участников
  const { error: updateError } = await supabase.rpc('decrement_participants', {
    event_id: eventId
  });

  if (updateError && updateError.code !== '42883') {
    throw updateError;
  }

  return true;
};

/**
 * Hook для загрузки события
 */
export const useEvent = (eventId) => {
  return useQuery({
    queryKey: ['event', eventId],
    queryFn: () => fetchEvent(eventId),
    staleTime: 1 * 60 * 1000, // 1 минута
    gcTime: 5 * 60 * 1000, // 5 минут
    enabled: !!eventId,
  });
};

/**
 * Hook для загрузки настольных игр события
 */
export const useBoardGames = (eventId, category) => {
  return useQuery({
    queryKey: ['boardGames', eventId],
    queryFn: () => fetchBoardGames(eventId),
    staleTime: 10 * 60 * 1000, // 10 минут
    enabled: !!eventId && category === 'board_games',
  });
};

/**
 * Hook для проверки участия
 */
export const useParticipation = (eventId, userId) => {
  return useQuery({
    queryKey: ['participation', eventId, userId],
    queryFn: () => checkParticipation(eventId, userId),
    staleTime: 30 * 1000, // 30 секунд
    enabled: !!eventId && !!userId,
  });
};

/**
 * Hook для присоединения к событию
 */
export const useJoinEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: joinEvent,
    onSuccess: (_, { eventId, userId }) => {
      // Инвалидируем кэш для события и участия
      queryClient.invalidateQueries(['event', eventId]);
      queryClient.invalidateQueries(['participation', eventId, userId]);
      queryClient.invalidateQueries(['events']); // Обновляем список событий
    },
  });
};

/**
 * Hook для выхода из события
 */
export const useLeaveEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: leaveEvent,
    onSuccess: (_, { eventId, userId }) => {
      // Инвалидируем кэш для события и участия
      queryClient.invalidateQueries(['event', eventId]);
      queryClient.invalidateQueries(['participation', eventId, userId]);
      queryClient.invalidateQueries(['events']); // Обновляем список событий
    },
  });
};

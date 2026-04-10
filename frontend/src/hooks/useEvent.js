import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsApi, rpcApi, profilesApi } from '../lib/api';

const fetchEvent = async (eventId) => {
  try {
    await rpcApi.updateLifecycleStatus();
  } catch (statusError) {
    console.error('Ошибка обновления статусов:', statusError);
  }
  const { data } = await eventsApi.getById(eventId);
  return data;
};

const fetchBoardGames = async (eventId) => {
  const { data } = await eventsApi.getBoardGames(eventId);
  return data || [];
};

const checkParticipation = async (eventId, userId) => {
  if (!userId) return false;
  try {
    const { data } = await eventsApi.checkParticipation(eventId, userId);
    return data?.is_participant || false;
  } catch {
    return false;
  }
};

const joinEvent = async ({ eventId, userId, genderFilter }) => {
  if (genderFilter && genderFilter !== 'all' && userId) {
    try {
      const { data: profile } = await profilesApi.getById(userId);
      if (!profile?.gender) {
        throw new Error('GENDER_NOT_SET');
      }
      if (genderFilter !== profile.gender) {
        throw new Error('GENDER_MISMATCH');
      }
    } catch (err) {
      if (err.message === 'GENDER_NOT_SET' || err.message === 'GENDER_MISMATCH') throw err;
      // If profile fetch fails for other reasons, continue
    }
  }
  await eventsApi.join(eventId);
  return true;
};

const leaveEvent = async ({ eventId, userId }) => {
  await eventsApi.leave(eventId);
  return true;
};

export const useEvent = (eventId) => {
  return useQuery({
    queryKey: ['event', eventId],
    queryFn: () => fetchEvent(eventId),
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: !!eventId,
  });
};

export const useBoardGames = (eventId, category) => {
  return useQuery({
    queryKey: ['boardGames', eventId],
    queryFn: () => fetchBoardGames(eventId),
    staleTime: 10 * 60 * 1000,
    enabled: !!eventId && category === 'board_games',
  });
};

export const useParticipation = (eventId, userId) => {
  return useQuery({
    queryKey: ['participation', eventId, userId],
    queryFn: () => checkParticipation(eventId, userId),
    staleTime: 30 * 1000,
    enabled: !!eventId && !!userId,
  });
};

export const useJoinEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: joinEvent,
    onSuccess: (_, { eventId, userId }) => {
      queryClient.invalidateQueries(['event', eventId]);
      queryClient.invalidateQueries(['participation', eventId, userId]);
      queryClient.invalidateQueries(['events']);
    },
  });
};

export const useLeaveEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: leaveEvent,
    onSuccess: (_, { eventId, userId }) => {
      queryClient.invalidateQueries(['event', eventId]);
      queryClient.invalidateQueries(['participation', eventId, userId]);
      queryClient.invalidateQueries(['events']);
    },
  });
};

import { supabase } from '../lib/supabase';

/**
 * Типы уведомлений
 */
export const NOTIFICATION_TYPES = {
  NEW_PARTICIPANT: 'new_participant',
  EVENT_UPDATE: 'event_update',
  EVENT_CANCELLED: 'event_cancelled',
  EVENT_REMINDER: 'event_reminder',
};

/**
 * Создаёт уведомление для участников события
 * @param {string} eventId - ID события
 * @param {string} type - Тип уведомления
 * @param {string} message - Текст уведомления
 * @param {string} excludeUserId - ID пользователя, которого нужно исключить (обычно инициатор действия)
 */
export const createEventNotification = async (eventId, type, message, excludeUserId = null) => {
  try {
    // Получаем всех участников события
    const { data: participants, error: participantsError } = await supabase
      .from('event_participants')
      .select('user_id')
      .eq('event_id', eventId)
      .eq('status', 'joined');

    if (participantsError) throw participantsError;

    // Фильтруем участников (исключаем инициатора)
    const userIds = participants
      .map(p => p.user_id)
      .filter(userId => userId !== excludeUserId);

    if (userIds.length === 0) return;

    // Создаём уведомления для всех участников
    const notifications = userIds.map(userId => ({
      user_id: userId,
      event_id: eventId,
      type: type,
      message: message,
      is_read: false,
    }));

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (insertError) throw insertError;

  } catch (error) {
    console.error('Ошибка создания уведомлений:', error);
  }
};

/**
 * Уведомляет организатора о новом участнике
 * @param {string} eventId - ID события
 * @param {string} creatorId - ID организатора
 * @param {string} participantName - Имя нового участника
 */
export const notifyNewParticipant = async (eventId, creatorId, participantName) => {
  try {
    await supabase.from('notifications').insert({
      user_id: creatorId,
      event_id: eventId,
      type: NOTIFICATION_TYPES.NEW_PARTICIPANT,
      message: `${participantName} присоединился к вашему событию`,
      is_read: false,
    });
  } catch (error) {
    console.error('Ошибка создания уведомления о новом участнике:', error);
  }
};

/**
 * Уведомляет участников об обновлении события
 * @param {string} eventId - ID события
 * @param {string} eventTitle - Название события
 * @param {string} excludeUserId - ID организатора (исключаем его из уведомлений)
 */
export const notifyEventUpdate = async (eventId, eventTitle, excludeUserId) => {
  const message = `Событие "${eventTitle}" было обновлено организатором`;
  await createEventNotification(
    eventId,
    NOTIFICATION_TYPES.EVENT_UPDATE,
    message,
    excludeUserId
  );
};

/**
 * Уведомляет участников об отмене события
 * @param {string} eventId - ID события
 * @param {string} eventTitle - Название события
 * @param {string} excludeUserId - ID организатора
 */
export const notifyEventCancelled = async (eventId, eventTitle, excludeUserId) => {
  const message = `Событие "${eventTitle}" было отменено организатором`;
  await createEventNotification(
    eventId,
    NOTIFICATION_TYPES.EVENT_CANCELLED,
    message,
    excludeUserId
  );
};

/**
 * Создаёт напоминание о событии (запускается по расписанию)
 * @param {string} eventId - ID события
 * @param {string} eventTitle - Название события
 * @param {Date} eventDate - Дата события
 */
export const scheduleEventReminder = async (eventId, eventTitle, eventDate) => {
  const message = `Скоро начнётся событие "${eventTitle}"`;
  await createEventNotification(
    eventId,
    NOTIFICATION_TYPES.EVENT_REMINDER,
    message,
    null
  );
};

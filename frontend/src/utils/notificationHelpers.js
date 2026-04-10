import api from '../lib/api';

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
 * 
 * Note: Notifications are now primarily created server-side by the backend
 * (e.g., when a user joins an event). This utility remains for cases where
 * the client needs to trigger notifications directly (e.g., event updates,
 * cancellations initiated by the organizer).
 * 
 * @param {string} eventId - ID события
 * @param {string} type - Тип уведомления
 * @param {string} message - Текст уведомления
 * @param {string} excludeUserId - ID пользователя, которого нужно исключить (обычно инициатор действия)
 */
export const createEventNotification = async (eventId, type, message, excludeUserId = null) => {
  try {
    // Delegate notification creation to the backend
    await api.post('/notifications/broadcast', {
      event_id: eventId,
      type,
      message,
      exclude_user_id: excludeUserId,
    });
  } catch (error) {
    console.error('Ошибка создания уведомлений:', error);
  }
};

/**
 * Уведомляет организатора о новом участнике
 * 
 * Note: The backend automatically sends this notification when a user joins
 * an event via POST /events/:id/join. This function is kept as a fallback
 * for any edge cases where client-side notification is needed.
 * 
 * @param {string} eventId - ID события
 * @param {string} creatorId - ID организатора
 * @param {string} participantName - Имя нового участника
 */
export const notifyNewParticipant = async (eventId, creatorId, participantName) => {
  try {
    // Backend handles this automatically on join, but provide a fallback
    await api.post('/notifications', {
      user_id: creatorId,
      event_id: eventId,
      type: NOTIFICATION_TYPES.NEW_PARTICIPANT,
      message: `${participantName} присоединился к вашему событию`,
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

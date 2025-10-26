/**
 * Утилиты для работы со статусами событий
 */
import i18n from '../i18n';

// Типы статусов событий
export const EVENT_STATUS = {
  UPCOMING: 'upcoming',    // Запланировано (ещё не началось)
  ONGOING: 'ongoing',      // В процессе (идёт сейчас)
  COMPLETED: 'completed',  // Завершено (уже прошло)
  CANCELLED: 'cancelled',  // Отменено организатором
};

// Функция для получения локализованных названий статусов
export const getEventStatusLabels = () => ({
  [EVENT_STATUS.UPCOMING]: i18n.t('events.upcomingStatus', { ns: 'common' }),
  [EVENT_STATUS.ONGOING]: i18n.t('events.ongoingNow', { ns: 'common' }),
  [EVENT_STATUS.COMPLETED]: i18n.t('events.completedStatus', { ns: 'common' }),
  [EVENT_STATUS.CANCELLED]: i18n.t('events.cancelledStatus', { ns: 'common' }),
});

// Локализованные названия статусов (для обратной совместимости)
// Используется dynamic getter для поддержки смены языка
export const EVENT_STATUS_LABELS = new Proxy({}, {
  get(target, prop) {
    return getEventStatusLabels()[prop];
  }
});

// Цвета для бейджей статусов
export const EVENT_STATUS_COLORS = {
  [EVENT_STATUS.UPCOMING]: '#3498db',   // Синий
  [EVENT_STATUS.ONGOING]: '#2ecc71',    // Зелёный
  [EVENT_STATUS.COMPLETED]: '#95a5a6',  // Серый
  [EVENT_STATUS.CANCELLED]: '#e74c3c',  // Красный
};

// Эмодзи для статусов (опционально)
export const EVENT_STATUS_EMOJI = {
  [EVENT_STATUS.UPCOMING]: '📅',
  [EVENT_STATUS.ONGOING]: '🔴',
  [EVENT_STATUS.COMPLETED]: '✅',
  [EVENT_STATUS.CANCELLED]: '❌',
};

/**
 * Определяет статус события на основе дат (для клиентской стороны)
 * @param {Object} event - объект события
 * @returns {string} - статус события
 */
export const getEventStatus = (event) => {
  // Если lifecycle_status уже установлен и это отмена - возвращаем его
  if (event.lifecycle_status === EVENT_STATUS.CANCELLED) {
    return EVENT_STATUS.CANCELLED;
  }

  // Если lifecycle_status явно указан в БД - используем его
  if (event.lifecycle_status && event.lifecycle_status !== EVENT_STATUS.UPCOMING) {
    return event.lifecycle_status;
  }

  const now = new Date();
  const eventDate = new Date(event.event_date);
  const eventEndDate = event.end_date ? new Date(event.end_date) : null;

  // Событие завершилось
  if (eventEndDate && eventEndDate < now) {
    return EVENT_STATUS.COMPLETED;
  }

  // Если нет end_date, считаем что событие длится 1 день
  if (!eventEndDate && eventDate < new Date(now - 24 * 60 * 60 * 1000)) {
    return EVENT_STATUS.COMPLETED;
  }

  // Событие идёт сейчас
  if (eventDate <= now && (!eventEndDate || eventEndDate >= now)) {
    return EVENT_STATUS.ONGOING;
  }

  // Событие ещё не началось
  return EVENT_STATUS.UPCOMING;
};

/**
 * Проверяет, можно ли присоединиться к событию
 * @param {Object} event - объект события
 * @returns {boolean}
 */
export const canJoinEvent = (event) => {
  const status = getEventStatus(event);
  return status === EVENT_STATUS.UPCOMING || status === EVENT_STATUS.ONGOING;
};

/**
 * Проверяет, можно ли отменить событие
 * @param {Object} event - объект события
 * @returns {boolean}
 */
export const canCancelEvent = (event) => {
  const status = getEventStatus(event);
  return status === EVENT_STATUS.UPCOMING || status === EVENT_STATUS.ONGOING;
};

/**
 * Форматирует статус для отображения
 * @param {string} status - статус события
 * @param {boolean} withEmoji - добавить эмодзи
 * @returns {string}
 */
export const formatStatus = (status, withEmoji = false) => {
  const label = EVENT_STATUS_LABELS[status] || status;
  if (withEmoji) {
    const emoji = EVENT_STATUS_EMOJI[status] || '';
    return `${emoji} ${label}`;
  }
  return label;
};

/**
 * Фильтрует события по статусу
 * @param {Array} events - массив событий
 * @param {string} status - статус для фильтрации
 * @returns {Array}
 */
export const filterEventsByStatus = (events, status) => {
  if (!status) return events;
  return events.filter(event => getEventStatus(event) === status);
};

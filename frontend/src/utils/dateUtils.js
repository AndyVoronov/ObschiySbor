/**
 * Утилиты для работы с датами
 */

/**
 * Форматирует дату в читаемый формат (дд.мм.гггг чч:мм)
 */
export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleString('ru-RU');
};

/**
 * Форматирует только дату (дд.мм.гггг)
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('ru-RU');
};

/**
 * Форматирует дату для popup на карте (кратко)
 */
export const formatDateCompact = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Форматирует дату для отзывов
 */
export const formatReviewDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Проверяет, завершилось ли событие
 */
export const isEventCompleted = (eventDate) => {
  if (!eventDate) return false;
  return new Date(eventDate) < new Date();
};

/**
 * Вычисляет относительное время ("5 мин назад", "2 часа назад")
 */
export const getRelativeTime = (dateString) => {
  if (!dateString) return '';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'только что';
  if (diffMins < 60) return `${diffMins} мин. назад`;
  if (diffHours < 24) return `${diffHours} ч. назад`;
  if (diffDays < 7) return `${diffDays} дн. назад`;

  return formatDate(dateString);
};

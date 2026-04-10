import { api } from '../lib/api';

/**
 * Создаёт повторяющиеся события на основе родительского события
 *
 * Note: The recurring_pattern is stored on the event model and the backend
 * generates individual events from the pattern. This wrapper calls the
 * backend endpoint to trigger generation.
 *
 * @param {string} parentEventId - ID родительского события
 * @param {Object} recurrenceConfig - Конфигурация повторения
 * @returns {Promise<Array>} Массив созданных событий
 */
export async function createRecurringEvents(parentEventId, recurrenceConfig) {
  const {
    frequency,
    interval = 1,
    occurrenceCount,
    daysOfWeek,
    endDate,
  } = recurrenceConfig;

  try {
    const { data } = await api.post(`/events/${parentEventId}/recurring`, {
      frequency,
      interval,
      occurrence_count: occurrenceCount || 10,
      days_of_week: daysOfWeek || null,
      end_date: endDate || null,
    });

    return data || [];
  } catch (err) {
    console.error('Ошибка создания повторяющихся событий:', err);
    throw err;
  }
}

/**
 * Получает все события в серии повторяющихся событий
 *
 * @param {string} eventId - ID любого события из серии
 * @returns {Promise<Array>} Массив событий серии
 */
export async function getRecurringEventSeries(eventId) {
  try {
    const { data } = await api.get(`/events/${eventId}/recurring`);
    return data || [];
  } catch (err) {
    console.error('Ошибка получения серии событий:', err);
    throw err;
  }
}

/**
 * Удаляет повторяющиеся события
 *
 * @param {string} eventId - ID события
 * @param {string} deleteMode - Режим удаления: 'all', 'future', 'single'
 * @returns {Promise<number>} Количество удалённых событий
 */
export async function deleteRecurringEvents(eventId, deleteMode = 'all') {
  try {
    const { data } = await api.delete(`/events/${eventId}/recurring`, {
      params: { delete_mode: deleteMode },
    });
    return data || 0;
  } catch (err) {
    console.error('Ошибка удаления серии событий:', err);
    throw err;
  }
}

/**
 * Форматирует описание повторения для отображения
 *
 * @param {Object} recurrenceConfig - Конфигурация повторения
 * @returns {string} Читаемое описание повторения
 */
export function formatRecurrenceDescription(recurrenceConfig) {
  if (!recurrenceConfig) return '';

  const { frequency, interval = 1, daysOfWeek, count } = recurrenceConfig;

  const weekDayNames = {
    1: 'Пн',
    2: 'Вт',
    3: 'Ср',
    4: 'Чт',
    5: 'Пт',
    6: 'Сб',
    7: 'Вс',
  };

  let description = 'Повторяется ';

  switch (frequency) {
    case 'daily':
      description += interval === 1 ? 'каждый день' : `каждые ${interval} дня`;
      break;
    case 'weekly':
      if (daysOfWeek && daysOfWeek.length > 0) {
        const dayNames = daysOfWeek.map(d => weekDayNames[d]).join(', ');
        description += `каждую неделю по: ${dayNames}`;
      } else {
        description += interval === 1 ? 'каждую неделю' : `каждые ${interval} недели`;
      }
      break;
    case 'monthly':
      description += interval === 1 ? 'каждый месяц' : `каждые ${interval} месяца`;
      break;
    default:
      return '';
  }

  if (count) {
    description += `, всего ${count} раз`;
  }

  return description;
}

/**
 * Проверяет, является ли событие частью серии повторяющихся событий
 *
 * @param {Object} event - Объект события
 * @returns {boolean} true если событие является частью серии
 */
export function isRecurringEvent(event) {
  return !!(event.parent_event_id || event.is_recurring_parent);
}

/**
 * Проверяет, является ли событие родительским (шаблоном) для серии
 *
 * @param {Object} event - Объект события
 * @returns {boolean} true если событие является родительским
 */
export function isRecurringParent(event) {
  return !!event.is_recurring_parent;
}

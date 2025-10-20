/**
 * Генерирует ICS файл для события и инициирует его скачивание
 * @param {Object} event - Объект события
 */
export const generateICS = (event) => {
  const startDate = new Date(event.event_date);
  // Длительность по умолчанию - 2 часа
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

  /**
   * Форматирует дату в формат iCalendar (YYYYMMDDTHHMMSSZ)
   * @param {Date} date - Дата для форматирования
   * @returns {string} Отформатированная дата
   */
  const formatDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  /**
   * Экранирует специальные символы для iCalendar формата
   * @param {string} text - Текст для экранирования
   * @returns {string} Экранированный текст
   */
  const escapeICS = (text) => {
    if (!text) return '';
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  };

  // Формируем описание события
  let description = escapeICS(event.description);

  // Добавляем детали категории в описание
  if (event.category_data) {
    description += '\\n\\n';
    if (event.category === 'board_games' && event.category_data.games) {
      description += `Игры: ${event.category_data.games.join(', ')}`;
    } else if (event.category === 'cycling') {
      if (event.category_data.difficulty) {
        description += `Сложность: ${event.category_data.difficulty}\\n`;
      }
      if (event.category_data.route) {
        description += `Маршрут: ${escapeICS(event.category_data.route)}\\n`;
      }
      if (event.category_data.equipment) {
        description += `Снаряжение: ${escapeICS(event.category_data.equipment)}`;
      }
    } else if (event.category === 'hiking') {
      if (event.category_data.distance) {
        description += `Дистанция: ${event.category_data.distance} км\\n`;
      }
      if (event.category_data.terrain) {
        description += `Местность: ${event.category_data.terrain}\\n`;
      }
      if (event.category_data.equipment) {
        description += `Снаряжение: ${escapeICS(event.category_data.equipment)}`;
      }
    }
  }

  // Добавляем организатора
  if (event.profiles?.full_name) {
    description += `\\n\\nОрганизатор: ${escapeICS(event.profiles.full_name)}`;
  }

  // Формируем ICS содержимое
  const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Общий сбор!//Event Calendar//RU
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${event.id}@obschiysbor.ru
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${escapeICS(event.title)}
DESCRIPTION:${description}
LOCATION:${escapeICS(event.location)}
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT1H
DESCRIPTION:Напоминание о событии через 1 час
ACTION:DISPLAY
END:VALARM
END:VEVENT
END:VCALENDAR`;

  // Создаём Blob и инициируем скачивание
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `event-${event.id}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Генерирует ссылку на добавление события в Google Calendar
 * @param {Object} event - Объект события
 * @returns {string} URL для добавления в Google Calendar
 */
export const generateGoogleCalendarLink = (event) => {
  const startDate = new Date(event.event_date);
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

  const formatGoogleDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
    details: event.description,
    location: event.location,
  });

  return `https://www.google.com/calendar/render?${params.toString()}`;
};

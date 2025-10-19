/**
 * Утилиты для работы с географическими координатами
 */

/**
 * Рассчитывает расстояние между двумя точками на земле по формуле Haversine
 *
 * @param {number} lat1 - широта первой точки
 * @param {number} lon1 - долгота первой точки
 * @param {number} lat2 - широта второй точки
 * @param {number} lon2 - долгота второй точки
 * @returns {number} расстояние в километрах
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  // Проверка валидности координат
  if (!isValidCoordinate(lat1, lon1) || !isValidCoordinate(lat2, lon2)) {
    return null;
  }

  const R = 6371; // Радиус Земли в километрах

  // Конвертируем градусы в радианы
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

/**
 * Конвертирует градусы в радианы
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Проверяет валидность координат
 */
function isValidCoordinate(lat, lon) {
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    !isNaN(lat) &&
    !isNaN(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

/**
 * Форматирует расстояние для отображения
 *
 * @param {number} distanceKm - расстояние в километрах
 * @returns {string} отформатированная строка
 */
export function formatDistance(distanceKm) {
  if (distanceKm === null || distanceKm === undefined) {
    return '';
  }

  if (distanceKm < 1) {
    // Меньше 1 км - показываем в метрах
    return `${Math.round(distanceKm * 1000)} м`;
  } else if (distanceKm < 10) {
    // От 1 до 10 км - показываем с одним знаком после запятой
    return `${distanceKm.toFixed(1)} км`;
  } else {
    // Больше 10 км - округляем до целого
    return `${Math.round(distanceKm)} км`;
  }
}

/**
 * Добавляет расстояние к каждому событию в массиве
 *
 * @param {Array} events - массив событий
 * @param {number} userLat - широта пользователя
 * @param {number} userLon - долгота пользователя
 * @returns {Array} массив событий с добавленным полем distance
 */
export function addDistanceToEvents(events, userLat, userLon) {
  if (!isValidCoordinate(userLat, userLon)) {
    return events;
  }

  return events.map(event => {
    const distance = calculateDistance(
      userLat,
      userLon,
      event.latitude,
      event.longitude
    );

    return {
      ...event,
      distance: distance
    };
  });
}

/**
 * Фильтрует события по максимальному расстоянию
 *
 * @param {Array} events - массив событий с полем distance
 * @param {number} maxDistanceKm - максимальное расстояние в км
 * @returns {Array} отфильтрованный массив событий
 */
export function filterEventsByDistance(events, maxDistanceKm) {
  if (!maxDistanceKm || maxDistanceKm <= 0) {
    return events;
  }

  return events.filter(event => {
    return event.distance !== null && event.distance <= maxDistanceKm;
  });
}

/**
 * Сортирует события по расстоянию
 *
 * @param {Array} events - массив событий с полем distance
 * @param {string} order - порядок сортировки ('asc' или 'desc')
 * @returns {Array} отсортированный массив событий
 */
export function sortEventsByDistance(events, order = 'asc') {
  return [...events].sort((a, b) => {
    // События без расстояния идут в конец
    if (a.distance === null && b.distance === null) return 0;
    if (a.distance === null) return 1;
    if (b.distance === null) return -1;

    return order === 'asc'
      ? a.distance - b.distance
      : b.distance - a.distance;
  });
}

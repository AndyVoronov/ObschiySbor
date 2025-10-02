// Утилиты для фильтрации событий

/**
 * Фильтрация событий по играм (настольные игры)
 */
export const filterByGames = (events, searchTerm) => {
  if (!searchTerm) return events;

  return events.filter(event => {
    const games = event.category_data?.games || [];
    return games.some(game =>
      game.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });
};

/**
 * Фильтрация событий по сложности
 */
export const filterByDifficulty = (events, difficulty) => {
  if (!difficulty) return events;

  return events.filter(event =>
    event.category_data?.difficulty === difficulty
  );
};

/**
 * Фильтрация событий по дистанции
 */
export const filterByDistance = (events, minDistance, maxDistance) => {
  let filtered = events;

  if (minDistance) {
    filtered = filtered.filter(event => {
      const distance = parseFloat(event.category_data?.distance || 0);
      return distance >= parseFloat(minDistance);
    });
  }

  if (maxDistance) {
    filtered = filtered.filter(event => {
      const distance = parseFloat(event.category_data?.distance || 0);
      return distance <= parseFloat(maxDistance);
    });
  }

  return filtered;
};

/**
 * Применить все фильтры по категориям
 */
export const applyCategoryFilters = (events, category, filters) => {
  let filteredEvents = [...events];

  if (category === 'board_games' && filters.games) {
    filteredEvents = filterByGames(filteredEvents, filters.games);
  }

  if ((category === 'cycling' || category === 'hiking') && filters.difficulty) {
    filteredEvents = filterByDifficulty(filteredEvents, filters.difficulty);
  }

  if (category === 'hiking') {
    filteredEvents = filterByDistance(
      filteredEvents,
      filters.minDistance,
      filters.maxDistance
    );
  }

  return filteredEvents;
};

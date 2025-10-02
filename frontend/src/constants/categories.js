// Константы категорий событий

export const CATEGORIES = {
  BOARD_GAMES: 'board_games',
  CYCLING: 'cycling',
  HIKING: 'hiking',
  YOGA: 'yoga',
  COOKING: 'cooking',
  MUSIC_JAM: 'music_jam',
  SEMINAR: 'seminar',
  PICNIC: 'picnic',
  PHOTO_WALK: 'photo_walk',
  QUEST: 'quest',
  DANCE: 'dance',
  TOUR: 'tour',
  VOLUNTEER: 'volunteer',
  FITNESS: 'fitness',
  THEATER: 'theater',
  AUTO_TOUR: 'auto_tour',
  CRAFT: 'craft',
  CONCERT: 'concert',
  SPORTS: 'sports',
  ECO_TOUR: 'eco_tour',
};

export const CATEGORY_NAMES = {
  [CATEGORIES.BOARD_GAMES]: '🎲 Настольные игры',
  [CATEGORIES.CYCLING]: '🚴 Велопрогулки',
  [CATEGORIES.HIKING]: '🏔️ Походы',
  [CATEGORIES.YOGA]: '🧘 Йога-сессии',
  [CATEGORIES.COOKING]: '👨‍🍳 Кулинарные мастер-классы',
  [CATEGORIES.MUSIC_JAM]: '🎸 Музыкальные джемы',
  [CATEGORIES.SEMINAR]: '📚 Образовательные семинары',
  [CATEGORIES.PICNIC]: '🧺 Пикники в парке',
  [CATEGORIES.PHOTO_WALK]: '📷 Фотопрогулки',
  [CATEGORIES.QUEST]: '🗝️ Квесты',
  [CATEGORIES.DANCE]: '💃 Танцевальные уроки',
  [CATEGORIES.TOUR]: '🚶 Городские экскурсии',
  [CATEGORIES.VOLUNTEER]: '🤝 Волонтёрские акции',
  [CATEGORIES.FITNESS]: '💪 Фитнес-тренировки',
  [CATEGORIES.THEATER]: '🎭 Театральные постановки',
  [CATEGORIES.AUTO_TOUR]: '🚗 Авто-туры',
  [CATEGORIES.CRAFT]: '✂️ Ремесленные мастер-классы',
  [CATEGORIES.CONCERT]: '🎤 Концерты',
  [CATEGORIES.SPORTS]: '⚽ Спортивные матчи',
  [CATEGORIES.ECO_TOUR]: '🌿 Экологические туры',
};

export const DIFFICULTY_LEVELS = {
  EASY: 'легкая',
  MEDIUM: 'средняя',
  HARD: 'сложная',
};

export const DIFFICULTY_OPTIONS = [
  { value: '', label: 'Любая' },
  { value: DIFFICULTY_LEVELS.EASY, label: 'Легкая' },
  { value: DIFFICULTY_LEVELS.MEDIUM, label: 'Средняя' },
  { value: DIFFICULTY_LEVELS.HARD, label: 'Сложная' },
];

// Вспомогательная функция
export const getCategoryName = (category) => {
  return CATEGORY_NAMES[category] || category;
};

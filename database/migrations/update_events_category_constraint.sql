-- Обновление constraint для поля category в таблице events
-- Добавляем поддержку всех 20 категорий

-- Удаляем старый constraint
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_category_check;

-- Создаём новый constraint со всеми категориями
ALTER TABLE events ADD CONSTRAINT events_category_check
CHECK (category IN (
  'board_games',
  'cycling',
  'hiking',
  'yoga',
  'cooking',
  'music_jam',
  'seminar',
  'picnic',
  'photo_walk',
  'quest',
  'dance',
  'tour',
  'volunteer',
  'fitness',
  'theater',
  'auto_tour',
  'craft',
  'concert',
  'sports',
  'eco_tour'
));

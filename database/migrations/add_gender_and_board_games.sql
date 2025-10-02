-- ============================================
-- Миграция: Добавление пола пользователя и справочника настольных игр
-- Дата: 2025-10-02
-- ============================================

-- 1. Добавляем поле gender в таблицу profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other'));

COMMENT ON COLUMN profiles.gender IS 'Пол пользователя: male (мужской), female (женский), other (другое)';

-- 2. Создаём таблицу справочника настольных игр
CREATE TABLE IF NOT EXISTS board_games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  min_players INTEGER NOT NULL DEFAULT 2,
  max_players INTEGER NOT NULL DEFAULT 4,
  avg_playtime_minutes INTEGER NOT NULL DEFAULT 60,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_board_games_name ON board_games(name);

COMMENT ON TABLE board_games IS 'Справочник настольных игр';
COMMENT ON COLUMN board_games.name IS 'Название игры';
COMMENT ON COLUMN board_games.description IS 'Описание игры';
COMMENT ON COLUMN board_games.min_players IS 'Минимальное количество игроков';
COMMENT ON COLUMN board_games.max_players IS 'Максимальное количество игроков';
COMMENT ON COLUMN board_games.avg_playtime_minutes IS 'Среднее время партии в минутах';
COMMENT ON COLUMN board_games.image_url IS 'URL изображения игры';

-- 3. Создаём связующую таблицу для настольных игр в событиях (M2M)
CREATE TABLE IF NOT EXISTS event_board_games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  board_game_id UUID REFERENCES board_games(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, board_game_id)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_event_board_games_event ON event_board_games(event_id);
CREATE INDEX IF NOT EXISTS idx_event_board_games_game ON event_board_games(board_game_id);

COMMENT ON TABLE event_board_games IS 'Связь событий с настольными играми (многие ко многим)';

-- 4. Добавляем поле gender_filter в таблицу events
ALTER TABLE events
ADD COLUMN IF NOT EXISTS gender_filter VARCHAR(10) DEFAULT 'all' CHECK (gender_filter IN ('male', 'female', 'all'));

COMMENT ON COLUMN events.gender_filter IS 'Фильтр по полу участников: male (только мужчины), female (только женщины), all (все)';

-- 5. Создаём Storage bucket для аватаров профилей (если ещё не создан)
-- Это нужно выполнить через Supabase Dashboard или через SQL:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('avatars', 'avatars', true)
-- ON CONFLICT DO NOTHING;

-- 6. RLS политики для board_games (все могут читать)
ALTER TABLE board_games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Все могут просматривать настольные игры" ON board_games;
CREATE POLICY "Все могут просматривать настольные игры"
ON board_games FOR SELECT
USING (true);

-- Только аутентифицированные могут добавлять игры (можно ограничить только админами позже)
DROP POLICY IF EXISTS "Аутентифицированные могут добавлять игры" ON board_games;
CREATE POLICY "Аутентифицированные могут добавлять игры"
ON board_games FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- 7. RLS политики для event_board_games
ALTER TABLE event_board_games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Все могут просматривать игры событий" ON event_board_games;
CREATE POLICY "Все могут просматривать игры событий"
ON event_board_games FOR SELECT
USING (true);

-- Только создатель события может добавлять игры
DROP POLICY IF EXISTS "Создатель события может добавлять игры" ON event_board_games;
CREATE POLICY "Создатель события может добавлять игры"
ON event_board_games FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = event_board_games.event_id
    AND events.creator_id = auth.uid()
  )
);

-- Только создатель события может удалять игры
DROP POLICY IF EXISTS "Создатель события может удалять игры" ON event_board_games;
CREATE POLICY "Создатель события может удалять игры"
ON event_board_games FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = event_board_games.event_id
    AND events.creator_id = auth.uid()
  )
);

-- 8. Добавляем несколько популярных настольных игр для примера
INSERT INTO board_games (name, description, min_players, max_players, avg_playtime_minutes) VALUES
('Каркассон', 'Игра о строительстве средневекового ландшафта с помощью тайлов', 2, 5, 45),
('Колонизаторы', 'Стратегическая игра о заселении острова и торговле ресурсами', 3, 4, 90),
('Диксит', 'Игра на ассоциации с красивыми иллюстрациями', 3, 6, 30),
('Манчкин', 'Юмористическая карточная игра в жанре фэнтези', 3, 6, 60),
('Билет на поезд', 'Игра о строительстве железнодорожных маршрутов', 2, 5, 60),
('Кодовые имена', 'Командная игра на угадывание слов по ассоциациям', 4, 8, 15),
('Uno', 'Классическая карточная игра', 2, 10, 30),
('Монополия', 'Экономическая настольная игра', 2, 8, 120),
('Имаджинариум', 'Игра на ассоциации с необычными иллюстрациями', 4, 7, 45),
('Мафия', 'Психологическая командная игра', 6, 20, 40)
ON CONFLICT DO NOTHING;

-- ============================================
-- Инструкции по применению:
-- 1. Скопируйте весь SQL код
-- 2. Откройте Supabase SQL Editor
-- 3. Вставьте и выполните код
-- 4. Создайте Storage bucket "avatars" через Dashboard (Storage -> New Bucket -> Public: Yes)
-- ============================================

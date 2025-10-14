-- ============================================================
-- Миграция: Оптимизация производительности БД через индексы
-- Дата: 2025-10-14 (исправленная версия)
-- Описание: Добавление индексов для ускорения частых запросов
-- ВАЖНО: Индексы создаются только для существующих таблиц
-- ============================================================

-- ============================================================
-- 1. ИНДЕКСЫ ДЛЯ ТАБЛИЦЫ EVENTS (обязательная)
-- ============================================================

-- Индекс для фильтрации по категории (самый частый запрос)
CREATE INDEX IF NOT EXISTS idx_events_category
ON events(category);

-- Индекс для фильтрации по дате события
CREATE INDEX IF NOT EXISTS idx_events_event_date
ON events(event_date);

-- Индекс для фильтрации по дате окончания (если колонка существует)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'end_date'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_events_end_date ON events(end_date);
  END IF;
END $$;

-- Индекс для фильтрации по статусу жизненного цикла (если колонка существует)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'lifecycle_status'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_events_lifecycle_status ON events(lifecycle_status);
  END IF;
END $$;

-- Индекс для фильтрации по цене (бесплатные/платные)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'price'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_events_price ON events(price);
  END IF;
END $$;

-- Индекс для поиска событий организатора
CREATE INDEX IF NOT EXISTS idx_events_creator_id
ON events(creator_id);

-- Композитный индекс для сортировки по дате создания
CREATE INDEX IF NOT EXISTS idx_events_created_at_desc
ON events(created_at DESC);

-- Композитный индекс для фильтрации категория + дата
CREATE INDEX IF NOT EXISTS idx_events_category_date
ON events(category, event_date);

-- GIN индекс для полнотекстового поиска по title и description
CREATE INDEX IF NOT EXISTS idx_events_search_title
ON events USING gin(to_tsvector('russian', title));

CREATE INDEX IF NOT EXISTS idx_events_search_description
ON events USING gin(to_tsvector('russian', description));

-- Индекс для поиска по локации
CREATE INDEX IF NOT EXISTS idx_events_location
ON events USING gin(to_tsvector('russian', location));

-- GIN индекс для работы с JSONB category_data
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'category_data'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_events_category_data ON events USING gin(category_data);
  END IF;
END $$;

-- ============================================================
-- 2. ИНДЕКСЫ ДЛЯ ТАБЛИЦЫ EVENT_PARTICIPANTS (обязательная)
-- ============================================================

-- Индекс для быстрого поиска участников события
CREATE INDEX IF NOT EXISTS idx_participants_event_id
ON event_participants(event_id);

-- Индекс для быстрого поиска событий пользователя
CREATE INDEX IF NOT EXISTS idx_participants_user_id
ON event_participants(user_id);

-- Индекс для фильтрации по статусу участия
CREATE INDEX IF NOT EXISTS idx_participants_status
ON event_participants(status);

-- Индекс для сортировки по дате присоединения
CREATE INDEX IF NOT EXISTS idx_participants_joined_at
ON event_participants(joined_at DESC);

-- ============================================================
-- 3. ИНДЕКСЫ ДЛЯ ТАБЛИЦЫ PROFILES (обязательная)
-- ============================================================

-- Индекс для поиска по VK ID (если колонка существует)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'vk_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_vk_id ON profiles(vk_id) WHERE vk_id IS NOT NULL;
  END IF;
END $$;

-- Индекс для полнотекстового поиска по имени
CREATE INDEX IF NOT EXISTS idx_profiles_full_name
ON profiles USING gin(to_tsvector('russian', full_name));

-- ============================================================
-- 4. ИНДЕКСЫ ДЛЯ ТАБЛИЦЫ NOTIFICATIONS (если существует)
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'notifications'
  ) THEN
    -- Индекс для быстрого получения уведомлений пользователя
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

    -- Индекс для фильтрации непрочитанных уведомлений
    CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read) WHERE is_read = false;

    -- Композитный индекс для сортировки уведомлений пользователя
    CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
  END IF;
END $$;

-- ============================================================
-- 5. ИНДЕКСЫ ДЛЯ ТАБЛИЦЫ REVIEWS (если существует)
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'reviews'
  ) THEN
    -- Индекс для быстрого получения отзывов события
    CREATE INDEX IF NOT EXISTS idx_reviews_event_id ON reviews(event_id);

    -- Индекс для получения отзывов пользователя
    CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);

    -- Индекс для сортировки отзывов по дате
    CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

    -- Индекс для фильтрации по рейтингу
    CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
  END IF;
END $$;

-- ============================================================
-- 6. ИНДЕКСЫ ДЛЯ ТАБЛИЦЫ CHAT_MESSAGES (если существует)
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'chat_messages'
  ) THEN
    -- Индекс для быстрого получения сообщений комнаты
    CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);

    -- Индекс для поиска сообщений пользователя
    CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);

    -- Композитный индекс для сортировки сообщений в комнате
    CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created ON chat_messages(room_id, created_at DESC);
  END IF;
END $$;

-- ============================================================
-- 7. ИНДЕКСЫ ДЛЯ ТАБЛИЦЫ CHAT_ROOMS (если существует)
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'chat_rooms'
  ) THEN
    -- Индекс для связи комнаты с событием (1:1)
    CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_rooms_event_id ON chat_rooms(event_id);
  END IF;
END $$;

-- ============================================================
-- 8. ИНДЕКСЫ ДЛЯ СПРАВОЧНЫХ ТАБЛИЦ (если существуют)
-- ============================================================

-- Индексы для event_board_games (если таблица существует)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'event_board_games'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_event_board_games_event_id ON event_board_games(event_id);
    CREATE INDEX IF NOT EXISTS idx_event_board_games_board_game_id ON event_board_games(board_game_id);
  END IF;
END $$;

-- ============================================================
-- 9. СТАТИСТИКА И АНАЛИЗ
-- ============================================================

-- Обновляем статистику только для существующих таблиц
DO $$
BEGIN
  -- Обязательные таблицы
  ANALYZE events;
  ANALYZE event_participants;
  ANALYZE profiles;

  -- Опциональные таблицы
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    ANALYZE notifications;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews') THEN
    ANALYZE reviews;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages') THEN
    ANALYZE chat_messages;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_rooms') THEN
    ANALYZE chat_rooms;
  END IF;
END $$;

-- ============================================================
-- КОММЕНТАРИИ К ИНДЕКСАМ
-- ============================================================

COMMENT ON INDEX idx_events_category IS 'Оптимизация фильтрации по категории';
COMMENT ON INDEX idx_events_event_date IS 'Оптимизация фильтрации по дате события';
COMMENT ON INDEX idx_events_search_title IS 'Полнотекстовый поиск по названию (русский)';

-- ============================================================
-- ИНФОРМАЦИЯ ДЛЯ РАЗРАБОТЧИКА
-- ============================================================

-- Проверить использование индексов:
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan DESC;

-- Найти неиспользуемые индексы:
-- SELECT schemaname, tablename, indexname
-- FROM pg_stat_user_indexes
-- WHERE idx_scan = 0 AND indexname NOT LIKE '%pkey%'
-- ORDER BY schemaname, tablename;

-- Проверить размер индексов:
-- SELECT schemaname, tablename, indexname,
--        pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY pg_relation_size(indexrelid) DESC;

-- Проверить список существующих таблиц:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
-- ORDER BY table_name;

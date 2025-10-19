-- Миграция: Добавление поддержки онлайн-мероприятий (БЕЗОПАСНАЯ ВЕРСИЯ)
-- Дата: 2025-10-19
-- Описание: Добавляет возможность создавать онлайн и офлайн события
-- Безопасная для повторного выполнения

-- 1. Добавляем новые поля в таблицу events (только если их нет)
DO $$
BEGIN
  -- Добавляем event_type
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'events' AND column_name = 'event_type') THEN
    ALTER TABLE events
      ADD COLUMN event_type TEXT NOT NULL DEFAULT 'offline'
        CHECK (event_type IN ('offline', 'online'));
  END IF;

  -- Добавляем online_platform
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'events' AND column_name = 'online_platform') THEN
    ALTER TABLE events
      ADD COLUMN online_platform TEXT
        CHECK (online_platform IN ('zoom', 'google_meet', 'telegram', 'discord', 'skype', 'other') OR online_platform IS NULL);
  END IF;

  -- Добавляем online_link
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'events' AND column_name = 'online_link') THEN
    ALTER TABLE events
      ADD COLUMN online_link TEXT;
  END IF;
END $$;

-- 2. Делаем location необязательным для онлайн-событий
DO $$
BEGIN
  -- Проверяем есть ли NOT NULL constraint на location
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'events'
      AND column_name = 'location'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE events ALTER COLUMN location DROP NOT NULL;
  END IF;
END $$;

-- 3. Добавляем constraint (только если его нет)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'check_online_event_data'
      AND table_name = 'events'
  ) THEN
    ALTER TABLE events
      ADD CONSTRAINT check_online_event_data
      CHECK (
        (event_type = 'offline' AND location IS NOT NULL) OR
        (event_type = 'online' AND online_link IS NOT NULL AND online_platform IS NOT NULL)
      );
  END IF;
END $$;

-- 4. Делаем latitude и longitude необязательными (если они существуют)
DO $$
BEGIN
  -- Проверяем и убираем NOT NULL с latitude
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'events'
      AND column_name = 'latitude'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE events ALTER COLUMN latitude DROP NOT NULL;
  END IF;

  -- Проверяем и убираем NOT NULL с longitude
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'events'
      AND column_name = 'longitude'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE events ALTER COLUMN longitude DROP NOT NULL;
  END IF;
END $$;

-- 5. Создаем индекс для быстрой фильтрации по типу события (только если его нет)
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);

-- 6. Обновляем существующие события - помечаем как offline (безопасно)
UPDATE events
SET event_type = 'offline'
WHERE event_type IS NULL OR event_type = '';

-- Проверка: показать количество онлайн и офлайн событий
SELECT
  event_type,
  COUNT(*) as count
FROM events
GROUP BY event_type;

-- КОММЕНТАРИИ к новой схеме:
-- event_type: 'offline' или 'online'
-- online_platform: 'zoom', 'google_meet', 'telegram', 'discord', 'skype', 'other' (только для online)
-- online_link: URL для подключения к мероприятию (только для online)
-- location: физический адрес (только для offline, для online = NULL)
-- latitude/longitude: координаты (только для offline, для online = NULL)

-- ✅ Эта миграция безопасна для повторного выполнения

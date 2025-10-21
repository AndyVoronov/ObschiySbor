-- Миграция: Добавление поддержки онлайн-мероприятий
-- Дата: 2025-10-19
-- Описание: Добавляет возможность создавать онлайн и офлайн события

-- 1. Добавляем новые поля в таблицу events
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'offline'
    CHECK (event_type IN ('offline', 'online'));

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS online_platform TEXT
    CHECK (online_platform IN ('zoom', 'google_meet', 'telegram', 'discord', 'skype', 'other') OR online_platform IS NULL);

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS online_link TEXT;

-- 2. Делаем location необязательным для онлайн-событий
-- Для онлайн-событий location может быть NULL
ALTER TABLE events
  ALTER COLUMN location DROP NOT NULL;

-- 3. Добавляем constraint: онлайн события должны иметь ссылку и платформу
ALTER TABLE events
  ADD CONSTRAINT check_online_event_data
  CHECK (
    (event_type = 'offline' AND location IS NOT NULL) OR
    (event_type = 'online' AND online_link IS NOT NULL AND online_platform IS NOT NULL)
  );

-- 4. Делаем latitude и longitude необязательными (для онлайн-событий они не нужны)
-- Предполагая, что эти поля уже существуют из предыдущих миграций
ALTER TABLE events
  ALTER COLUMN latitude DROP NOT NULL;

ALTER TABLE events
  ALTER COLUMN longitude DROP NOT NULL;

-- 5. Создаем индекс для быстрой фильтрации по типу события
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);

-- 6. Обновляем существующие события - помечаем как offline
UPDATE events
SET event_type = 'offline'
WHERE event_type IS NULL OR event_type = '';

-- КОММЕНТАРИИ к новой схеме:
-- event_type: 'offline' или 'online'
-- online_platform: 'zoom', 'google_meet', 'telegram', 'discord', 'skype', 'other' (только для online)
-- online_link: URL для подключения к мероприятию (только для online)
-- location: физический адрес (только для offline, для online = NULL)
-- latitude/longitude: координаты (только для offline, для online = NULL)

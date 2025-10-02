-- Добавление координат для карт в таблицу events
-- Выполните в Supabase SQL Editor

-- Добавляем поля для географических координат
ALTER TABLE events
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Создаём индекс для быстрого поиска по координатам
CREATE INDEX IF NOT EXISTS idx_events_location ON events(latitude, longitude);

-- Комментарии к полям
COMMENT ON COLUMN events.latitude IS 'Широта места проведения события';
COMMENT ON COLUMN events.longitude IS 'Долгота места проведения события';

-- Проверка
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'events'
  AND column_name IN ('latitude', 'longitude');

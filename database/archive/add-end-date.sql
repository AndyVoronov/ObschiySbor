-- Добавление поля end_date для времени окончания события
-- Выполните в Supabase SQL Editor

-- Добавляем поле end_date (опциональное)
ALTER TABLE events
ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE;

-- Добавляем поле has_end_date для отметки о точной дате окончания
ALTER TABLE events
ADD COLUMN IF NOT EXISTS has_end_date BOOLEAN DEFAULT true;

-- Комментарии
COMMENT ON COLUMN events.end_date IS 'Дата и время окончания события (опционально)';
COMMENT ON COLUMN events.has_end_date IS 'Флаг: указана ли точная дата/время окончания';

-- Создаём индекс для фильтрации по дате окончания
CREATE INDEX IF NOT EXISTS idx_events_end_date ON events(end_date) WHERE end_date IS NOT NULL;

-- Проверка
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'events'
  AND column_name IN ('end_date', 'has_end_date');

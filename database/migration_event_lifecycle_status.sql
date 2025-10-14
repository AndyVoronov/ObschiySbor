-- Миграция для добавления lifecycle статусов событий
-- Переименовываем старое поле status в moderation_status
-- Добавляем новое поле lifecycle_status для отслеживания жизненного цикла

-- Шаг 1: Переименовываем старую колонку status в moderation_status
ALTER TABLE events RENAME COLUMN status TO moderation_status;

-- Шаг 2: Создаём ENUM тип для lifecycle статусов
DO $$ BEGIN
    CREATE TYPE event_lifecycle_status AS ENUM ('upcoming', 'ongoing', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Шаг 3: Добавляем новую колонку lifecycle_status
ALTER TABLE events
ADD COLUMN IF NOT EXISTS lifecycle_status event_lifecycle_status DEFAULT 'upcoming';

-- Шаг 4: Добавляем поле cancellation_reason
ALTER TABLE events
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Комментарии к полям
COMMENT ON COLUMN events.moderation_status IS 'Статус модерации: active (активно), cancelled (отменено модератором), completed (архивировано)';
COMMENT ON COLUMN events.lifecycle_status IS 'Жизненный цикл события: upcoming (запланировано), ongoing (в процессе), completed (завершено), cancelled (отменено организатором)';
COMMENT ON COLUMN events.cancellation_reason IS 'Причина отмены события (если lifecycle_status = cancelled)';

-- Шаг 5: Создаём индекс для быстрой фильтрации по lifecycle_status
CREATE INDEX IF NOT EXISTS idx_events_lifecycle_status ON events(lifecycle_status);

-- Шаг 6: Функция для автоматического обновления lifecycle_status на основе дат
CREATE OR REPLACE FUNCTION update_event_lifecycle_status()
RETURNS void AS $$
BEGIN
    -- Обновляем статус на 'ongoing' для событий, которые начались
    UPDATE events
    SET lifecycle_status = 'ongoing'
    WHERE lifecycle_status = 'upcoming'
      AND event_date <= NOW()
      AND (end_date IS NULL OR end_date >= NOW());

    -- Обновляем статус на 'completed' для событий, которые завершились
    UPDATE events
    SET lifecycle_status = 'completed'
    WHERE lifecycle_status IN ('upcoming', 'ongoing')
      AND ((end_date IS NOT NULL AND end_date < NOW())
           OR (end_date IS NULL AND event_date < NOW() - INTERVAL '1 day'));
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_event_lifecycle_status() IS 'Автоматически обновляет lifecycle статусы событий на основе текущей даты';

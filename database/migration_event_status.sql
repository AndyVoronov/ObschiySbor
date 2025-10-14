-- Добавление статусов событий для отслеживания жизненного цикла
-- Статусы: upcoming (запланировано), ongoing (в процессе), completed (завершено), cancelled (отменено)

-- Создаём ENUM тип для статусов событий
DO $$ BEGIN
    CREATE TYPE event_status AS ENUM ('upcoming', 'ongoing', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Добавляем колонку status в таблицу events
ALTER TABLE events
ADD COLUMN IF NOT EXISTS status event_status DEFAULT 'upcoming';

-- Добавляем поле cancellation_reason для пояснения причины отмены
ALTER TABLE events
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Комментарии к полям
COMMENT ON COLUMN events.status IS 'Статус события: upcoming (запланировано), ongoing (в процессе), completed (завершено), cancelled (отменено)';
COMMENT ON COLUMN events.cancellation_reason IS 'Причина отмены события (если status = cancelled)';

-- Создаём индекс для быстрой фильтрации по статусу
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

-- Функция для автоматического обновления статуса события на основе дат
CREATE OR REPLACE FUNCTION update_event_status()
RETURNS void AS $$
BEGIN
    -- Обновляем статус на 'ongoing' для событий, которые начались
    UPDATE events
    SET status = 'ongoing'
    WHERE status = 'upcoming'
      AND date <= NOW()
      AND (end_date IS NULL OR end_date >= NOW());

    -- Обновляем статус на 'completed' для событий, которые завершились
    UPDATE events
    SET status = 'completed'
    WHERE status IN ('upcoming', 'ongoing')
      AND ((end_date IS NOT NULL AND end_date < NOW())
           OR (end_date IS NULL AND date < NOW() - INTERVAL '1 day'));
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_event_status() IS 'Автоматически обновляет статусы событий на основе текущей даты';

-- Можно настроить периодический запуск через pg_cron (если доступен):
-- SELECT cron.schedule('update-event-status', '0 * * * *', 'SELECT update_event_status()');

-- Или вызывать вручную/через Edge Function:
-- SELECT update_event_status();

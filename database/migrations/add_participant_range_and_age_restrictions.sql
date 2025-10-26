-- Миграция: Добавление диапазона участников и возрастных ограничений
-- Дата: 2025-10-25
-- Описание: Добавляет поля для мин/макс участников, автоотмены и возрастных ограничений

-- 1. Добавляем поля для диапазона участников
ALTER TABLE events
ADD COLUMN IF NOT EXISTS min_participants INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS auto_cancel_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS auto_cancel_deadline TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS auto_cancel_min_participants INTEGER DEFAULT NULL;

-- 2. Добавляем поля для возрастных ограничений
ALTER TABLE events
ADD COLUMN IF NOT EXISTS min_age INTEGER DEFAULT 18,
ADD COLUMN IF NOT EXISTS max_age INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS kids_allowed BOOLEAN DEFAULT FALSE;

-- 3. Добавляем комментарии для документации
COMMENT ON COLUMN events.min_participants IS 'Минимальное количество участников (опционально)';
COMMENT ON COLUMN events.max_participants IS 'Максимальное количество участников (обязательно)';
COMMENT ON COLUMN events.auto_cancel_enabled IS 'Включена ли автоматическая отмена при недостаточном количестве участников';
COMMENT ON COLUMN events.auto_cancel_deadline IS 'Дата/время, до которого должен набраться минимум участников';
COMMENT ON COLUMN events.auto_cancel_min_participants IS 'Минимальное количество участников для автоотмены';
COMMENT ON COLUMN events.min_age IS 'Минимальный возраст участников (по умолчанию 18)';
COMMENT ON COLUMN events.max_age IS 'Максимальный возраст участников (NULL = без ограничений)';
COMMENT ON COLUMN events.kids_allowed IS 'Можно ли участвовать с детьми';

-- 4. Добавляем проверочные ограничения
ALTER TABLE events
ADD CONSTRAINT check_min_participants_positive
  CHECK (min_participants IS NULL OR min_participants > 0),
ADD CONSTRAINT check_max_participants_positive
  CHECK (max_participants > 0),
ADD CONSTRAINT check_participants_range
  CHECK (min_participants IS NULL OR max_participants IS NULL OR min_participants <= max_participants),
ADD CONSTRAINT check_min_age_positive
  CHECK (min_age >= 0),
ADD CONSTRAINT check_max_age_positive
  CHECK (max_age IS NULL OR max_age > 0),
ADD CONSTRAINT check_age_range
  CHECK (max_age IS NULL OR max_age >= min_age),
ADD CONSTRAINT check_auto_cancel_consistency
  CHECK (
    (auto_cancel_enabled = FALSE) OR
    (auto_cancel_enabled = TRUE AND auto_cancel_deadline IS NOT NULL AND auto_cancel_min_participants IS NOT NULL)
  );

-- 5. Создаём функцию для проверки и автоотмены событий
CREATE OR REPLACE FUNCTION check_and_auto_cancel_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Находим события, которые нужно автоматически отменить
  UPDATE events
  SET
    lifecycle_status = 'cancelled',
    updated_at = NOW()
  WHERE
    auto_cancel_enabled = TRUE
    AND lifecycle_status = 'upcoming'
    AND auto_cancel_deadline <= NOW()
    AND current_participants < auto_cancel_min_participants;

  -- Логируем результат
  RAISE NOTICE 'Автоотмена событий выполнена. Отменено событий: %',
    (SELECT COUNT(*) FROM events
     WHERE auto_cancel_enabled = TRUE
     AND lifecycle_status = 'cancelled'
     AND updated_at >= NOW() - INTERVAL '1 minute');
END;
$$;

-- 6. Комментарий для функции
COMMENT ON FUNCTION check_and_auto_cancel_events() IS
'Проверяет и автоматически отменяет события, которые не набрали минимальное количество участников до дедлайна';

-- 7. Создаём таблицу для логирования автоотмен
CREATE TABLE IF NOT EXISTS event_auto_cancel_log (
  id BIGSERIAL PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  cancelled_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT NOT NULL,
  participants_count INTEGER NOT NULL,
  min_required INTEGER NOT NULL,
  deadline TIMESTAMPTZ NOT NULL
);

-- 8. Добавляем индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_events_auto_cancel
  ON events(auto_cancel_enabled, auto_cancel_deadline, lifecycle_status)
  WHERE auto_cancel_enabled = TRUE;

CREATE INDEX IF NOT EXISTS idx_events_age_restrictions
  ON events(min_age, max_age, kids_allowed);

-- 9. Включаем RLS для новой таблицы логов
ALTER TABLE event_auto_cancel_log ENABLE ROW LEVEL SECURITY;

-- 10. RLS политики для логов автоотмен
-- Администраторы и организаторы могут видеть логи своих событий
CREATE POLICY "Организаторы видят логи автоотмен своих событий"
  ON event_auto_cancel_log
  FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM events WHERE creator_id = auth.uid()
    )
  );

-- Система может создавать логи
CREATE POLICY "Система может создавать логи автоотмен"
  ON event_auto_cancel_log
  FOR INSERT
  WITH CHECK (true);

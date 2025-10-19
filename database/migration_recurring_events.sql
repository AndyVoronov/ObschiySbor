-- Миграция: Повторяющиеся события
-- Версия: 1.0
-- Дата: 2025-10-14

-- Добавляем колонки для повторяющихся событий в таблицу events
DO $$
BEGIN
  -- Колонка для хранения ID родительского события (для серии событий)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'events'
      AND column_name = 'parent_event_id'
  ) THEN
    ALTER TABLE events
    ADD COLUMN parent_event_id UUID REFERENCES events(id) ON DELETE CASCADE;

    RAISE NOTICE 'Колонка parent_event_id добавлена';
  END IF;

  -- Колонка для хранения настроек повторения
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'events'
      AND column_name = 'recurrence_config'
  ) THEN
    ALTER TABLE events
    ADD COLUMN recurrence_config JSONB;

    RAISE NOTICE 'Колонка recurrence_config добавлена';
  END IF;

  -- Колонка для даты окончания серии повторяющихся событий
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'events'
      AND column_name = 'recurrence_end_date'
  ) THEN
    ALTER TABLE events
    ADD COLUMN recurrence_end_date TIMESTAMP WITH TIME ZONE;

    RAISE NOTICE 'Колонка recurrence_end_date добавлена';
  END IF;

  -- Колонка для отметки, является ли событие родительским (шаблоном)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'events'
      AND column_name = 'is_recurring_parent'
  ) THEN
    ALTER TABLE events
    ADD COLUMN is_recurring_parent BOOLEAN DEFAULT FALSE;

    RAISE NOTICE 'Колонка is_recurring_parent добавлена';
  END IF;
END $$;

-- Создаём индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_events_parent_event_id ON events(parent_event_id);
CREATE INDEX IF NOT EXISTS idx_events_is_recurring_parent ON events(is_recurring_parent) WHERE is_recurring_parent = TRUE;
CREATE INDEX IF NOT EXISTS idx_events_recurrence_end_date ON events(recurrence_end_date) WHERE recurrence_end_date IS NOT NULL;

-- Комментарии к колонкам
COMMENT ON COLUMN events.parent_event_id IS 'ID родительского события для серии повторяющихся событий';
COMMENT ON COLUMN events.recurrence_config IS 'Конфигурация повторения в формате JSON: {frequency: daily|weekly|monthly, interval: 1, daysOfWeek: [1,3,5], count: 10}';
COMMENT ON COLUMN events.recurrence_end_date IS 'Дата окончания серии повторяющихся событий';
COMMENT ON COLUMN events.is_recurring_parent IS 'Отметка, что событие является родительским (шаблоном) для серии';

-- Функция для создания экземпляров повторяющихся событий
CREATE OR REPLACE FUNCTION generate_recurring_events(
  parent_event_id UUID,
  frequency TEXT,
  interval_count INTEGER DEFAULT 1,
  occurrence_count INTEGER DEFAULT 10,
  days_of_week INTEGER[] DEFAULT NULL,
  end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  event_id UUID,
  event_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  parent_event RECORD;
  next_date TIMESTAMP WITH TIME ZONE;
  iteration_count INTEGER := 0;
  max_iterations INTEGER := 100; -- Защита от бесконечного цикла
  new_event_id UUID;
  event_duration INTERVAL;
BEGIN
  -- Получаем родительское событие
  SELECT * INTO parent_event FROM events WHERE id = parent_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Родительское событие не найдено';
  END IF;

  -- Вычисляем длительность события
  IF parent_event.end_date IS NOT NULL THEN
    event_duration := parent_event.end_date - parent_event.date;
  ELSE
    event_duration := INTERVAL '2 hours'; -- По умолчанию 2 часа
  END IF;

  -- Начинаем с даты родительского события
  next_date := parent_event.date;

  -- Помечаем родительское событие
  UPDATE events
  SET is_recurring_parent = TRUE,
      recurrence_config = jsonb_build_object(
        'frequency', frequency,
        'interval', interval_count,
        'daysOfWeek', days_of_week,
        'count', occurrence_count
      ),
      recurrence_end_date = end_date
  WHERE id = parent_event_id;

  -- Генерируем события
  WHILE iteration_count < occurrence_count AND iteration_count < max_iterations LOOP
    -- Вычисляем следующую дату
    CASE frequency
      WHEN 'daily' THEN
        next_date := next_date + (interval_count || ' days')::INTERVAL;
      WHEN 'weekly' THEN
        IF days_of_week IS NOT NULL AND array_length(days_of_week, 1) > 0 THEN
          -- Для недельных событий с указанными днями недели
          LOOP
            next_date := next_date + INTERVAL '1 day';
            EXIT WHEN EXTRACT(ISODOW FROM next_date)::INTEGER = ANY(days_of_week);
          END LOOP;
        ELSE
          -- Простой недельный интервал
          next_date := next_date + (interval_count || ' weeks')::INTERVAL;
        END IF;
      WHEN 'monthly' THEN
        next_date := next_date + (interval_count || ' months')::INTERVAL;
      ELSE
        RAISE EXCEPTION 'Неизвестная частота повторения: %', frequency;
    END CASE;

    -- Проверяем, не превысили ли конечную дату
    IF end_date IS NOT NULL AND next_date > end_date THEN
      EXIT;
    END IF;

    -- Создаём новое событие
    INSERT INTO events (
      title,
      description,
      date,
      end_date,
      location,
      latitude,
      longitude,
      category,
      category_data,
      max_participants,
      price,
      image_url,
      creator_id,
      parent_event_id,
      status
    ) VALUES (
      parent_event.title,
      parent_event.description,
      next_date,
      next_date + event_duration,
      parent_event.location,
      parent_event.latitude,
      parent_event.longitude,
      parent_event.category,
      parent_event.category_data,
      parent_event.max_participants,
      parent_event.price,
      parent_event.image_url,
      parent_event.creator_id,
      parent_event_id,
      'active'
    ) RETURNING id INTO new_event_id;

    -- Возвращаем информацию о созданном событии
    RETURN QUERY SELECT new_event_id, next_date, NOW();

    iteration_count := iteration_count + 1;
  END LOOP;

  RETURN;
END;
$$;

-- Функция для получения всех событий в серии
CREATE OR REPLACE FUNCTION get_recurring_event_series(event_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  date TIMESTAMP WITH TIME ZONE,
  status TEXT,
  is_parent BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_parent_id UUID;
BEGIN
  -- Определяем parent_event_id для данного события
  SELECT COALESCE(parent_event_id, id) INTO target_parent_id
  FROM events
  WHERE events.id = event_id;

  -- Возвращаем родительское событие и все его дочерние
  RETURN QUERY
  SELECT
    e.id,
    e.title,
    e.date,
    e.status,
    e.is_recurring_parent
  FROM events e
  WHERE e.id = target_parent_id
     OR e.parent_event_id = target_parent_id
  ORDER BY e.date ASC;
END;
$$;

-- Функция для удаления всей серии повторяющихся событий
CREATE OR REPLACE FUNCTION delete_recurring_event_series(event_id UUID, delete_mode TEXT DEFAULT 'all')
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_parent_id UUID;
  deleted_count INTEGER := 0;
BEGIN
  -- delete_mode: 'all' - удалить всю серию, 'future' - удалить только будущие, 'single' - удалить только текущее

  -- Определяем parent_event_id
  SELECT COALESCE(parent_event_id, id) INTO target_parent_id
  FROM events
  WHERE events.id = event_id;

  CASE delete_mode
    WHEN 'all' THEN
      -- Удаляем все события серии
      DELETE FROM events
      WHERE id = target_parent_id OR parent_event_id = target_parent_id;
      GET DIAGNOSTICS deleted_count = ROW_COUNT;

    WHEN 'future' THEN
      -- Удаляем только будущие события (после выбранного)
      DELETE FROM events e1
      WHERE e1.parent_event_id = target_parent_id
        AND e1.date >= (SELECT date FROM events WHERE id = event_id);
      GET DIAGNOSTICS deleted_count = ROW_COUNT;

    WHEN 'single' THEN
      -- Удаляем только выбранное событие
      DELETE FROM events WHERE id = event_id;
      GET DIAGNOSTICS deleted_count = ROW_COUNT;

    ELSE
      RAISE EXCEPTION 'Неизвестный режим удаления: %', delete_mode;
  END CASE;

  RETURN deleted_count;
END;
$$;

-- Комментарии к функциям
COMMENT ON FUNCTION generate_recurring_events IS 'Генерирует экземпляры повторяющихся событий на основе родительского события';
COMMENT ON FUNCTION get_recurring_event_series IS 'Возвращает все события в серии повторяющихся событий';
COMMENT ON FUNCTION delete_recurring_event_series IS 'Удаляет повторяющиеся события с выбором режима: all, future, single';

-- Примеры использования:

-- 1. Создать еженедельное событие на 10 недель:
-- SELECT * FROM generate_recurring_events(
--   'parent-event-uuid',
--   'weekly',
--   1,        -- каждую неделю
--   10,       -- 10 раз
--   NULL,     -- любой день недели
--   NULL      -- без ограничения по дате
-- );

-- 2. Создать событие по понедельникам, средам и пятницам на 4 недели:
-- SELECT * FROM generate_recurring_events(
--   'parent-event-uuid',
--   'weekly',
--   1,
--   12,                    -- 4 недели × 3 дня = 12 событий
--   ARRAY[1, 3, 5],       -- понедельник, среда, пятница
--   NOW() + INTERVAL '1 month'
-- );

-- 3. Получить все события серии:
-- SELECT * FROM get_recurring_event_series('any-event-uuid-in-series');

-- 4. Удалить всю серию:
-- SELECT delete_recurring_event_series('event-uuid', 'all');

-- 5. Удалить только будущие события:
-- SELECT delete_recurring_event_series('event-uuid', 'future');

DO $$
BEGIN
  RAISE NOTICE 'Миграция повторяющихся событий успешно применена!';
END $$;

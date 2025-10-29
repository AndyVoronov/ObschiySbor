-- =============================================
-- УДАЛЕНИЕ МЕХАНИЗМА "БЕЗ ТОЧНОЙ ДАТЫ ОКОНЧАНИЯ"
-- Применить через Supabase SQL Editor
-- =============================================

-- 1. Установить end_date = '2025-12-31 23:59:00' для всех событий, где end_date IS NULL
UPDATE events
SET end_date = '2025-12-31 23:59:00'
WHERE end_date IS NULL;

-- 2. Проверка: сколько событий было обновлено
SELECT
  COUNT(*) as total_events,
  COUNT(CASE WHEN end_date = '2025-12-31 23:59:00' THEN 1 END) as events_with_default_end_date,
  COUNT(CASE WHEN end_date IS NULL THEN 1 END) as events_without_end_date
FROM events;

-- 3. Опционально: удалить колонку has_end_date из таблицы events (если она больше не нужна)
-- ВНИМАНИЕ: Это действие необратимо! Раскомментируйте только после проверки на фронтенде
-- ALTER TABLE events DROP COLUMN IF EXISTS has_end_date;

-- 4. Проверка результата
SELECT
  id,
  title,
  event_date,
  end_date,
  created_at
FROM events
WHERE end_date = '2025-12-31 23:59:00'
ORDER BY created_at DESC
LIMIT 10;

-- Ожидаемый результат:
-- ✅ Все события должны иметь end_date
-- ✅ События без указанной даты окончания получат дату 31.12.2025 23:59

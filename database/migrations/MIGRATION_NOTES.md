# Заметки по миграциям

## Порядок применения миграций

Применяйте миграции в следующем порядке:

### 1. add_participant_range_and_age_restrictions.sql
**Дата:** 2025-10-25
**Описание:** Диапазон участников и возрастные ограничения

**Что добавляет:**
- Поля диапазона участников (`min_participants`, `auto_cancel_*`)
- Поля возрастных ограничений (`min_age`, `max_age`, `kids_allowed`)
- Функция `check_and_auto_cancel_events()`
- Таблица `event_auto_cancel_log`

**Важные изменения:**
- ✅ **ИСПРАВЛЕНО:** Тип `event_id` изменён с `BIGINT` на `UUID` в таблице `event_auto_cancel_log`

### 2. add_gamification_system.sql
**Дата:** 2025-10-26
**Описание:** Система геймификации с уровнями и достижениями

**Что добавляет:**
- 4 таблицы: `levels`, `achievements`, `user_achievements`, `experience_log`
- 6 новых полей в `profiles`
- 3 функции: `add_experience_points()`, `check_and_unlock_achievement()`, `check_level_achievements()`
- 3 триггера для автоматического начисления баллов
- 10 уровней и 17 достижений (начальные данные)

**Примечание:** `reference_id` в `experience_log` намеренно оставлен как `BIGINT` без внешнего ключа, так как хранит ID разных типов объектов.

---

## Проверка перед применением

### Шаг 1: Проверьте тип поля `events.id`

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'events' AND column_name = 'id';
```

**Ожидаемый результат:** `data_type = 'uuid'`

### Шаг 2: Создайте backup базы данных

В Supabase Dashboard:
1. Перейдите в **Database** → **Backups**
2. Создайте backup перед применением миграций
3. Или используйте pg_dump:

```bash
pg_dump -h [host] -U [user] -d [database] > backup_before_migrations.sql
```

### Шаг 3: Применяйте миграции по одной

**Применение первой миграции:**
1. Откройте Supabase Dashboard → SQL Editor
2. Скопируйте содержимое `add_participant_range_and_age_restrictions.sql`
3. Выполните (Run)
4. Проверьте результат (должно быть "Success")

**Проверка первой миграции:**
```sql
-- Проверить новые поля
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'events'
  AND column_name IN ('min_participants', 'auto_cancel_enabled', 'min_age', 'max_age', 'kids_allowed');

-- Проверить таблицу логов
SELECT table_name FROM information_schema.tables
WHERE table_name = 'event_auto_cancel_log';

-- Проверить функцию
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'check_and_auto_cancel_events';
```

**Применение второй миграции:**
1. Откройте Supabase Dashboard → SQL Editor
2. Скопируйте содержимое `add_gamification_system.sql`
3. Выполните (Run)
4. Проверьте результат (должно быть "Success")

**Проверка второй миграции:**
```sql
-- Проверить таблицы
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('levels', 'achievements', 'user_achievements', 'experience_log');

-- Проверить начальные данные
SELECT COUNT(*) as levels_count FROM levels; -- Должно быть 10
SELECT COUNT(*) as achievements_count FROM achievements; -- Должно быть 17

-- Проверить триггеры
SELECT trigger_name FROM information_schema.triggers
WHERE trigger_name LIKE '%gamification%';

-- Проверить новые поля в profiles
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('experience_points', 'level', 'total_events_created', 'total_events_participated', 'total_reviews_given', 'member_since');
```

---

## Откат миграций (если что-то пошло не так)

### Откат add_participant_range_and_age_restrictions.sql

```sql
-- Удалить RLS политики
DROP POLICY IF EXISTS "Организаторы видят логи автоотмен своих событий" ON event_auto_cancel_log;
DROP POLICY IF EXISTS "Система может создавать логи автоотмен" ON event_auto_cancel_log;

-- Удалить таблицу
DROP TABLE IF EXISTS event_auto_cancel_log;

-- Удалить функцию
DROP FUNCTION IF EXISTS check_and_auto_cancel_events();

-- Удалить индексы
DROP INDEX IF EXISTS idx_events_auto_cancel;
DROP INDEX IF EXISTS idx_events_age_restrictions;

-- Удалить ограничения
ALTER TABLE events DROP CONSTRAINT IF EXISTS check_min_participants_positive;
ALTER TABLE events DROP CONSTRAINT IF EXISTS check_max_participants_positive;
ALTER TABLE events DROP CONSTRAINT IF EXISTS check_participants_range;
ALTER TABLE events DROP CONSTRAINT IF EXISTS check_min_age_positive;
ALTER TABLE events DROP CONSTRAINT IF EXISTS check_max_age_positive;
ALTER TABLE events DROP CONSTRAINT IF EXISTS check_age_range;
ALTER TABLE events DROP CONSTRAINT IF EXISTS check_auto_cancel_consistency;

-- Удалить поля
ALTER TABLE events DROP COLUMN IF EXISTS min_participants;
ALTER TABLE events DROP COLUMN IF EXISTS auto_cancel_enabled;
ALTER TABLE events DROP COLUMN IF EXISTS auto_cancel_deadline;
ALTER TABLE events DROP COLUMN IF EXISTS auto_cancel_min_participants;
ALTER TABLE events DROP COLUMN IF EXISTS min_age;
ALTER TABLE events DROP COLUMN IF EXISTS max_age;
ALTER TABLE events DROP COLUMN IF EXISTS kids_allowed;
```

### Откат add_gamification_system.sql

```sql
-- Удалить триггеры
DROP TRIGGER IF EXISTS trigger_event_created_gamification ON events;
DROP TRIGGER IF EXISTS trigger_event_participation_gamification ON event_participants;
DROP TRIGGER IF EXISTS trigger_review_created_gamification ON reviews;

-- Удалить функции
DROP FUNCTION IF EXISTS on_event_created_gamification();
DROP FUNCTION IF EXISTS on_event_participation_gamification();
DROP FUNCTION IF EXISTS on_review_created_gamification();
DROP FUNCTION IF EXISTS check_level_achievements(UUID, INTEGER);
DROP FUNCTION IF EXISTS check_and_unlock_achievement(UUID, VARCHAR);
DROP FUNCTION IF EXISTS add_experience_points(UUID, INTEGER, VARCHAR, BIGINT, VARCHAR, TEXT);

-- Удалить RLS политики
DROP POLICY IF EXISTS "Все могут просматривать уровни" ON levels;
DROP POLICY IF EXISTS "Все могут просматривать активные достижения" ON achievements;
DROP POLICY IF EXISTS "Пользователи видят свои секретные достижения если разблокированы" ON achievements;
DROP POLICY IF EXISTS "Пользователи видят свой прогресс по достижениям" ON user_achievements;
DROP POLICY IF EXISTS "Система может создавать и обновлять прогресс" ON user_achievements;
DROP POLICY IF EXISTS "Пользователи видят свою историю опыта" ON experience_log;
DROP POLICY IF EXISTS "Система может создавать записи в логе опыта" ON experience_log;

-- Удалить таблицы
DROP TABLE IF EXISTS experience_log;
DROP TABLE IF EXISTS user_achievements;
DROP TABLE IF EXISTS achievements;
DROP TABLE IF EXISTS levels;

-- Удалить поля из profiles
ALTER TABLE profiles DROP COLUMN IF EXISTS experience_points;
ALTER TABLE profiles DROP COLUMN IF EXISTS level;
ALTER TABLE profiles DROP COLUMN IF EXISTS total_events_created;
ALTER TABLE profiles DROP COLUMN IF EXISTS total_events_participated;
ALTER TABLE profiles DROP COLUMN IF EXISTS total_reviews_given;
ALTER TABLE profiles DROP COLUMN IF EXISTS member_since;
```

---

## Известные проблемы и решения

### Проблема 1: Ошибка типов при создании event_auto_cancel_log

**Ошибка:**
```
ERROR: 42804: foreign key constraint "event_auto_cancel_log_event_id_fkey" cannot be implemented
DETAIL: Key columns "event_id" and "id" are of incompatible types: bigint and uuid.
```

**Решение:** ✅ ИСПРАВЛЕНО в файле миграции
- Изменён тип `event_id` с `BIGINT` на `UUID`

### Проблема 2: Ограничения уже существуют

**Ошибка:**
```
ERROR: constraint "check_min_participants_positive" for relation "events" already exists
```

**Решение:**
Используйте `IF NOT EXISTS` или удалите существующие ограничения перед применением:
```sql
ALTER TABLE events DROP CONSTRAINT IF EXISTS check_min_participants_positive;
```

### Проблема 3: RLS политика уже существует

**Ошибка:**
```
ERROR: policy "..." for table "..." already exists
```

**Решение:**
Удалите существующую политику:
```sql
DROP POLICY IF EXISTS "название_политики" ON table_name;
```

---

## Тестирование после применения

### Тест 1: Создание события с новыми полями

```sql
-- Проверить, что можно создать событие с новыми полями
INSERT INTO events (
  id, title, description, category, event_date, location,
  max_participants, min_participants, auto_cancel_enabled,
  min_age, max_age, kids_allowed, creator_id
) VALUES (
  gen_random_uuid(),
  'Тестовое событие',
  'Описание',
  'board_games',
  NOW() + INTERVAL '7 days',
  'Тестовая локация',
  20,  -- max_participants
  5,   -- min_participants
  false,
  18,  -- min_age
  NULL, -- max_age
  true, -- kids_allowed
  auth.uid()
);
```

### Тест 2: Начисление опыта

```sql
-- Создать событие и проверить начисление XP
-- (должно сработать автоматически через триггер)
SELECT experience_points, level FROM profiles WHERE id = auth.uid();
```

### Тест 3: Проверка достижений

```sql
-- Проверить разблокированные достижения
SELECT
  a.name_ru,
  a.icon,
  ua.unlocked_at
FROM user_achievements ua
JOIN achievements a ON ua.achievement_id = a.id
WHERE ua.user_id = auth.uid() AND ua.is_unlocked = true;
```

---

## Мониторинг после применения

### Проверяйте размер таблиц

```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('event_auto_cancel_log', 'experience_log', 'user_achievements', 'levels', 'achievements')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Проверяйте производительность триггеров

```sql
-- Посмотреть время выполнения создания события
EXPLAIN ANALYZE
INSERT INTO events (...) VALUES (...);
```

Если триггеры значительно замедляют операции, рассмотрите:
- Асинхронную обработку через Edge Functions
- Батчинг операций
- Кэширование на клиенте

---

## Поддержка

Если возникли проблемы:
1. Проверьте логи в Supabase Dashboard → Logs → Postgres Logs
2. Проверьте права доступа (RLS политики)
3. Убедитесь, что применены обе миграции полностью
4. Проверьте документацию:
   - `docs/features/PARTICIPANT_RANGE_AGE_RESTRICTIONS.md`
   - `docs/features/GAMIFICATION_SYSTEM.md`

---

**Последнее обновление:** 26 октября 2025

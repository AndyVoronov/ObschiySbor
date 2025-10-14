# Применение всех миграций - ObschiySbor

## 🔗 Быстрый доступ

**SQL Editor:** https://supabase.com/dashboard/project/wrfcpsljchyetbmupqgc/sql/new

---

## Выполните миграции в следующем порядке:

### ✅ Миграция 1: Координаты для карт (КРИТИЧНО!)

Скопируйте и выполните:

```sql
-- Добавление координат для карт в таблицу events

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
```

**Ожидаемый результат:** 2 строки с полями `latitude` и `longitude`

---

### ✅ Миграция 2: Дата окончания события

Скопируйте и выполните:

```sql
-- Добавление поля end_date для времени окончания события

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
```

**Ожидаемый результат:** 2 строки с полями `end_date` и `has_end_date`

---

### ✅ Миграция 3: Storage политики (УЖЕ ВЫПОЛНЕНО ✅)

```sql
-- Удаляем старые политики (если есть)
DROP POLICY IF EXISTS "Anyone can view event images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;

-- Политика: все могут просматривать изображения
CREATE POLICY "Anyone can view event images"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-images');

-- Политика: авторизованные могут загружать
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-images');

-- Политика: авторизованные могут обновлять
CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'event-images');

-- Политика: авторизованные могут удалять
CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'event-images');
```

---

## 🔍 Финальная проверка

После выполнения всех миграций, выполните:

```sql
-- Проверка всех новых полей
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'events'
  AND column_name IN ('latitude', 'longitude', 'end_date', 'has_end_date')
ORDER BY column_name;

-- Проверка Storage bucket
SELECT id, name, public, created_at
FROM storage.buckets
WHERE name = 'event-images';

-- Проверка Storage политик
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%event images%'
ORDER BY policyname;

-- Проверка индексов
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'events'
  AND indexname LIKE '%location%' OR indexname LIKE '%end_date%';
```

**Ожидаемые результаты:**
1. ✅ 4 поля в events: `latitude`, `longitude`, `end_date`, `has_end_date`
2. ✅ Bucket `event-images` существует и public = true
3. ✅ 4 Storage политики
4. ✅ 2 индекса: `idx_events_location` и `idx_events_end_date`

---

## ✅ После применения миграций

Перезагрузите страницу приложения и попробуйте:

1. **Создать событие:**
   - http://localhost:5173/create-event
   - Выберите место на карте ✅
   - Загрузите фото ✅
   - Укажите дату окончания ✅

2. **Просмотр на карте:**
   - http://localhost:5173/events
   - Переключитесь на "🗺️ Карта" ✅

3. **Динамические фильтры:**
   - Выберите категорию
   - Появятся специфичные фильтры ✅

---

## 🚨 Если ошибки остаются

### "Could not find the 'latitude' column"
→ Выполните **Миграцию 1** (координаты)

### "new row violates row-level security policy" при загрузке фото
→ Выполните **Миграцию 3** (Storage политики)

### "Could not find the 'end_date' column"
→ Выполните **Миграцию 2** (дата окончания)

---

**Важно:** Все миграции используют `IF NOT EXISTS`, поэтому их можно выполнять повторно без проблем!

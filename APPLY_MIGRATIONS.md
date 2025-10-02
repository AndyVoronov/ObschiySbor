# Применение миграций базы данных

## Быстрый старт

Откройте Supabase SQL Editor и выполните команды ниже по порядку.

### 🔗 Ссылки

- **Supabase Dashboard**: https://supabase.com/dashboard/project/wrfcpsljchyetbmupqgc
- **SQL Editor**: https://supabase.com/dashboard/project/wrfcpsljchyetbmupqgc/sql/new

---

## Миграция 1: Добавление полей end_date

Скопируйте и выполните в SQL Editor:

```sql
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

**Ожидаемый результат:** Должны появиться 2 строки с полями `end_date` и `has_end_date`.

---

## Миграция 2: Storage политики для event-images

### Шаг 1: Создание bucket (если не создан)

1. Перейдите в **Storage**: https://supabase.com/dashboard/project/wrfcpsljchyetbmupqgc/storage/buckets
2. Если bucket `event-images` не существует:
   - Нажмите **"New bucket"**
   - Name: `event-images`
   - **Public bucket**: ✅ (обязательно!)
   - Нажмите **"Create bucket"**

### Шаг 2: Настройка политик

Перейдите в SQL Editor и выполните:

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

-- Проверка политик
SELECT
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%event images%'
ORDER BY policyname;
```

**Ожидаемый результат:** Должны появиться 4 политики для event-images.

---

## Проверка применения миграций

После выполнения всех команд, выполните проверочный запрос:

```sql
-- Проверка полей в таблице events
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'events'
  AND column_name IN ('end_date', 'has_end_date', 'latitude', 'longitude')
ORDER BY column_name;

-- Проверка Storage bucket
SELECT id, name, public, created_at
FROM storage.buckets
WHERE name = 'event-images';

-- Проверка Storage политик
SELECT COUNT(*) as policies_count
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%event images%';
```

**Ожидаемые результаты:**
1. ✅ 4 поля в events: `end_date`, `has_end_date`, `latitude`, `longitude`
2. ✅ Bucket `event-images` существует и public = true
3. ✅ policies_count = 4

---

## Если что-то пошло не так

### Ошибка: "permission denied"
- Убедитесь что вы вошли как владелец проекта
- Попробуйте перезагрузить страницу Supabase Dashboard

### Bucket не создаётся
- Создайте через UI: Storage → New bucket → event-images
- Обязательно поставьте галочку "Public bucket"

### Политики не применяются
- Убедитесь что bucket создан ПЕРЕД созданием политик
- Проверьте что bucket называется точно `event-images`

### Изображения всё равно не загружаются
1. Откройте консоль браузера (F12)
2. Попробуйте загрузить изображение
3. Посмотрите ошибку в консоли
4. Если ошибка содержит "RLS", проверьте что политики применены
5. Если ошибка содержит "bucket not found", проверьте что bucket создан

---

## После применения миграций

Можете протестировать:

1. **Создание события с датой окончания:**
   - http://localhost:5173/create-event
   - Заполните форму
   - Поставьте галочку "Указать дату окончания"
   - Загрузите изображение

2. **Просмотр на карте:**
   - http://localhost:5173/events
   - Нажмите "🗺️ Карта"
   - Должны появиться маркеры событий

3. **Фильтры по датам:**
   - Установите "Начало события: От — До"
   - Переключитесь между списком и картой
   - Фильтры должны сохраняться

---

**Важно:** Все эти команды безопасны и используют `IF NOT EXISTS`, поэтому их можно выполнять повторно без проблем.

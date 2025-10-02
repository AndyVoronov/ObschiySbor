# Исправление ошибки загрузки изображений

## Проблема
Ошибка: "new row violates row-level security policy"

Это происходит из-за неправильных RLS политик для Storage.

## Решение

### Шаг 1: Создание bucket (если еще не создан)

1. Откройте Supabase Dashboard: https://supabase.com/dashboard/project/wrfcpsljchyetbmupqgc
2. Перейдите в **Storage** → **Create a new bucket**
3. Создайте bucket с параметрами:
   - **Name**: `event-images`
   - **Public bucket**: ✅ ДА (поставьте галочку!)
   - **File size limit**: 5MB
   - **Allowed MIME types**: `image/jpeg, image/jpg, image/png, image/webp`

### Шаг 2: Настройка политик Storage

Перейдите в **Storage** → **Policies** и выполните следующее:

#### Вариант A: Через интерфейс

1. Выберите bucket `event-images`
2. Нажмите **New Policy**
3. Создайте 4 политики:

**Политика 1: Просмотр изображений (SELECT)**
- Name: `Anyone can view event images`
- Allowed operation: `SELECT`
- Policy definition: `true` (без условий)

**Политика 2: Загрузка изображений (INSERT)**
- Name: `Authenticated users can upload`
- Allowed operation: `INSERT`
- Target roles: `authenticated`
- Policy definition: `true`

**Политика 3: Обновление изображений (UPDATE)**
- Name: `Authenticated users can update`
- Allowed operation: `UPDATE`
- Target roles: `authenticated`
- Policy definition: `true`

**Политика 4: Удаление изображений (DELETE)**
- Name: `Authenticated users can delete`
- Allowed operation: `DELETE`
- Target roles: `authenticated`
- Policy definition: `true`

#### Вариант B: Через SQL

Перейдите в **SQL Editor** и выполните:

```sql
-- Удаляем старые политики
DROP POLICY IF EXISTS "Anyone can view event images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;

-- Политика: все могут просматривать
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

### Шаг 3: Проверка

Выполните в SQL Editor для проверки:

```sql
-- Проверяем bucket
SELECT * FROM storage.buckets WHERE name = 'event-images';

-- Проверяем политики
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

### Шаг 4: Альтернативное решение (если не помогло)

Если проблема остается, сделайте bucket полностью публичным:

1. В Supabase Dashboard перейдите в **Storage**
2. Выберите bucket `event-images`
3. Нажмите **Settings** (шестеренка)
4. Включите **Public bucket**
5. Сохраните

Затем создайте простую политику:

```sql
-- Удаляем все политики
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- Создаём одну простую политику для публичного доступа
CREATE POLICY "Public Access"
ON storage.objects
USING (bucket_id = 'event-images')
WITH CHECK (bucket_id = 'event-images');
```

### Шаг 5: Тестирование

После настройки:
1. Перезагрузите страницу создания события
2. Попробуйте загрузить изображение
3. Проверьте консоль браузера на ошибки

Если ошибка повторяется, проверьте:
- ✅ Bucket `event-images` создан и публичный
- ✅ RLS политики настроены
- ✅ Пользователь авторизован в приложении

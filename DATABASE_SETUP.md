# Настройка базы данных для новых функций

После реализации новых функций необходимо обновить структуру базы данных в Supabase.

## Шаг 1: Добавление полей для координат в таблицу events

Выполните следующий SQL в Supabase SQL Editor:

```sql
-- Добавляем поля для географических координат
ALTER TABLE events
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Создаём индекс для быстрого поиска по координатам (опционально)
CREATE INDEX IF NOT EXISTS idx_events_location ON events(latitude, longitude);

-- Комментарии к полям
COMMENT ON COLUMN events.latitude IS 'Широта места проведения события';
COMMENT ON COLUMN events.longitude IS 'Долгота места проведения события';
```

## Шаг 2: Создание таблицы notifications

```sql
-- Создаём таблицу уведомлений
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаём индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_event_id ON notifications(event_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Комментарии
COMMENT ON TABLE notifications IS 'Уведомления для пользователей о событиях';
COMMENT ON COLUMN notifications.type IS 'Тип уведомления: new_participant, event_update, event_cancelled, event_reminder';
COMMENT ON COLUMN notifications.is_read IS 'Прочитано ли уведомление пользователем';
```

## Шаг 3: Настройка Row Level Security (RLS) для notifications

```sql
-- Включаем RLS для таблицы notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Политика: пользователи могут видеть только свои уведомления
CREATE POLICY "Users can view own notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Политика: пользователи могут обновлять свои уведомления (отмечать как прочитанные)
CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Политика: пользователи могут удалять свои уведомления
CREATE POLICY "Users can delete own notifications"
  ON notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- Политика: система может создавать уведомления для любых пользователей
CREATE POLICY "System can create notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (true);
```

## Шаг 4: Настройка Supabase Storage для изображений

1. Перейдите в **Storage** в Supabase Dashboard
2. Создайте новый bucket с именем `event-images`
3. Настройте публичный доступ для bucket:

```sql
-- Политика: все могут просматривать изображения
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-images');

-- Политика: авторизованные пользователи могут загружать изображения
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'event-images' AND auth.role() = 'authenticated');

-- Политика: пользователи могут удалять свои изображения
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
USING (bucket_id = 'event-images' AND auth.uid() = owner);
```

## Шаг 5: Включение Realtime для notifications

В Supabase Dashboard:
1. Перейдите в **Database** → **Replication**
2. Найдите таблицу `notifications`
3. Включите опцию **Enable Realtime**

Или выполните SQL:

```sql
-- Включаем Realtime для таблицы notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

## Шаг 6: Создание функции для автоматической очистки старых уведомлений (опционально)

```sql
-- Функция для удаления прочитанных уведомлений старше 30 дней
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM notifications
  WHERE is_read = true
    AND created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Создаём задачу для автоматической очистки (через pg_cron, если доступен)
-- SELECT cron.schedule('cleanup-notifications', '0 2 * * *', 'SELECT cleanup_old_notifications()');
```

## Шаг 7: Проверка структуры БД

Выполните следующий SQL для проверки:

```sql
-- Проверяем структуру таблицы events
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'events'
  AND column_name IN ('latitude', 'longitude');

-- Проверяем наличие таблицы notifications
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'notifications'
);

-- Проверяем RLS политики для notifications
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'notifications';

-- Проверяем bucket для изображений
SELECT * FROM storage.buckets WHERE name = 'event-images';
```

## Переменные окружения

Убедитесь, что в файле `frontend/.env` есть все необходимые переменные:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Тестирование новых функций

После настройки БД проверьте:

1. ✅ **Карты**: Создайте событие и выберите место на карте
2. ✅ **Изображения**: Загрузите изображение для события
3. ✅ **Календарь**: Откройте событие и экспортируйте в календарь
4. ✅ **Уведомления**:
   - Присоединитесь к событию другого пользователя
   - Проверьте, что организатору пришло уведомление
   - Кликните на колокольчик в навигации

## Решение проблем

### Ошибка "permission denied for table notifications"
- Убедитесь, что RLS политики настроены правильно
- Проверьте, что пользователь авторизован

### Изображения не загружаются
- Проверьте, что bucket `event-images` создан
- Убедитесь, что политики Storage настроены
- Проверьте размер файла (макс. 5MB)

### Уведомления не приходят
- Убедитесь, что Realtime включен для таблицы `notifications`
- Проверьте разрешения браузера на показ уведомлений
- Откройте консоль браузера для проверки ошибок

### Карта не отображается
- Проверьте подключение к интернету (карты загружаются с OpenStreetMap)
- Проверьте консоль браузера на ошибки Leaflet

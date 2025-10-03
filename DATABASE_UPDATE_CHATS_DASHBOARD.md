# Обновление БД: Чаты и Дашборд организатора

## Дата: 2025-10-02

Этот документ содержит SQL-скрипты для добавления новых функций:
1. **Система чатов** для общения участников событий
2. **Дашборд организатора** с аналитикой и статистикой
3. **Поле price** для отслеживания доходов от событий

## Инструкция по применению

1. Откройте Supabase Dashboard → SQL Editor
2. Скопируйте и выполните скрипты ниже **по порядку**
3. Проверьте, что все выполнилось без ошибок

---

## 1. Добавление поля price в таблицу events

```sql
-- Добавляем поле для стоимости участия
ALTER TABLE events ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2) DEFAULT 0;

-- Комментарий для поля
COMMENT ON COLUMN events.price IS 'Стоимость участия в событии (₽)';
```

---

## 2. Создание таблиц для системы чатов

```sql
-- Создание таблицы чат-комнат (одна комната на событие)
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы сообщений чата
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для чатов
CREATE INDEX IF NOT EXISTS idx_chat_rooms_event_id ON chat_rooms(event_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
```

---

## 3. Настройка Row Level Security (RLS) для чатов

```sql
-- Включение RLS для чатов
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Политики для chat_rooms
-- Чат-комнаты видны участникам события
DROP POLICY IF EXISTS "Чат-комнаты видны участникам события" ON chat_rooms;
CREATE POLICY "Чат-комнаты видны участникам события" ON chat_rooms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM event_participants
      WHERE event_participants.event_id = chat_rooms.event_id
        AND event_participants.user_id = auth.uid()
        AND event_participants.status = 'joined'
    ) OR EXISTS (
      SELECT 1 FROM events
      WHERE events.id = chat_rooms.event_id
        AND events.creator_id = auth.uid()
    )
  );

-- Чат-комнаты создаются автоматически
DROP POLICY IF EXISTS "Чат-комнаты создаются автоматически" ON chat_rooms;
CREATE POLICY "Чат-комнаты создаются автоматически" ON chat_rooms
  FOR INSERT WITH CHECK (true);

-- Политики для chat_messages
-- Сообщения видны участникам чата
DROP POLICY IF EXISTS "Сообщения видны участникам чата" ON chat_messages;
CREATE POLICY "Сообщения видны участникам чата" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_rooms
      JOIN event_participants ON event_participants.event_id = chat_rooms.event_id
      WHERE chat_rooms.id = chat_messages.room_id
        AND event_participants.user_id = auth.uid()
        AND event_participants.status = 'joined'
    ) OR EXISTS (
      SELECT 1 FROM chat_rooms
      JOIN events ON events.id = chat_rooms.event_id
      WHERE chat_rooms.id = chat_messages.room_id
        AND events.creator_id = auth.uid()
    )
  );

-- Участники могут отправлять сообщения
DROP POLICY IF EXISTS "Участники могут отправлять сообщения" ON chat_messages;
CREATE POLICY "Участники могут отправлять сообщения" ON chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND (
      EXISTS (
        SELECT 1 FROM chat_rooms
        JOIN event_participants ON event_participants.event_id = chat_rooms.event_id
        WHERE chat_rooms.id = chat_messages.room_id
          AND event_participants.user_id = auth.uid()
          AND event_participants.status = 'joined'
      ) OR EXISTS (
        SELECT 1 FROM chat_rooms
        JOIN events ON events.id = chat_rooms.event_id
        WHERE chat_rooms.id = chat_messages.room_id
          AND events.creator_id = auth.uid()
      )
    )
  );
```

---

## 4. Триггер для автоматического создания чат-комнаты

```sql
-- Функция для автоматического создания чат-комнаты при создании события
CREATE OR REPLACE FUNCTION create_chat_room_for_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO chat_rooms (event_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер для создания чат-комнаты
DROP TRIGGER IF EXISTS on_event_created ON events;
CREATE TRIGGER on_event_created
  AFTER INSERT ON events
  FOR EACH ROW EXECUTE FUNCTION create_chat_room_for_event();
```

---

## 5. Создание чат-комнат для существующих событий

```sql
-- Создаём чат-комнаты для событий, у которых их ещё нет
INSERT INTO chat_rooms (event_id)
SELECT id FROM events
WHERE id NOT IN (SELECT event_id FROM chat_rooms)
ON CONFLICT (event_id) DO NOTHING;
```

---

## 6. Включение Realtime для чатов

Выполните в Supabase Dashboard → Database → Replication:

1. Найдите таблицы `chat_rooms` и `chat_messages`
2. Включите Realtime для обеих таблиц
3. Выберите события: `INSERT`, `UPDATE`, `DELETE`

---

## Проверка установки

После выполнения всех скриптов проверьте:

```sql
-- Проверка структуры таблиц
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('chat_rooms', 'chat_messages', 'events')
ORDER BY table_name, ordinal_position;

-- Проверка политик RLS
SELECT tablename, policyname
FROM pg_policies
WHERE tablename IN ('chat_rooms', 'chat_messages');

-- Проверка триггеров
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'events';

-- Проверка индексов
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename IN ('chat_rooms', 'chat_messages');

-- Проверка количества чат-комнат
SELECT COUNT(*) as total_rooms FROM chat_rooms;
SELECT COUNT(*) as total_messages FROM chat_messages;
```

---

## Что было реализовано

### 1. Дашборд организатора
- **Компонент:** `OrganizerDashboard.jsx`
- **Расположение:** Новая вкладка "Дашборд организатора" в профиле
- **Функции:**
  - 📊 Общая статистика (всего событий, участников, доходов, средний рейтинг)
  - 📈 График посещаемости по месяцам
  - 💰 График доходов по месяцам
  - 🎯 Популярность категорий по посещаемости
  - 🏆 Топ-5 событий по количеству участников
  - 📊 Круговая диаграмма событий по категориям

### 2. Система чатов
- **Компонент:** `EventChat.jsx` - встроенный чат в событии
- **Страница:** `Chats.jsx` - все чаты пользователя
- **Функции:**
  - 💬 Real-time обмен сообщениями через Supabase Realtime
  - 🔒 Доступ только для участников события
  - 👤 Отображение аватаров и имён пользователей
  - 📱 Адаптивный дизайн
  - 🔔 Автоматическая прокрутка к новым сообщениям
  - 📋 Список всех чатов с последним сообщением

### 3. Доходы событий
- Добавлено поле `price` в таблицу `events`
- Дашборд показывает общий доход и доход по месяцам
- Расчёт: `price × количество участников`

---

## Маршруты и навигация

- `/profile` → вкладка "Дашборд организатора"
- `/chats` → список всех чатов пользователя
- `/events/:id` → чат события (внизу страницы)
- Навигация: добавлена ссылка "💬 Чаты" в хедер

---

## Зависимости

Установлена библиотека для графиков:
```bash
npm install recharts
```

---

## Что делать дальше

1. Примените SQL-скрипты в Supabase
2. Включите Realtime для таблиц чатов
3. Запустите приложение: `npm run dev`
4. Проверьте функциональность:
   - Создайте событие с ценой
   - Присоединитесь к событию
   - Отправьте сообщение в чат
   - Откройте дашборд организатора

---

## Возможные проблемы

### Проблема: Чат не загружается
**Решение:** Проверьте, что Realtime включён для `chat_messages` в Supabase

### Проблема: Сообщения не отправляются
**Решение:** Проверьте RLS политики командой:
```sql
SELECT * FROM pg_policies WHERE tablename = 'chat_messages';
```

### Проблема: Дашборд показывает нули
**Решение:** Убедитесь, что у событий есть участники и установлена цена

---

## Авторы
Реализовано: 2025-10-02

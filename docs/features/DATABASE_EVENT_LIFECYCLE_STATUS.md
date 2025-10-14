# Event Lifecycle Status System

**Дата внедрения:** 2025-10-14
**Статус:** ✅ Реализовано и работает на проде

## Обзор

Система отслеживания жизненного цикла событий с автоматическим обновлением статусов на основе дат начала и окончания.

## Структура базы данных

### Поля в таблице `events`

1. **`moderation_status`** (TEXT)
   - Статус модерации события
   - Значения: `'active'`, `'cancelled'`, `'completed'`
   - По умолчанию: `'active'`
   - Используется администраторами для модерации контента

2. **`lifecycle_status`** (ENUM `event_lifecycle_status`)
   - Жизненный цикл события
   - Значения: `'upcoming'`, `'ongoing'`, `'completed'`, `'cancelled'`
   - По умолчанию: `'upcoming'`
   - Автоматически обновляется на основе дат

3. **`cancellation_reason`** (TEXT)
   - Причина отмены события организатором
   - NULL если событие не отменено
   - Отображается участникам при `lifecycle_status = 'cancelled'`

### ENUM тип

```sql
CREATE TYPE event_lifecycle_status AS ENUM (
  'upcoming',   -- Запланировано (ещё не началось)
  'ongoing',    -- Идёт сейчас (в процессе)
  'completed',  -- Завершено (уже прошло)
  'cancelled'   -- Отменено организатором
);
```

### SQL функция

```sql
CREATE OR REPLACE FUNCTION update_event_lifecycle_status()
RETURNS void AS $$
BEGIN
    -- Обновляем статус на 'ongoing' для событий, которые начались
    UPDATE events
    SET lifecycle_status = 'ongoing'
    WHERE lifecycle_status = 'upcoming'
      AND event_date <= NOW()
      AND (end_date IS NULL OR end_date >= NOW());

    -- Обновляем статус на 'completed' для событий, которые завершились
    UPDATE events
    SET lifecycle_status = 'completed'
    WHERE lifecycle_status IN ('upcoming', 'ongoing')
      AND ((end_date IS NOT NULL AND end_date < NOW())
           OR (end_date IS NULL AND event_date < NOW() - INTERVAL '1 day'));
END;
$$ LANGUAGE plpgsql;
```

### Индексы

```sql
CREATE INDEX idx_events_lifecycle_status ON events(lifecycle_status);
```

## Клиентская реализация

### Файлы

1. **`frontend/src/utils/eventStatus.js`**
   - Константы статусов и их локализация
   - Функция `getEventStatus(event)` - определяет статус на основе `event.lifecycle_status` и дат
   - Утилиты: `canJoinEvent()`, `canCancelEvent()`, `formatStatus()`

2. **`frontend/src/components/EventStatusBadge.jsx`**
   - Компонент для отображения цветного бейджа со статусом
   - Цвета: upcoming (синий), ongoing (зелёный), completed (серый), cancelled (красный)
   - Эмодзи: 📅 🔴 ✅ ❌

3. **`frontend/src/hooks/useEvents.js`**
   - Автоматически вызывает `update_event_lifecycle_status()` перед загрузкой событий
   - Гарантирует актуальность статусов при каждом просмотре

4. **`frontend/src/pages/EventDetails.jsx`**
   - Автоматически обновляет статусы перед загрузкой события
   - Функционал отмены события организатором
   - Отправка уведомлений всем участникам при отмене
   - Отображение причины отмены

5. **`frontend/src/pages/Events.jsx`**
   - Отображение бейджей статусов в карточках событий

6. **`frontend/src/components/EventsMapView.jsx`**
   - Отображение статусов в баллунах на карте

### Логика обновления статусов

**Автоматическое обновление (клиент → SQL):**
- При загрузке списка событий (`useEvents.js`)
- При открытии страницы события (`EventDetails.jsx`)
- Вызывает SQL функцию `update_event_lifecycle_status()`

**Ручная отмена (организатор):**
- Кнопка "Отменить событие" в `EventDetails.jsx`
- Устанавливает `lifecycle_status = 'cancelled'`
- Сохраняет причину в `cancellation_reason`
- Отправляет уведомления всем участникам

## Визуальное отображение

### Цветовая схема бейджей

```javascript
EVENT_STATUS_COLORS = {
  'upcoming': '#3498db',   // Синий
  'ongoing': '#2ecc71',    // Зелёный
  'completed': '#95a5a6',  // Серый
  'cancelled': '#e74c3c',  // Красный
}
```

### Локализация

```javascript
EVENT_STATUS_LABELS = {
  'upcoming': 'Запланировано',
  'ongoing': 'Идёт сейчас',
  'completed': 'Завершено',
  'cancelled': 'Отменено',
}
```

### Эмодзи

```javascript
EVENT_STATUS_EMOJI = {
  'upcoming': '📅',
  'ongoing': '🔴',
  'completed': '✅',
  'cancelled': '❌',
}
```

## Пользовательские сценарии

### 1. Просмотр событий
- Пользователь видит цветной бейдж со статусом в карточке события
- На карте событий также отображается статус

### 2. Создание события
- При создании автоматически устанавливается `lifecycle_status = 'upcoming'`
- Устанавливается `moderation_status = 'active'`

### 3. Автоматический переход статусов
- `upcoming` → `ongoing`: когда наступает `event_date` и событие не завершилось
- `upcoming/ongoing` → `completed`: когда проходит `end_date` (или event_date + 1 день)

### 4. Отмена события организатором
- Организатор нажимает "Отменить событие"
- Вводит причину отмены
- Статус меняется на `cancelled`
- Всем участникам отправляются уведомления
- Присоединение к событию блокируется

### 5. Уведомления при отмене
- Тип уведомления: `'event_cancelled'`
- Заголовок: "Событие отменено"
- Сообщение: "Событие [название] было отменено. Причина: [причина]"
- Ссылка ведёт на страницу события

## Ограничения и правила

### Присоединение к событию
- Можно присоединиться только к событиям со статусом `upcoming` или `ongoing`
- Нельзя присоединиться к `cancelled` или `completed`

### Отмена события
- Отменить может только организатор (creator)
- Отменить можно только события со статусом `upcoming` или `ongoing`
- Нельзя отменить уже завершённые события

### Автоматическое обновление
- Статусы обновляются при каждой загрузке страницы событий
- SQL функция выполняется на сервере (Supabase)
- Изменения применяются ко всем событиям сразу

## Миграции

### Применённые миграции

1. **`database/migration_event_lifecycle_status.sql`** ✅ Применена
   - Переименование `status` → `moderation_status`
   - Создание ENUM типа `event_lifecycle_status`
   - Добавление колонки `lifecycle_status`
   - Добавление колонки `cancellation_reason`
   - Создание функции `update_event_lifecycle_status()`
   - Создание индекса `idx_events_lifecycle_status`

### Важно при деплое
- SQL функция создаётся в Supabase Dashboard → SQL Editor
- Все изменения схемы применены и работают на проде
- Frontend код синхронизирован с БД

## Troubleshooting

### Проблема: Статусы не отображаются
**Решение:**
1. Проверь что SQL функция создана: `SELECT proname FROM pg_proc WHERE proname = 'update_event_lifecycle_status';`
2. Проверь что поле существует: `SELECT column_name FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'lifecycle_status';`
3. Проверь консоль браузера на ошибки

### Проблема: Ошибка при создании события
**Решение:**
- Убедись что используется `moderation_status` вместо `status` в `CreateEvent.jsx`
- Проверь что `lifecycle_status` имеет значение по умолчанию в БД

### Проблема: Статусы не обновляются автоматически
**Решение:**
- Проверь что `useEvents.js` вызывает `update_event_lifecycle_status()`
- Проверь что `EventDetails.jsx` вызывает функцию перед загрузкой
- Проверь логи в консоли: должно быть "Статусы событий обновлены"

## Будущие улучшения

- [ ] Добавить cron-задачу для автоматического обновления статусов (через pg_cron или Supabase Edge Functions)
- [ ] Добавить фильтрацию событий по lifecycle_status
- [ ] Добавить статистику по статусам в дашборд организатора
- [ ] Добавить возможность восстановления отменённого события
- [ ] Email уведомления при отмене события

## Связанные файлы

**SQL:**
- `database/migration_event_lifecycle_status.sql` - миграция

**Frontend:**
- `frontend/src/utils/eventStatus.js` - утилиты
- `frontend/src/components/EventStatusBadge.jsx` - бейдж компонент
- `frontend/src/components/EventStatusBadge.css` - стили бейджа
- `frontend/src/hooks/useEvents.js` - хук для событий
- `frontend/src/pages/Events.jsx` - список событий
- `frontend/src/pages/EventDetails.jsx` - страница события
- `frontend/src/pages/EventDetails.css` - стили для отмены
- `frontend/src/components/EventsMapView.jsx` - карта событий
- `frontend/src/pages/CreateEvent.jsx` - создание события

## Changelog

**2025-10-14:**
- ✅ Создана система lifecycle статусов
- ✅ Реализовано автоматическое обновление через SQL функцию
- ✅ Добавлены визуальные бейджи со статусами
- ✅ Реализован функционал отмены событий организатором
- ✅ Добавлены уведомления участникам при отмене
- ✅ Протестировано и задеплоено на прод

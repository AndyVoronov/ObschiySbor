# Диапазон участников и возрастные ограничения

**Дата реализации:** 26 октября 2025
**Статус:** ✅ Реализовано

## Обзор

Добавлены функции для более гибкой настройки событий:
- Диапазон участников (мин/макс)
- Автоматическая отмена при недоборе участников
- Возрастные ограничения (мин/макс возраст)
- Отметка "можно с детьми"

## Новые поля в таблице `events`

### Поля для участников
- `min_participants` (INTEGER, nullable) - Минимальное количество участников
- `auto_cancel_enabled` (BOOLEAN) - Включена ли автоматическая отмена
- `auto_cancel_deadline` (TIMESTAMPTZ, nullable) - Дедлайн для набора минимума участников
- `auto_cancel_min_participants` (INTEGER, nullable) - Минимум участников для проведения

### Поля для возраста
- `min_age` (INTEGER, default 18) - Минимальный возраст
- `max_age` (INTEGER, nullable) - Максимальный возраст (NULL = без ограничений)
- `kids_allowed` (BOOLEAN, default FALSE) - Можно ли с детьми

## SQL Миграция

Файл: `database/migrations/add_participant_range_and_age_restrictions.sql`

Применить в Supabase SQL Editor:
```sql
-- Запустите содержимое файла миграции
```

## Функционал автоотмены

### SQL функция
```sql
check_and_auto_cancel_events()
```

Проверяет события и автоматически отменяет те, которые:
- Имеют `auto_cancel_enabled = TRUE`
- Имеют статус `upcoming`
- Достигли `auto_cancel_deadline`
- Не набрали `auto_cancel_min_participants`

### Настройка автозапуска (опционально)

Можно настроить через Supabase Edge Functions или cron:

```javascript
// supabase/functions/auto-cancel-events/index.ts
import { createClient } from '@supabase/supabase-js'

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { error } = await supabase.rpc('check_and_auto_cancel_events')

  if (error) {
    return new Response(JSON.stringify({ error }), { status: 500 })
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 })
})
```

Настроить запуск через Supabase Dashboard → Edge Functions → Cron (каждый час).

## UI компоненты

### CreateEvent.jsx
Добавлены новые поля формы:
- Минимальное количество участников
- Чекбокс "Включить автоотмену"
  - Дедлайн для набора участников
  - Минимум участников для проведения
- Секция "Возрастные ограничения"
  - Минимальный возраст (выпадающий список)
  - Максимальный возраст (ввод числа)
  - Чекбокс "Можно с детьми"

### Переводы
- Русский: `frontend/src/locales/ru/common.json` → `createEvent.*`
- Английский: `frontend/src/locales/en/common.json` → `createEvent.*`

Ключи:
- `minParticipants`, `minParticipantsHint`
- `autoCancelSettings`, `autoCancelEnabled`, `autoCancelEnabledHint`
- `autoCancelDeadline`, `autoCancelDeadlineHint`
- `autoCancelMinParticipants`
- `ageRestrictions`, `minAge`, `minAgeHint`
- `maxAge`, `maxAgeHint`, `noAgeLimit`
- `kidsAllowed`, `kidsAllowedHint`

## Проверочные ограничения (Constraints)

Добавлены на уровне базы данных:
- `min_participants > 0`
- `max_participants > 0`
- `min_participants <= max_participants`
- `min_age >= 0`
- `max_age > 0` (если указан)
- `max_age >= min_age` (если указан)
- Автоотмена: если включена, должны быть заполнены `deadline` и `min_participants`

## Логирование автоотмен

Таблица `event_auto_cancel_log`:
- `id` - ID записи
- `event_id` - ID отменённого события
- `cancelled_at` - Время отмены
- `reason` - Причина (текст)
- `participants_count` - Сколько участников было
- `min_required` - Сколько требовалось
- `deadline` - Дедлайн

RLS политики:
- Организаторы видят логи своих событий
- Система может создавать логи

## Индексы

Добавлены для оптимизации:
```sql
idx_events_auto_cancel ON events(auto_cancel_enabled, auto_cancel_deadline, lifecycle_status)
idx_events_age_restrictions ON events(min_age, max_age, kids_allowed)
```

## Примеры использования

### Создание события с автоотменой
```javascript
const eventData = {
  title: "Настольные игры",
  max_participants: 10,
  min_participants: 5,
  auto_cancel_enabled: true,
  auto_cancel_deadline: "2025-11-01T18:00:00Z",
  auto_cancel_min_participants: 5,
  // ...
}
```

### Событие для всех возрастов
```javascript
const eventData = {
  min_age: 0,
  max_age: null,
  kids_allowed: true,
  // ...
}
```

### Событие только для взрослых
```javascript
const eventData = {
  min_age: 18,
  max_age: null,
  kids_allowed: false,
  // ...
}
```

## Будущие улучшения

- [ ] Уведомления участникам об автоотмене
- [ ] Отправка email за N дней до дедлайна
- [ ] Статистика по автоотменам для организаторов
- [ ] Фильтры по возрасту на странице Events

## Связанные файлы

### База данных
- `database/migrations/add_participant_range_and_age_restrictions.sql`

### Frontend
- `frontend/src/pages/CreateEvent.jsx` - Форма создания события
- `frontend/src/locales/ru/common.json` - Русские переводы
- `frontend/src/locales/en/common.json` - Английские переводы

## См. также
- [DATABASE_SETUP.md](DATABASE_SETUP.md) - Общая настройка БД
- [EVENT_LIFECYCLE_STATUS.md](DATABASE_EVENT_LIFECYCLE_STATUS.md) - Система статусов событий

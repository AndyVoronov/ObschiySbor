# Руководство по повторяющимся событиям

Полное руководство по использованию функции повторяющихся событий в ObschiySbor.

## Обзор

Функция повторяющихся событий позволяет организаторам создавать серии событий автоматически. Например:
- Йога каждую среду в 18:00
- Настольные игры по вторникам и четвергам
- Велопрогулка каждые выходные

## Для пользователей

### Создание повторяющегося события

1. Перейдите на страницу "Создать событие"
2. Заполните основную информацию о событии (название, описание, дата, место)
3. Прокрутите вниз до раздела **"Повторяющееся событие"**
4. Активируйте переключатель "🔄 Повторяющееся событие"
5. Настройте параметры повторения:

#### Параметры повторения

**Частота повторения:**
- **Ежедневно** - событие будет повторяться каждый день
- **Еженедельно** - событие будет повторяться каждую неделю
- **Ежемесячно** - событие будет повторяться каждый месяц

**Интервал:**
- Для ежедневных: каждый 1, 2, 3... день
- Для еженедельных: каждую 1, 2, 3... неделю
- Для ежемесячных: каждый 1, 2, 3... месяц

**Дни недели (только для еженедельных):**
- Выберите конкретные дни недели (Пн, Вт, Ср, Чт, Пт, Сб, Вс)
- Если не выбрано - событие повторяется в тот же день недели

**Окончание повторения:**
- **После количества повторений** - например, 10 раз
- **До определённой даты** - например, до конца лета

#### Примеры настроек

**Пример 1: Йога каждую среду**
```
Частота: Еженедельно
Интервал: 1 (каждую неделю)
Дни недели: Ср
Окончание: После 12 повторений
```

**Пример 2: Настольные игры 2 раза в неделю**
```
Частота: Еженедельно
Интервал: 1
Дни недели: Вт, Чт
Окончание: До 31.12.2025
```

**Пример 3: Ежедневная пробежка**
```
Частота: Ежедневно
Интервал: 1 (каждый день)
Дни недели: -
Окончание: После 30 повторений
```

### Просмотр серии событий

После создания повторяющегося события:
- Родительское событие отмечено как шаблон
- Все дочерние события создаются автоматически
- Вы увидите все события в серии на странице Events

### Управление повторяющимися событиями

**В профиле организатора:**
- Все события серии отображаются в списке созданных событий
- Каждое событие можно редактировать или удалить отдельно

**Удаление:**
- Удаление родительского события удаляет всю серию (CASCADE)
- Удаление отдельного события удаляет только его

## Для разработчиков

### Структура базы данных

**Новые колонки в таблице `events`:**

```sql
parent_event_id UUID            -- ID родительского события
recurrence_config JSONB          -- Настройки повторения
recurrence_end_date TIMESTAMPTZ  -- Дата окончания серии
is_recurring_parent BOOLEAN      -- Отметка родительского события
```

**Формат `recurrence_config`:**
```json
{
  "frequency": "weekly",
  "interval": 1,
  "daysOfWeek": [3, 5],
  "count": 10
}
```

### SQL Функции

#### `generate_recurring_events()`

Генерирует экземпляры повторяющихся событий.

```sql
SELECT * FROM generate_recurring_events(
  'parent-event-uuid',  -- ID родительского события
  'weekly',             -- Частота (daily, weekly, monthly)
  1,                    -- Интервал
  10,                   -- Количество повторений
  ARRAY[1, 3, 5],      -- Дни недели (опционально)
  '2025-12-31'         -- Дата окончания (опционально)
);
```

**Возвращает:**
```sql
RETURNS TABLE (
  event_id UUID,
  event_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
)
```

#### `get_recurring_event_series()`

Получает все события в серии.

```sql
SELECT * FROM get_recurring_event_series('any-event-uuid-in-series');
```

**Возвращает:**
```sql
RETURNS TABLE (
  id UUID,
  title TEXT,
  date TIMESTAMP WITH TIME ZONE,
  status TEXT,
  is_parent BOOLEAN
)
```

#### `delete_recurring_event_series()`

Удаляет события серии с различными режимами.

```sql
-- Удалить всю серию
SELECT delete_recurring_event_series('event-uuid', 'all');

-- Удалить только будущие события
SELECT delete_recurring_event_series('event-uuid', 'future');

-- Удалить только текущее событие
SELECT delete_recurring_event_series('event-uuid', 'single');
```

**Возвращает:** количество удалённых событий (INTEGER)

### Frontend API

**Компонент RecurringEventSettings:**

```jsx
import RecurringEventSettings from '../components/RecurringEventSettings';

<RecurringEventSettings
  value={recurrenceConfig}
  onChange={setRecurrenceConfig}
/>
```

**Утилиты (recurringEvents.js):**

```javascript
import {
  createRecurringEvents,
  getRecurringEventSeries,
  deleteRecurringEvents,
  formatRecurrenceDescription,
  isRecurringEvent,
  isRecurringParent
} from '../utils/recurringEvents';

// Создать серию
await createRecurringEvents(parentEventId, {
  frequency: 'weekly',
  interval: 1,
  occurrenceCount: 10,
  daysOfWeek: [1, 3, 5],
  endDate: '2025-12-31'
});

// Получить всю серию
const series = await getRecurringEventSeries(eventId);

// Удалить серию
const deletedCount = await deleteRecurringEvents(eventId, 'all');

// Форматировать описание
const description = formatRecurrenceDescription(recurrenceConfig);
// "Повторяется каждую неделю по: Пн, Ср, Пт, всего 10 раз"

// Проверки
if (isRecurringEvent(event)) { ... }
if (isRecurringParent(event)) { ... }
```

### Логика работы

1. **Создание серии:**
   - Пользователь создаёт событие и настраивает повторение
   - После создания родительского события вызывается `createRecurringEvents()`
   - SQL функция `generate_recurring_events()` создаёт дочерние события
   - Родительское событие помечается `is_recurring_parent = true`

2. **Связь событий:**
   - Дочерние события имеют `parent_event_id` указывающий на родительское
   - Родительское событие хранит `recurrence_config` с настройками
   - При удалении родительского все дочерние удаляются (CASCADE)

3. **Вычисление дат:**
   - Для `daily`: прибавляем `interval` дней
   - Для `weekly`: прибавляем `interval` недель, учитываем `daysOfWeek`
   - Для `monthly`: прибавляем `interval` месяцев
   - Цикл прерывается при достижении `occurrenceCount` или `endDate`

### Индексы производительности

```sql
CREATE INDEX idx_events_parent_event_id
  ON events(parent_event_id);

CREATE INDEX idx_events_is_recurring_parent
  ON events(is_recurring_parent)
  WHERE is_recurring_parent = TRUE;

CREATE INDEX idx_events_recurrence_end_date
  ON events(recurrence_end_date)
  WHERE recurrence_end_date IS NOT NULL;
```

## Ограничения и защита

**Безопасность:**
- Максимум 100 событий в серии (защита от бесконечного цикла)
- `SECURITY DEFINER` для функций PostgreSQL
- RLS политики применяются к каждому событию

**Валидация:**
- Частота: только `daily`, `weekly`, `monthly`
- Интервал: от 1 до 30
- Дни недели: 1-7 (ISO week day)
- Количество: от 1 до 100

## Примеры кода

### Создание регулярной йоги

```javascript
const eventData = {
  title: 'Йога в парке',
  description: 'Утренняя йога на свежем воздухе',
  category: 'yoga',
  event_date: '2025-10-20T09:00:00',
  end_date: '2025-10-20T10:30:00',
  // ... другие поля
};

const recurrenceConfig = {
  isRecurring: true,
  frequency: 'weekly',
  interval: 1,
  daysOfWeek: [3], // Среда
  occurrenceCount: 12,
  endType: 'count'
};

// После создания события
if (recurrenceConfig.isRecurring) {
  await createRecurringEvents(event.id, recurrenceConfig);
}
```

### Получение и отображение серии

```javascript
// В EventDetails компоненте
const [eventSeries, setEventSeries] = useState([]);

useEffect(() => {
  if (isRecurringEvent(event)) {
    getRecurringEventSeries(event.id)
      .then(series => setEventSeries(series));
  }
}, [event.id]);

// Отобразить все события серии
{eventSeries.length > 1 && (
  <div className="event-series">
    <h3>Серия событий ({eventSeries.length})</h3>
    <ul>
      {eventSeries.map(e => (
        <li key={e.id}>
          {e.is_parent && '🔄 '}
          {new Date(e.date).toLocaleDateString('ru-RU')}
          - {e.status}
        </li>
      ))}
    </ul>
  </div>
)}
```

## Troubleshooting

**Проблема:** События не создаются

**Решение:**
1. Проверьте что миграция применена:
   ```sql
   SELECT count(*) FROM information_schema.columns
   WHERE table_name = 'events' AND column_name = 'parent_event_id';
   ```
2. Проверьте что функция существует:
   ```sql
   SELECT routine_name FROM information_schema.routines
   WHERE routine_name = 'generate_recurring_events';
   ```
3. Проверьте логи Supabase на наличие ошибок

**Проблема:** Дочерние события создаются с неправильными датами

**Решение:**
- Проверьте формат `daysOfWeek` (должен быть массив чисел 1-7)
- Проверьте что `frequency` корректна (`daily`/`weekly`/`monthly`)
- Проверьте часовой пояс в `event_date`

## Что дальше?

**Возможные улучшения:**
- [ ] UI для просмотра всей серии событий
- [ ] Редактирование всей серии одновременно
- [ ] Исключения из серии (пропустить определённую дату)
- [ ] Email-уведомления для серии событий
- [ ] Отображение серии в календарном виде

## Заключение

Функция повторяющихся событий полностью интегрирована и готова к использованию. Миграция БД применена, компоненты созданы, логика реализована.

**Файлы документации:**
- `database/migration_recurring_events.sql` - SQL миграция
- `frontend/src/components/RecurringEventSettings.jsx` - UI компонент
- `frontend/src/utils/recurringEvents.js` - утилиты
- `RECURRING_EVENTS_GUIDE.md` - это руководство

**Дата создания:** 2025-10-19

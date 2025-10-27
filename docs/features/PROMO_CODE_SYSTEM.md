# Система промокодов

**Дата создания:** 2025-01-27
**Статус:** ✅ Реализовано и развёрнуто

## Описание

Система промокодов позволяет предоставлять скидки на участие в событиях. Поддерживаются три типа скидок:
- **Процентная скидка** - скидка в процентах от цены события
- **Фиксированная скидка** - скидка в фиксированной сумме рублей
- **Бесплатное участие** - событие становится бесплатным при применении промокода

## Технические детали

### Database Schema

#### Таблица `promo_codes`
```sql
CREATE TABLE promo_codes (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed', 'free')),
  discount_value DECIMAL(10, 2) NOT NULL DEFAULT 0,
  applicable_categories TEXT[],
  min_event_price DECIMAL(10, 2) DEFAULT 0,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  per_user_limit INTEGER DEFAULT 1,
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Поля:**
- `code` - уникальный код промокода (например, `SUMMER2025`)
- `description` - описание промокода для пользователей
- `discount_type` - тип скидки (`percentage`, `fixed`, `free`)
- `discount_value` - значение скидки (процент или сумма в рублях)
- `applicable_categories` - массив категорий, к которым применим промокод (null = все категории)
- `min_event_price` - минимальная цена события для применения промокода
- `usage_limit` - общий лимит использований (null = неограничено)
- `usage_count` - счётчик использований
- `per_user_limit` - сколько раз один пользователь может использовать промокод
- `start_date`, `end_date` - период действия промокода
- `is_active` - флаг активности
- `created_by` - ID пользователя, создавшего промокод

#### Таблица `promo_code_usages`
```sql
CREATE TABLE promo_code_usages (
  id BIGSERIAL PRIMARY KEY,
  promo_code_id BIGINT REFERENCES promo_codes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  original_price DECIMAL(10, 2) NOT NULL,
  discount_amount DECIMAL(10, 2) NOT NULL,
  final_price DECIMAL(10, 2) NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(promo_code_id, user_id, event_id)
);
```

**Поля:**
- `promo_code_id` - ссылка на промокод
- `user_id` - пользователь, применивший промокод
- `event_id` - событие, к которому применён промокод
- `original_price` - изначальная цена
- `discount_amount` - размер скидки
- `final_price` - финальная цена после скидки
- `used_at` - время применения

**Constraint:** Уникальная комбинация (promo_code_id, user_id, event_id) предотвращает повторное применение промокода к одному и тому же событию.

### PostgreSQL Functions

#### `validate_promo_code()`
Валидирует промокод и рассчитывает скидку.

```sql
CREATE OR REPLACE FUNCTION validate_promo_code(
  p_code VARCHAR(50),
  p_user_id UUID,
  p_category VARCHAR(50),
  p_price NUMERIC(10, 2)
)
RETURNS TABLE (
  is_valid BOOLEAN,
  error_message VARCHAR(100),
  discount_amount NUMERIC(10, 2),
  final_price NUMERIC(10, 2),
  promo_code_id BIGINT,
  discount_type VARCHAR(20),
  discount_value NUMERIC(10, 2),
  description TEXT
)
```

**Проверки:**
1. Существование промокода
2. Активность промокода
3. Дата начала действия
4. Дата окончания
5. Общий лимит использований
6. Лимит использований на пользователя
7. Применимость к категории события
8. Минимальная цена события

**Возвращает:**
- `is_valid` - валиден ли промокод
- `error_message` - код ошибки (если есть)
- `discount_amount` - размер скидки
- `final_price` - финальная цена
- Другие данные промокода для отображения

#### `apply_promo_code()`
Применяет промокод к событию (автоматически вызывается при создании события).

```sql
CREATE OR REPLACE FUNCTION apply_promo_code(
  p_promo_code_id BIGINT,
  p_user_id UUID,
  p_event_id UUID
)
RETURNS BOOLEAN
```

**Действия:**
1. Инкрементирует `usage_count` промокода
2. Создаёт запись в `promo_code_usages`

#### `deactivate_expired_promo_codes()`
Деактивирует просроченные промокоды (для автоматических заданий).

### Database VIEW

#### `promo_code_stats`
Статистика использования промокодов.

```sql
CREATE VIEW promo_code_stats AS
SELECT
  pc.id,
  pc.code,
  pc.discount_type,
  pc.discount_value,
  pc.usage_limit,
  pc.usage_count,
  COUNT(pcu.id) as actual_usage_count,
  SUM(pcu.discount_amount) as total_discount_given,
  pc.is_active,
  pc.start_date,
  pc.end_date
FROM promo_codes pc
LEFT JOIN promo_code_usages pcu ON pc.id = pcu.promo_code_id
GROUP BY pc.id;
```

### RLS Policies

**Таблица `promo_codes`:**
- Создатели могут управлять своими промокодами (полный доступ)
- Все пользователи могут читать активные промокоды

**Таблица `promo_code_usages`:**
- Пользователи могут видеть свои использования
- Создатели событий могут видеть использования промокодов в своих событиях

### Indexes

```sql
-- Быстрый поиск по коду
CREATE INDEX idx_promo_codes_code ON promo_codes(code);

-- Фильтрация по активности и датам
CREATE INDEX idx_promo_codes_active_dates ON promo_codes(is_active, start_date, end_date);

-- Поиск использований по промокоду
CREATE INDEX idx_promo_code_usages_promo_code ON promo_code_usages(promo_code_id);

-- Поиск использований по пользователю
CREATE INDEX idx_promo_code_usages_user ON promo_code_usages(user_id);
```

## Frontend Компоненты

### PromoCodeInput
**Файл:** `frontend/src/components/PromoCodeInput.jsx`

Компонент для применения промокодов при создании события.

**Props:**
- `category` - категория события
- `price` - цена события
- `onPromoApplied` - callback при успешном применении промокода

**Функционал:**
- Показывается только если `price > 0`
- Валидация промокода через RPC функцию `validate_promo_code`
- Отображение типа скидки (процент/фиксированная/бесплатно)
- Расчёт и отображение финальной цены
- Возможность удалить применённый промокод

**Состояния:**
- Скрыт по умолчанию (кнопка "Есть промокод?")
- Ввод промокода
- Валидация промокода
- Отображение применённого промокода

**Обработка ошибок:**
- `not_found` - промокод не найден
- `inactive` - промокод неактивен
- `not_started` - промокод ещё не действует
- `expired` - промокод истёк
- `usage_limit_reached` - превышен общий лимит
- `user_limit_reached` - превышен лимит на пользователя
- `category_not_applicable` - промокод не применим к категории
- `min_price_not_met` - цена события ниже минимальной

### PromoCodeManager
**Файл:** `frontend/src/components/PromoCodeManager.jsx`

Админ-панель для управления промокодами.

**Функционал:**

1. **Создание промокодов:**
   - Ввод кода (до 50 символов)
   - Описание промокода
   - Выбор типа скидки
   - Значение скидки (процент или сумма)
   - Выбор применимых категорий (мультиселект)
   - Минимальная цена события
   - Общий лимит использований
   - Лимит на пользователя
   - Период действия (start_date, end_date)
   - Флаг активности

2. **Просмотр промокодов:**
   - Список всех промокодов с карточками
   - Отображение статуса (активен/неактивен)
   - Информация о скидке
   - Применимые категории
   - Период действия
   - Статистика использования (текущее/лимит)

3. **Управление промокодами:**
   - Активация/деактивация
   - Удаление промокода

**Доступ:**
Компонент может быть интегрирован в админ-панель или профиль пользователя (для создателей промокодов).

## Использование

### 1. Применение SQL миграции

```bash
# Применить миграцию в Supabase SQL Editor
# Файл: database/migrations/add_promo_code_system.sql
```

**Важно:** Миграция исправлена - удалена ссылка на несуществующее поле `is_admin`. Для полноценной системы администрирования рекомендуется позже добавить поле `is_admin` в таблицу `profiles` и создать соответствующую RLS политику.

### 2. Создание промокода

**Через PromoCodeManager:**
1. Открыть PromoCodeManager
2. Нажать "Создать промокод"
3. Заполнить форму
4. Нажать "Создать"

**Через SQL:**
```sql
INSERT INTO promo_codes (
  code,
  description,
  discount_type,
  discount_value,
  applicable_categories,
  min_event_price,
  usage_limit,
  per_user_limit,
  start_date,
  end_date,
  is_active,
  created_by
) VALUES (
  'SUMMER2025',
  'Летняя скидка 20% на все события',
  'percentage',
  20,
  NULL, -- все категории
  0,
  100,
  1,
  '2025-06-01 00:00:00',
  '2025-08-31 23:59:59',
  TRUE,
  'user-uuid-here'
);
```

### 3. Применение промокода пользователем

1. Создать событие с ценой > 0
2. Ввести промокод в поле PromoCodeInput
3. Нажать "Применить"
4. Если промокод валиден, будет показана финальная цена
5. При создании события система автоматически:
   - Сохранит финальную цену в `events.price`
   - Создаст запись в `promo_code_usages`
   - Инкрементирует `usage_count` промокода

### 4. Просмотр статистики

**Через VIEW:**
```sql
SELECT * FROM promo_code_stats WHERE code = 'SUMMER2025';
```

**Через PromoCodeManager:**
Статистика отображается на карточках промокодов (Использовано: X / Y).

## Примеры промокодов

### 1. Процентная скидка
```sql
-- 30% скидка на йогу и фитнес
INSERT INTO promo_codes (code, description, discount_type, discount_value, applicable_categories, created_by)
VALUES (
  'YOGA30',
  'Скидка 30% на йогу и фитнес',
  'percentage',
  30,
  ARRAY['yoga', 'fitness'],
  auth.uid()
);
```

### 2. Фиксированная скидка
```sql
-- Скидка 500 рублей на события от 1000 рублей
INSERT INTO promo_codes (code, description, discount_type, discount_value, min_event_price, created_by)
VALUES (
  'SAVE500',
  'Скидка 500₽ при покупке от 1000₽',
  'fixed',
  500,
  1000,
  auth.uid()
);
```

### 3. Бесплатное участие
```sql
-- Бесплатное участие в первом походе
INSERT INTO promo_codes (code, description, discount_type, applicable_categories, per_user_limit, created_by)
VALUES (
  'FIRSTHIKE',
  'Первый поход бесплатно!',
  'free',
  ARRAY['hiking'],
  1,
  auth.uid()
);
```

### 4. Ограниченная акция
```sql
-- Промокод на 10 использований с ограничением по датам
INSERT INTO promo_codes (
  code, description, discount_type, discount_value,
  usage_limit, start_date, end_date, created_by
)
VALUES (
  'NEWYEAR25',
  'Новогодняя акция! 25% скидка',
  'percentage',
  25,
  10,
  '2025-01-01 00:00:00',
  '2025-01-10 23:59:59',
  auth.uid()
);
```

## Тестирование

### 1. Проверка валидации

```javascript
// В браузере (DevTools Console):
const { data, error } = await supabase.rpc('validate_promo_code', {
  p_code: 'SUMMER2025',
  p_user_id: 'user-uuid',
  p_category: 'board_games',
  p_price: 500
});

console.log(data); // Должен вернуть данные о скидке
```

### 2. Проверка RLS политик

```sql
-- От имени пользователя должны быть видны только активные промокоды
SELECT * FROM promo_codes;

-- Пользователь должен видеть только свои использования
SELECT * FROM promo_code_usages;
```

### 3. Проверка лимитов

```sql
-- Попытка применить промокод больше per_user_limit раз должна завершиться ошибкой
-- Проверяется функцией validate_promo_code
```

## Безопасность

### Защита от злоупотреблений

1. **Уникальный constraint** на (promo_code_id, user_id, event_id) предотвращает повторное применение к одному событию
2. **Валидация на стороне сервера** через PostgreSQL функцию
3. **RLS политики** ограничивают доступ к данным
4. **Лимиты использований** (общий и на пользователя)
5. **Период действия** - автоматическая проверка дат

### Рекомендации

- Промокоды создаются только аутентифицированными пользователями
- Для полноценной админ-панели добавить поле `is_admin` в `profiles`
- Регулярно запускать `deactivate_expired_promo_codes()` через cron
- Мониторить таблицу `promo_code_usages` на предмет аномальной активности

## Интеграция с другими функциями

### События
- Поле `price` добавлено в таблицу `events`
- Финальная цена с учётом промокода сохраняется в `events.price`

### Платежи (будущее)
При интеграции платёжной системы:
- Использовать `promo_code_usages.final_price` для формирования платежа
- Отображать оригинальную цену и скидку в чеке
- Учитывать промокоды в финансовой отчётности

### Аналитика
- Статистика использования промокодов через VIEW `promo_code_stats`
- Анализ эффективности промокодов по категориям
- ROI промо-кампаний

## Известные ограничения

1. **Администрирование:** Для полноценной админ-панели нужно добавить систему ролей с полем `is_admin`
2. **Автоматическая деактивация:** Функция `deactivate_expired_promo_codes()` должна запускаться через cron (Supabase Edge Functions или внешний сервис)
3. **Оплата:** Система промокодов работает автономно, но для реальных платежей нужна интеграция с платёжным провайдером
4. **Уведомления:** Нет уведомлений о новых промокодах (можно добавить через email/push)

## Дальнейшее развитие

### Приоритет 1
- [ ] Добавить поле `is_admin` в `profiles` для системы ролей
- [ ] Настроить cron для автоматической деактивации промокодов
- [ ] Интегрировать PromoCodeManager в админ-панель

### Приоритет 2
- [ ] Email-рассылка промокодов подписчикам
- [ ] Персональные промокоды для пользователей
- [ ] Промокоды для реферальной программы (bonus rewards)

### Приоритет 3
- [ ] A/B тестирование промокодов
- [ ] Геолокационные промокоды (только для определённых городов)
- [ ] Промокоды для групповых покупок (скидка при регистрации N+ участников)

## Файлы

### Backend
- `database/migrations/add_promo_code_system.sql` - SQL миграция

### Frontend
- `frontend/src/components/PromoCodeInput.jsx` - компонент применения промокода
- `frontend/src/components/PromoCodeInput.css` - стили
- `frontend/src/components/PromoCodeManager.jsx` - админ-панель
- `frontend/src/components/PromoCodeManager.css` - стили
- `frontend/src/pages/CreateEvent.jsx` - интеграция в форму создания события

### Переводы
- `frontend/src/locales/ru/common.json` - русские переводы
- `frontend/src/locales/en/common.json` - английские переводы

### Документация
- `docs/features/PROMO_CODE_SYSTEM.md` - этот файл

## Авторы
- Claude AI (claude.com/code)
- Дата реализации: 2025-01-27

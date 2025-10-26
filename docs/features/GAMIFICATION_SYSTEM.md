# Система геймификации ObschiySbor

## Обзор

Система геймификации добавляет игровые элементы в платформу ObschiySbor для повышения вовлечённости пользователей. Включает систему баллов опыта, уровней, достижений и бейджей.

**Дата внедрения:** 26 октября 2025
**Статус:** ✅ Реализовано (требуется применение SQL миграции)

---

## Основные компоненты

### 1. Система опыта и уровней

#### Баллы опыта (Experience Points - XP)
- Универсальная валюта прогресса пользователя
- Начисляются за различные действия на платформе
- Накапливаются бесконечно (без максимума)
- Определяют текущий уровень пользователя

#### Уровни (Levels)
- **Диапазон:** 1-10 уровней (расширяемо до 100)
- **Прогрессия:** Каждый уровень требует больше опыта
- **Привилегии:** Каждый уровень открывает новые возможности
- **Визуальные элементы:** Уникальные иконки и цвета для каждого уровня

**Таблица уровней:**

| Уровень | Название (RU) | Название (EN) | Мин. опыт | Иконка | Цвет |
|---------|---------------|---------------|-----------|--------|------|
| 1 | Новичок | Newcomer | 0 | 🌱 | #95a5a6 |
| 2 | Начинающий | Beginner | 100 | 🌿 | #3498db |
| 3 | Участник | Participant | 250 | 🌾 | #2ecc71 |
| 4 | Активист | Activist | 500 | 🌳 | #27ae60 |
| 5 | Организатор | Organizer | 1,000 | ⭐ | #f39c12 |
| 6 | Эксперт | Expert | 2,000 | 💫 | #e67e22 |
| 7 | Мастер | Master | 4,000 | 🏆 | #e74c3c |
| 8 | Гуру | Guru | 7,000 | 👑 | #9b59b6 |
| 9 | Легенда | Legend | 12,000 | 💎 | #1abc9c |
| 10 | Титан | Titan | 20,000 | 🔥 | #c0392b |

#### Начисление баллов

**За действия пользователя:**
- **+50 XP** - Создание события
- **+20 XP** - Участие в событии (после подтверждения)
- **+10 XP** - Оставленный отзыв
- **+15 XP** - Получение положительного отзыва (4-5 звёзд) организатором
- **+[rewards] XP** - Разблокировка достижения (зависит от достижения)

**Автоматическое начисление:**
Баллы начисляются автоматически через database triggers:
- `trigger_event_created_gamification` - при создании события
- `trigger_event_participation_gamification` - при участии в событии
- `trigger_review_created_gamification` - при оставлении отзыва

---

### 2. Система достижений

#### Типы достижений

**По категориям:**
- **events** - Связанные с созданием и организацией событий
- **social** - Социальные взаимодействия и участие
- **milestones** - Вехи развития (уровни, количественные показатели)
- **special** - Специальные и уникальные достижения

**По редкости:**
- **common** (Обычное) - Базовые достижения, доступные всем
- **rare** (Редкое) - Требуют определённых усилий
- **epic** (Эпическое) - Сложные достижения
- **legendary** (Легендарное) - Очень редкие, престижные достижения

#### Примеры достижений

**События (Events):**
- 🎉 **Первое событие** - Создайте своё первое событие (+50 XP)
- 📅 **Организатор-10** - Создайте 10 событий (+100 XP)
- 🗓️ **Организатор-50** - Создайте 50 событий (+300 XP)
- 📆 **Организатор-100** - Создайте 100 событий (+500 XP)

**Социальные (Social):**
- 🎊 **Первое участие** - Присоединитесь к первому событию (+30 XP)
- 🦋 **Социальная бабочка-10** - Посетите 10 событий (+100 XP)
- 🦋 **Социальная бабочка-50** - Посетите 50 событий (+300 XP)
- ⭐ **Первый отзыв** - Оставьте свой первый отзыв (+20 XP)
- 📝 **Критик** - Оставьте 25 отзывов (+150 XP)

**Вехи (Milestones):**
- ⭐ **Уровень 5** - Достигните 5-го уровня (+50 XP)
- 🏆 **Уровень 10** - Достигните 10-го уровня (+100 XP)
- 💫 **Уровень 25** - Достигните 25-го уровня (+250 XP)

**Специальные (Special):**
- 🐦 **Ранняя пташка** - Зарегистрируйтесь в первые 1000 пользователей (+100 XP)
- 🌟 **Популярный организатор** - Соберите 100+ участников на одно событие (+200 XP)
- 💯 **Идеальный рейтинг** - Средний рейтинг 5.0 на 10+ событиях (+300 XP)

#### Секретные достижения
- Не отображаются в списке до разблокировки
- Поле `is_secret = TRUE` в таблице `achievements`
- После разблокировки становятся видимыми

---

## Структура базы данных

### Новые поля в таблице `profiles`

```sql
experience_points INTEGER DEFAULT 0,      -- Общий опыт
level INTEGER DEFAULT 1,                   -- Текущий уровень
total_events_created INTEGER DEFAULT 0,   -- Счётчик созданных событий
total_events_participated INTEGER DEFAULT 0, -- Счётчик посещённых событий
total_reviews_given INTEGER DEFAULT 0,    -- Счётчик отзывов
member_since TIMESTAMPTZ DEFAULT NOW()    -- Дата регистрации
```

### Новые таблицы

#### `levels` - Определения уровней
```sql
level INTEGER PRIMARY KEY,
name_ru VARCHAR(100),
name_en VARCHAR(100),
min_experience INTEGER,
icon VARCHAR(50),
color VARCHAR(20),
perks JSONB DEFAULT '[]'
```

#### `achievements` - Определения достижений
```sql
id BIGSERIAL PRIMARY KEY,
code VARCHAR(50) UNIQUE,              -- Уникальный код (first_event, social_butterfly)
name_ru VARCHAR(100),
name_en VARCHAR(100),
description_ru TEXT,
description_en TEXT,
icon VARCHAR(50),
color VARCHAR(20),
category VARCHAR(50),                 -- events, social, milestones, special
rarity VARCHAR(20) DEFAULT 'common',  -- common, rare, epic, legendary
points_reward INTEGER DEFAULT 0,
requirement JSONB,                    -- Условия получения
is_secret BOOLEAN DEFAULT FALSE,
is_active BOOLEAN DEFAULT TRUE
```

#### `user_achievements` - Прогресс пользователей
```sql
id BIGSERIAL PRIMARY KEY,
user_id UUID REFERENCES profiles(id),
achievement_id BIGINT REFERENCES achievements(id),
progress INTEGER DEFAULT 0,
target INTEGER,
unlocked_at TIMESTAMPTZ,
is_unlocked BOOLEAN DEFAULT FALSE,
UNIQUE(user_id, achievement_id)
```

#### `experience_log` - История опыта
```sql
id BIGSERIAL PRIMARY KEY,
user_id UUID REFERENCES profiles(id),
points INTEGER,
reason VARCHAR(100),                  -- event_created, review_given, etc.
reference_id BIGINT,                  -- ID связанного объекта
reference_type VARCHAR(50),           -- event, review, achievement
description TEXT,
created_at TIMESTAMPTZ DEFAULT NOW()
```

---

## Функции PostgreSQL

### `add_experience_points()`
Начисляет опыт пользователю и автоматически обновляет уровень.

**Параметры:**
- `p_user_id` - ID пользователя
- `p_points` - Количество баллов (может быть отрицательным)
- `p_reason` - Причина начисления
- `p_reference_id` - ID связанного объекта (опционально)
- `p_reference_type` - Тип объекта (опционально)
- `p_description` - Описание (опционально)

**Пример использования:**
```sql
-- Начислить 50 баллов за создание события
SELECT add_experience_points(
  '00000000-0000-0000-0000-000000000000',
  50,
  'event_created',
  123,
  'event',
  'Создание события: Настольные игры'
);
```

### `check_and_unlock_achievement()`
Проверяет и разблокирует достижение для пользователя.

**Параметры:**
- `p_user_id` - ID пользователя
- `p_achievement_code` - Код достижения

**Возвращает:** `BOOLEAN` - TRUE если достижение было разблокировано

**Пример использования:**
```sql
-- Разблокировать достижение "Первое событие"
SELECT check_and_unlock_achievement(
  '00000000-0000-0000-0000-000000000000',
  'first_event'
);
```

### `check_level_achievements()`
Автоматически проверяет достижения, связанные с уровнем.

Вызывается автоматически из `add_experience_points()` при повышении уровня.

---

## Frontend компоненты

### GamificationPanel
Главный компонент панели геймификации.

**Расположение:** `frontend/src/components/GamificationPanel.jsx`

**Отображает:**
- Текущий уровень и прогресс до следующего
- Статистику пользователя (события, участие, отзывы)
- Разблокированные достижения
- Историю получения опыта

**Использование:**
```jsx
import GamificationPanel from '../components/GamificationPanel';

<GamificationPanel userId={user.id} />
```

**Props:**
- `userId` (string, required) - ID пользователя

---

## Интеграция в приложение

### Profile.jsx
Панель геймификации добавлена как отдельная вкладка в профиле:

```jsx
{activeTab === 'progress' && (
  <GamificationPanel userId={user.id} />
)}
```

### Навигация
Новая вкладка "Ваш прогресс" (`gamification.title`) в профиле пользователя.

---

## Переводы (i18n)

Все тексты переведены на русский и английский языки.

**Ключи в `common.json`:**
```json
"gamification": {
  "title": "Ваш прогресс",
  "level": "Уровень",
  "experience": "Опыт",
  "achievements": "Достижения",
  "stats": "Статистика",
  "categories": { ... },
  "rarity": { ... },
  "reasons": { ... },
  "levels": { "1": "Новичок", ... }
}
```

---

## Установка и настройка

### 1. Применить SQL миграцию

Выполните файл миграции в Supabase SQL Editor:

```
database/migrations/add_gamification_system.sql
```

**Что включает миграция:**
- Добавление полей в таблицу `profiles`
- Создание таблиц `levels`, `achievements`, `user_achievements`, `experience_log`
- Создание функций `add_experience_points()`, `check_and_unlock_achievement()`, `check_level_achievements()`
- Создание триггеров для автоматического начисления баллов
- Добавление начальных данных (10 уровней, 17 достижений)
- Настройка RLS политик
- Создание индексов

### 2. Проверить миграцию

После применения миграции выполните проверки:

```sql
-- Проверить таблицы
SELECT * FROM levels ORDER BY level;
SELECT * FROM achievements WHERE is_active = TRUE;

-- Проверить индексы
SELECT * FROM pg_indexes WHERE tablename IN ('levels', 'achievements', 'user_achievements', 'experience_log');

-- Проверить RLS политики
SELECT * FROM pg_policies WHERE tablename IN ('levels', 'achievements', 'user_achievements', 'experience_log');
```

### 3. Тестирование

**Проверьте функциональность:**

1. **Создание события:**
   - Создайте новое событие
   - Проверьте начисление 50 XP
   - Проверьте разблокировку достижения "Первое событие"

2. **Участие в событии:**
   - Присоединитесь к событию
   - Проверьте начисление 20 XP
   - Проверьте счётчик `total_events_participated`

3. **Оставление отзыва:**
   - Оставьте отзыв о событии
   - Проверьте начисление 10 XP автору отзыва
   - Если отзыв 4-5 звёзд, проверьте начисление 15 XP организатору

4. **Панель геймификации:**
   - Откройте профиль
   - Перейдите на вкладку "Ваш прогресс"
   - Проверьте отображение уровня, опыта, статистики, достижений

---

## Расширение системы

### Добавление новых уровней

```sql
INSERT INTO levels (level, name_ru, name_en, min_experience, icon, color, perks) VALUES
(11, 'Новый уровень', 'New Level', 35000, '🌟', '#ff6b6b', '["Новая привилегия"]'::jsonb);
```

### Добавление новых достижений

```sql
INSERT INTO achievements (
  code, name_ru, name_en, description_ru, description_en,
  icon, color, category, rarity, points_reward, requirement
) VALUES (
  'achievement_code',
  'Название на русском',
  'Name in English',
  'Описание на русском',
  'Description in English',
  '🎯',
  '#3498db',
  'events',
  'rare',
  100,
  '{"type": "event_created", "count": 25}'::jsonb
);
```

### Ручная разблокировка достижения

```sql
-- Для конкретного пользователя
SELECT check_and_unlock_achievement(
  '00000000-0000-0000-0000-000000000000',
  'achievement_code'
);
```

### Ручное начисление баллов

```sql
-- Начислить 100 баллов пользователю
SELECT add_experience_points(
  '00000000-0000-0000-0000-000000000000',
  100,
  'manual_bonus',
  NULL,
  NULL,
  'Бонус от администрации'
);
```

---

## Будущие улучшения

### Планируемые функции

1. **Таблица лидеров (Leaderboard)**
   - Топ пользователей по уровню
   - Топ организаторов (по количеству событий)
   - Топ участников (по количеству посещённых событий)

2. **Сезонные достижения**
   - Ограниченные по времени достижения
   - Специальные награды за участие в сезонных мероприятиях

3. **Прогресс-бары для достижений**
   - Отображение текущего прогресса к незавершённым достижениям
   - Уведомления о близости к разблокировке

4. **Бейджи в профиле**
   - Отображение избранных достижений в публичном профиле
   - Возможность выбора 3-5 бейджей для показа

5. **Система квестов**
   - Ежедневные/еженедельные задания
   - Цепочки квестов с наградами

6. **Реферальная программа**
   - Баллы за приглашение друзей
   - Бонусы за активность приглашённых пользователей

---

## Метрики и аналитика

### Отслеживаемые показатели

**Для администраторов:**
- Среднее количество баллов на пользователя
- Распределение пользователей по уровням
- Самые популярные достижения
- Скорость прогрессии новых пользователей

**SQL запросы для аналитики:**

```sql
-- Распределение по уровням
SELECT level, COUNT(*) as users_count
FROM profiles
GROUP BY level
ORDER BY level;

-- Топ-10 пользователей по опыту
SELECT full_name, level, experience_points
FROM profiles
ORDER BY experience_points DESC
LIMIT 10;

-- Самые частые достижения
SELECT a.name_ru, COUNT(ua.id) as unlocked_count
FROM achievements a
LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.is_unlocked = TRUE
GROUP BY a.id, a.name_ru
ORDER BY unlocked_count DESC;

-- Статистика начисления опыта за последние 30 дней
SELECT reason, SUM(points) as total_points, COUNT(*) as count
FROM experience_log
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY reason
ORDER BY total_points DESC;
```

---

## Troubleshooting

### Проблема: Баллы не начисляются

**Решение:**
1. Проверьте, что триггеры созданы:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname LIKE '%gamification%';
   ```

2. Проверьте логи ошибок в Supabase Dashboard

3. Проверьте RLS политики для таблицы `experience_log`

### Проблема: Достижения не разблокируются

**Решение:**
1. Проверьте условия в поле `requirement` достижения
2. Проверьте счётчики в профиле (`total_events_created`, `total_events_participated`)
3. Вручную вызовите функцию разблокировки

### Проблема: Уровень не обновляется

**Решение:**
1. Проверьте таблицу `levels` - все ли уровни созданы
2. Проверьте функцию `add_experience_points()` - корректно ли вычисляется уровень
3. Вручную пересчитайте уровень:
   ```sql
   UPDATE profiles
   SET level = (
     SELECT COALESCE(MAX(level), 1)
     FROM levels
     WHERE min_experience <= profiles.experience_points
   )
   WHERE id = 'user_id';
   ```

---

## Контакты и поддержка

По вопросам работы системы геймификации обращайтесь к документации:
- SQL миграция: `database/migrations/add_gamification_system.sql`
- React компонент: `frontend/src/components/GamificationPanel.jsx`
- Переводы: `frontend/src/locales/{ru,en}/common.json` (секция `gamification`)

---

**Дата создания документа:** 26 октября 2025
**Автор:** Claude (Anthropic)
**Проект:** ObschiySbor - платформа для организации событий

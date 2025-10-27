# Система слияния аккаунтов (Account Merging System)

**Дата создания:** 2025-01-27
**Статус:** ✅ Реализовано

## Обзор

Система слияния аккаунтов позволяет пользователям объединять дублирующиеся аккаунты в один. Это полезно когда пользователь зарегистрировался несколько раз (например, через email и VK ID) и хочет объединить свои данные.

## Компоненты системы

### 1. База данных

#### Таблица: `account_merge_requests`

Хранит историю запросов на слияние аккаунтов.

```sql
CREATE TABLE account_merge_requests (
  id BIGSERIAL PRIMARY KEY,
  primary_user_id UUID NOT NULL,           -- Основной аккаунт (сохранится)
  secondary_user_id UUID NOT NULL,         -- Вторичный аккаунт (будет удалён)
  status VARCHAR(20) NOT NULL,             -- pending/completed/failed/cancelled
  merge_type VARCHAR(30) NOT NULL,         -- email_duplicate/manual_request/admin_initiated
  merged_data JSONB,                       -- Детали перенесённых данных
  error_message TEXT,                      -- Сообщение об ошибке (если failed)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

#### Функция: `find_potential_duplicate_accounts()`

Находит потенциальные дубликаты аккаунта пользователя.

**Критерии поиска:**
- **Одинаковый email** (similarity_score: 100)
- **Одинаковое имя** (similarity_score: 70)
- **Похожий email** (similarity_score: 50)
- **Одинаковый VK ID** (similarity_score: 100)

**Использование:**
```sql
SELECT * FROM find_potential_duplicate_accounts('user-uuid');
```

**Возвращает:**
```sql
duplicate_user_id   UUID
duplicate_email     VARCHAR(255)
duplicate_name      VARCHAR(100)
match_reason        TEXT
similarity_score    INTEGER
```

#### Функция: `merge_user_accounts()`

Выполняет слияние двух аккаунтов.

**Процесс слияния:**

1. **Проверка валидности:**
   - Разные аккаунты
   - Оба аккаунта существуют

2. **Перенос данных:**
   - ✅ Созданные события → `events.creator_id`
   - ✅ Участие в событиях → `event_participants.user_id` (избегая дубликатов)
   - ✅ Отзывы → `reviews.user_id` (избегая дубликатов)
   - ✅ Рефералы → `profiles.referred_by`
   - ✅ Достижения → `user_achievements.user_id` (избегая дубликатов)
   - ✅ Использования промокодов → `promo_code_usages.user_id`
   - ✅ Сообщения в чатах → `chat_messages.user_id`
   - ✅ Уведомления → `notifications.user_id`

3. **Суммирование XP:**
   ```sql
   total_xp = primary_xp + secondary_xp
   level = FLOOR(total_xp / 1000) + 1
   ```

4. **Удаление вторичного аккаунта:**
   ```sql
   DELETE FROM profiles WHERE id = secondary_user_id;
   ```

5. **Запись результата:**
   ```json
   {
     "events_transferred": 5,
     "participations_transferred": 12,
     "reviews_transferred": 3,
     "referrals_transferred": 2,
     "achievements_transferred": 8,
     "promo_usages_transferred": 1,
     "total_xp": 3500,
     "primary_xp": 2000,
     "secondary_xp": 1500
   }
   ```

**Использование:**
```sql
SELECT * FROM merge_user_accounts(
  'primary-user-id',
  'secondary-user-id',
  'manual_request'
);
```

**Возвращает:** JSONB с результатами слияния.

#### VIEW: `account_merge_stats`

Статистика запросов на слияние по месяцам.

```sql
SELECT * FROM account_merge_stats;
```

**Возвращает:**
```
month               TIMESTAMP
total_requests      BIGINT
completed           BIGINT
failed              BIGINT
pending             BIGINT
cancelled           BIGINT
avg_completion_hours NUMERIC
```

### 2. Frontend компоненты

#### `MergeAccountsPanel.jsx`

Главный компонент для управления слиянием аккаунтов.

**Основные функции:**

1. **Поиск дубликатов:**
   ```javascript
   const searchForDuplicates = async () => {
     const { data } = await supabase.rpc('find_potential_duplicate_accounts', {
       p_user_id: user.id
     });
     setDuplicates(data);
   };
   ```

2. **Отображение найденных дубликатов:**
   - Имя и email
   - Причина совпадения
   - Similarity score (в процентах)
   - Кнопка "Объединить"

3. **Модальное окно подтверждения:**
   - Предупреждение о необратимости
   - Визуальное сравнение аккаунтов
   - Список данных для переноса
   - Поле для ввода подтверждения (`MERGE`)

4. **История слияний:**
   - Статус (завершено/ошибка/в ожидании)
   - Дата и время
   - Статистика перенесённых данных

**Интеграция в Profile.jsx:**

```javascript
import MergeAccountsPanel from '../components/MergeAccountsPanel';

// В табах:
<button
  className={`tab-button ${activeTab === 'merge' ? 'active' : ''}`}
  onClick={() => setActiveTab('merge')}
>
  {t('accountMerge.tabTitle')}
</button>

// Рендер:
{activeTab === 'merge' && (
  <MergeAccountsPanel />
)}
```

## Безопасность

### RLS политики

1. **SELECT** - пользователи видят только свои запросы:
   ```sql
   USING (primary_user_id = auth.uid() OR secondary_user_id = auth.uid())
   ```

2. **INSERT** - пользователи могут создавать запросы только для себя:
   ```sql
   WITH CHECK (primary_user_id = auth.uid())
   ```

3. **UPDATE** - пользователи могут отменять свои запросы:
   ```sql
   USING (primary_user_id = auth.uid() OR secondary_user_id = auth.uid())
   WITH CHECK (status = 'cancelled')
   ```

### Защита от ошибок

- **Транзакция:** Весь процесс слияния выполняется в транзакции PostgreSQL
- **Rollback:** При любой ошибке все изменения откатываются
- **Логирование:** Ошибки записываются в `account_merge_requests.error_message`
- **Подтверждение:** Требуется ввести `MERGE` для подтверждения

## UI/UX

### Процесс слияния (User Flow)

1. Пользователь заходит в Profile → вкладка "Слияние"
2. Нажимает "Найти дубликаты"
3. Система показывает список потенциальных дубликатов с similarity score
4. Пользователь нажимает "Объединить" на нужном аккаунте
5. Открывается модальное окно с:
   - Предупреждением о необратимости
   - Сравнением аккаунтов
   - Списком данных для переноса
   - Полем подтверждения
6. Пользователь вводит `MERGE` и нажимает "Подтвердить слияние"
7. Система выполняет слияние (может занять несколько секунд)
8. Показывается сообщение об успехе
9. Данные обновляются автоматически

### Визуальные индикаторы

**Similarity badges:**
- 🟢 **90-100%** - Высокое совпадение (зелёный)
- 🟡 **70-89%** - Среднее совпадение (оранжевый)
- ⚪ **< 70%** - Низкое совпадение (серый)

**Статусы запросов:**
- ✅ **Completed** - Зелёный badge
- ❌ **Failed** - Красный badge
- ⏳ **Pending** - Оранжевый badge
- ⛔ **Cancelled** - Серый badge

## Переводы

Система поддерживает полную локализацию (русский и английский):

**Секция в translations:** `accountMerge`

**Ключевые переводы:**
- `accountMerge.title` - "Слияние аккаунтов"
- `accountMerge.description` - Описание функционала
- `accountMerge.warningMessage` - Предупреждение о необратимости
- `accountMerge.mergeItems.*` - Список данных для переноса
- `accountMerge.errors.*` - Сообщения об ошибках

## Примеры использования

### Сценарий 1: Пользователь зарегистрировался дважды

**Ситуация:**
- Пользователь зарегистрировался через email: `user@example.com`
- Позже зарегистрировался через VK ID с тем же email
- Теперь у него 2 аккаунта с разными данными

**Решение:**
1. Заходит в Profile → Слияние
2. Нажимает "Найти дубликаты"
3. Система находит второй аккаунт (similarity: 100%, причина: "Одинаковый email")
4. Пользователь объединяет аккаунты
5. Все события, участия, XP объединяются в один аккаунт

### Сценарий 2: Администратор инициирует слияние

**Ситуация:**
- Администратор получил запрос от пользователя
- Нужно объединить два аккаунта вручную

**Решение:**
```sql
-- Через SQL Editor в Supabase
SELECT * FROM merge_user_accounts(
  'primary-user-uuid',
  'secondary-user-uuid',
  'admin_initiated'
);
```

## Известные ограничения

1. **Необратимость:**
   - Слияние нельзя отменить
   - Вторичный аккаунт удаляется навсегда
   - Рекомендуется создавать backup БД перед первым использованием

2. **Аутентификация:**
   - После слияния пользователь НЕ может войти через вторичный аккаунт
   - Необходимо использовать учётные данные основного аккаунта

3. **Конфликты данных:**
   - Если в обоих аккаунтах есть участие в одном событии, сохраняется только из основного
   - Аналогично с отзывами и достижениями

4. **Производительность:**
   - Слияние больших аккаунтов (1000+ событий) может занять 10-15 секунд
   - Рекомендуется выполнять в off-peak часы для больших БД

## Тестирование

### Ручное тестирование

1. **Создать тестовые аккаунты:**
   ```
   Email 1: test1@example.com
   Email 2: test2@example.com (с похожим именем)
   ```

2. **Добавить данные в оба аккаунта:**
   - Создать события
   - Присоединиться к событиям
   - Оставить отзывы
   - Получить достижения

3. **Выполнить слияние через UI**

4. **Проверить результат:**
   - Все события присутствуют
   - Участия объединены
   - XP суммирован
   - Вторичный аккаунт удалён

### SQL тестирование

```sql
-- Поиск дубликатов
SELECT * FROM find_potential_duplicate_accounts('user-id');

-- Тестовое слияние
SELECT * FROM merge_user_accounts(
  'primary-id',
  'secondary-id',
  'manual_request'
);

-- Проверка результата
SELECT * FROM account_merge_requests WHERE primary_user_id = 'primary-id';

-- Статистика
SELECT * FROM account_merge_stats;
```

## Рекомендации

1. **Перед продакшеном:**
   - Создать full backup базы данных
   - Протестировать на staging environment
   - Подготовить инструкции для пользователей

2. **Для пользователей:**
   - Создать FAQ о слиянии аккаунтов
   - Добавить предупреждение о необратимости в несколько мест
   - Рассмотреть email-уведомление после слияния

3. **Мониторинг:**
   - Отслеживать `account_merge_stats` для выявления проблем
   - Проверять `failed` запросы и их `error_message`
   - Анализировать популярные причины дубликатов

## Связанные документы

- [VK ID Setup](VK_ID_SETUP.md) - Настройка VK авторизации (частая причина дубликатов)
- [GAMIFICATION_SYSTEM.md](GAMIFICATION_SYSTEM.md) - Система достижений и XP (переносятся при слиянии)
- [REFERRAL_PROGRAM.md](REFERRAL_PROGRAM.md) - Реферальная программа (рефералы переносятся)

## Changelog

**2025-01-27:** Первая версия системы слияния аккаунтов
- SQL миграция с таблицей, функциями и VIEW
- React компонент MergeAccountsPanel
- Интеграция в Profile.jsx
- Переводы на русский и английский
- Документация

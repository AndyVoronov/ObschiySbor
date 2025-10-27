# Устранение проблем при применении миграции Account Merging System

## Проблема: "Failed to fetch (api.supabase.com)"

### Возможные причины:
1. **Проблемы с интернет-соединением**
2. **Временная недоступность API Supabase**
3. **Слишком большой SQL файл** (превышает лимит Supabase Dashboard)
4. **Таймаут выполнения** (миграция выполняется слишком долго)

### Решения:

#### Вариант 1: Применить миграцию по частям

Используйте файл `add_account_merging_system_STEP_BY_STEP.sql` и выполняйте каждый шаг отдельно в Supabase SQL Editor:

1. **Шаг 1:** Создание таблицы `account_merge_requests`
2. **Шаг 2:** Комментарии и индексы
3. **Шаг 3:** RLS политики
4. **Шаг 4:** Функция `find_potential_duplicate_accounts()`
5. **Шаг 5:** Функция `merge_user_accounts()`
6. **Шаг 6:** VIEW `account_merge_stats`

**Как применить:**
```sql
-- В Supabase Dashboard → SQL Editor → New Query
-- Скопируйте код ТОЛЬКО ДЛЯ ШАГА 1
-- Нажмите "Run"
-- Дождитесь успешного выполнения
-- Повторите для остальных шагов
```

#### Вариант 2: Проверить подключение

1. Откройте Supabase Dashboard в браузере
2. Перейдите в SQL Editor
3. Выполните простой тестовый запрос:
   ```sql
   SELECT 1 as test;
   ```
4. Если работает - переходите к Варианту 1

#### Вариант 3: Использовать Supabase CLI

Если у вас установлен Supabase CLI:

```bash
# Войдите в проект
supabase login

# Примените миграцию
supabase db push --file database/migrations/add_account_merging_system.sql
```

#### Вариант 4: Подождать и повторить

Иногда это временная проблема с API Supabase:
- Подождите 5-10 минут
- Обновите страницу Supabase Dashboard
- Попробуйте снова

---

## Проблема: "column 'email' does not exist"

### Причина:
Функция пытается обратиться к несуществующему полю `profiles.email`

### Решение:
✅ **Уже исправлено!** Используйте обновлённую версию миграции:
- Email теперь берётся из `auth.users.email`
- Имя берётся из `profiles.full_name`

---

## Проблема: Таблица или колонка не существует

### Примеры ошибок:
- `relation "user_achievements" does not exist`
- `column "experience_points" does not exist`
- `relation "promo_code_usages" does not exist`

### Решение:
✅ **Уже учтено!** Функция `merge_user_accounts()` проверяет существование таблиц через `information_schema`:

```sql
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_achievements') THEN
  -- Работа с таблицей
END IF;
```

Если таблицы нет, она просто пропускается. **Слияние всё равно сработает** для основных данных:
- ✅ events
- ✅ event_participants
- ✅ reviews
- ✅ notifications
- ✅ profiles

---

## Проблема: RLS политики блокируют доступ

### Ошибка:
`new row violates row-level security policy`

### Решение:

1. **Временно отключите RLS** (для тестирования):
   ```sql
   ALTER TABLE account_merge_requests DISABLE ROW LEVEL SECURITY;
   ```

2. **Проверьте, что функция использует `SECURITY DEFINER`:**
   ```sql
   -- Функции должны иметь SECURITY DEFINER
   CREATE OR REPLACE FUNCTION merge_user_accounts(...)
   LANGUAGE plpgsql
   SECURITY DEFINER  -- <-- Это важно!
   ```

3. **После тестирования включите RLS обратно:**
   ```sql
   ALTER TABLE account_merge_requests ENABLE ROW LEVEL SECURITY;
   ```

---

## Проблема: Ошибка при удалении вторичного профиля

### Ошибка:
`update or delete on table "profiles" violates foreign key constraint`

### Причина:
Есть таблицы, ссылающиеся на `profiles.id`, которые не были обработаны

### Решение:

1. **Найдите все таблицы со ссылками на profiles:**
   ```sql
   SELECT
     tc.table_name,
     kcu.column_name
   FROM information_schema.table_constraints tc
   JOIN information_schema.key_column_usage kcu
     ON tc.constraint_name = kcu.constraint_name
   WHERE tc.constraint_type = 'FOREIGN KEY'
     AND kcu.table_schema = 'public'
     AND kcu.column_name IN (
       SELECT column_name
       FROM information_schema.constraint_column_usage
       WHERE table_name = 'profiles'
     );
   ```

2. **Добавьте обработку этих таблиц** в функцию `merge_user_accounts()`

---

## Тестирование после применения миграции

### 1. Проверка таблицы:
```sql
SELECT * FROM account_merge_requests LIMIT 1;
```

### 2. Проверка функции поиска дубликатов:
```sql
-- Замените UUID на реальный ID из вашей БД
SELECT * FROM find_potential_duplicate_accounts('ваш-user-id-uuid');
```

### 3. Проверка VIEW:
```sql
SELECT * FROM account_merge_stats;
```

### 4. Тестовое слияние (НЕ на продакшене!):
```sql
-- ВНИМАНИЕ: Эта операция необратима!
-- Используйте только на тестовой БД
SELECT * FROM merge_user_accounts(
  'primary-user-id',
  'secondary-user-id',
  'manual_request'
);
```

---

## Откат миграции (если нужно)

### Удаление всех объектов:
```sql
-- Удаляем VIEW
DROP VIEW IF EXISTS account_merge_stats;

-- Удаляем функции
DROP FUNCTION IF EXISTS merge_user_accounts(UUID, UUID, VARCHAR);
DROP FUNCTION IF EXISTS find_potential_duplicate_accounts(UUID);

-- Удаляем таблицу (ВНИМАНИЕ: все данные о слияниях будут потеряны!)
DROP TABLE IF EXISTS account_merge_requests CASCADE;
```

---

## Контакты для поддержки

Если проблема не решается:
1. Проверьте [документацию Supabase](https://supabase.com/docs)
2. Посмотрите [ACCOUNT_MERGING_SYSTEM.md](../../docs/features/ACCOUNT_MERGING_SYSTEM.md)
3. Создайте issue в репозитории проекта

---

## Чек-лист успешного применения

- [ ] Таблица `account_merge_requests` создана
- [ ] Индексы созданы (3 штуки)
- [ ] RLS политики применены (3 штуки)
- [ ] Функция `find_potential_duplicate_accounts()` создана
- [ ] Функция `merge_user_accounts()` создана
- [ ] VIEW `account_merge_stats` создан
- [ ] Тестовый запрос функции поиска дубликатов выполнен успешно
- [ ] Создан backup базы данных перед первым использованием на продакшене

✅ **Готово!** Система слияния аккаунтов работает корректно.

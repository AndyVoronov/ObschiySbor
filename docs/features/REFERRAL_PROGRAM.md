# Реферальная программа ObschiySbor

## Обзор

Реферальная программа позволяет пользователям приглашать друзей и получать бонусы за их активность на платформе.

**Дата внедрения:** 26 октября 2025
**Статус:** ✅ Реализовано (требуется применение SQL миграции)

---

## Основные функции

### 1. Реферальные коды
- Каждый пользователь получает уникальный 8-символьный код при регистрации
- Код можно поделиться через ссылку или скопировать напрямую
- Поддержка репоста в Telegram, VK, WhatsApp

### 2. Система наград

**За регистрацию:**
- Реферер: +30 XP
- Приглашённый: +20 XP

**За первое событие друга:**
- Реферер: +50 XP
- Приглашённый: +30 XP

**За 5 событий друга:**
- Реферер: +100 XP
- Приглашённый: +50 XP

**За первое участие друга:**
- Реферер: +25 XP
- Приглашённый: +15 XP

### 3. Достижения за рефералов
- 👥 **Первый друг** (1 реферал) - +25 XP
- 🌟 **Лидер мнений** (5 рефералов) - +75 XP
- 💫 **Влиятельная персона** (10 рефералов) - +150 XP
- 👑 **Амбассадор** (25 рефералов) - +300 XP
- 💎 **Легенда сообщества** (50 рефералов) - +500 XP

---

## Структура базы данных

### Новые поля в `profiles`
```sql
referral_code VARCHAR(20) UNIQUE    -- Уникальный реферальный код
referred_by UUID                     -- ID пригласившего
total_referrals INTEGER DEFAULT 0   -- Счётчик рефералов
referral_bonus_earned INTEGER DEFAULT 0  -- Заработанные бонусы
```

### Таблица `referrals`
Отслеживает все реферальные связи с статусами:
- `pending` - зарегистрировался
- `active` - прошёл активацию (получены первые бонусы)
- `completed` - выполнил все условия

### Таблица `referral_rewards`
Настройки вознаграждений с условиями получения.

---

## Frontend компоненты

### ReferralPanel
Панель в профиле пользователя:
- Реферальный код с кнопками копирования
- Статистика (всего приглашено, активных, заработано)
- Как это работает (3 шага)
- Таблица наград
- Список приглашённых пользователей

### ReferralCodeInput
Компонент для страницы регистрации:
- Автоматически читает параметр ?ref= из URL
- Раскрывающееся поле ввода кода
- Подсказка при вводе кода

---

## Интеграция

### Profile.jsx
Добавлена вкладка "Реферальная программа":
```jsx
{activeTab === 'referral' && (
  <ReferralPanel userId={user.id} />
)}
```

### Register.jsx
Добавлен компонент для ввода кода:
```jsx
<ReferralCodeInput onCodeChange={setReferralCode} />
```

При успешной регистрации код применяется автоматически:
```javascript
await supabase.rpc('apply_referral_code', {
  p_user_id: data.user.id,
  p_referral_code: referralCode,
});
```

---

## Установка

### 1. Применить SQL миграцию
```
database/migrations/add_referral_program.sql
```

**Что включает:**
- Расширение таблицы `profiles`
- 3 новые таблицы
- 3 PostgreSQL функции
- 3 триггера для автоматических наград
- 4 стандартные награды
- 5 достижений за рефералов
- RLS политики и индексы

### 2. Проверить миграцию
```sql
-- Проверить функции
SELECT routine_name FROM information_schema.routines
WHERE routine_name IN ('generate_referral_code', 'apply_referral_code', 'check_referral_rewards');

-- Проверить награды
SELECT * FROM referral_rewards WHERE is_active = TRUE;

-- Проверить достижения
SELECT * FROM achievements WHERE category = 'social' AND code LIKE 'referral%';
```

---

## Использование

### Пригласить друга

1. Откройте профиль → вкладка "Реферальная программа"
2. Скопируйте код или ссылку
3. Поделитесь с другом через Telegram/VK/WhatsApp
4. Друг регистрируется по ссылке или вводит код вручную
5. Вы оба получаете бонусы!

### Использовать реферальный код

1. При регистрации нажмите "+ Есть реферальный код?"
2. Введите 8-символьный код
3. Завершите регистрацию
4. Получите приветственный бонус +20 XP

---

## PostgreSQL функции

### `generate_referral_code()`
Генерирует уникальный 8-символьный код.

### `apply_referral_code(p_user_id, p_referral_code)`
Применяет реферальный код при регистрации:
- Проверяет валидность кода
- Создаёт связь в `referrals`
- Начисляет приветственные бонусы
- Обновляет счётчики

### `check_referral_rewards(p_referred_id, p_condition_type)`
Проверяет и начисляет награды при выполнении условий:
- `first_event` - создание первого события
- `events_count` - достижение количества событий
- `first_participation` - первое участие

---

## Триггеры

### `on_profile_created_generate_referral_code()`
Автоматически генерирует код при создании профиля.

### `on_event_created_check_referral()`
Проверяет реферальные награды при создании события.

### `on_participation_check_referral()`
Проверяет реферальные награды при участии в событии.

---

## API

### Применить реферальный код
```javascript
const { error } = await supabase.rpc('apply_referral_code', {
  p_user_id: userId,
  p_referral_code: 'ABC12345',
});
```

### Получить статистику рефералов
```javascript
const { data } = await supabase
  .from('referrals')
  .select('*, referred:profiles!referrals_referred_id_fkey(*)')
  .eq('referrer_id', userId);
```

### Получить настройки наград
```javascript
const { data } = await supabase
  .from('referral_rewards')
  .select('*')
  .eq('is_active', true);
```

---

## Расширение системы

### Добавить новую награду
```sql
INSERT INTO referral_rewards (
  code, name_ru, name_en, description_ru, description_en,
  condition_type, condition_value, referrer_reward, referred_reward
) VALUES (
  'premium_user',
  'Премиум пользователь',
  'Premium User',
  'Награда когда приглашённый покупает премиум',
  'Reward when referred user buys premium',
  'subscription',
  NULL,
  200,
  100
);
```

### Добавить новое достижение
```sql
INSERT INTO achievements (
  code, name_ru, name_en, description_ru, description_en,
  icon, color, category, rarity, points_reward, requirement
) VALUES (
  'referral_master_100',
  'Мегаамбассадор',
  'Mega Ambassador',
  'Пригласите 100 друзей',
  'Invite 100 friends',
  '🌟',
  '#c0392b',
  'social',
  'legendary',
  1000,
  '{"type": "referrals", "count": 100}'::jsonb
);
```

---

## Метрики

### Топ рефереров
```sql
SELECT
  p.full_name,
  p.referral_code,
  p.total_referrals,
  p.referral_bonus_earned
FROM profiles p
WHERE p.total_referrals > 0
ORDER BY p.total_referrals DESC, p.referral_bonus_earned DESC
LIMIT 10;
```

### Конверсия рефералов
```sql
SELECT
  status,
  COUNT(*) as count,
  ROUND(COUNT(*)::NUMERIC / (SELECT COUNT(*) FROM referrals) * 100, 2) as percentage
FROM referrals
GROUP BY status;
```

### Активность приглашённых
```sql
SELECT
  r.referrer_id,
  COUNT(e.id) as events_created_by_referred
FROM referrals r
JOIN events e ON e.creator_id = r.referred_id
WHERE r.status IN ('active', 'completed')
GROUP BY r.referrer_id
ORDER BY events_created_by_referred DESC;
```

---

## Troubleshooting

### Проблема: Код не применяется
**Решение:**
1. Проверьте, что функция `apply_referral_code` существует
2. Проверьте RLS политики для таблицы `referrals`
3. Убедитесь, что код корректный (8 символов, верхний регистр)

### Проблема: Бонусы не начисляются
**Решение:**
1. Проверьте триггеры:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname LIKE '%referral%';
   ```
2. Проверьте таблицу `referral_rewards` - награды должны быть активны
3. Проверьте статус реферала в таблице `referrals`

### Проблема: Достижения не разблокируются
**Решение:**
1. Проверьте счётчик `total_referrals` в профиле
2. Проверьте таблицу `achievements` - достижения должны быть активны
3. Вручную проверьте разблокировку:
   ```sql
   SELECT check_and_unlock_achievement(user_id, 'first_referral');
   ```

---

## Будущие улучшения

1. **Персонализированные коды** - возможность выбрать свой код (при наличии)
2. **Реферальные кампании** - временные бонусы с увеличенными наградами
3. **Многоуровневые рефералы** - награды за рефералов рефералов
4. **Реферальный лидерборд** - публичный рейтинг лучших рефереров
5. **Email уведомления** - о новых рефералах и полученных наградах
6. **Специальные награды** - за приглашение активных пользователей

---

## Файлы

- SQL: `database/migrations/add_referral_program.sql`
- Компоненты:
  - `frontend/src/components/ReferralPanel.jsx`
  - `frontend/src/components/ReferralPanel.css`
  - `frontend/src/components/ReferralCodeInput.jsx`
  - `frontend/src/components/ReferralCodeInput.css`
- Интеграция:
  - `frontend/src/pages/Profile.jsx`
  - `frontend/src/pages/Register.jsx`
- Переводы: `frontend/src/locales/{ru,en}/common.json` (секция `referral`)

---

**Дата создания:** 26 октября 2025
**Автор:** Claude (Anthropic)
**Проект:** ObschiySbor - платформа для организации событий

# Настройка Telegram Login для ObschiySbor

## Обзор

Telegram Login Widget позволяет пользователям входить в приложение используя свой Telegram аккаунт. Для работы виджета нужно настроить Telegram бота через BotFather.

## Предварительные требования

- Telegram аккаунт
- Существующий бот `@ObschiySbor_bot` (уже создан)

## Шаги настройки

### 1. Настройка бота через BotFather

1. Откройте Telegram и найдите бота [@BotFather](https://t.me/BotFather)

2. Отправьте команду `/setdomain`

3. Выберите вашего бота `@ObschiySbor_bot`

4. Укажите домен приложения:
   - **Production**: `obschiy-sbor.vercel.app`
   - **Development**: `localhost` (для локальной разработки)

   *Примечание: Для production используйте только домен без протокола (без `https://`)*

5. BotFather подтвердит настройку домена

### 2. Применение миграции базы данных

Выполните SQL миграцию в Supabase Dashboard → SQL Editor:

```sql
-- Из файла database/migration_telegram.sql

-- Добавляем колонку telegram_id (уникальный ID пользователя в Telegram)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS telegram_id BIGINT UNIQUE;

-- Добавляем колонку telegram_username (username пользователя в Telegram)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS telegram_username TEXT;

-- Добавляем колонку telegram_password (сохранённый пароль для автоматического входа)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS telegram_password TEXT;

-- Комментарии к полям
COMMENT ON COLUMN profiles.telegram_id IS 'Уникальный ID пользователя в Telegram';
COMMENT ON COLUMN profiles.telegram_username IS 'Username пользователя в Telegram (@username)';
COMMENT ON COLUMN profiles.telegram_password IS 'Сохранённый пароль для Telegram пользователей (для автоматического входа)';

-- Создаём индекс для быстрого поиска по telegram_id
CREATE INDEX IF NOT EXISTS idx_profiles_telegram_id ON profiles(telegram_id);
```

### 3. Проверка настроек

1. Откройте приложение на странице входа (`/login`)
2. Должна появиться кнопка "Log in with Telegram"
3. При клике на кнопку откроется окно Telegram для авторизации
4. После подтверждения пользователь будет автоматически создан и авторизован

## Как это работает

### Первый вход (регистрация)

1. Пользователь нажимает кнопку "Log in with Telegram"
2. Telegram Widget запрашивает авторизацию
3. После подтверждения возвращаются данные:
   - `id` - уникальный Telegram ID
   - `first_name` - имя пользователя
   - `last_name` - фамилия (опционально)
   - `username` - username в Telegram (опционально)
   - `photo_url` - аватар пользователя (опционально)
4. Создаётся новый аккаунт Supabase:
   - Email: `tg{telegram_id}@obschiysbor.local`
   - Пароль: случайная строка (сохраняется в `telegram_password`)
5. Обновляется профиль с Telegram данными
6. Пользователь автоматически входит в систему

### Повторный вход

1. Пользователь нажимает кнопку "Log in with Telegram"
2. Система находит существующий профиль по `telegram_id`
3. Извлекается сохранённый пароль из `telegram_password`
4. Выполняется вход через `supabase.auth.signInWithPassword()`
5. Пользователь автоматически входит в систему

## Безопасность

- **Проверка подлинности**: Telegram Widget автоматически проверяет подлинность данных с помощью хэша
- **HTTPS обязателен**: На production используйте только HTTPS
- **Пароли**: Случайные пароли генерируются и хранятся в базе только для повторных входов
- **Email**: Используются виртуальные email адреса `tg{id}@obschiysbor.local`

## Компоненты

### TelegramLoginButton.jsx

Компонент React для отображения Telegram Login Widget:

```jsx
<TelegramLoginButton
  botUsername="ObschiySbor_bot"
  onAuth={handleTelegramAuth}
  buttonSize="large"
  cornerRadius={10}
/>
```

**Props:**
- `botUsername` (required) - username бота без @
- `onAuth` (required) - callback функция для обработки авторизации
- `buttonSize` - размер кнопки: "small", "medium", "large" (default: "large")
- `cornerRadius` - радиус скругления углов (default: 10)

### Обработчик авторизации

Функция `handleTelegramAuth` в Login.jsx и Register.jsx:
- Проверяет существование пользователя по `telegram_id`
- Создаёт новый аккаунт или выполняет вход для существующего
- Сохраняет/извлекает пароль для повторных входов

## Ограничения

- **Домен**: Должен быть настроен через BotFather
- **HTTPS**: На production обязателен HTTPS
- **Один бот**: Один бот может быть привязан только к одному домену
- **Callback**: Widget использует глобальную функцию `window.onTelegramAuth`

## Тестирование

### Локальная разработка

1. Настройте домен `localhost` через BotFather
2. Запустите dev сервер: `npm run dev`
3. Откройте `http://localhost:5173/login`
4. Нажмите на кнопку Telegram Login
5. Авторизуйтесь через Telegram

### Production

1. Настройте домен `obschiy-sbor.vercel.app` через BotFather
2. Деплой приложения на Vercel
3. Откройте `https://obschiy-sbor.vercel.app/login`
4. Протестируйте вход через Telegram

## Troubleshooting

### Кнопка не появляется

- Проверьте, что скрипт `telegram-widget.js` загружается
- Откройте DevTools → Console для ошибок
- Убедитесь что `botUsername` указан правильно

### "Bot domain invalid"

- Проверьте настройки домена через BotFather (`/setdomain`)
- Убедитесь что домен указан без протокола
- На localhost может потребоваться перезапуск бота

### Callback не вызывается

- Проверьте что `window.onTelegramAuth` определена
- Откройте DevTools → Network для проверки запросов
- Проверьте консоль на ошибки JavaScript

### "User already registered"

- Проверьте что миграция `migration_telegram.sql` применена
- Убедитесь что поле `telegram_password` существует в profiles
- Проверьте логи в консоли браузера

## Дополнительные ресурсы

- [Telegram Login Widget Documentation](https://core.telegram.org/widgets/login)
- [BotFather Commands](https://core.telegram.org/bots#6-botfather)
- [Telegram Bot API](https://core.telegram.org/bots/api)

## См. также

- [VK_ID_SETUP.md](VK_ID_SETUP.md) - Настройка VK ID авторизации
- [DATABASE_UPDATE_CHATS_DASHBOARD.md](DATABASE_UPDATE_CHATS_DASHBOARD.md) - Обновления базы данных

-- Добавление полей для Telegram авторизации в таблицу profiles
-- Это позволяет пользователям входить через Telegram Login Widget

-- Добавляем колонку telegram_id (уникальный ID пользователя в Telegram)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS telegram_id BIGINT UNIQUE;

-- Добавляем колонку telegram_username (username пользователя в Telegram, может отсутствовать)
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

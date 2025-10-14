-- Добавление поля vk_password в таблицу profiles для хранения пароля VK пользователей
-- Это позволяет VK пользователям входить повторно без необходимости создания новой Edge Function

-- Добавляем колонку vk_password (nullable, т.к. не у всех пользователей есть VK)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS vk_password TEXT;

-- Комментарий к полю
COMMENT ON COLUMN profiles.vk_password IS 'Сохранённый пароль для VK пользователей (для автоматического входа)';

-- Миграция для добавления поля vk_id в таблицу profiles
-- Дата: 2025-10-06
-- Описание: Добавляем поле для хранения VK ID пользователя для VK ID авторизации

-- Добавляем колонку vk_id в таблицу profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS vk_id BIGINT UNIQUE;

-- Создаём индекс для быстрого поиска по vk_id
CREATE INDEX IF NOT EXISTS idx_profiles_vk_id ON profiles(vk_id);

-- Добавляем комментарий к полю
COMMENT ON COLUMN profiles.vk_id IS 'VK ID пользователя для авторизации через ВКонтакте';

-- Проверяем результат
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'vk_id';

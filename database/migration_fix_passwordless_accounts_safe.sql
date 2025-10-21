-- Миграция (БЕЗОПАСНАЯ): Исправление VK/Telegram аккаунтов без паролей
-- Дата: 2025-10-21
-- Описание: Генерирует и сохраняет пароли для VK/Telegram пользователей у которых пароль отсутствует
--           ВНИМАНИЕ: Эта миграция НЕ может обновить пароль в auth.users без прямого доступа
--           Поэтому безопаснее использовать migration_cleanup_passwordless_accounts.sql

-- ============================================
-- РЕКОМЕНДАЦИЯ
-- ============================================
-- Используйте migration_cleanup_passwordless_accounts.sql вместо этой миграции
-- Она удалит старые аккаунты, и пользователи смогут создать новые с корректными паролями

-- ============================================
-- 1. Анализ проблемы
-- ============================================

-- Находим VK аккаунты без паролей
SELECT
  id,
  full_name,
  vk_id,
  email,
  created_at
FROM profiles
WHERE vk_id IS NOT NULL
  AND vk_password IS NULL;

-- Находим Telegram аккаунты без паролей
SELECT
  id,
  full_name,
  telegram_id,
  created_at
FROM profiles
WHERE telegram_id IS NOT NULL
  AND telegram_password IS NULL;

-- ============================================
-- 2. Попытка генерации паролей (НЕ РАБОТАЕТ)
-- ============================================

-- ПРИМЕЧАНИЕ: Следующие запросы НЕ РЕШАТ проблему полностью,
-- так как пароль в auth.users останется неизвестным!

-- Генерируем случайные пароли для VK аккаунтов
-- UPDATE profiles
-- SET vk_password = md5(random()::text || clock_timestamp()::text)
-- WHERE vk_id IS NOT NULL
--   AND vk_password IS NULL;

-- Генерируем случайные пароли для Telegram аккаунтов
-- UPDATE profiles
-- SET telegram_password = md5(random()::text || clock_timestamp()::text)
-- WHERE telegram_id IS NOT NULL
--   AND telegram_password IS NULL;

-- ============================================
-- ВЫВОД
-- ============================================
-- Безопаснее и надёжнее использовать:
-- migration_cleanup_passwordless_accounts.sql
--
-- Это удалит проблемные аккаунты и позволит пользователям
-- создать новые аккаунты с корректными паролями при следующем входе

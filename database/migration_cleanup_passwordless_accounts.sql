-- Миграция: Очистка старых VK/Telegram аккаунтов без сохранённых паролей
-- Дата: 2025-10-21
-- Описание: Удаляет записи profiles для VK/Telegram пользователей, у которых отсутствует сохранённый пароль
--           Это позволит пользователям пересоздать аккаунты с корректными паролями при следующем входе

-- ============================================
-- 1. Очистка VK аккаунтов без паролей
-- ============================================

-- Сначала посмотрим сколько таких записей
SELECT
  id,
  full_name,
  vk_id,
  created_at,
  'VK account without password' as issue_type
FROM profiles
WHERE vk_id IS NOT NULL
  AND vk_password IS NULL;

-- Удаляем записи profiles для VK пользователей без паролей
-- Это также удалит связанные записи из auth.users благодаря CASCADE
DELETE FROM profiles
WHERE vk_id IS NOT NULL
  AND vk_password IS NULL;

-- ============================================
-- 2. Очистка Telegram аккаунтов без паролей
-- ============================================

-- Сначала посмотрим сколько таких записей
SELECT
  id,
  full_name,
  telegram_id,
  created_at,
  'Telegram account without password' as issue_type
FROM profiles
WHERE telegram_id IS NOT NULL
  AND telegram_password IS NULL;

-- Удаляем записи profiles для Telegram пользователей без паролей
DELETE FROM profiles
WHERE telegram_id IS NOT NULL
  AND telegram_password IS NULL;

-- ============================================
-- 3. Проверка результатов
-- ============================================

-- Проверяем что не осталось аккаунтов без паролей
SELECT
  COUNT(*) as total_vk_accounts,
  COUNT(CASE WHEN vk_password IS NULL THEN 1 END) as vk_without_password,
  COUNT(CASE WHEN vk_password IS NOT NULL THEN 1 END) as vk_with_password
FROM profiles
WHERE vk_id IS NOT NULL;

SELECT
  COUNT(*) as total_telegram_accounts,
  COUNT(CASE WHEN telegram_password IS NULL THEN 1 END) as telegram_without_password,
  COUNT(CASE WHEN telegram_password IS NOT NULL THEN 1 END) as telegram_with_password
FROM profiles
WHERE telegram_id IS NOT NULL;

-- ============================================
-- ПРИМЕЧАНИЯ
-- ============================================
-- После применения этой миграции:
-- 1. Пользователи с удалёнными аккаунтами смогут войти заново через VK/Telegram
-- 2. При входе будет создан новый аккаунт с корректным паролем
-- 3. История событий и другие данные НЕ будут восстановлены
-- 4. Если нужно сохранить данные пользователя, НЕ применяйте эту миграцию
--    и обратитесь к администратору для ручного восстановления

-- ============================================
-- ОТКАТ (если нужно отменить изменения)
-- ============================================
-- ВАЖНО: Откат невозможен, так как данные будут удалены
-- Создайте резервную копию перед применением миграции!

-- Для создания резервной копии выполните перед миграцией:
-- CREATE TABLE profiles_backup_20251021 AS
-- SELECT * FROM profiles
-- WHERE (vk_id IS NOT NULL AND vk_password IS NULL)
--    OR (telegram_id IS NOT NULL AND telegram_password IS NULL);

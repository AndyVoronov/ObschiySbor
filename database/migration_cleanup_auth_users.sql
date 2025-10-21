-- Миграция: Удаление записей из auth.users для удалённых VK/Telegram аккаунтов
-- Дата: 2025-10-21
-- Описание: Удаляет записи из auth.users для пользователей с email vk*@obschiysbor.local и tg*@obschiysbor.local
--           которые не имеют соответствующих записей в profiles

-- ============================================
-- 1. Проверка "осиротевших" auth.users записей
-- ============================================

-- Находим записи в auth.users которые не имеют соответствующих profiles
SELECT
  au.id,
  au.email,
  au.created_at,
  'Orphaned auth.users record' as issue_type
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
  AND (au.email LIKE 'vk%@obschiysbor.local' OR au.email LIKE 'tg%@obschiysbor.local');

-- ============================================
-- 2. Удаление конкретного пользователя VK 77410860
-- ============================================

-- Удаляем конкретного пользователя
DELETE FROM auth.users
WHERE email = 'vk77410860@obschiysbor.local';

-- ============================================
-- 3. Удаление всех "осиротевших" VK/Telegram записей
-- ============================================

-- Удаляем все записи auth.users которые не имеют profiles
DELETE FROM auth.users
WHERE id IN (
  SELECT au.id
  FROM auth.users au
  LEFT JOIN profiles p ON au.id = p.id
  WHERE p.id IS NULL
    AND (au.email LIKE 'vk%@obschiysbor.local' OR au.email LIKE 'tg%@obschiysbor.local')
);

-- ============================================
-- 4. Проверка результатов
-- ============================================

-- Проверяем что не осталось "осиротевших" записей
SELECT
  COUNT(*) as orphaned_auth_users
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
  AND (au.email LIKE 'vk%@obschiysbor.local' OR au.email LIKE 'tg%@obschiysbor.local');

-- Должно вернуть 0

-- ============================================
-- ПРИМЕЧАНИЯ
-- ============================================
-- После применения этой миграции:
-- 1. Пользователи смогут войти заново через VK/Telegram
-- 2. Будут созданы новые аккаунты с нуля
-- 3. Email vk77410860@obschiysbor.local будет освобождён

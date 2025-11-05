-- ==========================================
-- Тест 5: Проверка целостности данных
-- ==========================================

-- 1. Поиск пользователей без профилей
SELECT
  au.id,
  au.email,
  au.created_at,
  CASE WHEN p.id IS NULL THEN '❌ НЕТ ПРОФИЛЯ' ELSE '✅ ЕСТЬ ПРОФИЛЬ' END as status,
  p.role,
  p.full_name
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
ORDER BY au.created_at DESC;

-- 2. Подсчёт пользователей без профилей
SELECT COUNT(*) as users_without_profiles
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- 3. Проверка профилей без роли
SELECT COUNT(*) as profiles_without_role
FROM profiles
WHERE role IS NULL OR role = '';

-- 4. Проверка конкретного пользователя acd70956-59ff-45d7-ba63-96688c84aa40
SELECT id, full_name, role, created_at
FROM profiles
WHERE id = 'acd70956-59ff-45d7-ba63-96688c84aa40';

-- 5. Проверка всех ролей в системе
SELECT role, COUNT(*) as count
FROM profiles
GROUP BY role
ORDER BY count DESC;

-- 6. Проверка триггера
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 7. Проверка кода функции
SELECT pg_get_functiondef('public.handle_new_user'::regproc);

-- 8. Проверка RLS политик для profiles
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd;

-- 9. Проверка FK constraint для event_participants
SELECT conname, contype, confrelid::regclass
FROM pg_constraint
WHERE conrelid = 'event_participants'::regclass
  AND conname = 'event_participants_user_id_fkey';
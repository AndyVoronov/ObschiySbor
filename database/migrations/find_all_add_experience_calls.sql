-- =============================================
-- ПОИСК ВСЕХ ВЫЗОВОВ add_experience_points
-- Применить через Supabase SQL Editor
-- =============================================

-- 1. Найти все функции которые вызывают add_experience_points
SELECT
  r.routine_name,
  r.routine_type,
  substring(r.routine_definition from 1 for 200) as definition_preview
FROM information_schema.routines r
WHERE r.routine_schema = 'public'
  AND r.routine_definition ILIKE '%add_experience_points%'
ORDER BY r.routine_name;

-- 2. Найти все триггеры
SELECT
  t.trigger_name,
  t.event_object_table,
  t.action_statement,
  t.action_timing,
  t.event_manipulation
FROM information_schema.triggers t
WHERE t.trigger_schema = 'public'
ORDER BY t.trigger_name;

-- 3. Проверить есть ли функция add_experience_points
SELECT
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type,
  p.oid
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'add_experience_points';

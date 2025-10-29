-- =============================================
-- ПОИСК ВСЕХ ТРИГГЕРОВ И ФУНКЦИЙ
-- Применить через Supabase SQL Editor
-- =============================================

-- 1. Найти все триггеры на таблице events
SELECT
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing,
  event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'events'
  AND trigger_schema = 'public'
ORDER BY trigger_name;

-- 2. Найти все функции которые содержат add_experience_points
SELECT
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_definition LIKE '%add_experience_points%'
  AND routine_schema = 'public'
ORDER BY routine_name;

-- 3. Проверить существующую функцию add_experience_points
SELECT
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'add_experience_points';

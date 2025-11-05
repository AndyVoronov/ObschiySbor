-- Check trigger status and debug information

-- Check if trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Check if function exists
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'handle_new_user';

-- Check recent auth users
SELECT 
  id,
  email,
  created_at,
  raw_user_meta_data
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- Check recent profiles
SELECT 
  id,
  full_name,
  role,
  created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 5;

-- Check for users without profiles
SELECT 
  au.id,
  au.email,
  au.created_at as user_created_at,
  p.id as profile_id,
  p.created_at as profile_created_at
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
ORDER BY au.created_at DESC;
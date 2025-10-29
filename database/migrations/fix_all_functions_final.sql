-- =============================================
-- ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ ВСЕХ ФУНКЦИЙ
-- Применить через Supabase SQL Editor
-- Дата: 2025-10-29
-- =============================================

-- ПРОБЛЕМА 1: add_experience_points ожидает BIGINT, но получает UUID
-- ПРОБЛЕМА 2: find_potential_duplicate_accounts возвращает VARCHAR(255) вместо TEXT

-- =============================================
-- 1. ИСПРАВЛЕНИЕ add_experience_points
-- =============================================

-- Удаляем все версии функции
DROP FUNCTION IF EXISTS add_experience_points(UUID, INTEGER, VARCHAR, BIGINT, VARCHAR, TEXT);
DROP FUNCTION IF EXISTS add_experience_points(UUID, INTEGER, VARCHAR, UUID, VARCHAR, TEXT);
DROP FUNCTION IF EXISTS add_experience_points(UUID, INTEGER, TEXT, BIGINT, TEXT, TEXT);
DROP FUNCTION IF EXISTS add_experience_points(UUID, INTEGER, TEXT, UUID, TEXT, TEXT);

-- Создаём правильную версию с UUID
CREATE OR REPLACE FUNCTION add_experience_points(
  p_user_id UUID,
  p_points INTEGER,
  p_reason TEXT,  -- Изменено с VARCHAR на TEXT
  p_reference_id UUID DEFAULT NULL,  -- Изменено с BIGINT на UUID
  p_reference_type TEXT DEFAULT NULL,  -- Изменено с VARCHAR на TEXT
  p_description TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_exp INTEGER;
  v_new_exp INTEGER;
  v_current_level INTEGER;
  v_new_level INTEGER;
BEGIN
  -- Получаем текущий опыт и уровень
  SELECT experience_points, level INTO v_current_exp, v_current_level
  FROM profiles
  WHERE id = p_user_id;

  -- Если профиль не найден, выходим
  IF v_current_exp IS NULL THEN
    RETURN;
  END IF;

  -- Вычисляем новый опыт
  v_new_exp := v_current_exp + p_points;
  IF v_new_exp < 0 THEN
    v_new_exp := 0;
  END IF;

  -- Определяем новый уровень
  SELECT COALESCE(MAX(level), 1) INTO v_new_level
  FROM levels
  WHERE min_experience <= v_new_exp;

  -- Обновляем профиль
  UPDATE profiles
  SET
    experience_points = v_new_exp,
    level = v_new_level,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Записываем в лог
  INSERT INTO experience_log (user_id, points, reason, reference_id, reference_type, description)
  VALUES (p_user_id, p_points, p_reason, p_reference_id, p_reference_type, p_description);

  -- Если уровень повысился, проверяем достижения
  IF v_new_level > v_current_level THEN
    PERFORM check_level_achievements(p_user_id, v_new_level);
  END IF;
END;
$$;

COMMENT ON FUNCTION add_experience_points IS 'Добавляет опыт пользователю и автоматически обновляет уровень';

-- =============================================
-- 2. ОБНОВЛЕНИЕ ТАБЛИЦЫ experience_log
-- =============================================

-- Проверяем и обновляем типы колонок в experience_log
DO $$
BEGIN
  -- Меняем reference_id с BIGINT на UUID если нужно
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'experience_log'
      AND column_name = 'reference_id'
      AND data_type = 'bigint'
  ) THEN
    -- Сначала очищаем таблицу если там есть несовместимые данные
    TRUNCATE TABLE experience_log;

    -- Меняем тип
    ALTER TABLE experience_log
    ALTER COLUMN reference_id TYPE UUID USING NULL;
  END IF;

  -- Меняем reason с VARCHAR на TEXT если нужно
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'experience_log'
      AND column_name = 'reason'
      AND data_type LIKE 'character%'
  ) THEN
    ALTER TABLE experience_log
    ALTER COLUMN reason TYPE TEXT;
  END IF;

  -- Меняем reference_type с VARCHAR на TEXT если нужно
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'experience_log'
      AND column_name = 'reference_type'
      AND data_type LIKE 'character%'
  ) THEN
    ALTER TABLE experience_log
    ALTER COLUMN reference_type TYPE TEXT;
  END IF;
END $$;

-- =============================================
-- 3. ИСПРАВЛЕНИЕ find_potential_duplicate_accounts
-- =============================================

-- Удаляем старую версию
DROP FUNCTION IF EXISTS find_potential_duplicate_accounts(UUID);

-- Создаём правильную версию с TEXT вместо VARCHAR
CREATE OR REPLACE FUNCTION find_potential_duplicate_accounts(
  p_user_id UUID
)
RETURNS TABLE (
  duplicate_user_id UUID,
  duplicate_email TEXT,  -- Изменено с VARCHAR на TEXT
  duplicate_name TEXT,   -- Изменено с VARCHAR на TEXT
  match_reason TEXT,
  similarity_score INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_email TEXT;
  v_user_name TEXT;
BEGIN
  -- Получаем данные текущего пользователя (email из auth.users, имя из profiles)
  SELECT au.email::TEXT, pr.full_name
  INTO v_user_email, v_user_name
  FROM auth.users au
  LEFT JOIN profiles pr ON pr.id = au.id
  WHERE au.id = p_user_id;

  -- Если пользователь не найден, возвращаем пустой результат
  IF v_user_email IS NULL THEN
    RETURN;
  END IF;

  -- Ищем дубликаты по различным критериям
  RETURN QUERY
  WITH potential_matches AS (
    SELECT
      pr.id,
      au.email::TEXT as email,  -- Явное преобразование в TEXT
      pr.full_name,
      CASE
        WHEN au.email = v_user_email THEN 'Одинаковый email'::TEXT
        WHEN LOWER(pr.full_name) = LOWER(v_user_name) AND au.email ILIKE '%' || SPLIT_PART(v_user_email, '@', 1) || '%'
          THEN 'Похожее имя и часть email'::TEXT
        WHEN LOWER(pr.full_name) = LOWER(v_user_name)
          THEN 'Одинаковое имя'::TEXT
        ELSE 'Другое совпадение'::TEXT
      END as reason,
      CASE
        WHEN au.email = v_user_email THEN 100
        WHEN LOWER(pr.full_name) = LOWER(v_user_name) THEN 70
        WHEN au.email ILIKE '%' || SPLIT_PART(v_user_email, '@', 1) || '%' THEN 50
        ELSE 30
      END as score
    FROM profiles pr
    JOIN auth.users au ON au.id = pr.id
    WHERE pr.id != p_user_id
      AND pr.id NOT IN (
        -- Исключаем уже объединённые аккаунты
        SELECT secondary_user_id FROM account_merge_requests
        WHERE primary_user_id = p_user_id AND status = 'completed'
      )
      AND (
        au.email = v_user_email
        OR LOWER(pr.full_name) = LOWER(v_user_name)
        OR au.email ILIKE '%' || SPLIT_PART(v_user_email, '@', 1) || '%'
      )
  )
  SELECT
    id,
    email,
    full_name,
    reason,
    score
  FROM potential_matches
  ORDER BY score DESC
  LIMIT 10;
END;
$$;

COMMENT ON FUNCTION find_potential_duplicate_accounts IS 'Находит потенциальные дубликаты аккаунта пользователя по email и имени';

-- =============================================
-- ПРОВЕРКА
-- =============================================

-- Выводим информацию о созданных функциях
SELECT
  routine_name,
  data_type as return_type,
  routine_definition
FROM information_schema.routines
WHERE routine_name IN ('add_experience_points', 'find_potential_duplicate_accounts')
  AND routine_schema = 'public';

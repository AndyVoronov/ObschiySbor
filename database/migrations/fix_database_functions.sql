-- =============================================
-- ИСПРАВЛЕНИЯ ФУНКЦИЙ БАЗЫ ДАННЫХ
-- Применить через Supabase SQL Editor
-- Дата: 2025-01-27
-- =============================================

-- 1. Пересоздать функцию add_experience_points (исправлена ошибка: reason вместо p_reason)
DROP FUNCTION IF EXISTS add_experience_points(UUID, INTEGER, VARCHAR, BIGINT, VARCHAR, TEXT);

CREATE OR REPLACE FUNCTION add_experience_points(
  p_user_id UUID,
  p_points INTEGER,
  p_reason VARCHAR(100),
  p_reference_id BIGINT DEFAULT NULL,
  p_reference_type VARCHAR(50) DEFAULT NULL,
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

  -- Записываем в лог (ИСПРАВЛЕНО: p_reason вместо reason)
  INSERT INTO experience_log (user_id, points, reason, reference_id, reference_type, description)
  VALUES (p_user_id, p_points, p_reason, p_reference_id, p_reference_type, p_description);

  -- Если уровень повысился, проверяем достижения
  IF v_new_level > v_current_level THEN
    PERFORM check_level_achievements(p_user_id, v_new_level);
  END IF;
END;
$$;

COMMENT ON FUNCTION add_experience_points IS 'Добавляет опыт пользователю и автоматически обновляет уровень';

-- 2. Пересоздать функцию find_potential_duplicate_accounts (исправлен тип возвращаемых значений: TEXT вместо VARCHAR)
DROP FUNCTION IF EXISTS find_potential_duplicate_accounts(UUID);

CREATE OR REPLACE FUNCTION find_potential_duplicate_accounts(
  p_user_id UUID
)
RETURNS TABLE (
  duplicate_user_id UUID,
  duplicate_email TEXT,
  duplicate_name TEXT,
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
  SELECT au.email, pr.full_name
  INTO v_user_email, v_user_name
  FROM auth.users au
  LEFT JOIN profiles pr ON pr.id = au.id
  WHERE au.id = p_user_id;

  -- Ищем дубликаты по различным критериям
  RETURN QUERY
  WITH potential_matches AS (
    SELECT
      pr.id,
      au.email,
      pr.full_name,
      CASE
        WHEN au.email = v_user_email THEN 'Одинаковый email'
        WHEN LOWER(pr.full_name) = LOWER(v_user_name) AND au.email ILIKE '%' || SPLIT_PART(v_user_email, '@', 1) || '%'
          THEN 'Похожее имя и часть email'
        WHEN LOWER(pr.full_name) = LOWER(v_user_name)
          THEN 'Одинаковое имя'
        ELSE 'Другое совпадение'
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

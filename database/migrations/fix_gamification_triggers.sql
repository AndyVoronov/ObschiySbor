-- =============================================
-- ИСПРАВЛЕНИЕ ТРИГГЕРОВ ГЕЙМИФИКАЦИИ
-- Применить через Supabase SQL Editor
-- Дата: 2025-10-28
-- =============================================

-- Проблема: Функция add_experience_points ожидает:
--   p_reference_id BIGINT
-- Но триггеры передают NEW.id (UUID)
--
-- Решение: Изменить функцию чтобы принимать UUID или NULL

-- 1. Пересоздать функцию add_experience_points с правильными типами
DROP FUNCTION IF EXISTS add_experience_points(UUID, INTEGER, VARCHAR, BIGINT, VARCHAR, TEXT);
DROP FUNCTION IF EXISTS add_experience_points(UUID, INTEGER, VARCHAR, UUID, VARCHAR, TEXT);

CREATE OR REPLACE FUNCTION add_experience_points(
  p_user_id UUID,
  p_points INTEGER,
  p_reason VARCHAR(100),
  p_reference_id UUID DEFAULT NULL,  -- Изменено с BIGINT на UUID
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

-- 2. Также нужно обновить таблицу experience_log если там reference_id BIGINT
-- Проверим и обновим если нужно
DO $$
BEGIN
  -- Проверяем тип колонки reference_id
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'experience_log'
      AND column_name = 'reference_id'
      AND data_type = 'bigint'
  ) THEN
    -- Меняем тип на UUID
    ALTER TABLE experience_log
    ALTER COLUMN reference_id TYPE UUID USING reference_id::text::uuid;
  END IF;
END $$;

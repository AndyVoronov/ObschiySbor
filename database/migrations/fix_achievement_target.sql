-- =============================================
-- ИСПРАВЛЕНИЕ ФУНКЦИИ check_and_unlock_achievement
-- Применить через Supabase SQL Editor
-- =============================================

-- Сначала посмотрим структуру таблицы user_achievements
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_achievements'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Пересоздаём функцию с учётом поля target
DROP FUNCTION IF EXISTS check_and_unlock_achievement(UUID, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION check_and_unlock_achievement(
  p_user_id UUID,
  p_achievement_code TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_achievement_id BIGINT;
  v_points_reward INTEGER;
  v_target_value INTEGER;
  v_already_unlocked BOOLEAN;
BEGIN
  -- Получаем данные достижения
  SELECT id, points_reward, target INTO v_achievement_id, v_points_reward, v_target_value
  FROM achievements
  WHERE code = p_achievement_code;

  IF v_achievement_id IS NULL THEN
    RETURN;
  END IF;

  -- Проверяем не было ли уже разблокировано
  SELECT EXISTS(
    SELECT 1 FROM user_achievements
    WHERE user_id = p_user_id AND achievement_id = v_achievement_id
  ) INTO v_already_unlocked;

  IF v_already_unlocked THEN
    RETURN;
  END IF;

  -- Разблокируем достижение с указанием target
  INSERT INTO user_achievements (user_id, achievement_id, progress, target)
  VALUES (p_user_id, v_achievement_id, v_target_value, v_target_value);

  -- Начисляем баллы за достижение
  IF v_points_reward > 0 THEN
    PERFORM add_experience_points(
      p_user_id,
      v_points_reward,
      'achievement_unlocked'::TEXT,
      p_user_id,
      'achievement'::TEXT,
      ('Достижение разблокировано: ' || p_achievement_code)::TEXT
    );
  END IF;
END;
$$;

-- Проверка
SELECT 'Achievement function fixed' as status;

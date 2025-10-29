-- =============================================
-- ИСПРАВЛЕНИЕ ФУНКЦИИ БЕЗ ПОЛЯ TARGET
-- Применить через Supabase SQL Editor
-- =============================================

-- Сначала проверим структуру таблицы achievements
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'achievements'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- И структуру user_achievements
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_achievements'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Пересоздаём функцию БЕЗ использования target из achievements
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
  v_already_unlocked BOOLEAN;
BEGIN
  -- Получаем ID достижения и награду (БЕЗ target)
  SELECT id, points_reward INTO v_achievement_id, v_points_reward
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

  -- Разблокируем достижение
  -- Если поле target обязательное, ставим 1 (достижение выполнено)
  INSERT INTO user_achievements (user_id, achievement_id, progress, target)
  VALUES (p_user_id, v_achievement_id, 1, 1);

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
SELECT 'Achievement function fixed (without target from achievements)' as status;

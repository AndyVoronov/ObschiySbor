-- =============================================
-- СОЗДАНИЕ ФУНКЦИИ-ОБЁРТКИ
-- Применить через Supabase SQL Editor
-- =============================================

-- Удаляем всё
DROP TRIGGER IF EXISTS trigger_event_created_gamification ON events CASCADE;
DROP FUNCTION IF EXISTS on_event_created_gamification() CASCADE;
DROP FUNCTION IF EXISTS add_experience_points CASCADE;

-- Создаём функцию add_experience_points с максимально явными типами
CREATE OR REPLACE FUNCTION add_experience_points(
  p_user_id UUID,
  p_points INTEGER,
  p_reason TEXT,
  p_reference_id UUID,
  p_reference_type TEXT,
  p_description TEXT
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

-- Создаём функцию триггера которая НЕ ИСПОЛЬЗУЕТ add_experience_points
CREATE OR REPLACE FUNCTION on_event_created_gamification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_exp INTEGER;
  v_new_exp INTEGER;
  v_current_level INTEGER;
  v_new_level INTEGER;
BEGIN
  -- Получаем текущий опыт пользователя
  SELECT experience_points, level INTO v_current_exp, v_current_level
  FROM profiles
  WHERE id = NEW.creator_id;

  -- Если профиль не найден, просто увеличиваем счётчик
  IF v_current_exp IS NULL THEN
    UPDATE profiles
    SET total_events_created = COALESCE(total_events_created, 0) + 1
    WHERE id = NEW.creator_id;
    RETURN NEW;
  END IF;

  -- Вычисляем новый опыт (50 баллов за создание события)
  v_new_exp := v_current_exp + 50;
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
    total_events_created = COALESCE(total_events_created, 0) + 1,
    updated_at = NOW()
  WHERE id = NEW.creator_id;

  -- Записываем в лог
  INSERT INTO experience_log (user_id, points, reason, reference_id, reference_type, description)
  VALUES (
    NEW.creator_id,
    50,
    'event_created',
    NEW.id,
    'event',
    'Создание события: ' || NEW.title
  );

  -- Если уровень повысился, проверяем достижения
  IF v_new_level > v_current_level THEN
    PERFORM check_level_achievements(NEW.creator_id, v_new_level);
  END IF;

  -- Проверяем достижение за первое событие
  IF (SELECT total_events_created FROM profiles WHERE id = NEW.creator_id) = 1 THEN
    PERFORM check_and_unlock_achievement(NEW.creator_id, 'first_event');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_event_created_gamification
AFTER INSERT ON events
FOR EACH ROW
EXECUTE FUNCTION on_event_created_gamification();

-- Проверка
SELECT 'Trigger created successfully' as status;

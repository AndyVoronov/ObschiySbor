-- =============================================
-- ПРИНУДИТЕЛЬНОЕ ПЕРЕСОЗДАНИЕ ФУНКЦИИ
-- Применить через Supabase SQL Editor
-- =============================================

-- Удаляем ВСЕ возможные версии функции add_experience_points
DROP FUNCTION IF EXISTS add_experience_points CASCADE;

-- Создаём единственную правильную версию
CREATE OR REPLACE FUNCTION add_experience_points(
  p_user_id UUID,
  p_points INTEGER,
  p_reason TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
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

-- Теперь пересоздаём триггер для событий
DROP TRIGGER IF EXISTS trigger_event_created_gamification ON events;
DROP FUNCTION IF EXISTS on_event_created_gamification();

CREATE OR REPLACE FUNCTION on_event_created_gamification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Начисляем баллы за создание события
  -- Используем явное приведение типов
  PERFORM add_experience_points(
    p_user_id := NEW.creator_id,
    p_points := 50,
    p_reason := 'event_created',
    p_reference_id := NEW.id,
    p_reference_type := 'event',
    p_description := 'Создание события: ' || NEW.title
  );

  -- Увеличиваем счётчик созданных событий
  UPDATE profiles
  SET total_events_created = COALESCE(total_events_created, 0) + 1
  WHERE id = NEW.creator_id;

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

-- Проверяем что функция создана правильно
SELECT
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'add_experience_points';

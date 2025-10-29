-- =============================================
-- ПЕРЕСОЗДАНИЕ ВСЕХ ТРИГГЕРОВ НА ТАБЛИЦЕ EVENTS
-- Применить через Supabase SQL Editor
-- =============================================

-- Сначала посмотрим что там есть
SELECT
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'events'
  AND trigger_schema = 'public'
ORDER BY trigger_name;

-- Удаляем ВСЕ триггеры на таблице events
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE event_object_table = 'events'
      AND trigger_schema = 'public'
  LOOP
    EXECUTE 'DROP TRIGGER IF EXISTS ' || r.trigger_name || ' ON events CASCADE';
  END LOOP;
END $$;

-- Пересоздаём триггер создания чат-комнаты
CREATE OR REPLACE FUNCTION on_event_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO chat_rooms (event_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_event_created
AFTER INSERT ON events
FOR EACH ROW
EXECUTE FUNCTION on_event_created();

-- Пересоздаём триггер обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Пересоздаём триггер геймификации с именованными параметрами
CREATE OR REPLACE FUNCTION on_event_created_gamification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Начисляем баллы за создание события с именованными параметрами
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

-- Проверяем финальный список триггеров
SELECT
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'events'
  AND trigger_schema = 'public'
ORDER BY trigger_name;

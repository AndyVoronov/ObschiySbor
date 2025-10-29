-- =============================================
-- ПЕРЕСОЗДАНИЕ ТРИГГЕРОВ ГЕЙМИФИКАЦИИ
-- Применить через Supabase SQL Editor
-- Дата: 2025-10-29
-- =============================================

-- Проблема: Триггеры вызывают старую версию add_experience_points
-- Решение: Пересоздать все триггеры с правильными вызовами

-- =============================================
-- 1. ТРИГГЕР: Начисление баллов при создании события
-- =============================================

DROP TRIGGER IF EXISTS trigger_event_created_gamification ON events;
DROP FUNCTION IF EXISTS on_event_created_gamification();

CREATE OR REPLACE FUNCTION on_event_created_gamification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Начисляем баллы за создание события
  PERFORM add_experience_points(
    NEW.creator_id::UUID,
    50,
    'event_created'::TEXT,
    NEW.id::UUID,
    'event'::TEXT,
    ('Создание события: ' || NEW.title)::TEXT
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

-- =============================================
-- 2. ТРИГГЕР: Начисление баллов при участии в событии
-- =============================================

DROP TRIGGER IF EXISTS trigger_event_participation_gamification ON event_participants;
DROP FUNCTION IF EXISTS on_event_participation_gamification();

CREATE OR REPLACE FUNCTION on_event_participation_gamification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'confirmed' THEN
    -- Начисляем баллы за участие
    PERFORM add_experience_points(
      NEW.user_id::UUID,
      20,
      'event_participated'::TEXT,
      NEW.event_id::UUID,
      'event'::TEXT,
      'Участие в событии'::TEXT
    );

    -- Увеличиваем счётчик участия
    UPDATE profiles
    SET total_events_participated = COALESCE(total_events_participated, 0) + 1
    WHERE id = NEW.user_id;

    -- Проверяем достижение за первое участие
    IF (SELECT total_events_participated FROM profiles WHERE id = NEW.user_id) = 1 THEN
      PERFORM check_and_unlock_achievement(NEW.user_id, 'first_participation');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_event_participation_gamification
AFTER INSERT OR UPDATE ON event_participants
FOR EACH ROW
EXECUTE FUNCTION on_event_participation_gamification();

-- =============================================
-- 3. ТРИГГЕР: Начисление баллов при оставлении отзыва
-- =============================================

DROP TRIGGER IF EXISTS trigger_review_created_gamification ON reviews;
DROP FUNCTION IF EXISTS on_review_created_gamification();

CREATE OR REPLACE FUNCTION on_review_created_gamification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_creator_id UUID;
BEGIN
  -- Начисляем баллы автору отзыва
  PERFORM add_experience_points(
    NEW.user_id::UUID,
    10,
    'review_given'::TEXT,
    NEW.event_id::UUID,
    'event'::TEXT,
    'Отзыв о событии'::TEXT
  );

  -- Если отзыв положительный (4-5 звёзд), начисляем баллы создателю события
  IF NEW.rating >= 4 THEN
    SELECT creator_id INTO v_event_creator_id
    FROM events
    WHERE id = NEW.event_id;

    PERFORM add_experience_points(
      v_event_creator_id::UUID,
      15,
      'positive_review_received'::TEXT,
      NEW.event_id::UUID,
      'event'::TEXT,
      'Получен положительный отзыв'::TEXT
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_review_created_gamification
AFTER INSERT ON reviews
FOR EACH ROW
EXECUTE FUNCTION on_review_created_gamification();

-- =============================================
-- 4. ТРИГГЕР: Начисление баллов при приглашении друга
-- =============================================

DROP TRIGGER IF EXISTS trigger_referral_completed_gamification ON profiles;
DROP FUNCTION IF EXISTS on_referral_completed_gamification();

CREATE OR REPLACE FUNCTION on_referral_completed_gamification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Если у пользователя появился реферал
  IF NEW.referred_by IS NOT NULL AND OLD.referred_by IS NULL THEN
    -- Начисляем баллы тому, кто пригласил
    PERFORM add_experience_points(
      NEW.referred_by::UUID,
      30,
      'referral_completed'::TEXT,
      NEW.id::UUID,
      'user'::TEXT,
      'Приглашён новый пользователь'::TEXT
    );

    -- Проверяем достижения за рефералов
    PERFORM check_and_unlock_achievement(NEW.referred_by, 'social_butterfly');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_referral_completed_gamification
AFTER UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION on_referral_completed_gamification();

-- =============================================
-- ПРОВЕРКА
-- =============================================

-- Выводим информацию о созданных триггерах
SELECT
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE trigger_name LIKE '%gamification%'
  AND trigger_schema = 'public'
ORDER BY trigger_name;

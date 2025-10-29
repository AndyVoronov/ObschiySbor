-- =============================================
-- ИСПРАВЛЕНИЕ ВСЕХ ФУНКЦИЙ ГЕЙМИФИКАЦИИ
-- Применить через Supabase SQL Editor
-- =============================================

-- Пересоздаём ВСЕ функции которые вызывают add_experience_points

-- 1. on_event_participation_gamification
DROP FUNCTION IF EXISTS on_event_participation_gamification() CASCADE;

CREATE OR REPLACE FUNCTION on_event_participation_gamification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'confirmed' THEN
    -- Начисляем баллы за участие с явными типами
    PERFORM add_experience_points(
      NEW.user_id,
      20,
      'event_participated'::TEXT,
      NEW.event_id,
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

-- 2. on_review_created_gamification
DROP FUNCTION IF EXISTS on_review_created_gamification() CASCADE;

CREATE OR REPLACE FUNCTION on_review_created_gamification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_creator_id UUID;
BEGIN
  -- Начисляем баллы автору отзыва с явными типами
  PERFORM add_experience_points(
    NEW.user_id,
    10,
    'review_given'::TEXT,
    NEW.event_id,
    'event'::TEXT,
    'Отзыв о событии'::TEXT
  );

  -- Если отзыв положительный (4-5 звёзд), начисляем баллы создателю события
  IF NEW.rating >= 4 THEN
    SELECT creator_id INTO v_event_creator_id
    FROM events
    WHERE id = NEW.event_id;

    PERFORM add_experience_points(
      v_event_creator_id,
      15,
      'positive_review_received'::TEXT,
      NEW.event_id,
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

-- 3. on_referral_completed_gamification
DROP FUNCTION IF EXISTS on_referral_completed_gamification() CASCADE;

CREATE OR REPLACE FUNCTION on_referral_completed_gamification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Если у пользователя появился реферал
  IF NEW.referred_by IS NOT NULL AND OLD.referred_by IS NULL THEN
    -- Начисляем баллы тому, кто пригласил с явными типами
    PERFORM add_experience_points(
      NEW.referred_by,
      30,
      'referral_completed'::TEXT,
      NEW.id,
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

-- 4. check_and_unlock_achievement
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
  -- Получаем ID достижения и награду
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
  INSERT INTO user_achievements (user_id, achievement_id)
  VALUES (p_user_id, v_achievement_id);

  -- Начисляем баллы за достижение с явными типами
  IF v_points_reward > 0 THEN
    PERFORM add_experience_points(
      p_user_id,
      v_points_reward,
      'achievement_unlocked'::TEXT,
      p_user_id, -- reference_id теперь UUID (user_id)
      'achievement'::TEXT,
      ('Достижение разблокировано: ' || p_achievement_code)::TEXT
    );
  END IF;
END;
$$;

-- 5. apply_referral_code
DROP FUNCTION IF EXISTS apply_referral_code(UUID, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION apply_referral_code(
  p_user_id UUID,
  p_referral_code TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referrer_id UUID;
  v_already_referred BOOLEAN;
  v_registration_reward record;
BEGIN
  -- Проверяем, не был ли пользователь уже приглашён
  SELECT referred_by IS NOT NULL INTO v_already_referred
  FROM profiles
  WHERE id = p_user_id;

  IF v_already_referred THEN
    RETURN QUERY SELECT FALSE, 'Вы уже использовали реферальный код';
    RETURN;
  END IF;

  -- Находим владельца реферального кода
  SELECT id INTO v_referrer_id
  FROM profiles
  WHERE referral_code = p_referral_code;

  IF v_referrer_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Неверный реферальный код';
    RETURN;
  END IF;

  IF v_referrer_id = p_user_id THEN
    RETURN QUERY SELECT FALSE, 'Нельзя использовать собственный реферальный код';
    RETURN;
  END IF;

  -- Устанавливаем реферера
  UPDATE profiles
  SET referred_by = v_referrer_id
  WHERE id = p_user_id;

  -- Получаем награду за регистрацию
  SELECT * INTO v_registration_reward
  FROM referral_rewards
  WHERE reward_type = 'registration'
  LIMIT 1;

  -- Начисляем бонус новому пользователю с явными типами
  IF v_registration_reward.points_reward > 0 THEN
    PERFORM add_experience_points(
      p_user_id,
      v_registration_reward.points_reward,
      'referral_registration'::TEXT,
      v_referrer_id,
      'referral'::TEXT,
      'Бонус за регистрацию по приглашению'::TEXT
    );
  END IF;

  RETURN QUERY SELECT TRUE, 'Реферальный код успешно применён';
END;
$$;

-- 6. check_referral_rewards
DROP FUNCTION IF EXISTS check_referral_rewards(UUID) CASCADE;

CREATE OR REPLACE FUNCTION check_referral_rewards(
  p_referrer_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referral record;
  v_reward record;
  v_condition_met BOOLEAN := FALSE;
  v_events_count INTEGER;
BEGIN
  -- Проходим по всем наградам
  FOR v_reward IN
    SELECT * FROM referral_rewards
    WHERE reward_type != 'registration'
    ORDER BY required_referrals ASC
  LOOP
    -- Проверяем условия награды
    IF v_reward.reward_type = 'referral_count' THEN
      -- Считаем количество рефералов
      SELECT COUNT(*) INTO v_events_count
      FROM profiles
      WHERE referred_by = p_referrer_id;

      v_condition_met := v_events_count >= v_reward.required_referrals;

    ELSIF v_reward.reward_type = 'referral_active' THEN
      -- Считаем активных рефералов (с событиями)
      SELECT COUNT(DISTINCT p.id) INTO v_events_count
      FROM profiles p
      JOIN events e ON e.creator_id = p.id
      WHERE p.referred_by = p_referrer_id;

      v_condition_met := v_events_count >= v_reward.required_referrals;
    END IF;

    -- Если условие выполнено, начисляем награду
    IF v_condition_met THEN
      -- Проверяем не была ли уже получена эта награда
      IF NOT EXISTS (
        SELECT 1 FROM referral_reward_claims
        WHERE user_id = p_referrer_id AND reward_id = v_reward.id
      ) THEN
        -- Записываем получение награды
        INSERT INTO referral_reward_claims (user_id, reward_id)
        VALUES (p_referrer_id, v_reward.id);

        -- Начисляем баллы с явными типами
        IF v_reward.points_reward > 0 THEN
          PERFORM add_experience_points(
            p_referrer_id,
            v_reward.points_reward,
            'referral_milestone'::TEXT,
            p_referrer_id,
            'referral'::TEXT,
            ('Награда за ' || v_reward.required_referrals || ' рефералов')::TEXT
          );
        END IF;
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Проверка
SELECT 'All gamification functions recreated successfully' as status;

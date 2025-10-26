-- Миграция: Реферальная программа
-- Дата: 2025-10-26
-- Описание: Добавляет систему реферальных кодов и вознаграждений

-- ============================================================================
-- 1. РАСШИРЕНИЕ ТАБЛИЦЫ ПРОФИЛЕЙ
-- ============================================================================

-- Добавляем поля для реферальной программы
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS total_referrals INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS referral_bonus_earned INTEGER DEFAULT 0;

-- Комментарии для документации
COMMENT ON COLUMN profiles.referral_code IS 'Уникальный реферальный код пользователя';
COMMENT ON COLUMN profiles.referred_by IS 'ID пользователя, который пригласил этого пользователя';
COMMENT ON COLUMN profiles.total_referrals IS 'Общее количество приглашённых пользователей';
COMMENT ON COLUMN profiles.referral_bonus_earned IS 'Общее количество бонусных баллов, заработанных через рефералов';

-- Проверочные ограничения
ALTER TABLE profiles
ADD CONSTRAINT check_total_referrals_positive
  CHECK (total_referrals >= 0),
ADD CONSTRAINT check_referral_bonus_positive
  CHECK (referral_bonus_earned >= 0),
ADD CONSTRAINT check_referral_code_format
  CHECK (referral_code IS NULL OR LENGTH(referral_code) >= 6);

-- ============================================================================
-- 2. ТАБЛИЦА РЕФЕРАЛЬНЫХ СВЯЗЕЙ
-- ============================================================================

CREATE TABLE IF NOT EXISTS referrals (
  id BIGSERIAL PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referral_code VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, active, completed
  bonus_paid BOOLEAN DEFAULT FALSE,
  bonus_amount INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE(referred_id),
  CHECK(referrer_id != referred_id)
);

COMMENT ON TABLE referrals IS 'История реферальных приглашений';
COMMENT ON COLUMN referrals.referrer_id IS 'ID пригласившего пользователя';
COMMENT ON COLUMN referrals.referred_id IS 'ID приглашённого пользователя';
COMMENT ON COLUMN referrals.status IS 'Статус реферала: pending (зарегистрировался), active (прошёл активацию), completed (выполнил условия)';
COMMENT ON COLUMN referrals.bonus_paid IS 'Был ли выплачен бонус рефереру';
COMMENT ON COLUMN referrals.bonus_amount IS 'Размер выплаченного бонуса';

-- Индексы
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status) WHERE status != 'completed';

-- ============================================================================
-- 3. ТАБЛИЦА НАСТРОЕК РЕФЕРАЛЬНОЙ ПРОГРАММЫ
-- ============================================================================

CREATE TABLE IF NOT EXISTS referral_rewards (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name_ru VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  description_ru TEXT,
  description_en TEXT,
  condition_type VARCHAR(50) NOT NULL, -- 'registration', 'first_event', 'events_count', 'total_spent'
  condition_value INTEGER,
  referrer_reward INTEGER NOT NULL,
  referred_reward INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE referral_rewards IS 'Настройки вознаграждений реферальной программы';
COMMENT ON COLUMN referral_rewards.condition_type IS 'Тип условия для получения награды';
COMMENT ON COLUMN referral_rewards.condition_value IS 'Значение условия (например, количество событий)';
COMMENT ON COLUMN referral_rewards.referrer_reward IS 'Награда для пригласившего (в XP)';
COMMENT ON COLUMN referral_rewards.referred_reward IS 'Награда для приглашённого (в XP)';

-- Индекс
CREATE INDEX IF NOT EXISTS idx_referral_rewards_active ON referral_rewards(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- 4. ФУНКЦИЯ ГЕНЕРАЦИИ РЕФЕРАЛЬНОГО КОДА
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS VARCHAR(20)
LANGUAGE plpgsql
AS $$
DECLARE
  v_code VARCHAR(20);
  v_exists BOOLEAN;
BEGIN
  LOOP
    -- Генерируем код из 8 символов (буквы и цифры)
    v_code := UPPER(
      SUBSTR(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT), 1, 8)
    );

    -- Проверяем уникальность
    SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = v_code) INTO v_exists;

    EXIT WHEN NOT v_exists;
  END LOOP;

  RETURN v_code;
END;
$$;

COMMENT ON FUNCTION generate_referral_code IS 'Генерирует уникальный реферальный код';

-- ============================================================================
-- 5. ФУНКЦИЯ ПРИМЕНЕНИЯ РЕФЕРАЛЬНОГО КОДА
-- ============================================================================

CREATE OR REPLACE FUNCTION apply_referral_code(
  p_user_id UUID,
  p_referral_code VARCHAR(20)
)
RETURNS BOOLEAN
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
    RAISE EXCEPTION 'Пользователь уже был приглашён';
  END IF;

  -- Находим пригласившего по коду
  SELECT id INTO v_referrer_id
  FROM profiles
  WHERE referral_code = p_referral_code;

  IF v_referrer_id IS NULL THEN
    RAISE EXCEPTION 'Неверный реферальный код';
  END IF;

  -- Проверяем, что пользователь не пытается пригласить сам себя
  IF v_referrer_id = p_user_id THEN
    RAISE EXCEPTION 'Нельзя использовать собственный реферальный код';
  END IF;

  -- Обновляем профиль приглашённого
  UPDATE profiles
  SET referred_by = v_referrer_id
  WHERE id = p_user_id;

  -- Создаём запись в таблице рефералов
  INSERT INTO referrals (referrer_id, referred_id, referral_code, status)
  VALUES (v_referrer_id, p_user_id, p_referral_code, 'pending');

  -- Обновляем счётчик рефералов у пригласившего
  UPDATE profiles
  SET total_referrals = total_referrals + 1
  WHERE id = v_referrer_id;

  -- Получаем награду за регистрацию
  SELECT * INTO v_registration_reward
  FROM referral_rewards
  WHERE code = 'registration_bonus' AND is_active = TRUE;

  IF v_registration_reward IS NOT NULL THEN
    -- Начисляем бонус пригласившему
    PERFORM add_experience_points(
      v_referrer_id,
      v_registration_reward.referrer_reward,
      'referral',
      p_user_id::BIGINT,
      'referral',
      'Реферальный бонус: регистрация приглашённого'
    );

    -- Начисляем бонус приглашённому
    PERFORM add_experience_points(
      p_user_id,
      v_registration_reward.referred_reward,
      'referral',
      v_referrer_id::BIGINT,
      'referral',
      'Бонус за регистрацию по реферальной ссылке'
    );

    -- Обновляем запись реферала
    UPDATE referrals
    SET
      status = 'active',
      activated_at = NOW(),
      bonus_paid = TRUE,
      bonus_amount = v_registration_reward.referrer_reward
    WHERE referred_id = p_user_id;

    -- Обновляем счётчик заработанных бонусов
    UPDATE profiles
    SET referral_bonus_earned = referral_bonus_earned + v_registration_reward.referrer_reward
    WHERE id = v_referrer_id;
  END IF;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION apply_referral_code IS 'Применяет реферальный код при регистрации пользователя';

-- ============================================================================
-- 6. ФУНКЦИЯ ПРОВЕРКИ УСЛОВИЙ РЕФЕРАЛЬНЫХ НАГРАД
-- ============================================================================

CREATE OR REPLACE FUNCTION check_referral_rewards(
  p_referred_id UUID,
  p_condition_type VARCHAR(50)
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
  -- Получаем информацию о реферале
  SELECT * INTO v_referral
  FROM referrals
  WHERE referred_id = p_referred_id AND status = 'active';

  IF v_referral IS NULL THEN
    RETURN;
  END IF;

  -- Получаем настройки награды
  SELECT * INTO v_reward
  FROM referral_rewards
  WHERE condition_type = p_condition_type AND is_active = TRUE;

  IF v_reward IS NULL THEN
    RETURN;
  END IF;

  -- Проверяем условие в зависимости от типа
  CASE p_condition_type
    WHEN 'first_event' THEN
      -- Проверяем, создал ли пользователь первое событие
      SELECT COUNT(*) >= 1 INTO v_condition_met
      FROM events
      WHERE creator_id = p_referred_id;

    WHEN 'events_count' THEN
      -- Проверяем количество созданных событий
      SELECT COUNT(*) >= v_reward.condition_value INTO v_condition_met
      FROM events
      WHERE creator_id = p_referred_id;

    WHEN 'first_participation' THEN
      -- Проверяем участие в событии
      SELECT COUNT(*) >= 1 INTO v_condition_met
      FROM event_participants
      WHERE user_id = p_referred_id AND status = 'confirmed';

    ELSE
      RETURN;
  END CASE;

  -- Если условие выполнено, начисляем награду
  IF v_condition_met THEN
    -- Начисляем бонус пригласившему
    PERFORM add_experience_points(
      v_referral.referrer_id,
      v_reward.referrer_reward,
      'referral',
      p_referred_id::BIGINT,
      'referral',
      'Реферальный бонус: ' || v_reward.name_ru
    );

    -- Начисляем бонус приглашённому
    PERFORM add_experience_points(
      p_referred_id,
      v_reward.referred_reward,
      'referral',
      v_referral.referrer_id::BIGINT,
      'referral',
      'Бонус за выполнение условия: ' || v_reward.name_ru
    );

    -- Обновляем запись реферала
    UPDATE referrals
    SET
      status = 'completed',
      completed_at = NOW(),
      bonus_amount = bonus_amount + v_reward.referrer_reward
    WHERE id = v_referral.id;

    -- Обновляем счётчик заработанных бонусов
    UPDATE profiles
    SET referral_bonus_earned = referral_bonus_earned + v_reward.referrer_reward
    WHERE id = v_referral.referrer_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION check_referral_rewards IS 'Проверяет и начисляет реферальные награды при выполнении условий';

-- ============================================================================
-- 7. ТРИГГЕР ДЛЯ АВТОМАТИЧЕСКОЙ ГЕНЕРАЦИИ РЕФЕРАЛЬНОГО КОДА
-- ============================================================================

CREATE OR REPLACE FUNCTION on_profile_created_generate_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Генерируем реферальный код если его нет
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_generate_referral_code
BEFORE INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION on_profile_created_generate_referral_code();

-- ============================================================================
-- 8. ТРИГГЕРЫ ДЛЯ ПРОВЕРКИ РЕФЕРАЛЬНЫХ УСЛОВИЙ
-- ============================================================================

-- Триггер: проверка при создании первого события
CREATE OR REPLACE FUNCTION on_event_created_check_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Проверяем реферальные награды за первое событие
  PERFORM check_referral_rewards(NEW.creator_id, 'first_event');
  PERFORM check_referral_rewards(NEW.creator_id, 'events_count');

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_event_created_check_referral
AFTER INSERT ON events
FOR EACH ROW
EXECUTE FUNCTION on_event_created_check_referral();

-- Триггер: проверка при первом участии в событии
CREATE OR REPLACE FUNCTION on_participation_check_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'confirmed' THEN
    PERFORM check_referral_rewards(NEW.user_id, 'first_participation');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_participation_check_referral
AFTER INSERT OR UPDATE ON event_participants
FOR EACH ROW
EXECUTE FUNCTION on_participation_check_referral();

-- ============================================================================
-- 9. НАЧАЛЬНЫЕ ДАННЫЕ: РЕФЕРАЛЬНЫЕ НАГРАДЫ
-- ============================================================================

INSERT INTO referral_rewards (code, name_ru, name_en, description_ru, description_en, condition_type, condition_value, referrer_reward, referred_reward) VALUES
('registration_bonus', 'Бонус за регистрацию', 'Registration Bonus', 'Награда за приглашение нового пользователя', 'Reward for inviting a new user', 'registration', NULL, 30, 20),
('first_event_bonus', 'Бонус за первое событие', 'First Event Bonus', 'Награда когда приглашённый создаёт первое событие', 'Reward when referred user creates first event', 'first_event', 1, 50, 30),
('events_milestone_bonus', 'Бонус за активность', 'Activity Milestone Bonus', 'Награда когда приглашённый создаёт 5 событий', 'Reward when referred user creates 5 events', 'events_count', 5, 100, 50),
('first_participation_bonus', 'Бонус за первое участие', 'First Participation Bonus', 'Награда когда приглашённый посещает первое событие', 'Reward when referred user attends first event', 'first_participation', 1, 25, 15)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 10. RLS ПОЛИТИКИ
-- ============================================================================

-- Включаем RLS для новых таблиц
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;

-- Политики для referrals
CREATE POLICY "Пользователи видят свои реферальные связи"
  ON referrals FOR SELECT
  USING (referrer_id = auth.uid() OR referred_id = auth.uid());

CREATE POLICY "Система может создавать реферальные связи"
  ON referrals FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Система может обновлять реферальные связи"
  ON referrals FOR UPDATE
  USING (true);

-- Политики для referral_rewards
CREATE POLICY "Все могут просматривать активные награды"
  ON referral_rewards FOR SELECT
  USING (is_active = TRUE);

-- ============================================================================
-- 11. ИНДЕКСЫ ДЛЯ ОПТИМИЗАЦИИ
-- ============================================================================

-- Индекс для поиска по реферальному коду
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code) WHERE referral_code IS NOT NULL;

-- Индекс для поиска рефереров
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON profiles(referred_by) WHERE referred_by IS NOT NULL;

-- Индекс для топа рефереров
CREATE INDEX IF NOT EXISTS idx_profiles_top_referrers ON profiles(total_referrals DESC, referral_bonus_earned DESC);

-- ============================================================================
-- 12. ГЕНЕРАЦИЯ РЕФЕРАЛЬНЫХ КОДОВ ДЛЯ СУЩЕСТВУЮЩИХ ПОЛЬЗОВАТЕЛЕЙ
-- ============================================================================

-- Генерируем реферальные коды для пользователей, у которых их ещё нет
UPDATE profiles
SET referral_code = generate_referral_code()
WHERE referral_code IS NULL;

-- ============================================================================
-- 13. ДОСТИЖЕНИЯ ЗА РЕФЕРАЛОВ
-- ============================================================================

-- Добавляем достижения за приглашение друзей
INSERT INTO achievements (code, name_ru, name_en, description_ru, description_en, icon, color, category, rarity, points_reward, requirement) VALUES
('first_referral', 'Первый друг', 'First Friend', 'Пригласите первого друга', 'Invite your first friend', '👥', '#3498db', 'social', 'common', 25, '{"type": "referrals", "count": 1}'::jsonb),
('referral_master_5', 'Лидер мнений', 'Opinion Leader', 'Пригласите 5 друзей', 'Invite 5 friends', '🌟', '#2ecc71', 'social', 'rare', 75, '{"type": "referrals", "count": 5}'::jsonb),
('referral_master_10', 'Влиятельная персона', 'Influential Person', 'Пригласите 10 друзей', 'Invite 10 friends', '💫', '#f39c12', 'social', 'epic', 150, '{"type": "referrals", "count": 10}'::jsonb),
('referral_master_25', 'Амбассадор', 'Ambassador', 'Пригласите 25 друзей', 'Invite 25 friends', '👑', '#9b59b6', 'social', 'epic', 300, '{"type": "referrals", "count": 25}'::jsonb),
('referral_master_50', 'Легенда сообщества', 'Community Legend', 'Пригласите 50 друзей', 'Invite 50 friends', '💎', '#e74c3c', 'social', 'legendary', 500, '{"type": "referrals", "count": 50}'::jsonb)
ON CONFLICT (code) DO NOTHING;

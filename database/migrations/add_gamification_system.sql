-- Миграция: Система геймификации
-- Дата: 2025-10-26
-- Описание: Добавляет систему баллов, уровней, достижений и бейджей

-- ============================================================================
-- 1. РАСШИРЕНИЕ ТАБЛИЦЫ ПРОФИЛЕЙ
-- ============================================================================

-- Добавляем поля для отслеживания прогресса пользователя
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS experience_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS total_events_created INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_events_participated INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_reviews_given INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS member_since TIMESTAMPTZ DEFAULT NOW();

-- Комментарии для документации
COMMENT ON COLUMN profiles.experience_points IS 'Общее количество накопленных баллов опыта';
COMMENT ON COLUMN profiles.level IS 'Текущий уровень пользователя (1-100)';
COMMENT ON COLUMN profiles.total_events_created IS 'Всего создано событий';
COMMENT ON COLUMN profiles.total_events_participated IS 'Всего посещено событий';
COMMENT ON COLUMN profiles.total_reviews_given IS 'Всего оставлено отзывов';
COMMENT ON COLUMN profiles.member_since IS 'Дата регистрации';

-- Проверочные ограничения
ALTER TABLE profiles
ADD CONSTRAINT check_experience_points_positive
  CHECK (experience_points >= 0),
ADD CONSTRAINT check_level_range
  CHECK (level >= 1 AND level <= 100),
ADD CONSTRAINT check_events_created_positive
  CHECK (total_events_created >= 0),
ADD CONSTRAINT check_events_participated_positive
  CHECK (total_events_participated >= 0),
ADD CONSTRAINT check_reviews_given_positive
  CHECK (total_reviews_given >= 0);

-- ============================================================================
-- 2. ТАБЛИЦА УРОВНЕЙ
-- ============================================================================

CREATE TABLE IF NOT EXISTS levels (
  level INTEGER PRIMARY KEY,
  name_ru VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  min_experience INTEGER NOT NULL,
  icon VARCHAR(50),
  color VARCHAR(20),
  perks JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE levels IS 'Определения уровней с требованиями и привилегиями';
COMMENT ON COLUMN levels.name_ru IS 'Название уровня на русском';
COMMENT ON COLUMN levels.name_en IS 'Название уровня на английском';
COMMENT ON COLUMN levels.min_experience IS 'Минимальное количество опыта для достижения уровня';
COMMENT ON COLUMN levels.perks IS 'JSON массив привилегий уровня';

-- Индексы
CREATE INDEX IF NOT EXISTS idx_levels_experience ON levels(min_experience);

-- ============================================================================
-- 3. ТАБЛИЦА ДОСТИЖЕНИЙ
-- ============================================================================

CREATE TABLE IF NOT EXISTS achievements (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name_ru VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  description_ru TEXT,
  description_en TEXT,
  icon VARCHAR(50),
  color VARCHAR(20),
  category VARCHAR(50), -- 'events', 'social', 'milestones', 'special'
  rarity VARCHAR(20) DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
  points_reward INTEGER DEFAULT 0,
  requirement JSONB NOT NULL, -- Условия получения достижения
  is_secret BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE achievements IS 'Определения достижений и бейджей';
COMMENT ON COLUMN achievements.code IS 'Уникальный код достижения (например: first_event, social_butterfly)';
COMMENT ON COLUMN achievements.requirement IS 'JSON описание условий получения достижения';
COMMENT ON COLUMN achievements.is_secret IS 'Скрытое достижение (не показывается до получения)';

-- Индексы
CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements(category);
CREATE INDEX IF NOT EXISTS idx_achievements_active ON achievements(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- 4. ТАБЛИЦА ПРОГРЕССА ПОЛЬЗОВАТЕЛЕЙ ПО ДОСТИЖЕНИЯМ
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_achievements (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id BIGINT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  target INTEGER NOT NULL,
  unlocked_at TIMESTAMPTZ,
  is_unlocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

COMMENT ON TABLE user_achievements IS 'Прогресс пользователей по достижениям';
COMMENT ON COLUMN user_achievements.progress IS 'Текущий прогресс';
COMMENT ON COLUMN user_achievements.target IS 'Целевое значение для разблокировки';

-- Индексы
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked ON user_achievements(user_id, is_unlocked);

-- ============================================================================
-- 5. ТАБЛИЦА ИСТОРИИ ПОЛУЧЕНИЯ БАЛЛОВ
-- ============================================================================

CREATE TABLE IF NOT EXISTS experience_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason VARCHAR(100) NOT NULL,
  reference_id BIGINT, -- ID связанного объекта (события, отзыва и т.д.)
  reference_type VARCHAR(50), -- 'event', 'review', 'achievement', 'referral'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE experience_log IS 'История начисления/списания баллов опыта';
COMMENT ON COLUMN experience_log.reason IS 'Причина начисления (event_created, event_attended, review_given, etc.)';
COMMENT ON COLUMN experience_log.reference_id IS 'ID связанного объекта';
COMMENT ON COLUMN experience_log.reference_type IS 'Тип связанного объекта';

-- Индексы
CREATE INDEX IF NOT EXISTS idx_experience_log_user ON experience_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_experience_log_reference ON experience_log(reference_type, reference_id);

-- ============================================================================
-- 6. ФУНКЦИИ ДЛЯ РАБОТЫ С ОПЫТОМ И УРОВНЯМИ
-- ============================================================================

-- Функция для добавления опыта пользователю
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

  -- Записываем в лог
  INSERT INTO experience_log (user_id, points, reason, reference_id, reference_type, description)
  VALUES (p_user_id, p_points, reason, p_reference_id, p_reference_type, p_description);

  -- Если уровень повысился, проверяем достижения
  IF v_new_level > v_current_level THEN
    PERFORM check_level_achievements(p_user_id, v_new_level);
  END IF;
END;
$$;

COMMENT ON FUNCTION add_experience_points IS 'Добавляет опыт пользователю и автоматически обновляет уровень';

-- Функция для проверки и разблокировки достижений
CREATE OR REPLACE FUNCTION check_and_unlock_achievement(
  p_user_id UUID,
  p_achievement_code VARCHAR(50)
)
RETURNS BOOLEAN
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
  WHERE code = p_achievement_code AND is_active = TRUE;

  IF v_achievement_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Проверяем, не разблокировано ли уже
  SELECT is_unlocked INTO v_already_unlocked
  FROM user_achievements
  WHERE user_id = p_user_id AND achievement_id = v_achievement_id;

  IF v_already_unlocked IS TRUE THEN
    RETURN FALSE;
  END IF;

  -- Разблокируем достижение
  INSERT INTO user_achievements (user_id, achievement_id, progress, target, is_unlocked, unlocked_at)
  VALUES (p_user_id, v_achievement_id, 1, 1, TRUE, NOW())
  ON CONFLICT (user_id, achievement_id)
  DO UPDATE SET
    is_unlocked = TRUE,
    unlocked_at = NOW(),
    progress = EXCLUDED.target;

  -- Начисляем баллы за достижение
  IF v_points_reward > 0 THEN
    PERFORM add_experience_points(
      p_user_id,
      v_points_reward,
      'achievement_unlocked',
      v_achievement_id,
      'achievement',
      'Достижение: ' || p_achievement_code
    );
  END IF;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION check_and_unlock_achievement IS 'Проверяет и разблокирует достижение для пользователя';

-- Функция для проверки достижений, связанных с уровнем
CREATE OR REPLACE FUNCTION check_level_achievements(
  p_user_id UUID,
  p_new_level INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Проверяем достижения за достижение уровней (5, 10, 25, 50, 100)
  IF p_new_level >= 5 THEN
    PERFORM check_and_unlock_achievement(p_user_id, 'level_5');
  END IF;

  IF p_new_level >= 10 THEN
    PERFORM check_and_unlock_achievement(p_user_id, 'level_10');
  END IF;

  IF p_new_level >= 25 THEN
    PERFORM check_and_unlock_achievement(p_user_id, 'level_25');
  END IF;

  IF p_new_level >= 50 THEN
    PERFORM check_and_unlock_achievement(p_user_id, 'level_50');
  END IF;

  IF p_new_level >= 100 THEN
    PERFORM check_and_unlock_achievement(p_user_id, 'level_100');
  END IF;
END;
$$;

-- ============================================================================
-- 7. ТРИГГЕРЫ ДЛЯ АВТОМАТИЧЕСКОГО НАЧИСЛЕНИЯ БАЛЛОВ
-- ============================================================================

-- Триггер: начисление баллов при создании события
CREATE OR REPLACE FUNCTION on_event_created_gamification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Начисляем баллы за создание события
  PERFORM add_experience_points(
    NEW.creator_id,
    50, -- 50 баллов за создание события
    'event_created',
    NEW.id,
    'event',
    'Создание события: ' || NEW.title
  );

  -- Обновляем счётчик созданных событий
  UPDATE profiles
  SET total_events_created = total_events_created + 1
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

-- Триггер: начисление баллов при участии в событии
CREATE OR REPLACE FUNCTION on_event_participation_gamification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'confirmed' THEN
    -- Начисляем баллы за участие
    PERFORM add_experience_points(
      NEW.user_id,
      20, -- 20 баллов за участие в событии
      'event_participated',
      NEW.event_id,
      'event',
      'Участие в событии'
    );

    -- Обновляем счётчик посещённых событий
    UPDATE profiles
    SET total_events_participated = total_events_participated + 1
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

-- Триггер: начисление баллов при оставлении отзыва
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
    NEW.reviewer_id,
    10, -- 10 баллов за отзыв
    'review_given',
    NEW.id,
    'review',
    'Отзыв о событии'
  );

  -- Обновляем счётчик отзывов
  UPDATE profiles
  SET total_reviews_given = total_reviews_given + 1
  WHERE id = NEW.reviewer_id;

  -- Если отзыв с высокой оценкой (4-5), начисляем баллы организатору
  IF NEW.rating >= 4 THEN
    SELECT creator_id INTO v_event_creator_id
    FROM events
    WHERE id = NEW.event_id;

    PERFORM add_experience_points(
      v_event_creator_id,
      15, -- 15 баллов за хороший отзыв
      'positive_review_received',
      NEW.id,
      'review',
      'Получен положительный отзыв'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_review_created_gamification
AFTER INSERT ON reviews
FOR EACH ROW
EXECUTE FUNCTION on_review_created_gamification();

-- ============================================================================
-- 8. НАЧАЛЬНЫЕ ДАННЫЕ: УРОВНИ
-- ============================================================================

INSERT INTO levels (level, name_ru, name_en, min_experience, icon, color, perks) VALUES
(1, 'Новичок', 'Newcomer', 0, '🌱', '#95a5a6', '["Доступ к базовым функциям"]'::jsonb),
(2, 'Начинающий', 'Beginner', 100, '🌿', '#3498db', '["Доступ к чатам событий"]'::jsonb),
(3, 'Участник', 'Participant', 250, '🌾', '#2ecc71', '["Возможность оставлять отзывы"]'::jsonb),
(4, 'Активист', 'Activist', 500, '🌳', '#27ae60', '["Приоритет в очереди на события"]'::jsonb),
(5, 'Организатор', 'Organizer', 1000, '⭐', '#f39c12', '["Доступ к аналитике", "Бейдж организатора"]'::jsonb),
(6, 'Эксперт', 'Expert', 2000, '💫', '#e67e22', '["Расширенные инструменты создания событий"]'::jsonb),
(7, 'Мастер', 'Master', 4000, '🏆', '#e74c3c', '["Возможность создавать серии событий"]'::jsonb),
(8, 'Гуру', 'Guru', 7000, '👑', '#9b59b6', '["Приоритетная поддержка", "Специальный бейдж"]'::jsonb),
(9, 'Легенда', 'Legend', 12000, '💎', '#1abc9c', '["Все привилегии", "Уникальный бейдж"]'::jsonb),
(10, 'Титан', 'Titan', 20000, '🔥', '#c0392b', '["Максимальные привилегии", "Легендарный бейдж"]'::jsonb)
ON CONFLICT (level) DO NOTHING;

-- ============================================================================
-- 9. НАЧАЛЬНЫЕ ДАННЫЕ: ДОСТИЖЕНИЯ
-- ============================================================================

INSERT INTO achievements (code, name_ru, name_en, description_ru, description_en, icon, color, category, rarity, points_reward, requirement) VALUES

-- События (Events)
('first_event', 'Первое событие', 'First Event', 'Создайте своё первое событие', 'Create your first event', '🎉', '#3498db', 'events', 'common', 50, '{"type": "event_created", "count": 1}'::jsonb),
('event_master_10', 'Организатор-10', 'Organizer-10', 'Создайте 10 событий', 'Create 10 events', '📅', '#2ecc71', 'events', 'rare', 100, '{"type": "event_created", "count": 10}'::jsonb),
('event_master_50', 'Организатор-50', 'Organizer-50', 'Создайте 50 событий', 'Create 50 events', '🗓️', '#f39c12', 'events', 'epic', 300, '{"type": "event_created", "count": 50}'::jsonb),
('event_master_100', 'Организатор-100', 'Organizer-100', 'Создайте 100 событий', 'Create 100 events', '📆', '#e74c3c', 'events', 'legendary', 500, '{"type": "event_created", "count": 100}'::jsonb),

-- Участие (Participation)
('first_participation', 'Первое участие', 'First Participation', 'Присоединитесь к первому событию', 'Join your first event', '🎊', '#3498db', 'social', 'common', 30, '{"type": "event_participated", "count": 1}'::jsonb),
('social_10', 'Социальная бабочка-10', 'Social Butterfly-10', 'Посетите 10 событий', 'Attend 10 events', '🦋', '#9b59b6', 'social', 'rare', 100, '{"type": "event_participated", "count": 10}'::jsonb),
('social_50', 'Социальная бабочка-50', 'Social Butterfly-50', 'Посетите 50 событий', 'Attend 50 events', '🦋', '#9b59b6', 'social', 'epic', 300, '{"type": "event_participated", "count": 50}'::jsonb),
('social_100', 'Социальная бабочка-100', 'Social Butterfly-100', 'Посетите 100 событий', 'Attend 100 events', '🦋', '#9b59b6', 'social', 'legendary', 500, '{"type": "event_participated", "count": 100}'::jsonb),

-- Отзывы (Reviews)
('first_review', 'Первый отзыв', 'First Review', 'Оставьте свой первый отзыв', 'Leave your first review', '⭐', '#f39c12', 'social', 'common', 20, '{"type": "review_given", "count": 1}'::jsonb),
('critic', 'Критик', 'Critic', 'Оставьте 25 отзывов', 'Leave 25 reviews', '📝', '#e67e22', 'social', 'rare', 150, '{"type": "review_given", "count": 25}'::jsonb),

-- Уровни (Levels)
('level_5', 'Уровень 5', 'Level 5', 'Достигните 5-го уровня', 'Reach level 5', '⭐', '#f39c12', 'milestones', 'common', 50, '{"type": "level", "value": 5}'::jsonb),
('level_10', 'Уровень 10', 'Level 10', 'Достигните 10-го уровня', 'Reach level 10', '🏆', '#e74c3c', 'milestones', 'rare', 100, '{"type": "level", "value": 10}'::jsonb),
('level_25', 'Уровень 25', 'Level 25', 'Достигните 25-го уровня', 'Reach level 25', '💫', '#9b59b6', 'milestones', 'epic', 250, '{"type": "level", "value": 25}'::jsonb),
('level_50', 'Уровень 50', 'Level 50', 'Достигните 50-го уровня', 'Reach level 50', '👑', '#1abc9c', 'milestones', 'epic', 500, '{"type": "level", "value": 50}'::jsonb),
('level_100', 'Уровень 100', 'Level 100', 'Достигните 100-го уровня', 'Reach level 100', '💎', '#c0392b', 'milestones', 'legendary', 1000, '{"type": "level", "value": 100}'::jsonb),

-- Специальные (Special)
('early_bird', 'Ранняя пташка', 'Early Bird', 'Зарегистрируйтесь в первые 1000 пользователей', 'Be among first 1000 users', '🐦', '#3498db', 'special', 'rare', 100, '{"type": "registration_order", "max": 1000}'::jsonb),
('popular_organizer', 'Популярный организатор', 'Popular Organizer', 'Соберите 100+ участников на одно событие', 'Gather 100+ participants in one event', '🌟', '#f39c12', 'special', 'epic', 200, '{"type": "event_participants", "count": 100}'::jsonb),
('perfect_rating', 'Идеальный рейтинг', 'Perfect Rating', 'Получите средний рейтинг 5.0 на 10+ событиях', 'Maintain 5.0 rating across 10+ events', '💯', '#e74c3c', 'special', 'legendary', 300, '{"type": "avg_rating", "value": 5.0, "min_events": 10}'::jsonb)

ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 10. RLS ПОЛИТИКИ
-- ============================================================================

-- Включаем RLS для новых таблиц
ALTER TABLE levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_log ENABLE ROW LEVEL SECURITY;

-- Политики для levels (все могут читать)
CREATE POLICY "Все могут просматривать уровни"
  ON levels FOR SELECT
  USING (true);

-- Политики для achievements (все могут читать активные, кроме секретных)
CREATE POLICY "Все могут просматривать активные достижения"
  ON achievements FOR SELECT
  USING (is_active = TRUE AND is_secret = FALSE);

CREATE POLICY "Пользователи видят свои секретные достижения если разблокированы"
  ON achievements FOR SELECT
  USING (
    is_active = TRUE AND is_secret = TRUE AND
    id IN (
      SELECT achievement_id FROM user_achievements
      WHERE user_id = auth.uid() AND is_unlocked = TRUE
    )
  );

-- Политики для user_achievements (пользователи видят только свои)
CREATE POLICY "Пользователи видят свой прогресс по достижениям"
  ON user_achievements FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Система может создавать и обновлять прогресс"
  ON user_achievements FOR ALL
  USING (true)
  WITH CHECK (true);

-- Политики для experience_log (пользователи видят только свою историю)
CREATE POLICY "Пользователи видят свою историю опыта"
  ON experience_log FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Система может создавать записи в логе опыта"
  ON experience_log FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- 11. ИНДЕКСЫ ДЛЯ ОПТИМИЗАЦИИ
-- ============================================================================

-- Дополнительные индексы для profiles
CREATE INDEX IF NOT EXISTS idx_profiles_level ON profiles(level);
CREATE INDEX IF NOT EXISTS idx_profiles_experience ON profiles(experience_points DESC);

-- Индексы для быстрого поиска топов
CREATE INDEX IF NOT EXISTS idx_profiles_top_creators ON profiles(total_events_created DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_top_participants ON profiles(total_events_participated DESC);

-- ============================================================================
-- ЗАВЕРШЕНИЕ МИГРАЦИИ
-- ============================================================================

-- Инициализация member_since для существующих пользователей
UPDATE profiles
SET member_since = created_at
WHERE member_since IS NULL;

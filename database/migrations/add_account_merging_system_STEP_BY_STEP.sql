-- =============================================
-- Система слияния аккаунтов пользователей
-- ПОШАГОВАЯ ИНСТРУКЦИЯ ПО ПРИМЕНЕНИЮ
-- Дата создания: 2025-01-27
-- =============================================

-- ШАГ 1: Создание таблицы account_merge_requests
-- Выполните этот блок отдельно в Supabase SQL Editor

CREATE TABLE IF NOT EXISTS account_merge_requests (
  id BIGSERIAL PRIMARY KEY,
  primary_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  secondary_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  merge_type VARCHAR(30) NOT NULL CHECK (merge_type IN ('email_duplicate', 'manual_request', 'admin_initiated')),
  merged_data JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT different_accounts CHECK (primary_user_id != secondary_user_id),
  CONSTRAINT unique_merge_request UNIQUE (primary_user_id, secondary_user_id)
);

-- ШАГ 2: Добавление комментариев и индексов
-- Выполните этот блок после успешного выполнения Шага 1

COMMENT ON TABLE account_merge_requests IS 'Запросы на слияние аккаунтов пользователей';
COMMENT ON COLUMN account_merge_requests.primary_user_id IS 'ID основного аккаунта (данные будут сохранены в него)';
COMMENT ON COLUMN account_merge_requests.secondary_user_id IS 'ID вторичного аккаунта (данные будут перенесены из него и он будет удалён)';
COMMENT ON COLUMN account_merge_requests.merged_data IS 'JSONB с информацией о перенесённых данных';

CREATE INDEX IF NOT EXISTS idx_account_merge_requests_primary_user
  ON account_merge_requests(primary_user_id);
CREATE INDEX IF NOT EXISTS idx_account_merge_requests_secondary_user
  ON account_merge_requests(secondary_user_id);
CREATE INDEX IF NOT EXISTS idx_account_merge_requests_status
  ON account_merge_requests(status);

-- ШАГ 3: Включение RLS и создание политик
-- Выполните этот блок после успешного выполнения Шага 2

ALTER TABLE account_merge_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Пользователи видят только свои запросы на слияние"
  ON account_merge_requests FOR SELECT
  USING (primary_user_id = auth.uid() OR secondary_user_id = auth.uid());

CREATE POLICY "Пользователи могут создавать запросы для себя"
  ON account_merge_requests FOR INSERT
  WITH CHECK (primary_user_id = auth.uid());

CREATE POLICY "Пользователи могут отменять свои запросы"
  ON account_merge_requests FOR UPDATE
  USING (primary_user_id = auth.uid() OR secondary_user_id = auth.uid())
  WITH CHECK (status = 'cancelled');

-- ШАГ 4: Создание функции find_potential_duplicate_accounts
-- Выполните этот блок после успешного выполнения Шага 3

CREATE OR REPLACE FUNCTION find_potential_duplicate_accounts(
  p_user_id UUID
)
RETURNS TABLE (
  duplicate_user_id UUID,
  duplicate_email TEXT,
  duplicate_name TEXT,
  match_reason TEXT,
  similarity_score INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_email TEXT;
  v_user_name TEXT;
BEGIN
  -- Получаем данные текущего пользователя
  SELECT au.email, pr.full_name
  INTO v_user_email, v_user_name
  FROM auth.users au
  LEFT JOIN profiles pr ON pr.id = au.id
  WHERE au.id = p_user_id;

  -- Ищем дубликаты
  RETURN QUERY
  WITH potential_matches AS (
    SELECT
      pr.id,
      au.email,
      pr.full_name,
      CASE
        WHEN au.email = v_user_email THEN 'Одинаковый email'
        WHEN LOWER(pr.full_name) = LOWER(v_user_name) AND au.email ILIKE '%' || SPLIT_PART(v_user_email, '@', 1) || '%'
          THEN 'Похожее имя и часть email'
        WHEN LOWER(pr.full_name) = LOWER(v_user_name)
          THEN 'Одинаковое имя'
        ELSE 'Другое совпадение'
      END as reason,
      CASE
        WHEN au.email = v_user_email THEN 100
        WHEN LOWER(pr.full_name) = LOWER(v_user_name) THEN 70
        WHEN au.email ILIKE '%' || SPLIT_PART(v_user_email, '@', 1) || '%' THEN 50
        ELSE 30
      END as score
    FROM profiles pr
    JOIN auth.users au ON au.id = pr.id
    WHERE pr.id != p_user_id
      AND pr.id NOT IN (
        SELECT secondary_user_id FROM account_merge_requests
        WHERE primary_user_id = p_user_id AND status = 'completed'
      )
      AND (
        au.email = v_user_email
        OR LOWER(pr.full_name) = LOWER(v_user_name)
        OR au.email ILIKE '%' || SPLIT_PART(v_user_email, '@', 1) || '%'
      )
  )
  SELECT
    id,
    email,
    full_name,
    reason,
    score
  FROM potential_matches
  ORDER BY score DESC
  LIMIT 10;
END;
$$;

COMMENT ON FUNCTION find_potential_duplicate_accounts IS 'Находит потенциальные дубликаты аккаунта пользователя';

-- ШАГ 5: Создание функции merge_user_accounts
-- Выполните этот блок после успешного выполнения Шага 4
-- ВНИМАНИЕ: Эта функция необратимо удаляет вторичный аккаунт!

CREATE OR REPLACE FUNCTION merge_user_accounts(
  p_primary_user_id UUID,
  p_secondary_user_id UUID,
  p_merge_type VARCHAR(30) DEFAULT 'manual_request'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_merge_request_id BIGINT;
  v_events_count INTEGER := 0;
  v_participations_count INTEGER := 0;
  v_reviews_count INTEGER := 0;
  v_referrals_count INTEGER := 0;
  v_achievements_count INTEGER := 0;
  v_promo_usages_count INTEGER := 0;
  v_primary_xp INTEGER;
  v_secondary_xp INTEGER;
  v_total_xp INTEGER;
  v_error_msg TEXT := NULL;
BEGIN
  -- Проверки
  IF p_primary_user_id = p_secondary_user_id THEN
    RAISE EXCEPTION 'Невозможно объединить аккаунт сам с собой';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_primary_user_id) THEN
    RAISE EXCEPTION 'Основной аккаунт не найден';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_secondary_user_id) THEN
    RAISE EXCEPTION 'Вторичный аккаунт не найден';
  END IF;

  -- Создаём запрос на слияние
  INSERT INTO account_merge_requests (primary_user_id, secondary_user_id, merge_type)
  VALUES (p_primary_user_id, p_secondary_user_id, p_merge_type)
  RETURNING id INTO v_merge_request_id;

  BEGIN
    -- 1. События
    UPDATE events SET creator_id = p_primary_user_id WHERE creator_id = p_secondary_user_id;
    GET DIAGNOSTICS v_events_count = ROW_COUNT;

    -- 2. Участия
    UPDATE event_participants SET user_id = p_primary_user_id
    WHERE user_id = p_secondary_user_id
      AND event_id NOT IN (SELECT event_id FROM event_participants WHERE user_id = p_primary_user_id);
    GET DIAGNOSTICS v_participations_count = ROW_COUNT;
    DELETE FROM event_participants WHERE user_id = p_secondary_user_id;

    -- 3. Отзывы
    UPDATE reviews SET user_id = p_primary_user_id
    WHERE user_id = p_secondary_user_id
      AND event_id NOT IN (SELECT event_id FROM reviews WHERE user_id = p_primary_user_id);
    GET DIAGNOSTICS v_reviews_count = ROW_COUNT;
    DELETE FROM reviews WHERE user_id = p_secondary_user_id;

    -- 4. Рефералы
    UPDATE profiles SET referred_by = p_primary_user_id WHERE referred_by = p_secondary_user_id;
    GET DIAGNOSTICS v_referrals_count = ROW_COUNT;

    -- 5. Достижения (если таблица существует)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_achievements') THEN
      UPDATE user_achievements SET user_id = p_primary_user_id
      WHERE user_id = p_secondary_user_id
        AND achievement_id NOT IN (SELECT achievement_id FROM user_achievements WHERE user_id = p_primary_user_id);
      GET DIAGNOSTICS v_achievements_count = ROW_COUNT;
      DELETE FROM user_achievements WHERE user_id = p_secondary_user_id;
    END IF;

    -- 6. Промокоды (если таблица существует)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'promo_code_usages') THEN
      UPDATE promo_code_usages SET user_id = p_primary_user_id WHERE user_id = p_secondary_user_id;
      GET DIAGNOSTICS v_promo_usages_count = ROW_COUNT;
    END IF;

    -- 7. XP и уровни (если колонки существуют)
    SELECT COALESCE(experience_points, 0) INTO v_primary_xp FROM profiles WHERE id = p_primary_user_id;
    SELECT COALESCE(experience_points, 0) INTO v_secondary_xp FROM profiles WHERE id = p_secondary_user_id;
    v_total_xp := v_primary_xp + v_secondary_xp;

    IF v_total_xp > 0 THEN
      UPDATE profiles SET experience_points = v_total_xp, level = FLOOR(v_total_xp / 1000) + 1
      WHERE id = p_primary_user_id;
    END IF;

    -- 8. Чаты (если таблица существует)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages') THEN
      UPDATE chat_messages SET user_id = p_primary_user_id WHERE user_id = p_secondary_user_id;
    END IF;

    -- 9. Уведомления
    UPDATE notifications SET user_id = p_primary_user_id WHERE user_id = p_secondary_user_id;

    -- 10. Удаляем вторичный профиль
    DELETE FROM profiles WHERE id = p_secondary_user_id;

    -- Обновляем статус
    UPDATE account_merge_requests
    SET status = 'completed', completed_at = NOW(),
        merged_data = jsonb_build_object(
          'events_transferred', v_events_count,
          'participations_transferred', v_participations_count,
          'reviews_transferred', v_reviews_count,
          'referrals_transferred', v_referrals_count,
          'achievements_transferred', v_achievements_count,
          'promo_usages_transferred', v_promo_usages_count,
          'total_xp', v_total_xp
        )
    WHERE id = v_merge_request_id;

  EXCEPTION WHEN OTHERS THEN
    v_error_msg := SQLERRM;
    UPDATE account_merge_requests
    SET status = 'failed', error_message = v_error_msg, completed_at = NOW()
    WHERE id = v_merge_request_id;
    RAISE EXCEPTION 'Ошибка при слиянии: %', v_error_msg;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'merge_request_id', v_merge_request_id,
    'events_transferred', v_events_count,
    'participations_transferred', v_participations_count,
    'reviews_transferred', v_reviews_count,
    'referrals_transferred', v_referrals_count,
    'achievements_transferred', v_achievements_count,
    'promo_usages_transferred', v_promo_usages_count,
    'total_xp', v_total_xp
  );
END;
$$;

COMMENT ON FUNCTION merge_user_accounts IS 'Объединяет два аккаунта пользователя';

-- ШАГ 6: Создание VIEW для статистики
-- Выполните этот блок после успешного выполнения Шага 5

CREATE OR REPLACE VIEW account_merge_stats AS
SELECT
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600) FILTER (WHERE status = 'completed') as avg_completion_hours
FROM account_merge_requests
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

COMMENT ON VIEW account_merge_stats IS 'Статистика запросов на слияние аккаунтов';

-- =============================================
-- ГОТОВО!
-- Миграция успешно применена
-- =============================================

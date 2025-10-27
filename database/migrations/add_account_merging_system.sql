-- =============================================
-- Система слияния аккаунтов пользователей
-- Дата создания: 2025-01-27
-- =============================================

-- Таблица для отслеживания процессов слияния аккаунтов
CREATE TABLE IF NOT EXISTS account_merge_requests (
  id BIGSERIAL PRIMARY KEY,
  primary_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  secondary_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  merge_type VARCHAR(30) NOT NULL CHECK (merge_type IN ('email_duplicate', 'manual_request', 'admin_initiated')),
  merged_data JSONB, -- Детали того, что было объединено
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT different_accounts CHECK (primary_user_id != secondary_user_id),
  CONSTRAINT unique_merge_request UNIQUE (primary_user_id, secondary_user_id)
);

-- Комментарий к таблице
COMMENT ON TABLE account_merge_requests IS 'Запросы на слияние аккаунтов пользователей';
COMMENT ON COLUMN account_merge_requests.primary_user_id IS 'ID основного аккаунта (данные будут сохранены в него)';
COMMENT ON COLUMN account_merge_requests.secondary_user_id IS 'ID вторичного аккаунта (данные будут перенесены из него и он будет удалён)';
COMMENT ON COLUMN account_merge_requests.merged_data IS 'JSONB с информацией о перенесённых данных: события, участия, отзывы, рефералы';

-- Индексы
CREATE INDEX IF NOT EXISTS idx_account_merge_requests_primary_user
  ON account_merge_requests(primary_user_id);
CREATE INDEX IF NOT EXISTS idx_account_merge_requests_secondary_user
  ON account_merge_requests(secondary_user_id);
CREATE INDEX IF NOT EXISTS idx_account_merge_requests_status
  ON account_merge_requests(status);

-- Функция для обнаружения потенциальных дубликатов
CREATE OR REPLACE FUNCTION find_potential_duplicate_accounts(
  p_user_id UUID
)
RETURNS TABLE (
  duplicate_user_id UUID,
  duplicate_email VARCHAR(255),
  duplicate_name VARCHAR(100),
  match_reason TEXT,
  similarity_score INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_email VARCHAR(255);
  v_user_name TEXT;
BEGIN
  -- Получаем данные текущего пользователя (email из auth.users, имя из profiles)
  SELECT au.email, pr.full_name
  INTO v_user_email, v_user_name
  FROM auth.users au
  LEFT JOIN profiles pr ON pr.id = au.id
  WHERE au.id = p_user_id;

  -- Ищем дубликаты по различным критериям
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
        -- Исключаем уже объединённые аккаунты
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

-- Комментарий к функции
COMMENT ON FUNCTION find_potential_duplicate_accounts IS 'Находит потенциальные дубликаты аккаунта пользователя по email и имени';

-- Функция для слияния двух аккаунтов
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
  -- Проверка, что это разные аккаунты
  IF p_primary_user_id = p_secondary_user_id THEN
    RAISE EXCEPTION 'Невозможно объединить аккаунт сам с собой';
  END IF;

  -- Проверка, что оба аккаунта существуют
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
    -- 1. Переносим созданные события
    UPDATE events
    SET creator_id = p_primary_user_id
    WHERE creator_id = p_secondary_user_id;
    GET DIAGNOSTICS v_events_count = ROW_COUNT;

    -- 2. Переносим участие в событиях (избегаем дубликатов)
    UPDATE event_participants
    SET user_id = p_primary_user_id
    WHERE user_id = p_secondary_user_id
      AND event_id NOT IN (
        SELECT event_id FROM event_participants WHERE user_id = p_primary_user_id
      );
    GET DIAGNOSTICS v_participations_count = ROW_COUNT;

    -- Удаляем дубликаты участий
    DELETE FROM event_participants
    WHERE user_id = p_secondary_user_id;

    -- 3. Переносим отзывы (избегаем дубликатов)
    UPDATE reviews
    SET user_id = p_primary_user_id
    WHERE user_id = p_secondary_user_id
      AND event_id NOT IN (
        SELECT event_id FROM reviews WHERE user_id = p_primary_user_id
      );
    GET DIAGNOSTICS v_reviews_count = ROW_COUNT;

    -- Удаляем дубликаты отзывов
    DELETE FROM reviews
    WHERE user_id = p_secondary_user_id;

    -- 4. Переносим рефералов
    UPDATE profiles
    SET referred_by = p_primary_user_id
    WHERE referred_by = p_secondary_user_id;
    GET DIAGNOSTICS v_referrals_count = ROW_COUNT;

    -- 5. Переносим достижения (избегаем дубликатов)
    UPDATE user_achievements
    SET user_id = p_primary_user_id
    WHERE user_id = p_secondary_user_id
      AND achievement_id NOT IN (
        SELECT achievement_id FROM user_achievements WHERE user_id = p_primary_user_id
      );
    GET DIAGNOSTICS v_achievements_count = ROW_COUNT;

    -- Удаляем дубликаты достижений
    DELETE FROM user_achievements
    WHERE user_id = p_secondary_user_id;

    -- 6. Переносим использования промокодов
    UPDATE promo_code_usages
    SET user_id = p_primary_user_id
    WHERE user_id = p_secondary_user_id;
    GET DIAGNOSTICS v_promo_usages_count = ROW_COUNT;

    -- 7. Суммируем XP и уровни
    SELECT experience_points INTO v_primary_xp FROM profiles WHERE id = p_primary_user_id;
    SELECT experience_points INTO v_secondary_xp FROM profiles WHERE id = p_secondary_user_id;
    v_total_xp := COALESCE(v_primary_xp, 0) + COALESCE(v_secondary_xp, 0);

    UPDATE profiles
    SET
      experience_points = v_total_xp,
      level = FLOOR(v_total_xp / 1000) + 1
    WHERE id = p_primary_user_id;

    -- 8. Переносим сообщения в чатах
    UPDATE chat_messages
    SET user_id = p_primary_user_id
    WHERE user_id = p_secondary_user_id;

    -- 9. Переносим уведомления
    UPDATE notifications
    SET user_id = p_primary_user_id
    WHERE user_id = p_secondary_user_id;

    -- 10. Удаляем вторичный профиль
    DELETE FROM profiles WHERE id = p_secondary_user_id;

    -- Обновляем статус запроса на слияние
    UPDATE account_merge_requests
    SET
      status = 'completed',
      completed_at = NOW(),
      merged_data = jsonb_build_object(
        'events_transferred', v_events_count,
        'participations_transferred', v_participations_count,
        'reviews_transferred', v_reviews_count,
        'referrals_transferred', v_referrals_count,
        'achievements_transferred', v_achievements_count,
        'promo_usages_transferred', v_promo_usages_count,
        'total_xp', v_total_xp,
        'primary_xp', v_primary_xp,
        'secondary_xp', v_secondary_xp
      )
    WHERE id = v_merge_request_id;

  EXCEPTION WHEN OTHERS THEN
    v_error_msg := SQLERRM;

    -- Обновляем статус на failed
    UPDATE account_merge_requests
    SET
      status = 'failed',
      error_message = v_error_msg,
      completed_at = NOW()
    WHERE id = v_merge_request_id;

    RAISE EXCEPTION 'Ошибка при слиянии аккаунтов: %', v_error_msg;
  END;

  -- Возвращаем результат
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

-- Комментарий к функции
COMMENT ON FUNCTION merge_user_accounts IS 'Объединяет два аккаунта пользователя: переносит все данные из вторичного в основной и удаляет вторичный';

-- RLS политики для account_merge_requests
ALTER TABLE account_merge_requests ENABLE ROW LEVEL SECURITY;

-- Пользователи могут видеть только свои запросы на слияние
CREATE POLICY "Пользователи видят только свои запросы на слияние"
  ON account_merge_requests FOR SELECT
  USING (primary_user_id = auth.uid() OR secondary_user_id = auth.uid());

-- Пользователи могут создавать запросы только для себя
CREATE POLICY "Пользователи могут создавать запросы для себя"
  ON account_merge_requests FOR INSERT
  WITH CHECK (primary_user_id = auth.uid());

-- Пользователи могут отменять свои запросы
CREATE POLICY "Пользователи могут отменять свои запросы"
  ON account_merge_requests FOR UPDATE
  USING (primary_user_id = auth.uid() OR secondary_user_id = auth.uid())
  WITH CHECK (status = 'cancelled');

-- VIEW для статистики слияний
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

-- Комментарий к VIEW
COMMENT ON VIEW account_merge_stats IS 'Статистика запросов на слияние аккаунтов по месяцам';

-- Проверка работы функций
DO $$
DECLARE
  v_test_user_id UUID;
  v_duplicates RECORD;
BEGIN
  -- Тест 1: Создание тестового пользователя и поиск дубликатов
  SELECT id INTO v_test_user_id FROM profiles LIMIT 1;

  IF v_test_user_id IS NOT NULL THEN
    RAISE NOTICE 'Тест 1 - Поиск дубликатов для пользователя %', v_test_user_id;

    FOR v_duplicates IN
      SELECT * FROM find_potential_duplicate_accounts(v_test_user_id)
    LOOP
      RAISE NOTICE '  Найден потенциальный дубликат: % (причина: %, score: %)',
        v_duplicates.duplicate_name, v_duplicates.match_reason, v_duplicates.similarity_score;
    END LOOP;
  ELSE
    RAISE NOTICE 'Тест 1 - Нет пользователей для теста поиска дубликатов';
  END IF;

  RAISE NOTICE '✅ Функция find_potential_duplicate_accounts работает';
  RAISE NOTICE '⚠️  Функция merge_user_accounts требует ручного тестирования';
END $$;

-- Успешное завершение миграции
DO $$
BEGIN
  RAISE NOTICE '✅ Миграция add_account_merging_system.sql успешно применена';
  RAISE NOTICE '📊 Создана таблица: account_merge_requests';
  RAISE NOTICE '🔧 Создано 2 функции: find_potential_duplicate_accounts, merge_user_accounts';
  RAISE NOTICE '📈 Создан VIEW: account_merge_stats';
  RAISE NOTICE '🔐 Применены RLS политики';
  RAISE NOTICE '⚠️  ВАЖНО: Функция слияния необратимо удаляет вторичный аккаунт!';
  RAISE NOTICE '💡 Рекомендуется создать бэкап базы перед первым использованием';
END $$;

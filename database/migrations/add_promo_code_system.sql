-- Миграция: Система промокодов
-- Дата: 2025-10-26
-- Описание: Добавляет систему промокодов для скидок на события

-- ============================================================================
-- 1. ТАБЛИЦА ПРОМОКОДОВ
-- ============================================================================

CREATE TABLE IF NOT EXISTS promo_codes (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL, -- 'percentage', 'fixed', 'free'
  discount_value NUMERIC(10, 2) NOT NULL,
  applicable_categories TEXT[], -- NULL = все категории
  min_price NUMERIC(10, 2) DEFAULT 0,
  max_uses INTEGER, -- NULL = неограниченно
  current_uses INTEGER DEFAULT 0,
  max_uses_per_user INTEGER DEFAULT 1,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE promo_codes IS 'Промокоды для скидок на создание событий';
COMMENT ON COLUMN promo_codes.code IS 'Уникальный код промокода (например: SUMMER2025)';
COMMENT ON COLUMN promo_codes.discount_type IS 'Тип скидки: percentage (процент), fixed (фиксированная сумма), free (бесплатно)';
COMMENT ON COLUMN promo_codes.discount_value IS 'Значение скидки (10 = 10% или 10 рублей в зависимости от типа)';
COMMENT ON COLUMN promo_codes.applicable_categories IS 'Массив категорий, к которым применим промокод (NULL = все)';
COMMENT ON COLUMN promo_codes.min_price IS 'Минимальная цена события для применения промокода';
COMMENT ON COLUMN promo_codes.max_uses IS 'Максимальное количество использований (NULL = без ограничений)';
COMMENT ON COLUMN promo_codes.max_uses_per_user IS 'Максимальное количество использований одним пользователем';

-- Проверочные ограничения
ALTER TABLE promo_codes
ADD CONSTRAINT check_discount_type
  CHECK (discount_type IN ('percentage', 'fixed', 'free')),
ADD CONSTRAINT check_discount_value_positive
  CHECK (discount_value >= 0),
ADD CONSTRAINT check_percentage_range
  CHECK (discount_type != 'percentage' OR (discount_value >= 0 AND discount_value <= 100)),
ADD CONSTRAINT check_min_price_positive
  CHECK (min_price >= 0),
ADD CONSTRAINT check_max_uses_positive
  CHECK (max_uses IS NULL OR max_uses > 0),
ADD CONSTRAINT check_max_uses_per_user_positive
  CHECK (max_uses_per_user > 0),
ADD CONSTRAINT check_current_uses_not_exceed_max
  CHECK (max_uses IS NULL OR current_uses <= max_uses),
ADD CONSTRAINT check_valid_dates
  CHECK (valid_until IS NULL OR valid_until > valid_from);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(UPPER(code));
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active, valid_from, valid_until) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_promo_codes_categories ON promo_codes USING GIN(applicable_categories);

-- ============================================================================
-- 2. ТАБЛИЦА ИСПОЛЬЗОВАНИЯ ПРОМОКОДОВ
-- ============================================================================

CREATE TABLE IF NOT EXISTS promo_code_usages (
  id BIGSERIAL PRIMARY KEY,
  promo_code_id BIGINT NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  original_price NUMERIC(10, 2) NOT NULL,
  discount_amount NUMERIC(10, 2) NOT NULL,
  final_price NUMERIC(10, 2) NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(promo_code_id, event_id)
);

COMMENT ON TABLE promo_code_usages IS 'История использования промокодов';
COMMENT ON COLUMN promo_code_usages.original_price IS 'Оригинальная цена события';
COMMENT ON COLUMN promo_code_usages.discount_amount IS 'Размер скидки';
COMMENT ON COLUMN promo_code_usages.final_price IS 'Итоговая цена после применения промокода';

-- Индексы
CREATE INDEX IF NOT EXISTS idx_promo_code_usages_promo ON promo_code_usages(promo_code_id, used_at DESC);
CREATE INDEX IF NOT EXISTS idx_promo_code_usages_user ON promo_code_usages(user_id, used_at DESC);
CREATE INDEX IF NOT EXISTS idx_promo_code_usages_event ON promo_code_usages(event_id);

-- ============================================================================
-- 3. ФУНКЦИЯ ВАЛИДАЦИИ ПРОМОКОДА
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_promo_code(
  p_code VARCHAR(50),
  p_user_id UUID,
  p_category VARCHAR(50),
  p_price NUMERIC(10, 2)
)
RETURNS TABLE(
  is_valid BOOLEAN,
  promo_code_id BIGINT,
  discount_type VARCHAR(20),
  discount_value NUMERIC(10, 2),
  discount_amount NUMERIC(10, 2),
  final_price NUMERIC(10, 2),
  error_message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_promo promo_codes%ROWTYPE;
  v_user_usage_count INTEGER;
  v_discount_amount NUMERIC(10, 2);
  v_final_price NUMERIC(10, 2);
BEGIN
  -- Нормализуем код
  p_code := UPPER(TRIM(p_code));

  -- Получаем промокод
  SELECT * INTO v_promo
  FROM promo_codes
  WHERE UPPER(code) = p_code;

  -- Проверка 1: Существует ли промокод
  IF v_promo.id IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::BIGINT, NULL::VARCHAR(20), NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, 'Промокод не найден'::TEXT;
    RETURN;
  END IF;

  -- Проверка 2: Активен ли промокод
  IF NOT v_promo.is_active THEN
    RETURN QUERY SELECT FALSE, v_promo.id, NULL::VARCHAR(20), NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, 'Промокод неактивен'::TEXT;
    RETURN;
  END IF;

  -- Проверка 3: Действует ли промокод по датам
  IF v_promo.valid_from > NOW() THEN
    RETURN QUERY SELECT FALSE, v_promo.id, NULL::VARCHAR(20), NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, 'Промокод ещё не действует'::TEXT;
    RETURN;
  END IF;

  IF v_promo.valid_until IS NOT NULL AND v_promo.valid_until < NOW() THEN
    RETURN QUERY SELECT FALSE, v_promo.id, NULL::VARCHAR(20), NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, 'Срок действия промокода истёк'::TEXT;
    RETURN;
  END IF;

  -- Проверка 4: Не исчерпан ли лимит использований
  IF v_promo.max_uses IS NOT NULL AND v_promo.current_uses >= v_promo.max_uses THEN
    RETURN QUERY SELECT FALSE, v_promo.id, NULL::VARCHAR(20), NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, 'Превышен лимит использований промокода'::TEXT;
    RETURN;
  END IF;

  -- Проверка 5: Не превышен ли лимит использований пользователем
  SELECT COUNT(*) INTO v_user_usage_count
  FROM promo_code_usages
  WHERE promo_code_id = v_promo.id AND user_id = p_user_id;

  IF v_user_usage_count >= v_promo.max_uses_per_user THEN
    RETURN QUERY SELECT FALSE, v_promo.id, NULL::VARCHAR(20), NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, 'Вы уже использовали этот промокод'::TEXT;
    RETURN;
  END IF;

  -- Проверка 6: Подходит ли категория события
  IF v_promo.applicable_categories IS NOT NULL AND NOT (p_category = ANY(v_promo.applicable_categories)) THEN
    RETURN QUERY SELECT FALSE, v_promo.id, NULL::VARCHAR(20), NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, 'Промокод не применим к этой категории'::TEXT;
    RETURN;
  END IF;

  -- Проверка 7: Достаточна ли цена события
  IF p_price < v_promo.min_price THEN
    RETURN QUERY SELECT FALSE, v_promo.id, NULL::VARCHAR(20), NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC,
      'Минимальная цена события для применения промокода: ' || v_promo.min_price::TEXT;
    RETURN;
  END IF;

  -- Вычисляем скидку
  CASE v_promo.discount_type
    WHEN 'percentage' THEN
      v_discount_amount := ROUND(p_price * v_promo.discount_value / 100, 2);
    WHEN 'fixed' THEN
      v_discount_amount := LEAST(v_promo.discount_value, p_price);
    WHEN 'free' THEN
      v_discount_amount := p_price;
    ELSE
      v_discount_amount := 0;
  END CASE;

  v_final_price := GREATEST(p_price - v_discount_amount, 0);

  -- Возвращаем успешный результат
  RETURN QUERY SELECT TRUE, v_promo.id, v_promo.discount_type, v_promo.discount_value,
    v_discount_amount, v_final_price, NULL::TEXT;
END;
$$;

COMMENT ON FUNCTION validate_promo_code IS 'Проверяет валидность промокода и вычисляет скидку';

-- ============================================================================
-- 4. ФУНКЦИЯ ПРИМЕНЕНИЯ ПРОМОКОДА
-- ============================================================================

CREATE OR REPLACE FUNCTION apply_promo_code(
  p_code VARCHAR(50),
  p_user_id UUID,
  p_event_id UUID,
  p_category VARCHAR(50),
  p_original_price NUMERIC(10, 2)
)
RETURNS TABLE(
  success BOOLEAN,
  discount_amount NUMERIC(10, 2),
  final_price NUMERIC(10, 2),
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_validation record;
  v_promo_code_id BIGINT;
BEGIN
  -- Валидируем промокод
  SELECT * INTO v_validation
  FROM validate_promo_code(p_code, p_user_id, p_category, p_original_price);

  IF NOT v_validation.is_valid THEN
    RETURN QUERY SELECT FALSE, NULL::NUMERIC, NULL::NUMERIC, v_validation.error_message;
    RETURN;
  END IF;

  v_promo_code_id := v_validation.promo_code_id;

  -- Создаём запись об использовании
  INSERT INTO promo_code_usages (
    promo_code_id, user_id, event_id,
    original_price, discount_amount, final_price
  ) VALUES (
    v_promo_code_id, p_user_id, p_event_id,
    p_original_price, v_validation.discount_amount, v_validation.final_price
  );

  -- Обновляем счётчик использований
  UPDATE promo_codes
  SET current_uses = current_uses + 1
  WHERE id = v_promo_code_id;

  -- Возвращаем успешный результат
  RETURN QUERY SELECT TRUE, v_validation.discount_amount, v_validation.final_price, NULL::TEXT;
END;
$$;

COMMENT ON FUNCTION apply_promo_code IS 'Применяет промокод к событию и записывает использование';

-- ============================================================================
-- 5. ТРИГГЕР ДЛЯ ОБНОВЛЕНИЯ updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_promo_code_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_promo_code_timestamp
BEFORE UPDATE ON promo_codes
FOR EACH ROW
EXECUTE FUNCTION update_promo_code_timestamp();

-- ============================================================================
-- 6. RLS ПОЛИТИКИ
-- ============================================================================

-- Включаем RLS
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_usages ENABLE ROW LEVEL SECURITY;

-- Политики для promo_codes
CREATE POLICY "Все могут просматривать активные промокоды"
  ON promo_codes FOR SELECT
  USING (is_active = TRUE AND (valid_until IS NULL OR valid_until > NOW()));

CREATE POLICY "Создатели могут управлять своими промокодами"
  ON promo_codes FOR ALL
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Администраторы могут управлять всеми промокодами (нужно будет настроить роль admin)
CREATE POLICY "Администраторы могут управлять промокодами"
  ON promo_codes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Политики для promo_code_usages
CREATE POLICY "Пользователи видят свою историю использования"
  ON promo_code_usages FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Система может создавать записи об использовании"
  ON promo_code_usages FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- 7. НАЧАЛЬНЫЕ ДАННЫЕ: ПРОМОКОДЫ ДЛЯ ПРИМЕРА
-- ============================================================================

INSERT INTO promo_codes (
  code, name, description, discount_type, discount_value,
  applicable_categories, min_price, max_uses, valid_from, valid_until
) VALUES
(
  'WELCOME2025',
  'Приветственная скидка',
  'Скидка 20% на первое событие для новых пользователей',
  'percentage',
  20.0,
  NULL,
  0,
  1000,
  NOW(),
  NOW() + INTERVAL '3 months'
),
(
  'BOARDGAMES50',
  'Скидка на настольные игры',
  'Скидка 50% на события категории "Настольные игры"',
  'percentage',
  50.0,
  ARRAY['board_games'],
  0,
  NULL,
  NOW(),
  NOW() + INTERVAL '1 month'
),
(
  'FREEFIRST',
  'Первое событие бесплатно',
  'Бесплатное создание первого события (до 500₽)',
  'fixed',
  500.0,
  NULL,
  0,
  500,
  NOW(),
  NOW() + INTERVAL '6 months'
)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 8. ИНДЕКСЫ ДЛЯ АНАЛИТИКИ
-- ============================================================================

-- Индекс для статистики использований
CREATE INDEX IF NOT EXISTS idx_promo_code_usages_stats
  ON promo_code_usages(promo_code_id, used_at DESC);

-- Индекс для поиска по пользователю и промокоду
CREATE INDEX IF NOT EXISTS idx_promo_code_usages_user_promo
  ON promo_code_usages(user_id, promo_code_id);

-- ============================================================================
-- 9. ПРЕДСТАВЛЕНИЕ ДЛЯ СТАТИСТИКИ ПРОМОКОДОВ
-- ============================================================================

CREATE OR REPLACE VIEW promo_code_stats AS
SELECT
  pc.id,
  pc.code,
  pc.name,
  pc.discount_type,
  pc.discount_value,
  pc.max_uses,
  pc.current_uses,
  COALESCE(usage_stats.total_discount, 0) as total_discount_given,
  COALESCE(usage_stats.unique_users, 0) as unique_users,
  COALESCE(usage_stats.avg_discount, 0) as avg_discount_per_use,
  pc.is_active,
  pc.valid_from,
  pc.valid_until
FROM promo_codes pc
LEFT JOIN (
  SELECT
    promo_code_id,
    SUM(discount_amount) as total_discount,
    COUNT(DISTINCT user_id) as unique_users,
    AVG(discount_amount) as avg_discount
  FROM promo_code_usages
  GROUP BY promo_code_id
) usage_stats ON pc.id = usage_stats.promo_code_id;

COMMENT ON VIEW promo_code_stats IS 'Статистика использования промокодов';

-- ============================================================================
-- 10. ФУНКЦИЯ ДЕАКТИВАЦИИ ИСТЁКШИХ ПРОМОКОДОВ
-- ============================================================================

CREATE OR REPLACE FUNCTION deactivate_expired_promo_codes()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE promo_codes
  SET is_active = FALSE, updated_at = NOW()
  WHERE is_active = TRUE
    AND (
      (valid_until IS NOT NULL AND valid_until < NOW())
      OR (max_uses IS NOT NULL AND current_uses >= max_uses)
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION deactivate_expired_promo_codes IS 'Деактивирует истёкшие или исчерпанные промокоды';

-- Можно запускать через cron или вручную:
-- SELECT deactivate_expired_promo_codes();

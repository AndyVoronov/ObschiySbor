-- =============================================
-- Система комиссий сервиса и периодических скидок
-- Дата создания: 2025-01-27
-- =============================================

-- Таблица настроек комиссии сервиса
CREATE TABLE IF NOT EXISTS service_commission_settings (
  id BIGSERIAL PRIMARY KEY,
  base_commission_percentage DECIMAL(5, 2) NOT NULL DEFAULT 10.00 CHECK (base_commission_percentage >= 0 AND base_commission_percentage <= 100),
  is_active BOOLEAN DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Комментарий к таблице
COMMENT ON TABLE service_commission_settings IS 'Базовые настройки комиссии сервиса';
COMMENT ON COLUMN service_commission_settings.base_commission_percentage IS 'Базовая комиссия сервиса в процентах (по умолчанию 10%)';

-- Таблица периодических скидок на комиссию
CREATE TABLE IF NOT EXISTS commission_discount_periods (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  discount_percentage DECIMAL(5, 2) NOT NULL CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  applicable_categories TEXT[], -- Если NULL, то применяется ко всем категориям
  min_event_price DECIMAL(10, 2) DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_date_range CHECK (end_date > start_date)
);

-- Комментарий к таблице
COMMENT ON TABLE commission_discount_periods IS 'Периодические скидки на комиссию сервиса (акции, праздничные периоды)';
COMMENT ON COLUMN commission_discount_periods.discount_percentage IS 'Процент скидки на комиссию (100% = бесплатно)';

-- Индексы для быстрого поиска активных периодов
CREATE INDEX IF NOT EXISTS idx_commission_discount_periods_active_dates
  ON commission_discount_periods(is_active, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_commission_discount_periods_dates
  ON commission_discount_periods(start_date, end_date);

-- Функция для расчёта комиссии с учётом скидок
CREATE OR REPLACE FUNCTION calculate_commission(
  p_event_price DECIMAL(10, 2),
  p_category VARCHAR(50),
  p_event_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  base_commission DECIMAL(10, 2),
  discount_percentage DECIMAL(5, 2),
  final_commission DECIMAL(10, 2),
  discount_period_id BIGINT,
  discount_period_name VARCHAR(100)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_base_commission_pct DECIMAL(5, 2);
  v_base_commission DECIMAL(10, 2);
  v_discount DECIMAL(5, 2) := 0;
  v_final_commission DECIMAL(10, 2);
  v_discount_period RECORD;
BEGIN
  -- Получаем базовую комиссию
  SELECT base_commission_percentage INTO v_base_commission_pct
  FROM service_commission_settings
  WHERE is_active = TRUE
  ORDER BY created_at DESC
  LIMIT 1;

  -- Если настройки не заданы, используем 10%
  IF v_base_commission_pct IS NULL THEN
    v_base_commission_pct := 10.00;
  END IF;

  -- Рассчитываем базовую комиссию
  v_base_commission := ROUND(p_event_price * v_base_commission_pct / 100, 2);

  -- Ищем активный период скидки
  SELECT * INTO v_discount_period
  FROM commission_discount_periods
  WHERE is_active = TRUE
    AND p_event_date BETWEEN start_date AND end_date
    AND (applicable_categories IS NULL OR p_category = ANY(applicable_categories))
    AND p_event_price >= min_event_price
  ORDER BY discount_percentage DESC -- Берём максимальную скидку
  LIMIT 1;

  -- Если нашли период скидки, применяем её
  IF v_discount_period.id IS NOT NULL THEN
    v_discount := v_discount_period.discount_percentage;
    v_final_commission := ROUND(v_base_commission * (100 - v_discount) / 100, 2);

    RETURN QUERY SELECT
      v_base_commission,
      v_discount,
      v_final_commission,
      v_discount_period.id,
      v_discount_period.name;
  ELSE
    -- Без скидки
    RETURN QUERY SELECT
      v_base_commission,
      0::DECIMAL(5, 2),
      v_base_commission,
      NULL::BIGINT,
      NULL::VARCHAR(100);
  END IF;
END;
$$;

-- Комментарий к функции
COMMENT ON FUNCTION calculate_commission IS 'Расчёт комиссии сервиса с учётом активных скидок';

-- Функция для деактивации истёкших периодов скидок
CREATE OR REPLACE FUNCTION deactivate_expired_commission_discounts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE commission_discount_periods
  SET is_active = FALSE, updated_at = NOW()
  WHERE is_active = TRUE
    AND end_date < NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Комментарий к функции
COMMENT ON FUNCTION deactivate_expired_commission_discounts IS 'Деактивирует истёкшие периоды скидок на комиссию (для cron)';

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_commission_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_commission_settings_updated_at
  BEFORE UPDATE ON service_commission_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_commission_settings_updated_at();

CREATE TRIGGER trigger_update_commission_discount_periods_updated_at
  BEFORE UPDATE ON commission_discount_periods
  FOR EACH ROW
  EXECUTE FUNCTION update_commission_settings_updated_at();

-- RLS политики для service_commission_settings
ALTER TABLE service_commission_settings ENABLE ROW LEVEL SECURITY;

-- Все пользователи могут читать настройки
CREATE POLICY "Все могут читать настройки комиссии"
  ON service_commission_settings FOR SELECT
  USING (TRUE);

-- Примечание: Политика для администраторов будет добавлена позже,
-- когда будет реализована система ролей с полем is_admin в profiles

-- RLS политики для commission_discount_periods
ALTER TABLE commission_discount_periods ENABLE ROW LEVEL SECURITY;

-- Все пользователи могут читать активные периоды скидок
CREATE POLICY "Все могут читать активные периоды скидок"
  ON commission_discount_periods FOR SELECT
  USING (is_active = TRUE);

-- Создатели могут управлять своими периодами
CREATE POLICY "Создатели могут управлять своими периодами скидок"
  ON commission_discount_periods FOR ALL
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- VIEW для статистики использования скидок
CREATE OR REPLACE VIEW commission_discount_stats AS
SELECT
  cdp.id,
  cdp.name,
  cdp.discount_percentage,
  cdp.start_date,
  cdp.end_date,
  cdp.is_active,
  COUNT(e.id) as events_during_period,
  SUM(e.price) as total_event_revenue,
  SUM(e.price * (SELECT base_commission_percentage FROM service_commission_settings WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 1) / 100 * cdp.discount_percentage / 100) as estimated_discount_amount
FROM commission_discount_periods cdp
LEFT JOIN events e ON e.event_date BETWEEN cdp.start_date AND cdp.end_date
  AND (cdp.applicable_categories IS NULL OR e.category = ANY(cdp.applicable_categories))
  AND e.price >= cdp.min_event_price
WHERE e.moderation_status = 'active'
GROUP BY cdp.id, cdp.name, cdp.discount_percentage, cdp.start_date, cdp.end_date, cdp.is_active;

-- Комментарий к VIEW
COMMENT ON VIEW commission_discount_stats IS 'Статистика использования периодов скидок на комиссию';

-- Вставка базовых настроек комиссии
INSERT INTO service_commission_settings (base_commission_percentage, description)
VALUES (10.00, 'Базовая комиссия сервиса 10%')
ON CONFLICT DO NOTHING;

-- Примеры периодов скидок (можно удалить после тестирования)

-- Новогодняя акция: 100% скидка на комиссию (бесплатно)
INSERT INTO commission_discount_periods (
  name,
  description,
  discount_percentage,
  start_date,
  end_date,
  is_active
) VALUES (
  'Новогодняя акция 2025',
  'Создавайте события бесплатно в новогодние праздники!',
  100.00,
  '2025-01-01 00:00:00',
  '2025-01-10 23:59:59',
  TRUE
) ON CONFLICT DO NOTHING;

-- Летняя скидка 50% на йогу и фитнес
INSERT INTO commission_discount_periods (
  name,
  description,
  discount_percentage,
  start_date,
  end_date,
  applicable_categories,
  is_active
) VALUES (
  'Летняя спортивная акция',
  '50% скидка на комиссию для спортивных событий',
  50.00,
  '2025-06-01 00:00:00',
  '2025-08-31 23:59:59',
  ARRAY['yoga', 'fitness', 'sports'],
  TRUE
) ON CONFLICT DO NOTHING;

-- Пятничная акция: 30% скидка на все события от 1000 рублей
INSERT INTO commission_discount_periods (
  name,
  description,
  discount_percentage,
  start_date,
  end_date,
  min_event_price,
  is_active
) VALUES (
  'Пятничная скидка',
  '30% скидка на комиссию по пятницам для платных событий',
  30.00,
  '2025-01-31 00:00:00',
  '2025-12-31 23:59:59',
  1000.00,
  TRUE
) ON CONFLICT DO NOTHING;

-- Проверка работы функции
DO $$
DECLARE
  v_result RECORD;
BEGIN
  -- Тест 1: Расчёт комиссии без скидки
  SELECT * INTO v_result FROM calculate_commission(1000.00, 'board_games', NOW());
  RAISE NOTICE 'Тест 1 - Без скидки: Базовая комиссия = %, Финальная = %', v_result.base_commission, v_result.final_commission;

  -- Тест 2: Расчёт комиссии со скидкой (если попадаем в период)
  SELECT * INTO v_result FROM calculate_commission(1000.00, 'yoga', '2025-07-01'::TIMESTAMPTZ);
  RAISE NOTICE 'Тест 2 - Со скидкой: Базовая = %, Скидка = %%, Финальная = %',
    v_result.base_commission, v_result.discount_percentage, v_result.final_commission;
END $$;

-- Успешное завершение миграции
DO $$
BEGIN
  RAISE NOTICE '✅ Миграция add_service_commission_system.sql успешно применена';
  RAISE NOTICE '📊 Создано 2 таблицы: service_commission_settings, commission_discount_periods';
  RAISE NOTICE '🔧 Создано 2 функции: calculate_commission, deactivate_expired_commission_discounts';
  RAISE NOTICE '📈 Создан VIEW: commission_discount_stats';
  RAISE NOTICE '🔐 Применены RLS политики';
  RAISE NOTICE '💡 Добавлены примеры периодов скидок (можно удалить)';
END $$;

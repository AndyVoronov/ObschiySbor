-- =====================================================
-- МИГРАЦИЯ: Система блокировки пользователей
-- Дата: 2025-10-20
-- Описание: Добавление функционала блокировки/разблокировки
--           пользователей с возможностью обжалования
-- =====================================================

-- ========================================
-- 1. Добавление полей блокировки в профили
-- ========================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS blocked_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS blocked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS block_reason TEXT;

-- Индекс для быстрого поиска заблокированных пользователей
CREATE INDEX IF NOT EXISTS idx_profiles_is_blocked ON profiles(is_blocked);
CREATE INDEX IF NOT EXISTS idx_profiles_blocked_until ON profiles(blocked_until);

-- ========================================
-- 2. Таблица истории блокировок
-- ========================================

CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  blocked_until TIMESTAMP WITH TIME ZONE, -- NULL = навсегда
  reason TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  unblocked_at TIMESTAMP WITH TIME ZONE,
  unblocked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  unblock_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_user_blocks_user_id ON user_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_is_active ON user_blocks(is_active);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked_by ON user_blocks(blocked_by);

COMMENT ON TABLE user_blocks IS 'История блокировок пользователей';
COMMENT ON COLUMN user_blocks.blocked_until IS 'NULL означает бессрочную блокировку';
COMMENT ON COLUMN user_blocks.is_active IS 'Активна ли блокировка в данный момент';

-- ========================================
-- 3. Таблица обжалований блокировок
-- ========================================

CREATE TABLE IF NOT EXISTS block_appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  block_id UUID NOT NULL REFERENCES user_blocks(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_block_appeals_user_id ON block_appeals(user_id);
CREATE INDEX IF NOT EXISTS idx_block_appeals_block_id ON block_appeals(block_id);
CREATE INDEX IF NOT EXISTS idx_block_appeals_status ON block_appeals(status);
CREATE INDEX IF NOT EXISTS idx_block_appeals_created_at ON block_appeals(created_at DESC);

COMMENT ON TABLE block_appeals IS 'Обжалования блокировок пользователями';
COMMENT ON COLUMN block_appeals.status IS 'pending - на рассмотрении, approved - одобрено, rejected - отклонено';

-- ========================================
-- 4. Функция для автоматической разблокировки
-- ========================================

CREATE OR REPLACE FUNCTION auto_unblock_users()
RETURNS void AS $$
BEGIN
  -- Разблокируем пользователей, у которых истек срок блокировки
  UPDATE profiles
  SET
    is_blocked = FALSE,
    blocked_at = NULL,
    blocked_until = NULL,
    blocked_by = NULL,
    block_reason = NULL
  WHERE
    is_blocked = TRUE
    AND blocked_until IS NOT NULL
    AND blocked_until < NOW();

  -- Деактивируем записи в истории блокировок
  UPDATE user_blocks
  SET
    is_active = FALSE,
    unblocked_at = NOW(),
    unblock_reason = 'Срок блокировки истёк (автоматически)'
  WHERE
    is_active = TRUE
    AND blocked_until IS NOT NULL
    AND blocked_until < NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_unblock_users IS 'Автоматическая разблокировка пользователей по истечении срока';

-- ========================================
-- 5. Функция для блокировки пользователя
-- ========================================

CREATE OR REPLACE FUNCTION block_user(
  p_user_id UUID,
  p_blocked_by UUID,
  p_reason TEXT,
  p_blocked_until TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_block_id UUID;
BEGIN
  -- Обновляем профиль пользователя
  UPDATE profiles
  SET
    is_blocked = TRUE,
    blocked_at = NOW(),
    blocked_until = p_blocked_until,
    blocked_by = p_blocked_by,
    block_reason = p_reason
  WHERE id = p_user_id;

  -- Создаём запись в истории блокировок
  INSERT INTO user_blocks (
    user_id,
    blocked_by,
    blocked_until,
    reason,
    is_active
  ) VALUES (
    p_user_id,
    p_blocked_by,
    p_blocked_until,
    p_reason,
    TRUE
  )
  RETURNING id INTO v_block_id;

  -- Создаём уведомление пользователю
  INSERT INTO notifications (user_id, type, message, created_at)
  VALUES (
    p_user_id,
    'account_blocked',
    CASE
      WHEN p_blocked_until IS NULL THEN
        'Ваш аккаунт заблокирован навсегда. Причина: ' || p_reason
      ELSE
        'Ваш аккаунт заблокирован до ' ||
        TO_CHAR(p_blocked_until, 'DD.MM.YYYY HH24:MI') ||
        '. Причина: ' || p_reason
    END,
    NOW()
  );

  RETURN v_block_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION block_user IS 'Блокировка пользователя с созданием записи в истории';

-- ========================================
-- 6. Функция для разблокировки пользователя
-- ========================================

CREATE OR REPLACE FUNCTION unblock_user(
  p_user_id UUID,
  p_unblocked_by UUID,
  p_reason TEXT DEFAULT 'Разблокирован администратором'
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Обновляем профиль пользователя
  UPDATE profiles
  SET
    is_blocked = FALSE,
    blocked_at = NULL,
    blocked_until = NULL,
    blocked_by = NULL,
    block_reason = NULL
  WHERE id = p_user_id;

  -- Деактивируем активные блокировки
  UPDATE user_blocks
  SET
    is_active = FALSE,
    unblocked_at = NOW(),
    unblocked_by = p_unblocked_by,
    unblock_reason = p_reason
  WHERE
    user_id = p_user_id
    AND is_active = TRUE;

  -- Создаём уведомление пользователю
  INSERT INTO notifications (user_id, type, message, created_at)
  VALUES (
    p_user_id,
    'account_unblocked',
    'Ваш аккаунт разблокирован. ' || p_reason,
    NOW()
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION unblock_user IS 'Разблокировка пользователя';

-- ========================================
-- 7. Триггер для обновления updated_at
-- ========================================

CREATE OR REPLACE FUNCTION update_block_appeals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF NOT EXISTS trigger_update_block_appeals_updated_at ON block_appeals;
CREATE TRIGGER trigger_update_block_appeals_updated_at
  BEFORE UPDATE ON block_appeals
  FOR EACH ROW
  EXECUTE FUNCTION update_block_appeals_updated_at();

-- ========================================
-- 8. Функция для обработки обжалования (одобрение)
-- ========================================

CREATE OR REPLACE FUNCTION approve_block_appeal(
  p_appeal_id UUID,
  p_reviewed_by UUID,
  p_admin_comment TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_block_id UUID;
BEGIN
  -- Получаем данные обжалования
  SELECT user_id, block_id INTO v_user_id, v_block_id
  FROM block_appeals
  WHERE id = p_appeal_id;

  -- Обновляем статус обжалования
  UPDATE block_appeals
  SET
    status = 'approved',
    reviewed_by = p_reviewed_by,
    reviewed_at = NOW(),
    admin_comment = p_admin_comment
  WHERE id = p_appeal_id;

  -- Разблокируем пользователя
  PERFORM unblock_user(
    v_user_id,
    p_reviewed_by,
    'Обжалование одобрено администратором'
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION approve_block_appeal IS 'Одобрение обжалования и разблокировка пользователя';

-- ========================================
-- 9. Функция для обработки обжалования (отклонение)
-- ========================================

CREATE OR REPLACE FUNCTION reject_block_appeal(
  p_appeal_id UUID,
  p_reviewed_by UUID,
  p_admin_comment TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Получаем ID пользователя
  SELECT user_id INTO v_user_id
  FROM block_appeals
  WHERE id = p_appeal_id;

  -- Обновляем статус обжалования
  UPDATE block_appeals
  SET
    status = 'rejected',
    reviewed_by = p_reviewed_by,
    reviewed_at = NOW(),
    admin_comment = p_admin_comment
  WHERE id = p_appeal_id;

  -- Уведомляем пользователя
  INSERT INTO notifications (user_id, type, message, created_at)
  VALUES (
    v_user_id,
    'appeal_rejected',
    'Ваше обжалование блокировки отклонено. ' || p_admin_comment,
    NOW()
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reject_block_appeal IS 'Отклонение обжалования блокировки';

-- ========================================
-- 10. RLS политики для user_blocks
-- ========================================

ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- Пользователи могут видеть свою историю блокировок
DROP POLICY IF EXISTS user_blocks_select_own ON user_blocks;
CREATE POLICY user_blocks_select_own ON user_blocks
  FOR SELECT
  USING (auth.uid() = user_id);

-- Админы и модераторы могут видеть все блокировки
DROP POLICY IF NOT EXISTS user_blocks_select_admin ON user_blocks;
CREATE POLICY user_blocks_select_admin ON user_blocks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );

-- Только админы могут создавать/обновлять блокировки
DROP POLICY IF EXISTS user_blocks_admin_all ON user_blocks;
CREATE POLICY user_blocks_admin_all ON user_blocks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );

-- ========================================
-- 11. RLS политики для block_appeals
-- ========================================

ALTER TABLE block_appeals ENABLE ROW LEVEL SECURITY;

-- Пользователи могут видеть свои обжалования
DROP POLICY IF EXISTS block_appeals_select_own ON block_appeals;
CREATE POLICY block_appeals_select_own ON block_appeals
  FOR SELECT
  USING (auth.uid() = user_id);

-- Пользователи могут создавать обжалования только для себя
DROP POLICY IF EXISTS block_appeals_insert_own ON block_appeals;
CREATE POLICY block_appeals_insert_own ON block_appeals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Админы могут видеть все обжалования
DROP POLICY IF EXISTS block_appeals_select_admin ON block_appeals;
CREATE POLICY block_appeals_select_admin ON block_appeals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );

-- Только админы могут обновлять обжалования
DROP POLICY IF EXISTS block_appeals_update_admin ON block_appeals;
CREATE POLICY block_appeals_update_admin ON block_appeals
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );

-- ========================================
-- 12. Комментарии и документация
-- ========================================

COMMENT ON COLUMN profiles.is_blocked IS 'Заблокирован ли пользователь';
COMMENT ON COLUMN profiles.blocked_at IS 'Дата и время блокировки';
COMMENT ON COLUMN profiles.blocked_until IS 'До какого времени заблокирован (NULL = навсегда)';
COMMENT ON COLUMN profiles.blocked_by IS 'Кто заблокировал (ссылка на админа)';
COMMENT ON COLUMN profiles.block_reason IS 'Причина блокировки';

-- ========================================
-- УСПЕШНОЕ ЗАВЕРШЕНИЕ МИГРАЦИИ
-- ========================================

-- Запускаем автоматическую разблокировку при запуске
SELECT auto_unblock_users();

-- Выводим сообщение об успехе
DO $$
BEGIN
  RAISE NOTICE '✅ Миграция системы блокировки пользователей успешно применена';
  RAISE NOTICE '📋 Созданы таблицы: user_blocks, block_appeals';
  RAISE NOTICE '⚙️  Созданы функции: block_user, unblock_user, approve_block_appeal, reject_block_appeal, auto_unblock_users';
  RAISE NOTICE '🔒 RLS политики применены';
END $$;

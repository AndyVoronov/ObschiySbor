-- ========================================
-- ПОЛНАЯ МИГРАЦИЯ СИСТЕМЫ МОДЕРАЦИИ
-- Версия: 1.0
-- Дата: 2025-10-14
-- ========================================
-- Этот файл содержит все необходимые изменения для системы модерации:
-- 1. Создание таблицы reports
-- 2. Добавление ролей пользователей
-- 3. Создание функций проверки прав
-- 4. Настройка RLS политик

-- ========================================
-- ЧАСТЬ 1: Создание таблицы reports
-- ========================================

-- Создаём таблицу reports если её нет
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'reviewed', 'resolved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаём индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_reports_event_id ON reports(event_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- Комментарии
COMMENT ON TABLE reports IS 'Жалобы пользователей на события';
COMMENT ON COLUMN reports.event_id IS 'ID события, на которое жалуются';
COMMENT ON COLUMN reports.reporter_id IS 'ID пользователя, отправившего жалобу';
COMMENT ON COLUMN reports.reason IS 'Причина жалобы';
COMMENT ON COLUMN reports.status IS 'Статус жалобы: pending, reviewed, resolved, rejected';

-- Включаем RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- ========================================
-- ЧАСТЬ 2: Добавление ролей пользователей
-- ========================================

-- Добавляем колонку role в таблицу profiles (если её нет)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles
    ADD COLUMN role VARCHAR(20) DEFAULT 'user' NOT NULL;

    -- Создаём индекс для быстрого поиска модераторов
    CREATE INDEX idx_profiles_role ON profiles(role);

    -- Добавляем constraint для допустимых значений
    ALTER TABLE profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('user', 'moderator', 'admin'));

    RAISE NOTICE 'Колонка role успешно добавлена в таблицу profiles';
  ELSE
    RAISE NOTICE 'Колонка role уже существует в таблице profiles';
  END IF;
END $$;

COMMENT ON COLUMN profiles.role IS 'Роль пользователя: user, moderator, admin';

-- ========================================
-- ЧАСТЬ 3: Функции проверки прав
-- ========================================

-- Создаём функцию для проверки, является ли пользователь модератором
CREATE OR REPLACE FUNCTION is_moderator(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role VARCHAR(20);
BEGIN
  SELECT role INTO user_role
  FROM profiles
  WHERE id = user_id;

  RETURN user_role IN ('moderator', 'admin');
END;
$$;

-- Создаём функцию для проверки, является ли текущий пользователь модератором
CREATE OR REPLACE FUNCTION is_current_user_moderator()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN is_moderator(auth.uid());
END;
$$;

-- Комментарии к функциям
COMMENT ON FUNCTION is_moderator(UUID) IS 'Проверяет, является ли указанный пользователь модератором или админом';
COMMENT ON FUNCTION is_current_user_moderator() IS 'Проверяет, является ли текущий пользователь модератором или админом';

-- ========================================
-- ЧАСТЬ 4: RLS политики для reports
-- ========================================

-- Политика на SELECT (чтение)
DROP POLICY IF EXISTS "Reports readable by moderators" ON reports;
CREATE POLICY "Reports readable by moderators"
ON reports FOR SELECT
TO authenticated
USING (
  -- Модераторы видят все жалобы
  is_current_user_moderator()
  OR
  -- Обычные пользователи видят только свои жалобы
  reporter_id = auth.uid()
);

-- Политика на UPDATE (обновление)
DROP POLICY IF EXISTS "Reports updatable by moderators" ON reports;
CREATE POLICY "Reports updatable by moderators"
ON reports FOR UPDATE
TO authenticated
USING (is_current_user_moderator())
WITH CHECK (is_current_user_moderator());

-- Политика на INSERT (создание)
DROP POLICY IF EXISTS "Reports insertable by authenticated users" ON reports;
CREATE POLICY "Reports insertable by authenticated users"
ON reports FOR INSERT
TO authenticated
WITH CHECK (reporter_id = auth.uid());

-- Удаляем старые политики если они существовали
DROP POLICY IF EXISTS "Users can view own reports" ON reports;
DROP POLICY IF EXISTS "Users can create reports" ON reports;

-- ========================================
-- ЗАВЕРШЕНИЕ
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Миграция системы модерации успешно применена!';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Что дальше:';
  RAISE NOTICE '1. Назначьте модератора:';
  RAISE NOTICE '   UPDATE profiles SET role = ''moderator'' WHERE email = ''your-email@example.com'';';
  RAISE NOTICE '';
  RAISE NOTICE '2. Проверьте права:';
  RAISE NOTICE '   SELECT is_current_user_moderator();';
  RAISE NOTICE '';
  RAISE NOTICE '3. Готово! Модераторы увидят пункт "Админ" в навигации.';
  RAISE NOTICE '==============================================';
END $$;

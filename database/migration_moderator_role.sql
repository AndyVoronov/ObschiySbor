-- Миграция: Добавление роли модератора
-- Версия: 1.0
-- Дата: 2025-10-14

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

-- Обновляем RLS политики для таблицы reports
-- Модераторы должны иметь полный доступ к жалобам

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

-- Политика на INSERT (создание) - остаётся только для авторизованных пользователей
DROP POLICY IF EXISTS "Reports insertable by authenticated users" ON reports;
CREATE POLICY "Reports insertable by authenticated users"
ON reports FOR INSERT
TO authenticated
WITH CHECK (reporter_id = auth.uid());

-- Комментарии к таблице и полям
COMMENT ON COLUMN profiles.role IS 'Роль пользователя: user, moderator, admin';

-- Примеры использования:
-- 1. Назначить пользователя модератором (выполнять в SQL Editor):
--    UPDATE profiles SET role = 'moderator' WHERE email = 'moderator@example.com';
--
-- 2. Проверить, является ли пользователь модератором:
--    SELECT is_moderator('user-uuid-here');
--
-- 3. Проверить роль текущего пользователя:
--    SELECT is_current_user_moderator();

DO $$
BEGIN
  RAISE NOTICE 'Миграция роли модератора успешно применена!';
  RAISE NOTICE 'Для назначения модератора выполните: UPDATE profiles SET role = ''moderator'' WHERE email = ''your-email@example.com'';';
END $$;

-- =============================================
-- ПРОВЕРКА СТРУКТУРЫ experience_log
-- Применить через Supabase SQL Editor
-- =============================================

-- Проверяем структуру таблицы experience_log
SELECT
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'experience_log'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Если reference_id всё ещё BIGINT, меняем на UUID
DO $$
BEGIN
  -- Проверяем тип reference_id
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'experience_log'
      AND column_name = 'reference_id'
      AND data_type = 'bigint'
  ) THEN
    -- Очищаем таблицу
    TRUNCATE TABLE experience_log CASCADE;

    -- Меняем тип
    ALTER TABLE experience_log
    ALTER COLUMN reference_id DROP DEFAULT,
    ALTER COLUMN reference_id TYPE UUID USING NULL::UUID,
    ALTER COLUMN reference_id SET DEFAULT NULL;

    RAISE NOTICE 'reference_id changed from BIGINT to UUID';
  ELSE
    RAISE NOTICE 'reference_id is already UUID';
  END IF;

  -- Проверяем reason
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'experience_log'
      AND column_name = 'reason'
      AND data_type LIKE 'character%'
  ) THEN
    ALTER TABLE experience_log
    ALTER COLUMN reason TYPE TEXT;

    RAISE NOTICE 'reason changed to TEXT';
  ELSE
    RAISE NOTICE 'reason is already TEXT';
  END IF;

  -- Проверяем reference_type
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'experience_log'
      AND column_name = 'reference_type'
      AND data_type LIKE 'character%'
  ) THEN
    ALTER TABLE experience_log
    ALTER COLUMN reference_type TYPE TEXT;

    RAISE NOTICE 'reference_type changed to TEXT';
  ELSE
    RAISE NOTICE 'reference_type is already TEXT';
  END IF;
END $$;

-- Проверяем финальную структуру
SELECT
  column_name,
  data_type,
  character_maximum_length,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'experience_log'
  AND table_schema = 'public'
ORDER BY ordinal_position;

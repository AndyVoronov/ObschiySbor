-- Исправление проблемы с отсутствующим профилем
-- Создаем профиль для пользователя 239c2372-7429-4c2c-acf7-440ff336e0e4

-- Сначала проверяем, существует ли профиль
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = '239c2372-7429-4c2c-acf7-440ff336e0e4'
    ) THEN
        -- Создаем профиль с данными из auth.users
        INSERT INTO profiles (
            id,
            full_name,
            city,
            interests,
            gender,
            created_at,
            updated_at
        )
        SELECT
            id,
            COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', ''),
            COALESCE(raw_user_meta_data->>'city', ''),
            COALESCE(raw_user_meta_data->>'interests', ''),
            CASE
                WHEN raw_user_meta_data->>'gender' IN ('male', 'female', 'other') THEN raw_user_meta_data->>'gender'
                ELSE NULL
            END,
            now(),
            now()
        FROM auth.users
        WHERE id = '239c2372-7429-4c2c-acf7-440ff336e0e4';

        RAISE NOTICE 'Профиль создан для пользователя: %', '239c2372-7429-4c2c-acf7-440ff336e0e4';
    ELSE
        RAISE NOTICE 'Профиль уже существует для пользователя: %', '239c2372-7429-4c2c-acf7-440ff336e0e4';
    END IF;
END $$;

-- Проверяем и исправляем триггер создания профилей
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Создаем профиль только если его еще нет
    INSERT INTO public.profiles (id, full_name, city, interests, gender, created_at, updated_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.raw_user_meta_data->>'city', ''),
        COALESCE(NEW.raw_user_meta_data->>'interests', ''),
        CASE
            WHEN NEW.raw_user_meta_data->>'gender' IN ('male', 'female', 'other') THEN NEW.raw_user_meta_data->>'gender'
            ELSE NULL
        END,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

-- Убедимся, что триггер существует и работает
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Проверяем наличие других пользователей без профилей
SELECT
    au.id,
    au.email,
    au.created_at
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
ORDER BY au.created_at DESC;
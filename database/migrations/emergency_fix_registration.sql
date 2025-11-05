-- ЭКСТРЕННОЕ ИСПРАВЛЕНИЕ РЕГИСТРАЦИИ
-- Отключаем триггер, чтобы регистрация работала немедленно

-- 1. Полностью отключаем триггер
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- 2. Создаем простейшую функцию для создания профилей
CREATE OR REPLACE FUNCTION safe_create_profile(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Пытаемся создать профиль с минимальными данными
    BEGIN
        INSERT INTO public.profiles (id, created_at, updated_at)
        VALUES (user_id, NOW(), NOW());

        -- Если успешно, пытаемся обновить дополнительными данными
        UPDATE public.profiles SET
            full_name = COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', ''),
            city = COALESCE(au.raw_user_meta_data->>'city', ''),
            updated_at = NOW()
        FROM auth.users au
        WHERE au.id = user_id AND profiles.id = user_id;

        RETURN TRUE;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Не удалось создать профиль для %: %', user_id, SQLERRM;
            RETURN FALSE;
    END;
END;
$$;

-- 3. НЕ создаем триггер вообще - будем создавать профили в коде

-- 4. Проверка: создаем профиль для существующего пользователя
SELECT safe_create_profile('239c2372-7429-4c2c-acf7-440ff336e0e4') as profile_created;

-- 5. Проверяем результат
SELECT * FROM profiles WHERE id = '239c2372-7429-4c2c-acf7-440ff336e0e4';

-- 6. Проверяем всех пользователей без профилей
SELECT
    'Users without profiles:' as info,
    COUNT(*) as count
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL;
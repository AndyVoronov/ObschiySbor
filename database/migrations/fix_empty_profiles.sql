-- Исправление пустых профилей для существующих пользователей
-- Обновляет профили, которые были созданы с пустыми полями

-- Функция для исправления конкретного профиля
CREATE OR REPLACE FUNCTION fix_user_profile(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record RECORD;
    updated_rows INTEGER;
BEGIN
    -- Получаем данные пользователя из auth.users
    SELECT * INTO user_record
    FROM auth.users
    WHERE id = user_id;

    IF user_record.id IS NULL THEN
        RETURN 'Пользователь не найден';
    END IF;

    -- Обновляем профиль с данными из auth.users
    UPDATE public.profiles SET
        full_name = COALESCE(
            au.raw_user_meta_data->>'full_name',
            au.raw_user_meta_data->>'name',
            p.full_name,
            ''
        ),
        city = COALESCE(
            au.raw_user_meta_data->>'city',
            p.city,
            ''
        ),
        interests = COALESCE(
            au.raw_user_meta_data->>'interests',
            p.interests,
            ''
        ),
        gender = CASE
            WHEN au.raw_user_meta_data->>'gender' IN ('male', 'female', 'other')
            THEN au.raw_user_meta_data->>'gender'
            ELSE p.gender
        END,
        updated_at = NOW()
    FROM auth.users au, public.profiles p
    WHERE au.id = user_id AND p.id = user_id;

    GET DIAGNOSTICS updated_rows = ROW_COUNT;

    IF updated_rows > 0 THEN
        RETURN 'Профиль успешно обновлен';
    ELSE
        RETURN 'Профиль не найден или не требует обновления';
    END IF;
END;
$$;

-- Исправляем профиль существующего пользователя
SELECT fix_user_profile('239c2372-7429-4c2c-acf7-440ff336e0e4') as result;

-- Массовое исправление всех пустых профилей
UPDATE public.profiles p
SET
    full_name = COALESCE(
        au.raw_user_meta_data->>'full_name',
        au.raw_user_meta_data->>'name',
        SUBSTRING(au.email FROM 1 FOR POSITION('@' IN au.email) - 1)
    ),
    city = COALESCE(au.raw_user_meta_data->>'city', ''),
    interests = COALESCE(au.raw_user_meta_data->>'interests', ''),
    gender = CASE
        WHEN au.raw_user_meta_data->>'gender' IN ('male', 'female', 'other')
        THEN au.raw_user_meta_data->>'gender'
        ELSE p.gender
    END,
    updated_at = NOW()
FROM auth.users au
WHERE au.id = p.id
    AND (
        p.full_name IS NULL OR p.full_name = ''
        OR p.city IS NULL OR p.city = ''
    );

-- Показываем результат обновления
SELECT
    COUNT(*) as updated_profiles
FROM public.profiles p
JOIN auth.users au ON au.id = p.id
WHERE (
    p.full_name IS NOT NULL AND p.full_name != ''
    OR p.city IS NOT NULL AND p.city != ''
)
    AND p.updated_at > NOW() - INTERVAL '5 minutes';

-- Проверяем пользователей с все еще пустыми профилями
SELECT
    p.id,
    au.email,
    p.full_name,
    p.city,
    p.updated_at,
    CASE
        WHEN p.full_name IS NULL OR p.full_name = '' THEN 'Пустое имя'
        WHEN p.city IS NULL OR p.city = '' THEN 'Пустой город'
        ELSE 'OK'
    END as status
FROM public.profiles p
JOIN auth.users au ON au.id = p.id
WHERE p.full_name IS NULL OR p.full_name = '' OR p.city IS NULL OR p.city = ''
ORDER BY p.updated_at DESC;
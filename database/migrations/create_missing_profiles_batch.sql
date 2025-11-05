-- Массовое создание недостающих профилей для всех пользователей
-- Эта функция находит всех пользователей auth.users без профилей и создает их

CREATE OR REPLACE FUNCTION create_missing_profiles()
RETURNS TABLE(
    user_id UUID,
    email TEXT,
    profile_created BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record RECORD;
    profiles_count INTEGER := 0;
BEGIN
    -- Для каждого пользователя без профиля
    FOR user_record IN
        SELECT
            au.id,
            au.email,
            au.raw_user_meta_data,
            au.created_at
        FROM auth.users au
        LEFT JOIN profiles p ON au.id = p.id
        WHERE p.id IS NULL
        ORDER BY au.created_at
    LOOP
        BEGIN
            -- Пытаемся создать профиль
            INSERT INTO public.profiles (
                id,
                full_name,
                city,
                interests,
                gender,
                created_at,
                updated_at
            )
            VALUES (
                user_record.id,
                COALESCE(
                    user_record.raw_user_meta_data->>'full_name',
                    user_record.raw_user_meta_data->>'name',
                    SUBSTRING(user_record.email FROM 1 FOR POSITION('@' IN user_record.email) - 1)
                ),
                COALESCE(user_record.raw_user_meta_data->>'city', ''),
                COALESCE(user_record.raw_user_meta_data->>'interests', ''),
                CASE
                    WHEN user_record.raw_user_meta_data->>'gender' IN ('male', 'female', 'other')
                    THEN user_record.raw_user_meta_data->>'gender'
                    ELSE NULL
                END,
                user_record.created_at,
                NOW()
            )
            ON CONFLICT (id) DO NOTHING;

            -- Проверяем, был ли создан профиль
            IF EXISTS (SELECT 1 FROM profiles WHERE id = user_record.id) THEN
                profiles_count := profiles_count + 1;
                RETURN NEXT (
                    user_record.id,
                    user_record.email,
                    TRUE,
                    'Профиль успешно создан'
                );
            ELSE
                RETURN NEXT (
                    user_record.id,
                    user_record.email,
                    FALSE,
                    'Ошибка создания профиля'
                );
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                RETURN NEXT (
                    user_record.id,
                    user_record.email,
                    FALSE,
                    'Ошибка: ' || SQLERRM
                );
        END;
    END LOOP;

    -- Возвращаем итоговую статистику в виде дополнительной строки
    RETURN NEXT (
        NULL::UUID,
        NULL::TEXT,
        NULL::BOOLEAN,
        'Всего создано профилей: ' || profiles_count
    );
END;
$$;

-- Выполняем функцию для создания недостающих профилей
SELECT * FROM create_missing_profiles();

-- Проверяем результат
SELECT
    COUNT(*) as total_auth_users,
    COUNT(p.id) as profiles_count,
    COUNT(*) - COUNT(p.id) as missing_profiles
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id;

-- Показываем пользователей, у которых все еще нет профилей (если есть)
SELECT
    au.id,
    au.email,
    au.created_at,
    au.last_sign_in_at
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
ORDER BY au.created_at DESC;
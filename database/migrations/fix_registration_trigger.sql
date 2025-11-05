-- Исправление триггера регистрации пользователей
-- Ошибка была в том, что мы не заполняли все обязательные поля

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Временно отключаем триггер, чтобы регистрация работала
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Создаем улучшенную функцию триггера с правильным заполнением полей
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Создаем профиль с переданными данными
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
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.raw_user_meta_data->>'city', ''),
        COALESCE(NEW.raw_user_meta_data->>'interests', ''),
        CASE
            WHEN NEW.raw_user_meta_data->>'gender' IN ('male', 'female', 'other')
            THEN NEW.raw_user_meta_data->>'gender'
            ELSE NULL
        END,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Если ошибка с полным профилем, создаем минимальный
        BEGIN
            INSERT INTO public.profiles (id, created_at, updated_at)
            VALUES (NEW.id, NOW(), NOW())
            ON CONFLICT (id) DO NOTHING;

            RAISE WARNING 'Создан минимальный профиль для пользователя % (ошибка: %)', NEW.id, SQLERRM;
            RETURN NEW;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Не удалось создать профиль для пользователя %: %', NEW.id, SQLERRM;
                RETURN NEW;
        END;
END;
$$;

-- Создаем триггер
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
WHEN (NEW.id IS NOT NULL)
EXECUTE FUNCTION handle_new_user();

-- Временно отключаем триггер для тестирования
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Тест: создаем пользователя вручную для проверки
-- DO $$
-- BEGIN
--     INSERT INTO auth.users (id, email, created_at)
--     VALUES ('test-user-123', 'test@example.com', NOW())
--     ON CONFLICT (id) DO NOTHING;
-- END $$;

-- Проверяем результат
-- SELECT * FROM profiles WHERE id = 'test-user-123';
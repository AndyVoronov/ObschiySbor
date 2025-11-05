-- Исправление триггера для создания профиля пользователя - новый подход

-- Удаление существующих политик и триггера
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Создание новой функции для создания профиля пользователя с более безопасным подходом
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Проверяем, существует ли уже профиль с таким ID
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = new.id) THEN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'full_name', ''),
      'user'
    );
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создание триггера с более точным именем и настройками
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Создание или обновление политики RLS для INSERT в таблицу profiles
CREATE OR REPLACE POLICY "Пользователи могут создавать свой профиль" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Предоставление разрешений на выполнение функции для сервиса auth
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
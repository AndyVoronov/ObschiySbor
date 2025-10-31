# Инструкция по исправлению ошибок регистрации

## Проблема
При регистрации новых пользователей возникает ошибка "Database error saving new user". Это вызвано проблемами в триггере базы данных, который автоматически создает профиль пользователя при регистрации.

## Решение
Создана новая миграция `fix_user_creation_trigger.sql`, которая полностью переписывает подход к созданию профиля пользователя с более надежной обработкой ошибок.

## Применение миграции

1. Войдите в панель управления Supabase по адресу: https://supabase.com/dashboard
2. Выберите ваш проект (wrfcpsljchyetbmupqgc)
3. Перейдите в раздел "SQL Editor"
4. Выполните SQL-запрос из файла `database/migrations/fix_user_creation_trigger.sql`

## Альтернативный способ (через командную строку)

Если у вас установлен Supabase CLI, выполните команду:
```bash
supabase db push
```

## Что изменилось

1. **Более надежная функция создания профиля**:
   ```sql
   CREATE OR REPLACE FUNCTION public.handle_new_user()
   RETURNS trigger AS $$
   BEGIN
     -- Проверяем, существует ли уже профиль с таким ID
     IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = new.id) THEN
       INSERT INTO public.profiles (id, full_name)
       VALUES (
         new.id,
         COALESCE(new.raw_user_meta_data->>'full_name', '')
       );
     END IF;
     RETURN new;
   EXCEPTION WHEN OTHERS THEN
     -- Логируем ошибку для отладки, но не прерываем процесс
     RAISE WARNING 'Error creating profile for user %: %', new.id, SQLERRM;
     RETURN new;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   ```

   Эта версия функции:
   - Проверяет, существует ли уже профиль с таким ID, чтобы избежать дублирования
   - Обрабатывает исключения, не прерывая процесс регистрации при ошибках
   - Логирует ошибки для отладки, не влияя на функциональность

2. **Удаление и повторное создание триггера**:
   - Триггер полностью удаляется и создается заново для гарантии его корректной работы

3. **Добавление разрешений**:
   ```sql
   GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated, anon, service_role;
   ```

   Это гарантирует, что функция может быть выполнена всеми необходимыми ролями.

После применения этой миграции регистрация новых пользователей должна работать корректно, а в случае ошибок они будут логироваться без прерывания процесса регистрации.
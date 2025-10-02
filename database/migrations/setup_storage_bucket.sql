-- Настройка Storage для изображений событий
-- Дата: 2025-10-01

-- ВАЖНО: Эта часть выполняется через Supabase Dashboard -> Storage
-- 1. Создайте bucket с именем: event-images
-- 2. Настройки: Public = false (приватный доступ)
-- 3. File size limit: 5MB
-- 4. Allowed MIME types: image/jpeg, image/png, image/webp

-- RLS политики для Storage bucket 'event-images'
-- Выполните в SQL Editor после создания bucket:

-- Политика для загрузки изображений (только авторизованные пользователи)
CREATE POLICY "Авторизованные пользователи могут загружать изображения"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Политика для чтения изображений (все могут читать)
CREATE POLICY "Все могут просматривать изображения событий"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'event-images');

-- Политика для обновления изображений (только владелец)
CREATE POLICY "Пользователи могут обновлять свои изображения"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'event-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Политика для удаления изображений (только владелец)
CREATE POLICY "Пользователи могут удалять свои изображения"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'event-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

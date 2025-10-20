-- Упрощённая миграция: Система друзей (без зависимости от notifications)
-- Применять эту миграцию вместо migration_friendships.sql

-- 1. Удаляем таблицу если она существует (для чистого старта)
DROP TABLE IF EXISTS friendships CASCADE;

-- 2. Создание таблицы friendships
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Constraint чтобы не было дублирующихся связей
  CONSTRAINT unique_friendship UNIQUE (user_id, friend_id),
  -- Constraint чтобы пользователь не мог добавить себя в друзья
  CONSTRAINT no_self_friendship CHECK (user_id != friend_id)
);

-- 3. Создание индексов для быстрого поиска
CREATE INDEX idx_friendships_user_id ON friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX idx_friendships_status ON friendships(status);
CREATE INDEX idx_friendships_user_friend ON friendships(user_id, friend_id);

-- 4. Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_friendships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_friendships_updated_at
  BEFORE UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION update_friendships_updated_at();

-- 5. RLS политики для таблицы friendships
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Политика SELECT: пользователь видит только свои дружеские связи
CREATE POLICY friendships_select_own
  ON friendships FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR auth.uid() = friend_id
  );

-- Политика INSERT: пользователь может создавать запросы в друзья только от своего имени
CREATE POLICY friendships_insert_own
  ON friendships FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
  );

-- Политика UPDATE: оба пользователя могут обновлять статус дружбы
CREATE POLICY friendships_update_own
  ON friendships FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id OR auth.uid() = friend_id
  )
  WITH CHECK (
    auth.uid() = user_id OR auth.uid() = friend_id
  );

-- Политика DELETE: оба пользователя могут удалять дружбу
CREATE POLICY friendships_delete_own
  ON friendships FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id OR auth.uid() = friend_id
  );

-- 6. Функция для принятия заявки в друзья (БЕЗ уведомлений)
CREATE OR REPLACE FUNCTION accept_friend_request(p_friendship_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE friendships
  SET status = 'accepted', updated_at = NOW()
  WHERE id = p_friendship_id
    AND (friend_id = auth.uid() OR user_id = auth.uid())
    AND status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Функция для отклонения заявки в друзья
CREATE OR REPLACE FUNCTION reject_friend_request(p_friendship_id UUID)
RETURNS VOID AS $$
BEGIN
  DELETE FROM friendships
  WHERE id = p_friendship_id
    AND (friend_id = auth.uid() OR user_id = auth.uid())
    AND status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Функция для удаления из друзей
CREATE OR REPLACE FUNCTION remove_friend(p_friend_id UUID)
RETURNS VOID AS $$
BEGIN
  DELETE FROM friendships
  WHERE (
    (user_id = auth.uid() AND friend_id = p_friend_id) OR
    (user_id = p_friend_id AND friend_id = auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Комментарии
COMMENT ON TABLE friendships IS 'Таблица дружеских связей между пользователями';
COMMENT ON COLUMN friendships.status IS 'Статус дружбы: pending (ожидает), accepted (принят), rejected (отклонён)';

-- Готово! Таблица friendships создана и доступна через REST API.

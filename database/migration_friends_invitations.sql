-- ============================================
-- МИГРАЦИЯ: Система друзей и приглашений
-- Дата: 2025-10-20
-- Описание: Добавляет таблицы для системы друзей и приглашений в мероприятия
-- ============================================

-- 1. Таблица friendships - дружеские связи между пользователями
-- ============================================
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Проверка: нельзя добавить самого себя в друзья
  CONSTRAINT no_self_friendship CHECK (user_id != friend_id),

  -- Уникальность пары пользователей (независимо от порядка)
  CONSTRAINT unique_friendship UNIQUE (user_id, friend_id)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_friendships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_friendships_timestamp
  BEFORE UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION update_friendships_updated_at();

COMMENT ON TABLE friendships IS 'Дружеские связи между пользователями';
COMMENT ON COLUMN friendships.status IS 'pending - ожидает подтверждения, accepted - друзья, rejected - отклонено';

-- 2. Таблица event_invitations - приглашения в мероприятия
-- ============================================
CREATE TABLE IF NOT EXISTS event_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Проверка: нельзя пригласить самого себя
  CONSTRAINT no_self_invitation CHECK (inviter_id != invitee_id),

  -- Уникальность: нельзя пригласить одного и того же человека в одно событие дважды
  CONSTRAINT unique_event_invitation UNIQUE (event_id, invitee_id)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_event_invitations_event_id ON event_invitations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_invitations_inviter_id ON event_invitations(inviter_id);
CREATE INDEX IF NOT EXISTS idx_event_invitations_invitee_id ON event_invitations(invitee_id);
CREATE INDEX IF NOT EXISTS idx_event_invitations_status ON event_invitations(status);

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_event_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_event_invitations_timestamp
  BEFORE UPDATE ON event_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_event_invitations_updated_at();

COMMENT ON TABLE event_invitations IS 'Приглашения пользователей в мероприятия';
COMMENT ON COLUMN event_invitations.status IS 'pending - ожидает ответа, accepted - принято (автоматически добавляется в участники), rejected - отклонено';

-- 3. RLS политики для friendships
-- ============================================

-- Включаем RLS
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Политика SELECT: пользователи видят свои запросы и запросы к ним
CREATE POLICY friendships_select_policy ON friendships
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    auth.uid() = friend_id
  );

-- Политика INSERT: пользователь может отправить запрос в друзья
CREATE POLICY friendships_insert_policy ON friendships
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Политика UPDATE: можно обновить статус только если ты получатель запроса
CREATE POLICY friendships_update_policy ON friendships
  FOR UPDATE
  USING (auth.uid() = friend_id)
  WITH CHECK (auth.uid() = friend_id);

-- Политика DELETE: можно удалить дружбу если ты один из участников
CREATE POLICY friendships_delete_policy ON friendships
  FOR DELETE
  USING (
    auth.uid() = user_id OR
    auth.uid() = friend_id
  );

-- 4. RLS политики для event_invitations
-- ============================================

-- Включаем RLS
ALTER TABLE event_invitations ENABLE ROW LEVEL SECURITY;

-- Политика SELECT: видят приглашения приглашающий и приглашённый
CREATE POLICY event_invitations_select_policy ON event_invitations
  FOR SELECT
  USING (
    auth.uid() = inviter_id OR
    auth.uid() = invitee_id
  );

-- Политика INSERT: создать приглашение может только организатор события или участник
CREATE POLICY event_invitations_insert_policy ON event_invitations
  FOR INSERT
  WITH CHECK (
    auth.uid() = inviter_id AND
    (
      -- Проверяем что приглашающий - организатор события
      EXISTS (
        SELECT 1 FROM events
        WHERE id = event_id AND creator_id = auth.uid()
      )
      OR
      -- Или что приглашающий - участник события
      EXISTS (
        SELECT 1 FROM event_participants
        WHERE event_id = event_invitations.event_id AND user_id = auth.uid()
      )
    )
  );

-- Политика UPDATE: обновить статус может только приглашённый
CREATE POLICY event_invitations_update_policy ON event_invitations
  FOR UPDATE
  USING (auth.uid() = invitee_id)
  WITH CHECK (auth.uid() = invitee_id);

-- Политика DELETE: удалить может приглашающий или приглашённый
CREATE POLICY event_invitations_delete_policy ON event_invitations
  FOR DELETE
  USING (
    auth.uid() = inviter_id OR
    auth.uid() = invitee_id
  );

-- 5. Функция для автоматического добавления в участники при принятии приглашения
-- ============================================
CREATE OR REPLACE FUNCTION handle_event_invitation_accepted()
RETURNS TRIGGER AS $$
BEGIN
  -- Если приглашение принято, добавляем пользователя в участники
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    -- Проверяем, не является ли пользователь уже участником
    IF NOT EXISTS (
      SELECT 1 FROM event_participants
      WHERE event_id = NEW.event_id AND user_id = NEW.invitee_id
    ) THEN
      -- Добавляем в участники
      INSERT INTO event_participants (event_id, user_id)
      VALUES (NEW.event_id, NEW.invitee_id);

      -- Создаём уведомление организатору
      INSERT INTO notifications (user_id, type, title, message, link)
      SELECT
        creator_id,
        'new_participant',
        'Новый участник',
        (SELECT full_name FROM profiles WHERE id = NEW.invitee_id) || ' принял приглашение и присоединился к событию "' || title || '"',
        '/events/' || NEW.event_id
      FROM events
      WHERE id = NEW.event_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_invitation_accepted_trigger
  AFTER UPDATE ON event_invitations
  FOR EACH ROW
  WHEN (NEW.status = 'accepted' AND OLD.status != 'accepted')
  EXECUTE FUNCTION handle_event_invitation_accepted();

-- 6. Функция для отправки уведомлений при новом запросе в друзья
-- ============================================
CREATE OR REPLACE FUNCTION notify_friendship_request()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    INSERT INTO notifications (user_id, type, title, message, link)
    SELECT
      NEW.friend_id,
      'friend_request',
      'Новый запрос в друзья',
      (SELECT full_name FROM profiles WHERE id = NEW.user_id) || ' хочет добавить вас в друзья',
      '/profile'
    FROM profiles
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER friendship_request_notification
  AFTER INSERT ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION notify_friendship_request();

-- 7. Функция для отправки уведомлений при приглашении в событие
-- ============================================
CREATE OR REPLACE FUNCTION notify_event_invitation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    INSERT INTO notifications (user_id, type, title, message, link)
    SELECT
      NEW.invitee_id,
      'event_invitation',
      'Приглашение в событие',
      (SELECT full_name FROM profiles WHERE id = NEW.inviter_id) || ' приглашает вас на "' || (SELECT title FROM events WHERE id = NEW.event_id) || '"',
      '/events/' || NEW.event_id
    FROM profiles
    WHERE id = NEW.inviter_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_invitation_notification
  AFTER INSERT ON event_invitations
  FOR EACH ROW
  EXECUTE FUNCTION notify_event_invitation();

-- ============================================
-- ГОТОВО! Система друзей и приглашений создана
-- ============================================

-- Как использовать:
--
-- 1. Добавить в друзья:
--    INSERT INTO friendships (user_id, friend_id) VALUES ('user-uuid', 'friend-uuid');
--
-- 2. Принять запрос в друзья:
--    UPDATE friendships SET status = 'accepted' WHERE id = 'friendship-uuid';
--
-- 3. Пригласить в событие:
--    INSERT INTO event_invitations (event_id, inviter_id, invitee_id, message)
--    VALUES ('event-uuid', 'inviter-uuid', 'invitee-uuid', 'Приглашаю тебя!');
--
-- 4. Принять приглашение (автоматически добавит в участники):
--    UPDATE event_invitations SET status = 'accepted' WHERE id = 'invitation-uuid';

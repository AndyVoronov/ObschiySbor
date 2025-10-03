-- Создание таблицы профилей пользователей
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  city TEXT,
  interests TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы событий
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('board_games', 'cycling', 'hiking')),
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT NOT NULL,
  max_participants INTEGER NOT NULL DEFAULT 10,
  current_participants INTEGER NOT NULL DEFAULT 0,
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed')),
  category_data JSONB,
  image_url TEXT,
  price DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы участников событий
CREATE TABLE event_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'joined' CHECK (status IN ('joined', 'left', 'banned')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Создание таблицы отзывов
CREATE TABLE reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Создание таблицы уведомлений
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('event_reminder', 'event_cancelled', 'new_participant', 'event_updated')),
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы для модерации
CREATE TABLE reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES profiles(id)
);

-- Создание таблицы логов действий пользователей
CREATE TABLE audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для оптимизации поиска
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_event_date ON events(event_date);
CREATE INDEX idx_events_creator_id ON events(creator_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_event_participants_event_id ON event_participants(event_id);
CREATE INDEX idx_event_participants_user_id ON event_participants(user_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_reports_status ON reports(status);

-- Функция для автоматического создания профиля при регистрации
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер для создания профиля
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для обновления updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Политики Row Level Security (RLS)

-- Включение RLS для всех таблиц
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Политики для profiles
CREATE POLICY "Профили доступны всем для чтения" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Пользователи могут обновлять свой профиль" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Политики для events
CREATE POLICY "События доступны всем для чтения" ON events
  FOR SELECT USING (true);

CREATE POLICY "Авторизованные пользователи могут создавать события" ON events
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Создатели могут обновлять свои события" ON events
  FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Создатели могут удалять свои события" ON events
  FOR DELETE USING (auth.uid() = creator_id);

-- Политики для event_participants
CREATE POLICY "Участники доступны всем для чтения" ON event_participants
  FOR SELECT USING (true);

CREATE POLICY "Пользователи могут присоединяться к событиям" ON event_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Пользователи могут покидать события" ON event_participants
  FOR DELETE USING (auth.uid() = user_id);

-- Политики для reviews
CREATE POLICY "Отзывы доступны всем для чтения" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "Пользователи могут оставлять отзывы" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Пользователи могут обновлять свои отзывы" ON reviews
  FOR UPDATE USING (auth.uid() = user_id);

-- Политики для notifications
CREATE POLICY "Пользователи видят только свои уведомления" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Пользователи могут обновлять свои уведомления" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Политики для reports
CREATE POLICY "Модераторы видят все жалобы" ON reports
  FOR SELECT USING (true);

CREATE POLICY "Пользователи могут создавать жалобы" ON reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Политики для audit_logs
CREATE POLICY "Логи доступны только администраторам" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Создание таблицы чат-комнат (одна комната на событие)
CREATE TABLE chat_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы сообщений чата
CREATE TABLE chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для чатов
CREATE INDEX idx_chat_rooms_event_id ON chat_rooms(event_id);
CREATE INDEX idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- Включение RLS для чатов
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Политики для chat_rooms
CREATE POLICY "Чат-комнаты видны участникам события" ON chat_rooms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM event_participants
      WHERE event_participants.event_id = chat_rooms.event_id
        AND event_participants.user_id = auth.uid()
        AND event_participants.status = 'joined'
    ) OR EXISTS (
      SELECT 1 FROM events
      WHERE events.id = chat_rooms.event_id
        AND events.creator_id = auth.uid()
    )
  );

CREATE POLICY "Чат-комнаты создаются автоматически" ON chat_rooms
  FOR INSERT WITH CHECK (true);

-- Политики для chat_messages
CREATE POLICY "Сообщения видны участникам чата" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_rooms
      JOIN event_participants ON event_participants.event_id = chat_rooms.event_id
      WHERE chat_rooms.id = chat_messages.room_id
        AND event_participants.user_id = auth.uid()
        AND event_participants.status = 'joined'
    ) OR EXISTS (
      SELECT 1 FROM chat_rooms
      JOIN events ON events.id = chat_rooms.event_id
      WHERE chat_rooms.id = chat_messages.room_id
        AND events.creator_id = auth.uid()
    )
  );

CREATE POLICY "Участники могут отправлять сообщения" ON chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND (
      EXISTS (
        SELECT 1 FROM chat_rooms
        JOIN event_participants ON event_participants.event_id = chat_rooms.event_id
        WHERE chat_rooms.id = chat_messages.room_id
          AND event_participants.user_id = auth.uid()
          AND event_participants.status = 'joined'
      ) OR EXISTS (
        SELECT 1 FROM chat_rooms
        JOIN events ON events.id = chat_rooms.event_id
        WHERE chat_rooms.id = chat_messages.room_id
          AND events.creator_id = auth.uid()
      )
    )
  );

-- Функция для автоматического создания чат-комнаты при создании события
CREATE OR REPLACE FUNCTION create_chat_room_for_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO chat_rooms (event_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер для создания чат-комнаты
CREATE TRIGGER on_event_created
  AFTER INSERT ON events
  FOR EACH ROW EXECUTE FUNCTION create_chat_room_for_event();

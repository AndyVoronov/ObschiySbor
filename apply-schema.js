import { readFileSync } from 'fs';

const supabaseUrl = 'https://wrfcpsljchyetbmupqgc.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Если нет service key, используем anon key для проверки
const supabaseKey = supabaseServiceKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndyZmNwc2xqY2h5ZXRibXVwcWdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyOTY4MDQsImV4cCI6MjA3NDg3MjgwNH0.df9yt9tIP58S8JTPgvpreKqpVGkb01NtC1e7kYgg0rc';

async function applySchema() {
  console.log('🚀 Применение SQL схемы к Supabase...\n');

  try {
    // Читаем SQL файл
    const sql = readFileSync('./database/schema.sql', 'utf8');

    console.log('📄 SQL скрипт загружен');
    console.log(`📊 Размер: ${(sql.length / 1024).toFixed(2)} KB`);
    console.log('=' .repeat(70));

    // Пытаемся выполнить через REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      const errorText = await response.text();

      if (response.status === 404 || errorText.includes('function') || errorText.includes('not found')) {
        console.log('\n⚠️  Невозможно выполнить SQL через API напрямую.');
        console.log('\n📋 Для применения схемы выполните следующие шаги:\n');
        console.log('1. Откройте Supabase Dashboard:');
        console.log('   https://supabase.com/dashboard/project/wrfcpsljchyetbmupqgc');
        console.log('\n2. Перейдите в раздел "SQL Editor" (слева в меню)');
        console.log('\n3. Нажмите "New query"');
        console.log('\n4. Скопируйте весь SQL из файла database/schema.sql');
        console.log('\n5. Вставьте в редактор и нажмите "Run" (или F5)');
        console.log('\n6. Дождитесь завершения выполнения (может занять несколько секунд)');
        console.log('\n✅ После успешного выполнения запустите: npm run init-db');
        console.log('\n' + '='.repeat(70));

        // Выведем упрощённую версию SQL для быстрого старта
        console.log('\n💡 Или используйте упрощённую схему для быстрого старта:\n');
        printQuickStartSQL();

      } else {
        console.error('❌ Ошибка API:', response.status, errorText);
      }
    } else {
      const result = await response.json();
      console.log('✅ SQL успешно выполнен!', result);
    }

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.log('\n📋 Пожалуйста, примените схему вручную через Supabase Dashboard');
  }
}

function printQuickStartSQL() {
  const quickSQL = `-- ========================================
-- ObschiySbor - Quick Start Schema
-- ========================================

-- 1. Создание таблицы профилей
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  city TEXT,
  interests TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Создание таблицы событий
CREATE TABLE IF NOT EXISTS events (
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Создание таблицы участников
CREATE TABLE IF NOT EXISTS event_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'joined' CHECK (status IN ('joined', 'left', 'banned')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- 4. Индексы
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_creator_id ON events(creator_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_user_id ON event_participants(user_id);

-- 5. Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

-- Политики для profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Политики для events
DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;
CREATE POLICY "Events are viewable by everyone" ON events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create events" ON events;
CREATE POLICY "Authenticated users can create events" ON events FOR INSERT WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can update events" ON events;
CREATE POLICY "Creators can update events" ON events FOR UPDATE USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can delete events" ON events;
CREATE POLICY "Creators can delete events" ON events FOR DELETE USING (auth.uid() = creator_id);

-- Политики для event_participants
DROP POLICY IF EXISTS "Participants are viewable by everyone" ON event_participants;
CREATE POLICY "Participants are viewable by everyone" ON event_participants FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can join events" ON event_participants;
CREATE POLICY "Users can join events" ON event_participants FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can leave events" ON event_participants;
CREATE POLICY "Users can leave events" ON event_participants FOR DELETE USING (auth.uid() = user_id);

-- 6. Функции и триггеры
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- ✅ Схема применена успешно!
-- ========================================`;

  console.log(quickSQL);
  console.log('\n' + '='.repeat(70));
  console.log('📋 Скопируйте SQL выше и выполните в SQL Editor Supabase');
}

applySchema();

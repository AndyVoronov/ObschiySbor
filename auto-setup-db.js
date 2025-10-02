/**
 * Автоматическое создание схемы базы данных через Supabase REST API
 * Использует прямые SQL запросы через PostgREST
 */

const SUPABASE_URL = 'https://wrfcpsljchyetbmupqgc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndyZmNwc2xqY2h5ZXRibXVwcWdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyOTY4MDQsImV4cCI6MjA3NDg3MjgwNH0.df9yt9tIP58S8JTPgvpreKqpVGkb01NtC1e7kYgg0rc';

// Упрощённая схема для автоматического создания
const sqlQueries = [
  // 1. Создание таблицы profiles
  `CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    full_name TEXT,
    avatar_url TEXT,
    city TEXT,
    interests TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );`,

  // 2. Создание таблицы events
  `CREATE TABLE IF NOT EXISTS events (
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
  );`,

  // 3. Создание таблицы event_participants
  `CREATE TABLE IF NOT EXISTS event_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL DEFAULT 'joined' CHECK (status IN ('joined', 'left', 'banned')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id)
  );`,

  // 4. Создание индексов
  `CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);`,
  `CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);`,
  `CREATE INDEX IF NOT EXISTS idx_events_creator_id ON events(creator_id);`,
  `CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON event_participants(event_id);`,
  `CREATE INDEX IF NOT EXISTS idx_event_participants_user_id ON event_participants(user_id);`,

  // 5. Включение RLS
  `ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE events ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;`,
];

const policies = [
  // Политики для profiles
  `DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;`,
  `CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);`,
  `DROP POLICY IF EXISTS "Users can update own profile" ON profiles;`,
  `CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);`,

  // Политики для events
  `DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;`,
  `CREATE POLICY "Events are viewable by everyone" ON events FOR SELECT USING (true);`,
  `DROP POLICY IF EXISTS "Authenticated users can create events" ON events;`,
  `CREATE POLICY "Authenticated users can create events" ON events FOR INSERT WITH CHECK (auth.uid() = creator_id);`,
  `DROP POLICY IF EXISTS "Creators can update events" ON events;`,
  `CREATE POLICY "Creators can update events" ON events FOR UPDATE USING (auth.uid() = creator_id);`,
  `DROP POLICY IF EXISTS "Creators can delete events" ON events;`,
  `CREATE POLICY "Creators can delete events" ON events FOR DELETE USING (auth.uid() = creator_id);`,

  // Политики для event_participants
  `DROP POLICY IF EXISTS "Participants are viewable by everyone" ON event_participants;`,
  `CREATE POLICY "Participants are viewable by everyone" ON event_participants FOR SELECT USING (true);`,
  `DROP POLICY IF EXISTS "Users can join events" ON event_participants;`,
  `CREATE POLICY "Users can join events" ON event_participants FOR INSERT WITH CHECK (auth.uid() = user_id);`,
  `DROP POLICY IF EXISTS "Users can leave events" ON event_participants;`,
  `CREATE POLICY "Users can leave events" ON event_participants FOR DELETE USING (auth.uid() = user_id);`,
];

const functions = [
  // Функция для автоматического создания профиля
  `CREATE OR REPLACE FUNCTION public.handle_new_user()
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
  $$ LANGUAGE plpgsql SECURITY DEFINER;`,

  `DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;`,
  `CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();`,

  // Функция для обновления updated_at
  `CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;`,

  `DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;`,
  `CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`,

  `DROP TRIGGER IF EXISTS update_events_updated_at ON events;`,
  `CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`,
];

async function executeSQL(sql) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql })
    });

    return { success: response.ok, status: response.status, data: await response.text() };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function setupDatabase() {
  console.log('🚀 Автоматическое создание базы данных...\n');
  console.log('⚠️  ВНИМАНИЕ: Для выполнения SQL нужны права администратора.\n');
  console.log('📋 Рекомендуется выполнить SQL вручную через Supabase Dashboard:\n');

  // Формируем полный SQL скрипт
  const fullSQL = [
    '-- ObschiySbor Database Schema',
    '-- Автоматически сгенерировано',
    '',
    '-- Таблицы',
    ...sqlQueries,
    '',
    '-- Политики безопасности',
    ...policies,
    '',
    '-- Функции и триггеры',
    ...functions,
  ].join('\n');

  console.log('=' .repeat(70));
  console.log(fullSQL);
  console.log('=' .repeat(70));

  console.log('\n📝 Инструкция по применению:');
  console.log('\n1. Откройте https://supabase.com/dashboard/project/wrfcpsljchyetbmupqgc');
  console.log('2. Перейдите в "SQL Editor"');
  console.log('3. Создайте новый query');
  console.log('4. Скопируйте весь SQL выше');
  console.log('5. Вставьте и нажмите "Run"');
  console.log('\n✅ После выполнения запустите: node init-db.js для проверки\n');

  // Сохраним SQL в файл
  const fs = await import('fs');
  fs.writeFileSync('./database/quick-schema.sql', fullSQL);
  console.log('💾 SQL сохранён в файл: database/quick-schema.sql\n');
}

setupDatabase();

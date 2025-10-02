import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wrfcpsljchyetbmupqgc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndyZmNwc2xqY2h5ZXRibXVwcWdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyOTY4MDQsImV4cCI6MjA3NDg3MjgwNH0.df9yt9tIP58S8JTPgvpreKqpVGkb01NtC1e7kYgg0rc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function initDatabase() {
  console.log('🚀 Инициализация базы данных ObschiySbor...\n');

  try {
    // Проверяем подключение
    console.log('1️⃣ Проверка подключения к Supabase...');
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (testError) {
      if (testError.code === '42P01') {
        console.log('⚠️  Таблицы не существуют. Необходимо выполнить SQL миграцию.\n');
        console.log('📋 Инструкция по применению схемы:');
        console.log('   1. Откройте https://wrfcpsljchyetbmupqgc.supabase.co');
        console.log('   2. Перейдите в раздел "SQL Editor"');
        console.log('   3. Создайте новый query');
        console.log('   4. Скопируйте содержимое файла database/schema.sql');
        console.log('   5. Вставьте и нажмите "Run"');
        console.log('\n✅ После выполнения SQL запустите этот скрипт снова\n');

        // Попробуем выполнить базовые таблицы через RPC
        await createBasicStructure();
      } else {
        console.error('❌ Ошибка подключения:', testError.message);
      }
    } else {
      console.log('✅ Подключение успешно! Таблицы уже существуют.\n');
      await verifyTables();
    }

  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
  }
}

async function createBasicStructure() {
  console.log('\n2️⃣ Попытка создания базовой структуры...');

  // Так как мы не можем выполнять DDL через anon key,
  // выведем инструкцию для ручного создания
  console.log('\n📝 ВАЖНО: Для создания таблиц выполните следующие шаги:');
  console.log('\n   Откройте SQL Editor в Supabase и выполните:');
  console.log('   ' + '='.repeat(60));
  console.log(`
-- Минимальная схема для начала работы
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  city TEXT,
  interests TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT NOT NULL,
  max_participants INTEGER DEFAULT 10,
  current_participants INTEGER DEFAULT 0,
  creator_id UUID REFERENCES profiles(id) NOT NULL,
  status TEXT DEFAULT 'active',
  category_data JSONB,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'joined',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Public events" ON events FOR SELECT USING (true);
CREATE POLICY "Users can create events" ON events FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update events" ON events FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Public participants" ON event_participants FOR SELECT USING (true);
CREATE POLICY "Users can join events" ON event_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave events" ON event_participants FOR DELETE USING (auth.uid() = user_id);

-- Trigger для создания профиля
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
`);
  console.log('   ' + '='.repeat(60));
  console.log('\n✅ После выполнения SQL перезапустите этот скрипт\n');
}

async function verifyTables() {
  console.log('2️⃣ Проверка структуры таблиц...\n');

  const tables = ['profiles', 'events', 'event_participants'];

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`   ❌ ${table}: ${error.message}`);
      } else {
        console.log(`   ✅ ${table}: таблица существует`);
      }
    } catch (err) {
      console.log(`   ❌ ${table}: ${err.message}`);
    }
  }

  console.log('\n✅ База данных готова к работе!');
  console.log('\n📱 Теперь можно запустить фронтенд:');
  console.log('   cd frontend && npm run dev\n');
}

// Запуск
initDatabase();

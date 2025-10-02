import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = 'https://wrfcpsljchyetbmupqgc.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndyZmNwc2xqY2h5ZXRibXVwcWdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyOTY4MDQsImV4cCI6MjA3NDg3MjgwNH0.df9yt9tIP58S8JTPgvpreKqpVGkb01NtC1e7kYgg0rc';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
  console.log('🚀 Начинаю настройку базы данных...');

  try {
    // Читаем SQL файл
    const sqlPath = join(__dirname, 'database', 'schema.sql');
    const sql = readFileSync(sqlPath, 'utf8');

    console.log('📄 SQL скрипт загружен');
    console.log('⚠️  ВНИМАНИЕ: Для выполнения SQL необходимо:');
    console.log('   1. Открыть Supabase Dashboard');
    console.log('   2. Перейти в SQL Editor');
    console.log('   3. Скопировать содержимое database/schema.sql');
    console.log('   4. Выполнить скрипт');
    console.log('\n📋 Или используйте следующий SQL:\n');
    console.log(sql);

    // Альтернативно - создадим таблицы через REST API
    console.log('\n\n🔄 Попытка создать таблицы через API...');

    // Проверка подключения
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (error && error.code === '42P01') {
      console.log('✅ Таблица profiles не существует - требуется создание');
      console.log('📝 Пожалуйста, выполните SQL вручную в Supabase Dashboard');
    } else if (error) {
      console.error('❌ Ошибка подключения:', error.message);
    } else {
      console.log('✅ База данных уже настроена!');
    }

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

setupDatabase();

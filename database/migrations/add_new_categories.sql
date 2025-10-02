-- Миграция для добавления новых категорий событий и справочников
-- Дата: 2025-10-02

-- ============================================
-- 1. СПРАВОЧНИКИ (DICTIONARIES)
-- ============================================

-- Типы практик йоги
CREATE TABLE IF NOT EXISTS yoga_practice_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Типы кухни для кулинарных мастер-классов
CREATE TABLE IF NOT EXISTS cuisine_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Музыкальные жанры
CREATE TABLE IF NOT EXISTS music_genres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Музыкальные инструменты
CREATE TABLE IF NOT EXISTS musical_instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(50), -- струнные, духовые, ударные, клавишные
  created_at TIMESTAMP DEFAULT NOW()
);

-- Темы образовательных семинаров
CREATE TABLE IF NOT EXISTS seminar_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Типы пикников
CREATE TABLE IF NOT EXISTS picnic_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Тематики фотосъёмки
CREATE TABLE IF NOT EXISTS photography_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Фотооборудование
CREATE TABLE IF NOT EXISTS photography_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  type VARCHAR(50), -- камера, объектив, аксессуар
  created_at TIMESTAMP DEFAULT NOW()
);

-- Тематики квестов
CREATE TABLE IF NOT EXISTS quest_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Стили танцев
CREATE TABLE IF NOT EXISTS dance_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Типы волонтёрской деятельности
CREATE TABLE IF NOT EXISTS volunteer_activity_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Навыки для волонтёрства
CREATE TABLE IF NOT EXISTS volunteer_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Типы фитнес-тренировок
CREATE TABLE IF NOT EXISTS fitness_workout_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Театральные жанры
CREATE TABLE IF NOT EXISTS theater_genres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Типы ремесла
CREATE TABLE IF NOT EXISTS craft_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Материалы для ремесла
CREATE TABLE IF NOT EXISTS craft_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  craft_type_id UUID REFERENCES craft_types(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Виды спорта
CREATE TABLE IF NOT EXISTS sports_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  team_sport BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Типы экологических туров
CREATE TABLE IF NOT EXISTS eco_tour_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 2. СВЯЗУЮЩИЕ ТАБЛИЦЫ (MANY-TO-MANY)
-- ============================================

-- Инструменты для музыкальных джемов
CREATE TABLE IF NOT EXISTS event_musical_instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  instrument_id UUID REFERENCES musical_instruments(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(event_id, instrument_id)
);

-- Навыки для волонтёрских акций
CREATE TABLE IF NOT EXISTS event_volunteer_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES volunteer_skills(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(event_id, skill_id)
);

-- Материалы для ремесленных мастер-классов
CREATE TABLE IF NOT EXISTS event_craft_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  material_id UUID REFERENCES craft_materials(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(event_id, material_id)
);

-- Фотооборудование для фотопрогулок
CREATE TABLE IF NOT EXISTS event_photography_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES photography_equipment(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(event_id, equipment_id)
);

-- ============================================
-- 3. НАПОЛНЕНИЕ СПРАВОЧНИКОВ ДАННЫМИ
-- ============================================

-- Типы практик йоги
INSERT INTO yoga_practice_types (name, description) VALUES
('Хатха', 'Классическая практика с акцентом на асаны и дыхание'),
('Виньяса', 'Динамичная практика с плавными переходами'),
('Релаксация', 'Мягкая практика для расслабления и медитации'),
('Аштанга', 'Силовая динамическая практика'),
('Инь-йога', 'Медленная практика с длительным удержанием поз'),
('Кундалини', 'Практика для работы с энергией')
ON CONFLICT (name) DO NOTHING;

-- Типы кухни
INSERT INTO cuisine_types (name, description) VALUES
('Итальянская', 'Паста, пицца, ризотто'),
('Азиатская', 'Блюда восточной кухни'),
('Вегетарианская', 'Без мяса и рыбы'),
('Выпечка', 'Хлеб, торты, пирожные'),
('Французская', 'Изысканная европейская кухня'),
('Грузинская', 'Традиционные кавказские блюда'),
('Японская', 'Суши, роллы, рамен')
ON CONFLICT (name) DO NOTHING;

-- Музыкальные жанры
INSERT INTO music_genres (name) VALUES
('Джаз'), ('Рок'), ('Фолк'), ('Блюз'), ('Поп'),
('Классика'), ('Электронная'), ('Регги'), ('Кантри')
ON CONFLICT (name) DO NOTHING;

-- Музыкальные инструменты
INSERT INTO musical_instruments (name, category) VALUES
('Гитара', 'струнные'),
('Бас-гитара', 'струнные'),
('Барабаны', 'ударные'),
('Клавиши/Синтезатор', 'клавишные'),
('Саксофон', 'духовые'),
('Труба', 'духовые'),
('Скрипка', 'струнные'),
('Укулеле', 'струнные'),
('Перкуссия', 'ударные'),
('Флейта', 'духовые')
ON CONFLICT (name) DO NOTHING;

-- Темы семинаров
INSERT INTO seminar_topics (name) VALUES
('Экология'), ('Бизнес'), ('Психология'), ('Здоровье'),
('Технологии'), ('Искусство'), ('Финансы'), ('Образование')
ON CONFLICT (name) DO NOTHING;

-- Типы пикников
INSERT INTO picnic_types (name) VALUES
('Семейный'), ('Романтический'), ('Тематический'),
('Корпоративный'), ('Детский'), ('С друзьями')
ON CONFLICT (name) DO NOTHING;

-- Тематики фотосъёмки
INSERT INTO photography_themes (name) VALUES
('Городские пейзажи'), ('Портреты'), ('Макро'),
('Архитектура'), ('Природа'), ('Уличная фотография'),
('Закаты и рассветы'), ('Ночная съёмка')
ON CONFLICT (name) DO NOTHING;

-- Фотооборудование
INSERT INTO photography_equipment (name, type) VALUES
('Зеркальная камера', 'камера'),
('Беззеркальная камера', 'камера'),
('Широкоугольный объектив', 'объектив'),
('Портретный объектив', 'объектив'),
('Макро объектив', 'объектив'),
('Штатив', 'аксессуар'),
('Фильтры', 'аксессуар'),
('Вспышка', 'аксессуар')
ON CONFLICT (name) DO NOTHING;

-- Тематики квестов
INSERT INTO quest_themes (name) VALUES
('Детектив'), ('Фэнтези'), ('Историческая'),
('Хоррор'), ('Приключения'), ('Научная фантастика')
ON CONFLICT (name) DO NOTHING;

-- Стили танцев
INSERT INTO dance_styles (name) VALUES
('Сальса'), ('Хип-хоп'), ('Бальные танцы'),
('Бачата'), ('Контемпорари'), ('Танго'),
('Брейк-данс'), ('Вальс'), ('Латина')
ON CONFLICT (name) DO NOTHING;

-- Типы волонтёрской деятельности
INSERT INTO volunteer_activity_types (name) VALUES
('Уборка парка'), ('Помощь животным'), ('Социальная помощь'),
('Помощь пожилым'), ('Образовательная программа'),
('Благоустройство территории'), ('Экологический проект')
ON CONFLICT (name) DO NOTHING;

-- Навыки для волонтёрства
INSERT INTO volunteer_skills (name) VALUES
('Физическая выносливость'), ('Работа с людьми'), ('Медицинские навыки'),
('Строительные навыки'), ('Организаторские способности'),
('Работа с животными'), ('Преподавание'), ('Первая помощь')
ON CONFLICT (name) DO NOTHING;

-- Типы фитнес-тренировок
INSERT INTO fitness_workout_types (name) VALUES
('Кардио'), ('Силовая'), ('HIIT'),
('Функциональная'), ('Пилатес'), ('Crossfit'),
('Бокс'), ('Растяжка'), ('Табата')
ON CONFLICT (name) DO NOTHING;

-- Театральные жанры
INSERT INTO theater_genres (name) VALUES
('Комедия'), ('Драма'), ('Мюзикл'),
('Трагедия'), ('Водевиль'), ('Опера'),
('Балет'), ('Экспериментальный театр')
ON CONFLICT (name) DO NOTHING;

-- Типы ремесла
INSERT INTO craft_types (name) VALUES
('Вязание'), ('Гончарство'), ('Декупаж'),
('Вышивка'), ('Мыловарение'), ('Скрапбукинг'),
('Бисероплетение'), ('Валяние'), ('Макраме')
ON CONFLICT (name) DO NOTHING;

-- Виды спорта
INSERT INTO sports_types (name, team_sport) VALUES
('Футбол', true), ('Баскетбол', true), ('Теннис', false),
('Волейбол', true), ('Бадминтон', false), ('Хоккей', true),
('Настольный теннис', false), ('Регби', true)
ON CONFLICT (name) DO NOTHING;

-- Типы экологических туров
INSERT INTO eco_tour_types (name, description) VALUES
('Наблюдение за птицами', 'Bird watching'),
('Сбор мусора', 'Экологическая уборка природных территорий'),
('Изучение флоры', 'Ботанические прогулки'),
('Наблюдение за животными', 'Wildlife watching'),
('Экологический трекинг', 'Походы с образовательной целью')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 4. RLS ПОЛИТИКИ
-- ============================================

-- Все справочники доступны для чтения всем, изменять может только администратор
ALTER TABLE yoga_practice_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuisine_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE musical_instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE seminar_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE picnic_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE photography_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE photography_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dance_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_activity_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitness_workout_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE theater_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE craft_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE craft_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE eco_tour_types ENABLE ROW LEVEL SECURITY;

-- Политики чтения для всех справочников
CREATE POLICY "Allow read access to all" ON yoga_practice_types FOR SELECT USING (true);
CREATE POLICY "Allow read access to all" ON cuisine_types FOR SELECT USING (true);
CREATE POLICY "Allow read access to all" ON music_genres FOR SELECT USING (true);
CREATE POLICY "Allow read access to all" ON musical_instruments FOR SELECT USING (true);
CREATE POLICY "Allow read access to all" ON seminar_topics FOR SELECT USING (true);
CREATE POLICY "Allow read access to all" ON picnic_types FOR SELECT USING (true);
CREATE POLICY "Allow read access to all" ON photography_themes FOR SELECT USING (true);
CREATE POLICY "Allow read access to all" ON photography_equipment FOR SELECT USING (true);
CREATE POLICY "Allow read access to all" ON quest_themes FOR SELECT USING (true);
CREATE POLICY "Allow read access to all" ON dance_styles FOR SELECT USING (true);
CREATE POLICY "Allow read access to all" ON volunteer_activity_types FOR SELECT USING (true);
CREATE POLICY "Allow read access to all" ON volunteer_skills FOR SELECT USING (true);
CREATE POLICY "Allow read access to all" ON fitness_workout_types FOR SELECT USING (true);
CREATE POLICY "Allow read access to all" ON theater_genres FOR SELECT USING (true);
CREATE POLICY "Allow read access to all" ON craft_types FOR SELECT USING (true);
CREATE POLICY "Allow read access to all" ON craft_materials FOR SELECT USING (true);
CREATE POLICY "Allow read access to all" ON sports_types FOR SELECT USING (true);
CREATE POLICY "Allow read access to all" ON eco_tour_types FOR SELECT USING (true);

-- RLS для связующих таблиц
ALTER TABLE event_musical_instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_volunteer_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_craft_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_photography_equipment ENABLE ROW LEVEL SECURITY;

-- Политики для связующих таблиц (аналогично event_board_games)
CREATE POLICY "Allow read access to all" ON event_musical_instruments FOR SELECT USING (true);
CREATE POLICY "Users can manage their event instruments" ON event_musical_instruments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_musical_instruments.event_id
      AND events.creator_id = auth.uid()
    )
  );

CREATE POLICY "Allow read access to all" ON event_volunteer_skills FOR SELECT USING (true);
CREATE POLICY "Users can manage their event skills" ON event_volunteer_skills
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_volunteer_skills.event_id
      AND events.creator_id = auth.uid()
    )
  );

CREATE POLICY "Allow read access to all" ON event_craft_materials FOR SELECT USING (true);
CREATE POLICY "Users can manage their event materials" ON event_craft_materials
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_craft_materials.event_id
      AND events.creator_id = auth.uid()
    )
  );

CREATE POLICY "Allow read access to all" ON event_photography_equipment FOR SELECT USING (true);
CREATE POLICY "Users can manage their event equipment" ON event_photography_equipment
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_photography_equipment.event_id
      AND events.creator_id = auth.uid()
    )
  );

-- ============================================
-- ЗАВЕРШЕНО
-- ============================================
-- После применения этой миграции обновите enum для категорий в коде:
-- yoga, cooking, music_jam, seminar, picnic, photo_walk, quest,
-- dance, tour, volunteer, fitness, theater, auto_tour, craft, concert, sports, eco_tour

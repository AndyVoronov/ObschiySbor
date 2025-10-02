-- Добавление полей координат в таблицу events
-- Дата: 2025-10-01

-- Добавляем поля latitude и longitude
ALTER TABLE events
ADD COLUMN latitude DECIMAL(10, 8),
ADD COLUMN longitude DECIMAL(11, 8);

-- Создаём индекс для поиска по координатам (для будущих функций поиска по радиусу)
CREATE INDEX idx_events_coordinates ON events(latitude, longitude);

-- Комментарии для полей
COMMENT ON COLUMN events.latitude IS 'Широта местоположения события (-90 до 90)';
COMMENT ON COLUMN events.longitude IS 'Долгота местоположения события (-180 до 180)';

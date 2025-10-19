-- Миграция: Создание таблицы reports для жалоб
-- Версия: 1.0
-- Дата: 2025-10-14
-- ВАЖНО: Применить ДО migration_moderator_role.sql

-- Создаём таблицу reports если её нет
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'reviewed', 'resolved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаём индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_reports_event_id ON reports(event_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- Комментарии
COMMENT ON TABLE reports IS 'Жалобы пользователей на события';
COMMENT ON COLUMN reports.event_id IS 'ID события, на которое жалуются';
COMMENT ON COLUMN reports.reporter_id IS 'ID пользователя, отправившего жалобу';
COMMENT ON COLUMN reports.reason IS 'Причина жалобы';
COMMENT ON COLUMN reports.status IS 'Статус жалобы: pending, reviewed, resolved, rejected';

-- Включаем RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Базовые политики (будут обновлены в migration_moderator_role.sql)
-- Пока только создатель видит свои жалобы
DROP POLICY IF EXISTS "Users can view own reports" ON reports;
CREATE POLICY "Users can view own reports"
ON reports FOR SELECT
TO authenticated
USING (reporter_id = auth.uid());

-- Любой авторизованный пользователь может создать жалобу
DROP POLICY IF EXISTS "Users can create reports" ON reports;
CREATE POLICY "Users can create reports"
ON reports FOR INSERT
TO authenticated
WITH CHECK (reporter_id = auth.uid());

DO $$
BEGIN
  RAISE NOTICE 'Таблица reports успешно создана!';
  RAISE NOTICE 'Теперь можно применить migration_moderator_role.sql для добавления ролей модераторов.';
END $$;

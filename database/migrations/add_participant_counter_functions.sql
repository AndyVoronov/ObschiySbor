-- Функция для увеличения счетчика участников
CREATE OR REPLACE FUNCTION increment_participants(event_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE events
  SET current_participants = current_participants + 1
  WHERE id = event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для уменьшения счетчика участников
CREATE OR REPLACE FUNCTION decrement_participants(event_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE events
  SET current_participants = GREATEST(current_participants - 1, 0)
  WHERE id = event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Комментарии
COMMENT ON FUNCTION increment_participants IS 'Атомарное увеличение счетчика участников события';
COMMENT ON FUNCTION decrement_participants IS 'Атомарное уменьшение счетчика участников события (не ниже 0)';

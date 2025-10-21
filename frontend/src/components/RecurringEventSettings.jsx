import { useState, useEffect, useRef } from 'react';
import './RecurringEventSettings.css';

/**
 * Компонент для настройки повторяющихся событий
 */
const RecurringEventSettings = ({ value = {}, onChange }) => {
  const [isRecurring, setIsRecurring] = useState(value.isRecurring || false);
  const [frequency, setFrequency] = useState(value.frequency || 'weekly');
  const [interval, setInterval] = useState(value.interval || 1);
  const [occurrenceCount, setOccurrenceCount] = useState(value.occurrenceCount || 10);
  const [daysOfWeek, setDaysOfWeek] = useState(value.daysOfWeek || []);
  const [endDate, setEndDate] = useState(value.endDate || '');
  const [endType, setEndType] = useState(value.endType || 'count'); // 'count' или 'date'
  const isFirstRender = useRef(true);

  // Дни недели для выбора
  const weekDays = [
    { value: 1, label: 'Пн', fullLabel: 'Понедельник' },
    { value: 2, label: 'Вт', fullLabel: 'Вторник' },
    { value: 3, label: 'Ср', fullLabel: 'Среда' },
    { value: 4, label: 'Чт', fullLabel: 'Четверг' },
    { value: 5, label: 'Пт', fullLabel: 'Пятница' },
    { value: 6, label: 'Сб', fullLabel: 'Суббота' },
    { value: 7, label: 'Вс', fullLabel: 'Воскресенье' },
  ];

  // Обновление родительского компонента при изменении настроек
  useEffect(() => {
    // Пропускаем первый рендер, чтобы избежать бесконечного цикла
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (onChange) {
      onChange({
        isRecurring,
        frequency,
        interval,
        occurrenceCount: endType === 'count' ? occurrenceCount : null,
        daysOfWeek: frequency === 'weekly' && daysOfWeek.length > 0 ? daysOfWeek : null,
        endDate: endType === 'date' ? endDate : null,
        endType,
      });
    }
  }, [isRecurring, frequency, interval, occurrenceCount, daysOfWeek, endDate, endType, onChange]);

  const handleDayToggle = (dayValue) => {
    setDaysOfWeek(prev => {
      if (prev.includes(dayValue)) {
        return prev.filter(d => d !== dayValue);
      } else {
        return [...prev, dayValue].sort();
      }
    });
  };

  const getRecurrenceDescription = () => {
    if (!isRecurring) return '';

    let desc = 'Событие будет повторяться ';

    // Частота
    switch (frequency) {
      case 'daily':
        desc += interval === 1 ? 'каждый день' : `каждые ${interval} дня`;
        break;
      case 'weekly':
        if (daysOfWeek.length > 0) {
          const dayNames = daysOfWeek.map(d => weekDays.find(wd => wd.value === d)?.label).join(', ');
          desc += `каждую неделю по: ${dayNames}`;
        } else {
          desc += interval === 1 ? 'каждую неделю' : `каждые ${interval} недели`;
        }
        break;
      case 'monthly':
        desc += interval === 1 ? 'каждый месяц' : `каждые ${interval} месяца`;
        break;
    }

    // Окончание
    if (endType === 'count') {
      desc += `, всего ${occurrenceCount} раз`;
    } else if (endDate) {
      desc += ` до ${new Date(endDate).toLocaleDateString('ru-RU')}`;
    }

    return desc;
  };

  return (
    <div className="recurring-event-settings">
      <div className="recurring-toggle">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="toggle-checkbox"
          />
          <span className="toggle-switch"></span>
          <span className="toggle-text">🔄 Повторяющееся событие</span>
        </label>
      </div>

      {isRecurring && (
        <div className="recurring-options">
          {/* Частота повторения */}
          <div className="form-group">
            <label htmlFor="frequency">Частота повторения</label>
            <select
              id="frequency"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="form-control"
            >
              <option value="daily">Ежедневно</option>
              <option value="weekly">Еженедельно</option>
              <option value="monthly">Ежемесячно</option>
            </select>
          </div>

          {/* Интервал */}
          <div className="form-group">
            <label htmlFor="interval">
              Интервал ({frequency === 'daily' ? 'дней' : frequency === 'weekly' ? 'недель' : 'месяцев'})
            </label>
            <input
              type="number"
              id="interval"
              min="1"
              max="30"
              value={interval}
              onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
              className="form-control"
            />
          </div>

          {/* Дни недели (только для еженедельных событий) */}
          {frequency === 'weekly' && (
            <div className="form-group">
              <label>Дни недели</label>
              <div className="days-of-week">
                {weekDays.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => handleDayToggle(day.value)}
                    className={`day-button ${daysOfWeek.includes(day.value) ? 'active' : ''}`}
                    title={day.fullLabel}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              <small className="form-hint">
                Оставьте пустым для повторения в тот же день недели
              </small>
            </div>
          )}

          {/* Тип окончания */}
          <div className="form-group">
            <label>Окончание повторения</label>
            <div className="end-type-radio">
              <label className="radio-label">
                <input
                  type="radio"
                  value="count"
                  checked={endType === 'count'}
                  onChange={(e) => setEndType(e.target.value)}
                />
                <span>После количества повторений</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  value="date"
                  checked={endType === 'date'}
                  onChange={(e) => setEndType(e.target.value)}
                />
                <span>До определённой даты</span>
              </label>
            </div>
          </div>

          {/* Количество повторений */}
          {endType === 'count' && (
            <div className="form-group">
              <label htmlFor="occurrenceCount">Количество повторений</label>
              <input
                type="number"
                id="occurrenceCount"
                min="1"
                max="100"
                value={occurrenceCount}
                onChange={(e) => setOccurrenceCount(parseInt(e.target.value) || 1)}
                className="form-control"
              />
              <small className="form-hint">
                Будет создано {occurrenceCount} событий
              </small>
            </div>
          )}

          {/* Дата окончания */}
          {endType === 'date' && (
            <div className="form-group">
              <label htmlFor="endDate">Дата окончания</label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="form-control"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          )}

          {/* Описание расписания */}
          {getRecurrenceDescription() && (
            <div className="recurrence-description">
              <p className="description-text">
                ℹ️ {getRecurrenceDescription()}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecurringEventSettings;

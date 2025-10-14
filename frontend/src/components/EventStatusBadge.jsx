import PropTypes from 'prop-types';
import { getEventStatus, EVENT_STATUS_LABELS, EVENT_STATUS_COLORS, EVENT_STATUS_EMOJI } from '../utils/eventStatus';
import './EventStatusBadge.css';

/**
 * Компонент для отображения статуса события
 */
const EventStatusBadge = ({ event, showEmoji = true, className = '' }) => {
  const status = getEventStatus(event);
  const label = EVENT_STATUS_LABELS[status];
  const color = EVENT_STATUS_COLORS[status];
  const emoji = showEmoji ? EVENT_STATUS_EMOJI[status] : '';

  // Debug: проверяем что приходит
  console.log('EventStatusBadge event:', {
    id: event.id,
    title: event.title,
    status: event.status,
    event_date: event.event_date,
    calculated_status: status
  });

  return (
    <span
      className={`event-status-badge ${className}`}
      style={{ backgroundColor: color }}
      title={label}
    >
      {emoji && <span className="status-emoji">{emoji}</span>}
      <span className="status-label">{label}</span>
    </span>
  );
};

EventStatusBadge.propTypes = {
  event: PropTypes.object.isRequired,
  showEmoji: PropTypes.bool,
  className: PropTypes.string,
};

export default EventStatusBadge;

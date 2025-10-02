import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getCategoryName } from '../constants/categories';
import { formatDateCompact } from '../utils/dateUtils';
import './EventsMapView.css';

// Фикс для иконок Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MOSCOW_CENTER = [55.751244, 37.618423];

const EventsMapView = ({ events }) => {
  // Мемоизация фильтрации событий с координатами
  const eventsWithLocation = useMemo(() => {
    return events.filter(e => e.latitude && e.longitude);
  }, [events]);

  // Мемоизация центра карты
  const mapCenter = useMemo(() => {
    if (eventsWithLocation.length === 0) {
      return MOSCOW_CENTER;
    }

    const avgLat = eventsWithLocation.reduce((sum, e) => sum + parseFloat(e.latitude), 0) / eventsWithLocation.length;
    const avgLng = eventsWithLocation.reduce((sum, e) => sum + parseFloat(e.longitude), 0) / eventsWithLocation.length;

    return [avgLat, avgLng];
  }, [eventsWithLocation]);

  if (eventsWithLocation.length === 0) {
    return (
      <div className="events-map-empty">
        <p>📍 Нет событий с указанными координатами</p>
        <p className="hint">События без локации на карте не отображаются</p>
      </div>
    );
  }

  return (
    <div className="events-map-container">
      <MapContainer
        center={mapCenter}
        zoom={11}
        style={{ height: '600px', width: '100%' }}
        className="events-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {eventsWithLocation.map((event) => (
          <Marker
            key={event.id}
            position={[parseFloat(event.latitude), parseFloat(event.longitude)]}
          >
            <Popup>
              <div className="event-popup">
                {event.image_url && (
                  <img src={event.image_url} alt={event.title} className="popup-image" />
                )}
                <h3>{event.title}</h3>
                <p className="popup-category">{getCategoryName(event.category)}</p>
                <p className="popup-date">📅 {formatDateCompact(event.event_date)}</p>
                <p className="popup-location">📍 {event.location}</p>
                <p className="popup-participants">
                  👥 {event.current_participants}/{event.max_participants} участников
                </p>
                <Link to={`/events/${event.id}`} className="popup-link">
                  Подробнее →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="map-info">
        <p>📍 Показано событий на карте: {eventsWithLocation.length} из {events.length}</p>
      </div>
    </div>
  );
};

export default EventsMapView;

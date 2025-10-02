import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './EventsMapView.css';

// Фикс для иконок Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const EventsMapView = ({ events }) => {
  // Определяем центр карты
  const getMapCenter = () => {
    const validEvents = events.filter(e => e.latitude && e.longitude);

    if (validEvents.length === 0) {
      // По умолчанию - центр Москвы
      return [55.751244, 37.618423];
    }

    // Вычисляем центр по всем событиям
    const avgLat = validEvents.reduce((sum, e) => sum + parseFloat(e.latitude), 0) / validEvents.length;
    const avgLng = validEvents.reduce((sum, e) => sum + parseFloat(e.longitude), 0) / validEvents.length;

    return [avgLat, avgLng];
  };

  const getCategoryName = (category) => {
    const categories = {
      board_games: 'Настольные игры',
      cycling: 'Велопрогулки',
      hiking: 'Походы',
    };
    return categories[category] || category;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Фильтруем события с координатами
  const eventsWithLocation = events.filter(e => e.latitude && e.longitude);

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
        center={getMapCenter()}
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
                <p className="popup-date">📅 {formatDate(event.event_date)}</p>
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

import { useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getCategoryName } from '../constants/categories';
import { formatDateCompact } from '../utils/dateUtils';
import { getEventStatus, EVENT_STATUS_LABELS, EVENT_STATUS_EMOJI } from '../utils/eventStatus';
import './EventsMapView.css';

const MOSCOW_CENTER = [55.751244, 37.618423];

const EventsMapView = ({ events }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

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

  useEffect(() => {
    const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY;

    if (!window.ymaps) {
      const script = document.createElement('script');
      script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`;
      script.async = true;
      document.head.appendChild(script);

      script.onload = () => {
        window.ymaps.ready(() => {
          initMap();
        });
      };
    } else {
      window.ymaps.ready(() => {
        initMap();
      });
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.destroy();
        mapInstance.current = null;
      }
    };
  }, [mapCenter]);

  useEffect(() => {
    if (mapInstance.current && eventsWithLocation.length > 0) {
      updateMarkers();
    }
  }, [eventsWithLocation]);

  const initMap = () => {
    if (!mapRef.current || mapInstance.current) return;

    const yandexMap = new window.ymaps.Map(mapRef.current, {
      center: mapCenter,
      zoom: 11,
      controls: ['zoomControl', 'fullscreenControl', 'geolocationControl']
    });

    mapInstance.current = yandexMap;
    updateMarkers();
  };

  const updateMarkers = () => {
    if (!mapInstance.current) return;

    // Удаляем все существующие метки
    mapInstance.current.geoObjects.removeAll();

    // Добавляем метки для каждого события
    eventsWithLocation.forEach((event) => {
      const status = getEventStatus(event);
      const statusLabel = EVENT_STATUS_LABELS[status];
      const statusEmoji = EVENT_STATUS_EMOJI[status];

      const placemark = new window.ymaps.Placemark(
        [parseFloat(event.latitude), parseFloat(event.longitude)],
        {
          balloonContentHeader: `<strong>${event.title}</strong>`,
          balloonContentBody: `
            ${event.image_url ? `<img src="${event.image_url}" alt="${event.title}" style="max-width: 200px; height: auto; margin-bottom: 10px;" />` : ''}
            <p><strong>${getCategoryName(event.category)}</strong></p>
            <p>${statusEmoji} <strong>Статус:</strong> ${statusLabel}</p>
            <p>📅 ${formatDateCompact(event.event_date)}</p>
            <p>📍 ${event.location}</p>
            <p>👥 ${event.current_participants}/${event.max_participants} участников</p>
          `,
          balloonContentFooter: `<a href="/events/${event.id}" style="color: #4CAF50; text-decoration: none;">Подробнее →</a>`,
          hintContent: event.title
        },
        {
          preset: 'islands#blueDotIcon'
        }
      );

      mapInstance.current.geoObjects.add(placemark);
    });

    // Автомасштабирование, чтобы все метки были видны
    if (eventsWithLocation.length > 1) {
      mapInstance.current.setBounds(mapInstance.current.geoObjects.getBounds(), {
        checkZoomRange: true,
        zoomMargin: 50
      });
    }
  };

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
      <div ref={mapRef} style={{ height: '600px', width: '100%' }} className="events-map" />

      <div className="map-info">
        <p>📍 Показано событий на карте: {eventsWithLocation.length} из {events.length}</p>
      </div>
    </div>
  );
};

export default EventsMapView;

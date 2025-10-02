import { useEffect, useRef } from 'react';
import './EventMap.css';

export default function EventMap({ latitude, longitude, location, eventTitle }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    if (!latitude || !longitude) return;

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
  }, [latitude, longitude]);

  const initMap = () => {
    if (!mapRef.current || mapInstance.current) return;

    const yandexMap = new window.ymaps.Map(mapRef.current, {
      center: [latitude, longitude],
      zoom: 15,
      controls: ['zoomControl', 'fullscreenControl']
    });

    mapInstance.current = yandexMap;

    const placemark = new window.ymaps.Placemark(
      [latitude, longitude],
      {
        balloonContentHeader: `<strong>${eventTitle}</strong>`,
        balloonContentBody: location,
        hintContent: eventTitle
      },
      {
        preset: 'islands#redDotIcon'
      }
    );

    yandexMap.geoObjects.add(placemark);
  };

  if (!latitude || !longitude) {
    return null;
  }

  return (
    <div className="event-map">
      <h3>Место на карте</h3>
      <div ref={mapRef} style={{ height: '300px', width: '100%' }} className="event-map-container" />
      <p className="map-coordinates">
        Координаты: {latitude.toFixed(6)}, {longitude.toFixed(6)}
      </p>
    </div>
  );
}

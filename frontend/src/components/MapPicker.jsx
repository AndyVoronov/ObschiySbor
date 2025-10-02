import { useEffect, useRef, useState, useCallback } from 'react';
import './MapPicker.css';

export default function MapPicker({
  initialPosition = { lat: 55.751244, lng: 37.618423 }, // Москва по умолчанию
  onLocationSelect,
  onAddressChange
}) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const placemarkInstance = useRef(null);
  const [address, setAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const isInitialized = useRef(false);

  // Обратное геокодирование (координаты → адрес)
  const reverseGeocode = useCallback(async (coords) => {
    setIsLoadingAddress(true);

    try {
      const result = await window.ymaps.geocode(coords);
      const firstGeoObject = result.geoObjects.get(0);
      const addressText = firstGeoObject.getAddressLine();

      setAddress(addressText);
      if (onAddressChange) {
        onAddressChange(addressText);
      }
      if (onLocationSelect) {
        onLocationSelect({ lat: coords[0], lng: coords[1] });
      }
    } catch (error) {
      console.error('Ошибка геокодирования:', error);
      setAddress('Ошибка определения адреса');
    } finally {
      setIsLoadingAddress(false);
    }
  }, [onAddressChange, onLocationSelect]);

  // Обновление позиции маркера
  const updatePlacemark = useCallback((coords) => {
    if (placemarkInstance.current) {
      placemarkInstance.current.geometry.setCoordinates(coords);
      reverseGeocode(coords);
    }
  }, [reverseGeocode]);

  // Инициализация карты
  useEffect(() => {
    if (isInitialized.current) return;

    const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY;

    const initMap = () => {
      if (!mapRef.current || mapInstance.current) return;

      const yandexMap = new window.ymaps.Map(mapRef.current, {
        center: [initialPosition.lat, initialPosition.lng],
        zoom: 13,
        controls: ['zoomControl', 'fullscreenControl']
      });

      mapInstance.current = yandexMap;

      // Создаём начальный маркер
      const initialPlacemark = new window.ymaps.Placemark(
        [initialPosition.lat, initialPosition.lng],
        {
          balloonContent: 'Место события'
        },
        {
          preset: 'islands#redDotIcon',
          draggable: true
        }
      );

      yandexMap.geoObjects.add(initialPlacemark);
      placemarkInstance.current = initialPlacemark;

      // Обработка клика по карте
      yandexMap.events.add('click', (e) => {
        const coords = e.get('coords');
        updatePlacemark(coords);
      });

      // Обработка перетаскивания маркера
      initialPlacemark.events.add('dragend', () => {
        const coords = initialPlacemark.geometry.getCoordinates();
        reverseGeocode(coords);
      });

      // Получаем адрес для начальной позиции
      reverseGeocode([initialPosition.lat, initialPosition.lng]);

      isInitialized.current = true;
    };

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
        placemarkInstance.current = null;
        isInitialized.current = false;
      }
    };
  }, []); // Пустой массив зависимостей - инициализация только один раз

  // Прямое геокодирование (адрес → координаты)
  const geocodeAddress = async (query) => {
    setIsLoadingAddress(true);

    try {
      const result = await window.ymaps.geocode(query);
      const firstGeoObject = result.geoObjects.get(0);

      if (firstGeoObject) {
        const coords = firstGeoObject.geometry.getCoordinates();
        const addressText = firstGeoObject.getAddressLine();

        if (mapInstance.current && placemarkInstance.current) {
          mapInstance.current.setCenter(coords, 15);
          placemarkInstance.current.geometry.setCoordinates(coords);
          setAddress(addressText);

          if (onAddressChange) {
            onAddressChange(addressText);
          }
          if (onLocationSelect) {
            onLocationSelect({ lat: coords[0], lng: coords[1] });
          }
        }
      } else {
        alert('Адрес не найден');
      }
    } catch (error) {
      console.error('Ошибка поиска адреса:', error);
      alert('Не удалось найти адрес');
    } finally {
      setIsLoadingAddress(false);
    }
  };

  const handleSearchClick = () => {
    if (searchQuery.trim()) {
      geocodeAddress(searchQuery);
    }
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchClick();
    }
  };

  return (
    <div className="map-picker">
      <div className="map-search">
        <input
          type="text"
          placeholder="Введите адрес для поиска..."
          className="map-search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleSearchKeyPress}
        />
        <button type="button" className="map-search-btn" onClick={handleSearchClick} disabled={isLoadingAddress}>
          {isLoadingAddress ? 'Поиск...' : 'Найти'}
        </button>
      </div>

      <div ref={mapRef} style={{ height: '400px', width: '100%' }} className="map-container" />

      {address && (
        <div className="map-address">
          <strong>Выбранный адрес:</strong>
          <p>{address}</p>
        </div>
      )}

      <p className="map-hint">
        💡 Кликните на карту или перетащите маркер, чтобы выбрать точное место проведения события
      </p>
    </div>
  );
}

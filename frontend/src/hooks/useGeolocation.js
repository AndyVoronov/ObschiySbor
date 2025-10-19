import { useState, useEffect } from 'react';

/**
 * Хук для работы с геолокацией пользователя
 *
 * @returns {Object} объект с координатами, статусами и функциями
 */
export function useGeolocation() {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [permission, setPermission] = useState(null);

  // Проверяем поддержку Geolocation API
  const isSupported = 'geolocation' in navigator;

  // Функция запроса геолокации
  const requestLocation = () => {
    if (!isSupported) {
      setError('Геолокация не поддерживается вашим браузером');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        setPermission('granted');
        setLoading(false);

        // Сохраняем в localStorage
        localStorage.setItem('userLocation', JSON.stringify({ lat: latitude, lng: longitude }));
      },
      (err) => {
        let errorMessage = 'Не удалось определить местоположение';

        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = 'Доступ к геолокации запрещён';
            setPermission('denied');
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = 'Информация о местоположении недоступна';
            break;
          case err.TIMEOUT:
            errorMessage = 'Превышено время ожидания';
            break;
          default:
            errorMessage = 'Произошла неизвестная ошибка';
        }

        setError(errorMessage);
        setPermission('denied');
        setLoading(false);
      },
      {
        enableHighAccuracy: false, // Не требуем высокую точность для экономии батареи
        timeout: 10000, // 10 секунд
        maximumAge: 300000, // Используем кэш до 5 минут
      }
    );
  };

  // Очистка геолокации
  const clearLocation = () => {
    setLocation(null);
    setPermission(null);
    setError(null);
    localStorage.removeItem('userLocation');
  };

  // Восстанавливаем из localStorage при монтировании
  useEffect(() => {
    const savedLocation = localStorage.getItem('userLocation');
    if (savedLocation) {
      try {
        const parsed = JSON.parse(savedLocation);
        if (parsed.lat && parsed.lng) {
          setLocation(parsed);
          setPermission('granted');
        }
      } catch (e) {
        console.error('Ошибка восстановления геолокации:', e);
      }
    }
  }, []);

  return {
    location,
    loading,
    error,
    permission,
    isSupported,
    requestLocation,
    clearLocation,
    hasLocation: !!location,
  };
}

import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * Компонент для ленивой загрузки изображений с использованием Intersection Observer API
 *
 * Особенности:
 * - Загружает изображение только когда оно попадает в viewport
 * - Показывает placeholder пока изображение загружается
 * - Поддержка состояния ошибки загрузки
 * - Оптимизация для производительности
 */
const LazyImage = ({
  src,
  alt,
  className = '',
  placeholder = null,
  errorPlaceholder = null,
  threshold = 0.01, // Порог видимости для начала загрузки (1%)
  rootMargin = '50px' // Отступ для предзагрузки (начинает загружать за 50px до появления)
}) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [imageLoadingState, setImageLoadingState] = useState('loading'); // 'loading' | 'loaded' | 'error'
  const imgRef = useRef(null);

  useEffect(() => {
    // Проверка поддержки Intersection Observer
    if (!('IntersectionObserver' in window)) {
      // Fallback для старых браузеров - загружаем сразу
      setImageSrc(src);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Изображение появилось во viewport - начинаем загрузку
            setImageSrc(src);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: threshold,
        rootMargin: rootMargin
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [src, threshold, rootMargin]);

  const handleLoad = () => {
    setImageLoadingState('loaded');
  };

  const handleError = () => {
    setImageLoadingState('error');
  };

  // Рендерим в зависимости от состояния
  if (imageLoadingState === 'error') {
    return (
      <div ref={imgRef} className={className} style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {errorPlaceholder || (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
            Ошибка загрузки изображения
          </div>
        )}
      </div>
    );
  }

  if (!imageSrc) {
    // Ещё не начали загрузку - показываем placeholder
    return (
      <div ref={imgRef} className={className} style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {placeholder || (
          <div style={{ color: 'var(--text-muted)' }}>
            Загрузка...
          </div>
        )}
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={className}
      onLoad={handleLoad}
      onError={handleError}
      loading="lazy" // Нативный lazy loading для дополнительной оптимизации
      style={{
        opacity: imageLoadingState === 'loaded' ? 1 : 0,
        transition: 'opacity 0.3s ease-in-out'
      }}
    />
  );
};

LazyImage.propTypes = {
  src: PropTypes.string.isRequired,
  alt: PropTypes.string.isRequired,
  className: PropTypes.string,
  placeholder: PropTypes.node,
  errorPlaceholder: PropTypes.node,
  threshold: PropTypes.number,
  rootMargin: PropTypes.string,
};

export default LazyImage;

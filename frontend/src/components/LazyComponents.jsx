import { lazy } from 'react';

// Lazy loading для тяжёлых библиотек

// Компоненты с картами (Яндекс.Карты API)
export const MapPicker = lazy(() => import('./MapPicker'));
export const EventMap = lazy(() => import('./EventMap'));
export const EventsMapView = lazy(() => import('./EventsMapView'));

// Компоненты с графиками (Recharts - тяжёлая библиотека)
export const OrganizerDashboard = lazy(() => import('./OrganizerDashboard'));

// Компоненты чатов (может быть много сообщений)
export const EventChat = lazy(() => import('./EventChat'));

// Анимационные компоненты (Three.js, GSAP)
export const Carousel = lazy(() => import('./Carousel'));

// Компонент загрузки по умолчанию
export const ComponentLoadingFallback = ({ height = '200px', message = 'Загрузка...' }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: height,
    color: 'var(--text-muted)',
  }}>
    <div className="spinner" style={{ marginRight: '0.5rem' }}></div>
    <span>{message}</span>
  </div>
);

// Специализированные компоненты загрузки
export const MapLoadingFallback = () => (
  <ComponentLoadingFallback height="400px" message="Загрузка карты..." />
);

export const ChartLoadingFallback = () => (
  <ComponentLoadingFallback height="300px" message="Загрузка графиков..." />
);

export const ChatLoadingFallback = () => (
  <ComponentLoadingFallback height="500px" message="Загрузка чата..." />
);

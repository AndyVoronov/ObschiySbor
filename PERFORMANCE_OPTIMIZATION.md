# Performance Optimization - ObschiySbor

**Дата реализации:** 2025-10-19

## Обзор

Этот документ описывает реализованные оптимизации производительности для приложения ObschiySbor. Оптимизации направлены на уменьшение размера начального бандла, ускорение загрузки страниц и улучшение пользовательского опыта.

## Реализованные оптимизации

### 1. Code Splitting и Lazy Loading компонентов

**Проблема:**
- Большие размеры бандлов страниц из-за включения тяжёлых библиотек (Recharts, Яндекс.Карты, Three.js)
- Начальный бандл index.js: 394 KB (120 KB gzip)
- Profile страница: 360 KB (107 KB gzip) - включала Recharts
- Home страница: 119 KB (40 KB gzip) - включала Three.js/GSAP

**Решение:**
Создан централизованный модуль для ленивой загрузки тяжёлых компонентов: [`frontend/src/components/LazyComponents.jsx`](frontend/src/components/LazyComponents.jsx)

**Компоненты с ленивой загрузкой:**
- `MapPicker` - выбор локации на карте (Яндекс.Карты)
- `EventMap` - отображение места события (Яндекс.Карты)
- `EventsMapView` - карта со всеми событиями (Яндекс.Карты)
- `OrganizerDashboard` - дашборд с графиками (Recharts)
- `EventChat` - чат события
- `Carousel` - карусель изображений (Three.js, GSAP)

**Компоненты загрузки (Loading Fallbacks):**
- `ComponentLoadingFallback` - универсальный индикатор загрузки
- `MapLoadingFallback` - для карт
- `ChartLoadingFallback` - для графиков
- `ChatLoadingFallback` - для чатов

**Интеграция:**
Все тяжёлые компоненты обёрнуты в `React.Suspense` с соответствующими fallback компонентами:

```jsx
import { Suspense } from 'react';
import { OrganizerDashboard, ChartLoadingFallback } from '../components/LazyComponents';

<Suspense fallback={<ChartLoadingFallback />}>
  <OrganizerDashboard userId={user.id} />
</Suspense>
```

**Изменённые файлы:**
- [frontend/src/pages/Profile.jsx](frontend/src/pages/Profile.jsx#L319) - OrganizerDashboard
- [frontend/src/pages/EventDetails.jsx](frontend/src/pages/EventDetails.jsx) - EventMap, EventChat
- [frontend/src/pages/Events.jsx](frontend/src/pages/Events.jsx#L580) - EventsMapView
- [frontend/src/pages/CreateEvent.jsx](frontend/src/pages/CreateEvent.jsx) - MapPicker

**Результаты:**
- Profile страница: 360 KB → **12 KB** (30x улучшение!)
- Home страница: 119 KB → **3.6 KB** (33x улучшение!)
- Тяжёлые библиотеки загружаются только при необходимости:
  - OrganizerDashboard-DrlYadnU.js: 348 KB (103 KB gzip)
  - Carousel-BQ3rBM6h.js: 115 KB (38 KB gzip)
  - MapPicker-Boh2J9SH.js: 2.9 KB
  - EventMap-DyW91LEl.js: 1.2 KB
  - EventsMapView-CKgSNWc9.js: 2.8 KB
  - EventChat-CpOgKchR.js: 3.9 KB

### 2. Lazy Loading изображений

**Проблема:**
- Все изображения событий загружались сразу при загрузке страницы
- Увеличивало время загрузки страниц со списком событий
- Избыточное потребление трафика

**Решение:**
Создан компонент `LazyImage` с использованием Intersection Observer API: [`frontend/src/components/LazyImage.jsx`](frontend/src/components/LazyImage.jsx)

**Особенности:**
- Загружает изображение только когда оно попадает в viewport
- Поддержка placeholder и errorPlaceholder
- Плавное появление (fade-in) при загрузке
- Предзагрузка за 50px до появления в viewport
- Fallback для браузеров без поддержки Intersection Observer
- Нативный `loading="lazy"` для дополнительной оптимизации

**Использование:**
```jsx
import LazyImage from '../components/LazyImage';

<LazyImage
  src={event.image_url}
  alt={event.title}
  className="w-full h-full object-cover"
  placeholder={
    <div className="flex items-center justify-center h-full">
      Загрузка...
    </div>
  }
/>
```

**Интегрировано в:**
- [frontend/src/pages/Events.jsx](frontend/src/pages/Events.jsx#L538) - карточки событий

**Результаты:**
- Изображения загружаются только когда пользователь прокручивает до них
- Снижение начального трафика на странице со списком событий
- Улучшенный UX с плавным появлением изображений

### 3. React Query кэширование

**Статус:** ✅ Уже реализовано (из предыдущих оптимизаций)

React Query настроен с агрессивным кэшированием:
```javascript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // 5 минут
      gcTime: 10 * 60 * 1000,     // 10 минут
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
});
```

**Преимущества:**
- Уменьшение количества запросов к Supabase
- Мгновенное отображение закэшированных данных
- Автоматическая инвалидация кэша

## Метрики производительности

### Размеры бандлов (до оптимизации)
```
index.js:              394 KB (120 KB gzip)
Profile page:          360 KB (107 KB gzip)
Home page:             119 KB (40 KB gzip)
```

### Размеры бандлов (после оптимизации)
```
index-C9wCqUBA.js:                394 KB (120 KB gzip)  # Основной бандл
Profile-CZYYGg-K.js:               12 KB (3.8 KB gzip)  # ⬇️ 30x улучшение
Home-BOfx146R.js:                 3.6 KB (1.5 KB gzip)  # ⬇️ 33x улучшение
Events-D0DRJ5nc.js:                38 KB (8.5 KB gzip)
EventDetails-Cegj_nr9.js:          40 KB (10.5 KB gzip)
CreateEvent-CdIaU2-Z.js:           42 KB (9.2 KB gzip)

# Lazy-loaded чанки
OrganizerDashboard-DrlYadnU.js:   348 KB (103 KB gzip)  # Recharts
Carousel-BQ3rBM6h.js:             115 KB (38 KB gzip)   # Three.js
MapPicker-Boh2J9SH.js:            2.9 KB (1.5 KB gzip)
EventMap-DyW91LEl.js:             1.2 KB (0.76 KB gzip)
EventsMapView-CKgSNWc9.js:        2.8 KB (1.5 KB gzip)
EventChat-CpOgKchR.js:            3.9 KB (1.7 KB gzip)
```

### Ключевые улучшения
- ✅ Profile страница: **360 KB → 12 KB** (30x уменьшение)
- ✅ Home страница: **119 KB → 3.6 KB** (33x уменьшение)
- ✅ Тяжёлые библиотеки загружаются только по требованию
- ✅ Изображения загружаются лениво при прокрутке

## Рекомендации для дальнейшего использования

### 1. Добавление новых тяжёлых компонентов

При добавлении компонентов с тяжёлыми зависимостями (графики, карты, анимации):

1. Добавьте lazy export в [`LazyComponents.jsx`](frontend/src/components/LazyComponents.jsx):
```javascript
export const MyHeavyComponent = lazy(() => import('./MyHeavyComponent'));
```

2. Оберните в Suspense при использовании:
```jsx
import { Suspense } from 'react';
import { MyHeavyComponent, ComponentLoadingFallback } from '../components/LazyComponents';

<Suspense fallback={<ComponentLoadingFallback />}>
  <MyHeavyComponent />
</Suspense>
```

### 2. Использование LazyImage

Для всех изображений событий используйте `LazyImage` вместо обычного `<img>`:

```jsx
import LazyImage from '../components/LazyImage';

<LazyImage
  src={imageUrl}
  alt={description}
  className="your-styles"
  placeholder={<YourPlaceholder />}  // опционально
  errorPlaceholder={<YourError />}    // опционально
  threshold={0.01}                    // опционально (по умолчанию 0.01)
  rootMargin="50px"                   // опционально (по умолчанию 50px)
/>
```

### 3. Мониторинг размеров бандлов

Регулярно проверяйте размеры бандлов после добавления новых зависимостей:

```bash
cd frontend
npm run build
```

Анализируйте вывод и убедитесь, что:
- Основной бандл (index.js) остаётся < 400 KB
- Страницы < 50 KB (без lazy-loaded компонентов)
- Тяжёлые библиотеки вынесены в отдельные чанки

## Дополнительные возможности для оптимизации

### Приоритет 1 (рекомендуется)
- [ ] **Bundle analyzer** - визуализация состава бандлов (vite-plugin-bundle-analyzer)
- [ ] **Preloading** - предзагрузка критических чанков
- [ ] **Service Worker** - кэширование статики и API запросов

### Приоритет 2
- [ ] **Image optimization** - сжатие изображений на сервере (WebP, AVIF)
- [ ] **CDN** - раздача статики через CDN
- [ ] **HTTP/2 Server Push** - отправка критических ресурсов

### Приоритет 3
- [ ] **Tree shaking** - более агрессивная оптимизация неиспользуемого кода
- [ ] **Динамические imports** - для маршрутов через React Router
- [ ] **Prefetching** - предзагрузка следующих страниц

## Связанные документы

- [NEXT_STEPS.md](NEXT_STEPS.md) - общий план развития проекта
- [CLAUDE.md](CLAUDE.md) - техническая документация проекта
- [DATABASE_SETUP.md](DATABASE_SETUP.md) - настройка базы данных

## Автор

Оптимизации реализованы с помощью Claude Code (claude.ai/code)
Дата: 2025-10-19

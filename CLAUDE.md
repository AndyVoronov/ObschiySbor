# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ObschiySbor** - веб-сервис для организации и поиска событий по различным категориям досуга (настольные игры, велопрогулки, походы). Платформа позволяет пользователям создавать события или присоединяться к существующим.

Целевой масштаб: 100,000 активных пользователей в первые 2 года.

## Common Commands

### Development
```bash
cd frontend
npm install          # Установка зависимостей
npm run dev         # Запуск dev сервера (http://localhost:5173)
npm run build       # Production сборка
npm run preview     # Preview production build
npm run lint        # ESLint проверка
```

### Testing
```bash
npm test            # Запуск Playwright тестов
npm run test:ui     # Запуск тестов в UI режиме
npx playwright test tests/example.spec.js  # Запуск конкретного теста
npx playwright test --headed              # Запуск тестов с видимым браузером
```

### Database
```bash
node init-db.js        # Проверка подключения к Supabase и структуры таблиц
node apply-schema.js   # Вывод SQL схемы для применения в Supabase
node setup-database.js # Настройка базы данных (если требуется)
node auto-setup-db.js  # Автоматическая настройка БД
```

### Important Notes
- Dev сервер настроен на `host: '0.0.0.0'` для поддержки IPv4 и IPv6
- Порт по умолчанию: 5173
- При изменении `.env` файла сервер автоматически перезапускается

## Tech Stack

### Frontend
- **React 19** с **Vite 7** - основной фреймворк и сборщик
- **React Router 7** - клиентская маршрутизация
- **@supabase/supabase-js** - клиент для Supabase
- **Яндекс.Карты API** - интерактивные карты с геокодированием и поиском адресов
- **Recharts** - библиотека для графиков и аналитики
- **Playwright** - E2E тестирование

### Backend
- **Supabase** - Backend-as-a-Service платформа
  - PostgreSQL - база данных
  - Built-in Auth - аутентификация (email + OAuth)
  - Realtime - real-time подписки
  - Storage - хранение файлов (для изображений событий)
  - Edge Functions - serverless функции

### Deployment
- **Frontend**: Vercel
- **Backend**: Supabase (облачный)
- **Telegram Mini App**: [@ObschiySbor_bot](https://t.me/ObschiySbor_bot)

## Architecture Overview

### Frontend Structure
```
frontend/src/
├── components/          # Переиспользуемые компоненты
│   ├── Layout.jsx      # Главный layout с навигацией и footer
│   ├── ProtectedRoute.jsx  # HOC для защиты маршрутов
│   ├── ImageUpload.jsx # Загрузка изображений в Supabase Storage
│   ├── LazyComponents.jsx # ⭐ Централизованная конфигурация lazy loading
│   ├── LazyImage.jsx   # ⭐ Ленивая загрузка изображений (Intersection Observer)
│   ├── MapPicker.jsx   # Выбор локации на карте (создание события)
│   ├── EventMap.jsx    # Отображение места события
│   ├── NotificationBell.jsx # Колокольчик с уведомлениями
│   ├── EventChat.jsx   # Встроенный чат для события (real-time)
│   ├── OrganizerDashboard.jsx # Дашборд с аналитикой для организаторов
│   ├── PromoCodeInput.jsx # ⭐ Применение промокодов при создании события
│   ├── PromoCodeManager.jsx # ⭐ Админ-панель управления промокодами
│   ├── CommissionManager.jsx # ⭐ Управление комиссией и периодическими скидками
│   ├── ReferralPanel.jsx # Реферальная программа (код приглашения)
│   └── GamificationPanel.jsx # Геймификация (уровни, достижения, XP)
├── contexts/
│   └── AuthContext.jsx # Глобальный контекст аутентификации
├── hooks/
│   ├── useNotifications.js # Хук для real-time уведомлений
│   └── useEvents.js        # Хук для работы с событиями
├── pages/              # Страницы-компоненты (по одной на роут)
│   ├── Home.jsx        # Главная страница
│   ├── Events.jsx      # Список событий с фильтрами
│   ├── EventDetails.jsx # Детальная страница события (с чатом)
│   ├── CreateEvent.jsx # Форма создания события (с ценой и промокодами)
│   ├── Profile.jsx     # Профиль пользователя (с дашбордом организатора)
│   ├── UserProfile.jsx # ⭐ Публичный просмотр профилей (/users/:userId)
│   ├── Chats.jsx       # Список всех чатов пользователя
│   ├── Login.jsx       # Страница входа
│   └── Register.jsx    # Страница регистрации
├── utils/              # Утилиты
│   ├── calendarExport.js       # Экспорт в календарь (.ics, Google)
│   ├── notificationHelpers.js  # Создание уведомлений
│   ├── eventFilters.js         # Фильтрация событий
│   ├── geoUtils.js             # ⭐ Геолокация и расстояния
│   └── dateUtils.js            # Работа с датами
├── lib/
│   └── supabase.js     # Инициализация Supabase клиента
└── App.jsx             # Корневой компонент с роутингом
```

### Key Patterns

**Authentication Flow:**
1. `AuthContext` предоставляет глобальный доступ к пользователю и методам аутентификации
2. `ProtectedRoute` оборачивает защищённые маршруты (Create Event, Profile)
3. При регистрации автоматически создаётся запись в `profiles` через database trigger
4. JWT токены управляются Supabase Auth автоматически

**Data Flow:**
1. Все запросы к БД идут через Supabase Client (`supabase.from('table')...`)
2. RLS политики контролируют доступ на уровне базы данных
3. Real-time подписки используются для уведомлений и чатов (через Supabase Realtime)

**Chat System:**
1. Каждое событие автоматически получает чат-комнату через database trigger
2. Доступ к чату только у участников события и организатора (через RLS)
3. Сообщения синхронизируются в real-time через Supabase Realtime
4. Два интерфейса: встроенный чат в EventDetails и отдельная страница Chats

**Analytics Dashboard:**
1. Дашборд организатора доступен через вкладку в Profile
2. Данные агрегируются на клиенте из таблиц events, event_participants, reviews
3. Графики строятся через recharts (LineChart, BarChart, PieChart)
4. Расчёт доходов: `price × количество_участников`

**Event Categories:**
События имеют поле `category_data` (JSONB) для специфичных данных:
- `board_games`: массив игр
- `cycling`: сложность, маршрут, снаряжение
- `hiking`: дистанция, местность, снаряжение

**Performance Optimization:** ⭐ **NEW**
1. **Lazy Loading компонентов** - тяжёлые библиотеки загружаются только по требованию
2. **Lazy Loading изображений** - изображения загружаются при прокрутке (Intersection Observer)
3. Все lazy-loaded компоненты обёрнуты в `React.Suspense` с loading fallbacks
4. Централизованная конфигурация в `LazyComponents.jsx`

### Database Schema

**Основные таблицы:**
- `profiles` - профили пользователей (1:1 с auth.users)
- `events` - события с категориями и статусами
  - Дополнительные поля: `latitude`, `longitude`, `end_date`, `image_url`, `price`
- `event_participants` - связь пользователей и событий (M:N)
- `chat_rooms` - чат-комнаты (1:1 с events, создаются автоматически)
- `chat_messages` - сообщения чатов (real-time)
- `notifications` - уведомления пользователей (реализовано с Realtime)
- `reviews` - отзывы о событиях (реализовано)
- `reports`, `audit_logs` - модерация и логи (структура есть, не активно используется)

**Storage Buckets:**
- `event-images` - публичный bucket для изображений событий

**RLS Policies:**
- Все таблицы имеют Row Level Security
- Профили видны всем, редактируются только владельцем
- События видны всем, создаются/редактируются/удаляются только создателем
- Участники могут присоединяться/покидать события самостоятельно
- Чаты видны только участникам события и организатору
- Уведомления видны только их владельцу

**Database Triggers:**
- Автоматическое создание профиля при регистрации (`on_auth_user_created`)
- Автоматическое создание чат-комнаты при создании события (`on_event_created`)
- Обновление `updated_at` для profiles и events

**Database Functions:**
- `update_event_lifecycle_status()` - автоматическое обновление статусов событий по датам

## Environment Variables

Файл `frontend/.env` (не коммитится в git):
```env
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
VITE_YANDEX_MAPS_API_KEY=[yandex-maps-key]  # Для работы с картами
VITE_RECAPTCHA_SITE_KEY=[recaptcha-key]      # Для будущей интеграции
```

## Implemented Features (MVP)

✅ **Аутентификация:**
- Регистрация через email
- Вход через email/пароль
- **VK ID (ВКонтакте)** - OneTap авторизация с автоматическим созданием аккаунта
- Telegram OAuth (настройка через Supabase)
- Автоматическое создание профиля при регистрации
- Сохранение VK ID в базе данных для связи аккаунтов
- **Управление подключенными аккаунтами в профиле**

✅ **События:**
- Создание событий с 20+ категориями (настольные игры, велопрогулки, походы, йога и др.)
- **Lifecycle статусы** - автоматическое отслеживание (upcoming/ongoing/completed/cancelled)
- **Отмена событий организатором** - с причиной и уведомлениями участникам
- **Выбор локации на интерактивной карте (Яндекс.Карты)**
- **Загрузка изображений событий (Supabase Storage)**
- Поиск по категориям, дате, ключевым словам
- Просмотр деталей события с картой
- Присоединение/выход из события
- Отслеживание количества участников
- **Экспорт в календарь (.ics, Google Calendar)**

✅ **Уведомления:**
- **Real-time уведомления через Supabase Realtime**
- **Браузерные push-уведомления**
- Уведомления о новых участниках
- Колокольчик с дропдауном в навигации

✅ **Профили:**
- Просмотр и редактирование своего профиля
- **Публичный просмотр профилей других пользователей** (/users/:userId)
- История созданных событий
- История участия в событиях
- Статистика: созданные события, участие, уровень и XP

✅ **Отзывы и рейтинги:**
- Система оценок событий (1-5 звёзд)
- Текстовые отзывы от участников
- Отображение среднего рейтинга события

✅ **Чаты и обсуждения:**
- Real-time чат для каждого события (Supabase Realtime)
- Встроенный чат на странице события
- Отдельная страница со всеми чатами пользователя
- Доступ только для участников события

✅ **Дашборд организатора:**
- Вкладка "Дашборд организатора" в профиле
- Статистика: всего событий, участников, доходов, средний рейтинг
- Графики: посещаемость и доходы по месяцам
- Аналитика популярности категорий
- Топ-5 событий по посещаемости

✅ **Система промокодов:** ⭐ **НОВОЕ**
- 3 типа скидок: процентная, фиксированная, бесплатно
- Применение промокодов при создании события
- Настройка по категориям и минимальной цене
- Лимиты использований (общий и на пользователя)
- Период действия промокодов
- PromoCodeManager - админ-панель управления
- Полная документация: [PROMO_CODE_SYSTEM.md](docs/features/PROMO_CODE_SYSTEM.md)

✅ **Система комиссий и периодических скидок:** ⭐ **НОВОЕ**
- Базовая комиссия сервиса (по умолчанию 10%)
- Периоды скидок на комиссию (акции, праздники)
- Автоматический расчёт комиссии с учётом скидок
- CommissionManager - управление периодами
- Поддержка 100% скидки (бесплатно для организаторов)
- Применение к определённым категориям событий

✅ **Геймификация:** ⭐ **НОВОЕ**
- Система уровней и опыта (XP)
- 17 достижений с условиями разблокировки
- Автоматическое начисление XP за действия
- GamificationPanel в профиле пользователя
- История активности
- Бейджи и награды

✅ **Реферальная программа:** ⭐ **НОВОЕ**
- Уникальные реферальные коды для каждого пользователя
- Бонусы за приглашение друзей (XP)
- Отслеживание рефералов и статистики
- ReferralPanel в профиле
- Интеграция с регистрацией (параметр ?ref=CODE)

## Planned Features (Not Yet Implemented)

📋 **Приоритет 2:**
- Email уведомления (через Supabase Edge Functions)
- reCAPTCHA защита на формах регистрации

📋 **Приоритет 3:**
- Модерация контента и жалобы на события
- Rate limiting для создания событий
- Мониторинг ошибок (Sentry)

См. [docs/NEXT_STEPS.md](docs/NEXT_STEPS.md) для детальной информации.

✅ **Завершённые оптимизации:**
- ✅ React Query кэширование (staleTime: 5 мин, gcTime: 10 мин)
- ✅ Code splitting страниц (React.lazy)
- ✅ Code splitting компонентов - lazy loading тяжёлых библиотек
- ✅ Lazy loading изображений - Intersection Observer API
- ✅ SQL индексы для БД (35+ индексов)

См. [docs/setup/PERFORMANCE_OPTIMIZATION.md](docs/setup/PERFORMANCE_OPTIMIZATION.md) для детальной информации.

## Recent Updates

**Последнее обновление: 2025-01-27**

### Ключевые реализованные функции (последняя сессия):
- ✅ **Система промокодов** (2025-01-27) ⭐ **НОВОЕ**
  - 3 типа скидок на создание событий
  - PromoCodeInput компонент для применения
  - PromoCodeManager для администрирования
  - Полная документация в docs/features/
- ✅ **Просмотр чужих профилей** (2025-01-27) ⭐ **НОВОЕ**
  - UserProfile страница (/users/:userId)
  - Статистика пользователя и его события
  - Публичный доступ
- ✅ **Система комиссий и периодических скидок** (2025-01-27) ⭐ **НОВОЕ**
  - Управление комиссией сервиса
  - Периоды акций с гибкими настройками
  - CommissionManager компонент
- ✅ **Геймификация и реферальная программа** (предыдущие сессии)
  - Система уровней, опыта и достижений
  - Реферальные коды с бонусами
- ✅ **Performance Optimization (Часть 2)** - lazy loading компонентов и изображений
  - Profile страница: 360KB → 12KB (30x улучшение!)
  - Home страница: 119KB → 3.6KB (33x улучшение!)
- ✅ **Фильтр по расстоянию** - геолокация и поиск событий рядом
- ✅ **Повторяющиеся события** - создание регулярных мероприятий
- ✅ **Модерация контента** - система жалоб и админ-панель
- ✅ **Event Lifecycle Status** - система статусов событий
- ✅ **Telegram Mini App** - [@ObschiySbor_bot](https://t.me/ObschiySbor_bot)
- ✅ **VK ID авторизация** - OneTap вход через ВКонтакте
- ✅ **Дашборд организатора** - аналитика с графиками
- ✅ **Яндекс.Карты** - интерактивные карты с геокодированием
- ✅ **Real-time уведомления** - через Supabase Realtime
- ✅ **Система отзывов и рейтингов** - оценки событий

**Документация:**
- [docs/setup/PERFORMANCE_OPTIMIZATION.md](docs/setup/PERFORMANCE_OPTIMIZATION.md) - ⭐ Полная документация оптимизаций
- [docs/features/MODERATION_SYSTEM.md](docs/features/MODERATION_SYSTEM.md) - Система модерации контента
- [docs/features/USER_BLOCKING_SYSTEM.md](docs/features/USER_BLOCKING_SYSTEM.md) - Система блокировки пользователей
- [docs/features/FRIENDS_SYSTEM_SETUP.md](docs/features/FRIENDS_SYSTEM_SETUP.md) - Система друзей и приглашений
- [docs/features/RECURRING_EVENTS_GUIDE.md](docs/features/RECURRING_EVENTS_GUIDE.md) - Повторяющиеся события
- [docs/features/ONLINE_EVENTS.md](docs/features/ONLINE_EVENTS.md) - Онлайн события
- [docs/features/DATABASE_EVENT_LIFECYCLE_STATUS.md](docs/features/DATABASE_EVENT_LIFECYCLE_STATUS.md) - Система статусов событий
- [docs/features/TELEGRAM_MINI_APP.md](docs/features/TELEGRAM_MINI_APP.md) - Telegram Mini App
- [docs/features/TELEGRAM_LOGIN_SETUP.md](docs/features/TELEGRAM_LOGIN_SETUP.md) - Настройка Telegram Login Widget
- [docs/features/VK_ID_SETUP.md](docs/features/VK_ID_SETUP.md) - Настройка VK ID авторизации
- [docs/features/DATABASE_UPDATE_CHATS_DASHBOARD.md](docs/features/DATABASE_UPDATE_CHATS_DASHBOARD.md) - SQL для чатов и дашборда
- [docs/features/DATABASE_SETUP.md](docs/features/DATABASE_SETUP.md) - Базовая настройка БД
- [docs/setup/DEPLOYMENT_CHECKLIST.md](docs/setup/DEPLOYMENT_CHECKLIST.md) - Чеклист для деплоя
- [docs/setup/RECAPTCHA_SETUP.md](docs/setup/RECAPTCHA_SETUP.md) - Настройка reCAPTCHA
- [docs/NEXT_STEPS.md](docs/NEXT_STEPS.md) - Дорожная карта развития проекта

## Development Guidelines

### Working with Supabase
- Все SQL миграции хранятся в `database/schema.sql`
- Для применения изменений в БД используйте SQL Editor в Supabase Dashboard
- После изменения схемы запустите `node init-db.js` для проверки
- **Важно:** При добавлении real-time таблиц (чаты) включите Realtime в Supabase Dashboard → Database → Replication

### Adding New Pages
1. Создайте компонент в `frontend/src/pages/`
2. Добавьте маршрут в `App.jsx`
3. Если страница требует аутентификации - оберните в `<ProtectedRoute>`
4. Добавьте соответствующий CSS файл рядом с компонентом

### Working with Authentication
- Используйте `useAuth()` хук для доступа к пользователю и методам
- Проверяйте `user` для условного рендеринга
- Проверяйте `loading` для показа индикаторов загрузки

### Code Style
- Используйте функциональные компоненты с хуками
- CSS модули или отдельные CSS файлы для каждого компонента
- Async/await для асинхронных операций
- Try/catch для обработки ошибок от Supabase

### Common Patterns and Utilities

**Работа с событиями:**
```javascript
import { useEvents } from '../hooks/useEvents';

// Загрузка событий с фильтрами
const { events, loading, error } = useEvents(filters);
```

**Создание уведомлений:**
```javascript
import { notifyNewParticipant } from '../utils/notificationHelpers';

// Уведомление организатору о новом участнике
await notifyNewParticipant(eventId, creatorId, participantName);
```

**Экспорт в календарь:**
```javascript
import { generateICS, generateGoogleCalendarLink } from '../utils/calendarExport';

// Скачать .ics файл
generateICS(event);

// Открыть Google Calendar
window.open(generateGoogleCalendarLink(event), '_blank');
```

**Работа с картами (Яндекс.Карты):**
```jsx
import MapPicker from '../components/MapPicker';
import EventMap from '../components/EventMap';

// Выбор локации при создании события (с поиском адреса)
<MapPicker
  initialPosition={{ lat: 55.751244, lng: 37.618423 }}
  onLocationSelect={(pos) => setCoordinates(pos)}
  onAddressChange={(addr) => setAddress(addr)}
/>

// Отображение места события (только просмотр)
<EventMap
  latitude={event.latitude}
  longitude={event.longitude}
  address={event.location}
/>
```

**Работа с чатами:**
```jsx
import EventChat from '../components/EventChat';

// Встроенный чат в событии (доступен только участникам)
<EventChat eventId={eventId} />

// Чат автоматически:
// - Проверяет права доступа через RLS
// - Подписывается на real-time обновления
// - Создаёт комнату если её нет
```

**Дашборд организатора:**
```jsx
import OrganizerDashboard from '../components/OrganizerDashboard';

// В Profile.jsx через вкладки
<OrganizerDashboard userId={user.id} />

// Компонент автоматически загружает:
// - Все события пользователя
// - Статистику участников и доходов
// - Данные для графиков (recharts)
```

**Управление подключенными аккаунтами:**
```jsx
import ConnectedAccounts from '../components/ConnectedAccounts';

// В Profile.jsx на отдельной вкладке
<ConnectedAccounts />

// Компонент позволяет:
// - Просмотреть все подключенные способы входа
// - Отвязать существующие провайдеры (кроме последнего)
// Примечание: VK можно подключить только при первом входе/регистрации
```

**Lazy Loading компонентов:** ⭐ **NEW**
```jsx
import { Suspense } from 'react';
import { OrganizerDashboard, ChartLoadingFallback } from '../components/LazyComponents';

// Обёртка тяжёлого компонента в Suspense
<Suspense fallback={<ChartLoadingFallback />}>
  <OrganizerDashboard userId={user.id} />
</Suspense>

// Доступные lazy компоненты:
// - MapPicker, EventMap, EventsMapView (Яндекс.Карты)
// - OrganizerDashboard (Recharts)
// - EventChat (чат)
// - Carousel (Three.js)

// Доступные fallbacks:
// - ComponentLoadingFallback - универсальный
// - MapLoadingFallback - для карт
// - ChartLoadingFallback - для графиков
// - ChatLoadingFallback - для чатов
```

**Lazy Loading изображений:** ⭐ **NEW**
```jsx
import LazyImage from '../components/LazyImage';

// Ленивая загрузка изображения
<LazyImage
  src={event.image_url}
  alt={event.title}
  className="w-full h-full object-cover"
  placeholder={
    <div className="flex items-center justify-center h-full">
      Загрузка...
    </div>
  }
  errorPlaceholder={
    <div className="flex items-center justify-center h-full">
      Ошибка загрузки
    </div>
  }
  threshold={0.01}        // опционально (по умолчанию 0.01)
  rootMargin="50px"       // опционально (предзагрузка за 50px)
/>

// Особенности:
// - Использует Intersection Observer API
// - Загружает изображение только при появлении в viewport
// - Плавное fade-in появление
// - Fallback для старых браузеров
```

**Геолокация и расстояния:** ⭐ **NEW**
```jsx
import { useGeolocation } from '../hooks/useGeolocation';
import { addDistanceToEvents, filterEventsByDistance, formatDistance } from '../utils/geoUtils';

// Получение геолокации пользователя
const {
  location,           // { lat, lng }
  loading,
  error,
  requestLocation,    // Запросить доступ
  clearLocation,      // Очистить
  hasLocation         // boolean
} = useGeolocation();

// Добавление расстояний к событиям
const eventsWithDistance = addDistanceToEvents(events, userLat, userLng);

// Фильтрация по максимальному расстоянию (в км)
const nearbyEvents = filterEventsByDistance(eventsWithDistance, 10);

// Форматирование расстояния для отображения
const distanceText = formatDistance(5.234); // "5.2 км"
```

## Project Structure

```
ObschiySbor/
├── frontend/                # Frontend приложение (React + Vite)
│   ├── src/                # Исходный код
│   ├── dist/               # Production сборка (игнорируется git)
│   └── public/             # Статические файлы
├── database/               # SQL миграции и схемы
│   ├── migrations/         # Основные миграции
│   ├── archive/            # Устаревшие миграции
│   └── schema.sql          # Главная схема БД
├── docs/                   # Документация проекта
│   ├── features/           # Документация функций
│   ├── setup/              # Инструкции по настройке
│   ├── archive/            # Устаревшая документация
│   └── NEXT_STEPS.md       # Дорожная карта
├── CLAUDE.md               # Инструкции для Claude AI
├── README.md               # Основная документация
└── vercel.json             # Конфигурация деплоя
```

**Важные каталоги:**
- `docs/features/` - документация по реализованным функциям (VK ID, Telegram, модерация, блокировка пользователей и т.д.)
- `docs/setup/` - инструкции по настройке (деплой, оптимизация, reCAPTCHA)
- `database/migrations/` - актуальные SQL миграции для применения
- `database/archive/` - устаревшие миграции (не применять!)

## AI Assistant Guidelines

- Разработка ведется на **ОС Windows**
- Общение на **русском языке**
- **НЕ редактируй** `.env` файл - только указывай какие переменные нужно добавить
- Для работы с внешними библиотеками используй их официальную документацию
- После изменений на фронтенде проверяй что приложение работает
- При работе с Supabase помни про RLS политики - они могут блокировать запросы
- **Документация:** При добавлении новых функций создавай MD файлы в `docs/features/`
- **Миграции:** Новые SQL миграции размещай в `database/migrations/`, устаревшие перемещай в `archive/`
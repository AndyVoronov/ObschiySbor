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
│   ├── MapPicker.jsx   # Выбор локации на карте (создание события)
│   ├── EventMap.jsx    # Отображение места события
│   ├── NotificationBell.jsx # Колокольчик с уведомлениями
│   ├── EventChat.jsx   # Встроенный чат для события (real-time)
│   └── OrganizerDashboard.jsx # Дашборд с аналитикой для организаторов
├── contexts/
│   └── AuthContext.jsx # Глобальный контекст аутентификации
├── hooks/
│   ├── useNotifications.js # Хук для real-time уведомлений
│   └── useEvents.js        # Хук для работы с событиями
├── pages/              # Страницы-компоненты (по одной на роут)
│   ├── Home.jsx        # Главная страница
│   ├── Events.jsx      # Список событий с фильтрами
│   ├── EventDetails.jsx # Детальная страница события (с чатом)
│   ├── CreateEvent.jsx # Форма создания события
│   ├── Profile.jsx     # Профиль пользователя (с дашбордом организатора)
│   ├── Chats.jsx       # Список всех чатов пользователя
│   ├── Login.jsx       # Страница входа
│   └── Register.jsx    # Страница регистрации
├── utils/              # Утилиты
│   ├── calendarExport.js       # Экспорт в календарь (.ics, Google)
│   ├── notificationHelpers.js  # Создание уведомлений
│   ├── eventFilters.js         # Фильтрация событий
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
- История созданных событий
- История участия в событиях

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

## Planned Features (Not Yet Implemented)

📋 **Приоритет 2:**
- Email уведомления (через Supabase Edge Functions)
- reCAPTCHA защита на формах регистрации

📋 **Приоритет 3:**
- Модерация контента и жалобы на события
- Rate limiting для создания событий
- Мониторинг ошибок (Sentry)
- Оптимизация производительности (React Query, code splitting)

См. [NEXT_STEPS.md](NEXT_STEPS.md) для детальной информации.

## Recent Updates

**Последнее обновление: 2025-10-06**

### Ключевые реализованные функции:
- ✅ **Telegram Mini App** - интеграция с [@ObschiySbor_bot](https://t.me/ObschiySbor_bot)
- ✅ **Система чатов** - real-time общение участников событий
- ✅ **Дашборд организатора** - аналитика с графиками (recharts)
- ✅ **Яндекс.Карты** - интерактивные карты с геокодированием
- ✅ **20+ категорий событий** - расширенный выбор активностей
- ✅ **Экспорт в календарь** - (.ics, Google Calendar)
- ✅ **Real-time уведомления** - через Supabase Realtime
- ✅ **Система отзывов и рейтингов** - оценки событий

**Документация:**
- [VK_ID_SETUP.md](VK_ID_SETUP.md) - ⭐ **НОВОЕ** Настройка VK ID авторизации
- [DATABASE_UPDATE_CHATS_DASHBOARD.md](DATABASE_UPDATE_CHATS_DASHBOARD.md) - SQL для чатов и дашборда
- [DATABASE_SETUP.md](DATABASE_SETUP.md) - предыдущие обновления БД
- [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - чеклист для деплоя
- [database/migration_vk_id.sql](database/migration_vk_id.sql) - SQL миграция для поля vk_id

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

## AI Assistant Guidelines

- Разработка ведется на **ОС Windows**
- Общение на **русском языке**
- **НЕ редактируй** `.env` файл - только указывай какие переменные нужно добавить
- Для работы с внешними библиотеками используй их официальную документацию
- После изменений на фронтенде проверяй что приложение работает
- При работе с Supabase помни про RLS политики - они могут блокировать запросы
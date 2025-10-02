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
- **Leaflet + React-Leaflet** - интерактивные карты (OpenStreetMap)
- **Axios** - HTTP клиент (опционально)
- **Playwright** - E2E тестирование

### Backend
- **Supabase** - Backend-as-a-Service платформа
  - PostgreSQL - база данных
  - Built-in Auth - аутентификация (email + OAuth)
  - Realtime - real-time подписки
  - Storage - хранение файлов (для изображений событий)
  - Edge Functions - serverless функции

### Deployment
- **Frontend**: Vercel (через GitHub Actions)
- **Backend**: Supabase (облачный)
- **CI/CD**: `.github/workflows/deploy.yml`

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
│   └── NotificationBell.jsx # Колокольчик с уведомлениями
├── contexts/
│   └── AuthContext.jsx # Глобальный контекст аутентификации
├── hooks/
│   ├── useNotifications.js # Хук для real-time уведомлений
│   └── useEvents.js        # Хук для работы с событиями
├── pages/              # Страницы-компоненты (по одной на роут)
│   ├── Home.jsx        # Главная страница
│   ├── Events.jsx      # Список событий с фильтрами
│   ├── EventDetails.jsx # Детальная страница события
│   ├── CreateEvent.jsx # Форма создания события
│   ├── Profile.jsx     # Профиль пользователя
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
3. Real-time подписки используются для уведомлений (через Supabase Realtime)

**Event Categories:**
События имеют поле `category_data` (JSONB) для специфичных данных:
- `board_games`: массив игр
- `cycling`: сложность, маршрут, снаряжение
- `hiking`: дистанция, местность, снаряжение

### Database Schema

**Основные таблицы:**
- `profiles` - профили пользователей (1:1 с auth.users)
- `events` - события с категориями и статусами
  - Дополнительные поля: `latitude`, `longitude`, `end_date`, `image_url`
- `event_participants` - связь пользователей и событий (M:N)
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
- Уведомления видны только их владельцу

## Environment Variables

Файл `frontend/.env` (не коммитится в git):
```env
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
VITE_GOOGLE_MAPS_API_KEY=[google-maps-key]  # Для будущей интеграции
VITE_RECAPTCHA_SITE_KEY=[recaptcha-key]      # Для будущей интеграции
```

## Implemented Features (MVP)

✅ **Аутентификация:**
- Регистрация через email
- Вход через email/пароль
- OAuth провайдеры (Google, Facebook, VK) - настройка через Supabase
- Автоматическое создание профиля при регистрации

✅ **События:**
- Создание событий с категориями (настольные игры, велопрогулки, походы)
- **Выбор локации на интерактивной карте (OpenStreetMap)**
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

**Последнее обновление: 2025-10-02 (вечер)**

### Новые функции:
- ✅ **Фото профиля пользователя** - загрузка аватаров через Supabase Storage
- ✅ **Справочник настольных игр** - выбор игр из базы данных с деталями
- ✅ **Фильтр по полу участников** - события только для мужчин/женщин/всех

### Реализованные ранее:
- ✅ Интерактивные карты (OpenStreetMap) с поиском по адресу
- ✅ Загрузка и отображение изображений событий
- ✅ Экспорт событий в календарь (.ics и Google Calendar)
- ✅ Real-time уведомления для участников
- ✅ Система отзывов и рейтингов событий

**Подробности:**
- [NEW_FEATURES_SUMMARY.md](NEW_FEATURES_SUMMARY.md) - ⭐ описание новых функций
- [APPLY_NEW_FEATURES.md](APPLY_NEW_FEATURES.md) - инструкция по применению
- [COMPLETED_FEATURES.md](COMPLETED_FEATURES.md) - описание реализованных функций
- [DATABASE_SETUP.md](DATABASE_SETUP.md) - инструкции по обновлению БД
- [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - чеклист для деплоя
- [CURRENT_STATUS.md](CURRENT_STATUS.md) - текущий статус проекта

## Development Guidelines

### Working with Supabase
- Все SQL миграции хранятся в `database/schema.sql`
- Для применения изменений в БД используйте SQL Editor в Supabase Dashboard
- После изменения схемы запустите `node init-db.js` для проверки

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

**Работа с картами:**
```jsx
import MapPicker from '../components/MapPicker';

<MapPicker
  initialPosition={{ lat: 55.751244, lng: 37.618423 }}
  onLocationSelect={(pos) => setCoordinates(pos)}
  onAddressChange={(addr) => setAddress(addr)}
/>
```

## AI Assistant Guidelines

- Разработка ведется на **ОС Windows**
- Общение на **русском языке**
- **НЕ редактируй** `.env` файл - только указывай какие переменные нужно добавить
- Для работы с внешними библиотеками используй их официальную документацию
- После изменений на фронтенде проверяй что приложение работает
- При работе с Supabase помни про RLS политики - они могут блокировать запросы
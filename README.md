# ObschiySbor

Веб-сервис для организации и поиска событий по различным категориям досуга (настольные игры, велопрогулки, походы и другие).

## 🚀 Доступ к приложению

- **Web приложение**: [obschiysbor.vercel.app](https://obschiysbor.vercel.app)
- **Telegram Mini App**: [@ObschiySbor_bot](https://t.me/ObschiySbor_bot)

## ✨ Основные возможности

### События
- 🎯 **20+ категорий** событий (настольные игры, велопрогулки, походы, йога, фотопрогулки и др.)
- 📊 **Статусы событий** - автоматическое отслеживание (upcoming/ongoing/completed/cancelled)
- 🚫 **Отмена событий** организатором с уведомлениями участникам
- 🗺️ **Интерактивные карты** на базе Яндекс.Карт с геокодированием
- 📸 **Загрузка изображений** событий через Supabase Storage
- 📅 **Экспорт в календарь** (.ics, Google Calendar)

### Авторизация
- ✉️ Email/пароль
- 🔵 **VK ID** - OneTap авторизация через ВКонтакте
- 📱 **Telegram** - Login Widget для браузера
- 🤖 **Telegram Mini App** - автоматическая авторизация

### Взаимодействие
- 💬 **Real-time чаты** для каждого события
- 🔔 **Уведомления** в реальном времени (Supabase Realtime)
- ⭐ **Отзывы и рейтинги** событий (1-5 звёзд)
- 👥 Система участников с присоединением/выходом

### Аналитика
- 📈 **Дашборд организатора** с графиками (recharts)
- 📊 Статистика по событиям, участникам, доходам
- 🏆 Топ событий по посещаемости

### Геймификация
- 🎮 **Система уровней и опыта (XP)** - прогрессия пользователей
- 🏅 **17 достижений** с прогресс-барами и редкостью (common/rare/epic/legendary)
- 🎯 Автоматическое начисление XP за действия (создание событий, участие, отзывы)
- 📊 История активности пользователя
- 👥 **Реферальная программа** - приглашайте друзей и получайте бонусы

### Монетизация
- 💰 **Платные события** - организаторы могут устанавливать цену
- 🎟️ **Система промокодов** - 3 типа скидок (процентная, фиксированная, бесплатно)
- 💳 **Гибкая комиссия** - базовая ставка + периодические скидки (акции, праздники)
- 📈 Автоматический расчёт доходов с учётом скидок

### Управление аккаунтами
- 🔗 **Подключение провайдеров** - управление способами входа в профиле
- 🔄 **Слияние дубликатов** - автоматический поиск и объединение аккаунтов
- 📊 История слияний и статистика

### UX/UI
- 📱 Адаптивный дизайн для мобильных устройств
- 🎨 Современный интерфейс на Tailwind CSS
- ⚡ **Оптимизация производительности**:
  - Lazy loading компонентов (Maps, Charts, Chat)
  - Lazy loading изображений (Intersection Observer)
  - React Query кэширование
  - 35+ SQL индексов
- 🌐 Интернационализация (RU/EN)
- 🌓 Тёмная тема (в разработке)

## 🛠️ Технологии

### Frontend
- **React 19** + **Vite 7** - основной фреймворк и сборщик
- **React Router 7** - клиентская маршрутизация
- **Tailwind CSS** - стили
- **Яндекс.Карты API** - интерактивные карты
- **@supabase/supabase-js** - клиент для Supabase
- **Recharts** - графики и аналитика
- **Playwright** - E2E тестирование

### Backend
- **Supabase** - Backend-as-a-Service платформа
  - **PostgreSQL** - база данных
  - **Auth** - аутентификация (Email, VK, Telegram)
  - **Realtime** - WebSocket подписки
  - **Storage** - хранение файлов
  - **Edge Functions** - serverless функции

### Deployment
- **Frontend**: Vercel
- **Backend**: Supabase Cloud

## 📦 Установка и запуск

### Предварительные требования
- Node.js 18+
- Аккаунт в Supabase
- API ключи: Яндекс.Карты, VK ID (опционально)

### Быстрый старт

1. **Клонируйте репозиторий**
```bash
git clone https://github.com/AndyVoronov/ObschiySbor.git
cd ObschiySbor
```

2. **Установка зависимостей**
```bash
cd frontend
npm install
```

3. **Настройка переменных окружения**

Создайте файл `frontend/.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_YANDEX_MAPS_API_KEY=your-yandex-maps-key
```

4. **Настройка базы данных**

Выполните SQL из файла `database/schema.sql` в Supabase SQL Editor.

Затем примените миграции из `database/`:
- `migration_vk_id.sql` - поддержка VK ID
- `migration_telegram.sql` - поддержка Telegram
- `migration_event_lifecycle_status.sql` - система статусов

5. **Запуск dev сервера**
```bash
npm run dev
```

Приложение будет доступно на `http://localhost:5173`

## 📁 Структура проекта

```
ObschiySbor/
├── frontend/                      # React приложение
│   ├── src/
│   │   ├── components/           # Переиспользуемые компоненты
│   │   │   ├── Layout.jsx
│   │   │   ├── EventStatusBadge.jsx
│   │   │   ├── EventChat.jsx
│   │   │   ├── MapPicker.jsx
│   │   │   ├── OrganizerDashboard.jsx
│   │   │   └── ...
│   │   ├── contexts/             # React контексты
│   │   │   └── AuthContext.jsx
│   │   ├── hooks/                # Custom hooks
│   │   │   ├── useEvents.js
│   │   │   ├── useNotifications.js
│   │   │   └── useTelegramAuth.js
│   │   ├── pages/                # Страницы приложения
│   │   │   ├── Home.jsx
│   │   │   ├── Events.jsx
│   │   │   ├── EventDetails.jsx
│   │   │   ├── CreateEvent.jsx
│   │   │   ├── Profile.jsx
│   │   │   └── ...
│   │   ├── utils/                # Утилиты
│   │   │   ├── eventStatus.js
│   │   │   ├── calendarExport.js
│   │   │   └── ...
│   │   ├── lib/                  # Конфигурация
│   │   │   └── supabase.js
│   │   └── App.jsx               # Главный компонент
│   ├── tests/                    # Playwright тесты
│   └── .env                      # Переменные окружения
├── database/                      # SQL скрипты и миграции
│   ├── schema.sql                # Основная схема БД
│   ├── migrations/               # Исторические миграции
│   ├── migration_vk_id.sql       # VK авторизация
│   ├── migration_telegram.sql    # Telegram авторизация
│   ├── migration_event_lifecycle_status.sql  # Статусы событий
│   └── archive/                  # Архив старых миграций
├── docs/                          # Документация
│   ├── features/                 # Документация по функциям
│   │   ├── DATABASE_EVENT_LIFECYCLE_STATUS.md
│   │   ├── TELEGRAM_MINI_APP.md
│   │   ├── VK_ID_SETUP.md
│   │   └── ...
│   ├── setup/                    # Гайды по настройке
│   │   ├── DEPLOYMENT_CHECKLIST.md
│   │   └── QUICK_START.md
│   └── archive/                  # Архив документации
├── supabase/                      # Supabase конфигурация
│   └── functions/                # Edge Functions
├── CLAUDE.md                      # Инструкции для Claude Code
├── README.md                      # Этот файл
├── TechnicalSpecification.md      # Техническая спецификация
├── NEXT_STEPS.md                  # Планируемые фичи
└── PROJECT_SUMMARY.md             # Краткое описание проекта
```

## 📚 Документация

### Основные документы
- [CLAUDE.md](CLAUDE.md) - главный файл с инструкциями для разработки
- [TechnicalSpecification.md](TechnicalSpecification.md) - техническая спецификация
- [NEXT_STEPS.md](NEXT_STEPS.md) - дорожная карта развития

### Документация по функциям
- [Event Lifecycle Status](docs/features/DATABASE_EVENT_LIFECYCLE_STATUS.md) - система статусов событий
- [Telegram Mini App](docs/features/TELEGRAM_MINI_APP.md) - автоматическая авторизация через Telegram
- [VK ID Setup](docs/features/VK_ID_SETUP.md) - настройка VK ID авторизации
- [Database Setup](docs/features/DATABASE_SETUP.md) - настройка базы данных
- [Chats & Dashboard](docs/features/DATABASE_UPDATE_CHATS_DASHBOARD.md) - чаты и дашборд
- [Promo Code System](docs/features/PROMO_CODE_SYSTEM.md) - система промокодов
- [Account Merging System](docs/features/ACCOUNT_MERGING_SYSTEM.md) - слияние дубликатов аккаунтов
- [Performance Optimization](docs/setup/PERFORMANCE_OPTIMIZATION.md) - оптимизация производительности

### Гайды по настройке
- [Deployment Checklist](docs/setup/DEPLOYMENT_CHECKLIST.md) - чеклист для деплоя
- [Quick Start](docs/setup/QUICK_START.md) - быстрый старт

## 🗄️ База данных

### Основные таблицы
**События и пользователи:**
- `profiles` - профили пользователей (связь с auth.users)
- `events` - события с категориями и статусами
- `event_participants` - участники событий (M:N)
- `reviews` - отзывы о событиях

**Коммуникации:**
- `chat_rooms` - чат-комнаты (1:1 с events)
- `chat_messages` - сообщения чатов (real-time)
- `notifications` - уведомления пользователей

**Геймификация:**
- `levels` - система уровней (1-100)
- `achievements` - определения достижений
- `user_achievements` - прогресс пользователей по достижениям
- `experience_log` - история начисления XP
- `referrals` - реферальная программа

**Монетизация:**
- `promo_codes` - промокоды и скидки
- `commission_periods` - периоды комиссий и акций

**Управление:**
- `account_merges` - история слияния аккаунтов
- `reports` - жалобы на события
- `audit_logs` - логи действий

### Безопасность
- **Row Level Security (RLS)** для всех таблиц
- Профили видны всем, редактируются только владельцем
- События видны всем, управляются только создателем
- Чаты видны только участникам события
- Уведомления видны только их владельцу

### Триггеры и функции
- `on_auth_user_created` - автоматическое создание профиля
- `on_event_created` - автоматическое создание чат-комнаты
- `update_event_lifecycle_status()` - обновление статусов событий по датам

## 🚢 Деплой

### Vercel (Frontend)

1. Подключите GitHub репозиторий к Vercel
2. Установите переменные окружения:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_YANDEX_MAPS_API_KEY`
3. Vercel автоматически задеплоит при push в main

### Supabase (Backend)

1. Создайте проект на [supabase.com](https://supabase.com)
2. Выполните SQL из `database/schema.sql`
3. Примените миграции из `database/`
4. Настройте Storage bucket `event-images` как публичный
5. Настройте Auth providers (Email, VK, Telegram)

## 🔐 Настройка авторизации

### VK ID
См. [VK_ID_SETUP.md](docs/features/VK_ID_SETUP.md)

### Telegram
См. [TELEGRAM_MINI_APP.md](docs/features/TELEGRAM_MINI_APP.md)

## 🧪 Тестирование

```bash
cd frontend

# Запуск всех тестов
npm test

# Запуск в UI режиме
npm run test:ui

# Запуск конкретного теста
npx playwright test tests/example.spec.js
```

## 📈 Масштабирование

Целевые показатели:
- **100,000** активных пользователей в первые 2 года
- Автоматическое масштабирование через Supabase
- CDN для статических файлов через Vercel

## 🤝 Участие в разработке

1. Fork репозитория
2. Создайте feature branch (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в branch (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📝 Лицензия

MIT

## 👥 Команда

Разработано для организации совместных мероприятий и досуга.

**Контакты:**
- GitHub: [@AndyVoronov](https://github.com/AndyVoronov)
- Telegram Bot: [@ObschiySbor_bot](https://t.me/ObschiySbor_bot)

---

Made with ❤️ and [Claude Code](https://claude.com/claude-code)

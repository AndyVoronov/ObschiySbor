# ObschiySbor - Итоговая документация проекта

## 📋 Обзор

**ObschiySbor** - веб-платформа для организации и поиска событий по различным категориям досуга.

**Статус:** Базовый MVP реализован ✅

## 🏗️ Архитектура проекта

```
ObschiySbor/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD конфигурация
├── database/
│   └── schema.sql              # SQL схема базы данных
├── frontend/
│   ├── src/
│   │   ├── components/         # React компоненты
│   │   │   ├── Layout.jsx      # Главный layout с навигацией
│   │   │   └── ProtectedRoute.jsx  # Защита маршрутов
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx # Контекст аутентификации
│   │   ├── lib/
│   │   │   └── supabase.js     # Конфигурация Supabase
│   │   ├── pages/              # Страницы приложения
│   │   │   ├── Home.jsx        # Главная страница
│   │   │   ├── Events.jsx      # Список событий
│   │   │   ├── EventDetails.jsx # Детали события
│   │   │   ├── CreateEvent.jsx # Создание события
│   │   │   ├── Profile.jsx     # Профиль пользователя
│   │   │   ├── Login.jsx       # Вход
│   │   │   └── Register.jsx    # Регистрация
│   │   └── App.jsx             # Главный компонент
│   ├── tests/
│   │   └── basic.spec.js       # E2E тесты (Playwright)
│   ├── .env.example            # Пример переменных окружения
│   └── package.json
├── CLAUDE.md                   # Инструкции для Claude
├── README.md                   # Основная документация
├── SETUP.md                    # Подробная инструкция по настройке
├── NEXT_STEPS.md              # Следующие шаги разработки
└── TechnicalSpecification.md  # Техническое задание

```

## ✅ Реализованный функционал

### Аутентификация и авторизация
- ✅ Регистрация через email
- ✅ Вход через email/пароль
- ✅ Социальная аутентификация (Google, Facebook, VK) - настройка
- ✅ Protected routes для авторизованных пользователей
- ✅ Контекст аутентификации (AuthContext)

### События
- ✅ Создание событий с мастером для разных категорий:
  - Настольные игры (выбор игр, продолжительность)
  - Велопрогулки (сложность, маршрут, снаряжение)
  - Походы (дистанция, местность, снаряжение)
- ✅ Поиск событий с фильтрами:
  - По категории
  - По ключевым словам
  - По дате (от/до)
- ✅ Просмотр деталей события
- ✅ Присоединение к событию
- ✅ Выход из события
- ✅ Ограничение участников

### Профиль пользователя
- ✅ Просмотр и редактирование профиля
- ✅ История созданных событий
- ✅ История участия в событиях
- ✅ Редактирование данных (имя, город, интересы)

### База данных
- ✅ PostgreSQL через Supabase
- ✅ Полная схема таблиц:
  - `profiles` - профили пользователей
  - `events` - события
  - `event_participants` - участники событий
  - `reviews` - отзывы
  - `notifications` - уведомления
  - `reports` - жалобы
  - `audit_logs` - логи действий
- ✅ Row Level Security (RLS) политики
- ✅ Триггеры и функции
- ✅ Индексы для оптимизации

### UI/UX
- ✅ Responsive дизайн (320px - Full HD)
- ✅ Минималистичный современный дизайн
- ✅ Цветовая схема (серый/белый с акцентами)
- ✅ Плавные переходы и анимации
- ✅ Понятная навигация

### DevOps
- ✅ GitHub Actions для CI/CD
- ✅ Настройка деплоя на Vercel
- ✅ Environment variables
- ✅ Playwright тесты

## 📦 Технологический стек

### Frontend
- **React 19** - UI библиотека
- **Vite 7** - сборщик и dev сервер
- **React Router 7** - маршрутизация
- **Axios** - HTTP клиент
- **Supabase JS Client** - работа с БД

### Backend
- **Supabase** - BaaS платформа
  - PostgreSQL - база данных
  - Auth - аутентификация
  - Realtime - real-time подписки
  - Storage - хранение файлов

### Testing
- **Playwright** - E2E тестирование

### CI/CD
- **GitHub Actions** - автоматизация
- **Vercel** - хостинг frontend

## 🔧 Настройка проекта

### 1. Клонирование и установка
```bash
git clone <repository-url>
cd ObschiySbor
cd frontend
npm install
```

### 2. Настройка переменных окружения
Скопируйте `.env.example` в `.env` и заполните:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Настройка Supabase
1. Создайте проект на [supabase.com](https://supabase.com)
2. Выполните SQL из `database/schema.sql` в SQL Editor
3. Настройте провайдеры аутентификации

Подробная инструкция: [SETUP.md](SETUP.md)

### 4. Запуск проекта
```bash
npm run dev
```
Откройте [http://localhost:5173](http://localhost:5173)

## 📝 Следующие шаги

### Приоритет 1 (Критично)
- [ ] Интеграция карт (Google Maps / OpenStreetMap)
- [ ] Загрузка изображений событий
- [ ] Push и Email уведомления

### Приоритет 2 (Важно)
- [ ] Экспорт событий в календарь (.ics)
- [ ] reCAPTCHA защита
- [ ] Система модерации и жалоб

### Приоритет 3 (Желательно)
- [ ] Rate limiting
- [ ] Sentry мониторинг
- [ ] Оптимизация производительности (React Query)

Детальный план: [NEXT_STEPS.md](NEXT_STEPS.md)

## 📊 Схема базы данных

### Основные таблицы

**profiles**
- Профили пользователей
- Связь с auth.users
- Поля: full_name, avatar_url, city, interests

**events**
- События
- Поля: title, description, category, event_date, location
- JSONB поле category_data для специфичных данных категорий
- Статусы: active, cancelled, completed

**event_participants**
- Участники событий
- М:М связь между events и profiles
- Статусы: joined, left, banned

**notifications**
- Уведомления пользователей
- Типы: event_reminder, event_cancelled, new_participant, event_updated

**reports**
- Жалобы на события
- Статусы: pending, reviewed, resolved, rejected

## 🔐 Безопасность

### Реализовано
- ✅ Row Level Security (RLS) на всех таблицах
- ✅ JWT токены через Supabase Auth
- ✅ Политики доступа к данным
- ✅ Хеширование паролей (bcrypt через Supabase)
- ✅ Protected routes на фронтенде

### Требуется реализовать
- [ ] Rate limiting для API
- [ ] reCAPTCHA на формах
- [ ] Валидация на стороне сервера (Edge Functions)
- [ ] CORS политики для production
- [ ] Защита от SQL injection (используется ORM)

## 🚀 Деплой

### Vercel (Frontend)
Автоматический деплой через GitHub Actions при push в main:
```yaml
# .github/workflows/deploy.yml
- Сборка проекта
- Деплой на Vercel
```

### Переменные окружения в Vercel
Необходимо добавить в Settings → Environment Variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GOOGLE_MAPS_API_KEY`
- `VITE_RECAPTCHA_SITE_KEY`

### Supabase (Backend)
База данных уже в облаке, требуется только:
1. Production миграции
2. Настройка бэкапов
3. Мониторинг производительности

## 📈 Метрики и мониторинг

### Планируется
- Sentry для отслеживания ошибок
- Supabase Analytics для метрик БД
- Vercel Analytics для фронтенд метрик
- Custom логирование в audit_logs

## 🧪 Тестирование

### E2E тесты (Playwright)
```bash
npm run test        # headless mode
npm run test:ui     # UI mode
```

Покрытие:
- Навигация
- Регистрация/вход
- Создание событий
- Поиск событий
- Профиль пользователя

### Требуется добавить
- Unit тесты (Vitest)
- Integration тесты
- Тесты для Edge Functions

## 📚 Документация

- [README.md](README.md) - Основная документация
- [SETUP.md](SETUP.md) - Пошаговая настройка
- [NEXT_STEPS.md](NEXT_STEPS.md) - Следующие фичи
- [CLAUDE.md](CLAUDE.md) - Инструкции для AI
- [TechnicalSpecification.md](TechnicalSpecification.md) - ТЗ

## 🤝 Вклад в проект

1. Fork репозитория
2. Создайте feature branch (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в branch (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📄 Лицензия

MIT License

## 🆘 Поддержка

При возникновении проблем:
1. Проверьте [SETUP.md](SETUP.md)
2. Посмотрите Issues на GitHub
3. Проверьте логи Supabase/Vercel
4. Создайте новый Issue

---

**Проект готов к дальнейшей разработке!** 🚀

Следующий шаг: Реализация интеграции карт согласно [NEXT_STEPS.md](NEXT_STEPS.md)

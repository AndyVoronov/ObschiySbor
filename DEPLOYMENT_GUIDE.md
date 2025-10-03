# Руководство по деплою ObschiySbor

## Шаг 1: Создание GitHub репозитория

1. Создайте новый репозиторий на GitHub: https://github.com/new
2. Название: `ObschiySbor`
3. Сделайте его публичным или приватным (на ваш выбор)
4. **НЕ** добавляйте README, .gitignore или license (у нас уже есть)

После создания репозитория выполните команды:

```bash
git remote add origin https://github.com/YOUR_USERNAME/ObschiySbor.git
git branch -M main
git push -u origin main
```

## Шаг 2: Деплой на Vercel

### 2.1 Подключение репозитория

1. Зайдите на https://vercel.com
2. Нажмите "Add New" → "Project"
3. Импортируйте ваш GitHub репозиторий `ObschiySbor`
4. Framework Preset: **Vite** (должен определиться автоматически)

### 2.2 Настройка Build Settings

Vercel автоматически определит настройки благодаря `vercel.json`:
- **Build Command**: `cd frontend && npm install && npm run build`
- **Output Directory**: `frontend/dist`
- **Install Command**: `npm install --prefix frontend`

### 2.3 Переменные окружения

Добавьте следующие переменные в **Environment Variables**:

```
VITE_SUPABASE_URL=https://wrfcpsljchyetbmupqgc.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_YANDEX_MAPS_API_KEY=fd2d6b9d-5695-493f-b095-349d48fc0103
```

**Важно**: Скопируйте VITE_SUPABASE_ANON_KEY из вашего Supabase проекта:
- Зайдите в Supabase Dashboard → Settings → API
- Скопируйте "anon public" ключ

### 2.4 Деплой

1. Нажмите "Deploy"
2. Дождитесь окончания деплоя (~2-3 минуты)
3. Вы получите production URL вида: `https://obschiy-sbor-XXXXX.vercel.app`

## Шаг 3: Настройка Supabase для production

1. Зайдите в Supabase Dashboard → Authentication → URL Configuration
2. Добавьте ваш Vercel URL в **Site URL**: `https://obschiy-sbor-XXXXX.vercel.app`
3. Добавьте в **Redirect URLs**:
   - `https://obschiy-sbor-XXXXX.vercel.app/*`
   - `https://obschiy-sbor-XXXXX.vercel.app/auth/callback`

## Шаг 4: Настройка Telegram Mini App

### 4.1 Настройка Web App URL

1. Откройте @BotFather в Telegram
2. Отправьте `/setmenubutton`
3. Выберите вашего бота `@ObschiySbor_bot`
4. Введите название кнопки: `Открыть приложение`
5. Введите Web App URL: `https://obschiy-sbor-XXXXX.vercel.app`

### 4.2 Настройка команд бота

1. Отправьте `/setcommands` в @BotFather
2. Выберите `@ObschiySbor_bot`
3. Отправьте следующий список:

```
start - Открыть приложение
events - Посмотреть события
create - Создать событие
profile - Мой профиль
help - Помощь
```

### 4.3 Описание бота

1. Отправьте `/setdescription` в @BotFather
2. Выберите бота
3. Введите:

```
ObschiySbor - платформа для организации совместных мероприятий. Создавайте события или присоединяйтесь к существующим: настольные игры, велопрогулки, походы, йога и многое другое!
```

### 4.4 Краткое описание

1. Отправьте `/setabouttext` в @BotFather
2. Выберите бота
3. Введите: `Платформа для организации и поиска событий по интересам`

## Шаг 5: Интеграция Telegram Auth (опционально)

Для авторизации через Telegram добавьте в Supabase:

1. Authentication → Providers → Telegram
2. Включите провайдер
3. Укажите Bot Token: `8427840882:AAGxqMFMMPCFMYDheZLmcEfeEHpjIV76yiU`

## Шаг 6: Проверка работоспособности

1. Откройте бота в Telegram: https://t.me/ObschiySbor_bot
2. Нажмите "Start" или "Menu" → "Открыть приложение"
3. Приложение должно открыться в Telegram
4. Проверьте:
   - ✅ Регистрацию/вход
   - ✅ Создание события
   - ✅ Карты (Яндекс.Карты должны работать)
   - ✅ Загрузку изображений
   - ✅ Уведомления

## Автоматический деплой

После настройки каждый push в ветку `main` будет автоматически деплоиться на Vercel.

## Полезные ссылки

- **Production URL**: https://obschiy-sbor-XXXXX.vercel.app (замените после деплоя)
- **Telegram Bot**: https://t.me/ObschiySbor_bot
- **Supabase Dashboard**: https://supabase.com/dashboard/project/wrfcpsljchyetbmupqgc
- **Vercel Dashboard**: https://vercel.com/dashboard

## Troubleshooting

### Проблема: Приложение не открывается в Telegram
- Проверьте, что URL в @BotFather правильный
- URL должен быть HTTPS
- Очистите кэш Telegram (Settings → Data and Storage → Clear Cache)

### Проблема: Ошибки аутентификации
- Проверьте Site URL и Redirect URLs в Supabase
- Убедитесь, что переменные окружения в Vercel правильные

### Проблема: Карты не отображаются
- Проверьте VITE_YANDEX_MAPS_API_KEY в переменных Vercel
- Откройте консоль браузера для проверки ошибок

### Проблема: Не загружаются изображения
- Проверьте настройки Storage bucket в Supabase
- Bucket `event-images` должен быть публичным

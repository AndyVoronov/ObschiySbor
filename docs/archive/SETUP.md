# Инструкция по настройке проекта ObschiySbor

## 1. Настройка Supabase

### Создание проекта

1. Зарегистрируйтесь на [supabase.com](https://supabase.com)
2. Создайте новый проект
3. Сохраните URL проекта и ANON KEY

### Настройка базы данных

1. Перейдите в SQL Editor в панели Supabase
2. Скопируйте содержимое файла `database/schema.sql`
3. Вставьте и выполните SQL скрипт
4. Убедитесь, что все таблицы созданы успешно

### Настройка аутентификации

1. Перейдите в **Authentication** → **Providers**
2. Включите **Email** провайдер
3. Для социальных провайдеров:

#### Google OAuth
1. Перейдите в [Google Cloud Console](https://console.cloud.google.com)
2. Создайте новый проект или выберите существующий
3. Включите Google+ API
4. Создайте OAuth 2.0 Client ID
5. Добавьте redirect URI: `https://<your-project>.supabase.co/auth/v1/callback`
6. Скопируйте Client ID и Client Secret
7. Вставьте их в Supabase (Authentication → Providers → Google)

#### Facebook OAuth
1. Перейдите в [Facebook Developers](https://developers.facebook.com)
2. Создайте новое приложение
3. Добавьте продукт "Facebook Login"
4. Настройте Valid OAuth Redirect URIs: `https://<your-project>.supabase.co/auth/v1/callback`
5. Скопируйте App ID и App Secret
6. Вставьте их в Supabase (Authentication → Providers → Facebook)

#### VK OAuth
1. Перейдите в [VK Developers](https://vk.com/apps?act=manage)
2. Создайте новое приложение
3. В настройках укажите Redirect URI: `https://<your-project>.supabase.co/auth/v1/callback`
4. Скопируйте App ID и Secure Key
5. Вставьте их в Supabase (Authentication → Providers → VK)

### Настройка Storage

1. Перейдите в **Storage**
2. Создайте bucket с именем `event-images`
3. В политиках bucket установите:
   - Public access для чтения (если нужен публичный доступ к изображениям)
   - Аутентифицированный доступ для загрузки

## 2. Настройка переменных окружения

### Frontend (.env)

Создайте файл `.env` в папке `frontend/`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
VITE_RECAPTCHA_SITE_KEY=your-recaptcha-site-key
```

## 3. Настройка Google Maps API

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com)
2. Включите Maps JavaScript API
3. Создайте API ключ
4. Ограничьте ключ по домену (для production)
5. Добавьте ключ в `.env` как `VITE_GOOGLE_MAPS_API_KEY`

## 4. Настройка reCAPTCHA

1. Перейдите на [Google reCAPTCHA](https://www.google.com/recaptcha/admin)
2. Зарегистрируйте новый сайт
3. Выберите reCAPTCHA v2 или v3
4. Добавьте домены
5. Скопируйте Site Key и Secret Key
6. Добавьте Site Key в `.env` как `VITE_RECAPTCHA_SITE_KEY`

## 5. Настройка уведомлений по email

### Supabase Email Templates

1. Перейдите в **Authentication** → **Email Templates**
2. Настройте шаблоны для:
   - Подтверждение email
   - Сброс пароля
   - Изменение email

### SendGrid (опционально)

1. Зарегистрируйтесь на [SendGrid](https://sendgrid.com)
2. Создайте API ключ
3. Создайте Edge Function в Supabase для отправки email:

```javascript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')

serve(async (req) => {
  const { to, subject, text, html } = await req.json()

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: 'noreply@obschiysbor.com' },
      subject,
      content: [
        { type: 'text/plain', value: text },
        { type: 'text/html', value: html },
      ],
    }),
  })

  return new Response(JSON.stringify({ success: res.ok }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

## 6. Настройка CI/CD с GitHub Actions

### Секреты для GitHub

Добавьте следующие секреты в настройках репозитория (**Settings** → **Secrets and variables** → **Actions**):

- `VITE_SUPABASE_URL` - URL вашего Supabase проекта
- `VITE_SUPABASE_ANON_KEY` - ANON ключ Supabase
- `VERCEL_TOKEN` - токен Vercel для деплоя
- `VERCEL_ORG_ID` - ID организации Vercel
- `VERCEL_PROJECT_ID` - ID проекта Vercel

### Получение Vercel токенов

1. Зарегистрируйтесь на [Vercel](https://vercel.com)
2. Создайте новый проект, импортировав репозиторий
3. Перейдите в **Settings** → **Tokens**
4. Создайте новый токен
5. Для получения ORG_ID и PROJECT_ID:
   ```bash
   npm i -g vercel
   vercel login
   vercel link
   ```

## 7. Деплой

### Vercel (Frontend)

#### Автоматический деплой через GitHub Actions
После настройки секретов, каждый push в main ветку будет автоматически деплоиться.

#### Ручной деплой
```bash
cd frontend
npm run build
vercel --prod
```

### Настройка переменных окружения в Vercel

1. Перейдите в настройки проекта на Vercel
2. **Settings** → **Environment Variables**
3. Добавьте:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_GOOGLE_MAPS_API_KEY`
   - `VITE_RECAPTCHA_SITE_KEY`

## 8. Мониторинг и логирование

### Sentry (опционально)

1. Создайте аккаунт на [Sentry](https://sentry.io)
2. Создайте новый проект React
3. Установите зависимости:
```bash
npm install @sentry/react
```

4. Инициализируйте в `main.jsx`:
```javascript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "your-sentry-dsn",
  environment: import.meta.env.MODE,
});
```

## 9. Тестирование

### Локальное тестирование

```bash
cd frontend
npm run dev
```

Откройте `http://localhost:5173` в браузере

### Чеклист тестирования

- [ ] Регистрация пользователя
- [ ] Вход через email
- [ ] Вход через социальные сети
- [ ] Создание события
- [ ] Поиск событий
- [ ] Присоединение к событию
- [ ] Редактирование профиля
- [ ] Выход из системы

## 10. Production чеклист

Перед запуском в production:

- [ ] Настроены все переменные окружения
- [ ] Включен HTTPS
- [ ] Настроен rate limiting
- [ ] Включен reCAPTCHA
- [ ] Настроены email уведомления
- [ ] Настроен мониторинг (Sentry)
- [ ] Настроены резервные копии БД
- [ ] Проведено тестирование безопасности
- [ ] Настроена CORS политика
- [ ] Проверена производительность
- [ ] Настроены логи ошибок

## Поддержка

При возникновении проблем:
1. Проверьте логи в Supabase Dashboard
2. Проверьте логи в Vercel Dashboard
3. Проверьте браузерную консоль на ошибки
4. Обратитесь к документации:
   - [Supabase Docs](https://supabase.com/docs)
   - [Vite Docs](https://vitejs.dev)
   - [React Router Docs](https://reactrouter.com)

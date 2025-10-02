# Следующие шаги для завершения проекта

Базовый функционал проекта реализован. Ниже указаны оставшиеся задачи для полной реализации согласно ТЗ.

## ✅ Реализовано

- [x] Структура React приложения с роутингом
- [x] Аутентификация через Supabase (email + соц. сети)
- [x] Создание событий с категориями
- [x] Поиск и фильтрация событий
- [x] Присоединение к событиям
- [x] Профиль пользователя
- [x] Схема базы данных PostgreSQL
- [x] Row Level Security (RLS)
- [x] GitHub Actions для CI/CD
- [x] Responsive дизайн

## 📋 Осталось реализовать

### 1. Интеграция карт 🗺️

#### Google Maps
```bash
npm install @react-google-maps/api
```

Создать компонент `MapPicker.jsx`:
```jsx
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

const MapPicker = ({ location, onLocationChange }) => {
  const [marker, setMarker] = useState(location);

  const handleMapClick = (e) => {
    const newLocation = {
      lat: e.latLng.lat(),
      lng: e.latLng.lng()
    };
    setMarker(newLocation);
    onLocationChange(newLocation);
  };

  return (
    <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
      <GoogleMap
        center={marker}
        zoom={12}
        onClick={handleMapClick}
      >
        <Marker position={marker} />
      </GoogleMap>
    </LoadScript>
  );
};
```

#### Или OpenStreetMap (бесплатная альтернатива)
```bash
npm install leaflet react-leaflet
```

Компонент `MapPicker.jsx`:
```jsx
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const LocationMarker = ({ position, setPosition }) => {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position ? <Marker position={position} /> : null;
};

const MapPicker = ({ location, onLocationChange }) => {
  return (
    <MapContainer center={location} zoom={13} style={{ height: '400px' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <LocationMarker position={location} setPosition={onLocationChange} />
    </MapContainer>
  );
};
```

### 2. Push-уведомления 🔔

#### Настройка Web Push API

Создать `useNotifications.js`:
```javascript
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useNotifications = (userId) => {
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // Показать браузерное уведомление
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('ObschiySbor', {
              body: payload.new.message,
              icon: '/logo.png',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
};
```

#### Email уведомления через Supabase Edge Functions

Создать Edge Function `send-notification`:
```javascript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { eventId, type } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  )

  // Получить участников события
  const { data: participants } = await supabase
    .from('event_participants')
    .select('user_id, profiles(email)')
    .eq('event_id', eventId)

  // Отправить уведомления
  for (const participant of participants) {
    await supabase
      .from('notifications')
      .insert({
        user_id: participant.user_id,
        event_id: eventId,
        type: type,
        message: `Обновление события`
      })
  }

  return new Response('OK', { status: 200 })
})
```

### 3. Экспорт в календарь 📅

Создать утилиту `generateICS.js`:
```javascript
export const generateICS = (event) => {
  const startDate = new Date(event.event_date);
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // +2 часа

  const formatDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ObschiySbor//Event//EN
BEGIN:VEVENT
UID:${event.id}@obschiysbor.com
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${event.title}
DESCRIPTION:${event.description}
LOCATION:${event.location}
END:VEVENT
END:VCALENDAR`;

  const blob = new Blob([ics], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `event-${event.id}.ics`;
  link.click();
};
```

Использование в EventDetails:
```jsx
<button onClick={() => generateICS(event)} className="btn btn-secondary">
  Добавить в календарь
</button>
```

### 4. reCAPTCHA 🛡️

```bash
npm install react-google-recaptcha
```

В `Register.jsx`:
```jsx
import ReCAPTCHA from 'react-google-recaptcha';

const [recaptchaValue, setRecaptchaValue] = useState(null);

<ReCAPTCHA
  sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
  onChange={(value) => setRecaptchaValue(value)}
/>

// В handleSubmit проверять recaptchaValue перед регистрацией
```

### 5. Модерация и отчеты 🚫

Создать страницу `Moderation.jsx`:
```jsx
const Moderation = () => {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    const { data } = await supabase
      .from('reports')
      .select(`
        *,
        events(*),
        profiles:reporter_id(full_name)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    setReports(data);
  };

  const handleResolve = async (reportId, action) => {
    await supabase
      .from('reports')
      .update({ status: 'resolved', resolved_at: new Date() })
      .eq('id', reportId);

    fetchReports();
  };

  return (
    <div>
      <h1>Модерация жалоб</h1>
      {reports.map(report => (
        <div key={report.id} className="report-card">
          <h3>{report.events?.title}</h3>
          <p><strong>Причина:</strong> {report.reason}</p>
          <p><strong>От:</strong> {report.profiles?.full_name}</p>
          <button onClick={() => handleResolve(report.id, 'approve')}>
            Одобрить
          </button>
          <button onClick={() => handleResolve(report.id, 'reject')}>
            Отклонить
          </button>
        </div>
      ))}
    </div>
  );
};
```

Кнопка жалобы в EventDetails:
```jsx
const handleReport = async () => {
  const reason = prompt('Укажите причину жалобы:');
  if (!reason) return;

  await supabase.from('reports').insert({
    event_id: event.id,
    reporter_id: user.id,
    reason: reason
  });

  alert('Жалоба отправлена на рассмотрение');
};
```

### 6. Загрузка изображений 📸

Создать `ImageUpload.jsx`:
```jsx
const ImageUpload = ({ onImageUpload }) => {
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `event-images/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('event-images')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Ошибка загрузки:', uploadError);
      return;
    }

    const { data } = supabase.storage
      .from('event-images')
      .getPublicUrl(filePath);

    onImageUpload(data.publicUrl);
  };

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleFileChange} />
    </div>
  );
};
```

### 7. Rate Limiting 🚦

Добавить в Supabase Edge Function:
```javascript
const rateLimits = new Map();

const checkRateLimit = (userId) => {
  const now = Date.now();
  const userLimit = rateLimits.get(userId) || { count: 0, resetTime: now + 86400000 };

  if (now > userLimit.resetTime) {
    userLimit.count = 0;
    userLimit.resetTime = now + 86400000;
  }

  if (userLimit.count >= 5) { // 5 событий в день
    return false;
  }

  userLimit.count++;
  rateLimits.set(userId, userLimit);
  return true;
};
```

### 8. Мониторинг Sentry 📊

```bash
npm install @sentry/react
```

В `main.jsx`:
```jsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "your-sentry-dsn",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

### 9. Оптимизация производительности ⚡

#### Кэширование с React Query
```bash
npm install @tanstack/react-query
```

```jsx
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';

const queryClient = new QueryClient();

// В App.jsx
<QueryClientProvider client={queryClient}>
  {/* ваше приложение */}
</QueryClientProvider>

// В Events.jsx
const { data: events, isLoading } = useQuery({
  queryKey: ['events', filters],
  queryFn: () => fetchEvents(filters),
  staleTime: 30000, // кэш на 30 секунд
});
```

#### Redis кэширование (если нужно)
Использовать Upstash Redis через Edge Functions для кэширования частых запросов.

## 📝 Порядок реализации

1. **Интеграция карт** (критично для UX)
2. **Загрузка изображений** (важно для событий)
3. **Уведомления** (Realtime + Email)
4. **Экспорт в календарь** (полезная функция)
5. **reCAPTCHA** (безопасность)
6. **Модерация** (контроль контента)
7. **Rate Limiting** (защита от злоупотреблений)
8. **Мониторинг** (production ready)
9. **Оптимизация** (производительность)

## 🚀 Деплой

После реализации всех фич:

1. Проверить все переменные окружения
2. Запустить тесты: `npm test`
3. Создать production build: `npm run build`
4. Задеплоить на Vercel через GitHub Actions
5. Настроить кастомный домен
6. Настроить SSL сертификат

## 📚 Дополнительные ресурсы

- [Supabase Docs](https://supabase.com/docs)
- [React Router](https://reactrouter.com)
- [Google Maps React](https://react-google-maps-api-docs.netlify.app/)
- [Leaflet Docs](https://leafletjs.com/)
- [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)

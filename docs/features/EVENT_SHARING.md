# Репост событий в социальные сети

**Дата реализации:** 26 октября 2025
**Статус:** ✅ Реализовано

## Обзор

Добавлен функционал репоста (sharing) событий в различные социальные сети и мессенджеры. Это повышает виральность платформы и помогает привлекать новых пользователей.

## Возможности

### Поддерживаемые платформы
- **Telegram** - репост через t.me/share
- **VK** - репост через vk.com/share
- **WhatsApp** - репост через wa.me
- **Копирование ссылки** - в буфер обмена
- **Native Share API** - системная панель репоста (на мобильных устройствах)

### Функции
- ✅ Форматированный текст с деталями события
- ✅ Прямая ссылка на событие
- ✅ Автоматическое определение платформы (мобильная/десктопная)
- ✅ Выпадающее меню с опциями репоста
- ✅ Индикатор копирования ссылки
- ✅ Поддержка dark mode
- ✅ Адаптивный дизайн

## Компоненты

### ShareEvent.jsx

Основной компонент для репоста событий.

**Props:**
- `event` (object, required) - Объект события
  - `id` - ID события
  - `title` - Название
  - `description` - Описание
  - `event_date` - Дата события
  - `location` - Место проведения
- `showLabel` (boolean, optional) - Показывать ли текст "Поделиться" (default: true)

**Пример использования:**
```jsx
import ShareEvent from '../components/ShareEvent';

<ShareEvent
  event={event}
  showLabel={true}
/>
```

### Интеграция в EventDetails

Кнопка репоста добавлена в заголовок события:

```jsx
<div className="event-header">
  <div className="event-header-main">
    <h1>{event.title}</h1>
    <div className="event-badges">...</div>
  </div>
  <div className="event-header-actions">
    <ShareEvent event={event} showLabel={true} />
  </div>
</div>
```

## Стилизация

### ShareEvent.css

Стили включают:
- Кнопку репоста с иконкой
- Выпадающее меню с опциями
- Индивидуальные стили для каждой платформы
- Hover эффекты
- Адаптивность для мобильных
- Dark mode поддержка

### EventDetails.css

Обновлён `.event-header`:
- Добавлен `.event-header-main` - для основного содержимого
- Добавлен `.event-header-actions` - для кнопок действий
- Flexbox layout для правильного позиционирования

## Переводы

### Русский (ru/common.json)
```json
"shareEvent": {
  "title": "Поделиться событием",
  "share": "Поделиться",
  "copyLink": "Скопировать ссылку",
  "copied": "Скопировано!",
  "shareVia": "Поделиться через"
}
```

### Английский (en/common.json)
```json
"shareEvent": {
  "title": "Share event",
  "share": "Share",
  "copyLink": "Copy link",
  "copied": "Copied!",
  "shareVia": "Share via"
}
```

## Технические детали

### Формирование URL
```javascript
const eventUrl = `${window.location.origin}/events/${event.id}`;
```

### Формирование текста репоста
```javascript
const shareText = `${event.title}

📅 ${new Date(event.event_date).toLocaleString('ru-RU')}
📍 ${event.location || 'Онлайн'}

${event.description?.substring(0, 200)}...`;
```

### Web Share API
Используется для мобильных устройств:
```javascript
if (navigator.share) {
  await navigator.share({
    title: event.title,
    text: shareText,
    url: eventUrl,
  });
}
```

### Fallback
На десктопе показывается выпадающее меню с опциями.

## Аналитика (будущее)

Для отслеживания эффективности репостов можно добавить:

### UTM метки
```javascript
const eventUrl = `${window.location.origin}/events/${event.id}?utm_source=${platform}&utm_medium=share&utm_campaign=event_sharing`;
```

### Таблица в БД
```sql
CREATE TABLE event_shares (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT REFERENCES events(id),
  platform TEXT, -- 'telegram', 'vk', 'whatsapp', 'link'
  shared_by UUID REFERENCES profiles(id),
  shared_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Примеры использования

### В EventDetails (уже реализовано)
```jsx
<ShareEvent event={event} showLabel={true} />
```

### В списке событий (можно добавить)
```jsx
<ShareEvent event={event} showLabel={false} />
```

### В карточке события (компактный вид)
```jsx
<ShareEvent
  event={event}
  showLabel={false}
/>
```

## Browser Support

- **Web Share API:** Chrome 89+, Safari 12.1+, Edge 93+
- **Clipboard API:** Chrome 66+, Firefox 63+, Safari 13.1+
- **Fallback:** Работает во всех современных браузерах

## Будущие улучшения

- [ ] Аналитика репостов
- [ ] UTM метки для отслеживания
- [ ] Реферальная система (начисление баллов за привлечённых пользователей)
- [ ] Кастомные изображения для Open Graph (og:image)
- [ ] Превью карточки события при репосте
- [ ] Интеграция с Facebook, Twitter
- [ ] QR-код для быстрого репоста

## Связанные файлы

### Frontend
- `frontend/src/components/ShareEvent.jsx` - Компонент репоста
- `frontend/src/components/ShareEvent.css` - Стили
- `frontend/src/pages/EventDetails.jsx` - Интеграция
- `frontend/src/pages/EventDetails.css` - Стили header
- `frontend/src/locales/ru/common.json` - Русские переводы
- `frontend/src/locales/en/common.json` - Английские переводы

## См. также
- [Реферальная программа](./REFERRAL_SYSTEM.md) (запланировано)
- [Геймификация](./GAMIFICATION_SYSTEM.md) (запланировано)

# Telegram Mini App для ObschiySbor

## Обзор

Telegram Mini App позволяет пользователям запускать веб-приложение прямо внутри Telegram без необходимости открывать браузер. При запуске из Telegram пользователи **автоматически авторизуются** используя свой Telegram аккаунт - не нужно вводить номер телефона или ждать SMS.

## Как это работает

### Автоматическая авторизация

1. Пользователь открывает [@ObschiySbor_bot](https://t.me/ObschiySbor_bot) в Telegram
2. Нажимает кнопку "Открыть приложение" или вводит команду `/start`
3. Telegram Mini App загружается внутри Telegram
4. **Автоматически:** приложение получает данные пользователя через Telegram WebApp API
5. **Автоматически:** создаётся аккаунт (если новый пользователь) или выполняется вход
6. Пользователь сразу попадает в приложение - авторизован и готов к использованию!

### Технические детали

**Telegram WebApp API:**
- Предоставляет данные пользователя через `window.Telegram.WebApp.initDataUnsafe`
- Данные включают: `id`, `first_name`, `last_name`, `username`, `photo_url`
- Данные подписаны и проверены Telegram - безопасны для использования

**Процесс авторизации:**
1. Приложение загружается и проверяет наличие `window.Telegram.WebApp`
2. Извлекаются данные пользователя из `initDataUnsafe.user`
3. Проверяется существование пользователя в базе по `telegram_id`
4. **Если новый пользователь:**
   - Создаётся аккаунт с email `tg{telegram_id}@obschiysbor.local`
   - Генерируется случайный пароль и сохраняется в `telegram_password`
   - Профиль обновляется с данными из Telegram
   - Показывается приветственное сообщение
5. **Если существующий пользователь:**
   - Извлекается сохранённый пароль из `telegram_password`
   - Выполняется вход через `supabase.auth.signInWithPassword()`
   - Показывается приветственное сообщение

## Компоненты реализации

### 1. Telegram WebApp SDK

Добавлен в `index.html`:
```html
<script src="https://telegram.org/js/telegram-web-app.js"></script>
```

### 2. useTelegramAuth Hook

Расположен в `src/hooks/useTelegramAuth.js`:

```javascript
export const useTelegramAuth = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTelegramApp, setIsTelegramApp] = useState(false);

  // Автоматически авторизует пользователя при запуске из Telegram
}
```

**Возвращает:**
- `isLoading` - идёт ли процесс авторизации
- `error` - ошибка авторизации (если есть)
- `isTelegramApp` - запущено ли приложение в Telegram

### 3. App.jsx

Обновлён для использования `useTelegramAuth`:

```javascript
function AppContent() {
  const { isLoading, error, isTelegramApp } = useTelegramAuth();

  // Показывает спиннер во время авторизации
  if (isTelegramApp && isLoading) {
    return <LoadingScreen />;
  }

  // Остальное приложение
}
```

## Настройка Telegram Mini App

### 1. Через BotFather

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте команду: `/myapps`
3. Выберите или создайте Mini App
4. Укажите URL приложения:
   - **Production**: `https://obschiy-sbor.vercel.app`
   - **Development**: `https://your-dev-url.ngrok.io` (используйте ngrok для локальной разработки)

### 2. Настройка кнопки в боте

Есть несколько способов запуска Mini App:

**Через меню бота:**
```
/setmenubutton
@ObschiySbor_bot
Текст: "Открыть приложение"
URL: https://obschiy-sbor.vercel.app
```

**Через Inline кнопку в сообщении:**
```javascript
{
  text: "🚀 Открыть ObschiySbor",
  web_app: { url: "https://obschiy-sbor.vercel.app" }
}
```

**Через команду /start:**
Настройте бота чтобы по команде `/start` отправлялось сообщение с кнопкой Mini App.

## Преимущества автоматической авторизации

✅ **Мгновенный вход** - пользователь сразу попадает в приложение
✅ **Нет SMS** - не нужно вводить номер телефона и ждать код
✅ **Бесшовный UX** - пользователь не замечает процесс авторизации
✅ **Безопасность** - данные подписаны Telegram, подделка невозможна
✅ **Меньше трения** - пользователь не может "застрять" на этапе авторизации

## Отличия от обычного входа

| Функция | Telegram Mini App | Обычный веб-браузер |
|---------|------------------|---------------------|
| Метод входа | Автоматический | Через Telegram Login Widget |
| Скорость | Мгновенно | Требует клик и подтверждение |
| Видимость | Внутри Telegram | Отдельная вкладка браузера |
| Push уведомления | Через Telegram Bot | Через браузер |

## User Flow

### Новый пользователь:

1. Открывает бота → нажимает "Открыть приложение"
2. ⏳ 1-2 секунды загрузки и авторизации
3. 🎉 Popup "Вы успешно зарегистрированы!"
4. ✅ Попадает на главную страницу, полностью авторизован

### Существующий пользователь:

1. Открывает бота → нажимает "Открыть приложение"
2. ⏳ 1 секунда загрузки и входа
3. 👋 Popup "Добро пожаловать обратно!"
4. ✅ Попадает на главную страницу, полностью авторизован

## Локальная разработка

Для тестирования Telegram Mini App локально:

### 1. Используйте ngrok для туннеля

```bash
# Установите ngrok
npm install -g ngrok

# Запустите dev сервер
cd frontend && npm run dev

# В другом терминале - создайте туннель
ngrok http 5173
```

### 2. Настройте URL в BotFather

Используйте HTTPS URL от ngrok:
```
https://abc123.ngrok.io
```

### 3. Откройте бота в Telegram

Теперь при открытии Mini App через бота будет загружаться ваша локальная версия!

## Troubleshooting

### Пользователь не авторизуется автоматически

**Проверьте:**
1. Скрипт `telegram-web-app.js` загружается в `index.html`
2. `window.Telegram.WebApp` доступен (откройте DevTools в Telegram)
3. Приложение открыто именно через бота, а не напрямую в браузере
4. URL в BotFather совпадает с URL приложения

### "У пользователя нет сохранённого пароля"

Это значит что пользователь был создан до добавления поля `telegram_password`.

**Решение:**
```sql
-- Обновите существующих пользователей
UPDATE profiles
SET telegram_password = md5(random()::text)
WHERE telegram_id IS NOT NULL AND telegram_password IS NULL;
```

### Приложение загружается но не авторизует

**Проверьте консоль:**
- Должно быть `console.log('Telegram Mini App: обнаружен пользователь')`
- Проверьте наличие ошибок Supabase
- Убедитесь что миграция `migration_telegram.sql` применена

## Тестирование

### В Telegram Desktop

1. Откройте Telegram Desktop
2. Найдите `@ObschiySbor_bot`
3. Нажмите "Открыть приложение"
4. Откройте DevTools (Ctrl+Shift+I)
5. Проверьте консоль на логи авторизации

### В Telegram Mobile

1. Откройте Telegram на телефоне
2. Найдите `@ObschiySbor_bot`
3. Нажмите "Открыть приложение"
4. Должна появиться загрузка → сразу главная страница

## Дополнительные возможности

### Telegram-специфичные фичи

После авторизации доступны дополнительные API:

**Haptic Feedback:**
```javascript
window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
```

**Popup уведомления:**
```javascript
window.Telegram.WebApp.showPopup({
  title: 'Успех!',
  message: 'Событие создано',
  buttons: [{ type: 'ok' }]
});
```

**Кнопка "Назад":**
```javascript
window.Telegram.WebApp.BackButton.show();
window.Telegram.WebApp.BackButton.onClick(() => navigate(-1));
```

**Главная кнопка:**
```javascript
window.Telegram.WebApp.MainButton.setText('Создать событие');
window.Telegram.WebApp.MainButton.show();
window.Telegram.WebApp.MainButton.onClick(() => navigate('/create-event'));
```

## См. также

- [TELEGRAM_LOGIN_SETUP.md](TELEGRAM_LOGIN_SETUP.md) - Настройка Telegram Login Widget для браузера
- [Telegram WebApp Documentation](https://core.telegram.org/bots/webapps)
- [Telegram Bot API](https://core.telegram.org/bots/api)

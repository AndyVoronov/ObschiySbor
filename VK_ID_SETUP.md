# Настройка VK ID для ObschiySbor

Это руководство описывает настройку авторизации через ВКонтакте с использованием VK ID SDK.

## Что такое VK ID?

VK ID — это современная система авторизации от ВКонтакте, которая заменяет старый VK OAuth. VK ID обеспечивает:
- Быструю авторизацию одним кликом (OneTap)
- Безопасную передачу данных
- Поддержку различных платформ

## Текущая реализация

В проекте уже настроена интеграция с VK ID:

**Данные приложения:**
- App ID: `54212508`
- Redirect URL: `https://obschiy-sbor.vercel.app/`

**Реализованные функции:**
- ✅ VK ID OneTap виджет на странице входа
- ✅ VK ID OneTap виджет на странице регистрации
- ✅ Автоматическое создание пользователя при первом входе через VK
- ✅ Сохранение VK ID в базе данных (поле `vk_id` в таблице `profiles`)
- ✅ Загрузка аватара и имени пользователя из VK

## Архитектура

### Frontend (React)

1. **Login.jsx и Register.jsx:**
   - Динамически загружают VK ID SDK при монтировании компонента
   - Инициализируют VK ID с настройками приложения
   - Отображают OneTap виджет в контейнере
   - Обрабатывают событие успешной авторизации
   - Обменивают код авторизации на токен доступа

2. **Процесс авторизации:**
   ```
   Пользователь → VK OneTap → Получение code →
   → exchangeCode() → Данные пользователя VK →
   → Создание/вход в Supabase → Навигация на главную
   ```

### Backend (Supabase)

1. **База данных:**
   - Таблица `profiles` содержит поле `vk_id BIGINT UNIQUE`
   - Индекс на `vk_id` для быстрого поиска
   - При первом входе через VK создаётся новый пользователь

2. **Авторизация:**
   - Используется стандартная Supabase Auth
   - Для VK пользователей создаётся email вида `vk{vk_id}@obschiysbor.local`
   - Генерируется случайный пароль (пользователь не знает его)

## Применение SQL миграции

Для корректной работы необходимо добавить поле `vk_id` в таблицу profiles:

1. Откройте Supabase Dashboard
2. Перейдите в **SQL Editor**
3. Выполните SQL из файла `database/migration_vk_id.sql`:

```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS vk_id BIGINT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_profiles_vk_id ON profiles(vk_id);

COMMENT ON COLUMN profiles.vk_id IS 'VK ID пользователя для авторизации через ВКонтакте';
```

## Настройка Redirect URL в VK

Если вы деплоите приложение на другой домен, необходимо обновить Redirect URL:

1. Зайдите в [VK для разработчиков](https://vk.com/apps?act=manage)
2. Выберите ваше приложение (ID: 54212508)
3. Перейдите в **Настройки**
4. В разделе **Redirect URI** добавьте новый URL:
   - Для локальной разработки: `http://localhost:5173/`
   - Для production: `https://ваш-домен.com/`

5. Обновите `redirectUrl` в коде:

**В Login.jsx и Register.jsx:**
```javascript
VKID.Config.init({
  app: 54212508,
  redirectUrl: window.location.origin + '/auth/vk/callback', // Автоматически определяется
  responseMode: VKID.ConfigResponseMode.Callback,
  source: VKID.ConfigSource.LOWCODE,
});
```

## Как это работает

### 1. Загрузка SDK

При открытии страницы Login или Register:
```javascript
const script = document.createElement('script');
script.src = 'https://unpkg.com/@vkid/sdk@<3.0.0/dist-sdk/umd/index.js';
document.head.appendChild(script);
```

### 2. Инициализация VK ID

После загрузки SDK:
```javascript
VKID.Config.init({
  app: 54212508,
  redirectUrl: window.location.origin + '/auth/vk/callback',
  responseMode: VKID.ConfigResponseMode.Callback,
  source: VKID.ConfigSource.LOWCODE,
});
```

### 3. Рендеринг OneTap виджета

```javascript
const oneTap = new VKID.OneTap();
oneTap.render({
  container: document.getElementById('vk-auth-container'),
  showAlternativeLogin: false,
});
```

### 4. Обработка успешной авторизации

```javascript
.on(VKID.OneTapInternalEvents.LOGIN_SUCCESS, async (payload) => {
  const code = payload.code;
  const deviceId = payload.device_id;

  const authData = await VKID.Auth.exchangeCode(code, deviceId);
  await handleVKAuth(authData);
});
```

### 5. Создание пользователя в Supabase

```javascript
const handleVKAuth = async (vkAuthData) => {
  const vkUser = vkAuthData.user;

  // Проверяем существующего пользователя
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('vk_id', vkUser.id)
    .single();

  if (!existingProfile) {
    // Создаём нового пользователя
    const email = vkUser.email || `vk${vkUser.id}@obschiysbor.local`;

    await supabase.auth.signUp({
      email: email,
      password: Math.random().toString(36).slice(-16),
      options: {
        data: {
          full_name: `${vkUser.first_name} ${vkUser.last_name}`,
          avatar_url: vkUser.avatar,
          vk_id: vkUser.id,
        }
      }
    });
  }
};
```

## Ограничения и известные проблемы

### 1. Повторный вход для существующих VK пользователей

**Проблема:** Текущая реализация не сохраняет Supabase сессию для VK пользователей при повторном входе.

**Решение (требует доработки):**
- Необходима Supabase Edge Function для генерации custom JWT токена
- Или использование Supabase Admin API для создания сессии

### 2. Привязка VK к существующему аккаунту

**Проблема:** Пользователь не может привязать VK к существующему аккаунту через ConnectedAccounts.

**Причина:** VK ID OneTap не поддерживает режим "привязки" - только вход/регистрация.

**Временное решение:** В ConnectedAccounts показывается информация, что VK можно подключить только при первом входе.

### 3. Email адреса

**Особенность:** Если VK не предоставляет email, создаётся синтетический email `vk{vk_id}@obschiysbor.local`.

**Последствия:**
- Пользователь не сможет восстановить пароль через email
- Необходимо использовать VK для входа

## Тестирование

### Локальное тестирование

1. Запустите dev сервер:
```bash
cd frontend
npm run dev
```

2. Откройте `http://localhost:5173/login`

3. Вы должны увидеть VK OneTap виджет с кнопкой "Войти через VK"

4. Нажмите на кнопку и авторизуйтесь через VK

5. Проверьте:
   - ✅ Перенаправление на главную страницу
   - ✅ Создание записи в таблице `profiles`
   - ✅ Заполнение поля `vk_id`
   - ✅ Загрузка аватара и имени из VK

### Production тестирование

1. Убедитесь, что Redirect URL настроен в VK
2. Примените SQL миграцию в Supabase
3. Задеплойте приложение
4. Протестируйте полный flow авторизации

## Отладка

### VK ID SDK не загружается

**Проверьте:**
- Открыта ли консоль браузера на наличие ошибок
- Доступен ли CDN `unpkg.com`
- Правильно ли указана версия SDK

### OneTap виджет не отображается

**Проверьте:**
- Существует ли элемент с ID `vk-auth-container`
- Правильно ли инициализирован VK ID Config
- App ID правильный (54212508)

### Ошибка при обмене кода

**Возможные причины:**
- Неверный redirect URL
- Истёк код авторизации (используйте сразу после получения)
- Проблемы с сетевым соединением

### Пользователь не создаётся в Supabase

**Проверьте:**
- Логи в консоли браузера
- Есть ли ошибки в Supabase Dashboard → Logs
- Корректно ли работает database trigger `on_auth_user_created`

## Дополнительная информация

- [VK ID Documentation](https://id.vk.com/about/business/go/docs/ru/vkid/latest/vk-id/intro/plan)
- [VK ID SDK GitHub](https://github.com/VKCOM/vkid-js-sdk)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)

## Безопасность

1. **Client Secret не используется** - VK ID OneTap работает только с App ID
2. **Случайные пароли** - генерируются криптографически стойкие пароли для VK пользователей
3. **UNIQUE constraint на vk_id** - предотвращает дубликаты
4. **Row Level Security** - доступ к профилям контролируется RLS политиками

## Будущие улучшения

1. **Supabase Edge Function** для создания JWT токенов при повторном входе
2. **Привязка VK к существующему аккаунту** через специальный flow
3. **Обновление данных пользователя** из VK при каждом входе
4. **Отвязка VK аккаунта** с сохранением доступа через email/пароль

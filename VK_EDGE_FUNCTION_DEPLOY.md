# Деплой Edge Function для получения данных пользователя VK

## Что делает Edge Function

Edge Function `vk-get-user` обходит CORS ограничения браузера и получает данные пользователя из VK API:
- `first_name` - имя
- `last_name` - фамилия
- `photo_200` - аватар (200x200px)

## Метод 1: Деплой через Supabase CLI (Рекомендуется)

### 1. Установите Supabase CLI

```bash
npm install -g supabase
```

### 2. Авторизуйтесь в Supabase

```bash
supabase login
```

### 3. Свяжите проект с локальной директорией

```bash
supabase link --project-ref wrfcpsljchyetbmupqgc
```

### 4. Задеплойте Edge Function

```bash
supabase functions deploy vk-get-user
```

## Метод 2: Деплой через Supabase Dashboard (Вручную)

### 1. Откройте Supabase Dashboard

Перейдите: https://supabase.com/dashboard/project/wrfcpsljchyetbmupqgc/functions

### 2. Создайте новую функцию

- Нажмите "Create a new function"
- Название: `vk-get-user`

### 3. Скопируйте код

Скопируйте весь код из файла `supabase/functions/vk-get-user/index.ts` и вставьте в редактор.

### 4. Сохраните и задеплойте

Нажмите "Deploy function"

## Проверка работы

### Через Dashboard

1. Перейдите в Functions → vk-get-user
2. Нажмите "Invoke function"
3. Отправьте тестовый запрос:

```json
{
  "user_id": "123456789",
  "access_token": "your_test_token"
}
```

### Через код приложения

После деплоя Edge Function будет автоматически вызываться в [Login.jsx:126](frontend/src/pages/Login.jsx#L126) и [Register.jsx:142](frontend/src/pages/Register.jsx#L142) при входе через VK.

Проверьте консоль браузера на наличие логов:
- `VK User Data from API:` - должны появиться данные пользователя из VK

## Troubleshooting

### Ошибка: "Edge Function Error"

Проверьте:
1. Edge Function задеплоена: Dashboard → Functions → vk-get-user должна быть в статусе "Active"
2. Имя функции правильное: `vk-get-user` (с дефисами, не подчеркиваниями)
3. VK access_token валидный (проверяется при каждом входе)

### Ошибка: "VK API Error"

VK API может вернуть ошибку если:
- access_token невалидный или истёк
- user_id не существует
- Превышен rate limit VK API

В этом случае приложение продолжит работу с базовым именем "Пользователь VK {id}".

## Логи Edge Function

Просмотр логов в Dashboard:
1. Functions → vk-get-user → Logs
2. Здесь можно увидеть все запросы к функции и ошибки

## Безопасность

- Edge Function работает на серверной стороне, поэтому CORS не применяется
- access_token передаётся напрямую из VK ID SDK и используется только для одного запроса
- Данные пользователя не кэшируются на сервере

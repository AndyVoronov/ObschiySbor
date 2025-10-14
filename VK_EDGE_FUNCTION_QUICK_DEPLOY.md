# Быстрый деплой Edge Function вручную

## Шаг 1: Откройте Supabase Dashboard

Перейдите по ссылке: https://supabase.com/dashboard/project/wrfcpsljchyetbmupqgc/functions

## Шаг 2: Создайте новую функцию

1. Нажмите кнопку **"Create a new function"** или **"New Edge Function"**
2. В поле "Name" введите: `vk-get-user`
3. Нажмите "Create function"

## Шаг 3: Вставьте код функции

Скопируйте весь код ниже и вставьте в редактор кода:

```typescript
// Supabase Edge Function для получения данных пользователя из VK API
// Обходит CORS ограничения браузера

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Обработка CORS preflight запроса
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, access_token } = await req.json()

    if (!user_id || !access_token) {
      return new Response(
        JSON.stringify({ error: 'user_id and access_token are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Запрос к VK API для получения информации о пользователе
    const vkApiUrl = `https://api.vk.com/method/users.get?user_ids=${user_id}&fields=photo_200&access_token=${access_token}&v=5.131`

    const response = await fetch(vkApiUrl)
    const data = await response.json()

    if (data.error) {
      return new Response(
        JSON.stringify({ error: 'VK API Error', details: data.error }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!data.response || !data.response[0]) {
      return new Response(
        JSON.stringify({ error: 'User not found in VK API response' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const vkUser = data.response[0]

    return new Response(
      JSON.stringify({
        id: vkUser.id,
        first_name: vkUser.first_name,
        last_name: vkUser.last_name,
        photo_200: vkUser.photo_200,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
```

## Шаг 4: Сохраните и задеплойте

1. Нажмите кнопку **"Deploy"** (обычно справа вверху)
2. Дождитесь завершения деплоя (статус должен стать "Active" или "Deployed")

## Шаг 5: Проверьте работу

1. Перейдите на страницу входа: https://obschiy-sbor.vercel.app/login
2. Нажмите кнопку "Войти через ВКонтакте"
3. После успешного входа проверьте консоль браузера (F12 → Console)
4. Должны появиться логи:
   - `VK User Data from API:` с вашим именем и фамилией
5. Проверьте профиль - должно отображаться ваше реальное имя из VK

## Готово! 🎉

После деплоя все новые пользователи, входящие через ВКонтакте, будут автоматически получать свои реальные имена и аватары.

## Если что-то не работает

Проверьте логи Edge Function:
1. Dashboard → Functions → vk-get-user → Logs
2. Посмотрите на ошибки (если есть)

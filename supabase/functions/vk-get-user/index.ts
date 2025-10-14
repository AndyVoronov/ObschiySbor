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

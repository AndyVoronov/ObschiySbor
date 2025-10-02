# 🚀 Быстрый старт ObschiySbor

## Шаг 1: База данных настроена ✅

Ваш Supabase проект создан:
- **URL**: https://wrfcpsljchyetbmupqgc.supabase.co
- **Project ID**: wrfcpsljchyetbmupqgc
- **Status**: .env файл создан ✅

## Шаг 2: Применить SQL схему (ОБЯЗАТЕЛЬНО!)

### Автоматический способ (рекомендуется):

1. **Откройте SQL Editor в Supabase:**
   ```
   https://supabase.com/dashboard/project/wrfcpsljchyetbmupqgc/sql/new
   ```

2. **Скопируйте SQL из файла:**
   - Откройте файл: `database/quick-schema.sql`
   - Скопируйте ВСЁ содержимое (Ctrl+A, Ctrl+C)

3. **Вставьте и выполните:**
   - Вставьте в SQL Editor (Ctrl+V)
   - Нажмите **"Run"** или **F5**
   - Дождитесь сообщения "Success"

4. **Проверьте результат:**
   ```bash
   node init-db.js
   ```

### Альтернатива - через командную строку:

Если у вас установлен `psql`:
```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@db.wrfcpsljchyetbmupqgc.supabase.co:5432/postgres" < database/quick-schema.sql
```

## Шаг 3: Настроить аутентификацию

1. Откройте [Authentication Settings](https://supabase.com/dashboard/project/wrfcpsljchyetbmupqgc/auth/providers)

2. **Включите Email провайдер:**
   - Перейдите в **Auth → Providers → Email**
   - Убедитесь что включен
   - **Enable email confirmations**: включите (или отключите для разработки)

3. **Настройте Site URL (важно!):**
   - Перейдите в **Auth → URL Configuration**
   - **Site URL**: `http://localhost:5173` (для разработки)
   - **Redirect URLs**: добавьте:
     - `http://localhost:5173/**`
     - `http://localhost:5173/auth/callback`

4. **(Опционально) Google OAuth:**
   - Получите Client ID и Secret в [Google Cloud Console](https://console.cloud.google.com)
   - Вставьте в **Auth → Providers → Google**

## Шаг 4: Запустить приложение

```bash
cd frontend
npm run dev
```

Откройте: http://localhost:5173

## Шаг 5: Проверить работу

### Тест 1: Регистрация
1. Откройте http://localhost:5173/register
2. Заполните форму
3. Зарегистрируйтесь

### Тест 2: Создание события
1. Войдите в систему
2. Перейдите на "Создать событие"
3. Заполните форму
4. Создайте событие

### Тест 3: Поиск событий
1. Откройте "События"
2. Используйте фильтры
3. Кликните на событие

## ⚠️ Типичные проблемы

### Ошибка: "Could not find the table 'public.profiles'"
**Решение**: Вы не применили SQL схему. Повторите Шаг 2.

### Ошибка: "Invalid login credentials"
**Решение**:
1. Проверьте что таблица `profiles` создана
2. Проверьте что триггер `on_auth_user_created` существует
3. Попробуйте зарегистрироваться заново

### Ошибка: "Failed to fetch"
**Решение**:
1. Проверьте что dev сервер запущен (`npm run dev`)
2. Проверьте `.env` файл
3. Проверьте URL Supabase

### События не отображаются
**Решение**:
1. Проверьте что вы вошли в систему
2. Создайте тестовое событие
3. Проверьте консоль браузера на ошибки

## 📋 Чеклист готовности

- [ ] SQL схема применена
- [ ] `node init-db.js` показывает "✅ все таблицы существуют"
- [ ] Email провайдер включен
- [ ] Site URL настроен
- [ ] `npm run dev` запускается без ошибок
- [ ] Регистрация работает
- [ ] Можно создать событие
- [ ] События отображаются

## 🎉 Готово!

Теперь у вас работающее приложение ObschiySbor!

## 📚 Следующие шаги

1. **Добавить интеграцию карт** - см. `NEXT_STEPS.md`
2. **Настроить загрузку изображений** - создайте bucket в Storage
3. **Настроить уведомления** - создайте Edge Functions
4. **Задеплоить на Vercel** - см. `README.md`

## 🆘 Нужна помощь?

1. Проверьте логи в Supabase Dashboard
2. Проверьте консоль браузера (F12)
3. Проверьте документацию: `SETUP.md`
4. Проверьте Issues на GitHub

---

**Удачи в разработке!** 🚀

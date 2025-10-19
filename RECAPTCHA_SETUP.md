# reCAPTCHA Setup Guide

## Описание

В проект интегрирована защита от ботов через **Google reCAPTCHA v2**. reCAPTCHA применяется на критических формах для предотвращения спама и автоматических регистраций.

## Защищённые формы

✅ **Форма регистрации** (`/register`) - защита от автоматических регистраций ботов
✅ **Форма создания события** (`/create-event`) - защита от спам-событий

## Настройка

### 1. Получение ключей Google reCAPTCHA

1. Перейдите на [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin/create)
2. Войдите с вашим Google аккаунтом
3. Заполните форму регистрации сайта:
   - **Label (Метка)**: ObschiySbor (или любое другое название для идентификации)
   - **reCAPTCHA type**: reCAPTCHA v2 → "I'm not a robot" Checkbox
   - **Domains (Домены)**:
     - Для разработки: `localhost`
     - Для production: ваш домен (например, `obschiy-sbor.vercel.app`)
   - **Accept the reCAPTCHA Terms of Service**: отметьте галочку
4. Нажмите **Submit**
5. Скопируйте полученные ключи:
   - **Site Key** - для фронтенда (публичный ключ)
   - **Secret Key** - для бэкенда (приватный ключ, пока не используется)

### 2. Настройка фронтенда

Добавьте **Site Key** в файл `frontend/.env`:

```env
VITE_RECAPTCHA_SITE_KEY=your_site_key_here
```

**Важно**:
- Файл `.env` не коммитится в git (он в `.gitignore`)
- После изменения `.env` перезапустите dev сервер (`npm run dev`)

### 3. Проверка работы

1. Запустите dev сервер:
   ```bash
   cd frontend
   npm run dev
   ```

2. Откройте форму регистрации: http://localhost:5173/register
3. Вы должны увидеть виджет reCAPTCHA с чекбоксом "I'm not a robot"
4. Попробуйте зарегистрироваться:
   - **Без установки галочки** → появится ошибка "Пожалуйста, подтвердите, что вы не робот"
   - **С установкой галочки** → регистрация должна пройти успешно

## Поведение в разных режимах

### Development Mode (без ключа)
Если `VITE_RECAPTCHA_SITE_KEY` не настроен:
- reCAPTCHA **не отображается**
- Показывается предупреждение в консоли браузера
- Показывается жёлтая плашка на месте виджета с подсказкой
- Формы работают **без проверки** (для удобства разработки)

### Development Mode (с ключом)
Если `VITE_RECAPTCHA_SITE_KEY` настроен:
- reCAPTCHA отображается и работает полноценно
- Валидация включена - форма не отправится без подтверждения

### Production Mode
В production **обязательно** настройте reCAPTCHA:
- Добавьте переменную окружения на Vercel (Settings → Environment Variables)
- Используйте production домен в настройках Google reCAPTCHA

## Архитектура решения

### Компоненты

**`RecaptchaWrapper`** (`frontend/src/components/RecaptchaWrapper.jsx`)
- Обёртка над библиотекой `react-google-recaptcha`
- Использует `forwardRef` для доступа к методам через ref
- Автоматически скрывается если ключ не настроен
- Показывает dev-friendly предупреждение при отсутствии ключа

**Пример использования:**
```jsx
import { useRef, useState } from 'react';
import RecaptchaWrapper from '../components/RecaptchaWrapper';

const MyForm = () => {
  const [recaptchaToken, setRecaptchaToken] = useState(null);
  const recaptchaRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Проверка (только если ключ настроен)
    const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
    if (recaptchaSiteKey && !recaptchaToken) {
      alert('Пожалуйста, подтвердите, что вы не робот');
      return;
    }

    // Отправка формы...

    // Сброс при ошибке
    if (error && recaptchaRef.current) {
      recaptchaRef.current.reset();
      setRecaptchaToken(null);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Ваши поля */}

      <RecaptchaWrapper
        ref={recaptchaRef}
        onChange={(token) => setRecaptchaToken(token)}
        onExpired={() => setRecaptchaToken(null)}
      />

      <button type="submit">Отправить</button>
    </form>
  );
};
```

### Библиотеки

- **`react-google-recaptcha`** - официальная React обёртка для Google reCAPTCHA

## Будущие улучшения

### Планируется добавить:

🔲 **Backend валидация** (приоритет: средний)
- Добавить Edge Function в Supabase для проверки токена на сервере
- Использовать `Secret Key` для валидации через Google API
- Предотвратить обход клиентской проверки

🔲 **Rate Limiting** (приоритет: высокий)
- Ограничить количество попыток регистрации/создания событий с одного IP
- Интеграция с Supabase для отслеживания частоты запросов

🔲 **Invisible reCAPTCHA** (приоритет: низкий)
- Переход на invisible reCAPTCHA для улучшения UX
- Автоматическая проверка без взаимодействия с пользователем

## Troubleshooting

### reCAPTCHA не отображается
1. Проверьте наличие `VITE_RECAPTCHA_SITE_KEY` в `.env`
2. Перезапустите dev сервер после добавления переменной
3. Проверьте консоль браузера на наличие ошибок

### Ошибка "Invalid site key"
1. Убедитесь, что Site Key скопирован правильно (без лишних пробелов)
2. Проверьте, что домен `localhost` добавлен в настройках Google reCAPTCHA
3. Для production проверьте, что ваш домен добавлен в список разрешённых

### reCAPTCHA не сбрасывается после ошибки
1. Убедитесь, что используете `useRef` для хранения ссылки на компонент
2. Проверьте вызов `recaptchaRef.current.reset()` в блоке обработки ошибок
3. Убедитесь, что сбрасываете `recaptchaToken` состояние: `setRecaptchaToken(null)`

## Полезные ссылки

- [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
- [reCAPTCHA v2 Documentation](https://developers.google.com/recaptcha/docs/display)
- [react-google-recaptcha GitHub](https://github.com/dozoisch/react-google-recaptcha)

## Статус реализации

- ✅ Установка библиотеки `react-google-recaptcha`
- ✅ Создание компонента `RecaptchaWrapper`
- ✅ Интеграция в форму регистрации (`Register.jsx`)
- ✅ Интеграция в форму создания события (`CreateEvent.jsx`)
- ✅ Graceful degradation (опциональная работа в dev режиме)
- ⏳ Backend валидация через Edge Functions (планируется)
- ⏳ Rate limiting для дополнительной защиты (планируется)

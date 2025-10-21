# Мультиязычность (i18n) - Настройка и Использование

**Статус:** ✅ Реализовано
**Дата:** 2025-10-22
**Версия:** 1.0

## Обзор

В проекте реализована полная поддержка мультиязычности с использованием **i18next**. Поддерживаемые языки:
- 🇷🇺 **Русский (RU)** - язык по умолчанию
- 🇬🇧 **Английский (EN)**

Система автоматически определяет язык браузера и сохраняет выбор пользователя в `localStorage`.

## Технологический стек

- **i18next** - основная библиотека интернационализации
- **react-i18next** - интеграция с React
- **i18next-browser-languagedetector** - автоопределение языка браузера

## Структура переводов

```
frontend/src/
├── i18n.js                    # Конфигурация i18next
├── locales/
│   ├── ru/
│   │   └── common.json        # Русские переводы
│   └── en/
│       └── common.json        # Английские переводы
└── components/
    ├── LanguageSwitcher.jsx   # Компонент переключателя языка
    └── LanguageSwitcher.css
```

## Конфигурация (i18n.js)

```javascript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ru: { common: ruCommon },
      en: { common: enCommon }
    },
    fallbackLng: 'ru', // Язык по умолчанию
    defaultNS: 'common',

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },

    interpolation: {
      escapeValue: false
    }
  });
```

## Использование в компонентах

### Базовое использование

```jsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation('common');

  return (
    <div>
      <h1>{t('app.name')}</h1>
      <p>{t('app.tagline')}</p>
    </div>
  );
}
```

### Переключение языка

```jsx
import { useTranslation } from 'react-i18next';

function LanguageSelector() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <button onClick={() => changeLanguage('en')}>
      Switch to English
    </button>
  );
}
```

### С параметрами

```jsx
// Перевод с переменными
t('events.participantsCount', { count: 10 })

// В JSON файле:
{
  "events": {
    "participantsCount": "Участников: {{count}}"
  }
}
```

## Структура переводов (JSON)

### Разделы переводов

#### 1. **app** - Информация о приложении
```json
{
  "app": {
    "name": "ОбщийСбор",
    "tagline": "Платформа для организации событий"
  }
}
```

#### 2. **nav** - Навигация
```json
{
  "nav": {
    "home": "Главная",
    "events": "События",
    "profile": "Профиль",
    "chats": "Чаты"
  }
}
```

#### 3. **common** - Общие фразы
```json
{
  "common": {
    "loading": "Загрузка...",
    "error": "Ошибка",
    "save": "Сохранить",
    "cancel": "Отмена"
  }
}
```

#### 4. **auth** - Аутентификация
```json
{
  "auth": {
    "loginTitle": "Вход в аккаунт",
    "email": "Email",
    "password": "Пароль"
  }
}
```

#### 5. **events** - События
```json
{
  "events": {
    "title": "События",
    "createEvent": "Создать событие",
    "join": "Присоединиться"
  }
}
```

#### 6. **profile** - Профиль
```json
{
  "profile": {
    "title": "Профиль",
    "editProfile": "Редактировать профиль"
  }
}
```

#### 7. **categories** - Категории событий
```json
{
  "categories": {
    "board_games": "Настольные игры",
    "cycling": "Велопрогулки",
    "hiking": "Походы"
  }
}
```

#### 8. **footer** - Футер
```json
{
  "footer": {
    "about": "О нас",
    "contacts": "Контакты",
    "rules": "Правила"
  }
}
```

## Компонент переключателя языка

### LanguageSwitcher

Расположение: `frontend/src/components/LanguageSwitcher.jsx`

**Функции:**
- Отображение флагов и кодов языков
- Подсветка активного языка
- Адаптивный дизайн (на мобильных скрываются коды, остаются флаги)
- Поддержка тёмной темы

**Пример использования:**
```jsx
import LanguageSwitcher from './components/LanguageSwitcher';

function TopNav() {
  return (
    <header>
      <LanguageSwitcher />
    </header>
  );
}
```

## Добавление нового языка

### Шаг 1: Создать файл перевода

```bash
mkdir frontend/src/locales/de
```

Создать `frontend/src/locales/de/common.json`:
```json
{
  "app": {
    "name": "ObschiySbor",
    "tagline": "Plattform für die Organisation von Veranstaltungen"
  },
  ...
}
```

### Шаг 2: Обновить конфигурацию

В `frontend/src/i18n.js`:
```javascript
import deCommon from './locales/de/common.json';

const resources = {
  ru: { common: ruCommon },
  en: { common: enCommon },
  de: { common: deCommon } // Добавить
};
```

### Шаг 3: Добавить в переключатель

В `frontend/src/components/LanguageSwitcher.jsx`:
```javascript
const languages = [
  { code: 'ru', name: 'RU', flag: '🇷🇺' },
  { code: 'en', name: 'EN', flag: '🇬🇧' },
  { code: 'de', name: 'DE', flag: '🇩🇪' } // Добавить
];
```

## Лучшие практики

### 1. Именование ключей
- Используйте вложенную структуру: `section.subsection.key`
- Короткие и понятные ключи: `nav.home`, `events.join`
- Группируйте по функциональности

### 2. Плюрализация

```json
{
  "events": {
    "participants_one": "{{count}} участник",
    "participants_few": "{{count}} участника",
    "participants_many": "{{count}} участников"
  }
}
```

Использование:
```javascript
t('events.participants', { count: 5 })
```

### 3. Форматирование дат и чисел

```javascript
import { useTranslation } from 'react-i18next';

const { i18n } = useTranslation();

// Форматирование даты
const formattedDate = new Date().toLocaleDateString(i18n.language);

// Форматирование числа
const formattedNumber = (1234.56).toLocaleString(i18n.language);
```

### 4. Разделение переводов

По мере роста проекта создавайте отдельные файлы:
```
locales/ru/
├── common.json      # Общие фразы
├── events.json      # События
├── auth.json        # Аутентификация
└── errors.json      # Сообщения об ошибках
```

## Тестирование

### Проверка переводов

```javascript
import { renderWithI18n } from './test-utils';

test('renders translated text', () => {
  const { getByText } = renderWithI18n(<MyComponent />, { lng: 'en' });
  expect(getByText('Home')).toBeInTheDocument();
});
```

### Утилита для тестирования

```javascript
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';

export const renderWithI18n = (component, { lng = 'ru' } = {}) => {
  i18n.changeLanguage(lng);
  return render(
    <I18nextProvider i18n={i18n}>
      {component}
    </I18nextProvider>
  );
};
```

## Производительность

### Lazy loading для больших приложений

```javascript
import Backend from 'i18next-http-backend';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json'
    }
  });
```

## Известные ограничения

1. **Server-side rendering (SSR)** - текущая конфигурация для client-side only
2. **Автоматический перевод** - переводы создаются вручную
3. **Плюрализация** - требует дополнительной настройки для сложных правил

## Roadmap

- [ ] Добавить поддержку дополнительных языков (FR, ES, DE)
- [ ] Реализовать плюрализацию для русского языка
- [ ] Создать админ-панель для управления переводами
- [ ] Интеграция с сервисом переводов (Crowdin, Lokalise)
- [ ] Добавить переводы для всех страниц приложения

## Поддержка

При возникновении вопросов или обнаружении ошибок в переводах:
1. Проверьте файлы переводов в `frontend/src/locales/`
2. Убедитесь, что ключ существует в обоих языках
3. Проверьте консоль браузера на предупреждения i18next

## Ссылки

- [i18next Documentation](https://www.i18next.com/)
- [react-i18next Documentation](https://react.i18next.com/)
- [Language Detection](https://github.com/i18next/i18next-browser-languageDetector)

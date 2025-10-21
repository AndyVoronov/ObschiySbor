import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Импорт переводов
import ruCommon from './locales/ru/common.json';
import enCommon from './locales/en/common.json';

const resources = {
  ru: {
    common: ruCommon
  },
  en: {
    common: enCommon
  }
};

i18n
  // Автоматическое определение языка браузера
  .use(LanguageDetector)
  // Подключение React
  .use(initReactI18next)
  // Инициализация
  .init({
    resources,
    fallbackLng: 'ru', // Язык по умолчанию
    defaultNS: 'common', // Namespace по умолчанию

    // Настройки определения языка
    detection: {
      // Порядок определения языка:
      // 1. localStorage
      // 2. navigator (браузер)
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'], // Сохранять выбор в localStorage
      lookupLocalStorage: 'i18nextLng',
    },

    interpolation: {
      escapeValue: false // React уже экранирует значения
    },

    // Для разработки
    debug: false
  });

export default i18n;

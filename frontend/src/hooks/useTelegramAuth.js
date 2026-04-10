import { useEffect, useState } from 'react';
import { authApi } from '../lib/api';
import { getStoredAuth, setStoredAuth } from '../lib/authStorage';

/**
 * Хук для автоматической авторизации через Telegram Mini App
 * Использует Telegram WebApp API для получения данных пользователя
 * 
 * Supabase has been removed. Auth is now handled via authApi.telegramAuth().
 */
export const useTelegramAuth = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTelegramApp, setIsTelegramApp] = useState(false);

  useEffect(() => {
    const initTelegramAuth = async () => {
      try {
        // Проверяем, запущено ли приложение в Telegram
        const tg = window.Telegram?.WebApp;

        if (!tg) {
          console.log('Не Telegram Mini App, пропускаем автоматическую авторизацию');
          setIsLoading(false);
          return;
        }

        setIsTelegramApp(true);

        // Инициализируем Telegram WebApp
        tg.ready();

        // Получаем данные пользователя из initDataUnsafe
        const user = tg.initDataUnsafe?.user;

        if (!user) {
          console.log('Данные пользователя Telegram недоступны');
          setIsLoading(false);
          return;
        }

        console.log('Telegram Mini App: обнаружен пользователь', user);

        // Проверяем, авторизован ли пользователь уже (есть JWT токен)
        const auth = getStoredAuth();
        if (auth?.access_token) {
          console.log('Пользователь уже авторизован');
          setIsLoading(false);
          return;
        }

        // Выполняем авторизацию через Telegram
        await authenticateTelegramUser(user, tg);

      } catch (err) {
        console.error('Ошибка инициализации Telegram авторизации:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    initTelegramAuth();
  }, []);

  return { isLoading, error, isTelegramApp };
};

/**
 * Авторизация/регистрация пользователя через Telegram Mini App
 * Отправляет данные в authApi.telegramAuth() на бэкенд
 */
const authenticateTelegramUser = async (telegramUser, tg) => {
  try {
    const telegramId = telegramUser.id;
    const firstName = telegramUser.first_name;

    console.log('Авторизация Telegram пользователя:', telegramId);

    // Отправляем данные Telegram на бэкенд
    // Бэкенд создаст аккаунт или выполнит вход
    const { data } = await authApi.telegramAuth({
      telegram_id: telegramUser.id,
      first_name: telegramUser.first_name,
      last_name: telegramUser.last_name || '',
      username: telegramUser.username || '',
      language_code: telegramUser.language_code || 'ru',
      photo_url: telegramUser.photo_url || '',
    });

    // Сохраняем токены через shared helper
    if (data.access_token) {
      setStoredAuth({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        user: data.user,
      });
    }

    console.log('Успешная авторизация через Telegram Mini App');

    // Показываем уведомление в Telegram
    tg.showPopup({
      title: 'Добро пожаловать!',
      message: `Привет, ${firstName}! 👋`,
      buttons: [{ type: 'ok' }]
    });

  } catch (err) {
    console.error('Ошибка авторизации через Telegram Mini App:', err);

    // Показываем ошибку пользователю
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.showAlert(`Ошибка авторизации: ${err.message}`);
    }

    throw err;
  }
};

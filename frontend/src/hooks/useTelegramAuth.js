import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Хук для автоматической авторизации через Telegram Mini App
 * Использует Telegram WebApp API для получения данных пользователя
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

        // Проверяем, авторизован ли пользователь уже в Supabase
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          console.log('Пользователь уже авторизован в Supabase');
          setIsLoading(false);
          return;
        }

        // Автоматически авторизуем пользователя
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
 */
const authenticateTelegramUser = async (telegramUser, tg) => {
  try {
    const telegramId = telegramUser.id;
    const firstName = telegramUser.first_name;
    const lastName = telegramUser.last_name || '';
    const username = telegramUser.username || '';
    const languageCode = telegramUser.language_code || 'ru';

    // Получаем фото пользователя (если доступно через WebApp)
    const photoUrl = telegramUser.photo_url || null;

    console.log('Авторизация Telegram пользователя:', telegramId);

    // Проверяем, существует ли пользователь с этим Telegram ID
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, telegram_password')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (profileError && profileError.code !== 'PGRST116') {
      throw profileError;
    }

    if (existingProfile) {
      // Пользователь уже существует - выполняем вход
      console.log('Существующий Telegram пользователь, выполняем вход');

      if (!existingProfile.telegram_password) {
        throw new Error('У пользователя нет сохранённого пароля. Обратитесь к администратору.');
      }

      // Выполняем вход с сохранённым паролем
      const email = `tg${telegramId}@obschiysbor.local`;
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: existingProfile.telegram_password,
      });

      if (signInError) {
        throw signInError;
      }

      console.log('Успешный вход через Telegram Mini App');

      // Показываем уведомление в Telegram
      tg.showPopup({
        title: 'Добро пожаловать!',
        message: `Привет, ${firstName}! 👋`,
        buttons: [{ type: 'ok' }]
      });

      return;
    }

    // Новый пользователь - создаём аккаунт
    console.log('Создание нового Telegram пользователя');

    const email = `tg${telegramId}@obschiysbor.local`;
    const password = Math.random().toString(36).slice(-16) + Math.random().toString(36).slice(-16);
    const fullName = `${firstName} ${lastName}`.trim() || `Пользователь Telegram ${telegramId}`;

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: fullName,
          telegram_id: telegramId,
          telegram_username: username,
          avatar_url: photoUrl,
        }
      }
    });

    if (signUpError) {
      throw signUpError;
    }

    if (!signUpData.user) {
      throw new Error('Не удалось создать пользователя');
    }

    // Обновляем профиль с Telegram ID, паролем и данными
    const updateData = {
      telegram_id: telegramId,
      telegram_password: password,
      telegram_username: username,
    };

    if (photoUrl) {
      updateData.avatar_url = photoUrl;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', signUpData.user.id);

    if (updateError) {
      throw updateError;
    }

    console.log('Новый пользователь создан и авторизован через Telegram Mini App');

    // Показываем приветствие
    tg.showPopup({
      title: 'Добро пожаловать!',
      message: `${firstName}, вы успешно зарегистрированы! 🎉`,
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

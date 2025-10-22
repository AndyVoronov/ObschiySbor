import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import TelegramLoginButton from '../components/TelegramLoginButton';
import RecaptchaWrapper from '../components/RecaptchaWrapper';
import './Auth.css';

const Register = () => {
  const { t } = useTranslation('common');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    city: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState(null);
  const recaptchaRef = useRef(null);
  const { signUp, signInWithProvider } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError(t('auth.errorPasswordMismatch'));
      return;
    }

    if (formData.password.length < 6) {
      setError(t('auth.errorPasswordTooShort'));
      return;
    }

    // Проверка reCAPTCHA (только если ключ настроен)
    const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
    if (recaptchaSiteKey && !recaptchaToken) {
      setError(t('auth.errorRecaptcha'));
      return;
    }

    setLoading(true);

    try {
      await signUp(formData.email, formData.password, {
        full_name: formData.fullName,
        city: formData.city,
      });
      navigate('/');
    } catch (error) {
      setError(t('auth.errorRegistration') + error.message);
      console.error('Ошибка регистрации:', error.message);
      // Сбрасываем reCAPTCHA при ошибке
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
        setRecaptchaToken(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTelegramAuth = async (telegramUser) => {
    try {
      console.log('Telegram User Data:', telegramUser);

      const telegramId = telegramUser.id;
      const firstName = telegramUser.first_name;
      const lastName = telegramUser.last_name || '';
      const username = telegramUser.username || '';
      const photoUrl = telegramUser.photo_url || null;

      // Проверяем, существует ли пользователь с этим Telegram ID
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, telegram_password')
        .eq('telegram_id', telegramId)
        .maybeSingle();

      console.log('Existing Telegram profile:', existingProfile, 'Error:', profileError);

      if (existingProfile) {
        // Пользователь уже существует - выполняем вход
        console.log('Пользователь с Telegram ID уже существует, выполняем вход');

        if (!existingProfile.telegram_password) {
          console.error('У существующего Telegram пользователя нет сохранённого пароля');
          setError('Это старый Telegram аккаунт без сохранённого пароля. Обратитесь к администратору.');
          return;
        }

        // Выполняем вход с сохранённым паролем
        const email = `tg${telegramId}@obschiysbor.local`;
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: email,
          password: existingProfile.telegram_password,
        });

        if (signInError) {
          console.error('Sign In Error:', signInError);
          setError('Аккаунт с этим Telegram уже существует. Пожалуйста, используйте страницу входа.');
          return;
        }

        console.log('Успешный вход через Telegram:', signInData);
        navigate('/');
        return;
      }

      // Новый пользователь - создаём аккаунт
      const email = `tg${telegramId}@obschiysbor.local`;
      const password = Math.random().toString(36).slice(-16) + Math.random().toString(36).slice(-16);
      const fullName = `${firstName} ${lastName}`.trim() || `Пользователь Telegram ${telegramId}`;

      console.log('Creating new Telegram user with email:', email, 'name:', fullName);

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
        console.error('SignUp Error:', signUpError);
        throw signUpError;
      }

      console.log('Telegram user created:', signUpData);

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
        console.error('Update Profile Error:', updateError);
        throw updateError;
      }

      console.log('Telegram ID and user data updated in profile');
      navigate('/');
    } catch (err) {
      console.error('Ошибка Telegram регистрации:', err);
      setError(`Не удалось создать аккаунт через Telegram: ${err.message}`);
    }
  };

  // Инициализация VK ID SDK для регистрации
  useEffect(() => {
    // Проверяем, не загружен ли уже скрипт
    if (window.VKIDSDK) {
      initVKID();
      return;
    }

    // Проверяем, не добавляем ли уже скрипт
    const existingScript = document.querySelector('script[src*="vkid/sdk"]');
    if (existingScript) {
      existingScript.addEventListener('load', initVKID);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@vkid/sdk@<3.0.0/dist-sdk/umd/index.js';
    script.async = true;
    script.onload = initVKID;
    document.head.appendChild(script);
  }, []);

  const initVKID = () => {
    if (!window.VKIDSDK) return;

    const VKID = window.VKIDSDK;

    // Определяем redirect URL в зависимости от окружения
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const redirectUrl = isLocalhost
      ? 'http://localhost:5173/'
      : 'https://obschiy-sbor.vercel.app/';

    console.log('VK ID Redirect URL:', redirectUrl);

    VKID.Config.init({
      app: 54212508,
      redirectUrl: redirectUrl,
      responseMode: VKID.ConfigResponseMode.Callback,
      source: VKID.ConfigSource.LOWCODE,
    });

    const oneTap = new VKID.OneTap();
    const container = document.getElementById('vk-auth-container-register');

    if (container && !container.hasChildNodes()) {
      oneTap.render({
        container: container,
        showAlternativeLogin: false,
      })
      .on(VKID.WidgetEvents.ERROR, (error) => {
        console.error('VK ID Error:', error);
        setError('Ошибка при регистрации через ВКонтакте');
      })
      .on(VKID.OneTapInternalEvents.LOGIN_SUCCESS, async (payload) => {
        try {
          const code = payload.code;
          const deviceId = payload.device_id;

          const authData = await VKID.Auth.exchangeCode(code, deviceId);
          await handleVKAuth(authData);
        } catch (err) {
          console.error('Ошибка обмена кода VK:', err);
          setError('Не удалось выполнить регистрацию через ВКонтакте');
        }
      });
    }
  };

  const handleVKAuth = async (vkAuthData) => {
    try {
      console.log('VK Auth Data:', vkAuthData);

      const vkUserId = vkAuthData.user_id;
      const accessToken = vkAuthData.access_token;

      if (!vkUserId || !accessToken) {
        throw new Error('Не удалось получить VK ID или access token');
      }

      console.log('VK User ID:', vkUserId);

      // Получаем данные пользователя через VK API (используем JSONP для обхода CORS)
      let vkUserData = null;
      try {
        // Создаём promise для JSONP запроса
        const fetchVKUser = () => {
          return new Promise((resolve, reject) => {
            const callbackName = `vkCallback_${Date.now()}`;
            const script = document.createElement('script');

            // Устанавливаем глобальный callback
            window[callbackName] = (data) => {
              delete window[callbackName];
              document.body.removeChild(script);
              resolve(data);
            };

            // Обработка ошибок
            script.onerror = () => {
              delete window[callbackName];
              document.body.removeChild(script);
              reject(new Error('JSONP request failed'));
            };

            // Создаём URL с callback параметром
            const vkApiUrl = `https://api.vk.com/method/users.get?user_ids=${vkUserId}&fields=photo_200&access_token=${accessToken}&v=5.131&callback=${callbackName}`;
            script.src = vkApiUrl;
            document.body.appendChild(script);
          });
        };

        const data = await fetchVKUser();
        console.log('VK API Response:', data);

        if (data.response && data.response[0]) {
          const userData = data.response[0];
          vkUserData = {
            first_name: userData.first_name || '',
            last_name: userData.last_name || '',
            photo_200: userData.photo_200 || null,
          };
          console.log('VK User Data from API:', vkUserData);
        }
      } catch (apiError) {
        console.error('Ошибка получения данных из VK API:', apiError);
      }

      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, vk_password')
        .eq('vk_id', vkUserId)
        .maybeSingle(); // Используем maybeSingle() вместо single() чтобы не было ошибки если записи нет

      console.log('Existing profile:', existingProfile, 'Error:', profileError);

      if (existingProfile) {
        // Пользователь уже существует - обновляем данные и выполняем вход
        console.log('Пользователь с VK ID уже существует, обновляем данные и выполняем вход');

        // Обновляем имя и фото из VK API при каждом входе
        if (vkUserData) {
          const fullName = `${vkUserData.first_name} ${vkUserData.last_name}`;
          const updateData = {
            full_name: fullName,
          };
          if (vkUserData.photo_200) {
            updateData.avatar_url = vkUserData.photo_200;
          }

          const { error: updateError } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', existingProfile.id);

          if (updateError) {
            console.error('Update Profile Error:', updateError);
          } else {
            console.log('Профиль обновлён:', updateData);
          }
        }

        // Проверяем, есть ли сохранённый пароль
        if (!existingProfile.vk_password) {
          console.error('У существующего VK пользователя нет сохранённого пароля');
          setError('Это старый VK аккаунт без сохранённого пароля. Обратитесь к администратору или используйте восстановление пароля.');
          return;
        }

        // Выполняем вход с сохранённым паролем
        const email = `vk${vkUserId}@obschiysbor.local`;
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: email,
          password: existingProfile.vk_password,
        });

        if (signInError) {
          console.error('Sign In Error:', signInError);
          setError('Аккаунт с этим VK уже существует. Пожалуйста, используйте страницу входа.');
          return;
        }

        console.log('Успешный вход через VK:', signInData);
        // Принудительная перезагрузка для обновления данных профиля
        window.location.href = '/';
        return;
      }

      const email = `vk${vkUserId}@obschiysbor.local`;
      const password = Math.random().toString(36).slice(-16) + Math.random().toString(36).slice(-16);

      // Используем реальное имя из VK если получили, иначе базовое
      const fullName = vkUserData
        ? `${vkUserData.first_name} ${vkUserData.last_name}`
        : `Пользователь VK ${vkUserId}`;

      console.log('Creating new user with email:', email, 'name:', fullName);

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: fullName,
            vk_id: vkUserId,
            avatar_url: vkUserData?.photo_200 || null,
          }
        }
      });

      if (signUpError) {
        console.error('SignUp Error:', signUpError);
        throw signUpError;
      }

      console.log('User created:', signUpData);

      if (!signUpData.user) {
        throw new Error('Не удалось создать пользователя');
      }

      // Обновляем профиль с VK ID, паролем и данными
      const updateData = {
        vk_id: vkUserId,
        vk_password: password  // Сохраняем пароль для последующих входов
      };
      if (vkUserData?.photo_200) {
        updateData.avatar_url = vkUserData.photo_200;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', signUpData.user.id);

      if (updateError) {
        console.error('Update Profile Error:', updateError);
        throw updateError;
      }

      console.log('VK ID and user data updated in profile');
      // Принудительная перезагрузка для обновления данных профиля
      window.location.href = '/';
    } catch (err) {
      console.error('Ошибка VK регистрации:', err);
      setError(`Не удалось создать аккаунт через ВКонтакте: ${err.message}`);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{t('auth.registerTitle')}</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="fullName">{t('auth.fullName')}</label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">{t('auth.email')}</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="city">{t('auth.city')}</label>
            <input
              type="text"
              id="city"
              name="city"
              value={formData.city}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">{t('auth.password')}</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">{t('auth.confirmPassword')}</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          {/* reCAPTCHA */}
          <div className="form-group" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <RecaptchaWrapper
              ref={recaptchaRef}
              onChange={(token) => setRecaptchaToken(token)}
              onExpired={() => setRecaptchaToken(null)}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? t('auth.registering') : t('auth.registerButton')}
          </button>
        </form>

        <div className="divider">
          <span>{t('auth.or')}</span>
        </div>

        <div className="social-login">
          <div id="vk-auth-container-register"></div>
          <TelegramLoginButton
            botUsername="ObschiySbor_bot"
            onAuth={handleTelegramAuth}
            buttonSize="large"
            cornerRadius={10}
          />
        </div>

        <p className="auth-link">
          {t('auth.haveAccount')} <Link to="/login">{t('auth.loginLink')}</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;

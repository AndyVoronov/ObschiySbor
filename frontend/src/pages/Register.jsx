import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../lib/api';
import TelegramLoginButton from '../components/TelegramLoginButton';
import RecaptchaWrapper from '../components/RecaptchaWrapper';
import ReferralCodeInput from '../components/ReferralCodeInput';
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
  const [referralCode, setReferralCode] = useState('');
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
      // Реферальный код передаётся в тело запроса — бэкенд сам его обработает
      const registerPayload = {
        email: formData.email,
        password: formData.password,
        full_name: formData.fullName,
        city: formData.city,
      };
      if (referralCode) {
        registerPayload.referral_code = referralCode;
      }

      const { data, error: signUpError } = await authApi.register(registerPayload);

      if (signUpError) throw signUpError;

      // Сохраняем токены в localStorage (backend возвращает access_token, refresh_token, user)
      if (data?.access_token) {
        localStorage.setItem('obschiysbor_auth', JSON.stringify({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          user: data.user,
          saved_at: Date.now(),
        }));
      }

      navigate('/');
    } catch (error) {
      const message = error.response?.data?.detail || error.message;
      setError(t('auth.errorRegistration') + message);
      console.error('Ошибка регистрации:', message);
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

      const formData = new FormData();
      formData.append('telegram_id', telegramUser.id);
      formData.append('first_name', telegramUser.first_name || '');
      formData.append('last_name', telegramUser.last_name || '');
      formData.append('username', telegramUser.username || '');
      formData.append('photo_url', telegramUser.photo_url || '');

      const { data } = await authApi.telegramAuth(formData);
      localStorage.setItem('obschiysbor_auth', JSON.stringify({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        user: data.user,
        saved_at: Date.now(),
      }));
      window.location.href = '/';
    } catch (err) {
      console.error('Ошибка Telegram регистрации:', err);
      const message = err.response?.data?.detail || err.message;
      setError(`Не удалось создать аккаунт через Telegram: ${message}`);
    }
  };

  // VK ID allowed domains (configured in VK Developer Console)
  const VK_ALLOWED_DOMAINS = [
    'obschiy-sbor.vercel.app',
    'www.obschiy-sbor.vercel.app',
    'localhost',
    '127.0.0.1',
  ];
  const isVKAllowed = VK_ALLOWED_DOMAINS.some(d => window.location.hostname === d || window.location.hostname.endsWith('.' + d));
  const [vkAvailable] = useState(isVKAllowed);

  // Инициализация VK ID SDK для регистрации (только на разрешённых доменах)
  useEffect(() => {
    if (!vkAvailable) return;

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
    script.onerror = () => console.warn('VK ID SDK не удалось загрузить');
    script.onload = initVKID;
    document.head.appendChild(script);
  }, [vkAvailable]);

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
      let first_name = '';
      let last_name = '';
      let photoUrl = '';
      let gender = '';

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

            // Создаём URL с callback параметром (добавляем sex в fields)
            const vkApiUrl = `https://api.vk.com/method/users.get?user_ids=${vkUserId}&fields=photo_200,sex&access_token=${accessToken}&v=5.131&callback=${callbackName}`;
            script.src = vkApiUrl;
            document.body.appendChild(script);
          });
        };

        const data = await fetchVKUser();
        console.log('VK API Response:', data);

        if (data.response && data.response[0]) {
          const userData = data.response[0];

          // Конвертируем VK пол (1 = женский, 2 = мужской, 0 = не указано) в наш формат
          if (userData.sex === 1) {
            gender = 'female';
          } else if (userData.sex === 2) {
            gender = 'male';
          }

          first_name = userData.first_name || '';
          last_name = userData.last_name || '';
          photoUrl = userData.photo_200 || '';
          console.log('VK User Data from API:', { first_name, last_name, photoUrl, gender });
        }
      } catch (apiError) {
        console.error('Ошибка получения данных из VK API:', apiError);
      }

      // Отправляем всё на бэкенд — он сам решит, создать нового пользователя или войти
      const formData = new FormData();
      formData.append('vk_user_id', vkUserId);
      formData.append('access_token', accessToken);
      formData.append('first_name', first_name);
      formData.append('last_name', last_name);
      formData.append('photo_url', photoUrl);
      formData.append('gender', gender);

      const { data } = await authApi.vkAuth(formData);
      localStorage.setItem('obschiysbor_auth', JSON.stringify({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        user: data.user,
        saved_at: Date.now(),
      }));
      window.location.href = '/';
    } catch (err) {
      console.error('Ошибка VK регистрации:', err);
      const message = err.response?.data?.detail || err.message;
      setError(`Не удалось создать аккаунт через ВКонтакте: ${message}`);
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

          <ReferralCodeInput onCodeChange={setReferralCode} />
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
          {vkAvailable ? (
            <div id="vk-auth-container-register"></div>
          ) : (
            <div className="social-btn-disabled" title="VK ID будет доступен после настройки домена">
              <span className="social-btn-icon">VK</span>
              <span className="social-btn-text">ВКонтакте (временно недоступен)</span>
            </div>
          )}
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

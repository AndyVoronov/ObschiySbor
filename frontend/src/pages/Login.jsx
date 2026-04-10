import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../lib/api';
import TelegramLoginButton from '../components/TelegramLoginButton';
import './Auth.css';

const Login = () => {
  const { t } = useTranslation('common');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      navigate('/');
    } catch (error) {
      setError(t('auth.errorInvalidCredentials'));
      console.error('Ошибка входа:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTelegramAuth = async (telegramUser) => {
    try {
      const formData = new FormData();
      formData.append('telegram_id', telegramUser.id);
      formData.append('first_name', telegramUser.first_name || '');
      formData.append('last_name', telegramUser.last_name || '');
      formData.append('username', telegramUser.username || '');
      formData.append('photo_url', telegramUser.photo_url || '');

      const { data } = await authApi.telegramAuth(formData);
      const authData = { access_token: data.access_token, refresh_token: data.refresh_token, user: data.user };
      localStorage.setItem('obschiysbor_auth', JSON.stringify({ ...authData, saved_at: Date.now() }));
      window.location.href = '/';
    } catch (err) {
      console.error('Ошибка Telegram аутентификации:', err);
      setError(`Не удалось войти через Telegram: ${err.response?.data?.detail || err.message}`);
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

  // Инициализация VK ID SDK (только на разрешённых доменах)
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
      : 'http://89.111.154.208/';

    console.log('VK ID Redirect URL:', redirectUrl);

    VKID.Config.init({
      app: 54212508,
      redirectUrl: redirectUrl,
      responseMode: VKID.ConfigResponseMode.Callback,
      source: VKID.ConfigSource.LOWCODE,
    });

    const oneTap = new VKID.OneTap();
    const container = document.getElementById('vk-auth-container');

    if (container && !container.hasChildNodes()) {
      oneTap.render({
        container: container,
        showAlternativeLogin: false,
      })
      .on(VKID.WidgetEvents.ERROR, (error) => {
        console.error('VK ID Error:', error);
        setError('Ошибка при входе через ВКонтакте');
      })
      .on(VKID.OneTapInternalEvents.LOGIN_SUCCESS, async (payload) => {
        try {
          const code = payload.code;
          const deviceId = payload.device_id;

          const authData = await VKID.Auth.exchangeCode(code, deviceId);
          await handleVKAuth(authData);
        } catch (err) {
          console.error('Ошибка обмена кода VK:', err);
          setError('Не удалось выполнить вход через ВКонтакте');
        }
      });
    }
  };

  const handleVKAuth = async (vkAuthData) => {
    try {
      const vkUserId = vkAuthData.user_id;
      const accessToken = vkAuthData.access_token;

      if (!vkUserId || !accessToken) {
        throw new Error('Не удалось получить VK ID или access token');
      }

      // Получаем данные пользователя через VK API (JSONP для обхода CORS)
      let vkUserData = null;
      try {
        const fetchVKUser = () => {
          return new Promise((resolve, reject) => {
            const callbackName = `vkCallback_${Date.now()}`;
            const script = document.createElement('script');
            window[callbackName] = (data) => {
              delete window[callbackName];
              document.body.removeChild(script);
              resolve(data);
            };
            script.onerror = () => {
              delete window[callbackName];
              document.body.removeChild(script);
              reject(new Error('JSONP request failed'));
            };
            const vkApiUrl = `https://api.vk.com/method/users.get?user_ids=${vkUserId}&fields=photo_200,sex&access_token=${accessToken}&v=5.131&callback=${callbackName}`;
            script.src = vkApiUrl;
            document.body.appendChild(script);
          });
        };

        const data = await fetchVKUser();
        if (data.response && data.response[0]) {
          const userData = data.response[0];
          let gender = null;
          if (userData.sex === 1) gender = 'female';
          else if (userData.sex === 2) gender = 'male';

          vkUserData = {
            first_name: userData.first_name || '',
            last_name: userData.last_name || '',
            photo_200: userData.photo_200 || null,
            gender: gender,
          };
        }
      } catch (apiError) {
        console.error('Ошибка получения данных из VK API:', apiError);
      }

      // Вызываем наш backend
      const formData = new FormData();
      formData.append('vk_user_id', vkUserId);
      formData.append('access_token', accessToken);
      formData.append('first_name', vkUserData?.first_name || '');
      formData.append('last_name', vkUserData?.last_name || '');
      formData.append('photo_url', vkUserData?.photo_200 || '');
      formData.append('gender', vkUserData?.gender || '');

      const { data } = await authApi.vkAuth(formData);
      const authData = { access_token: data.access_token, refresh_token: data.refresh_token, user: data.user };
      localStorage.setItem('obschiysbor_auth', JSON.stringify({ ...authData, saved_at: Date.now() }));
      window.location.href = '/';
    } catch (err) {
      console.error('Ошибка VK аутентификации:', err);
      setError(`Не удалось создать аккаунт через ВКонтакте: ${err.response?.data?.detail || err.message}`);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{t('auth.loginTitleShort')}</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">{t('auth.email')}</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">{t('auth.password')}</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? t('auth.loggingIn') : t('auth.loginButton')}
          </button>
        </form>

        <div className="divider">
          <span>{t('auth.or')}</span>
        </div>

        <div className="social-login">
          {vkAvailable ? (
            <div id="vk-auth-container"></div>
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
          {t('auth.noAccount')} <Link to="/register">{t('auth.signupLink')}</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;

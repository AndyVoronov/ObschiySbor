import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import './Auth.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signInWithProvider } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      navigate('/');
    } catch (error) {
      setError('Неверный email или пароль');
      console.error('Ошибка входа:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    try {
      await signInWithProvider(provider);
    } catch (error) {
      setError(`Ошибка входа через ${provider}`);
      console.error('Ошибка социального входа:', error.message);
    }
  };

  // Инициализация VK ID SDK
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

    // Используем production URL для работы с VK
    const redirectUrl = 'https://obschiy-sbor.vercel.app/';

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
      // Получаем информацию о пользователе VK
      const vkUser = vkAuthData.user;

      // Проверяем, существует ли пользователь в Supabase
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('vk_id', vkUser.id)
        .single();

      if (existingProfile) {
        // Пользователь существует - входим через custom token
        // Это потребует Supabase Edge Function для генерации JWT
        // Пока просто показываем успех
        navigate('/');
      } else {
        // Новый пользователь - создаём аккаунт
        const email = vkUser.email || `vk${vkUser.id}@obschiysbor.local`;

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email,
          password: Math.random().toString(36).slice(-16), // Генерируем случайный пароль
          options: {
            data: {
              full_name: `${vkUser.first_name} ${vkUser.last_name}`,
              avatar_url: vkUser.avatar,
              vk_id: vkUser.id,
            }
          }
        });

        if (signUpError) throw signUpError;

        // Обновляем профиль с VK ID
        await supabase
          .from('profiles')
          .update({ vk_id: vkUser.id })
          .eq('id', signUpData.user.id);

        navigate('/');
      }
    } catch (err) {
      console.error('Ошибка VK аутентификации:', err);
      setError('Не удалось создать аккаунт через ВКонтакте');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Вход в систему</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Пароль</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <div className="divider">
          <span>или</span>
        </div>

        <div className="social-login">
          <div id="vk-auth-container"></div>
          <button
            className="btn btn-social btn-telegram"
            onClick={() => handleSocialLogin('telegram')}
          >
            Войти через Telegram
          </button>
        </div>

        <p className="auth-link">
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;

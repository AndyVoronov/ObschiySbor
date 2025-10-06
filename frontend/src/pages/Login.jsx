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
      console.log('VK Auth Data:', vkAuthData);

      // Получаем информацию о пользователе VK
      const vkUser = vkAuthData.user;

      if (!vkUser || !vkUser.id) {
        throw new Error('Не удалось получить данные пользователя VK');
      }

      console.log('VK User:', vkUser);

      // Проверяем, существует ли пользователь в Supabase
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_id')
        .eq('vk_id', vkUser.id)
        .single();

      console.log('Existing profile:', existingProfile, 'Error:', profileError);

      if (existingProfile) {
        // Пользователь уже существует
        // Для полноценного входа нужна Edge Function для создания сессии
        console.log('Пользователь с VK ID уже существует');
        setError('Вход для существующих VK пользователей временно недоступен. Используйте email/пароль.');
        return;
      }

      // Новый пользователь - создаём аккаунт
      const email = vkUser.email || `vk${vkUser.id}@obschiysbor.local`;
      const password = Math.random().toString(36).slice(-16) + Math.random().toString(36).slice(-16);

      console.log('Creating new user with email:', email);

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: `${vkUser.first_name} ${vkUser.last_name}`,
            avatar_url: vkUser.avatar,
            vk_id: vkUser.id,
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

      // Обновляем профиль с VK ID
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ vk_id: vkUser.id })
        .eq('id', signUpData.user.id);

      if (updateError) {
        console.error('Update Profile Error:', updateError);
        throw updateError;
      }

      console.log('VK ID updated in profile');
      navigate('/');
    } catch (err) {
      console.error('Ошибка VK аутентификации:', err);
      setError(`Не удалось создать аккаунт через ВКонтакте: ${err.message}`);
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

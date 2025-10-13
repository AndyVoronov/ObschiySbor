import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import './Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    city: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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
      setError('Пароли не совпадают');
      return;
    }

    if (formData.password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
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
      setError('Ошибка регистрации: ' + error.message);
      console.error('Ошибка регистрации:', error.message);
    } finally {
      setLoading(false);
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

      // Получаем реальные данные пользователя из VK через Edge Function
      let vkUserData = null;
      try {
        const { data: edgeFunctionData, error: edgeFunctionError } = await supabase.functions.invoke('vk-get-user', {
          body: { user_id: vkUserId, access_token: accessToken }
        });

        if (edgeFunctionError) {
          console.error('Edge Function Error:', edgeFunctionError);
          throw edgeFunctionError;
        }

        vkUserData = edgeFunctionData;
        console.log('VK User Data from API:', vkUserData);
      } catch (apiError) {
        console.error('Не удалось получить данные из VK API:', apiError);
        // Продолжаем с базовыми данными если Edge Function не доступна
      }

      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_id, vk_password')
        .eq('vk_id', vkUserId)
        .maybeSingle(); // Используем maybeSingle() вместо single() чтобы не было ошибки если записи нет

      console.log('Existing profile:', existingProfile, 'Error:', profileError);

      if (existingProfile) {
        // Пользователь уже существует - перенаправляем на вход
        console.log('Пользователь с VK ID уже существует, выполняем вход');

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
        navigate('/');
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
      navigate('/');
    } catch (err) {
      console.error('Ошибка VK регистрации:', err);
      setError(`Не удалось создать аккаунт через ВКонтакте: ${err.message}`);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Регистрация</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="fullName">Полное имя</label>
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
            <label htmlFor="email">Email</label>
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
            <label htmlFor="city">Город</label>
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
            <label htmlFor="password">Пароль</label>
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
            <label htmlFor="confirmPassword">Подтвердите пароль</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>

        <div className="divider">
          <span>или</span>
        </div>

        <div className="social-login">
          <div id="vk-auth-container-register"></div>
          <button
            className="btn btn-social btn-telegram"
            onClick={() => signInWithProvider('telegram')}
          >
            Войти через Telegram
          </button>
        </div>

        <p className="auth-link">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;

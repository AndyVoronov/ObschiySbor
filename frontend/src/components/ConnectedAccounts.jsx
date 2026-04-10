import { useState, useEffect } from 'react';
import { profilesApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import './ConnectedAccounts.css';

const ConnectedAccounts = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const response = await profilesApi.getMe();
      setProfile(response.data || null);
    } catch (err) {
      console.error('Ошибка загрузки профиля:', err);
      setError('Не удалось загрузить информацию о подключенных аккаунтах');
    } finally {
      setLoading(false);
    }
  };

  const getProviderName = (provider) => {
    const providers = {
      vk: 'ВКонтакте',
      telegram: 'Telegram',
      email: 'Email'
    };
    return providers[provider] || provider;
  };

  const getProviderIcon = (provider) => {
    const icons = {
      vk: '🔷',
      telegram: '✈️',
      email: '✉️'
    };
    return icons[provider] || '🔗';
  };

  // Build list of connected providers from profile fields
  const getConnectedProviders = () => {
    if (!profile) return [];

    const providers = [];

    // Email is always connected (base auth)
    providers.push({
      provider: 'email',
      identity_data: {
        email: profile.email || user?.email,
      },
      canUnlink: false,
    });

    // VK ID connected if profile has vk_id
    if (profile.vk_id) {
      providers.push({
        provider: 'vk',
        identity_data: {
          full_name: profile.full_name || '',
        },
        canUnlink: false, // VK can only be connected at first login
      });
    }

    // Telegram connected if profile has telegram_id
    if (profile.telegram_id) {
      providers.push({
        provider: 'telegram',
        identity_data: {
          full_name: profile.full_name || '',
        },
        canUnlink: false,
      });
    }

    return providers;
  };

  const connectedProviders = getConnectedProviders();

  if (loading) {
    return <div className="connected-accounts-loading">Загрузка...</div>;
  }

  return (
    <div className="connected-accounts">
      <h3>Подключенные аккаунты</h3>

      {error && <div className="error-message">{error}</div>}

      <div className="accounts-section">
        <h4>Текущие подключения:</h4>
        {connectedProviders.length === 0 ? (
          <p className="no-accounts">Нет подключенных аккаунтов</p>
        ) : (
          <div className="accounts-list">
            {connectedProviders.map((item) => (
              <div key={item.provider} className="account-item">
                <div className="account-info">
                  <span className="account-icon">{getProviderIcon(item.provider)}</span>
                  <div className="account-details">
                    <span className="account-provider">{getProviderName(item.provider)}</span>
                    {item.identity_data?.email && (
                      <span className="account-email">{item.identity_data.email}</span>
                    )}
                    {item.identity_data?.full_name && (
                      <span className="account-name">{item.identity_data.full_name}</span>
                    )}
                  </div>
                </div>
                <span className="account-connected-badge">✓ Подключено</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="accounts-section">
        <h4>Добавить новый способ входа:</h4>
        <div className="available-providers">
          <p className="info-text">
            ℹ️ ВКонтакте и Telegram подключаются при первом входе через соответствующую кнопку авторизации.
            Управление привязанными аккаунтами через эту страницу будет доступно в будущих обновлениях.
          </p>
        </div>
      </div>

      <div className="accounts-info">
        <p>
          ℹ️ Вы можете войти через VK или Telegram, используя соответствующие кнопки на странице входа.
          Если аккаунт с таким email/ID уже существует, он будет автоматически привязан.
        </p>
        <p className="warning">
          ⚠️ Отвязка аккаунтов в данный момент недоступна. Обратитесь к администратору, если вам нужно отвязать аккаунт.
        </p>
      </div>
    </div>
  );
};

export default ConnectedAccounts;

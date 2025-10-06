import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import './ConnectedAccounts.css';

const ConnectedAccounts = () => {
  const { user } = useAuth();
  const [identities, setIdentities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) {
      loadIdentities();
    }
  }, [user]);

  const loadIdentities = async () => {
    try {
      // Получаем данные пользователя с информацией о подключенных провайдерах
      const { data: { user: userData }, error } = await supabase.auth.getUser();

      if (error) throw error;

      setIdentities(userData?.identities || []);
    } catch (err) {
      console.error('Ошибка загрузки подключенных аккаунтов:', err);
      setError('Не удалось загрузить информацию о подключенных аккаунтах');
    } finally {
      setLoading(false);
    }
  };

  const linkProvider = async (provider) => {
    setError('');
    setSuccess('');

    try {
      const { data, error } = await supabase.auth.linkIdentity({
        provider: provider,
      });

      if (error) throw error;

      setSuccess(`Аккаунт ${provider} успешно привязан!`);
      // Обновляем список после привязки
      setTimeout(() => {
        loadIdentities();
        setSuccess('');
      }, 2000);
    } catch (err) {
      console.error('Ошибка привязки аккаунта:', err);
      setError(`Не удалось привязать аккаунт ${provider}: ${err.message}`);
    }
  };

  const unlinkProvider = async (identity) => {
    if (!window.confirm(`Вы уверены, что хотите отвязать аккаунт ${identity.provider}?`)) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const { error } = await supabase.auth.unlinkIdentity(identity);

      if (error) throw error;

      setSuccess(`Аккаунт ${identity.provider} успешно отвязан!`);
      loadIdentities();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error('Ошибка отвязки аккаунта:', err);
      setError(`Не удалось отвязать аккаунт: ${err.message}`);
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

  const availableProviders = ['telegram'];
  const connectedProviders = identities.map(id => id.provider);

  if (loading) {
    return <div className="connected-accounts-loading">Загрузка...</div>;
  }

  return (
    <div className="connected-accounts">
      <h3>Подключенные аккаунты</h3>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="accounts-section">
        <h4>Текущие подключения:</h4>
        {identities.length === 0 ? (
          <p className="no-accounts">Нет подключенных аккаунтов</p>
        ) : (
          <div className="accounts-list">
            {identities.map((identity) => (
              <div key={identity.id} className="account-item">
                <div className="account-info">
                  <span className="account-icon">{getProviderIcon(identity.provider)}</span>
                  <div className="account-details">
                    <span className="account-provider">{getProviderName(identity.provider)}</span>
                    {identity.identity_data?.email && (
                      <span className="account-email">{identity.identity_data.email}</span>
                    )}
                    {identity.identity_data?.full_name && (
                      <span className="account-name">{identity.identity_data.full_name}</span>
                    )}
                  </div>
                </div>
                {identities.length > 1 && identity.provider !== 'email' && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => unlinkProvider(identity)}
                  >
                    Отвязать
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="accounts-section">
        <h4>Добавить новый способ входа:</h4>
        <div className="available-providers">
          <p className="info-text">
            ℹ️ ВКонтакте можно подключить только при первом входе/регистрации.
            Дополнительные способы входа будут доступны в будущих обновлениях.
          </p>
          {availableProviders.map((provider) => {
            const isConnected = connectedProviders.includes(provider);
            return (
              <button
                key={provider}
                className={`btn btn-provider btn-${provider}`}
                onClick={() => linkProvider(provider)}
                disabled={isConnected}
              >
                <span className="provider-icon">{getProviderIcon(provider)}</span>
                <span className="provider-name">
                  {isConnected ? `✓ ${getProviderName(provider)}` : `Подключить ${getProviderName(provider)}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="accounts-info">
        <p>
          ℹ️ Вы можете подключить несколько способов входа к одному аккаунту.
          Это позволит вам входить в систему любым удобным способом.
        </p>
        <p className="warning">
          ⚠️ У вас должен остаться хотя бы один способ входа.
          Нельзя отвязать последний подключенный аккаунт.
        </p>
      </div>
    </div>
  );
};

export default ConnectedAccounts;

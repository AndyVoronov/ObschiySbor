import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import './ReferralPanel.css';

/**
 * Панель реферальной программы - отображает код, статистику и список рефералов
 */
const ReferralPanel = ({ userId }) => {
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [copyStatus, setCopyStatus] = useState('');

  useEffect(() => {
    if (userId) {
      loadReferralData();
    }
  }, [userId]);

  const loadReferralData = async () => {
    try {
      setLoading(true);

      // Загружаем профиль с реферальным кодом
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('referral_code, total_referrals, referral_bonus_earned')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Загружаем список рефералов
      const { data: referralsData, error: referralsError } = await supabase
        .from('referrals')
        .select(`
          *,
          referred:profiles!referrals_referred_id_fkey (
            id,
            full_name,
            avatar_url,
            created_at
          )
        `)
        .eq('referrer_id', userId)
        .order('created_at', { ascending: false });

      if (referralsError) throw referralsError;
      setReferrals(referralsData || []);

      // Загружаем настройки наград
      const { data: rewardsData, error: rewardsError } = await supabase
        .from('referral_rewards')
        .select('*')
        .eq('is_active', true)
        .order('referrer_reward', { ascending: true });

      if (rewardsError) throw rewardsError;
      setRewards(rewardsData || []);

    } catch (error) {
      console.error('Ошибка загрузки реферальных данных:', error);
    } finally {
      setLoading(false);
    }
  };

  const getReferralLink = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/register?ref=${profile?.referral_code}`;
  };

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(type);
      setTimeout(() => setCopyStatus(''), 2000);
    } catch (error) {
      console.error('Ошибка копирования:', error);
    }
  };

  const shareViaMessenger = (messenger) => {
    const link = getReferralLink();
    const text = `${t('referral.inviteText')}: ${profile.referral_code}`;

    let url = '';
    switch (messenger) {
      case 'telegram':
        url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
        break;
      case 'vk':
        url = `https://vk.com/share.php?url=${encodeURIComponent(link)}&title=${encodeURIComponent(text)}`;
        break;
      case 'whatsapp':
        url = `https://wa.me/?text=${encodeURIComponent(`${text} ${link}`)}`;
        break;
      default:
        return;
    }

    window.open(url, '_blank');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'status-completed';
      case 'active':
        return 'status-active';
      case 'pending':
      default:
        return 'status-pending';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getActiveReferralsCount = () => {
    return referrals.filter(r => r.status === 'active' || r.status === 'completed').length;
  };

  if (loading) {
    return (
      <div className="referral-panel loading">
        <div className="loading-spinner"></div>
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="referral-panel error">
        <p>{t('common.error')}</p>
      </div>
    );
  }

  return (
    <div className="referral-panel">

      {/* Заголовок */}
      <div className="referral-header">
        <h2>{t('referral.title')}</h2>
        <p className="referral-subtitle">{t('referral.subtitle')}</p>
      </div>

      {/* Реферальный код */}
      <div className="referral-code-section">
        <h3>{t('referral.yourCode')}</h3>
        <div className="referral-code-box">
          <div className="referral-code">{profile.referral_code}</div>
          <div className="referral-code-actions">
            <button
              className="btn-copy"
              onClick={() => copyToClipboard(profile.referral_code, 'code')}
            >
              {copyStatus === 'code' ? '✓ ' + t('referral.codeCopied') : t('referral.copyCode')}
            </button>
            <button
              className="btn-copy"
              onClick={() => copyToClipboard(getReferralLink(), 'link')}
            >
              {copyStatus === 'link' ? '✓ ' + t('referral.linkCopied') : t('referral.copyLink')}
            </button>
          </div>
        </div>

        {/* Кнопки поделиться */}
        <div className="share-buttons">
          <button className="btn-share telegram" onClick={() => shareViaMessenger('telegram')}>
            <span className="icon">📱</span>
            Telegram
          </button>
          <button className="btn-share vk" onClick={() => shareViaMessenger('vk')}>
            <span className="icon">📘</span>
            VK
          </button>
          <button className="btn-share whatsapp" onClick={() => shareViaMessenger('whatsapp')}>
            <span className="icon">💬</span>
            WhatsApp
          </button>
        </div>
      </div>

      {/* Статистика */}
      <div className="referral-stats">
        <h3>{t('referral.stats')}</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-icon">👥</span>
            <div className="stat-content">
              <span className="stat-value">{profile.total_referrals}</span>
              <span className="stat-label">{t('referral.totalReferrals')}</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">✓</span>
            <div className="stat-content">
              <span className="stat-value">{getActiveReferralsCount()}</span>
              <span className="stat-label">{t('referral.activeReferrals')}</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🎁</span>
            <div className="stat-content">
              <span className="stat-value">{profile.referral_bonus_earned}</span>
              <span className="stat-label">{t('referral.bonusEarned')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Как это работает */}
      <div className="how-it-works">
        <h3>{t('referral.howItWorks')}</h3>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <h4>{t('referral.step1Title')}</h4>
            <p>{t('referral.step1Text')}</p>
          </div>
          <div className="step-card">
            <div className="step-number">2</div>
            <h4>{t('referral.step2Title')}</h4>
            <p>{t('referral.step2Text')}</p>
          </div>
          <div className="step-card">
            <div className="step-number">3</div>
            <h4>{t('referral.step3Title')}</h4>
            <p>{t('referral.step3Text')}</p>
          </div>
        </div>
      </div>

      {/* Награды */}
      <div className="referral-rewards">
        <h3>{t('referral.rewards')}</h3>
        <div className="rewards-table">
          <div className="rewards-header">
            <div className="reward-name">Действие</div>
            <div className="reward-amount">{t('referral.forYou')}</div>
            <div className="reward-amount">{t('referral.forFriend')}</div>
          </div>
          {rewards.map((reward) => (
            <div key={reward.id} className="reward-row">
              <div className="reward-name">{reward.name_ru}</div>
              <div className="reward-amount reward-you">
                +{reward.referrer_reward} XP
              </div>
              <div className="reward-amount reward-friend">
                +{reward.referred_reward} XP
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Список рефералов */}
      <div className="referrals-list">
        <h3>{t('referral.referralsList')}</h3>
        {referrals.length > 0 ? (
          <div className="referrals-table">
            {referrals.map((referral) => (
              <div key={referral.id} className="referral-item">
                <div className="referral-user">
                  {referral.referred?.avatar_url ? (
                    <img
                      src={referral.referred.avatar_url}
                      alt={referral.referred.full_name || 'User'}
                      className="referral-avatar"
                    />
                  ) : (
                    <div className="referral-avatar-placeholder">
                      {(referral.referred?.full_name || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="referral-info">
                    <span className="referral-name">
                      {referral.referred?.full_name || t('referral.userName')}
                    </span>
                    <span className="referral-date">
                      {t('referral.registered')}: {formatDate(referral.created_at)}
                    </span>
                  </div>
                </div>
                <div className="referral-status-info">
                  <span className={`referral-status ${getStatusColor(referral.status)}`}>
                    {t(`referral.${referral.status}`)}
                  </span>
                  {referral.bonus_paid && (
                    <span className="bonus-badge">
                      +{referral.bonus_amount} XP
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-referrals">
            <p className="no-data">{t('referral.noReferrals')}</p>
            <p className="invite-text">{t('referral.inviteNow')}</p>
          </div>
        )}
      </div>

    </div>
  );
};

ReferralPanel.propTypes = {
  userId: PropTypes.string.isRequired,
};

export default ReferralPanel;

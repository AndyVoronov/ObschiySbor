import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import { supabase } from '../lib/supabase';
import './GamificationPanel.css';

/**
 * Панель геймификации - отображает уровень, опыт, статистику и достижения пользователя
 */
const GamificationPanel = ({ userId }) => {
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [currentLevel, setCurrentLevel] = useState(null);
  const [nextLevel, setNextLevel] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [showAllActivity, setShowAllActivity] = useState(false);

  useEffect(() => {
    if (userId) {
      loadGamificationData();
    }
  }, [userId]);

  const loadGamificationData = async () => {
    try {
      setLoading(true);

      // Загружаем профиль с данными геймификации
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Загружаем информацию о текущем уровне
      const { data: levelData, error: levelError } = await supabase
        .from('levels')
        .select('*')
        .eq('level', profileData.level)
        .single();

      if (levelError) throw levelError;
      setCurrentLevel(levelData);

      // Загружаем информацию о следующем уровне
      const { data: nextLevelData } = await supabase
        .from('levels')
        .select('*')
        .eq('level', profileData.level + 1)
        .single();

      setNextLevel(nextLevelData);

      // Загружаем разблокированные достижения
      const { data: achievementsData, error: achievementsError } = await supabase
        .from('user_achievements')
        .select(`
          *,
          achievements (*)
        `)
        .eq('user_id', userId)
        .eq('is_unlocked', true)
        .order('unlocked_at', { ascending: false });

      if (achievementsError) throw achievementsError;
      setAchievements(achievementsData || []);

      // Загружаем недавнюю активность (последние 10 записей)
      const { data: activityData, error: activityError } = await supabase
        .from('experience_log')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (activityError) throw activityError;
      setRecentActivity(activityData || []);

    } catch (error) {
      console.error('Ошибка загрузки данных геймификации:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateLevelProgress = () => {
    if (!profile || !currentLevel || !nextLevel) return 0;

    const currentExp = profile.experience_points - currentLevel.min_experience;
    const requiredExp = nextLevel.min_experience - currentLevel.min_experience;

    return Math.min((currentExp / requiredExp) * 100, 100);
  };

  const getRemainingExpForNextLevel = () => {
    if (!profile || !nextLevel) return 0;
    return Math.max(nextLevel.min_experience - profile.experience_points, 0);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRarityClass = (rarity) => {
    return `rarity-${rarity || 'common'}`;
  };

  if (loading) {
    return (
      <div className="gamification-panel loading">
        <div className="loading-spinner"></div>
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="gamification-panel error">
        <p>{t('common.error')}</p>
      </div>
    );
  }

  const displayedActivity = showAllActivity ? recentActivity : recentActivity.slice(0, 5);

  return (
    <div className="gamification-panel">

      {/* Секция уровня и опыта */}
      <div className="level-section">
        <div className="level-info">
          <div className="level-badge" style={{ backgroundColor: currentLevel?.color }}>
            <span className="level-icon">{currentLevel?.icon}</span>
            <div className="level-text">
              <span className="level-label">{t('gamification.level')}</span>
              <span className="level-number">{profile.level}</span>
            </div>
          </div>
          <div className="level-name">
            <h2>{t(`gamification.levels.${profile.level}`)}</h2>
            <p className="experience-count">
              {profile.experience_points} {t('gamification.experiencePoints')}
            </p>
          </div>
        </div>

        {nextLevel && (
          <div className="experience-progress">
            <div className="progress-header">
              <span>{t('gamification.nextLevel')}</span>
              <span className="exp-remaining">
                {getRemainingExpForNextLevel()} XP
              </span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${calculateLevelProgress()}%` }}
              ></div>
            </div>
            <div className="next-level-info">
              <span>{t(`gamification.levels.${nextLevel.level}`)}</span>
              <span>{nextLevel.min_experience} XP</span>
            </div>
          </div>
        )}

        {/* Привилегии уровня */}
        {currentLevel?.perks && currentLevel.perks.length > 0 && (
          <div className="level-perks">
            <h3>{t('gamification.perks')}</h3>
            <ul>
              {currentLevel.perks.map((perk, index) => (
                <li key={index}>
                  <span className="perk-icon">✓</span>
                  <span>{perk}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Статистика */}
      <div className="stats-section">
        <h3>{t('gamification.stats')}</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-icon">📅</span>
            <div className="stat-content">
              <span className="stat-value">{profile.total_events_created}</span>
              <span className="stat-label">{t('gamification.eventsCreated')}</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🎉</span>
            <div className="stat-content">
              <span className="stat-value">{profile.total_events_participated}</span>
              <span className="stat-label">{t('gamification.eventsParticipated')}</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">⭐</span>
            <div className="stat-content">
              <span className="stat-value">{profile.total_reviews_given}</span>
              <span className="stat-label">{t('gamification.reviewsGiven')}</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">📆</span>
            <div className="stat-content">
              <span className="stat-value">{formatDate(profile.member_since || profile.created_at)}</span>
              <span className="stat-label">{t('gamification.memberSince')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Достижения */}
      <div className="achievements-section">
        <h3>
          {t('gamification.achievements')}
          <span className="achievement-count">({achievements.length})</span>
        </h3>
        {achievements.length > 0 ? (
          <div className="achievements-grid">
            {achievements.map((userAchievement) => {
              const achievement = userAchievement.achievements;
              return (
                <div
                  key={userAchievement.id}
                  className={`achievement-card ${getRarityClass(achievement.rarity)}`}
                  title={achievement.description_ru}
                >
                  <div className="achievement-icon">{achievement.icon}</div>
                  <div className="achievement-info">
                    <h4>{achievement.name_ru}</h4>
                    <p className="achievement-description">{achievement.description_ru}</p>
                    <div className="achievement-meta">
                      <span className="achievement-rarity">
                        {t(`gamification.rarity.${achievement.rarity}`)}
                      </span>
                      {achievement.points_reward > 0 && (
                        <span className="achievement-points">+{achievement.points_reward} XP</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="no-data">{t('gamification.noAchievements')}</p>
        )}
      </div>

      {/* Недавняя активность */}
      <div className="activity-section">
        <h3>{t('gamification.recentActivity')}</h3>
        {recentActivity.length > 0 ? (
          <>
            <div className="activity-list">
              {displayedActivity.map((activity) => (
                <div key={activity.id} className={`activity-item ${activity.points >= 0 ? 'positive' : 'negative'}`}>
                  <div className="activity-info">
                    <span className="activity-reason">
                      {t(`gamification.reasons.${activity.reason}`) || activity.reason}
                    </span>
                    {activity.description && (
                      <span className="activity-description">{activity.description}</span>
                    )}
                  </div>
                  <div className="activity-meta">
                    <span className={`activity-points ${activity.points >= 0 ? 'positive' : 'negative'}`}>
                      {activity.points >= 0 ? '+' : ''}{activity.points} XP
                    </span>
                    <span className="activity-date">{formatDateTime(activity.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
            {recentActivity.length > 5 && (
              <button
                className="btn-view-all"
                onClick={() => setShowAllActivity(!showAllActivity)}
              >
                {showAllActivity ? t('gamification.showLess') : t('gamification.viewAll')}
              </button>
            )}
          </>
        ) : (
          <p className="no-data">{t('gamification.noActivity')}</p>
        )}
      </div>
    </div>
  );
};

GamificationPanel.propTypes = {
  userId: PropTypes.string.isRequired,
};

export default GamificationPanel;

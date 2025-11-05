import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import { supabase } from '../lib/supabase';
import './GamificationPanel.css';

/**
 * Панель геймификации - отображает уровень, опыт, статистику и достижения пользователя
 */
const GamificationPanel = ({ userId }) => {
  const { t, i18n } = useTranslation('common');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [currentLevel, setCurrentLevel] = useState(null);
  const [nextLevel, setNextLevel] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);

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

      // Загружаем ВСЕ достижения
      const { data: allAchievementsData, error: allAchievementsError } = await supabase
        .from('achievements')
        .select('*')
        .eq('is_active', true)
        .order('rarity', { ascending: true }); // сначала common, потом rare

      if (allAchievementsError) throw allAchievementsError;

      // Загружаем прогресс пользователя по достижениям
      const { data: userProgressData, error: userProgressError } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId);

      if (userProgressError) throw userProgressError;

      // Объединяем данные: для каждого достижения добавляем прогресс пользователя
      const achievementsWithProgress = allAchievementsData.map(achievement => {
        const userProgress = userProgressData?.find(up => up.achievement_id === achievement.id);
        return {
          achievement,
          progress: userProgress?.progress || 0,
          target: userProgress?.target || achievement.requirement?.target || 1,
          is_unlocked: userProgress?.is_unlocked || false,
          unlocked_at: userProgress?.unlocked_at || null,
        };
      });

      setAchievements(achievementsWithProgress || []);

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

  // Achievement text translations
  const getAchievementTexts = () => {
    const isEnglish = i18n.language === 'en';
    return {
      unlocked: isEnglish ? 'Achievement unlocked:' : 'Достижение разблокировано:',
      eventCreated: isEnglish ? 'Event created' : 'Создание события',
      participated: isEnglish ? 'Participated in event' : 'Участие в событии',
      review: isEnglish ? 'Review for event' : 'Отзыв о событии',
      positiveReview: isEnglish ? 'Received positive review' : 'Получен положительный отзыв',
      friendInvited: isEnglish ? 'Friend invited' : 'Приглашение друга'
    };
  };

  const extractAchievementKey = (description) => {
    const match = description.match(/Достижение разблокировано:\s*(\w+)/);
    return match ? match[1] : null;
  };

  const findAchievementByKey = (key) => {
    return achievements.find(a =>
      a.achievement?.key === key ||
      a.achievement?.id === key ||
      a.achievement?.achievement_key === key
    );
  };

  const formatKeyName = (key) => {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getAchievementName = (description) => {
    const achievementKey = extractAchievementKey(description);
    if (!achievementKey) return description;

    // Try to find the achievement in loaded data
    const achievement = findAchievementByKey(achievementKey);
    if (achievement?.achievement) {
      return i18n.language === 'en' ? achievement.achievement.name_en : achievement.achievement.name_ru;
    }

    // Special case for first_event
    if (achievementKey === 'first_event') {
      return i18n.language === 'en' ? 'First Event Created' : 'Первое событие создано';
    }

    // Fallback to formatted key
    return formatKeyName(achievementKey);
  };

  const getFormattedDescription = (description) => {
    const texts = getAchievementTexts();

    // Handle achievement descriptions
    if (description.includes('Достижение разблокировано:')) {
      return `${texts.unlocked} ${getAchievementName(description)}`;
    }

    // Handle event creation descriptions
    if (description.includes('Создание события:')) {
      const eventName = description.replace('Создание события:', '').trim();
      if (eventName && eventName !== 'аыва') {
        return `${texts.eventCreated}: ${eventName}`;
      }
      return texts.eventCreated;
    }

    // Handle participation descriptions
    if (description.includes('Участие в событии:')) {
      const eventName = description.replace('Участие в событии:', '').trim();
      if (eventName) {
        return `${texts.participated}: ${eventName}`;
      }
      return texts.participated;
    }

    // Handle review descriptions
    if (description.includes('Отзыв о событии:')) {
      const eventName = description.replace('Отзыв о событии:', '').trim();
      if (eventName) {
        return `${texts.review}: ${eventName}`;
      }
      return texts.review;
    }

    // Handle phrase replacements
    const phraseReplacements = {
      'Создание события': texts.eventCreated,
      'Участие в событии': texts.participated,
      'Отзыв о событии': texts.review,
      'Получен положительный отзыв': texts.positiveReview,
      'Приглашение друга': texts.friendInvited
    };

    for (const [russian, english] of Object.entries(phraseReplacements)) {
      if (description.includes(russian)) {
        return description.replace(russian, english);
      }
    }

    // Handle gamification translation keys
    if (description.includes('gamification.')) {
      const keyMatch = description.match(/gamification\.[\w.]+/);
      if (keyMatch) {
        const translation = t(keyMatch[0]);
        if (translation !== keyMatch[0]) {
          return description.replace(keyMatch[0], translation);
        }
      }
    }

    return description;
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

  
  
      {/* Достижения */}
      <div className="achievements-section">
        <div className="section-header-with-toggle">
          <h3>
            {t('gamification.achievements')}
            <span className="achievement-count">
              ({achievements.filter(a => a.is_unlocked).length}/{achievements.length})
            </span>
          </h3>
          <button
            className="toggle-button"
            onClick={() => setShowAchievements(!showAchievements)}
          >
            {showAchievements ? '▼' : '▶'} {showAchievements ? t('gamification.hideAchievements') : t('gamification.showAchievements')}
          </button>
        </div>
        {showAchievements && achievements.length > 0 ? (
          <div className="achievements-grid">
            {achievements.map((achievementData) => {
              const achievement = achievementData.achievement;
              const isUnlocked = achievementData.is_unlocked;
              const progress = achievementData.progress;
              const target = achievementData.target;
              const progressPercent = target > 0 ? Math.min((progress / target) * 100, 100) : 0;

              return (
                <div
                  key={achievement.id}
                  className={`achievement-card ${getRarityClass(achievement.rarity)} ${!isUnlocked ? 'locked' : ''}`}
                  title={achievement.description_ru}
                >
                  <div className={`achievement-icon ${!isUnlocked ? 'grayscale' : ''}`}>
                    {achievement.icon}
                  </div>
                  <div className="achievement-info">
                    <h4>{i18n.language === 'en' ? achievement.name_en : achievement.name_ru}</h4>
                    <p className="achievement-description">{i18n.language === 'en' ? achievement.description_en : achievement.description_ru}</p>

                    {/* Прогресс-бар для незаблокированных достижений */}
                    {!isUnlocked && (
                      <div className="achievement-progress">
                        <div className="progress-bar-container">
                          <div
                            className="progress-bar-fill"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <span className="progress-text">
                          {progress}/{target}
                        </span>
                      </div>
                    )}

                    <div className="achievement-meta">
                      <span className="achievement-rarity">
                        {t(`gamification.rarity.${achievement.rarity}`)}
                      </span>
                      {achievement.points_reward > 0 && (
                        <span className="achievement-points">+{achievement.points_reward} XP</span>
                      )}
                      {isUnlocked && achievementData.unlocked_at && (
                        <span className="achievement-unlocked">✓ {t('gamification.unlocked')}</span>
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
                      <span className="activity-description">
                        {getFormattedDescription(activity.description)}
                      </span>
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

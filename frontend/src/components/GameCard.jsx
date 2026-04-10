import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { profilesApi, gamificationApi } from '../lib/api';
import PropTypes from 'prop-types';
import './GameCard.css';

const GameCard = ({ userId, onEdit, onLogout }) => {
  const { t, i18n } = useTranslation('common');
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadUserData();
    }
  }, [userId]);

  const loadUserData = async () => {
    try {
      setLoading(true);

      // Загружаем профиль пользователя и статистику параллельно
      const [profileRes, statsRes, gamificationRes] = await Promise.all([
        profilesApi.getById(userId),
        profilesApi.getStats(userId),
        gamificationApi.get(userId),
      ]);

      const profile = profileRes.data;

      if (!profile) {
        console.error('Профиль не найден в базе данных для пользователя:', userId);
        return;
      }

      const stats = statsRes.data || {};
      const gamification = gamificationRes.data || {};

      setUserData({
        profile,
        eventsCreated: stats.events_created || stats.eventsCreated || 0,
        eventsAttended: stats.events_attended || stats.eventsAttended || 0,
        reviewsCount: stats.reviews_count || stats.reviewsCount || 0,
        friendsCount: stats.friends_count || stats.friendsCount || 0,
        achievementsUnlocked: gamification.achievements_unlocked || gamification.achievementsUnlocked || 0,
        totalAchievements: gamification.total_achievements || gamification.totalAchievements || 0,
        currentLevel: gamification.current_level || gamification.currentLevel || null,
        nextLevel: gamification.next_level || gamification.nextLevel || null,
        registrationDate: profile.created_at,
      });

    } catch (error) {
      console.error('Ошибка загрузки данных пользователя:', error);
    } finally {
      setLoading(false);
    }
  };

  // Utility functions
  const getScaleMax = (value) => {
    const scales = [5, 20, 100, 1000, 5000];
    return scales.find(scale => value <= scale) || 5000;
  };

  const getPercentage = (value, max) => {
    return Math.min((value / max) * 100, 100);
  };

  const getGenderLabel = (gender) => {
    const labels = {
      male: `👨 ${t('profile.male')}`,
      female: `👩 ${t('profile.female')}`,
      other: `⚧️ ${t('profile.other')}`
    };
    return labels[gender] || `❓ ${t('profile.notSpecified')}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Неизвестно';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return 'Ошибка даты';
    }
  };

  const handleLogoutClick = () => {
    console.log('Logout button clicked');
    if (window.confirm(t('profile.confirmLogout'))) {
      console.log('Logout confirmed, calling onLogout()');
      onLogout();
    } else {
      console.log('Logout cancelled');
    }
  };

  // Состояние для переворачивания карты
  const [isFlipped, setIsFlipped] = useState(false);
  const [currentAbility, setCurrentAbility] = useState('attack');

  const handleCardFlip = (e) => {
    // Проверяем, был ли клик по кнопке - если да, не переворачиваем карту
    if (e.target.closest('button')) {
      return;
    }

    // Если клик по вкладке способностей, не переворачиваем карту
    if (e.target.closest('.ability-tab')) {
      return;
    }

    // Переворачиваем карту
    setIsFlipped(!isFlipped);
  };

  const handleTabClick = (abilityType) => {
    console.log(`Ability tab clicked: ${abilityType}`);

    // Обработка специальных кнопок
    if (abilityType === 'slam') {
      console.log('Edit profile button clicked');
      if (typeof onEdit === 'function') {
        onEdit();
      }
      return;
    }

    if (abilityType === 'meteor') {
      console.log('Logout button clicked');
      handleLogoutClick();
      return;
    }

    // Переключение вкладок для обычных способностей
    setCurrentAbility(abilityType);
  };

  if (loading) {
    return (
      <div className="card-container">
        <div className="game-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          {t('common.loading')}
        </div>
      </div>
    );
  }

  if (!userData) {
    return null;
  }

  const { profile, eventsCreated, eventsAttended, reviewsCount, friendsCount, achievementsUnlocked, totalAchievements, currentLevel, nextLevel } = userData;

  const eventsCreatedMax = getScaleMax(eventsCreated);
  const eventsAttendedMax = getScaleMax(eventsAttended);
  const reviewsMax = getScaleMax(reviewsCount);
  const friendsMax = getScaleMax(friendsCount);

  // Правильный расчёт XP: текущий опыт минус минимум текущего уровня
  const currentXP = currentLevel ? profile.experience_points - currentLevel.min_experience : profile.experience_points;
  const nextLevelXP = nextLevel && currentLevel ? nextLevel.min_experience - currentLevel.min_experience : 100;
  const xpPercentage = getPercentage(currentXP, nextLevelXP);

  return (
    <div className={`card-container ${isFlipped ? 'flipped' : ''}`} onClick={handleCardFlip}>
      <div className="game-card">
        <div className="card-flip-inner">
          {/* FRONT SIDE */}
          <div className="card-front">
            <div className="glass-blocker"></div>
            <div className="card-glow"></div>

            <div className="card-frame">
              <div className="level-xp-bar">
                <div className="level-section">
                  <span className="level-number">{t('gamification.levelShort')}{profile.level}</span>
                </div>
                <div className="xp-section">
                  <div className="xp-fill" style={{ width: `${xpPercentage}%` }}></div>
                  <div className="xp-text">
                    <span className="xp-text-full">{currentXP} / {nextLevelXP} {t('gamification.experience')}</span>
                    <span className="xp-text-short">{currentXP}/{nextLevelXP}</span>
                  </div>
                </div>
              </div>

              <div className="card-art">
                <div className="art-placeholder">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'transparent', borderRadius: '8px' }}>
                      <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
                        <div style={{ fontSize: '60px', marginBottom: '8px' }}>👤</div>
                        <div>{t('profile.uploadAvatar')}</div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="art-frame"></div>
              </div>

              <div className="card-name">
                <h2>{profile.full_name || t('profile.noNameProvided')}</h2>
              </div>

              <div className="card-description">
                <div className="description-bg"></div>
                <p>{profile.interests || t('profile.aboutMe') || 'Этот загадочный пользователь пока не указал свои интересы...'}</p>
              </div>

              <div className="card-stats">
                <div className="stat-bar hp" title={`Посещено событий: ${eventsAttended} из ${eventsAttendedMax}`}>
                  <div className="stat-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor" style={{ color: 'rgba(248, 113, 113, 0.9)' }}>
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  </div>
                  <div className="stat-fill-section">
                    <div className="stat-fill hp-fill" style={{ width: `${getPercentage(eventsAttended, eventsAttendedMax)}%` }}></div>
                    <div className="stat-text">{eventsAttended} / {eventsAttendedMax}</div>
                  </div>
                </div>
                <div className="stat-bar mana" title={`Количество друзей: ${friendsCount} из ${friendsMax}`}>
                  <div className="stat-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor" style={{ color: 'rgba(96, 165, 250, 0.9)' }}>
                      <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
                      <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" transform="rotate(45 12 9)"/>
                    </svg>
                  </div>
                  <div className="stat-fill-section">
                    <div className="stat-fill mana-fill" style={{ width: `${getPercentage(friendsCount, friendsMax)}%` }}></div>
                    <div className="stat-text">{friendsCount} / {friendsMax}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-decoration top"></div>
            <div className="border-decoration bottom"></div>
            <div className="border-decoration left"></div>
            <div className="border-decoration right"></div>
          </div>

          {/* BACK SIDE */}
          <div className="card-back">
            <div className="glass-blocker"></div>
            <div className="card-glow"></div>

            <div className="card-frame">
              <div className="level-xp-bar">
                <div className="level-section">
                  <span className="level-number">{t('gamification.levelShort')}{profile.level}</span>
                </div>
                <div className="xp-section">
                  <div className="xp-fill" style={{ width: `${xpPercentage}%` }}></div>
                  <div className="xp-text">
                    <span className="xp-text-full">{currentXP} / {nextLevelXP} {t('gamification.experience')}</span>
                    <span className="xp-text-short">{currentXP}/{nextLevelXP}</span>
                  </div>
                </div>
              </div>

              {/* Ability Selector Tabs */}
              <div className="ability-selector">
                <div className={`ability-tab ${currentAbility === 'attack' ? 'active' : ''}`} data-ability="attack" onClick={() => handleTabClick('attack')}>⚔️</div>
                <div className={`ability-tab ${currentAbility === 'frost' ? 'active' : ''}`} data-ability="frost" onClick={() => handleTabClick('frost')}>👤</div>
                <div className={`ability-tab ${currentAbility === 'slam' ? 'active' : ''}`} data-ability="slam" onClick={() => handleTabClick('slam')}>✏️</div>
                <div className={`ability-tab ${currentAbility === 'meteor' ? 'active' : ''}`} data-ability="meteor" onClick={() => handleTabClick('meteor')}>🚪</div>
              </div>

              {/* Ability Content Area */}
              <div className="ability-content">
                {/* Attack Spell - Events Created */}
                <div className={`ability ${currentAbility === 'attack' ? 'active' : ''}`} data-ability="attack">
                  <div className="ability-art">
                    <div className="ability-art-placeholder">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', borderRadius: '8px', background: 'transparent' }}>
                          <div style={{ textAlign: 'center', color: 'rgba(249,115,22,0.6)', fontSize: '12px' }}>
                            <div style={{ fontSize: '30px', marginBottom: '8px' }}>👤</div>
                            <div>Фото</div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="ability-art-frame"></div>
                    <div className="ability-cost">{eventsCreated} {t('dashboard.totalEvents')}</div>
                  </div>

                  <div className="ability-info">
                    <div className="ability-info-bg"></div>
                    <div className="ability-header">
                      <div className="ability-name">{t('gamification.stats.eventsCreated')}</div>
                      <div className="ability-progression">
                        <svg className={`ability-level ${eventsCreated >= 1 ? 'active' : 'inactive'}`} viewBox="0 0 32 32">
                          <circle cx="16" cy="16" r="14" fill={eventsCreated >= 1 ? 'rgba(255, 193, 7, 0.3)' : 'rgba(139, 69, 19, 0.2)'} stroke={eventsCreated >= 1 ? 'rgba(255, 193, 7, 0.9)' : 'rgba(139, 69, 19, 0.5)'} strokeWidth="2"/>
                          <circle cx="16" cy="16" r="12" fill={eventsCreated >= 1 ? 'rgba(255, 193, 7, 0.1)' : 'rgba(139, 69, 19, 0.1)'} stroke={eventsCreated >= 1 ? 'rgba(255, 193, 7, 0.7)' : 'rgba(139, 69, 19, 0.3)'} strokeWidth="1"/>
                          <text x="16" y="20" textAnchor="middle" fill={eventsCreated >= 1 ? 'rgba(255, 193, 7, 1)' : 'rgba(139, 69, 19, 0.7)'} fontSize="12" fontWeight="bold" fontFamily="serif">I</text>
                        </svg>
                        <svg className={`ability-level ${eventsCreated >= 5 ? 'active' : 'inactive'}`} viewBox="0 0 32 32">
                          <circle cx="16" cy="16" r="14" fill={eventsCreated >= 5 ? 'rgba(255, 193, 7, 0.3)' : 'rgba(139, 69, 19, 0.2)'} stroke={eventsCreated >= 5 ? 'rgba(255, 193, 7, 0.9)' : 'rgba(139, 69, 19, 0.5)'} strokeWidth="2"/>
                          <circle cx="16" cy="16" r="12" fill={eventsCreated >= 5 ? 'rgba(255, 193, 7, 0.1)' : 'rgba(139, 69, 19, 0.1)'} stroke={eventsCreated >= 5 ? 'rgba(255, 193, 7, 0.7)' : 'rgba(139, 69, 19, 0.3)'} strokeWidth="1"/>
                          <text x="16" y="20" textAnchor="middle" fill={eventsCreated >= 5 ? 'rgba(255, 193, 7, 1)' : 'rgba(139, 69, 19, 0.7)'} fontSize="11" fontWeight="bold" fontFamily="serif">II</text>
                        </svg>
                        <svg className={`ability-level ${eventsCreated >= 20 ? 'active' : 'inactive'}`} viewBox="0 0 32 32">
                          <circle cx="16" cy="16" r="14" fill={eventsCreated >= 20 ? 'rgba(255, 193, 7, 0.3)' : 'rgba(139, 69, 19, 0.2)'} stroke={eventsCreated >= 20 ? 'rgba(255, 193, 7, 0.9)' : 'rgba(139, 69, 19, 0.5)'} strokeWidth="2"/>
                          <circle cx="16" cy="16" r="12" fill={eventsCreated >= 20 ? 'rgba(255, 193, 7, 0.1)' : 'rgba(139, 69, 19, 0.1)'} stroke={eventsCreated >= 20 ? 'rgba(255, 193, 7, 0.7)' : 'rgba(139, 69, 19, 0.3)'} strokeWidth="1"/>
                          <text x="16" y="20" textAnchor="middle" fill={eventsCreated >= 20 ? 'rgba(255, 193, 7, 1)' : 'rgba(139, 69, 19, 0.7)'} fontSize="10" fontWeight="bold" fontFamily="serif">III</text>
                        </svg>
                      </div>
                    </div>
                    <div className="ability-description">
                      {t('gameCard.eventsCreatorDesc')}: {eventsCreated}. {t('gameCard.eventsCreatorEncouragement')}
                    </div>
                  </div>
                </div>

                {/* Frost - Profile Info (Gender & Location) */}
                <div className={`ability ${currentAbility === 'frost' ? 'active' : ''}`} data-ability="frost">
                  <div className="ability-art">
                    <div className="ability-art-placeholder">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', borderRadius: '8px', background: 'transparent' }}>
                          <div style={{ textAlign: 'center', color: 'rgba(59,130,246,0.6)', fontSize: '12px' }}>
                            <div style={{ fontSize: '30px', marginBottom: '8px' }}>👤</div>
                            <div>Фото</div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="ability-art-frame"></div>
                    <div className="ability-cost defense-cost">{t('gameCard.personalInfo')}</div>
                  </div>

                  <div className="ability-info">
                    <div className="ability-info-bg"></div>
                    <div className="ability-header">
                      <div className="ability-name">{t('gameCard.personalInfo')}</div>
                      <div className="ability-progression" style={{ display: 'flex', gap: '15px', alignItems: 'center', marginTop: '10px' }}>
                        <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span>{getGenderLabel(profile.gender)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="ability-description">
                      <strong>{t('profile.city')}:</strong> {profile.city ? `📍 ${profile.city}` : `❓ ${t('profile.notSpecified')}`}
                      <br/><br/>
                      <strong>{t('profile.email')}:</strong> {profile.email || t('profile.notSpecified')}
                      <br/><br/>
                      <strong>{i18n.language === 'en' ? 'Member since:' : 'Участник с:'}</strong> 📅 {formatDate(userData.registrationDate)}
                      <br/><br/>
                      {profile.interests && (
                        <>
                          <strong>{t('profile.interests')}:</strong> {profile.interests}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Slam - Edit Button */}
                <div className={`ability ${currentAbility === 'slam' ? 'active' : ''}`} data-ability="slam">
                  <div className="ability-art">
                    <div className="ability-art-placeholder">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', borderRadius: '8px', background: 'transparent' }}>
                          <div style={{ textAlign: 'center', color: 'rgba(168,85,247,0.6)', fontSize: '12px' }}>
                            <div style={{ fontSize: '30px', marginBottom: '8px' }}>👤</div>
                            <div>Фото</div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="ability-art-frame"></div>
                    <div className="ability-cost attack-cost">{t('gameCard.profileSettings')}</div>
                  </div>

                  <div className="ability-info">
                    <div className="ability-info-bg"></div>
                    <div className="ability-header">
                      <div className="ability-name">{t('gameCard.profileEdit')}</div>
                    </div>
                    <div className="ability-description">
                      {t('gameCard.profileEditDescription')}
                      <br/><br/>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('Edit button clicked, calling onEdit()');
                          onEdit();
                        }}
                        className="btn btn-secondary"
                        style={{
                          width: '100%',
                          padding: '12px',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          marginTop: '10px'
                        }}
                      >
                        {t('gameCard.editProfileButton')}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Meteor - Logout Button */}
                <div className={`ability ${currentAbility === 'meteor' ? 'active' : ''}`} data-ability="meteor">
                  <div className="ability-art">
                    <div className="ability-art-placeholder">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', borderRadius: '8px', background: 'transparent' }}>
                          <div style={{ textAlign: 'center', color: 'rgba(239,68,68,0.6)', fontSize: '12px' }}>
                            <div style={{ fontSize: '30px', marginBottom: '8px' }}>👤</div>
                            <div>Фото</div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="ability-art-frame"></div>
                    <div className="ability-cost">{t('nav.logout')}</div>
                  </div>

                  <div className="ability-info">
                    <div className="ability-info-bg"></div>
                    <div className="ability-header">
                      <div className="ability-name">{t('gameCard.logoutTitle')}</div>
                    </div>
                    <div className="ability-description">
                      {t('gameCard.logoutDescription')}
                      <br/><br/>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleLogoutClick(); }}
                        className="btn btn-danger"
                        style={{
                          width: '100%',
                          padding: '12px',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          marginTop: '10px'
                        }}
                      >
                        {t('gameCard.logoutButton')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

  
              <div className="combat-stats">
                <div className="combat-stat attack" title={`Создано событий: ${eventsCreated} из ${eventsCreatedMax}`}>
                  <div className="combat-stat-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor" style={{ color: 'rgba(251, 146, 60, 0.9)' }}>
                      <path d="M12 2l3.09 6.26L22 9l-6.91.74L12 16l-3.09-6.26L2 9l6.91-.74L12 2z"/>
                      <path d="M6 15l2 2 6-6"/>
                    </svg>
                  </div>
                  <div className="combat-stat-fill-section">
                    <div className="combat-stat-fill attack-fill" style={{ width: `${getPercentage(eventsCreated, eventsCreatedMax)}%` }}></div>
                    <div className="combat-stat-text">{eventsCreated} / {eventsCreatedMax}</div>
                  </div>
                </div>
                <div className="combat-stat spell-power" title={`Оставлено отзывов: ${reviewsCount} из ${reviewsMax}`}>
                  <div className="combat-stat-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor" style={{ color: 'rgba(34, 211, 238, 0.9)' }}>
                      <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
                      <path d="M7.5 3.5L9 9L14.5 10.5L9 12L7.5 17.5L6 12L0.5 10.5L6 9L7.5 3.5Z" transform="translate(6,2) scale(0.6)"/>
                    </svg>
                  </div>
                  <div className="combat-stat-fill-section">
                    <div className="combat-stat-fill spell-fill" style={{ width: `${getPercentage(reviewsCount, reviewsMax)}%` }}></div>
                    <div className="combat-stat-text">{reviewsCount} / {reviewsMax}</div>
                  </div>
                </div>
                <div className="combat-stat defense" title={`Достижения: ${achievementsUnlocked} из ${totalAchievements}`}>
                  <div className="combat-stat-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor" style={{ color: 'rgba(74, 222, 128, 0.9)' }}>
                      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                      <path d="M9 12l2 2 4-4" stroke="rgba(0,0,0,0.3)" strokeWidth="1" fill="none"/>
                    </svg>
                  </div>
                  <div className="combat-stat-fill-section">
                    <div className="combat-stat-fill defense-fill" style={{ width: `${getPercentage(achievementsUnlocked, totalAchievements)}%` }}></div>
                    <div className="combat-stat-text">{achievementsUnlocked} / {totalAchievements}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-decoration top"></div>
            <div className="border-decoration bottom"></div>
            <div className="border-decoration left"></div>
            <div className="border-decoration right"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

GameCard.propTypes = {
  userId: PropTypes.string.isRequired,
  onEdit: PropTypes.func.isRequired,
  onLogout: PropTypes.func.isRequired,
};

export default GameCard;

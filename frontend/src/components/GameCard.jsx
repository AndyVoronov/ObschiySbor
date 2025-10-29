import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import PropTypes from 'prop-types';
import './GameCard.css';

const GameCard = ({ userId }) => {
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

      // Загружаем профиль пользователя
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      // Загружаем количество созданных событий
      const { count: eventsCreated, error: eventsError } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', userId);

      if (eventsError) throw eventsError;

      // Загружаем количество посещённых событий
      const { count: eventsAttended, error: attendedError } = await supabase
        .from('event_participants')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (attendedError) throw attendedError;

      // Загружаем количество отзывов
      const { count: reviewsCount, error: reviewsError } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (reviewsError) throw reviewsError;

      // Загружаем количество друзей
      const { count: friendsCount, error: friendsError } = await supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        .eq('status', 'accepted');

      if (friendsError) throw friendsError;

      // Загружаем количество разблокированных достижений
      const { count: achievementsUnlocked, error: achievementsError } = await supabase
        .from('user_achievements')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_unlocked', true);

      if (achievementsError) throw achievementsError;

      // Загружаем общее количество достижений
      const { count: totalAchievements, error: totalAchievementsError } = await supabase
        .from('achievements')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      if (totalAchievementsError) throw totalAchievementsError;

      // Загружаем информацию о текущем и следующем уровне
      const { data: currentLevel } = await supabase
        .from('levels')
        .select('*')
        .eq('level', profile.level)
        .single();

      const { data: nextLevel } = await supabase
        .from('levels')
        .select('*')
        .eq('level', profile.level + 1)
        .single();

      setUserData({
        profile,
        eventsCreated: eventsCreated || 0,
        eventsAttended: eventsAttended || 0,
        reviewsCount: reviewsCount || 0,
        friendsCount: friendsCount || 0,
        achievementsUnlocked: achievementsUnlocked || 0,
        totalAchievements: totalAchievements || 0,
        currentLevel,
        nextLevel,
      });

    } catch (error) {
      console.error('Ошибка загрузки данных пользователя:', error);
    } finally {
      setLoading(false);
    }
  };

  // Функция для определения максимума шкалы
  const getScaleMax = (value) => {
    if (value <= 5) return 5;
    if (value <= 20) return 20;
    if (value <= 100) return 100;
    if (value <= 1000) return 1000;
    return 5000;
  };

  // Функция для расчёта процента заполнения шкалы
  const getPercentage = (value, max) => {
    return Math.min((value / max) * 100, 100);
  };

  useEffect(() => {
    // FlipCard class
    class FlipCard {
      constructor(cardContainer) {
        this.container = cardContainer;
        this.isFlipped = false;
        this.init();
      }

      init() {
        this.addEventListeners();
      }

      addEventListeners() {
        this.container.addEventListener('click', (e) => {
          if (!e.target.closest('.ability-tab')) {
            this.flip();
          }
        });
      }

      flip() {
        this.isFlipped = !this.isFlipped;
        if (this.isFlipped) {
          this.container.classList.add('flipped');
        } else {
          this.container.classList.remove('flipped');
        }
      }
    }

    // AbilitySelector class
    class AbilitySelector {
      constructor() {
        this.currentAbility = 'attack';
        this.init();
      }

      init() {
        this.addEventListeners();
      }

      addEventListeners() {
        const abilityTabs = document.querySelectorAll('.ability-tab');
        abilityTabs.forEach(tab => {
          tab.addEventListener('click', (e) => {
            e.stopPropagation();
            const abilityType = tab.getAttribute('data-ability');
            this.switchAbility(abilityType);
          });
        });
      }

      switchAbility(abilityType) {
        if (abilityType === this.currentAbility) return;

        document.querySelector(`.ability-tab[data-ability="${this.currentAbility}"]`).classList.remove('active');
        document.querySelector(`.ability[data-ability="${this.currentAbility}"]`).classList.remove('active');

        document.querySelector(`.ability-tab[data-ability="${abilityType}"]`).classList.add('active');
        document.querySelector(`.ability[data-ability="${abilityType}"]`).classList.add('active');

        this.currentAbility = abilityType;
      }
    }

    // Initialize
    const cardContainer = document.querySelector('.card-container');
    if (cardContainer) {
      new FlipCard(cardContainer);
      new AbilitySelector();
    }
  }, []);

  if (loading) {
    return (
      <div className="card-container">
        <div className="magical-bg"></div>
        <div className="game-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          Загрузка...
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

  const xpPercentage = nextLevel ? getPercentage(profile.experience_points - currentLevel.min_xp, nextLevel.min_xp - currentLevel.min_xp) : 100;

  return (
    <div className="card-container">
      <div className="magical-bg"></div>

      <div className="game-card">
        <div className="card-flip-inner">
          {/* FRONT SIDE */}
          <div className="card-front">
            <div className="glass-blocker"></div>
            <div className="card-glow"></div>

            <div className="card-frame">
              <div className="level-xp-bar">
                <div className="level-section">
                  <span className="level-number">Lv{profile.level}</span>
                </div>
                <div className="xp-section">
                  <div className="xp-fill" style={{ width: `${xpPercentage}%` }}></div>
                  <div className="xp-text">
                    <span className="xp-text-full">{profile.experience_points} / {nextLevel ? nextLevel.min_xp : '∞'} XP</span>
                    <span className="xp-text-short">{Math.floor(profile.experience_points / 1000)}k/{nextLevel ? Math.floor(nextLevel.min_xp / 1000) : '∞'}k</span>
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
                        <div>Фото профиля</div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="art-frame"></div>
              </div>

              <div className="card-name">
                <h2>{profile.full_name || 'Без имени'}</h2>
              </div>

              <div className="card-description">
                <div className="description-bg"></div>
                <p>{profile.interests || 'Этот загадочный пользователь пока не указал свои интересы...'}</p>
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
                  <span className="level-number">Lv{profile.level}</span>
                </div>
                <div className="xp-section">
                  <div className="xp-fill" style={{ width: `${xpPercentage}%` }}></div>
                  <div className="xp-text">
                    <span className="xp-text-full">{profile.experience_points} / {nextLevel ? nextLevel.min_xp : '∞'} XP</span>
                    <span className="xp-text-short">{Math.floor(profile.experience_points / 1000)}k/{nextLevel ? Math.floor(nextLevel.min_xp / 1000) : '∞'}k</span>
                  </div>
                </div>
              </div>

              {/* Ability Selector Tabs */}
              <div className="ability-selector">
                <div className="ability-tab active" data-ability="attack">⚔️</div>
                <div className="ability-tab" data-ability="frost">🛡️</div>
                <div className="ability-tab" data-ability="slam">🪄</div>
                <div className="ability-tab" data-ability="meteor">☄️</div>
              </div>

              {/* Ability Content Area */}
              <div className="ability-content">
                {/* Attack Spell - Events Created */}
                <div className="ability active" data-ability="attack">
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
                    <div className="ability-cost">{eventsCreated} Created</div>
                  </div>

                  <div className="ability-info">
                    <div className="ability-info-bg"></div>
                    <div className="ability-header">
                      <div className="ability-name">Создатель событий</div>
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
                      Организатор и творец новых приключений. Создано событий: {eventsCreated}. Продолжайте вдохновлять людей на новые встречи и активности!
                    </div>
                  </div>
                </div>

                {/* Frost Shield - Reviews */}
                <div className="ability" data-ability="frost">
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
                    <div className="ability-cost defense-cost">{reviewsCount} Reviews</div>
                  </div>

                  <div className="ability-info">
                    <div className="ability-info-bg"></div>
                    <div className="ability-header">
                      <div className="ability-name">Критик</div>
                      <div className="ability-progression">
                        <svg className={`ability-level ${reviewsCount >= 1 ? 'active' : 'inactive'}`} viewBox="0 0 32 32">
                          <circle cx="16" cy="16" r="14" fill={reviewsCount >= 1 ? 'rgba(255, 193, 7, 0.3)' : 'rgba(139, 69, 19, 0.2)'} stroke={reviewsCount >= 1 ? 'rgba(255, 193, 7, 0.9)' : 'rgba(139, 69, 19, 0.5)'} strokeWidth="2"/>
                          <circle cx="16" cy="16" r="12" fill={reviewsCount >= 1 ? 'rgba(255, 193, 7, 0.1)' : 'rgba(139, 69, 19, 0.1)'} stroke={reviewsCount >= 1 ? 'rgba(255, 193, 7, 0.7)' : 'rgba(139, 69, 19, 0.3)'} strokeWidth="1"/>
                          <text x="16" y="20" textAnchor="middle" fill={reviewsCount >= 1 ? 'rgba(255, 193, 7, 1)' : 'rgba(139, 69, 19, 0.7)'} fontSize="12" fontWeight="bold" fontFamily="serif">I</text>
                        </svg>
                        <svg className={`ability-level ${reviewsCount >= 5 ? 'active' : 'inactive'}`} viewBox="0 0 32 32">
                          <circle cx="16" cy="16" r="14" fill={reviewsCount >= 5 ? 'rgba(255, 193, 7, 0.3)' : 'rgba(139, 69, 19, 0.2)'} stroke={reviewsCount >= 5 ? 'rgba(255, 193, 7, 0.9)' : 'rgba(139, 69, 19, 0.5)'} strokeWidth="2"/>
                          <circle cx="16" cy="16" r="12" fill={reviewsCount >= 5 ? 'rgba(255, 193, 7, 0.1)' : 'rgba(139, 69, 19, 0.1)'} stroke={reviewsCount >= 5 ? 'rgba(255, 193, 7, 0.7)' : 'rgba(139, 69, 19, 0.3)'} strokeWidth="1"/>
                          <text x="16" y="20" textAnchor="middle" fill={reviewsCount >= 5 ? 'rgba(255, 193, 7, 1)' : 'rgba(139, 69, 19, 0.7)'} fontSize="11" fontWeight="bold" fontFamily="serif">II</text>
                        </svg>
                        <svg className={`ability-level ${reviewsCount >= 20 ? 'active' : 'inactive'}`} viewBox="0 0 32 32">
                          <circle cx="16" cy="16" r="14" fill={reviewsCount >= 20 ? 'rgba(255, 193, 7, 0.3)' : 'rgba(139, 69, 19, 0.2)'} stroke={reviewsCount >= 20 ? 'rgba(255, 193, 7, 0.9)' : 'rgba(139, 69, 19, 0.5)'} strokeWidth="2"/>
                          <circle cx="16" cy="16" r="12" fill={reviewsCount >= 20 ? 'rgba(255, 193, 7, 0.1)' : 'rgba(139, 69, 19, 0.1)'} stroke={reviewsCount >= 20 ? 'rgba(255, 193, 7, 0.7)' : 'rgba(139, 69, 19, 0.3)'} strokeWidth="1"/>
                          <text x="16" y="20" textAnchor="middle" fill={reviewsCount >= 20 ? 'rgba(255, 193, 7, 1)' : 'rgba(139, 69, 19, 0.7)'} fontSize="10" fontWeight="bold" fontFamily="serif">III</text>
                        </svg>
                      </div>
                    </div>
                    <div className="ability-description">
                      Ваше мнение важно! Оставлено отзывов: {reviewsCount}. Помогайте другим участникам выбирать лучшие события.
                    </div>
                  </div>
                </div>

                {/* Staff Strike - Achievements */}
                <div className="ability" data-ability="slam">
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
                    <div className="ability-cost attack-cost">{achievementsUnlocked}/{totalAchievements}</div>
                  </div>

                  <div className="ability-info">
                    <div className="ability-info-bg"></div>
                    <div className="ability-header">
                      <div className="ability-name">Коллекционер достижений</div>
                      <div className="ability-progression">
                        <svg className={`ability-level ${achievementsUnlocked >= 1 ? 'active' : 'inactive'}`} viewBox="0 0 32 32">
                          <circle cx="16" cy="16" r="14" fill={achievementsUnlocked >= 1 ? 'rgba(255, 193, 7, 0.3)' : 'rgba(139, 69, 19, 0.2)'} stroke={achievementsUnlocked >= 1 ? 'rgba(255, 193, 7, 0.9)' : 'rgba(139, 69, 19, 0.5)'} strokeWidth="2"/>
                          <circle cx="16" cy="16" r="12" fill={achievementsUnlocked >= 1 ? 'rgba(255, 193, 7, 0.1)' : 'rgba(139, 69, 19, 0.1)'} stroke={achievementsUnlocked >= 1 ? 'rgba(255, 193, 7, 0.7)' : 'rgba(139, 69, 19, 0.3)'} strokeWidth="1"/>
                          <text x="16" y="20" textAnchor="middle" fill={achievementsUnlocked >= 1 ? 'rgba(255, 193, 7, 1)' : 'rgba(139, 69, 19, 0.7)'} fontSize="12" fontWeight="bold" fontFamily="serif">I</text>
                        </svg>
                        <svg className={`ability-level ${achievementsUnlocked >= Math.floor(totalAchievements / 3) ? 'active' : 'inactive'}`} viewBox="0 0 32 32">
                          <circle cx="16" cy="16" r="14" fill={achievementsUnlocked >= Math.floor(totalAchievements / 3) ? 'rgba(255, 193, 7, 0.3)' : 'rgba(139, 69, 19, 0.2)'} stroke={achievementsUnlocked >= Math.floor(totalAchievements / 3) ? 'rgba(255, 193, 7, 0.9)' : 'rgba(139, 69, 19, 0.5)'} strokeWidth="2"/>
                          <circle cx="16" cy="16" r="12" fill={achievementsUnlocked >= Math.floor(totalAchievements / 3) ? 'rgba(255, 193, 7, 0.1)' : 'rgba(139, 69, 19, 0.1)'} stroke={achievementsUnlocked >= Math.floor(totalAchievements / 3) ? 'rgba(255, 193, 7, 0.7)' : 'rgba(139, 69, 19, 0.3)'} strokeWidth="1"/>
                          <text x="16" y="20" textAnchor="middle" fill={achievementsUnlocked >= Math.floor(totalAchievements / 3) ? 'rgba(255, 193, 7, 1)' : 'rgba(139, 69, 19, 0.7)'} fontSize="11" fontWeight="bold" fontFamily="serif">II</text>
                        </svg>
                        <svg className={`ability-level ${achievementsUnlocked >= Math.floor(totalAchievements * 2 / 3) ? 'active' : 'inactive'}`} viewBox="0 0 32 32">
                          <circle cx="16" cy="16" r="14" fill={achievementsUnlocked >= Math.floor(totalAchievements * 2 / 3) ? 'rgba(255, 193, 7, 0.3)' : 'rgba(139, 69, 19, 0.2)'} stroke={achievementsUnlocked >= Math.floor(totalAchievements * 2 / 3) ? 'rgba(255, 193, 7, 0.9)' : 'rgba(139, 69, 19, 0.5)'} strokeWidth="2"/>
                          <circle cx="16" cy="16" r="12" fill={achievementsUnlocked >= Math.floor(totalAchievements * 2 / 3) ? 'rgba(255, 193, 7, 0.1)' : 'rgba(139, 69, 19, 0.1)'} stroke={achievementsUnlocked >= Math.floor(totalAchievements * 2 / 3) ? 'rgba(255, 193, 7, 0.7)' : 'rgba(139, 69, 19, 0.3)'} strokeWidth="1"/>
                          <text x="16" y="20" textAnchor="middle" fill={achievementsUnlocked >= Math.floor(totalAchievements * 2 / 3) ? 'rgba(255, 193, 7, 1)' : 'rgba(139, 69, 19, 0.7)'} fontSize="10" fontWeight="bold" fontFamily="serif">III</text>
                        </svg>
                      </div>
                    </div>
                    <div className="ability-description">
                      Собирайте все достижения! Разблокировано: {achievementsUnlocked} из {totalAchievements}. Каждое достижение - это ваш вклад в сообщество.
                    </div>
                  </div>
                </div>

                {/* Meteor Ultimate - Empty for future use */}
                <div className="ability" data-ability="meteor">
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
                    <div className="ability-cost">???</div>
                  </div>

                  <div className="ability-info">
                    <div className="ability-info-bg"></div>
                    <div className="ability-header">
                      <div className="ability-name">Скоро...</div>
                      <div className="ability-progression">
                        <svg className="ability-level inactive" viewBox="0 0 32 32">
                          <circle cx="16" cy="16" r="14" fill="rgba(139, 69, 19, 0.2)" stroke="rgba(139, 69, 19, 0.5)" strokeWidth="2"/>
                          <circle cx="16" cy="16" r="12" fill="rgba(139, 69, 19, 0.1)" stroke="rgba(139, 69, 19, 0.3)" strokeWidth="1"/>
                          <text x="16" y="20" textAnchor="middle" fill="rgba(139, 69, 19, 0.7)" fontSize="12" fontWeight="bold" fontFamily="serif">?</text>
                        </svg>
                        <svg className="ability-level inactive" viewBox="0 0 32 32">
                          <circle cx="16" cy="16" r="14" fill="rgba(139, 69, 19, 0.2)" stroke="rgba(139, 69, 19, 0.5)" strokeWidth="2"/>
                          <circle cx="16" cy="16" r="12" fill="rgba(139, 69, 19, 0.1)" stroke="rgba(139, 69, 19, 0.3)" strokeWidth="1"/>
                          <text x="16" y="20" textAnchor="middle" fill="rgba(139, 69, 19, 0.7)" fontSize="11" fontWeight="bold" fontFamily="serif">?</text>
                        </svg>
                        <svg className="ability-level inactive" viewBox="0 0 32 32">
                          <circle cx="16" cy="16" r="14" fill="rgba(139, 69, 19, 0.2)" stroke="rgba(139, 69, 19, 0.5)" strokeWidth="2"/>
                          <circle cx="16" cy="16" r="12" fill="rgba(139, 69, 19, 0.1)" stroke="rgba(139, 69, 19, 0.3)" strokeWidth="1"/>
                          <text x="16" y="20" textAnchor="middle" fill="rgba(139, 69, 19, 0.7)" fontSize="10" fontWeight="bold" fontFamily="serif">?</text>
                        </svg>
                      </div>
                    </div>
                    <div className="ability-description">
                      Здесь скоро появится что-то особенное... Следите за обновлениями!
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-name">
                <h2>Статистика активности</h2>
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
};

export default GameCard;

import { useState } from 'react';
import './GameCard.css';

const GameCard = () => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [activeAbility, setActiveAbility] = useState('attack');

  const handleCardClick = () => {
    setIsFlipped(!isFlipped);
  };

  const handleAbilityClick = (ability, e) => {
    e.stopPropagation();
    setActiveAbility(ability);
  };

  return (
    <div className={`card-container ${isFlipped ? 'flipped' : ''}`} onClick={handleCardClick}>
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
                  <span className="level-number">Lv7</span>
                </div>
                <div className="xp-section">
                  <div className="xp-fill"></div>
                  <div className="xp-text">
                    <span className="xp-text-full">1,850 / 2,500 XP</span>
                    <span className="xp-text-short">1.8k/2.5k</span>
                  </div>
                </div>
              </div>

              <div className="card-art">
                <div className="art-placeholder">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'transparent', borderRadius: '8px' }}>
                    <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
                      <div style={{ fontSize: '30px', marginBottom: '8px' }}>🧙‍♂️</div>
                      <div>Wizard SVG</div>
                      <div style={{ fontSize: '10px', opacity: '0.4', marginTop: '3px' }}>Transparent background</div>
                    </div>
                  </div>
                </div>
                <div className="art-frame"></div>
              </div>

              <div className="card-name">
                <h2>Kael Shadowweaver</h2>
              </div>

              <div className="card-description">
                <div className="description-bg"></div>
                <p><strong>Echo-Cursed:</strong> Kael discovered Veridian's Echo in forgotten ruins, a divine prison disguised as treasure. The more he draws upon its power, the stronger Veridian's influence grows, ancient might flowing through Kael's spells as the entity's dark will slowly overwrites his own.</p>
              </div>

              <div className="card-stats">
                <div className="stat-bar hp">
                  <div className="stat-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor" style={{ color: 'rgba(248, 113, 113, 0.9)' }}>
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  </div>
                  <div className="stat-fill-section">
                    <div className="stat-fill hp-fill"></div>
                    <div className="stat-text">85 / 100</div>
                  </div>
                </div>
                <div className="stat-bar mana">
                  <div className="stat-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor" style={{ color: 'rgba(96, 165, 250, 0.9)' }}>
                      <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
                      <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" transform="rotate(45 12 9)"/>
                    </svg>
                  </div>
                  <div className="stat-fill-section">
                    <div className="stat-fill mana-fill"></div>
                    <div className="stat-text">60 / 120</div>
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
                  <span className="level-number">Lv7</span>
                </div>
                <div className="xp-section">
                  <div className="xp-fill"></div>
                  <div className="xp-text">
                    <span className="xp-text-full">1,850 / 2,500 XP</span>
                    <span className="xp-text-short">1.8k/2.5k</span>
                  </div>
                </div>
              </div>

              {/* Ability Selector Tabs */}
              <div className="ability-selector">
                <div
                  className={`ability-tab ${activeAbility === 'attack' ? 'active' : ''}`}
                  onClick={(e) => handleAbilityClick('attack', e)}
                >
                  ⚔️
                </div>
                <div
                  className={`ability-tab ${activeAbility === 'frost' ? 'active' : ''}`}
                  onClick={(e) => handleAbilityClick('frost', e)}
                >
                  🛡️
                </div>
                <div
                  className={`ability-tab ${activeAbility === 'slam' ? 'active' : ''}`}
                  onClick={(e) => handleAbilityClick('slam', e)}
                >
                  🪄
                </div>
                <div
                  className={`ability-tab ${activeAbility === 'meteor' ? 'active' : ''}`}
                  onClick={(e) => handleAbilityClick('meteor', e)}
                >
                  ☄️
                </div>
              </div>

              {/* Ability Content Area */}
              <div className="ability-content">
                {/* Attack Spell */}
                <div className={`ability ${activeAbility === 'attack' ? 'active' : ''}`}>
                  <div className="ability-art">
                    <div className="ability-art-placeholder">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', borderRadius: '8px', background: 'transparent' }}>
                        <div style={{ textAlign: 'center', color: 'rgba(249,115,22,0.6)', fontSize: '12px' }}>
                          <div style={{ fontSize: '30px', marginBottom: '8px' }}>🧙‍♂️</div>
                          <div>Same Wizard</div>
                          <div style={{ fontSize: '9px', opacity: '0.5', marginTop: '3px' }}>Orange hue shift</div>
                        </div>
                      </div>
                    </div>
                    <div className="ability-art-frame"></div>
                    <div className="ability-cost">4 Mana</div>
                  </div>

                  <div className="ability-info">
                    <div className="ability-info-bg"></div>
                    <div className="ability-header">
                      <div className="ability-name">Arcane Pulse</div>
                      <div className="ability-progression">
                        <svg className="ability-level active" viewBox="0 0 32 32">
                          <circle cx="16" cy="16" r="14" fill="rgba(255, 193, 7, 0.3)" stroke="rgba(255, 193, 7, 0.9)" strokeWidth="2"/>
                          <circle cx="16" cy="16" r="12" fill="rgba(255, 193, 7, 0.1)" stroke="rgba(255, 193, 7, 0.7)" strokeWidth="1"/>
                          <text x="16" y="20" textAnchor="middle" fill="rgba(255, 193, 7, 1)" fontSize="12" fontWeight="bold" fontFamily="serif">I</text>
                        </svg>
                        <svg className="ability-level active" viewBox="0 0 32 32">
                          <circle cx="16" cy="16" r="14" fill="rgba(255, 193, 7, 0.3)" stroke="rgba(255, 193, 7, 0.9)" strokeWidth="2"/>
                          <circle cx="16" cy="16" r="12" fill="rgba(255, 193, 7, 0.1)" stroke="rgba(255, 193, 7, 0.7)" strokeWidth="1"/>
                          <text x="16" y="20" textAnchor="middle" fill="rgba(255, 193, 7, 1)" fontSize="11" fontWeight="bold" fontFamily="serif">II</text>
                        </svg>
                        <svg className="ability-level inactive" viewBox="0 0 32 32">
                          <circle cx="16" cy="16" r="14" fill="rgba(139, 69, 19, 0.2)" stroke="rgba(139, 69, 19, 0.5)" strokeWidth="2"/>
                          <circle cx="16" cy="16" r="12" fill="rgba(139, 69, 19, 0.1)" stroke="rgba(139, 69, 19, 0.3)" strokeWidth="1"/>
                          <text x="16" y="20" textAnchor="middle" fill="rgba(139, 69, 19, 0.7)" fontSize="10" fontWeight="bold" fontFamily="serif">III</text>
                        </svg>
                      </div>
                    </div>
                    <div className="ability-description">
                      Kael draws upon the Echo's core power, his willpower shaping the energy into devastating bolts. But the stone thrums with satisfaction, each spell feeds Veridian's influence, ancient consciousness seeping deeper into his host.
                    </div>
                  </div>
                </div>

                {/* Frost Shield */}
                <div className={`ability ${activeAbility === 'frost' ? 'active' : ''}`}>
                  <div className="ability-art">
                    <div className="ability-art-placeholder">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', borderRadius: '8px', background: 'transparent' }}>
                        <div style={{ textAlign: 'center', color: 'rgba(59,130,246,0.6)', fontSize: '12px' }}>
                          <div style={{ fontSize: '30px', marginBottom: '8px' }}>🧙‍♂️</div>
                          <div>Same Wizard</div>
                          <div style={{ fontSize: '9px', opacity: '0.5', marginTop: '3px' }}>Blue hue shift</div>
                        </div>
                      </div>
                    </div>
                    <div className="ability-art-frame"></div>
                    <div className="ability-cost defense-cost">2 Defense</div>
                  </div>

                  <div className="ability-info">
                    <div className="ability-info-bg"></div>
                    <div className="ability-header">
                      <div className="ability-name">Frost Barrier</div>
                      <div className="ability-progression">
                        <svg className="ability-level active" viewBox="0 0 32 32">
                          <circle cx="16" cy="16" r="14" fill="rgba(255, 193, 7, 0.3)" stroke="rgba(255, 193, 7, 0.9)" strokeWidth="2"/>
                          <circle cx="16" cy="16" r="12" fill="rgba(255, 193, 7, 0.1)" stroke="rgba(255, 193, 7, 0.7)" strokeWidth="1"/>
                          <text x="16" y="20" textAnchor="middle" fill="rgba(255, 193, 7, 1)" fontSize="12" fontWeight="bold" fontFamily="serif">I</text>
                        </svg>
                        <svg className="ability-level inactive" viewBox="0 0 32 32">
                          <circle cx="16" cy="16" r="14" fill="rgba(139, 69, 19, 0.2)" stroke="rgba(139, 69, 19, 0.5)" strokeWidth="2"/>
                          <circle cx="16" cy="16" r="12" fill="rgba(139, 69, 19, 0.1)" stroke="rgba(139, 69, 19, 0.3)" strokeWidth="1"/>
                          <text x="16" y="20" textAnchor="middle" fill="rgba(139, 69, 19, 0.7)" fontSize="11" fontWeight="bold" fontFamily="serif">II</text>
                        </svg>
                        <svg className="ability-level inactive" viewBox="0 0 32 32">
                          <circle cx="16" cy="16" r="14" fill="rgba(139, 69, 19, 0.2)" stroke="rgba(139, 69, 19, 0.5)" strokeWidth="2"/>
                          <circle cx="16" cy="16" r="12" fill="rgba(139, 69, 19, 0.1)" stroke="rgba(139, 69, 19, 0.3)" strokeWidth="1"/>
                          <text x="16" y="20" textAnchor="middle" fill="rgba(139, 69, 19, 0.7)" fontSize="10" fontWeight="bold" fontFamily="serif">III</text>
                        </svg>
                      </div>
                    </div>
                    <div className="ability-description">
                      Kael summons protective ice, believing his survival instincts guide the magic. Unknown to him, the barrier carries Veridian's cold hatred, protection that slowly freezes the caster's compassion with each use.
                    </div>
                  </div>
                </div>

                {/* Staff Strike */}
                <div className={`ability ${activeAbility === 'slam' ? 'active' : ''}`}>
                  <div className="ability-art">
                    <div className="ability-art-placeholder">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', borderRadius: '8px', background: 'transparent' }}>
                        <div style={{ textAlign: 'center', color: 'rgba(168,85,247,0.6)', fontSize: '12px' }}>
                          <div style={{ fontSize: '30px', marginBottom: '8px' }}>🧙‍♂️</div>
                          <div>Same Wizard</div>
                          <div style={{ fontSize: '9px', opacity: '0.5', marginTop: '3px' }}>Purple hue shift</div>
                        </div>
                      </div>
                    </div>
                    <div className="ability-art-frame"></div>
                    <div className="ability-cost attack-cost">3 Attack</div>
                  </div>

                  <div className="ability-info">
                    <div className="ability-info-bg"></div>
                    <div className="ability-header">
                      <div className="ability-name">Staff Strike</div>
                      <div className="ability-progression">
                        <svg className="ability-level active" viewBox="0 0 32 32">
                          <circle cx="16" cy="16" r="14" fill="rgba(255, 193, 7, 0.3)" stroke="rgba(255, 193, 7, 0.9)" strokeWidth="2"/>
                          <circle cx="16" cy="16" r="12" fill="rgba(255, 193, 7, 0.1)" stroke="rgba(255, 193, 7, 0.7)" strokeWidth="1"/>
                          <text x="16" y="20" textAnchor="middle" fill="rgba(255, 193, 7, 1)" fontSize="12" fontWeight="bold" fontFamily="serif">I</text>
                        </svg>
                        <svg className="ability-level active" viewBox="0 0 32 32">
                          <circle cx="16" cy="16" r="14" fill="rgba(255, 193, 7, 0.3)" stroke="rgba(255, 193, 7, 0.9)" strokeWidth="2"/>
                          <circle cx="16" cy="16" r="12" fill="rgba(255, 193, 7, 0.1)" stroke="rgba(255, 193, 7, 0.7)" strokeWidth="1"/>
                          <text x="16" y="20" textAnchor="middle" fill="rgba(255, 193, 7, 1)" fontSize="11" fontWeight="bold" fontFamily="serif">II</text>
                        </svg>
                        <svg className="ability-level active" viewBox="0 0 32 32">
                          <circle cx="16" cy="16" r="14" fill="rgba(255, 193, 7, 0.3)" stroke="rgba(255, 193, 7, 0.9)" strokeWidth="2"/>
                          <circle cx="16" cy="16" r="12" fill="rgba(255, 193, 7, 0.1)" stroke="rgba(255, 193, 7, 0.7)" strokeWidth="1"/>
                          <text x="16" y="20" textAnchor="middle" fill="rgba(255, 193, 7, 1)" fontSize="10" fontWeight="bold" fontFamily="serif">III</text>
                        </svg>
                      </div>
                    </div>
                    <div className="ability-description">
                      Desperation drives Kael to enhance his staff with raw force, believing it's his tactical mind at work. But the stone pulses with dark approval, Veridian's bloodlust seeping into every blow as his host grows more comfortable with brutality.
                    </div>
                  </div>
                </div>

                {/* Meteor Ultimate */}
                <div className={`ability ${activeAbility === 'meteor' ? 'active' : ''}`}>
                  <div className="ability-art">
                    <div className="ability-art-placeholder">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', borderRadius: '8px', background: 'transparent' }}>
                        <div style={{ textAlign: 'center', color: 'rgba(239,68,68,0.6)', fontSize: '12px' }}>
                          <div style={{ fontSize: '30px', marginBottom: '8px' }}>🧙‍♂️</div>
                          <div>Same Wizard</div>
                          <div style={{ fontSize: '9px', opacity: '0.5', marginTop: '3px' }}>Red hue shift</div>
                        </div>
                      </div>
                    </div>
                    <div className="ability-art-frame"></div>
                    <div className="ability-cost">12 Mana</div>
                  </div>

                  <div className="ability-info">
                    <div className="ability-info-bg"></div>
                    <div className="ability-header">
                      <div className="ability-name">Cataclysm</div>
                      <div className="ability-progression">
                        <svg className="ability-level active" viewBox="0 0 32 32">
                          <circle cx="16" cy="16" r="14" fill="rgba(255, 193, 7, 0.3)" stroke="rgba(255, 193, 7, 0.9)" strokeWidth="2"/>
                          <circle cx="16" cy="16" r="12" fill="rgba(255, 193, 7, 0.1)" stroke="rgba(255, 193, 7, 0.7)" strokeWidth="1"/>
                          <text x="16" y="20" textAnchor="middle" fill="rgba(255, 193, 7, 1)" fontSize="12" fontWeight="bold" fontFamily="serif">I</text>
                        </svg>
                        <svg className="ability-level inactive" viewBox="0 0 32 32">
                          <circle cx="16" cy="16" r="14" fill="rgba(139, 69, 19, 0.2)" stroke="rgba(139, 69, 19, 0.5)" strokeWidth="2"/>
                          <circle cx="16" cy="16" r="12" fill="rgba(139, 69, 19, 0.1)" stroke="rgba(139, 69, 19, 0.3)" strokeWidth="1"/>
                          <text x="16" y="20" textAnchor="middle" fill="rgba(139, 69, 19, 0.7)" fontSize="11" fontWeight="bold" fontFamily="serif">II</text>
                        </svg>
                        <svg className="ability-level inactive" viewBox="0 0 32 32">
                          <circle cx="16" cy="16" r="14" fill="rgba(139, 69, 19, 0.2)" stroke="rgba(139, 69, 19, 0.5)" strokeWidth="2"/>
                          <circle cx="16" cy="16" r="12" fill="rgba(139, 69, 19, 0.1)" stroke="rgba(139, 69, 19, 0.3)" strokeWidth="1"/>
                          <text x="16" y="20" textAnchor="middle" fill="rgba(139, 69, 19, 0.7)" fontSize="10" fontWeight="bold" fontFamily="serif">III</text>
                        </svg>
                      </div>
                    </div>
                    <div className="ability-description">
                      Faced with annihilation, Kael willingly sacrifices fragments of his consciousness to unlock the stone's true potential. The resulting cataclysm satisfies Veridian's hunger, each casting bringing the entity closer to total dominion over his crumbling host.
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-name">
                <h2>Combat Abilities</h2>
              </div>

              <div className="combat-stats">
                <div className="combat-stat attack">
                  <div className="combat-stat-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor" style={{ color: 'rgba(251, 146, 60, 0.9)' }}>
                      <path d="M12 2l3.09 6.26L22 9l-6.91.74L12 16l-3.09-6.26L2 9l6.91-.74L12 2z"/>
                      <path d="M6 15l2 2 6-6"/>
                    </svg>
                  </div>
                  <div className="combat-stat-fill-section">
                    <div className="combat-stat-fill attack-fill"></div>
                    <div className="combat-stat-text">6 / 20</div>
                  </div>
                </div>
                <div className="combat-stat spell-power">
                  <div className="combat-stat-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor" style={{ color: 'rgba(34, 211, 238, 0.9)' }}>
                      <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
                      <path d="M7.5 3.5L9 9L14.5 10.5L9 12L7.5 17.5L6 12L0.5 10.5L6 9L7.5 3.5Z" transform="translate(6,2) scale(0.6)"/>
                    </svg>
                  </div>
                  <div className="combat-stat-fill-section">
                    <div className="combat-stat-fill spell-fill"></div>
                    <div className="combat-stat-text">15 / 20</div>
                  </div>
                </div>
                <div className="combat-stat defense">
                  <div className="combat-stat-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor" style={{ color: 'rgba(74, 222, 128, 0.9)' }}>
                      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                      <path d="M9 12l2 2 4-4" stroke="rgba(0,0,0,0.3)" strokeWidth="1" fill="none"/>
                    </svg>
                  </div>
                  <div className="combat-stat-fill-section">
                    <div className="combat-stat-fill defense-fill"></div>
                    <div className="combat-stat-text">4 / 20</div>
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

export default GameCard;

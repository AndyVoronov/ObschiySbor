import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './Rules.css';

const Rules = () => {
  const { t } = useTranslation('common');
  const [expandedRule, setExpandedRule] = useState(null);

  const toggleRule = (ruleNumber) => {
    setExpandedRule(expandedRule === ruleNumber ? null : ruleNumber);
  };

  return (
    <div className="rules-page">
      <div className="rules-hero">
        <div className="rules-hero-content">
          <h1>{t('rules.heroTitle')}</h1>
          <p className="rules-subtitle">
            {t('rules.heroSubtitle')}
          </p>
        </div>
      </div>

      <div className="rules-content">
        <div className="rules-intro">
          <p>
            {t('rules.introText')}
          </p>
        </div>

        <section className="rules-section collapsible">
          <div className="rule-header" onClick={() => toggleRule(1)}>
            <div className="rule-title-wrapper">
              <div className="rule-icon">🤝</div>
              <h2>{t('rules.rule1Title')}</h2>
            </div>
            <span className={`toggle-arrow ${expandedRule === 1 ? 'open' : ''}`}>▼</span>
          </div>
          {expandedRule === 1 && (
            <ul className="rules-list">
              <li>{t('rules.rule1Item1')}</li>
              <li>{t('rules.rule1Item2')}</li>
              <li>{t('rules.rule1Item3')}</li>
              <li>{t('rules.rule1Item4')}</li>
            </ul>
          )}
        </section>

        <section className="rules-section collapsible">
          <div className="rule-header" onClick={() => toggleRule(2)}>
            <div className="rule-title-wrapper">
              <div className="rule-icon">✅</div>
              <h2>{t('rules.rule2Title')}</h2>
            </div>
            <span className={`toggle-arrow ${expandedRule === 2 ? 'open' : ''}`}>▼</span>
          </div>
          {expandedRule === 2 && (
            <ul className="rules-list">
              <li>{t('rules.rule2Item1')}</li>
              <li>{t('rules.rule2Item2')}</li>
              <li>{t('rules.rule2Item3')}</li>
              <li>{t('rules.rule2Item4')}</li>
              <li>{t('rules.rule2Item5')}</li>
            </ul>
          )}
        </section>

        <section className="rules-section collapsible">
          <div className="rule-header" onClick={() => toggleRule(3)}>
            <div className="rule-title-wrapper">
              <div className="rule-icon">👥</div>
              <h2>{t('rules.rule3Title')}</h2>
            </div>
            <span className={`toggle-arrow ${expandedRule === 3 ? 'open' : ''}`}>▼</span>
          </div>
          {expandedRule === 3 && (
            <ul className="rules-list">
              <li>{t('rules.rule3Item1')}</li>
              <li>{t('rules.rule3Item2')}</li>
              <li>{t('rules.rule3Item3')}</li>
              <li>{t('rules.rule3Item4')}</li>
              <li>{t('rules.rule3Item5')}</li>
            </ul>
          )}
        </section>

        <section className="rules-section collapsible">
          <div className="rule-header" onClick={() => toggleRule(4)}>
            <div className="rule-title-wrapper">
              <div className="rule-icon">💬</div>
              <h2>{t('rules.rule4Title')}</h2>
            </div>
            <span className={`toggle-arrow ${expandedRule === 4 ? 'open' : ''}`}>▼</span>
          </div>
          {expandedRule === 4 && (
            <ul className="rules-list">
              <li>{t('rules.rule4Item1')}</li>
              <li>{t('rules.rule4Item2')}</li>
              <li>{t('rules.rule4Item3')}</li>
              <li>{t('rules.rule4Item4')}</li>
              <li>{t('rules.rule4Item5')}</li>
            </ul>
          )}
        </section>

        <section className="rules-section collapsible">
          <div className="rule-header" onClick={() => toggleRule(5)}>
            <div className="rule-title-wrapper">
              <div className="rule-icon">🚫</div>
              <h2>{t('rules.rule5Title')}</h2>
            </div>
            <span className={`toggle-arrow ${expandedRule === 5 ? 'open' : ''}`}>▼</span>
          </div>
          {expandedRule === 5 && (
            <ul className="rules-list">
              <li>{t('rules.rule5Item1')}</li>
              <li>{t('rules.rule5Item2')}</li>
              <li>{t('rules.rule5Item3')}</li>
              <li>{t('rules.rule5Item4')}</li>
              <li>{t('rules.rule5Item5')}</li>
              <li>{t('rules.rule5Item6')}</li>
            </ul>
          )}
        </section>

        <section className="rules-section collapsible">
          <div className="rule-header" onClick={() => toggleRule(6)}>
            <div className="rule-title-wrapper">
              <div className="rule-icon">⚖️</div>
              <h2>{t('rules.rule6Title')}</h2>
            </div>
            <span className={`toggle-arrow ${expandedRule === 6 ? 'open' : ''}`}>▼</span>
          </div>
          {expandedRule === 6 && (
          <ul className="rules-list">
            <li>
              <strong>{t('rules.rule6BlockTypesTitle')}</strong>
              <ul className="sub-list">
                <li><strong>{t('rules.rule6TempBlockTitle')}</strong> — {t('rules.rule6TempBlockDesc')}</li>
                <li><strong>{t('rules.rule6PermBlockTitle')}</strong> — {t('rules.rule6PermBlockDesc')}</li>
              </ul>
            </li>
            <li>
              <strong>{t('rules.rule6ConsequencesTitle')}</strong>
              <ul className="sub-list">
                <li>{t('rules.rule6Consequence1')}</li>
                <li>{t('rules.rule6Consequence2')}</li>
                <li>{t('rules.rule6Consequence3')}</li>
                <li>{t('rules.rule6Consequence4')}</li>
              </ul>
            </li>
            <li>
              <strong>{t('rules.rule6ViolationsTitle')}</strong>
              <ul className="sub-list">
                <li>{t('rules.rule6ViolationLight')}</li>
                <li>{t('rules.rule6ViolationMedium')}</li>
                <li>{t('rules.rule6ViolationSerious')}</li>
                <li>{t('rules.rule6ViolationCritical')}</li>
              </ul>
            </li>
            <li>
              <strong>{t('rules.rule6AppealTitle')}</strong>
              <ul className="sub-list">
                <li>{t('rules.rule6AppealItem1')}</li>
                <li>{t('rules.rule6AppealItem2')}</li>
                <li>{t('rules.rule6AppealItem3')}</li>
                <li>{t('rules.rule6AppealItem4')}</li>
                <li>{t('rules.rule6AppealItem5')}</li>
                <li>{t('rules.rule6AppealItem6')}</li>
              </ul>
            </li>
            <li>{t('rules.rule6Item5')}</li>
            <li>{t('rules.rule6Item6')}</li>
          </ul>
          )}
        </section>

        <section className="rules-section collapsible">
          <div className="rule-header" onClick={() => toggleRule(7)}>
            <div className="rule-title-wrapper">
              <div className="rule-icon">📢</div>
              <h2>{t('rules.rule7Title')}</h2>
            </div>
            <span className={`toggle-arrow ${expandedRule === 7 ? 'open' : ''}`}>▼</span>
          </div>
          {expandedRule === 7 && (
            <ul className="rules-list">
              <li>{t('rules.rule7Item1')}</li>
              <li>{t('rules.rule7Item2')}</li>
              <li>{t('rules.rule7Item3')}</li>
              <li>{t('rules.rule7Item4')}</li>
            </ul>
          )}
        </section>

        <section className="rules-section collapsible">
          <div className="rule-header" onClick={() => toggleRule(8)}>
            <div className="rule-title-wrapper">
              <div className="rule-icon">🔒</div>
              <h2>{t('rules.rule8Title')}</h2>
            </div>
            <span className={`toggle-arrow ${expandedRule === 8 ? 'open' : ''}`}>▼</span>
          </div>
          {expandedRule === 8 && (
            <ul className="rules-list">
              <li>{t('rules.rule8Item1')}</li>
              <li>{t('rules.rule8Item2')}</li>
              <li>{t('rules.rule8Item3')}</li>
              <li>{t('rules.rule8Item4')}</li>
            </ul>
          )}
        </section>

        <div className="rules-footer">
          <div className="footer-box">
            <h3>{t('rules.footerRememberTitle')}</h3>
            <p>
              {t('rules.footerRememberText')}
            </p>
          </div>

          <div className="footer-box">
            <h3>{t('rules.footerChangesTitle')}</h3>
            <p>
              {t('rules.footerChangesText')}
            </p>
          </div>

          <div className="footer-box accent">
            <h3>{t('rules.footerQuestionsTitle')}</h3>
            <p>
              {t('rules.footerQuestionsText1')}
              <a href="/contacts">{t('rules.footerQuestionsLinkText')}</a>
            </p>
          </div>
        </div>

        <div className="accept-section">
          <p className="accept-text">
            {t('rules.acceptText')}
          </p>
          <p className="update-date">
            {t('rules.updateDate')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Rules;
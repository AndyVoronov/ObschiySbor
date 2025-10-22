import { useTranslation } from 'react-i18next';
import './Rules.css';

const Rules = () => {
  const { t } = useTranslation('common');

  return (
    <div className="rules-page">
      <div className="rules-hero">
        <div className="rules-hero-content">
          <h1>{t('rules.title')}</h1>
          <p className="rules-subtitle">
            {t('rules.subtitle')}
          </p>
        </div>
      </div>

      <div className="rules-content">
        <div className="rules-intro">
          <p>
            {t('rules.intro')}
          </p>
        </div>

        <section className="rules-section">
          <div className="about-section-icon">📋</div>
          <h2>{t('rules.generalTitle')}</h2>
          <ul className="rules-list">
            <li>{t('rules.rule1')}</li>
            <li>{t('rules.rule2')}</li>
            <li>{t('rules.rule3')}</li>
            <li>{t('rules.rule4')}</li>
            <li>{t('rules.rule5')}</li>
          </ul>
        </section>

        <section className="rules-section">
          <div className="about-section-icon">✅</div>
          <h2>{t('rules.forOrganizersTitle')}</h2>
          <ul className="rules-list">
            <li>{t('rules.orgRule1')}</li>
            <li>{t('rules.orgRule2')}</li>
            <li>{t('rules.orgRule3')}</li>
            <li>{t('rules.orgRule4')}</li>
          </ul>
        </section>

        <section className="rules-section">
          <div className="about-section-icon">👥</div>
          <h2>{t('rules.forParticipantsTitle')}</h2>
          <ul className="rules-list">
            <li>{t('rules.partRule1')}</li>
            <li>{t('rules.partRule2')}</li>
            <li>{t('rules.partRule3')}</li>
            <li>{t('rules.partRule4')}</li>
          </ul>
        </section>

        <section className="rules-section">
          <div className="about-section-icon">⚖️</div>
          <h2>{t('rules.violations')}</h2>
          <p>{t('rules.violationsText')}</p>
        </section>

        <section className="rules-section">
          <div className="about-section-icon">📢</div>
          <h2>{t('rules.appeals')}</h2>
          <p>{t('rules.appealsText')}</p>
        </section>

        <div className="rules-footer">
          <div className="footer-box accent">
            <h3>❓ {t('contacts.support')}</h3>
            <p>
              {t('contacts.supportText')}
            </p>
            <a href="/contacts" className="btn-secondary" style={{ marginTop: '1rem', display: 'inline-block' }}>
              {t('footer.contacts')}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Rules;

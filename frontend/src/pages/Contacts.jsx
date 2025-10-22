import { useTranslation } from 'react-i18next';
import './Contacts.css';

const Contacts = () => {
  const { t } = useTranslation('common');

  return (
    <div className="contacts-page">
      <div className="contacts-hero">
        <div className="contacts-hero-content">
          <h1>{t('contacts.heroTitle')}</h1>
          <p className="contacts-subtitle">
            {t('contacts.heroSubtitle')}
          </p>
        </div>
      </div>

      <div className="contacts-content">
        <div className="contacts-grid">
          <div className="contact-card">
            <div className="contact-icon">💬</div>
            <h3>{t('contacts.telegramTitle')}</h3>
            <p>{t('contacts.telegramText')}</p>
            <a
              href="https://t.me/VoronovAndrey"
              target="_blank"
              rel="noopener noreferrer"
              className="contact-link"
            >
              @VoronovAndrey
            </a>
          </div>

          <div className="contact-card">
            <div className="contact-icon">🐛</div>
            <h3>{t('contacts.bugTitle')}</h3>
            <p>{t('contacts.bugText')}</p>
            <a
              href="https://t.me/VoronovAndrey"
              target="_blank"
              rel="noopener noreferrer"
              className="contact-link"
            >
              {t('contacts.bugLink')}
            </a>
          </div>

          <div className="contact-card">
            <div className="contact-icon">💡</div>
            <h3>{t('contacts.suggestionsTitle')}</h3>
            <p>{t('contacts.suggestionsText')}</p>
            <a
              href="https://t.me/VoronovAndrey"
              target="_blank"
              rel="noopener noreferrer"
              className="contact-link"
            >
              {t('contacts.bugLink')}
            </a>
          </div>
        </div>

        <div className="faq-section">
          <h2>{t('contacts.faqTitle')}</h2>
          <div className="faq-list">
            <div className="faq-item">
              <h4>❓ {t('contacts.faq1Question')}</h4>
              <p>
                {t('contacts.faq1Answer')}
              </p>
            </div>

            <div className="faq-item">
              <h4>❓ {t('contacts.faq2Question')}</h4>
              <p>
                {t('contacts.faq2Answer')}
              </p>
            </div>

            <div className="faq-item">
              <h4>❓ {t('contacts.faq3Question')}</h4>
              <p>
                {t('contacts.faq3Answer')}
              </p>
            </div>

            <div className="faq-item">
              <h4>❓ {t('contacts.faq4Question')}</h4>
              <p>
                {t('contacts.faq4Answer')}
              </p>
            </div>
          </div>
        </div>

        <div className="contact-form-section">
          <h2>{t('contacts.contactFormTitle')}</h2>
          <p className="form-description">
            {t('contacts.contactFormText')}
          </p>
          <div className="telegram-cta">
            <a
              href="https://t.me/VoronovAndrey"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-telegram"
            >
              <span className="telegram-icon">📱</span>
              {t('contacts.telegramCta')}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contacts;

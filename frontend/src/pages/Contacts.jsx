import { useTranslation } from 'react-i18next';
import './Contacts.css';

const Contacts = () => {
  const { t } = useTranslation('common');

  return (
    <div className="contacts-page">
      <div className="contacts-hero">
        <div className="contacts-hero-content">
          <h1>{t('contacts.title')}</h1>
          <p className="contacts-subtitle">
            {t('contacts.subtitle')}
          </p>
        </div>
      </div>

      <div className="contacts-content">
        <div className="contacts-grid">
          <div className="contact-card">
            <div className="contact-icon">💬</div>
            <h3>{t('contacts.telegram')}</h3>
            <p>{t('contacts.getInTouch')}</p>
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
            <div className="contact-icon">📧</div>
            <h3>{t('contacts.email')}</h3>
            <p>{t('contacts.support')}</p>
            <a
              href={`mailto:${t('contacts.emailAddress')}`}
              className="contact-link"
            >
              {t('contacts.emailAddress')}
            </a>
          </div>

          <div className="contact-card">
            <div className="contact-icon">🏢</div>
            <h3>{t('contacts.office')}</h3>
            <p>{t('contacts.forOrganizers')}</p>
            <p className="contact-link">
              {t('contacts.officeAddress')}
            </p>
          </div>
        </div>

        <div className="contact-form-section">
          <h2>{t('contacts.support')}</h2>
          <p className="form-description">
            {t('contacts.supportText')}
          </p>
          <div className="telegram-cta">
            <a
              href="https://t.me/VoronovAndrey"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-telegram"
            >
              <span className="telegram-icon">📱</span>
              {t('contacts.telegram')}
            </a>
          </div>
        </div>

        <div className="contact-form-section">
          <h2>{t('contacts.forOrganizers')}</h2>
          <p className="form-description">
            {t('contacts.forOrganizersText')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Contacts;

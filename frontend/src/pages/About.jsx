import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import './About.css';

const About = () => {
  const { t } = useTranslation('common');
  const { user } = useAuth();

  return (
    <div className="about-page">
      <div className="about-hero">
        <div className="about-hero-content">
          <h1>{t('about.title')}</h1>
          <p className="about-subtitle">
            {t('about.subtitle')}
          </p>
        </div>
      </div>

      <div className="about-content">
        <section className="about-section">
          <div className="about-section-icon">🎯</div>
          <h2>{t('about.ourMission')}</h2>
          <p>
            {t('about.ourMissionText')}
          </p>
        </section>

        <section className="about-section">
          <div className="about-section-icon">❓</div>
          <h2>{t('about.whatIs')}</h2>
          <p>
            {t('about.whatIsText')}
          </p>
        </section>

        <section className="about-section">
          <h2>{t('about.howItWorks')}</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">1️⃣</div>
              <h3>{t('about.step1Title')}</h3>
              <p>{t('about.step1Text')}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">2️⃣</div>
              <h3>{t('about.step2Title')}</h3>
              <p>{t('about.step2Text')}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">3️⃣</div>
              <h3>{t('about.step3Title')}</h3>
              <p>{t('about.step3Text')}</p>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <h3>{t('about.createOwn')}</h3>
            <p>{t('about.createOwnText')}</p>
          </div>
        </section>

        <section className="about-section about-cta">
          {user ? (
            <>
              <p>
                {t('about.ourMissionText')}
              </p>
              <div className="cta-buttons">
                <a href="/create-event" className="btn-primary">
                  {t('events.createEvent')}
                </a>
                <a href="/events" className="btn-secondary">
                  {t('events.title')}
                </a>
              </div>
            </>
          ) : (
            <>
              <p>
                {t('about.ourMissionText')}
              </p>
              <div className="cta-buttons">
                <a href="/register" className="btn-primary">
                  {t('auth.registerButton')}
                </a>
                <a href="/events" className="btn-secondary">
                  {t('events.title')}
                </a>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default About;

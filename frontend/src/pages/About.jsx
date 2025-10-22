import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import './About.css';

const About = () => {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const [expandedSection, setExpandedSection] = useState('features');

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="about-page">
      <div className="about-hero">
        <div className="about-hero-content">
          <h1>{t('about.heroTitle')}</h1>
          <p className="about-subtitle">
            {t('about.heroSubtitle')}
          </p>
        </div>
      </div>

      <div className="about-content">
        <section className="about-section">
          <div className="about-section-icon">🎯</div>
          <h2>{t('about.missionTitle')}</h2>
          <p>
            {t('about.missionText')}
          </p>
        </section>

        <section className="about-section collapsible">
          <div
            className="section-header"
            onClick={() => toggleSection('features')}
          >
            <div className="about-section-icon">✨</div>
            <h2>{t('about.featuresTitle')}</h2>
            <span className={`toggle-arrow ${expandedSection === 'features' ? 'open' : ''}`}>▼</span>
          </div>
          {expandedSection === 'features' && (
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🎲</div>
              <h3>{t('about.feature1Title')}</h3>
              <p>{t('about.feature1Text')}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🗺️</div>
              <h3>{t('about.feature2Title')}</h3>
              <p>{t('about.feature2Text')}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💬</div>
              <h3>{t('about.feature3Title')}</h3>
              <p>{t('about.feature3Text')}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⭐</div>
              <h3>{t('about.feature4Title')}</h3>
              <p>{t('about.feature4Text')}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>{t('about.feature5Title')}</h3>
              <p>{t('about.feature5Text')}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔔</div>
              <h3>{t('about.feature6Title')}</h3>
              <p>{t('about.feature6Text')}</p>
            </div>
          </div>
          )}
        </section>

        <section className="about-section collapsible">
          <div
            className="section-header"
            onClick={() => toggleSection('why')}
          >
            <div className="about-section-icon">🚀</div>
            <h2>{t('about.whyTitle')}</h2>
            <span className={`toggle-arrow ${expandedSection === 'why' ? 'open' : ''}`}>▼</span>
          </div>
          {expandedSection === 'why' && (
          <div className="why-us-list">
            <div className="why-us-item">
              <span className="why-us-number">1</span>
              <div>
                <h4>{t('about.why1Title')}</h4>
                <p>{t('about.why1Text')}</p>
              </div>
            </div>
            <div className="why-us-item">
              <span className="why-us-number">2</span>
              <div>
                <h4>{t('about.why2Title')}</h4>
                <p>{t('about.why2Text')}</p>
              </div>
            </div>
            <div className="why-us-item">
              <span className="why-us-number">3</span>
              <div>
                <h4>{t('about.why3Title')}</h4>
                <p>{t('about.why3Text')}</p>
              </div>
            </div>
            <div className="why-us-item">
              <span className="why-us-number">4</span>
              <div>
                <h4>{t('about.why4Title')}</h4>
                <p>{t('about.why4Text')}</p>
              </div>
            </div>
          </div>
          )}
        </section>

        <section className="about-section about-cta">
          {user ? (
            <>
              <h2>{t('about.ctaLoggedInTitle')}</h2>
              <p>
                {t('about.ctaLoggedInText')}
              </p>
              <div className="cta-buttons">
                <a href="/create-event" className="btn-primary">
                  {t('about.createEventBtn')}
                </a>
                <a href="/events" className="btn-secondary">
                  {t('about.findEventsBtn')}
                </a>
              </div>
            </>
          ) : (
            <>
              <h2>{t('about.ctaGuestTitle')}</h2>
              <p>
                {t('about.ctaGuestText')}
              </p>
              <div className="cta-buttons">
                <a href="/register" className="btn-primary">
                  {t('about.registerBtn')}
                </a>
                <a href="/events" className="btn-secondary">
                  {t('about.viewEventsBtn')}
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

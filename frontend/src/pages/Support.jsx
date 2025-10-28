import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import './Support.css';

const Support = () => {
  const { t } = useTranslation('common');
  const navigate = useNavigate();

  const supportSections = [
    {
      title: t('nav.about') || 'О нас',
      description: 'Узнайте больше о нашей платформе, миссии и команде',
      icon: '📖',
      path: '/about'
    },
    {
      title: t('nav.contacts') || 'Контакты',
      description: 'Свяжитесь с нами для вопросов и предложений',
      icon: '📧',
      path: '/contacts'
    },
    {
      title: t('nav.rules') || 'Правила',
      description: 'Ознакомьтесь с правилами использования платформы',
      icon: '📋',
      path: '/rules'
    }
  ];

  return (
    <div className="support-page">
      <div className="support-hero">
        <h1>Поддержка и помощь</h1>
        <p>Выберите раздел для получения информации</p>
      </div>

      <div className="support-grid">
        {supportSections.map((section, index) => (
          <div
            key={index}
            className="support-card"
            onClick={() => navigate(section.path)}
          >
            <div className="support-card-icon">{section.icon}</div>
            <h3>{section.title}</h3>
            <p>{section.description}</p>
            <button className="support-card-button">
              Перейти <i className="fas fa-arrow-right"></i>
            </button>
          </div>
        ))}
      </div>

      <div className="support-faq">
        <h2>Часто задаваемые вопросы</h2>
        <div className="faq-item">
          <h4>Как создать событие?</h4>
          <p>Перейдите в раздел "События" и нажмите кнопку "Создать событие". Заполните форму с описанием, датой, местом и другими деталями.</p>
        </div>
        <div className="faq-item">
          <h4>Как присоединиться к событию?</h4>
          <p>Откройте страницу события и нажмите кнопку "Присоединиться". Вы получите уведомление о подтверждении участия.</p>
        </div>
        <div className="faq-item">
          <h4>Как связаться с организатором?</h4>
          <p>На странице события доступен чат, где вы можете общаться с организатором и другими участниками.</p>
        </div>
      </div>
    </div>
  );
};

export default Support;

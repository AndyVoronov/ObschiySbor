import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import './Support.css';

const Support = () => {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const isRussian = i18n.language === 'ru';

  const supportSections = [
    {
      title: isRussian ? 'О нас' : 'About Us',
      description: isRussian
        ? 'Узнайте больше о нашей платформе, миссии и команде'
        : 'Learn more about our platform, mission and team',
      icon: '📖',
      path: '/about'
    },
    {
      title: isRussian ? 'Контакты' : 'Contacts',
      description: isRussian
        ? 'Свяжитесь с нами для вопросов и предложений'
        : 'Contact us for questions and suggestions',
      icon: '📧',
      path: '/contacts'
    },
    {
      title: isRussian ? 'Правила' : 'Rules',
      description: isRussian
        ? 'Ознакомьтесь с правилами использования платформы'
        : 'Read the platform usage rules',
      icon: '📋',
      path: '/rules'
    }
  ];

  return (
    <div className="support-page">
      <div className="support-hero">
        <h1>{isRussian ? 'Поддержка и помощь' : 'Support & Help'}</h1>
        <p>{isRussian ? 'Выберите раздел для получения информации' : 'Select a section to get information'}</p>
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
              {isRussian ? 'Перейти' : 'Go to'} <i className="fas fa-arrow-right"></i>
            </button>
          </div>
        ))}
      </div>

      <div className="support-faq">
        <h2>{isRussian ? 'Часто задаваемые вопросы' : 'Frequently Asked Questions'}</h2>
        <div className="faq-item">
          <h4>{isRussian ? 'Как создать событие?' : 'How to create an event?'}</h4>
          <p>{isRussian
            ? 'Перейдите в раздел "События" и нажмите кнопку "Создать событие". Заполните форму с описанием, датой, местом и другими деталями.'
            : 'Go to the "Events" section and click the "Create Event" button. Fill out the form with description, date, location and other details.'}
          </p>
        </div>
        <div className="faq-item">
          <h4>{isRussian ? 'Как присоединиться к событию?' : 'How to join an event?'}</h4>
          <p>{isRussian
            ? 'Откройте страницу события и нажмите кнопку "Присоединиться". Вы получите уведомление о подтверждении участия.'
            : 'Open the event page and click the "Join" button. You will receive a notification confirming your participation.'}
          </p>
        </div>
        <div className="faq-item">
          <h4>{isRussian ? 'Как связаться с организатором?' : 'How to contact the organizer?'}</h4>
          <p>{isRussian
            ? 'На странице события доступен чат, где вы можете общаться с организатором и другими участниками.'
            : 'The event page has a chat where you can communicate with the organizer and other participants.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Support;

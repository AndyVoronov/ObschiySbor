import './Contacts.css';

const Contacts = () => {
  return (
    <div className="contacts-page">
      <div className="contacts-hero">
        <div className="contacts-hero-content">
          <h1>📞 Свяжитесь с нами</h1>
          <p className="contacts-subtitle">
            Мы всегда рады ответить на ваши вопросы
          </p>
        </div>
      </div>

      <div className="contacts-content">
        <div className="contacts-grid">
          <div className="contact-card">
            <div className="contact-icon">💬</div>
            <h3>Telegram</h3>
            <p>Свяжитесь с создателем проекта</p>
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
            <h3>Сообщить об ошибке</h3>
            <p>Нашли баг? Дайте нам знать!</p>
            <a
              href="https://t.me/VoronovAndrey"
              target="_blank"
              rel="noopener noreferrer"
              className="contact-link"
            >
              Написать в Telegram
            </a>
          </div>

          <div className="contact-card">
            <div className="contact-icon">💡</div>
            <h3>Предложения</h3>
            <p>Есть идея? Поделитесь с нами</p>
            <a
              href="https://t.me/VoronovAndrey"
              target="_blank"
              rel="noopener noreferrer"
              className="contact-link"
            >
              Написать в Telegram
            </a>
          </div>
        </div>

        <div className="faq-section">
          <h2>Часто задаваемые вопросы</h2>
          <div className="faq-list">
            <div className="faq-item">
              <h4>❓ Как создать событие?</h4>
              <p>
                Зарегистрируйтесь на платформе, перейдите в раздел "События"
                и нажмите кнопку "Создать". Заполните форму с деталями события,
                выберите место на карте и опубликуйте!
              </p>
            </div>

            <div className="faq-item">
              <h4>❓ Как присоединиться к событию?</h4>
              <p>
                Найдите интересное событие через поиск или карту, откройте страницу
                события и нажмите кнопку "Присоединиться". После этого вы получите
                доступ к чату участников.
              </p>
            </div>

            <div className="faq-item">
              <h4>❓ Платформа бесплатная?</h4>
              <p>
                Да! Все основные функции платформы доступны бесплатно для всех пользователей.
                Вы можете создавать события, присоединяться к ним, общаться в чатах и
                оставлять отзывы без каких-либо ограничений.
              </p>
            </div>

            <div className="faq-item">
              <h4>❓ Как работает модерация?</h4>
              <p>
                Мы следим за качеством контента на платформе. Пользователи могут
                сообщать о нарушениях, и наша команда оперативно реагирует на жалобы.
                Соблюдайте правила сообщества, и всё будет отлично!
              </p>
            </div>
          </div>
        </div>

        <div className="contact-form-section">
          <h2>Напишите нам</h2>
          <p className="form-description">
            Если у вас есть вопросы, предложения или вы столкнулись с проблемой,
            свяжитесь с нами через Telegram — мы ответим как можно скорее!
          </p>
          <div className="telegram-cta">
            <a
              href="https://t.me/VoronovAndrey"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-telegram"
            >
              <span className="telegram-icon">📱</span>
              Написать в Telegram
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contacts;

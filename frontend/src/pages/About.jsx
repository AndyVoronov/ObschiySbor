import { useAuth } from '../contexts/AuthContext';
import './About.css';

const About = () => {
  const { user } = useAuth();

  return (
    <div className="about-page">
      <div className="about-hero">
        <div className="about-hero-content">
          <h1>🎉 О проекте "Общий сбор!"</h1>
          <p className="about-subtitle">
            Платформа для организации и поиска интересных событий
          </p>
        </div>
      </div>

      <div className="about-content">
        <section className="about-section">
          <div className="about-section-icon">🎯</div>
          <h2>Наша миссия</h2>
          <p>
            Мы создали "Общий сбор!", чтобы объединять людей вокруг общих интересов.
            Наша цель — сделать организацию и поиск событий максимально простыми и удобными.
            От настольных игр до походов, от кулинарных мастер-классов до велопрогулок —
            здесь каждый найдёт что-то для себя.
          </p>
        </section>

        <section className="about-section">
          <div className="about-section-icon">✨</div>
          <h2>Что мы предлагаем</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🎲</div>
              <h3>20+ категорий</h3>
              <p>Настольные игры, походы, велопрогулки, йога, кулинария и многое другое</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🗺️</div>
              <h3>Интерактивные карты</h3>
              <p>Выбирайте место встречи прямо на карте и находите события рядом</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💬</div>
              <h3>Real-time чаты</h3>
              <p>Общайтесь с участниками в режиме реального времени</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⭐</div>
              <h3>Рейтинги и отзывы</h3>
              <p>Делитесь впечатлениями и выбирайте лучшие события</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Дашборд организатора</h3>
              <p>Управляйте своими событиями и следите за статистикой</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔔</div>
              <h3>Уведомления</h3>
              <p>Будьте в курсе всех обновлений по вашим событиям</p>
            </div>
          </div>
        </section>

        <section className="about-section">
          <div className="about-section-icon">🚀</div>
          <h2>Почему "Общий сбор!"?</h2>
          <div className="why-us-list">
            <div className="why-us-item">
              <span className="why-us-number">1</span>
              <div>
                <h4>Простота использования</h4>
                <p>Интуитивный интерфейс, понятный даже новичкам</p>
              </div>
            </div>
            <div className="why-us-item">
              <span className="why-us-number">2</span>
              <div>
                <h4>Безопасность</h4>
                <p>Проверенные пользователи и модерация контента</p>
              </div>
            </div>
            <div className="why-us-item">
              <span className="why-us-number">3</span>
              <div>
                <h4>Сообщество</h4>
                <p>Тысячи активных пользователей, готовых к новым знакомствам</p>
              </div>
            </div>
            <div className="why-us-item">
              <span className="why-us-number">4</span>
              <div>
                <h4>Бесплатно</h4>
                <p>Основные функции доступны всем пользователям без ограничений</p>
              </div>
            </div>
          </div>
        </section>

        <section className="about-section about-cta">
          {user ? (
            <>
              <h2>Спасибо, что с нами! 💙</h2>
              <p>
                Мы рады, что вы используете "Общий сбор!" для организации своего досуга.
                Продолжайте создавать события, находить единомышленников и открывать
                для себя новые возможности каждый день!
              </p>
              <div className="cta-buttons">
                <a href="/create-event" className="btn-primary">
                  Создать событие
                </a>
                <a href="/events" className="btn-secondary">
                  Найти события
                </a>
              </div>
            </>
          ) : (
            <>
              <h2>Присоединяйтесь к нам!</h2>
              <p>
                Создавайте события, находите единомышленников и открывайте для себя
                новые возможности каждый день.
              </p>
              <div className="cta-buttons">
                <a href="/register" className="btn-primary">
                  Зарегистрироваться
                </a>
                <a href="/events" className="btn-secondary">
                  Посмотреть события
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

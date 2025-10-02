import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Home.css';

const Home = () => {
  const { user } = useAuth();

  return (
    <div className="home">
      <section className="hero">
        <h1>Добро пожаловать в ObschiySbor</h1>
        <p className="hero-subtitle">
          Платформа для организации и поиска мероприятий по интересам
        </p>
        <div className="hero-buttons">
          <Link to="/events" className="btn btn-primary">
            Найти событие
          </Link>
          <Link to="/create-event" className="btn btn-secondary">
            Создать событие
          </Link>
        </div>
      </section>

      <section className="features">
        <h2>Категории мероприятий</h2>
        <div className="feature-grid">
          <div className="feature-card">
            <h3>🎲 Настольные игры</h3>
            <p>Собирайте компанию для игр в настолки</p>
          </div>
          <div className="feature-card">
            <h3>🚴 Велопрогулки</h3>
            <p>Организуйте совместные велопоездки</p>
          </div>
          <div className="feature-card">
            <h3>🏔️ Походы</h3>
            <p>Найдите попутчиков для пеших маршрутов</p>
          </div>
          <div className="feature-card">
            <h3>🧘 Йога-сессии</h3>
            <p>Практикуйте йогу в компании единомышленников</p>
          </div>
          <div className="feature-card">
            <h3>👨‍🍳 Кулинарные мастер-классы</h3>
            <p>Учитесь готовить вместе с профессионалами</p>
          </div>
          <div className="feature-card">
            <h3>🎸 Музыкальные джемы</h3>
            <p>Играйте музыку с другими музыкантами</p>
          </div>
          <div className="feature-card">
            <h3>📚 Образовательные семинары</h3>
            <p>Развивайтесь и получайте новые знания</p>
          </div>
          <div className="feature-card">
            <h3>🧺 Пикники</h3>
            <p>Отдыхайте на природе с друзьями</p>
          </div>
          <div className="feature-card">
            <h3>📷 Фотопрогулки</h3>
            <p>Делитесь опытом фотосъёмки</p>
          </div>
          <div className="feature-card">
            <h3>🗝️ Квесты</h3>
            <p>Проходите увлекательные квесты</p>
          </div>
          <div className="feature-card">
            <h3>💃 Танцевальные уроки</h3>
            <p>Учитесь танцевать в группе</p>
          </div>
          <div className="feature-card">
            <h3>🚶 Городские экскурсии</h3>
            <p>Открывайте город с новой стороны</p>
          </div>
          <div className="feature-card">
            <h3>🤝 Волонтёрские акции</h3>
            <p>Помогайте вместе делать мир лучше</p>
          </div>
          <div className="feature-card">
            <h3>💪 Фитнес-тренировки</h3>
            <p>Тренируйтесь в компании</p>
          </div>
          <div className="feature-card">
            <h3>🎭 Театральные постановки</h3>
            <p>Посещайте спектакли вместе</p>
          </div>
          <div className="feature-card">
            <h3>🚗 Авто-туры</h3>
            <p>Путешествуйте на автомобилях</p>
          </div>
          <div className="feature-card">
            <h3>✂️ Ремесленные мастер-классы</h3>
            <p>Создавайте handmade изделия</p>
          </div>
          <div className="feature-card">
            <h3>🎤 Концерты</h3>
            <p>Наслаждайтесь живой музыкой</p>
          </div>
          <div className="feature-card">
            <h3>⚽ Спортивные матчи</h3>
            <p>Играйте и болейте за команды</p>
          </div>
          <div className="feature-card">
            <h3>🌿 Экологические туры</h3>
            <p>Познавайте природу и помогайте экологии</p>
          </div>
        </div>
      </section>

      {!user && (
        <section className="cta">
          <h2>Начните сегодня</h2>
          <p>Присоединяйтесь к сообществу активных людей</p>
          <Link to="/register" className="btn btn-primary">
            Зарегистрироваться
          </Link>
        </section>
      )}
    </div>
  );
};

export default Home;

import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Carousel from '../components/Carousel';
import './Home.css';

const Home = () => {
  const { user } = useAuth();

  const categories = [
    {
      icon: '🎲',
      title: 'Настольные игры',
      desc: 'Собирайте компанию для игр в настолки',
      color: '#FF6B6B',
      categoryKey: 'board_games'
    },
    {
      icon: '🚴',
      title: 'Велопрогулки',
      desc: 'Организуйте совместные велопоездки',
      color: '#4ECDC4',
      categoryKey: 'cycling'
    },
    { icon: '🏔️', title: 'Походы', desc: 'Найдите попутчиков для пеших маршрутов', color: '#45B7D1', categoryKey: 'hiking' },
    {
      icon: '🧘',
      title: 'Йога-сессии',
      desc: 'Практикуйте йогу в компании единомышленников',
      color: '#FFA07A',
      categoryKey: 'yoga'
    },
    {
      icon: '👨‍🍳',
      title: 'Кулинарные мастер-классы',
      desc: 'Учитесь готовить вместе с профессионалами',
      color: '#96CEB4',
      categoryKey: 'cooking'
    },
    {
      icon: '🎸',
      title: 'Музыкальные джемы',
      desc: 'Играйте музыку с другими музыкантами',
      color: '#DFE6E9',
      categoryKey: 'music_jam'
    },
    {
      icon: '📚',
      title: 'Образовательные семинары',
      desc: 'Развивайтесь и получайте новые знания',
      color: '#A29BFE',
      categoryKey: 'seminar'
    },
    { icon: '🧺', title: 'Пикники', desc: 'Отдыхайте на природе с друзьями', color: '#FD79A8', categoryKey: 'picnic' },
    {
      icon: '📷',
      title: 'Фотопрогулки',
      desc: 'Делитесь опытом фотосъёмки',
      color: '#FDCB6E',
      categoryKey: 'photo_walk'
    },
    { icon: '🗝️', title: 'Квесты', desc: 'Проходите увлекательные квесты', color: '#6C5CE7', categoryKey: 'quest' },
    {
      icon: '💃',
      title: 'Танцевальные уроки',
      desc: 'Учитесь танцевать в группе',
      color: '#E17055',
      categoryKey: 'dance'
    },
    {
      icon: '🚶',
      title: 'Городские экскурсии',
      desc: 'Открывайте город с новой стороны',
      color: '#00B894',
      categoryKey: 'tour'
    },
    {
      icon: '🤝',
      title: 'Волонтёрские акции',
      desc: 'Помогайте вместе делать мир лучше',
      color: '#00CEC9',
      categoryKey: 'volunteer'
    },
    { icon: '💪', title: 'Фитнес-тренировки', desc: 'Тренируйтесь в компании', color: '#FF7675', categoryKey: 'fitness' },
    {
      icon: '🎭',
      title: 'Театральные постановки',
      desc: 'Посещайте спектакли вместе',
      color: '#74B9FF',
      categoryKey: 'theater'
    },
    { icon: '🚗', title: 'Авто-туры', desc: 'Путешествуйте на автомобилях', color: '#FAB1A0', categoryKey: 'auto_tour' },
    {
      icon: '✂️',
      title: 'Ремесленные мастер-классы',
      desc: 'Создавайте handmade изделия',
      color: '#FD79A8',
      categoryKey: 'craft'
    },
    { icon: '🎤', title: 'Концерты', desc: 'Наслаждайтесь живой музыкой', color: '#FDCB6E', categoryKey: 'concert' },
    {
      icon: '⚽',
      title: 'Спортивные матчи',
      desc: 'Играйте и болейте за команды',
      color: '#55EFC4',
      categoryKey: 'sports'
    },
    {
      icon: '🌿',
      title: 'Экологические туры',
      desc: 'Познавайте природу и помогайте экологии',
      color: '#81ECEC',
      categoryKey: 'eco_tour'
    }
  ];

  return (
    <div className="home">
      <section className="categories-section">
        <div className="categories-content">
          <div className="carousel-wrapper">
            <Carousel items={categories} baseWidth={400} autoplay={true} autoplayDelay={3000} pauseOnHover={true} loop={true} round={false} />
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;

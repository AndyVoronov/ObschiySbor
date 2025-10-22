import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import Carousel from '../components/Carousel';
import './Home.css';

const Home = () => {
  const { user } = useAuth();
  const { t } = useTranslation('common');

  const categories = [
    {
      icon: '🎲',
      title: t('categories.board_games'),
      desc: t('categories.board_games_desc'),
      color: '#FF6B6B',
      categoryKey: 'board_games'
    },
    {
      icon: '🚴',
      title: t('categories.cycling'),
      desc: t('categories.cycling_desc'),
      color: '#4ECDC4',
      categoryKey: 'cycling'
    },
    {
      icon: '🏔️',
      title: t('categories.hiking'),
      desc: t('categories.hiking_desc'),
      color: '#45B7D1',
      categoryKey: 'hiking'
    },
    {
      icon: '🧘',
      title: t('categories.yoga'),
      desc: t('categories.yoga_desc'),
      color: '#FFA07A',
      categoryKey: 'yoga'
    },
    {
      icon: '👨‍🍳',
      title: t('categories.cooking'),
      desc: t('categories.cooking_desc'),
      color: '#96CEB4',
      categoryKey: 'cooking'
    },
    {
      icon: '🎸',
      title: t('categories.music_jam'),
      desc: t('categories.music_jam_desc'),
      color: '#DFE6E9',
      categoryKey: 'music_jam'
    },
    {
      icon: '📚',
      title: t('categories.seminar'),
      desc: t('categories.seminar_desc'),
      color: '#A29BFE',
      categoryKey: 'seminar'
    },
    {
      icon: '🧺',
      title: t('categories.picnic'),
      desc: t('categories.picnic_desc'),
      color: '#FD79A8',
      categoryKey: 'picnic'
    },
    {
      icon: '📷',
      title: t('categories.photo_walk'),
      desc: t('categories.photo_walk_desc'),
      color: '#FDCB6E',
      categoryKey: 'photo_walk'
    },
    {
      icon: '🗝️',
      title: t('categories.quest'),
      desc: t('categories.quest_desc'),
      color: '#6C5CE7',
      categoryKey: 'quest'
    },
    {
      icon: '💃',
      title: t('categories.dance'),
      desc: t('categories.dance_desc'),
      color: '#E17055',
      categoryKey: 'dance'
    },
    {
      icon: '🚶',
      title: t('categories.tour'),
      desc: t('categories.tour_desc'),
      color: '#00B894',
      categoryKey: 'tour'
    },
    {
      icon: '🤝',
      title: t('categories.volunteer'),
      desc: t('categories.volunteer_desc'),
      color: '#00CEC9',
      categoryKey: 'volunteer'
    },
    {
      icon: '💪',
      title: t('categories.fitness'),
      desc: t('categories.fitness_desc'),
      color: '#FF7675',
      categoryKey: 'fitness'
    },
    {
      icon: '🎭',
      title: t('categories.theater'),
      desc: t('categories.theater_desc'),
      color: '#74B9FF',
      categoryKey: 'theater'
    },
    {
      icon: '🚗',
      title: t('categories.auto_tour'),
      desc: t('categories.auto_tour_desc'),
      color: '#FAB1A0',
      categoryKey: 'auto_tour'
    },
    {
      icon: '✂️',
      title: t('categories.craft'),
      desc: t('categories.craft_desc'),
      color: '#FD79A8',
      categoryKey: 'craft'
    },
    {
      icon: '🎤',
      title: t('categories.concert'),
      desc: t('categories.concert_desc'),
      color: '#FDCB6E',
      categoryKey: 'concert'
    },
    {
      icon: '⚽',
      title: t('categories.sports'),
      desc: t('categories.sports_desc'),
      color: '#55EFC4',
      categoryKey: 'sports'
    },
    {
      icon: '🌿',
      title: t('categories.eco_tour'),
      desc: t('categories.eco_tour_desc'),
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

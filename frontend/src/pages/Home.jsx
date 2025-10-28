import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import VoyageSlider from '../components/VoyageSlider';
import './Home.css';

const Home = () => {
  const { user } = useAuth();
  const { t } = useTranslation('common');

  const slides = [
    {
      icon: '🎲',
      title: t('categories.board_games'),
      subtitle: 'Игры',
      description: t('categories.board_games_desc'),
      color: '#FF6B6B',
      categoryKey: 'board_games',
      image: null // Will be added later
    },
    {
      icon: '🚴',
      title: t('categories.cycling'),
      subtitle: 'Спорт',
      description: t('categories.cycling_desc'),
      color: '#4ECDC4',
      categoryKey: 'cycling',
      image: null
    },
    {
      icon: '🏔️',
      title: t('categories.hiking'),
      subtitle: 'Приключения',
      description: t('categories.hiking_desc'),
      color: '#45B7D1',
      categoryKey: 'hiking',
      image: null
    },
    {
      icon: '🧘',
      title: t('categories.yoga'),
      subtitle: 'Здоровье',
      description: t('categories.yoga_desc'),
      color: '#FFA07A',
      categoryKey: 'yoga',
      image: null
    },
    {
      icon: '📷',
      title: t('categories.photo_walk'),
      subtitle: 'Искусство',
      description: t('categories.photo_walk_desc'),
      color: '#FDCB6E',
      categoryKey: 'photo_walk',
      image: null
    },
    {
      icon: '🎨',
      title: t('categories.craft'),
      subtitle: 'Творчество',
      description: t('categories.craft_desc'),
      color: '#FD79A8',
      categoryKey: 'craft',
      image: '/images/categories/Ремесленные мастер-классы.webp'
    },
    {
      icon: '☕',
      title: t('categories.picnic'),
      subtitle: 'Отдых',
      description: t('categories.picnic_desc'),
      color: '#96CEB4',
      categoryKey: 'picnic',
      image: null
    },
    {
      icon: '🎭',
      title: t('categories.theater'),
      subtitle: 'Культура',
      description: t('categories.theater_desc'),
      color: '#74B9FF',
      categoryKey: 'theater',
      image: null
    },
    {
      icon: '🎸',
      title: t('categories.music_jam'),
      subtitle: 'Музыка',
      description: t('categories.music_jam_desc'),
      color: '#A29BFE',
      categoryKey: 'music_jam',
      image: null
    },
    {
      icon: '🏃',
      title: t('categories.fitness'),
      subtitle: 'Фитнес',
      description: t('categories.fitness_desc'),
      color: '#FF7675',
      categoryKey: 'fitness',
      image: null
    },
    {
      icon: '💼',
      title: t('categories.volunteer'),
      subtitle: 'Общество',
      description: t('categories.volunteer_desc'),
      color: '#00CEC9',
      categoryKey: 'volunteer',
      image: null
    },
    {
      icon: '📚',
      title: t('categories.seminar'),
      subtitle: 'Обучение',
      description: t('categories.seminar_desc'),
      color: '#6C5CE7',
      categoryKey: 'seminar',
      image: null
    },
    {
      icon: '🍳',
      title: t('categories.cooking'),
      subtitle: 'Кулинария',
      description: t('categories.cooking_desc'),
      color: '#E17055',
      categoryKey: 'cooking',
      image: null
    },
    {
      icon: '🎮',
      title: t('categories.concert'),
      subtitle: 'Развлечения',
      description: t('categories.concert_desc'),
      color: '#FDCB6E',
      categoryKey: 'concert',
      image: '/images/categories/Концерты.webp'
    },
    {
      icon: '🏊',
      title: t('categories.sports'),
      subtitle: 'Активность',
      description: t('categories.sports_desc'),
      color: '#55EFC4',
      categoryKey: 'sports',
      image: '/images/categories/Спортивные матчи.webp'
    },
    {
      icon: '⛸️',
      title: t('categories.auto_tour'),
      subtitle: 'Путешествия',
      description: t('categories.auto_tour_desc'),
      color: '#FAB1A0',
      categoryKey: 'auto_tour',
      image: null
    },
    {
      icon: '🧗',
      title: t('categories.quest'),
      subtitle: 'Экстрим',
      description: t('categories.quest_desc'),
      color: '#00B894',
      categoryKey: 'quest',
      image: null
    },
    {
      icon: '🏐',
      title: t('categories.dance'),
      subtitle: 'Танцы',
      description: t('categories.dance_desc'),
      color: '#81ECEC',
      categoryKey: 'dance',
      image: null
    },
    {
      icon: '⚽',
      title: t('categories.tour'),
      subtitle: 'Экскурсии',
      description: t('categories.tour_desc'),
      color: '#FD79A8',
      categoryKey: 'tour',
      image: null
    },
    {
      icon: '🌿',
      title: t('categories.eco_tour'),
      subtitle: 'Природа',
      description: t('categories.eco_tour_desc'),
      color: '#4ECDC4',
      categoryKey: 'eco_tour',
      image: '/images/categories/Экологические туры.webp'
    }
  ];

  return (
    <div className="home">
      <VoyageSlider slides={slides} />
    </div>
  );
};

export default Home;

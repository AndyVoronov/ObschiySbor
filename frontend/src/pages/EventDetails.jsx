import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import EventMap from '../components/EventMap';
import Reviews from '../components/Reviews';
import ReviewForm from '../components/ReviewForm';
import { generateICS, generateGoogleCalendarLink } from '../utils/calendarExport';
import { notifyNewParticipant } from '../utils/notificationHelpers';
import './EventDetails.css';

const EventDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isParticipant, setIsParticipant] = useState(false);
  const [joining, setJoining] = useState(false);
  const [boardGames, setBoardGames] = useState([]);
  const [categoryRelatedData, setCategoryRelatedData] = useState(null);
  const reviewsRef = useRef(null);

  useEffect(() => {
    fetchEventDetails();
  }, [id, user]);

  const fetchEventDetails = async () => {
    try {
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select(`
          *,
          profiles:creator_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('id', id)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      // Загружаем настольные игры для события
      if (eventData.category === 'board_games') {
        const { data: gamesData } = await supabase
          .from('event_board_games')
          .select(`
            board_games (
              id,
              name,
              description,
              min_players,
              max_players,
              avg_playtime_minutes,
              image_url
            )
          `)
          .eq('event_id', id);

        if (gamesData) {
          setBoardGames(gamesData.map(item => item.board_games));
        }
      }

      // Загружаем данные справочников для других категорий
      if (eventData.category_data) {
        const relatedData = {};

        // Загружаем данные в зависимости от категории
        if (eventData.category === 'yoga' && eventData.category_data.yoga_practice_type_id) {
          const { data } = await supabase
            .from('yoga_practice_types')
            .select('name')
            .eq('id', eventData.category_data.yoga_practice_type_id)
            .single();
          if (data) relatedData.practice_type = data.name;
        }

        if (eventData.category === 'cooking' && eventData.category_data.cuisine_type_id) {
          const { data } = await supabase
            .from('cuisine_types')
            .select('name')
            .eq('id', eventData.category_data.cuisine_type_id)
            .single();
          if (data) relatedData.cuisine_type = data.name;
        }

        if (eventData.category === 'music_jam') {
          if (eventData.category_data.genre_id) {
            const { data } = await supabase
              .from('music_genres')
              .select('name')
              .eq('id', eventData.category_data.genre_id)
              .single();
            if (data) relatedData.genre = data.name;
          }

          const { data: instruments } = await supabase
            .from('event_musical_instruments')
            .select('musical_instruments(name)')
            .eq('event_id', id);
          if (instruments) relatedData.instruments = instruments.map(i => i.musical_instruments.name);
        }

        if (eventData.category === 'seminar' && eventData.category_data.topic_id) {
          const { data } = await supabase
            .from('seminar_topics')
            .select('name')
            .eq('id', eventData.category_data.topic_id)
            .single();
          if (data) relatedData.topic = data.name;
        }

        if (eventData.category === 'picnic' && eventData.category_data.picnic_type_id) {
          const { data } = await supabase
            .from('picnic_types')
            .select('name')
            .eq('id', eventData.category_data.picnic_type_id)
            .single();
          if (data) relatedData.picnic_type = data.name;
        }

        if (eventData.category === 'photo_walk') {
          if (eventData.category_data.theme_id) {
            const { data } = await supabase
              .from('photography_themes')
              .select('name')
              .eq('id', eventData.category_data.theme_id)
              .single();
            if (data) relatedData.theme = data.name;
          }

          const { data: equipment } = await supabase
            .from('event_photography_equipment')
            .select('photography_equipment(name)')
            .eq('event_id', id);
          if (equipment) relatedData.equipment = equipment.map(e => e.photography_equipment.name);
        }

        if (eventData.category === 'quest' && eventData.category_data.theme_id) {
          const { data } = await supabase
            .from('quest_themes')
            .select('name')
            .eq('id', eventData.category_data.theme_id)
            .single();
          if (data) relatedData.theme = data.name;
        }

        if (eventData.category === 'dance' && eventData.category_data.style_id) {
          const { data } = await supabase
            .from('dance_styles')
            .select('name')
            .eq('id', eventData.category_data.style_id)
            .single();
          if (data) relatedData.style = data.name;
        }

        if (eventData.category === 'volunteer') {
          if (eventData.category_data.activity_type_id) {
            const { data } = await supabase
              .from('volunteer_activity_types')
              .select('name')
              .eq('id', eventData.category_data.activity_type_id)
              .single();
            if (data) relatedData.activity_type = data.name;
          }

          const { data: skills } = await supabase
            .from('event_volunteer_skills')
            .select('volunteer_skills(name)')
            .eq('event_id', id);
          if (skills) relatedData.skills = skills.map(s => s.volunteer_skills.name);
        }

        if (eventData.category === 'fitness' && eventData.category_data.workout_type_id) {
          const { data } = await supabase
            .from('fitness_workout_types')
            .select('name')
            .eq('id', eventData.category_data.workout_type_id)
            .single();
          if (data) relatedData.workout_type = data.name;
        }

        if (eventData.category === 'theater' && eventData.category_data.genre_id) {
          const { data } = await supabase
            .from('theater_genres')
            .select('name')
            .eq('id', eventData.category_data.genre_id)
            .single();
          if (data) relatedData.genre = data.name;
        }

        if (eventData.category === 'craft') {
          if (eventData.category_data.craft_type_id) {
            const { data } = await supabase
              .from('craft_types')
              .select('name')
              .eq('id', eventData.category_data.craft_type_id)
              .single();
            if (data) relatedData.craft_type = data.name;
          }

          const { data: materials } = await supabase
            .from('event_craft_materials')
            .select('craft_materials(name)')
            .eq('event_id', id);
          if (materials) relatedData.materials = materials.map(m => m.craft_materials.name);
        }

        if (eventData.category === 'concert' && eventData.category_data.genre_id) {
          const { data } = await supabase
            .from('music_genres')
            .select('name')
            .eq('id', eventData.category_data.genre_id)
            .single();
          if (data) relatedData.genre = data.name;
        }

        if (eventData.category === 'sports' && eventData.category_data.sport_type_id) {
          const { data } = await supabase
            .from('sports_types')
            .select('name')
            .eq('id', eventData.category_data.sport_type_id)
            .single();
          if (data) relatedData.sport_type = data.name;
        }

        if (eventData.category === 'eco_tour' && eventData.category_data.tour_type_id) {
          const { data } = await supabase
            .from('eco_tour_types')
            .select('name')
            .eq('id', eventData.category_data.tour_type_id)
            .single();
          if (data) relatedData.tour_type = data.name;
        }

        setCategoryRelatedData(relatedData);
      }

      if (user) {
        const { data: participantData } = await supabase
          .from('event_participants')
          .select('*')
          .eq('event_id', id)
          .eq('user_id', user.id)
          .single();

        setIsParticipant(!!participantData);
      }
    } catch (error) {
      console.error('Ошибка загрузки события:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinEvent = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    setJoining(true);
    try {
      // Проверка фильтра по полу
      if (event.gender_filter && event.gender_filter !== 'all') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('gender')
          .eq('id', user.id)
          .single();

        if (!profile.gender) {
          alert('Пожалуйста, укажите ваш пол в профиле для участия в этом событии');
          navigate('/profile');
          return;
        }

        if (event.gender_filter !== profile.gender) {
          const genderLabels = {
            male: 'только для мужчин',
            female: 'только для женщин'
          };
          alert(`Это событие ${genderLabels[event.gender_filter]}`);
          setJoining(false);
          return;
        }
      }

      const { error } = await supabase
        .from('event_participants')
        .insert([{
          event_id: id,
          user_id: user.id,
          status: 'joined',
        }]);

      if (error) throw error;

      // Обновляем количество участников с использованием SQL инкремента
      const { error: updateError } = await supabase.rpc('increment_participants', {
        event_id: id
      });

      // Если RPC функция не существует, используем обычное обновление
      if (updateError && updateError.code === '42883') {
        await supabase
          .from('events')
          .update({ current_participants: event.current_participants + 1 })
          .eq('id', id);
      } else if (updateError) {
        throw updateError;
      }

      // Получаем имя текущего пользователя для уведомления
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const participantName = profileData?.full_name || 'Новый участник';

      // Отправляем уведомление организатору
      await notifyNewParticipant(id, event.creator_id, participantName);

      setIsParticipant(true);
      fetchEventDetails();
    } catch (error) {
      console.error('Ошибка присоединения к событию:', error.message);
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveEvent = async () => {
    setJoining(true);
    try {
      const { error } = await supabase
        .from('event_participants')
        .delete()
        .eq('event_id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Обновляем количество участников с использованием SQL декремента
      const { error: updateError } = await supabase.rpc('decrement_participants', {
        event_id: id
      });

      // Если RPC функция не существует, используем обычное обновление
      if (updateError && updateError.code === '42883') {
        await supabase
          .from('events')
          .update({ current_participants: event.current_participants - 1 })
          .eq('id', id);
      } else if (updateError) {
        throw updateError;
      }

      setIsParticipant(false);
      fetchEventDetails();
    } catch (error) {
      console.error('Ошибка выхода из события:', error.message);
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  if (!event) {
    return <div className="error">Событие не найдено</div>;
  }

  const getCategoryName = (category) => {
    const categories = {
      board_games: '🎲 Настольные игры',
      cycling: '🚴 Велопрогулки',
      hiking: '🏔️ Походы',
      yoga: '🧘 Йога-сессии',
      cooking: '👨‍🍳 Кулинарные мастер-классы',
      music_jam: '🎸 Музыкальные джемы',
      seminar: '📚 Образовательные семинары',
      picnic: '🧺 Пикники в парке',
      photo_walk: '📷 Фотопрогулки',
      quest: '🗝️ Квесты',
      dance: '💃 Танцевальные уроки',
      tour: '🚶 Городские экскурсии',
      volunteer: '🤝 Волонтёрские акции',
      fitness: '💪 Фитнес-тренировки',
      theater: '🎭 Театральные постановки',
      auto_tour: '🚗 Авто-туры',
      craft: '✂️ Ремесленные мастер-классы',
      concert: '🎤 Концерты',
      sports: '⚽ Спортивные матчи',
      eco_tour: '🌿 Экологические туры',
    };
    return categories[category] || category;
  };

  const isFull = event.current_participants >= event.max_participants;
  const isCreator = user?.id === event.creator_id;

  const handleExportToCalendar = () => {
    generateICS(event);
  };

  const handleAddToGoogleCalendar = () => {
    const url = generateGoogleCalendarLink(event);
    window.open(url, '_blank');
  };

  const handleReviewAdded = () => {
    // Обновляем компонент отзывов после добавления нового
    if (reviewsRef.current) {
      reviewsRef.current.fetchReviews();
    }
  };

  // Проверяем, завершилось ли событие
  const isEventCompleted = new Date(event?.event_date) < new Date();

  return (
    <div className="event-details">
      {event.image_url && (
        <img src={event.image_url} alt={event.title} className="event-detail-image" />
      )}

      <div className="event-detail-content">
        <div className="event-header">
          <h1>{event.title}</h1>
          <span className="event-category-badge">{getCategoryName(event.category)}</span>
        </div>

        <div className="event-info">
          <div className="info-item">
            <strong>Начало:</strong>
            <span>{new Date(event.event_date).toLocaleString('ru-RU')}</span>
          </div>
          {event.has_end_date && event.end_date && (
            <div className="info-item">
              <strong>Окончание:</strong>
              <span>{new Date(event.end_date).toLocaleString('ru-RU')}</span>
            </div>
          )}
          {!event.has_end_date && (
            <div className="info-item">
              <strong>Окончание:</strong>
              <span className="text-muted">Без точной даты окончания</span>
            </div>
          )}
          <div className="info-item">
            <strong>Место:</strong>
            <span>{event.location}</span>
          </div>
          <div className="info-item">
            <strong>Участники:</strong>
            <span>{event.current_participants}/{event.max_participants}</span>
          </div>
          <div className="info-item">
            <strong>Организатор:</strong>
            <span>{event.profiles?.full_name || 'Неизвестно'}</span>
          </div>
          {event.gender_filter && event.gender_filter !== 'all' && (
            <div className="info-item">
              <strong>Кто может участвовать:</strong>
              <span className="gender-filter-badge">
                {event.gender_filter === 'male' && '👨 Только мужчины'}
                {event.gender_filter === 'female' && '👩 Только женщины'}
              </span>
            </div>
          )}
        </div>

        <div className="event-description">
          <h2>Описание</h2>
          <p>{event.description}</p>
        </div>

        {/* Отображение настольных игр */}
        {event.category === 'board_games' && boardGames.length > 0 && (
          <div className="board-games-section">
            <h2>Настольные игры</h2>
            <div className="board-games-list">
              {boardGames.map(game => (
                <Link key={game.id} to={`/board-games/${game.id}`} className="board-game-card">
                  {game.image_url && (
                    <img src={game.image_url} alt={game.name} className="board-game-image" />
                  )}
                  <div className="board-game-info">
                    <h3>{game.name}</h3>
                    {game.description && <p className="game-description">{game.description}</p>}
                    <div className="game-meta">
                      <span>👥 {game.min_players}-{game.max_players} игроков</span>
                      <span>⏱️ ~{game.avg_playtime_minutes} мин</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <EventMap
          latitude={event.latitude}
          longitude={event.longitude}
          location={event.location}
          eventTitle={event.title}
        />

        {event.category_data && event.category !== 'board_games' && (
          <div className="category-details">
            <h2>Детали</h2>
            {event.category === 'cycling' && (
              <>
                {event.category_data.difficulty && (
                  <p><strong>Сложность:</strong> {event.category_data.difficulty}</p>
                )}
                {event.category_data.route && (
                  <p><strong>Маршрут:</strong> {event.category_data.route}</p>
                )}
                {event.category_data.equipment && (
                  <p><strong>Снаряжение:</strong> {event.category_data.equipment}</p>
                )}
              </>
            )}
            {event.category === 'hiking' && (
              <>
                {event.category_data.distance && (
                  <p><strong>Дистанция:</strong> {event.category_data.distance} км</p>
                )}
                {event.category_data.terrain && (
                  <p><strong>Местность:</strong> {event.category_data.terrain}</p>
                )}
                {event.category_data.equipment && (
                  <p><strong>Снаряжение:</strong> {event.category_data.equipment}</p>
                )}
              </>
            )}
            {event.category === 'yoga' && (
              <>
                {categoryRelatedData?.practice_type && (
                  <p><strong>Тип практики:</strong> {categoryRelatedData.practice_type}</p>
                )}
                {event.category_data.difficulty && (
                  <p><strong>Уровень:</strong> {event.category_data.difficulty === 'beginner' ? 'Начинающий' : event.category_data.difficulty === 'intermediate' ? 'Средний' : 'Продвинутый'}</p>
                )}
                {event.category_data.equipment_needed?.length > 0 && (
                  <p><strong>Оборудование:</strong> {event.category_data.equipment_needed.join(', ')}</p>
                )}
              </>
            )}
            {event.category === 'cooking' && (
              <>
                {categoryRelatedData?.cuisine_type && (
                  <p><strong>Кухня:</strong> {categoryRelatedData.cuisine_type}</p>
                )}
                {event.category_data.skill_level && (
                  <p><strong>Уровень:</strong> {event.category_data.skill_level === 'beginner' ? 'Начинающий' : 'Опытный'}</p>
                )}
              </>
            )}
            {event.category === 'music_jam' && (
              <>
                {categoryRelatedData?.genre && (
                  <p><strong>Жанр:</strong> {categoryRelatedData.genre}</p>
                )}
                {categoryRelatedData?.instruments?.length > 0 && (
                  <p><strong>Инструменты:</strong> {categoryRelatedData.instruments.join(', ')}</p>
                )}
                {event.category_data.performer_level && (
                  <p><strong>Уровень:</strong> {event.category_data.performer_level === 'amateur' ? 'Любитель' : 'Профессионал'}</p>
                )}
              </>
            )}
            {event.category === 'seminar' && (
              <>
                {categoryRelatedData?.topic && (
                  <p><strong>Тема:</strong> {categoryRelatedData.topic}</p>
                )}
                {event.category_data.format && (
                  <p><strong>Формат:</strong> {event.category_data.format === 'lecture' ? 'Лекция' : event.category_data.format === 'workshop' ? 'Воркшоп' : 'Дискуссия'}</p>
                )}
                {event.category_data.knowledge_level && (
                  <p><strong>Уровень знаний:</strong> {event.category_data.knowledge_level === 'basic' ? 'Базовый' : 'Продвинутый'}</p>
                )}
                {event.category_data.materials_needed?.length > 0 && (
                  <p><strong>Материалы:</strong> {event.category_data.materials_needed.join(', ')}</p>
                )}
              </>
            )}
            {event.category === 'picnic' && (
              <>
                {categoryRelatedData?.picnic_type && (
                  <p><strong>Тип пикника:</strong> {categoryRelatedData.picnic_type}</p>
                )}
                {event.category_data.weather_dependent && (
                  <p><strong>Место:</strong> {event.category_data.weather_dependent === 'covered' ? 'Крытое' : 'На открытом воздухе'}</p>
                )}
              </>
            )}
            {event.category === 'photo_walk' && (
              <>
                {categoryRelatedData?.theme && (
                  <p><strong>Тематика:</strong> {categoryRelatedData.theme}</p>
                )}
                {event.category_data.skill_level && (
                  <p><strong>Уровень:</strong> {event.category_data.skill_level === 'beginner' ? 'Начинающий' : 'Продвинутый'}</p>
                )}
                {categoryRelatedData?.equipment?.length > 0 && (
                  <p><strong>Оборудование:</strong> {categoryRelatedData.equipment.join(', ')}</p>
                )}
                {event.category_data.route && (
                  <p><strong>Маршрут:</strong> {event.category_data.route}</p>
                )}
              </>
            )}
            {event.category === 'quest' && (
              <>
                {categoryRelatedData?.theme && (
                  <p><strong>Тематика:</strong> {categoryRelatedData.theme}</p>
                )}
                {event.category_data.difficulty && (
                  <p><strong>Сложность:</strong> {event.category_data.difficulty === 'easy' ? 'Лёгкая' : event.category_data.difficulty === 'medium' ? 'Средняя' : 'Хардкор'}</p>
                )}
                {event.category_data.age_restriction && (
                  <p><strong>Возраст:</strong> {event.category_data.age_restriction}+</p>
                )}
              </>
            )}
            {event.category === 'dance' && (
              <>
                {categoryRelatedData?.style && (
                  <p><strong>Стиль:</strong> {categoryRelatedData.style}</p>
                )}
                {event.category_data.skill_level && (
                  <p><strong>Уровень:</strong> {event.category_data.skill_level === 'beginner' ? 'Начинающий' : event.category_data.skill_level === 'intermediate' ? 'Средний' : 'Продвинутый'}</p>
                )}
                {event.category_data.partner_type && (
                  <p><strong>Тип:</strong> {event.category_data.partner_type === 'partner' ? 'С партнёром' : 'Соло'}</p>
                )}
                {event.category_data.dress_code && (
                  <p><strong>Дресс-код:</strong> {event.category_data.dress_code}</p>
                )}
              </>
            )}
            {event.category === 'tour' && (
              <>
                {event.category_data.theme && (
                  <p><strong>Тематика:</strong> {event.category_data.theme === 'historical' ? 'Историческая' : event.category_data.theme === 'gastronomic' ? 'Гастрономическая' : 'Уличное искусство'}</p>
                )}
                {event.category_data.duration_hours && (
                  <p><strong>Длительность:</strong> {event.category_data.duration_hours} ч</p>
                )}
                {event.category_data.pace && (
                  <p><strong>Темп:</strong> {event.category_data.pace === 'slow' ? 'Медленный' : 'Активный'}</p>
                )}
                {event.category_data.accessibility?.length > 0 && (
                  <p><strong>Доступность:</strong> {event.category_data.accessibility.join(', ')}</p>
                )}
              </>
            )}
            {event.category === 'volunteer' && (
              <>
                {categoryRelatedData?.activity_type && (
                  <p><strong>Тип деятельности:</strong> {categoryRelatedData.activity_type}</p>
                )}
                {categoryRelatedData?.skills?.length > 0 && (
                  <p><strong>Навыки:</strong> {categoryRelatedData.skills.join(', ')}</p>
                )}
                {event.category_data.age_min && (
                  <p><strong>Минимальный возраст:</strong> {event.category_data.age_min}+</p>
                )}
                {event.category_data.equipment_needed?.length > 0 && (
                  <p><strong>Оборудование:</strong> {event.category_data.equipment_needed.join(', ')}</p>
                )}
              </>
            )}
            {event.category === 'fitness' && (
              <>
                {categoryRelatedData?.workout_type && (
                  <p><strong>Тип тренировки:</strong> {categoryRelatedData.workout_type}</p>
                )}
                {event.category_data.fitness_level && (
                  <p><strong>Уровень:</strong> {event.category_data.fitness_level === 'beginner' ? 'Начинающий' : 'Продвинутый'}</p>
                )}
                {event.category_data.duration_minutes && (
                  <p><strong>Длительность:</strong> {event.category_data.duration_minutes} мин</p>
                )}
                {event.category_data.equipment_needed?.length > 0 && (
                  <p><strong>Оборудование:</strong> {event.category_data.equipment_needed.join(', ')}</p>
                )}
              </>
            )}
            {event.category === 'theater' && (
              <>
                {categoryRelatedData?.genre && (
                  <p><strong>Жанр:</strong> {categoryRelatedData.genre}</p>
                )}
                {event.category_data.age_rating && (
                  <p><strong>Возрастной рейтинг:</strong> {event.category_data.age_rating}</p>
                )}
                {event.category_data.duration_minutes && (
                  <p><strong>Длительность:</strong> {event.category_data.duration_minutes} мин</p>
                )}
                {event.category_data.has_intermission && (
                  <p><strong>Антракт:</strong> Да</p>
                )}
              </>
            )}
            {event.category === 'auto_tour' && (
              <>
                {event.category_data.route_type && (
                  <p><strong>Тип маршрута:</strong> {event.category_data.route_type === 'city' ? 'Городской' : 'Оффроад'}</p>
                )}
                {event.category_data.driving_difficulty && (
                  <p><strong>Сложность:</strong> {event.category_data.driving_difficulty === 'easy' ? 'Лёгкая' : 'Сложная'}</p>
                )}
                {event.category_data.required_equipment?.length > 0 && (
                  <p><strong>Оборудование:</strong> {event.category_data.required_equipment.join(', ')}</p>
                )}
                {event.category_data.car_capacity && (
                  <p><strong>Вместимость:</strong> {event.category_data.car_capacity} чел</p>
                )}
              </>
            )}
            {event.category === 'craft' && (
              <>
                {categoryRelatedData?.craft_type && (
                  <p><strong>Тип ремесла:</strong> {categoryRelatedData.craft_type}</p>
                )}
                {categoryRelatedData?.materials?.length > 0 && (
                  <p><strong>Материалы:</strong> {categoryRelatedData.materials.join(', ')}</p>
                )}
                {event.category_data.skill_level && (
                  <p><strong>Уровень:</strong> {event.category_data.skill_level === 'beginner' ? 'Начинающий' : event.category_data.skill_level === 'intermediate' ? 'Средний' : 'Продвинутый'}</p>
                )}
                {event.category_data.final_product && (
                  <p><strong>Итоговый продукт:</strong> {event.category_data.final_product}</p>
                )}
              </>
            )}
            {event.category === 'concert' && (
              <>
                {categoryRelatedData?.genre && (
                  <p><strong>Жанр:</strong> {categoryRelatedData.genre}</p>
                )}
                {event.category_data.performer && (
                  <p><strong>Исполнитель:</strong> {event.category_data.performer}</p>
                )}
                {event.category_data.age_restriction && (
                  <p><strong>Возрастное ограничение:</strong> {event.category_data.age_restriction}</p>
                )}
              </>
            )}
            {event.category === 'sports' && (
              <>
                {categoryRelatedData?.sport_type && (
                  <p><strong>Вид спорта:</strong> {categoryRelatedData.sport_type}</p>
                )}
                {event.category_data.level && (
                  <p><strong>Уровень:</strong> {event.category_data.level === 'amateur' ? 'Любительский' : 'Профессиональный'}</p>
                )}
              </>
            )}
            {event.category === 'eco_tour' && (
              <>
                {categoryRelatedData?.tour_type && (
                  <p><strong>Тип тура:</strong> {categoryRelatedData.tour_type}</p>
                )}
                {event.category_data.equipment_needed?.length > 0 && (
                  <p><strong>Оборудование:</strong> {event.category_data.equipment_needed.join(', ')}</p>
                )}
              </>
            )}
          </div>
        )}

        <div className="calendar-actions">
          <h3>Добавить в календарь</h3>
          <div className="calendar-buttons">
            <button
              onClick={handleExportToCalendar}
              className="btn btn-secondary"
              title="Скачать файл .ics для любого календаря"
            >
              📅 Скачать .ics
            </button>
            <button
              onClick={handleAddToGoogleCalendar}
              className="btn btn-secondary"
              title="Открыть в Google Calendar"
            >
              📆 Google Calendar
            </button>
          </div>
        </div>

        {user && !isCreator && (
          <div className="event-actions">
            {isParticipant ? (
              <button
                onClick={handleLeaveEvent}
                className="btn btn-danger"
                disabled={joining}
              >
                {joining ? 'Выход...' : 'Покинуть событие'}
              </button>
            ) : (
              <button
                onClick={handleJoinEvent}
                className="btn btn-primary"
                disabled={joining || isFull}
              >
                {joining ? 'Присоединение...' : isFull ? 'Мест нет' : 'Присоединиться'}
              </button>
            )}
          </div>
        )}

        {/* Отзывы и форма для добавления отзыва */}
        {isEventCompleted && isParticipant && (
          <ReviewForm eventId={id} onReviewAdded={handleReviewAdded} />
        )}

        <Reviews ref={reviewsRef} eventId={id} />
      </div>
    </div>
  );
};

export default EventDetails;

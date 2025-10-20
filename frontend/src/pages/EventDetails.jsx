import { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useEvent, useBoardGames, useParticipation, useJoinEvent, useLeaveEvent } from '../hooks/useEvent';
import { EventMap, EventChat, MapLoadingFallback, ChatLoadingFallback } from '../components/LazyComponents';
import EventStatusBadge from '../components/EventStatusBadge';
import Reviews from '../components/Reviews';
import ReviewForm from '../components/ReviewForm';
import ReportButton from '../components/ReportButton';
import EventParticipants from '../components/EventParticipants';
import BlockedUserNotice from '../components/BlockedUserNotice';
import { generateICS, generateGoogleCalendarLink } from '../utils/calendarExport';
import { notifyNewParticipant } from '../utils/notificationHelpers';
import { getEventStatus, canCancelEvent, EVENT_STATUS } from '../utils/eventStatus';
import './EventDetails.css';

const EventDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // React Query hooks
  const { data: event, isLoading: loading, error: eventError } = useEvent(id);
  const { data: boardGames = [] } = useBoardGames(id, event?.category);
  const { data: isParticipant = false } = useParticipation(id, user?.id);
  const joinMutation = useJoinEvent();
  const leaveMutation = useLeaveEvent();

  // Local state
  const [categoryRelatedData, setCategoryRelatedData] = useState(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const reviewsRef = useRef(null);
  const [blockInfo, setBlockInfo] = useState(null);
  const [checkingBlock, setCheckingBlock] = useState(true);

  // Загрузка связанных данных для категорий
  useEffect(() => {
    if (event?.category_data) {
      fetchCategoryRelatedData();
    }
  }, [event]);

  // Проверка блокировки при загрузке
  useEffect(() => {
    const checkBlockStatus = async () => {
      if (!user) {
        setCheckingBlock(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('is_blocked, block_reason, blocked_at, blocked_until')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        setBlockInfo(profile);
      } catch (err) {
        console.error('Ошибка проверки блокировки:', err);
      } finally {
        setCheckingBlock(false);
      }
    };

    checkBlockStatus();
  }, [user]);

  // Функция загрузки связанных данных (справочники для категорий)
  const fetchCategoryRelatedData = async () => {
    if (!event?.category_data) return;

    try {
      const relatedData = {};

      // Загружаем данные в зависимости от категории
      if (event.category === 'yoga' && event.category_data.yoga_practice_type_id) {
          const { data } = await supabase
            .from('yoga_practice_types')
            .select('name')
            .eq('id', event.category_data.yoga_practice_type_id)
            .single();
          if (data) relatedData.practice_type = data.name;
        }

        if (event.category === 'cooking' && event.category_data.cuisine_type_id) {
          const { data } = await supabase
            .from('cuisine_types')
            .select('name')
            .eq('id', event.category_data.cuisine_type_id)
            .single();
          if (data) relatedData.cuisine_type = data.name;
        }

        if (event.category === 'music_jam') {
          if (event.category_data.genre_id) {
            const { data } = await supabase
              .from('music_genres')
              .select('name')
              .eq('id', event.category_data.genre_id)
              .single();
            if (data) relatedData.genre = data.name;
          }

          const { data: instruments } = await supabase
            .from('event_musical_instruments')
            .select('musical_instruments(name)')
            .eq('event_id', id);
          if (instruments) relatedData.instruments = instruments.map(i => i.musical_instruments.name);
        }

        if (event.category === 'seminar' && event.category_data.topic_id) {
          const { data } = await supabase
            .from('seminar_topics')
            .select('name')
            .eq('id', event.category_data.topic_id)
            .single();
          if (data) relatedData.topic = data.name;
        }

        if (event.category === 'picnic' && event.category_data.picnic_type_id) {
          const { data } = await supabase
            .from('picnic_types')
            .select('name')
            .eq('id', event.category_data.picnic_type_id)
            .single();
          if (data) relatedData.picnic_type = data.name;
        }

        if (event.category === 'photo_walk') {
          if (event.category_data.theme_id) {
            const { data } = await supabase
              .from('photography_themes')
              .select('name')
              .eq('id', event.category_data.theme_id)
              .single();
            if (data) relatedData.theme = data.name;
          }

          const { data: equipment } = await supabase
            .from('event_photography_equipment')
            .select('photography_equipment(name)')
            .eq('event_id', id);
          if (equipment) relatedData.equipment = equipment.map(e => e.photography_equipment.name);
        }

        if (event.category === 'quest' && event.category_data.theme_id) {
          const { data } = await supabase
            .from('quest_themes')
            .select('name')
            .eq('id', event.category_data.theme_id)
            .single();
          if (data) relatedData.theme = data.name;
        }

        if (event.category === 'dance' && event.category_data.style_id) {
          const { data } = await supabase
            .from('dance_styles')
            .select('name')
            .eq('id', event.category_data.style_id)
            .single();
          if (data) relatedData.style = data.name;
        }

        if (event.category === 'volunteer') {
          if (event.category_data.activity_type_id) {
            const { data } = await supabase
              .from('volunteer_activity_types')
              .select('name')
              .eq('id', event.category_data.activity_type_id)
              .single();
            if (data) relatedData.activity_type = data.name;
          }

          const { data: skills } = await supabase
            .from('event_volunteer_skills')
            .select('volunteer_skills(name)')
            .eq('event_id', id);
          if (skills) relatedData.skills = skills.map(s => s.volunteer_skills.name);
        }

        if (event.category === 'fitness' && event.category_data.workout_type_id) {
          const { data } = await supabase
            .from('fitness_workout_types')
            .select('name')
            .eq('id', event.category_data.workout_type_id)
            .single();
          if (data) relatedData.workout_type = data.name;
        }

        if (event.category === 'theater' && event.category_data.genre_id) {
          const { data } = await supabase
            .from('theater_genres')
            .select('name')
            .eq('id', event.category_data.genre_id)
            .single();
          if (data) relatedData.genre = data.name;
        }

        if (event.category === 'craft') {
          if (event.category_data.craft_type_id) {
            const { data } = await supabase
              .from('craft_types')
              .select('name')
              .eq('id', event.category_data.craft_type_id)
              .single();
            if (data) relatedData.craft_type = data.name;
          }

          const { data: materials } = await supabase
            .from('event_craft_materials')
            .select('craft_materials(name)')
            .eq('event_id', id);
          if (materials) relatedData.materials = materials.map(m => m.craft_materials.name);
        }

        if (event.category === 'concert' && event.category_data.genre_id) {
          const { data } = await supabase
            .from('music_genres')
            .select('name')
            .eq('id', event.category_data.genre_id)
            .single();
          if (data) relatedData.genre = data.name;
        }

        if (event.category === 'sports' && event.category_data.sport_type_id) {
          const { data } = await supabase
            .from('sports_types')
            .select('name')
            .eq('id', event.category_data.sport_type_id)
            .single();
          if (data) relatedData.sport_type = data.name;
        }

        if (event.category === 'eco_tour' && event.category_data.tour_type_id) {
          const { data } = await supabase
            .from('eco_tour_types')
            .select('name')
            .eq('id', event.category_data.tour_type_id)
            .single();
          if (data) relatedData.tour_type = data.name;
        }

      setCategoryRelatedData(relatedData);
    } catch (error) {
      console.error('Ошибка загрузки связанных данных:', error.message);
    }
  };

  // Присоединение к событию с использованием React Query
  const handleJoinEvent = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      await joinMutation.mutateAsync({
        eventId: id,
        userId: user.id,
        genderFilter: event.gender_filter,
      });

      // Получаем имя пользователя для уведомления
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const participantName = profileData?.full_name || 'Новый участник';

      // Отправляем уведомление организатору
      await notifyNewParticipant(id, event.creator_id, participantName);
    } catch (error) {
      if (error.message === 'GENDER_NOT_SET') {
        alert('Пожалуйста, укажите ваш пол в профиле для участия в этом событии');
        navigate('/profile');
      } else if (error.message === 'GENDER_MISMATCH') {
        const genderLabels = {
          male: 'только для мужчин',
          female: 'только для женщин'
        };
        alert(`Это событие ${genderLabels[event.gender_filter]}`);
      } else {
        console.error('Ошибка присоединения к событию:', error);
        alert('Не удалось присоединиться к событию');
      }
    }
  };

  // Выход из события с использованием React Query
  const handleLeaveEvent = async () => {
    try {
      await leaveMutation.mutateAsync({
        eventId: id,
        userId: user.id,
      });
    } catch (error) {
      console.error('Ошибка выхода из события:', error);
      alert('Не удалось покинуть событие');
    }
  };

  // Статус загрузки для кнопок
  const joining = joinMutation.isPending || leaveMutation.isPending;

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

  // Функция отмены события
  const handleCancelEvent = async () => {
    if (!cancellationReason.trim()) {
      alert('Пожалуйста, укажите причину отмены');
      return;
    }

    setCancelling(true);
    try {
      // Обновляем статус события на cancelled
      const { error: updateError } = await supabase
        .from('events')
        .update({
          lifecycle_status: EVENT_STATUS.CANCELLED,
          cancellation_reason: cancellationReason
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Получаем всех участников события
      const { data: participants, error: participantsError } = await supabase
        .from('event_participants')
        .select('user_id, profiles(full_name)')
        .eq('event_id', id);

      if (participantsError) throw participantsError;

      // Отправляем уведомления всем участникам
      for (const participant of participants) {
        await supabase
          .from('notifications')
          .insert({
            user_id: participant.user_id,
            type: 'event_cancelled',
            title: 'Событие отменено',
            message: `Событие "${event.title}" было отменено. Причина: ${cancellationReason}`,
            link: `/events/${id}`,
            read: false
          });
      }

      // Обновляем локальное состояние
      setEvent({ ...event, lifecycle_status: EVENT_STATUS.CANCELLED, cancellation_reason: cancellationReason });
      setShowCancelDialog(false);
      alert('Событие отменено. Всем участникам отправлены уведомления.');
    } catch (error) {
      console.error('Ошибка отмены события:', error.message);
      alert('Не удалось отменить событие. Попробуйте позже.');
    } finally {
      setCancelling(false);
    }
  };

  // Проверяем, завершилось ли событие
  const isEventCompleted = new Date(event?.event_date) < new Date();
  const eventStatus = getEventStatus(event);
  const canCancel = isCreator && canCancelEvent(event);

  return (
    <div className="event-details">
      {event.image_url && (
        <img src={event.image_url} alt={event.title} className="event-detail-image" />
      )}

      <div className="event-detail-content">
        <div className="event-header">
          <h1>{event.title}</h1>
          <div className="event-badges">
            <span className="event-category-badge">{getCategoryName(event.category)}</span>
            <EventStatusBadge event={event} showEmoji={true} />
          </div>
        </div>

        {/* Причина отмены */}
        {eventStatus === EVENT_STATUS.CANCELLED && event.cancellation_reason && (
          <div className="cancellation-notice">
            <strong>❌ Событие отменено</strong>
            <p>Причина: {event.cancellation_reason}</p>
          </div>
        )}

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
            <span>
              {event.event_type === 'online' ? (
                <>💻 Онлайн • {event.online_platform === 'zoom' ? 'Zoom' :
                  event.online_platform === 'google_meet' ? 'Google Meet' :
                  event.online_platform === 'telegram' ? 'Telegram' :
                  event.online_platform === 'discord' ? 'Discord' :
                  event.online_platform === 'skype' ? 'Skype' :
                  'Другое'}</>
              ) : (
                event.location
              )}
            </span>
          </div>

          {/* Ссылка на онлайн-мероприятие (видна только участникам и организатору) */}
          {event.event_type === 'online' && event.online_link && (user && (isParticipant || isCreator)) && (
            <div className="info-item online-link-item">
              <strong>Ссылка для подключения:</strong>
              <a href={event.online_link} target="_blank" rel="noopener noreferrer" className="online-link">
                {event.online_link}
              </a>
            </div>
          )}
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

        {/* Список участников */}
        <EventParticipants eventId={id} creatorId={event.creator_id} eventTitle={event.title} />

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

        {/* Карта только для офлайн-мероприятий */}
        {event.event_type === 'offline' && event.latitude && event.longitude && (
          <Suspense fallback={<MapLoadingFallback />}>
            <EventMap
              latitude={event.latitude}
              longitude={event.longitude}
              location={event.location}
              eventTitle={event.title}
            />
          </Suspense>
        )}

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

        {/* Кнопка отмены для организатора */}
        {canCancel && (
          <div className="event-actions organizer-actions">
            <button
              onClick={() => setShowCancelDialog(true)}
              className="btn btn-danger"
            >
              ❌ Отменить событие
            </button>
          </div>
        )}

        {/* Блокировка пользователя - показываем уведомление */}
        {user && blockInfo?.is_blocked && (
          <BlockedUserNotice
            blockInfo={blockInfo}
            onAppealSubmitted={() => alert('Ваше обжалование отправлено на рассмотрение администрации')}
          />
        )}

        {/* Кнопки присоединения/выхода для участников */}
        {user && !isCreator && !blockInfo?.is_blocked && eventStatus !== EVENT_STATUS.CANCELLED && (
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

        {/* Кнопка жалобы (доступна всем авторизованным пользователям, кроме создателя) */}
        {user && !isCreator && (
          <div className="report-section">
            <ReportButton eventId={id} eventTitle={event.title} />
          </div>
        )}

        {/* Диалог отмены события */}
        {showCancelDialog && (
          <div className="cancel-dialog-overlay" onClick={() => !cancelling && setShowCancelDialog(false)}>
            <div className="cancel-dialog" onClick={(e) => e.stopPropagation()}>
              <h2>Отменить событие</h2>
              <p>Вы уверены, что хотите отменить это событие? Всем участникам будет отправлено уведомление.</p>
              <div className="form-group">
                <label htmlFor="cancellation-reason">
                  Причина отмены <span className="required">*</span>
                </label>
                <textarea
                  id="cancellation-reason"
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Укажите причину отмены события..."
                  rows={4}
                  disabled={cancelling}
                  required
                />
              </div>
              <div className="dialog-actions">
                <button
                  onClick={() => setShowCancelDialog(false)}
                  className="btn btn-secondary"
                  disabled={cancelling}
                >
                  Отмена
                </button>
                <button
                  onClick={handleCancelEvent}
                  className="btn btn-danger"
                  disabled={cancelling || !cancellationReason.trim()}
                >
                  {cancelling ? 'Отмена события...' : 'Подтвердить отмену'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Чат события */}
        {user && (
          <div className="event-chat-section">
            <Suspense fallback={<ChatLoadingFallback />}>
              <EventChat eventId={id} />
            </Suspense>
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

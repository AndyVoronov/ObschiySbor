import { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { getCategoryName } from '../constants/categories';
import './EventDetails.css';

const EventDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('common');

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
        alert(t('eventDetails.genderNotSet'));
        navigate('/profile');
      } else if (error.message === 'GENDER_MISMATCH') {
        const genderLabels = {
          male: t('eventDetails.genderMismatchMale'),
          female: t('eventDetails.genderMismatchFemale')
        };
        alert(`${t('eventDetails.genderMismatch')} ${genderLabels[event.gender_filter]}`);
      } else {
        console.error('Ошибка присоединения к событию:', error);
        alert(t('eventDetails.joinError'));
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
      alert(t('eventDetails.leaveError'));
    }
  };

  // Статус загрузки для кнопок
  const joining = joinMutation.isPending || leaveMutation.isPending;

  if (loading) {
    return <div className="loading">{t('eventDetails.loading')}</div>;
  }

  if (!event) {
    return <div className="error">{t('eventDetails.notFound')}</div>;
  }

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
      alert(t('eventDetails.cancelReasonEmpty'));
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
            title: t('eventDetails.eventCancelled'),
            message: `${t('events.title')} "${event.title}" ${t('eventDetails.eventCancelled').toLowerCase()}. ${t('eventDetails.cancelledReason')}: ${cancellationReason}`,
            link: `/events/${id}`,
            read: false
          });
      }

      // Обновляем локальное состояние
      setEvent({ ...event, lifecycle_status: EVENT_STATUS.CANCELLED, cancellation_reason: cancellationReason });
      setShowCancelDialog(false);
      alert(t('eventDetails.eventCancelledNotice'));
    } catch (error) {
      console.error('Ошибка отмены события:', error.message);
      alert(t('eventDetails.cancelError'));
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
            <span className="event-category-badge">{getCategoryName(event.category, t)}</span>
            <EventStatusBadge event={event} showEmoji={true} />
          </div>
        </div>

        {/* Причина отмены */}
        {eventStatus === EVENT_STATUS.CANCELLED && event.cancellation_reason && (
          <div className="cancellation-notice">
            <strong>❌ {t('eventDetails.cancelledBadge')}</strong>
            <p>{t('eventDetails.cancelledReason')}: {event.cancellation_reason}</p>
          </div>
        )}

        <div className="event-info">
          <div className="info-item">
            <strong>{t('eventDetails.startLabel')}:</strong>
            <span>{new Date(event.event_date).toLocaleString('ru-RU')}</span>
          </div>
          {event.has_end_date && event.end_date && (
            <div className="info-item">
              <strong>{t('eventDetails.endLabel')}:</strong>
              <span>{new Date(event.end_date).toLocaleString('ru-RU')}</span>
            </div>
          )}
          {!event.has_end_date && (
            <div className="info-item">
              <strong>{t('eventDetails.endLabel')}:</strong>
              <span className="text-muted">{t('eventDetails.noEndDate')}</span>
            </div>
          )}
          <div className="info-item">
            <strong>{t('eventDetails.locationLabel')}:</strong>
            <span>
              {event.event_type === 'online' ? (
                <>💻 {t('eventDetails.onlinePrefix')} • {t(`createEvent.platforms.${event.online_platform}`)}</>
              ) : (
                event.location
              )}
            </span>
          </div>

          {/* Ссылка на онлайн-мероприятие (видна только участникам и организатору) */}
          {event.event_type === 'online' && event.online_link && (user && (isParticipant || isCreator)) && (
            <div className="info-item online-link-item">
              <strong>{t('eventDetails.onlineLink')}:</strong>
              <a href={event.online_link} target="_blank" rel="noopener noreferrer" className="online-link">
                {event.online_link}
              </a>
            </div>
          )}
          {event.gender_filter && event.gender_filter !== 'all' && (
            <div className="info-item">
              <strong>{t('eventDetails.whoCanParticipate')}:</strong>
              <span className="gender-filter-badge">
                {event.gender_filter === 'male' && `👨 ${t('eventDetails.onlyMen')}`}
                {event.gender_filter === 'female' && `👩 ${t('eventDetails.onlyWomen')}`}
              </span>
            </div>
          )}
        </div>

        {/* Список участников */}
        <EventParticipants eventId={id} creatorId={event.creator_id} eventTitle={event.title} />

        <div className="event-description">
          <h2>{t('eventDetails.description')}</h2>
          <p>{event.description}</p>
        </div>

        {/* Отображение настольных игр */}
        {event.category === 'board_games' && boardGames.length > 0 && (
          <div className="board-games-section">
            <h2>{t('eventDetails.boardGames')}</h2>
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
                      <span>👥 {game.min_players}-{game.max_players} {t('eventDetails.players')}</span>
                      <span>⏱️ ~{game.avg_playtime_minutes} {t('eventDetails.minutes')}</span>
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
            <h2>{t('eventDetails.details')}</h2>
            {event.category === 'cycling' && (
              <>
                {event.category_data.difficulty && (
                  <p><strong>{t('eventDetails.categoryData.difficulty')}:</strong> {event.category_data.difficulty}</p>
                )}
                {event.category_data.route && (
                  <p><strong>{t('eventDetails.categoryData.route')}:</strong> {event.category_data.route}</p>
                )}
                {event.category_data.equipment && (
                  <p><strong>{t('eventDetails.categoryData.equipment')}:</strong> {event.category_data.equipment}</p>
                )}
              </>
            )}
            {event.category === 'hiking' && (
              <>
                {event.category_data.distance && (
                  <p><strong>{t('eventDetails.categoryData.distance')}:</strong> {event.category_data.distance} {t('eventDetails.categoryData.distanceKm')}</p>
                )}
                {event.category_data.terrain && (
                  <p><strong>{t('eventDetails.categoryData.terrain')}:</strong> {event.category_data.terrain}</p>
                )}
                {event.category_data.equipment && (
                  <p><strong>{t('eventDetails.categoryData.equipment')}:</strong> {event.category_data.equipment}</p>
                )}
              </>
            )}
            {event.category === 'yoga' && (
              <>
                {categoryRelatedData?.practice_type && (
                  <p><strong>{t('eventDetails.categoryData.practiceType')}:</strong> {categoryRelatedData.practice_type}</p>
                )}
                {event.category_data.difficulty && (
                  <p><strong>{t('eventDetails.categoryData.level')}:</strong> {t(`eventDetails.categoryData.level${event.category_data.difficulty.charAt(0).toUpperCase() + event.category_data.difficulty.slice(1)}`)}</p>
                )}
                {event.category_data.equipment_needed?.length > 0 && (
                  <p><strong>{t('eventDetails.categoryData.equipmentNeeded')}:</strong> {event.category_data.equipment_needed.join(', ')}</p>
                )}
              </>
            )}
            {event.category === 'cooking' && (
              <>
                {categoryRelatedData?.cuisine_type && (
                  <p><strong>{t('eventDetails.categoryData.cuisine')}:</strong> {categoryRelatedData.cuisine_type}</p>
                )}
                {event.category_data.skill_level && (
                  <p><strong>{t('eventDetails.categoryData.skillLevel')}:</strong> {t(`eventDetails.categoryData.skillLevel${event.category_data.skill_level.charAt(0).toUpperCase() + event.category_data.skill_level.slice(1)}`)}</p>
                )}
              </>
            )}
            {event.category === 'music_jam' && (
              <>
                {categoryRelatedData?.genre && (
                  <p><strong>{t('eventDetails.categoryData.genre')}:</strong> {categoryRelatedData.genre}</p>
                )}
                {categoryRelatedData?.instruments?.length > 0 && (
                  <p><strong>{t('eventDetails.categoryData.instruments')}:</strong> {categoryRelatedData.instruments.join(', ')}</p>
                )}
                {event.category_data.performer_level && (
                  <p><strong>{t('eventDetails.categoryData.performerLevel')}:</strong> {t(`eventDetails.categoryData.performer${event.category_data.performer_level.charAt(0).toUpperCase() + event.category_data.performer_level.slice(1)}`)}</p>
                )}
              </>
            )}
            {event.category === 'seminar' && (
              <>
                {categoryRelatedData?.topic && (
                  <p><strong>{t('eventDetails.categoryData.topic')}:</strong> {categoryRelatedData.topic}</p>
                )}
                {event.category_data.format && (
                  <p><strong>{t('eventDetails.categoryData.format')}:</strong> {t(`eventDetails.categoryData.format${event.category_data.format.charAt(0).toUpperCase() + event.category_data.format.slice(1)}`)}</p>
                )}
                {event.category_data.knowledge_level && (
                  <p><strong>{t('eventDetails.categoryData.knowledgeLevel')}:</strong> {t(`eventDetails.categoryData.knowledge${event.category_data.knowledge_level.charAt(0).toUpperCase() + event.category_data.knowledge_level.slice(1)}`)}</p>
                )}
                {event.category_data.materials_needed?.length > 0 && (
                  <p><strong>{t('eventDetails.categoryData.materials')}:</strong> {event.category_data.materials_needed.join(', ')}</p>
                )}
              </>
            )}
            {event.category === 'picnic' && (
              <>
                {categoryRelatedData?.picnic_type && (
                  <p><strong>{t('eventDetails.categoryData.picnicType')}:</strong> {categoryRelatedData.picnic_type}</p>
                )}
                {event.category_data.weather_dependent && (
                  <p><strong>{t('eventDetails.categoryData.weatherPlace')}:</strong> {t(`eventDetails.categoryData.weather${event.category_data.weather_dependent.charAt(0).toUpperCase() + event.category_data.weather_dependent.slice(1)}`)}</p>
                )}
              </>
            )}
            {event.category === 'photo_walk' && (
              <>
                {categoryRelatedData?.theme && (
                  <p><strong>{t('eventDetails.categoryData.theme')}:</strong> {categoryRelatedData.theme}</p>
                )}
                {event.category_data.skill_level && (
                  <p><strong>{t('eventDetails.categoryData.level')}:</strong> {t(`eventDetails.categoryData.level${event.category_data.skill_level.charAt(0).toUpperCase() + event.category_data.skill_level.slice(1)}`)}</p>
                )}
                {categoryRelatedData?.equipment?.length > 0 && (
                  <p><strong>{t('eventDetails.categoryData.equipmentNeeded')}:</strong> {categoryRelatedData.equipment.join(', ')}</p>
                )}
                {event.category_data.route && (
                  <p><strong>{t('eventDetails.categoryData.photoRoute')}:</strong> {event.category_data.route}</p>
                )}
              </>
            )}
            {event.category === 'quest' && (
              <>
                {categoryRelatedData?.theme && (
                  <p><strong>{t('eventDetails.categoryData.theme')}:</strong> {categoryRelatedData.theme}</p>
                )}
                {event.category_data.difficulty && (
                  <p><strong>{t('eventDetails.categoryData.questDifficulty')}:</strong> {t(`eventDetails.categoryData.quest${event.category_data.difficulty.charAt(0).toUpperCase() + event.category_data.difficulty.slice(1)}`)}</p>
                )}
                {event.category_data.age_restriction && (
                  <p><strong>{t('eventDetails.categoryData.age')}:</strong> {event.category_data.age_restriction}{t('eventDetails.categoryData.agePlus')}</p>
                )}
              </>
            )}
            {event.category === 'dance' && (
              <>
                {categoryRelatedData?.style && (
                  <p><strong>{t('eventDetails.categoryData.style')}:</strong> {categoryRelatedData.style}</p>
                )}
                {event.category_data.skill_level && (
                  <p><strong>{t('eventDetails.categoryData.level')}:</strong> {t(`eventDetails.categoryData.level${event.category_data.skill_level.charAt(0).toUpperCase() + event.category_data.skill_level.slice(1)}`)}</p>
                )}
                {event.category_data.partner_type && (
                  <p><strong>{t('eventDetails.categoryData.partnerType')}:</strong> {t(`eventDetails.categoryData.partnerType${event.category_data.partner_type.charAt(0).toUpperCase() + event.category_data.partner_type.slice(1)}`)}</p>
                )}
                {event.category_data.dress_code && (
                  <p><strong>{t('eventDetails.categoryData.dressCode')}:</strong> {event.category_data.dress_code}</p>
                )}
              </>
            )}
            {event.category === 'tour' && (
              <>
                {event.category_data.theme && (
                  <p><strong>{t('eventDetails.categoryData.tourTheme')}:</strong> {t(`eventDetails.categoryData.tour${event.category_data.theme.charAt(0).toUpperCase() + event.category_data.theme.slice(1)}`)}</p>
                )}
                {event.category_data.duration_hours && (
                  <p><strong>{t('eventDetails.categoryData.durationHours')}:</strong> {event.category_data.duration_hours} {t('eventDetails.categoryData.hours')}</p>
                )}
                {event.category_data.pace && (
                  <p><strong>{t('eventDetails.categoryData.pace')}:</strong> {t(`eventDetails.categoryData.pace${event.category_data.pace.charAt(0).toUpperCase() + event.category_data.pace.slice(1)}`)}</p>
                )}
                {event.category_data.accessibility?.length > 0 && (
                  <p><strong>{t('eventDetails.categoryData.accessibility')}:</strong> {event.category_data.accessibility.join(', ')}</p>
                )}
              </>
            )}
            {event.category === 'volunteer' && (
              <>
                {categoryRelatedData?.activity_type && (
                  <p><strong>{t('eventDetails.categoryData.activityType')}:</strong> {categoryRelatedData.activity_type}</p>
                )}
                {categoryRelatedData?.skills?.length > 0 && (
                  <p><strong>{t('eventDetails.categoryData.skills')}:</strong> {categoryRelatedData.skills.join(', ')}</p>
                )}
                {event.category_data.age_min && (
                  <p><strong>{t('eventDetails.categoryData.minAge')}:</strong> {event.category_data.age_min}{t('eventDetails.categoryData.agePlus')}</p>
                )}
                {event.category_data.equipment_needed?.length > 0 && (
                  <p><strong>{t('eventDetails.categoryData.equipmentNeeded')}:</strong> {event.category_data.equipment_needed.join(', ')}</p>
                )}
              </>
            )}
            {event.category === 'fitness' && (
              <>
                {categoryRelatedData?.workout_type && (
                  <p><strong>{t('eventDetails.categoryData.workoutType')}:</strong> {categoryRelatedData.workout_type}</p>
                )}
                {event.category_data.fitness_level && (
                  <p><strong>{t('eventDetails.categoryData.fitnessLevel')}:</strong> {t(`eventDetails.categoryData.fitnessLevel${event.category_data.fitness_level.charAt(0).toUpperCase() + event.category_data.fitness_level.slice(1)}`)}</p>
                )}
                {event.category_data.duration_minutes && (
                  <p><strong>{t('eventDetails.categoryData.durationMinutes')}:</strong> {event.category_data.duration_minutes} {t('eventDetails.categoryData.minutes')}</p>
                )}
                {event.category_data.equipment_needed?.length > 0 && (
                  <p><strong>{t('eventDetails.categoryData.equipmentNeeded')}:</strong> {event.category_data.equipment_needed.join(', ')}</p>
                )}
              </>
            )}
            {event.category === 'theater' && (
              <>
                {categoryRelatedData?.genre && (
                  <p><strong>{t('eventDetails.categoryData.theaterGenre')}:</strong> {categoryRelatedData.genre}</p>
                )}
                {event.category_data.age_rating && (
                  <p><strong>{t('eventDetails.categoryData.ageRating')}:</strong> {event.category_data.age_rating}</p>
                )}
                {event.category_data.duration_minutes && (
                  <p><strong>{t('eventDetails.categoryData.durationMinutes')}:</strong> {event.category_data.duration_minutes} {t('eventDetails.categoryData.minutes')}</p>
                )}
                {event.category_data.has_intermission && (
                  <p><strong>{t('eventDetails.categoryData.hasIntermission')}:</strong> {t('eventDetails.categoryData.hasIntermissionYes')}</p>
                )}
              </>
            )}
            {event.category === 'auto_tour' && (
              <>
                {event.category_data.route_type && (
                  <p><strong>{t('eventDetails.categoryData.routeType')}:</strong> {t(`eventDetails.categoryData.routeType${event.category_data.route_type.charAt(0).toUpperCase() + event.category_data.route_type.slice(1)}`)}</p>
                )}
                {event.category_data.driving_difficulty && (
                  <p><strong>{t('eventDetails.categoryData.drivingDifficulty')}:</strong> {t(`eventDetails.categoryData.driving${event.category_data.driving_difficulty.charAt(0).toUpperCase() + event.category_data.driving_difficulty.slice(1)}`)}</p>
                )}
                {event.category_data.required_equipment?.length > 0 && (
                  <p><strong>{t('eventDetails.categoryData.requiredEquipment')}:</strong> {event.category_data.required_equipment.join(', ')}</p>
                )}
                {event.category_data.car_capacity && (
                  <p><strong>{t('eventDetails.categoryData.carCapacity')}:</strong> {event.category_data.car_capacity} {t('eventDetails.categoryData.carCapacityPeople')}</p>
                )}
              </>
            )}
            {event.category === 'craft' && (
              <>
                {categoryRelatedData?.craft_type && (
                  <p><strong>{t('eventDetails.categoryData.craftType')}:</strong> {categoryRelatedData.craft_type}</p>
                )}
                {categoryRelatedData?.materials?.length > 0 && (
                  <p><strong>{t('eventDetails.categoryData.materials')}:</strong> {categoryRelatedData.materials.join(', ')}</p>
                )}
                {event.category_data.skill_level && (
                  <p><strong>{t('eventDetails.categoryData.level')}:</strong> {t(`eventDetails.categoryData.level${event.category_data.skill_level.charAt(0).toUpperCase() + event.category_data.skill_level.slice(1)}`)}</p>
                )}
                {event.category_data.final_product && (
                  <p><strong>{t('eventDetails.categoryData.finalProduct')}:</strong> {event.category_data.final_product}</p>
                )}
              </>
            )}
            {event.category === 'concert' && (
              <>
                {categoryRelatedData?.genre && (
                  <p><strong>{t('eventDetails.categoryData.genre')}:</strong> {categoryRelatedData.genre}</p>
                )}
                {event.category_data.performer && (
                  <p><strong>{t('eventDetails.categoryData.performer')}:</strong> {event.category_data.performer}</p>
                )}
                {event.category_data.age_restriction && (
                  <p><strong>{t('eventDetails.categoryData.ageRestriction')}:</strong> {event.category_data.age_restriction}</p>
                )}
              </>
            )}
            {event.category === 'sports' && (
              <>
                {categoryRelatedData?.sport_type && (
                  <p><strong>{t('eventDetails.categoryData.sportType')}:</strong> {categoryRelatedData.sport_type}</p>
                )}
                {event.category_data.level && (
                  <p><strong>{t('eventDetails.categoryData.sportLevel')}:</strong> {t(`eventDetails.categoryData.sportLevel${event.category_data.level.charAt(0).toUpperCase() + event.category_data.level.slice(1)}`)}</p>
                )}
              </>
            )}
            {event.category === 'eco_tour' && (
              <>
                {categoryRelatedData?.tour_type && (
                  <p><strong>{t('eventDetails.categoryData.tourType')}:</strong> {categoryRelatedData.tour_type}</p>
                )}
                {event.category_data.equipment_needed?.length > 0 && (
                  <p><strong>{t('eventDetails.categoryData.equipmentNeeded')}:</strong> {event.category_data.equipment_needed.join(', ')}</p>
                )}
              </>
            )}
          </div>
        )}

        <div className="calendar-actions">
          <h3>{t('eventDetails.calendar.title')}</h3>
          <div className="calendar-buttons">
            <button
              onClick={handleExportToCalendar}
              className="btn btn-secondary"
              title={t('eventDetails.calendar.downloadICSTitle')}
            >
              📅 {t('eventDetails.calendar.downloadICS')}
            </button>
            <button
              onClick={handleAddToGoogleCalendar}
              className="btn btn-secondary"
              title={t('eventDetails.calendar.googleCalendarTitle')}
            >
              📆 {t('eventDetails.calendar.googleCalendar')}
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
              ❌ {t('eventDetails.buttons.cancelEvent')}
            </button>
          </div>
        )}

        {/* Блокировка пользователя - показываем уведомление */}
        {user && blockInfo?.is_blocked && (
          <BlockedUserNotice
            blockInfo={blockInfo}
            onAppealSubmitted={() => alert(t('eventDetails.appealSubmitted'))}
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
                {joining ? t('eventDetails.buttons.leaving') : t('eventDetails.buttons.leaveEvent')}
              </button>
            ) : (
              <button
                onClick={handleJoinEvent}
                className="btn btn-primary"
                disabled={joining || isFull}
              >
                {joining ? t('eventDetails.buttons.joining') : isFull ? t('eventDetails.buttons.eventFull') : t('eventDetails.buttons.joinEvent')}
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
              <h2>{t('eventDetails.cancelDialog.title')}</h2>
              <p>{t('eventDetails.cancelDialog.confirmMessage')}</p>
              <div className="form-group">
                <label htmlFor="cancellation-reason">
                  {t('eventDetails.cancelDialog.reasonLabel')} <span className="required">*</span>
                </label>
                <textarea
                  id="cancellation-reason"
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder={t('eventDetails.cancelDialog.reasonPlaceholder')}
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
                  {t('eventDetails.cancelDialog.cancelButton')}
                </button>
                <button
                  onClick={handleCancelEvent}
                  className="btn btn-danger"
                  disabled={cancelling || !cancellationReason.trim()}
                >
                  {cancelling ? t('eventDetails.cancelDialog.confirming') : t('eventDetails.cancelDialog.confirmButton')}
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

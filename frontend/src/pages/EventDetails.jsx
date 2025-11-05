import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useEvent, useBoardGames, useParticipation, useJoinEvent, useLeaveEvent } from '../hooks/useEvent';
import EventStatusBadge from '../components/EventStatusBadge';
import ReportButton from '../components/ReportButton';
import BlockedUserNotice from '../components/BlockedUserNotice';
import ShareEvent from '../components/ShareEvent';
import EventTabs from '../components/EventTabs';
import EventDetailsGeneral from '../components/EventDetailsGeneral';
import EventDetailsParticipants from '../components/EventDetailsParticipants';
import EventDetailsChat from '../components/EventDetailsChat';
import EventDetailsReviews from '../components/EventDetailsReviews';
import InviteFriendsModal from '../components/InviteFriendsModal';
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
  const [blockInfo, setBlockInfo] = useState(null);
  const [checkingBlock, setCheckingBlock] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);

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
          .maybeSingle();

        if (error) throw error;

        if (!profile) {
          console.warn('Профиль не найден для пользователя:', user.id);
          setBlockInfo(null);
          return;
        }

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

      if (event.category === 'movie' && event.category_data.genre_id) {
        const { data } = await supabase
          .from('movie_genres')
          .select('name')
          .eq('id', event.category_data.genre_id)
          .single();
        if (data) relatedData.genre = data.name;
      }

      if (event.category === 'photo_walk' && event.category_data.theme_id) {
        const { data } = await supabase
          .from('photo_walk_themes')
          .select('name')
          .eq('id', event.category_data.theme_id)
          .single();
        if (data) relatedData.theme = data.name;
      }

      if (event.category === 'exhibition' && event.category_data.exhibition_type_id) {
        const { data } = await supabase
          .from('exhibition_types')
          .select('name')
          .eq('id', event.category_data.exhibition_type_id)
          .single();
        if (data) relatedData.exhibition_type = data.name;
      }

      if (event.category === 'volunteer' && event.category_data.activity_type_id) {
        const { data } = await supabase
          .from('volunteer_activity_types')
          .select('name')
          .eq('id', event.category_data.activity_type_id)
          .single();
        if (data) relatedData.activity_type = data.name;
      }

      if (event.category === 'quest' && event.category_data.quest_type_id) {
        const { data } = await supabase
          .from('quest_types')
          .select('name')
          .eq('id', event.category_data.quest_type_id)
          .single();
        if (data) relatedData.quest_type = data.name;
      }

      if (event.category === 'book_club' && event.category_data.genre_id) {
        const { data } = await supabase
          .from('book_genres')
          .select('name')
          .eq('id', event.category_data.genre_id)
          .single();
        if (data) relatedData.genre = data.name;
      }

      if (event.category === 'pets' && event.category_data.pet_type_id) {
        const { data } = await supabase
          .from('pet_types')
          .select('name')
          .eq('id', event.category_data.pet_type_id)
          .single();
        if (data) relatedData.pet_type = data.name;
      }

      if (event.category === 'dance' && event.category_data.dance_style_id) {
        const { data } = await supabase
          .from('dance_styles')
          .select('name')
          .eq('id', event.category_data.dance_style_id)
          .single();
        if (data) relatedData.dance_style = data.name;
      }

      if (event.category === 'music_jam' && event.category_data.genre_id) {
        const { data } = await supabase
          .from('music_genres')
          .select('name')
          .eq('id', event.category_data.genre_id)
          .single();
        if (data) relatedData.genre = data.name;
      }

      if (event.category === 'language' && event.category_data.language_id) {
        const { data } = await supabase
          .from('languages')
          .select('name')
          .eq('id', event.category_data.language_id)
          .single();
        if (data) relatedData.language = data.name;
      }

      if (event.category === 'fitness' && event.category_data.workout_type_id) {
        const { data } = await supabase
          .from('workout_types')
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
        .maybeSingle();

      if (!profileData) {
        console.warn('Профиль не найден для пользователя:', user.id);
        return;
      }

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

      // Перезагружаем страницу для обновления статуса
      window.location.reload();
    } catch (error) {
      console.error('Ошибка отмены события:', error.message);
      alert(t('eventDetails.cancelError'));
    } finally {
      setCancelling(false);
    }
  };

  const handleReviewAdded = () => {
    // Обновление отзывов происходит автоматически через React Query
    console.log('Отзыв добавлен');
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
  const eventStatus = getEventStatus(event);
  const canCancel = isCreator && canCancelEvent(event);

  // Конфигурация вкладок
  const tabs = [
    {
      label: t('eventDetails.tabs.general'),
      content: (
        <EventDetailsGeneral
          event={event}
          eventStatus={eventStatus}
          boardGames={boardGames}
          categoryRelatedData={categoryRelatedData}
          isParticipant={isParticipant}
          isCreator={isCreator}
        />
      )
    },
    {
      label: `${t('eventDetails.tabs.participants')} (${event.current_participants}/${event.max_participants})`,
      content: <EventDetailsParticipants eventId={id} creatorId={event.creator_id} eventTitle={event.title} />
    },
    {
      label: t('eventDetails.tabs.chat'),
      content: user ? (
        <EventDetailsChat eventId={id} />
      ) : (
        <div className="auth-required">
          <p>{t('eventDetails.authRequiredForChat')}</p>
        </div>
      )
    },
    {
      label: t('eventDetails.tabs.reviews'),
      content: (
        <EventDetailsReviews
          event={event}
          eventStatus={eventStatus}
          isParticipant={isParticipant}
          isCreator={isCreator}
          user={user}
          onReviewSubmit={handleReviewAdded}
        />
      )
    }
  ];

  return (
    <div className="event-details">
      {event.image_url && (
        <img src={event.image_url} alt={event.title} className="event-detail-image" />
      )}

      <div className="event-detail-content">
        {/* Header с названием, категорией и статусом - ВЫШЕ вкладок */}
        <div className="event-header">
          <div className="event-header-main">
            <h1>{event.title}</h1>
            <div className="event-badges">
              <span className="event-category-badge">{getCategoryName(event.category, t)}</span>
              <EventStatusBadge event={event} showEmoji={true} />
            </div>
          </div>
        </div>

        {/* Причина отмены */}
        {eventStatus === EVENT_STATUS.CANCELLED && event.cancellation_reason && (
          <div className="cancellation-notice">
            <strong>❌ {t('eventDetails.cancelledBadge')}</strong>
            <p>{t('eventDetails.cancelledReason')}: {event.cancellation_reason}</p>
          </div>
        )}

        {/* Блокировка пользователя - показываем уведомление */}
        {user && blockInfo?.is_blocked && (
          <BlockedUserNotice
            blockInfo={blockInfo}
            onAppealSubmitted={() => alert(t('eventDetails.appealSubmitted'))}
          />
        )}

        {/* Все кнопки действий в одну строку - ВЫШЕ вкладок */}
        {!blockInfo?.is_blocked && eventStatus !== EVENT_STATUS.CANCELLED && (
          <div className="event-actions-row">
            {/* Основная кнопка: Присоединиться/Покинуть/Войти/Отменить */}
            {user && !isCreator && (
              <>
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
              </>
            )}

            {!user && !isCreator && (
              <button
                onClick={() => navigate('/login')}
                className="btn btn-primary"
              >
                🔐 {t('eventDetails.buttons.loginToJoin')}
              </button>
            )}

            {canCancel && (
              <button
                onClick={() => setShowCancelDialog(true)}
                className="btn btn-danger"
              >
                ❌ {t('eventDetails.buttons.cancelEvent')}
              </button>
            )}

            {/* Кнопки: Пригласить друзей, Поделиться и Пожаловаться (только иконки) */}
            <div className="event-secondary-actions">
              {user && isCreator && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="btn-icon"
                  title={t('eventParticipants.inviteFriends')}
                >
                  ✉️
                </button>
              )}
              <ShareEvent event={event} showLabel={false} />
              {user && !isCreator && (
                <ReportButton eventId={id} eventTitle={event.title} showLabel={false} />
              )}
            </div>
          </div>
        )}

        {/* Модальное окно приглашения друзей */}
        {showInviteModal && (
          <InviteFriendsModal
            isOpen={showInviteModal}
            onClose={() => setShowInviteModal(false)}
            eventId={id}
            eventTitle={event.title}
          />
        )}

        {/* Вкладки */}
        <EventTabs tabs={tabs} />

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
      </div>
    </div>
  );
};

export default EventDetails;

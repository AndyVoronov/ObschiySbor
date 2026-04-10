import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { profilesApi, eventsApi, notificationsApi, dictionariesApi } from '../lib/api';
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
        const { data: profile } = await profilesApi.getMe();

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

  // Вспомогательная функция для загрузки названия из справочника по ID
  const fetchDictionaryName = async (tableName, idValue) => {
    try {
      const { data } = await dictionariesApi.getById(tableName, idValue);
      return data?.name || null;
    } catch {
      return null;
    }
  };

  // Функция загрузки связанных данных (справочники для категорий)
  const fetchCategoryRelatedData = async () => {
    if (!event?.category_data) return;

    try {
      const relatedData = {};
      const catData = event.category_data;

      // Загружаем данные в зависимости от категории
      if (event.category === 'yoga' && catData.yoga_practice_type_id) {
        relatedData.practice_type = await fetchDictionaryName('yoga_practice_types', catData.yoga_practice_type_id);
      }

      if (event.category === 'cooking' && catData.cuisine_type_id) {
        relatedData.cuisine_type = await fetchDictionaryName('cuisine_types', catData.cuisine_type_id);
      }

      if (event.category === 'movie' && catData.genre_id) {
        relatedData.genre = await fetchDictionaryName('movie_genres', catData.genre_id);
      }

      if (event.category === 'photo_walk' && catData.theme_id) {
        relatedData.theme = await fetchDictionaryName('photo_walk_themes', catData.theme_id);
      }

      if (event.category === 'exhibition' && catData.exhibition_type_id) {
        relatedData.exhibition_type = await fetchDictionaryName('exhibition_types', catData.exhibition_type_id);
      }

      if (event.category === 'volunteer' && catData.activity_type_id) {
        relatedData.activity_type = await fetchDictionaryName('volunteer_activity_types', catData.activity_type_id);
      }

      if (event.category === 'quest' && catData.quest_type_id) {
        relatedData.quest_type = await fetchDictionaryName('quest_types', catData.quest_type_id);
      }

      if (event.category === 'book_club' && catData.genre_id) {
        relatedData.genre = await fetchDictionaryName('book_genres', catData.genre_id);
      }

      if (event.category === 'pets' && catData.pet_type_id) {
        relatedData.pet_type = await fetchDictionaryName('pet_types', catData.pet_type_id);
      }

      if (event.category === 'dance' && catData.dance_style_id) {
        relatedData.dance_style = await fetchDictionaryName('dance_styles', catData.dance_style_id);
      }

      if (event.category === 'music_jam' && catData.genre_id) {
        relatedData.genre = await fetchDictionaryName('music_genres', catData.genre_id);
      }

      if (event.category === 'language' && catData.language_id) {
        relatedData.language = await fetchDictionaryName('languages', catData.language_id);
      }

      if (event.category === 'fitness' && catData.workout_type_id) {
        relatedData.workout_type = await fetchDictionaryName('workout_types', catData.workout_type_id);
      }

      if (event.category === 'theater' && catData.genre_id) {
        relatedData.genre = await fetchDictionaryName('theater_genres', catData.genre_id);
      }

      if (event.category === 'craft') {
        if (catData.craft_type_id) {
          relatedData.craft_type = await fetchDictionaryName('craft_types', catData.craft_type_id);
        }

        // Загружаем материалы для ремесла, связанные с этим событием
        try {
          const { data: materials } = await eventsApi.getCraftMaterials?.(id)
            || await dictionariesApi.getById('event_craft_materials', id);
          if (materials) {
            relatedData.materials = Array.isArray(materials)
              ? materials.map(m => m.name || m.craft_materials?.name)
              : [];
          }
        } catch {
          // Не критично — пропускаем материалы
        }
      }

      if (event.category === 'concert' && catData.genre_id) {
        relatedData.genre = await fetchDictionaryName('music_genres', catData.genre_id);
      }

      if (event.category === 'sports' && catData.sport_type_id) {
        relatedData.sport_type = await fetchDictionaryName('sports_types', catData.sport_type_id);
      }

      if (event.category === 'eco_tour' && catData.tour_type_id) {
        relatedData.tour_type = await fetchDictionaryName('eco_tour_types', catData.tour_type_id);
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
      const { data: profileData } = await profilesApi.getMe();

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
      await eventsApi.update(id, {
        lifecycle_status: EVENT_STATUS.CANCELLED,
        cancellation_reason: cancellationReason
      });

      // Получаем всех участников события
      const { data: participants } = await eventsApi.getParticipants(id);

      // Отправляем уведомления всем участникам
      if (participants && participants.length > 0) {
        for (const participant of participants) {
          await notificationsApi.create({
            user_id: participant.user_id,
            type: 'event_cancelled',
            title: t('eventDetails.eventCancelled'),
            message: `${t('events.title')} "${event.title}" ${t('eventDetails.eventCancelled').toLowerCase()}. ${t('eventDetails.cancelledReason')}: ${cancellationReason}`,
            link: `/events/${id}`,
            read: false
          });
        }
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

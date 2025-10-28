// Компонент для вкладки "Отзывы"
import { useTranslation } from 'react-i18next';
import Reviews from './Reviews';
import ReviewForm from './ReviewForm';
import { EVENT_STATUS } from '../utils/eventStatus';

const EventDetailsReviews = ({
  event,
  eventStatus,
  isParticipant,
  isCreator,
  user,
  onReviewSubmit
}) => {
  const { t } = useTranslation('common');

  return (
    <div className="event-reviews-tab">
      {/* Форма отзыва - доступна только участникам после завершения события */}
      {user && isParticipant && !isCreator && eventStatus === EVENT_STATUS.COMPLETED && (
        <div className="review-form-section">
          <h2>{t('eventDetails.leaveReview')}</h2>
          <ReviewForm eventId={event.id} onSuccess={onReviewSubmit} />
        </div>
      )}

      {/* Список отзывов */}
      <div className="reviews-section">
        <Reviews eventId={event.id} />
      </div>
    </div>
  );
};

export default EventDetailsReviews;

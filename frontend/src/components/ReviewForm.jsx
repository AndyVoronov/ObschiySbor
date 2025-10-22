import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import './ReviewForm.css';

const ReviewForm = ({ eventId, onReviewAdded }) => {
  const { user } = useAuth();
  const { t } = useTranslation('common');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (rating === 0) {
      setError(t('reviews.errorRatingRequired'));
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Проверяем, участвовал ли пользователь в событии
      const { data: participationData, error: participationError } = await supabase
        .from('event_participants')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .eq('status', 'joined')
        .single();

      if (participationError || !participationData) {
        setError(t('reviews.errorParticipationRequired'));
        setLoading(false);
        return;
      }

      // Проверяем, не оставлял ли пользователь уже отзыв
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .single();

      if (existingReview) {
        // Обновляем существующий отзыв
        const { error: updateError } = await supabase
          .from('reviews')
          .update({
            rating,
            comment: comment.trim() || null
          })
          .eq('id', existingReview.id);

        if (updateError) throw updateError;
      } else {
        // Создаём новый отзыв
        const { error: insertError } = await supabase
          .from('reviews')
          .insert({
            event_id: eventId,
            user_id: user.id,
            rating,
            comment: comment.trim() || null
          });

        if (insertError) throw insertError;
      }

      setSuccess(true);
      setRating(0);
      setComment('');

      // Вызываем callback для обновления списка отзывов
      if (onReviewAdded) {
        onReviewAdded();
      }

      // Скрываем сообщение об успехе через 3 секунды
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Ошибка при сохранении отзыва:', err);
      setError(t('reviews.errorSaving'));
    } finally {
      setLoading(false);
    }
  };

  const renderStarInput = (index) => {
    const filled = index < (hoverRating || rating);
    return (
      <button
        key={index}
        type="button"
        className={`star-button ${filled ? 'filled' : ''}`}
        onClick={() => setRating(index + 1)}
        onMouseEnter={() => setHoverRating(index + 1)}
        onMouseLeave={() => setHoverRating(0)}
      >
        ★
      </button>
    );
  };

  if (!user) {
    return (
      <div className="review-form-message">
        <p>{t('reviews.loginToReview')}</p>
      </div>
    );
  }

  return (
    <div className="review-form-container">
      <h3>{t('reviews.leaveReview')}</h3>

      {success && (
        <div className="success-message">
          ✓ {t('reviews.successMessage')}
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="review-form">
        <div className="rating-input">
          <label>{t('reviews.yourRating')}</label>
          <div className="stars-input">
            {[...Array(5)].map((_, index) => renderStarInput(index))}
          </div>
          {rating > 0 && (
            <span className="rating-text">
              {rating === 1 && t('reviews.rating1')}
              {rating === 2 && t('reviews.rating2')}
              {rating === 3 && t('reviews.rating3')}
              {rating === 4 && t('reviews.rating4')}
              {rating === 5 && t('reviews.rating5')}
            </span>
          )}
        </div>

        <div className="comment-input">
          <label htmlFor="comment">{t('reviews.commentLabel')}</label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('reviews.commentPlaceholder')}
            rows="4"
            maxLength="1000"
          />
          <div className="char-count">
            {comment.length}/1000
          </div>
        </div>

        <button
          type="submit"
          className="submit-button"
          disabled={loading || rating === 0}
        >
          {loading ? t('reviews.submitting') : t('reviews.submitButton')}
        </button>
      </form>
    </div>
  );
};

export default ReviewForm;

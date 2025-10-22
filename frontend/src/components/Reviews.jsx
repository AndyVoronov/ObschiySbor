import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import './Reviews.css';

const Reviews = forwardRef(({ eventId }, ref) => {
  const { t } = useTranslation('common');
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);

  useEffect(() => {
    fetchReviews();
  }, [eventId]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReviews(data || []);

      // Вычисляем средний рейтинг
      if (data && data.length > 0) {
        const avg = data.reduce((sum, review) => sum + review.rating, 0) / data.length;
        setAverageRating(avg.toFixed(1));
      } else {
        setAverageRating(0);
      }
    } catch (error) {
      console.error('Ошибка загрузки отзывов:', error);
    } finally {
      setLoading(false);
    }
  };

  // Expose fetchReviews method to parent component
  useImperativeHandle(ref, () => ({
    fetchReviews
  }));

  const renderStars = (rating) => {
    return [...Array(5)].map((_, index) => (
      <span
        key={index}
        className={`star ${index < rating ? 'filled' : ''}`}
      >
        ★
      </span>
    ));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return <div className="reviews-loading">{t('reviews.loading')}</div>;
  }

  return (
    <div className="reviews-section">
      <div className="reviews-header">
        <h2>{t('reviews.title')}</h2>
        {reviews.length > 0 && (
          <div className="average-rating">
            <div className="stars-display">
              {renderStars(Math.round(averageRating))}
            </div>
            <span className="rating-value">{averageRating}</span>
            <span className="reviews-count">({reviews.length} {reviews.length === 1 ? t('reviews.reviewsCount') : t('reviews.reviewsCountPlural')})</span>
          </div>
        )}
      </div>

      {reviews.length === 0 ? (
        <div className="no-reviews">
          <p>{t('reviews.noReviews')}</p>
          <p className="hint">{t('reviews.noReviewsHint')}</p>
        </div>
      ) : (
        <div className="reviews-list">
          {reviews.map((review) => (
            <div key={review.id} className="review-card">
              <div className="review-header">
                <div className="user-info">
                  {review.profiles?.avatar_url ? (
                    <img
                      src={review.profiles.avatar_url}
                      alt={review.profiles.full_name}
                      className="user-avatar"
                    />
                  ) : (
                    <div className="user-avatar-placeholder">
                      {review.profiles?.full_name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="user-name">{review.profiles?.full_name || t('reviews.user')}</div>
                    <div className="review-date">{formatDate(review.created_at)}</div>
                  </div>
                </div>
                <div className="review-rating">
                  {renderStars(review.rating)}
                </div>
              </div>
              {review.comment && (
                <div className="review-comment">{review.comment}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

Reviews.displayName = 'Reviews';

export default Reviews;

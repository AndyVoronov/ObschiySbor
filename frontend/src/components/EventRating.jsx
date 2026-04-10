import { useState, useEffect } from 'react';
import { reviewsApi } from '../lib/api';
import './EventRating.css';

const EventRating = ({ eventId, compact = false }) => {
  const [rating, setRating] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRating();
  }, [eventId]);

  const fetchRating = async () => {
    try {
      const response = await reviewsApi.list(eventId);
      const data = response.data;

      if (data && data.length > 0) {
        const avg = data.reduce((sum, review) => sum + review.rating, 0) / data.length;
        setRating({
          average: avg.toFixed(1),
          count: data.length
        });
      }
    } catch (error) {
      // Игнорируем ошибки (например, 404 если таблица не существует)
      if (error.response?.status !== 404) {
        console.error('Ошибка загрузки рейтинга:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading || !rating) {
    return null;
  }

  const renderStars = () => {
    const fullStars = Math.floor(parseFloat(rating.average));
    const hasHalfStar = rating.average - fullStars >= 0.5;

    return (
      <div className="rating-stars">
        {[...Array(5)].map((_, index) => {
          if (index < fullStars) {
            return <span key={index} className="star filled">★</span>;
          } else if (index === fullStars && hasHalfStar) {
            return <span key={index} className="star half">★</span>;
          } else {
            return <span key={index} className="star empty">★</span>;
          }
        })}
      </div>
    );
  };

  if (compact) {
    return (
      <div className="event-rating compact">
        {renderStars()}
        <span className="rating-value">{rating.average}</span>
        <span className="rating-count">({rating.count})</span>
      </div>
    );
  }

  return (
    <div className="event-rating">
      {renderStars()}
      <div className="rating-details">
        <span className="rating-value">{rating.average}</span>
        <span className="rating-count">
          {rating.count} {rating.count === 1 ? 'отзыв' : rating.count < 5 ? 'отзыва' : 'отзывов'}
        </span>
      </div>
    </div>
  );
};

export default EventRating;

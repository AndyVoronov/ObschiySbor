import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './EventRating.css';

const EventRating = ({ eventId, compact = false }) => {
  const [rating, setRating] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRating();
  }, [eventId]);

  const fetchRating = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('rating')
        .eq('event_id', eventId);

      // Если таблицы reviews не существует, молча скрываем компонент
      if (error && error.code === 'PGRST205') {
        setLoading(false);
        return;
      }

      if (error) throw error;

      if (data && data.length > 0) {
        const avg = data.reduce((sum, review) => sum + review.rating, 0) / data.length;
        setRating({
          average: avg.toFixed(1),
          count: data.length
        });
      }
    } catch (error) {
      // Игнорируем ошибки отсутствия таблицы
      if (error.code !== 'PGRST205') {
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

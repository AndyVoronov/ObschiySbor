import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './ReportButton.css';

const REPORT_REASONS = [
  { value: 'spam', label: 'Спам или реклама' },
  { value: 'inappropriate', label: 'Неприемлемый контент' },
  { value: 'fake', label: 'Фейковое событие' },
  { value: 'scam', label: 'Мошенничество' },
  { value: 'duplicate', label: 'Дубликат события' },
  { value: 'wrong_category', label: 'Неверная категория' },
  { value: 'offensive', label: 'Оскорбления' },
  { value: 'other', label: 'Другое' },
];

const ReportButton = ({ eventId, eventTitle }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const handleOpenModal = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setShowModal(true);
    setError(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedReason('');
    setDescription('');
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedReason) {
      setError('Пожалуйста, выберите причину жалобы');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Проверяем, не отправлял ли пользователь уже жалобу на это событие
      const { data: existingReport } = await supabase
        .from('reports')
        .select('id')
        .eq('event_id', eventId)
        .eq('reporter_id', user.id)
        .maybeSingle();

      if (existingReport) {
        setError('Вы уже отправили жалобу на это событие');
        setSubmitting(false);
        return;
      }

      // Создаём жалобу
      const reasonLabel = REPORT_REASONS.find(r => r.value === selectedReason)?.label;
      const fullReason = description
        ? `${reasonLabel}: ${description}`
        : reasonLabel;

      const { error: insertError } = await supabase
        .from('reports')
        .insert([{
          event_id: eventId,
          reporter_id: user.id,
          reason: fullReason,
          status: 'pending',
        }]);

      if (insertError) throw insertError;

      setSubmitted(true);
      setTimeout(() => {
        handleCloseModal();
        setSubmitted(false);
      }, 2000);
    } catch (err) {
      console.error('Ошибка отправки жалобы:', err);
      setError('Не удалось отправить жалобу. Попробуйте позже.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        className="report-button"
        onClick={handleOpenModal}
        title="Пожаловаться на событие"
      >
        <span className="report-icon">⚠️</span>
        Пожаловаться
      </button>

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content report-modal" onClick={(e) => e.stopPropagation()}>
            {submitted ? (
              <div className="report-success">
                <div className="success-icon">✓</div>
                <h3>Жалоба отправлена</h3>
                <p>Спасибо за помощь в поддержании качества платформы!</p>
              </div>
            ) : (
              <>
                <div className="modal-header">
                  <h2>Пожаловаться на событие</h2>
                  <button className="close-button" onClick={handleCloseModal}>
                    ×
                  </button>
                </div>

                <div className="modal-body">
                  <div className="event-info">
                    <strong>Событие:</strong> {eventTitle}
                  </div>

                  <form onSubmit={handleSubmit}>
                    <div className="form-group">
                      <label htmlFor="reason">Причина жалобы *</label>
                      <select
                        id="reason"
                        value={selectedReason}
                        onChange={(e) => setSelectedReason(e.target.value)}
                        required
                      >
                        <option value="">Выберите причину...</option>
                        {REPORT_REASONS.map((reason) => (
                          <option key={reason.value} value={reason.value}>
                            {reason.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="description">
                        Дополнительная информация (необязательно)
                      </label>
                      <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Опишите проблему подробнее..."
                        rows={4}
                        maxLength={500}
                      />
                      <small className="char-count">
                        {description.length}/500
                      </small>
                    </div>

                    {error && (
                      <div className="error-message">
                        {error}
                      </div>
                    )}

                    <div className="modal-actions">
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={handleCloseModal}
                        disabled={submitting}
                      >
                        Отмена
                      </button>
                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={submitting}
                      >
                        {submitting ? 'Отправка...' : 'Отправить жалобу'}
                      </button>
                    </div>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ReportButton;

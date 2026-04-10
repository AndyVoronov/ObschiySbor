import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { reportsApi } from '../lib/api';
import './ReportButton.css';

const ReportButton = ({ eventId, eventTitle, showLabel = true }) => {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const navigate = useNavigate();

  const REPORT_REASONS = [
    { value: 'spam', label: t('reportButton.reasons.spam') },
    { value: 'inappropriate', label: t('reportButton.reasons.inappropriate') },
    { value: 'fake', label: t('reportButton.reasons.fake') },
    { value: 'scam', label: t('reportButton.reasons.scam') },
    { value: 'duplicate', label: t('reportButton.reasons.duplicate') },
    { value: 'wrong_category', label: t('reportButton.reasons.wrong_category') },
    { value: 'offensive', label: t('reportButton.reasons.offensive') },
    { value: 'other', label: t('reportButton.reasons.other') },
  ];
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
      setError(t('reportButton.errorSelectReason'));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const reasonLabel = REPORT_REASONS.find(r => r.value === selectedReason)?.label;
      const fullReason = description
        ? `${reasonLabel}: ${description}`
        : reasonLabel;

      await reportsApi.create(eventId, fullReason);

      setSubmitted(true);
      setTimeout(() => {
        handleCloseModal();
        setSubmitted(false);
      }, 2000);
    } catch (err) {
      console.error('Ошибка отправки жалобы:', err);
      if (err.response?.status === 409) {
        setError(t('reportButton.errorAlreadyReported'));
      } else {
        setError(t('reportButton.errorGeneral'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        className="report-button"
        onClick={handleOpenModal}
        title={t('reportButton.buttonTitle')}
      >
        <span className="report-icon">⚠️</span>
        {showLabel && t('reportButton.buttonText')}
      </button>

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content report-modal" onClick={(e) => e.stopPropagation()}>
            {submitted ? (
              <div className="report-success">
                <div className="success-icon">✓</div>
                <h3>{t('reportButton.successTitle')}</h3>
                <p>{t('reportButton.successMessage')}</p>
              </div>
            ) : (
              <>
                <div className="modal-header">
                  <h2>{t('reportButton.modalTitle')}</h2>
                  <button className="close-button" onClick={handleCloseModal}>
                    ×
                  </button>
                </div>

                <div className="modal-body">
                  <div className="event-info">
                    <strong>{t('reportButton.eventLabel')}</strong> {eventTitle}
                  </div>

                  <form onSubmit={handleSubmit}>
                    <div className="form-group">
                      <label htmlFor="reason">{t('reportButton.reasonLabel')} *</label>
                      <select
                        id="reason"
                        value={selectedReason}
                        onChange={(e) => setSelectedReason(e.target.value)}
                        required
                      >
                        <option value="">{t('reportButton.reasonPlaceholder')}</option>
                        {REPORT_REASONS.map((reason) => (
                          <option key={reason.value} value={reason.value}>
                            {reason.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="description">
                        {t('reportButton.descriptionLabel')}
                      </label>
                      <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={t('reportButton.descriptionPlaceholder')}
                        rows={4}
                        maxLength={500}
                      />
                      <small className="char-count">
                        {description.length}/500 {t('reportButton.charCount')}
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
                        {t('reportButton.cancel')}
                      </button>
                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={submitting}
                      >
                        {submitting ? t('reportButton.submitting') : t('reportButton.submit')}
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

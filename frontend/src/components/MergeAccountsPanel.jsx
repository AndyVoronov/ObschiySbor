import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { profilesApi, dictionariesApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import './MergeAccountsPanel.css';

const MergeAccountsPanel = () => {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const [mergeHistory, setMergeHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedDuplicate, setSelectedDuplicate] = useState(null);
  const [confirmationText, setConfirmationText] = useState('');

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Загружаем историю слияний
      const response = await dictionariesApi.get('account_merge_requests');
      const allHistory = response.data || [];

      // Filter to show only merges involving current user
      const userHistory = allHistory.filter(
        h => h.primary_user_id === user.id || h.secondary_user_id === user.id
      );
      setMergeHistory(userHistory);
    } catch (err) {
      console.error('Error loading merge data:', err);
      setError(t('accountMerge.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const searchForDuplicates = async () => {
    try {
      setSearching(true);
      setError('');
      setSuccess('');

      // The duplicate search was a Supabase RPC - stub for now
      // Backend needs a dedicated endpoint for this
      setSuccess(t('accountMerge.noDuplicates'));
    } catch (err) {
      console.error('Error searching for duplicates:', err);
      setError(t('accountMerge.errors.searchFailed'));
    } finally {
      setSearching(false);
    }
  };

  const handleMergeRequest = (duplicate) => {
    setSelectedDuplicate(duplicate);
    setConfirmationText('');
    setError('');
    setSuccess('');
  };

  const confirmMerge = async () => {
    if (confirmationText !== 'MERGE') {
      setError(t('accountMerge.errors.confirmationRequired'));
      return;
    }

    try {
      setError('');
      // Account merge requires a backend RPC endpoint
      // Stub: show error that this feature is not yet available
      setError(t('accountMerge.errors.mergeFailed', { error: 'Feature temporarily unavailable via API' }));
    } catch (err) {
      console.error('Error merging accounts:', err);
      setError(t('accountMerge.errors.mergeFailed', { error: err.message }));
    }
  };

  const cancelMerge = () => {
    setSelectedDuplicate(null);
    setConfirmationText('');
    setError('');
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'completed':
        return 'badge-success';
      case 'failed':
        return 'badge-error';
      case 'pending':
        return 'badge-warning';
      case 'cancelled':
        return 'badge-inactive';
      default:
        return 'badge-default';
    }
  };

  const getSimilarityBadgeClass = (score) => {
    if (score >= 90) return 'similarity-high';
    if (score >= 70) return 'similarity-medium';
    return 'similarity-low';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="loading">{t('common.loading')}</div>;
  }

  return (
    <div className="merge-accounts-panel">
      <div className="panel-header">
        <h2>{t('accountMerge.title')}</h2>
        <p className="panel-description">{t('accountMerge.description')}</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Поиск дубликатов */}
      <div className="search-section">
        <button
          className="btn-primary btn-large"
          onClick={searchForDuplicates}
          disabled={searching}
        >
          {searching ? t('accountMerge.searching') : t('accountMerge.searchDuplicates')}
        </button>
      </div>

      {/* Модальное окно подтверждения слияния */}
      {selectedDuplicate && (
        <div className="modal-overlay">
          <div className="modal-content merge-confirmation-modal">
            <h3>{t('accountMerge.confirmTitle')}</h3>

            <div className="warning-box">
              <p className="warning-icon">⚠️</p>
              <p>{t('accountMerge.warningMessage')}</p>
            </div>

            <div className="merge-preview">
              <div className="account-info">
                <h4>{t('accountMerge.primaryAccount')}</h4>
                <p><strong>{user.user_metadata?.name || user.email}</strong></p>
                <p className="account-email">{user.email}</p>
              </div>

              <div className="merge-arrow">→</div>

              <div className="account-info secondary">
                <h4>{t('accountMerge.secondaryAccount')}</h4>
                <p><strong>{selectedDuplicate.duplicate_name}</strong></p>
                <p className="account-email">{selectedDuplicate.duplicate_email}</p>
                <p className="account-note">{t('accountMerge.willBeDeleted')}</p>
              </div>
            </div>

            <div className="merge-details">
              <h4>{t('accountMerge.whatWillBeMerged')}</h4>
              <ul>
                <li>{t('accountMerge.mergeItems.events')}</li>
                <li>{t('accountMerge.mergeItems.participations')}</li>
                <li>{t('accountMerge.mergeItems.reviews')}</li>
                <li>{t('accountMerge.mergeItems.referrals')}</li>
                <li>{t('accountMerge.mergeItems.achievements')}</li>
                <li>{t('accountMerge.mergeItems.xp')}</li>
              </ul>
            </div>

            <div className="confirmation-input">
              <label htmlFor="confirmText">
                {t('accountMerge.typeToConfirm')} <strong>MERGE</strong>
              </label>
              <input
                type="text"
                id="confirmText"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="MERGE"
                autoComplete="off"
              />
            </div>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={cancelMerge}
              >
                {t('common.cancel')}
              </button>
              <button
                className="btn-danger"
                onClick={confirmMerge}
                disabled={confirmationText !== 'MERGE'}
              >
                {t('accountMerge.confirmMerge')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* История слияний */}
      {mergeHistory.length > 0 && (
        <div className="history-section">
          <h3>{t('accountMerge.mergeHistory')}</h3>
          <div className="history-list">
            {mergeHistory.map((request) => (
              <div key={request.id} className="history-item">
                <div className="history-info">
                  <div className="history-header">
                    <span className={`badge ${getStatusBadgeClass(request.status)}`}>
                      {t(`accountMerge.statuses.${request.status}`)}
                    </span>
                    <span className="history-date">{formatDate(request.created_at)}</span>
                  </div>
                  <p className="history-type">
                    {t(`accountMerge.mergeTypes.${request.merge_type}`)}
                  </p>
                  {request.merged_data && (
                    <div className="merge-stats">
                      <span>{t('accountMerge.stats.events')}: {request.merged_data.events_transferred || 0}</span>
                      <span>{t('accountMerge.stats.participations')}: {request.merged_data.participations_transferred || 0}</span>
                      <span>{t('accountMerge.stats.reviews')}: {request.merged_data.reviews_transferred || 0}</span>
                      <span>{t('accountMerge.stats.xp')}: {request.merged_data.total_xp || 0}</span>
                    </div>
                  )}
                  {request.error_message && (
                    <p className="error-message">{request.error_message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MergeAccountsPanel;

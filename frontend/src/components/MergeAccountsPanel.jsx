import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import './MergeAccountsPanel.css';

const MergeAccountsPanel = () => {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const [duplicates, setDuplicates] = useState([]);
  const [mergeHistory, setMergeHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [merging, setMerging] = useState(false);
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
      const { data: history, error: historyError } = await supabase
        .from('account_merge_requests')
        .select('*')
        .or(`primary_user_id.eq.${user.id},secondary_user_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (historyError) throw historyError;

      setMergeHistory(history || []);
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

      const { data, error: rpcError } = await supabase
        .rpc('find_potential_duplicate_accounts', {
          p_user_id: user.id
        });

      if (rpcError) throw rpcError;

      if (data && data.length > 0) {
        setDuplicates(data);
        setSuccess(t('accountMerge.duplicatesFound', { count: data.length }));
      } else {
        setDuplicates([]);
        setSuccess(t('accountMerge.noDuplicates'));
      }
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
      setMerging(true);
      setError('');

      const { data, error: rpcError } = await supabase
        .rpc('merge_user_accounts', {
          p_primary_user_id: user.id,
          p_secondary_user_id: selectedDuplicate.duplicate_user_id,
          p_merge_type: 'manual_request'
        });

      if (rpcError) throw rpcError;

      setSuccess(t('accountMerge.mergeSuccess'));
      setSelectedDuplicate(null);
      setConfirmationText('');

      // Перезагружаем данные
      loadData();
      searchForDuplicates();
    } catch (err) {
      console.error('Error merging accounts:', err);
      setError(t('accountMerge.errors.mergeFailed', { error: err.message }));
    } finally {
      setMerging(false);
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

      {/* Найденные дубликаты */}
      {duplicates.length > 0 && (
        <div className="duplicates-section">
          <h3>{t('accountMerge.potentialDuplicates')}</h3>
          <div className="duplicates-list">
            {duplicates.map((duplicate) => (
              <div key={duplicate.duplicate_user_id} className="duplicate-card">
                <div className="duplicate-info">
                  <h4>{duplicate.duplicate_name}</h4>
                  <p className="duplicate-email">{duplicate.duplicate_email}</p>
                  <div className="duplicate-meta">
                    <span className="match-reason">{duplicate.match_reason}</span>
                    <span className={`similarity-badge ${getSimilarityBadgeClass(duplicate.similarity_score)}`}>
                      {t('accountMerge.similarity')}: {duplicate.similarity_score}%
                    </span>
                  </div>
                </div>
                <div className="duplicate-actions">
                  <button
                    className="btn-danger"
                    onClick={() => handleMergeRequest(duplicate)}
                  >
                    {t('accountMerge.mergeAccount')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                disabled={merging}
              >
                {t('common.cancel')}
              </button>
              <button
                className="btn-danger"
                onClick={confirmMerge}
                disabled={merging || confirmationText !== 'MERGE'}
              >
                {merging ? t('accountMerge.merging') : t('accountMerge.confirmMerge')}
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

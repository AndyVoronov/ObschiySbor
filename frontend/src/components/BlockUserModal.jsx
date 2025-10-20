import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import './BlockUserModal.css';

const BlockUserModal = ({ isOpen, onClose, targetUser, onSuccess }) => {
  const { user } = useAuth();
  const [blockType, setBlockType] = useState('temporary');
  const [reason, setReason] = useState('');
  const [blockedUntil, setBlockedUntil] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Минимальная дата - завтра
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().slice(0, 16);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!reason.trim()) {
      setError('Укажите причину блокировки');
      return;
    }

    if (blockType === 'temporary' && !blockedUntil) {
      setError('Укажите дату окончания блокировки');
      return;
    }

    // Проверка что дата в будущем
    if (blockType === 'temporary' && new Date(blockedUntil) <= new Date()) {
      setError('Дата окончания должна быть в будущем');
      return;
    }

    try {
      setLoading(true);

      const until = blockType === 'permanent' ? null : new Date(blockedUntil).toISOString();

      // Вызываем функцию БД block_user
      const { error: rpcError } = await supabase.rpc('block_user', {
        p_user_id: targetUser.id,
        p_blocked_by: user.id,
        p_reason: reason.trim(),
        p_blocked_until: until
      });

      if (rpcError) throw rpcError;

      const userName = targetUser.full_name || targetUser.email || 'Пользователь';
      alert(`Пользователь "${userName}" успешно заблокирован`);

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error('Ошибка блокировки:', err);
      setError(err.message || 'Не удалось заблокировать пользователя');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !targetUser) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content block-user-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🚫 Блокировка пользователя</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="target-user-info">
            <h3>Блокируемый пользователь:</h3>
            <div className="user-card-block">
              {targetUser.avatar_url && (
                <img src={targetUser.avatar_url} alt="Avatar" className="user-avatar-small" />
              )}
              <div>
                <p className="user-name-block">{targetUser.full_name || 'Имя не указано'}</p>
                <p className="user-email-block">{targetUser.email}</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="error-message-block">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="block-user-form">
            <div className="form-group">
              <label>
                Тип блокировки <span className="required">*</span>
              </label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="blockType"
                    value="temporary"
                    checked={blockType === 'temporary'}
                    onChange={(e) => setBlockType(e.target.value)}
                    disabled={loading}
                  />
                  <span>Временная блокировка</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="blockType"
                    value="permanent"
                    checked={blockType === 'permanent'}
                    onChange={(e) => setBlockType(e.target.value)}
                    disabled={loading}
                  />
                  <span>Постоянная блокировка</span>
                </label>
              </div>
            </div>

            {blockType === 'temporary' && (
              <div className="form-group">
                <label htmlFor="blockedUntil">
                  Заблокировать до <span className="required">*</span>
                </label>
                <input
                  type="datetime-local"
                  id="blockedUntil"
                  value={blockedUntil}
                  onChange={(e) => setBlockedUntil(e.target.value)}
                  min={minDate}
                  disabled={loading}
                  required={blockType === 'temporary'}
                />
                <small className="field-hint">
                  Укажите дату и время, до которого пользователь будет заблокирован
                </small>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="blockReason">
                Причина блокировки <span className="required">*</span>
              </label>
              <textarea
                id="blockReason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Укажите причину блокировки (будет видна пользователю)..."
                rows="5"
                maxLength="500"
                disabled={loading}
                required
              />
              <div className="char-counter">
                {reason.length} / 500 символов
              </div>
            </div>

            <div className="warning-box">
              <p><strong>⚠️ Внимание!</strong></p>
              <p>После блокировки пользователь:</p>
              <ul>
                <li>Не сможет создавать новые события</li>
                <li>Не сможет участвовать в событиях</li>
                <li>Получит уведомление с указанием причины</li>
                <li>Сможет подать обжалование блокировки</li>
              </ul>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-cancel-block"
                onClick={onClose}
                disabled={loading}
              >
                Отмена
              </button>
              <button
                type="submit"
                className="btn-submit-block"
                disabled={loading || !reason.trim()}
              >
                {loading ? 'Блокировка...' : '🚫 Заблокировать'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BlockUserModal;

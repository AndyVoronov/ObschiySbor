import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { adminApi } from '../lib/api';
import AppealBlockModal from './AppealBlockModal';
import './BlockedUserNotice.css';

const BlockedUserNotice = ({ blockInfo, onAppealSubmitted }) => {
  const { user } = useAuth();
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [isUnblocking, setIsUnblocking] = useState(false);
  const [blockExpired, setBlockExpired] = useState(false);

  if (!blockInfo || !blockInfo.is_blocked) {
    return null;
  }

  const isPermanent = !blockInfo.blocked_until;

  // Проверка истечения срока блокировки
  useEffect(() => {
    if (!isPermanent && blockInfo.blocked_until) {
      const checkExpiration = () => {
        const now = new Date();
        const until = new Date(blockInfo.blocked_until);
        setBlockExpired(until <= now);
      };

      checkExpiration();
      // Проверяем каждую минуту
      const interval = setInterval(checkExpiration, 60000);
      return () => clearInterval(interval);
    }
  }, [isPermanent, blockInfo.blocked_until]);

  // Автоматическая разблокировка
  const handleSelfUnblock = async () => {
    if (!blockExpired) return;

    setIsUnblocking(true);
    try {
      await adminApi.unblockUser(user.id);

      alert('✅ Вы успешно разблокированы! Страница будет перезагружена.');
      window.location.reload();
    } catch (err) {
      console.error('Ошибка разблокировки:', err);
      alert('Ошибка при разблокировке. Попробуйте обновить страницу.');
    } finally {
      setIsUnblocking(false);
    }
  };

  const blockedUntilDate = blockInfo.blocked_until
    ? new Date(blockInfo.blocked_until).toLocaleString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : null;

  const blockedAtDate = blockInfo.blocked_at
    ? new Date(blockInfo.blocked_at).toLocaleString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Неизвестно';

  return (
    <>
      <div className="blocked-user-notice">
        <div className="blocked-notice-icon">🚫</div>
        <div className="blocked-notice-content">
          <h2 className="blocked-notice-title">
            {isPermanent ? 'Ваш аккаунт заблокирован навсегда' : 'Ваш аккаунт временно заблокирован'}
          </h2>

          <div className="blocked-notice-details">
            <div className="blocked-detail-item">
              <span className="detail-label">Дата блокировки:</span>
              <span className="detail-value">{blockedAtDate}</span>
            </div>

            {!isPermanent && (
              <div className="blocked-detail-item">
                <span className="detail-label">Блокировка до:</span>
                <span className="detail-value">{blockedUntilDate}</span>
              </div>
            )}

            <div className="blocked-detail-item">
              <span className="detail-label">Причина:</span>
              <span className="detail-value reason">{blockInfo.block_reason}</span>
            </div>
          </div>

          <div className="blocked-notice-message">
            {blockExpired ? (
              <div className="block-expired-message">
                <p className="expired-text">
                  ⏰ <strong>Срок блокировки истёк!</strong>
                </p>
                <p className="expired-help">
                  Вы можете разблокировать себя самостоятельно, нажав кнопку ниже.
                </p>
              </div>
            ) : (
              <>
                <p>
                  Во время блокировки вы <strong>не можете</strong>:
                </p>
                <ul>
                  <li>Создавать новые события</li>
                  <li>Участвовать в событиях</li>
                </ul>
                <p className="blocked-notice-help">
                  Если вы считаете блокировку несправедливой, вы можете подать обжалование.
                </p>
              </>
            )}
          </div>

          <div className="blocked-actions">
            {blockExpired ? (
              <button
                className="btn-unblock-self"
                onClick={handleSelfUnblock}
                disabled={isUnblocking}
              >
                {isUnblocking ? '⏳ Разблокировка...' : '✅ Разблокировать себя'}
              </button>
            ) : (
              <button
                className="btn-appeal-block"
                onClick={() => setShowAppealModal(true)}
              >
                📝 Обжаловать блокировку
              </button>
            )}
          </div>
        </div>
      </div>

      {showAppealModal && (
        <AppealBlockModal
          isOpen={showAppealModal}
          onClose={() => setShowAppealModal(false)}
          blockInfo={blockInfo}
          onSuccess={() => {
            setShowAppealModal(false);
            if (onAppealSubmitted) {
              onAppealSubmitted();
            }
          }}
        />
      )}
    </>
  );
};

export default BlockedUserNotice;

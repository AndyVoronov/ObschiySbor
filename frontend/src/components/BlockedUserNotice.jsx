import { useState } from 'react';
import AppealBlockModal from './AppealBlockModal';
import './BlockedUserNotice.css';

const BlockedUserNotice = ({ blockInfo, onAppealSubmitted }) => {
  const [showAppealModal, setShowAppealModal] = useState(false);

  if (!blockInfo || !blockInfo.is_blocked) {
    return null;
  }

  const isPermanent = !blockInfo.blocked_until;
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
          </div>

          <button
            className="btn-appeal-block"
            onClick={() => setShowAppealModal(true)}
          >
            📝 Обжаловать блокировку
          </button>
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

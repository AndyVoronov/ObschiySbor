import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import './ReferralCodeInput.css';

/**
 * Компонент для ввода реферального кода при регистрации
 */
const ReferralCodeInput = ({ onCodeChange, initialCode = '' }) => {
  const { t } = useTranslation('common');
  const [code, setCode] = useState(initialCode);
  const [showInput, setShowInput] = useState(!!initialCode);

  useEffect(() => {
    // Проверяем URL параметр ref
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');

    if (refCode && !initialCode) {
      setCode(refCode);
      setShowInput(true);
      if (onCodeChange) {
        onCodeChange(refCode);
      }
    }
  }, [initialCode, onCodeChange]);

  const handleCodeChange = (e) => {
    const newCode = e.target.value.toUpperCase().trim();
    setCode(newCode);
    if (onCodeChange) {
      onCodeChange(newCode);
    }
  };

  const handleToggleInput = () => {
    setShowInput(!showInput);
    if (showInput) {
      setCode('');
      if (onCodeChange) {
        onCodeChange('');
      }
    }
  };

  return (
    <div className="referral-code-input">
      <button
        type="button"
        className="toggle-referral-input"
        onClick={handleToggleInput}
      >
        {showInput ? '−' : '+'} {t('referral.haveReferralCode')}
      </button>

      {showInput && (
        <div className="referral-input-container">
          <input
            type="text"
            className="referral-code-field"
            placeholder={t('referral.enterCode')}
            value={code}
            onChange={handleCodeChange}
            maxLength={20}
          />
          {code && (
            <div className="referral-code-hint">
              <span className="hint-icon">ℹ️</span>
              <span>{t('referral.codeApplied')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

ReferralCodeInput.propTypes = {
  onCodeChange: PropTypes.func,
  initialCode: PropTypes.string,
};

export default ReferralCodeInput;

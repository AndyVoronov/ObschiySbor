import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import './PromoCodeInput.css';

const PromoCodeInput = ({ category, price, onPromoApplied, initialCode = '' }) => {
  const { t } = useTranslation('common');
  const [code, setCode] = useState(initialCode);
  const [validating, setValidating] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [error, setError] = useState('');
  const [showInput, setShowInput] = useState(!!initialCode);

  const validatePromoCode = async () => {
    if (!code.trim()) {
      setError(t('promoCode.errors.required'));
      return;
    }

    setValidating(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError(t('promoCode.errors.authRequired'));
        setValidating(false);
        return;
      }

      const { data, error: rpcError } = await supabase.rpc('validate_promo_code', {
        p_code: code.trim().toUpperCase(),
        p_user_id: user.id,
        p_category: category || null,
        p_price: price || 0
      });

      if (rpcError) {
        console.error('Promo code validation error:', rpcError);
        setError(t('promoCode.errors.invalid'));
        setValidating(false);
        return;
      }

      if (data && data.length > 0) {
        const promoData = data[0];

        if (!promoData.is_valid) {
          setError(t(`promoCode.errors.${promoData.error_message}`) || promoData.error_message);
          setValidating(false);
          return;
        }

        setAppliedPromo(promoData);
        if (onPromoApplied) {
          onPromoApplied({
            code: code.trim().toUpperCase(),
            promoCodeId: promoData.promo_code_id,
            discountAmount: promoData.discount_amount,
            finalPrice: promoData.final_price,
            discountType: promoData.discount_type,
            description: promoData.description,
            discountValue: promoData.discount_value
          });
        }
      } else {
        setError(t('promoCode.errors.invalid'));
      }
    } catch (err) {
      console.error('Unexpected error during promo code validation:', err);
      setError(t('promoCode.errors.validationFailed'));
    }

    setValidating(false);
  };

  const removePromoCode = () => {
    setAppliedPromo(null);
    setCode('');
    setError('');
    if (onPromoApplied) {
      onPromoApplied(null);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !validating) {
      validatePromoCode();
    }
  };

  if (!showInput && !appliedPromo) {
    return (
      <div className="promo-code-toggle">
        <button
          type="button"
          className="promo-code-toggle-button"
          onClick={() => setShowInput(true)}
        >
          <span className="promo-icon">🎟️</span>
          {t('promoCode.havePromoCode')}
        </button>
      </div>
    );
  }

  return (
    <div className="promo-code-input-container">
      {!appliedPromo ? (
        <>
          <label className="promo-code-label">
            <span className="promo-icon">🎟️</span>
            {t('promoCode.title')}
          </label>
          <div className="promo-code-input-wrapper">
            <input
              type="text"
              className={`promo-code-input ${error ? 'error' : ''}`}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError('');
              }}
              onKeyPress={handleKeyPress}
              placeholder={t('promoCode.placeholder')}
              maxLength={50}
              disabled={validating}
            />
            <button
              type="button"
              className="promo-code-apply-button"
              onClick={validatePromoCode}
              disabled={validating || !code.trim()}
            >
              {validating ? t('promoCode.validating') : t('promoCode.apply')}
            </button>
            {showInput && (
              <button
                type="button"
                className="promo-code-cancel-button"
                onClick={() => {
                  setShowInput(false);
                  setCode('');
                  setError('');
                }}
              >
                ✕
              </button>
            )}
          </div>
          {error && (
            <div className="promo-code-error">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}
        </>
      ) : (
        <div className="promo-code-applied">
          <div className="promo-code-applied-header">
            <span className="promo-icon success">✓</span>
            <span className="promo-code-applied-title">
              {t('promoCode.applied')}
            </span>
          </div>
          <div className="promo-code-applied-details">
            <div className="promo-code-name">
              <strong>{appliedPromo.code}</strong>
              {appliedPromo.description && (
                <span className="promo-code-description">
                  {appliedPromo.description}
                </span>
              )}
            </div>
            <div className="promo-code-discount">
              {appliedPromo.discount_type === 'percentage' && (
                <span className="discount-badge percentage">
                  -{appliedPromo.discount_value}%
                </span>
              )}
              {appliedPromo.discount_type === 'fixed' && (
                <span className="discount-badge fixed">
                  -{appliedPromo.discount_amount} ₽
                </span>
              )}
              {appliedPromo.discount_type === 'free' && (
                <span className="discount-badge free">
                  {t('promoCode.free')}
                </span>
              )}
            </div>
            {price > 0 && (
              <div className="promo-code-pricing">
                <div className="price-row">
                  <span className="price-label">{t('promoCode.originalPrice')}:</span>
                  <span className="price-value original">{price} ₽</span>
                </div>
                <div className="price-row">
                  <span className="price-label">{t('promoCode.discount')}:</span>
                  <span className="price-value discount">-{appliedPromo.discount_amount} ₽</span>
                </div>
                <div className="price-row final">
                  <span className="price-label">{t('promoCode.finalPrice')}:</span>
                  <span className="price-value final">{appliedPromo.final_price} ₽</span>
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            className="promo-code-remove-button"
            onClick={removePromoCode}
          >
            {t('promoCode.remove')}
          </button>
        </div>
      )}
    </div>
  );
};

export default PromoCodeInput;

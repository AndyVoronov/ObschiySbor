import { forwardRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import PropTypes from 'prop-types';

/**
 * Обёртка для Google reCAPTCHA v2
 *
 * @component
 * @example
 * const recaptchaRef = useRef(null);
 *
 * <RecaptchaWrapper
 *   ref={recaptchaRef}
 *   onChange={(token) => setRecaptchaToken(token)}
 * />
 *
 * // Для получения токена вручную:
 * const token = await recaptchaRef.current.executeAsync();
 *
 * // Для сброса:
 * recaptchaRef.current.reset();
 */
const RecaptchaWrapper = forwardRef(({ onChange, onExpired, onErrored, theme = 'light', size = 'normal' }, ref) => {
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  // Если ключ не настроен, показываем предупреждение в dev режиме
  if (!siteKey) {
    if (import.meta.env.DEV) {
      console.warn('⚠️ reCAPTCHA Site Key не найден в .env файле. Добавьте VITE_RECAPTCHA_SITE_KEY для работы reCAPTCHA.');
      return (
        <div className="recaptcha-placeholder p-4 border-2 border-dashed border-yellow-400 rounded-md bg-yellow-50 dark:bg-yellow-900/20">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ <strong>Dev Mode:</strong> reCAPTCHA отключен. Добавьте VITE_RECAPTCHA_SITE_KEY в .env
          </p>
        </div>
      );
    }
    // В production просто не показываем ничего (но лучше всегда настраивать)
    return null;
  }

  return (
    <div className="recaptcha-container">
      <ReCAPTCHA
        ref={ref}
        sitekey={siteKey}
        onChange={onChange}
        onExpired={onExpired}
        onErrored={onErrored}
        theme={theme}
        size={size}
      />
    </div>
  );
});

RecaptchaWrapper.displayName = 'RecaptchaWrapper';

RecaptchaWrapper.propTypes = {
  /** Колбэк при успешной верификации (возвращает token) */
  onChange: PropTypes.func,
  /** Колбэк при истечении срока действия токена */
  onExpired: PropTypes.func,
  /** Колбэк при ошибке */
  onErrored: PropTypes.func,
  /** Тема (light/dark) */
  theme: PropTypes.oneOf(['light', 'dark']),
  /** Размер (normal/compact/invisible) */
  size: PropTypes.oneOf(['normal', 'compact', 'invisible']),
};

export default RecaptchaWrapper;

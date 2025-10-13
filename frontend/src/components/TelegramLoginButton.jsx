import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

/**
 * Компонент Telegram Login Widget
 * Документация: https://core.telegram.org/widgets/login
 */
const TelegramLoginButton = ({ botUsername, onAuth, buttonSize = 'large', cornerRadius = 10 }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    // Проверяем, не загружен ли уже скрипт
    const existingScript = document.querySelector('script[src*="telegram-widget"]');

    if (!existingScript) {
      // Загружаем скрипт Telegram Widget
      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-widget.js?22';
      script.async = true;
      script.setAttribute('data-telegram-login', botUsername);
      script.setAttribute('data-size', buttonSize);
      script.setAttribute('data-radius', cornerRadius);
      script.setAttribute('data-onauth', 'onTelegramAuth(user)');
      script.setAttribute('data-request-access', 'write');

      containerRef.current?.appendChild(script);
    }

    // Глобальная функция для обработки callback от Telegram
    window.onTelegramAuth = (user) => {
      console.log('Telegram Auth User:', user);
      onAuth(user);
    };

    return () => {
      // Очистка
      delete window.onTelegramAuth;
    };
  }, [botUsername, buttonSize, cornerRadius, onAuth]);

  return <div ref={containerRef} className="telegram-login-container"></div>;
};

TelegramLoginButton.propTypes = {
  botUsername: PropTypes.string.isRequired,
  onAuth: PropTypes.func.isRequired,
  buttonSize: PropTypes.oneOf(['small', 'medium', 'large']),
  cornerRadius: PropTypes.number,
};

export default TelegramLoginButton;

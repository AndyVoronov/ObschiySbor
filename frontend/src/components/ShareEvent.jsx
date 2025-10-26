import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import './ShareEvent.css';

/**
 * Компонент для репоста события в социальные сети
 */
const ShareEvent = ({ event, showLabel = true }) => {
  const { t } = useTranslation('common');
  const [showOptions, setShowOptions] = useState(false);
  const [copied, setCopied] = useState(false);

  // Формируем URL события
  const eventUrl = `${window.location.origin}/events/${event.id}`;

  // Формируем текст для репоста
  const shareText = `${event.title}\n\n📅 ${new Date(event.event_date).toLocaleString('ru-RU')}\n📍 ${event.location || 'Онлайн'}\n\n${event.description?.substring(0, 200)}${event.description?.length > 200 ? '...' : ''}`;

  // Копирование ссылки в буфер обмена
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(eventUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Ошибка копирования:', err);
    }
  };

  // Репост в Telegram
  const shareToTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(eventUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  // Репост в VK
  const shareToVK = () => {
    const url = `https://vk.com/share.php?url=${encodeURIComponent(eventUrl)}&title=${encodeURIComponent(event.title)}&description=${encodeURIComponent(event.description || '')}`;
    window.open(url, '_blank');
  };

  // Репост в WhatsApp
  const shareToWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n\n${eventUrl}`)}`;
    window.open(url, '_blank');
  };

  // Репост через Web Share API (если доступен)
  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: shareText,
          url: eventUrl,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Ошибка репоста:', err);
        }
      }
    } else {
      // Fallback - показываем опции
      setShowOptions(!showOptions);
    }
  };

  return (
    <div className="share-event">
      <button
        onClick={shareNative}
        className="share-button"
        title={t('shareEvent.title')}
      >
        <span className="share-icon">🔗</span>
        {showLabel && <span className="share-label">{t('shareEvent.share')}</span>}
      </button>

      {showOptions && (
        <div className="share-options">
          <button onClick={shareToTelegram} className="share-option telegram">
            <span className="option-icon">📱</span>
            <span>Telegram</span>
          </button>

          <button onClick={shareToVK} className="share-option vk">
            <span className="option-icon">👥</span>
            <span>VK</span>
          </button>

          <button onClick={shareToWhatsApp} className="share-option whatsapp">
            <span className="option-icon">💬</span>
            <span>WhatsApp</span>
          </button>

          <button onClick={copyToClipboard} className="share-option copy">
            <span className="option-icon">{copied ? '✅' : '📋'}</span>
            <span>{copied ? t('shareEvent.copied') : t('shareEvent.copyLink')}</span>
          </button>
        </div>
      )}
    </div>
  );
};

ShareEvent.propTypes = {
  event: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    event_date: PropTypes.string.isRequired,
    location: PropTypes.string,
  }).isRequired,
  showLabel: PropTypes.bool,
};

export default ShareEvent;

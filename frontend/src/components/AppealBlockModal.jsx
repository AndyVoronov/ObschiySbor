import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import './AppealBlockModal.css';

const AppealBlockModal = ({ isOpen, onClose, blockInfo, onSuccess }) => {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const maxLength = 1000;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!reason.trim()) {
      setError('Пожалуйста, укажите причину обжалования');
      return;
    }

    if (reason.length > maxLength) {
      setError(`Текст не должен превышать ${maxLength} символов`);
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Получаем активную блокировку пользователя
      const { data: activeBlock, error: blockError } = await supabase
        .from('user_blocks')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (blockError) throw new Error('Не удалось найти активную блокировку');

      // Проверяем, нет ли уже pending обжалования
      const { data: existingAppeal, error: checkError } = await supabase
        .from('block_appeals')
        .select('id')
        .eq('user_id', user.id)
        .eq('block_id', activeBlock.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingAppeal) {
        setError('У вас уже есть активное обжалование, ожидающее рассмотрения');
        return;
      }

      // Создаём обжалование
      const { error: insertError } = await supabase
        .from('block_appeals')
        .insert({
          user_id: user.id,
          block_id: activeBlock.id,
          reason: reason.trim(),
          status: 'pending'
        });

      if (insertError) throw insertError;

      alert('Ваше обжалование успешно отправлено и будет рассмотрено администрацией в течение 48 часов.');

      if (onSuccess) {
        onSuccess();
      } else {
        onClose();
      }
    } catch (err) {
      console.error('Ошибка отправки обжалования:', err);
      setError(err.message || 'Не удалось отправить обжалование');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content appeal-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📝 Обжалование блокировки</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="error-message-appeal">
              {error}
            </div>
          )}

          <div className="appeal-info-box">
            <h3>ℹ️ Информация об обжаловании</h3>
            <ul>
              <li>Ваше обжалование будет рассмотрено администрацией в течение <strong>48 часов</strong></li>
              <li>Укажите причину, по которой вы считаете блокировку несправедливой</li>
              <li>Будьте вежливы и конструктивны в своих объяснениях</li>
              <li>Вы получите уведомление о результате рассмотрения</li>
            </ul>
          </div>

          <form onSubmit={handleSubmit} className="appeal-form">
            <div className="form-group">
              <label htmlFor="appeal-reason">
                Причина обжалования <span className="required">*</span>
              </label>
              <textarea
                id="appeal-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Объясните, почему вы считаете блокировку несправедливой..."
                rows="8"
                maxLength={maxLength}
                disabled={loading}
                required
              />
              <div className="char-counter">
                {reason.length} / {maxLength} символов
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-cancel-appeal"
                onClick={onClose}
                disabled={loading}
              >
                Отмена
              </button>
              <button
                type="submit"
                className="btn-submit-appeal"
                disabled={loading || !reason.trim()}
              >
                {loading ? 'Отправка...' : 'Отправить обжалование'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AppealBlockModal;

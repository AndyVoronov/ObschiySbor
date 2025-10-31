import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import './AvatarUpload.css';

const AvatarUpload = ({ currentAvatar, userId, onAvatarUpdate }) => {
  const { t } = useTranslation('common');
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(currentAvatar);
  const fileInputRef = useRef(null);
  
  // Обновляем локальное состояние при изменении внешнего значения
  useEffect(() => {
    if (currentAvatar !== avatarUrl) {
      setAvatarUrl(currentAvatar);
    }
  }, [currentAvatar]);

  const uploadAvatar = async (event) => {
    try {
      setUploading(true);

      const file = event.target.files?.[0];
      if (!file) return;

      // Валидация типа файла
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        alert('Пожалуйста, загрузите изображение в формате JPG, PNG или WEBP');
        return;
      }

      // Валидация размера (максимум 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('Размер файла не должен превышать 2MB');
        return;
      }

      // Создаём уникальное имя файла
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Загружаем файл в Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      // Получаем публичный URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Обновляем профиль пользователя
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) {
        throw updateError;
      }

      setAvatarUrl(publicUrl);
      onAvatarUpdate(publicUrl);
      alert('Аватар успешно обновлён!');
    } catch (error) {
      console.error('Ошибка загрузки аватара:', error.message);
      alert('Ошибка при загрузке аватара: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    try {
      setUploading(true);

      // Удаляем URL из профиля
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', userId);

      if (error) throw error;

      setAvatarUrl(null);
      onAvatarUpdate(null);
      alert('Аватар удалён');
    } catch (error) {
      console.error('Ошибка удаления аватара:', error.message);
      alert('Ошибка при удалении аватара: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  // Обработчик для кнопки "Загрузить фото"
  const handleFileInputClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="avatar-upload">
      <div className="avatar-preview">
        {avatarUrl ? (
          <img src={avatarUrl} alt="Avatar" className="avatar-image" />
        ) : (
          <div className="avatar-placeholder">
            <span>👤</span>
          </div>
        )}
      </div>

      <div className="avatar-actions">
        <label htmlFor="avatar-upload" className="btn btn-secondary btn-sm" onClick={handleFileInputClick}>
          {uploading ? t('profile.uploadingAvatar') : avatarUrl ? t('profile.changePhoto') : t('profile.uploadAvatar')}
          <input
            id="avatar-upload"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={uploadAvatar}
            disabled={uploading}
            style={{ display: 'none' }}
          />
        </label>

        {avatarUrl && (
          <button
            onClick={removeAvatar}
            disabled={uploading}
            className="btn btn-danger btn-sm"
          >
            {t('profile.remove')}
          </button>
        )}
      </div>

      <p className="avatar-hint">{t('profile.avatarHint')}</p>
    </div>
  );
};

export default AvatarUpload;

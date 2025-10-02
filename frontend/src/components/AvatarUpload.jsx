import { useState } from 'react';
import { supabase } from '../lib/supabase';
import './AvatarUpload.css';

const AvatarUpload = ({ currentAvatar, userId, onAvatarUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentAvatar);

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

      setPreview(publicUrl);
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

      setPreview(null);
      onAvatarUpdate(null);
      alert('Аватар удалён');
    } catch (error) {
      console.error('Ошибка удаления аватара:', error.message);
      alert('Ошибка при удалении аватара: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="avatar-upload">
      <div className="avatar-preview">
        {preview ? (
          <img src={preview} alt="Avatar" className="avatar-image" />
        ) : (
          <div className="avatar-placeholder">
            <span>👤</span>
          </div>
        )}
      </div>

      <div className="avatar-actions">
        <label htmlFor="avatar-upload" className="btn btn-secondary btn-sm">
          {uploading ? 'Загрузка...' : preview ? 'Изменить фото' : 'Загрузить фото'}
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            onChange={uploadAvatar}
            disabled={uploading}
            style={{ display: 'none' }}
          />
        </label>

        {preview && (
          <button
            onClick={removeAvatar}
            disabled={uploading}
            className="btn btn-danger btn-sm"
          >
            Удалить
          </button>
        )}
      </div>

      <p className="avatar-hint">JPG, PNG или WEBP. Максимум 2MB.</p>
    </div>
  );
};

export default AvatarUpload;

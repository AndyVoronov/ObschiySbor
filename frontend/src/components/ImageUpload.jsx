import { useState } from 'react';
import { uploadApi } from '../lib/api';
import './ImageUpload.css';

const ImageUpload = ({ onImageUpload, currentImage }) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentImage || null);

  const handleFileChange = async (e) => {
    try {
      const file = e.target.files[0];
      if (!file) return;

      // Валидация
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        alert('Поддерживаются только форматы: JPG, PNG, WEBP');
        return;
      }

      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        alert('Максимальный размер файла: 5MB');
        return;
      }

      setUploading(true);

      // Загружаем через API
      const response = await uploadApi.upload(file, 'event');
      const publicUrl = response.data.url;

      setPreviewUrl(publicUrl);
      onImageUpload(publicUrl);

    } catch (error) {
      console.error('Ошибка:', error);
      alert('Произошла ошибка при загрузке изображения: ' + (error.response?.data?.message || error.message));
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onImageUpload(null);
  };

  return (
    <div className="image-upload">
      <label className="image-upload-label">Изображение события</label>

      {previewUrl ? (
        <div className="image-preview">
          <img src={previewUrl} alt="Preview" />
          <button
            type="button"
            onClick={handleRemove}
            className="btn-remove"
            disabled={uploading}
          >
            Удалить
          </button>
        </div>
      ) : (
        <div className="upload-area">
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileChange}
            disabled={uploading}
            id="image-upload-input"
          />
          <label htmlFor="image-upload-input" className="upload-button">
            {uploading ? '⏳ Загрузка...' : '📷 Выбрать изображение'}
          </label>
          <p className="upload-hint">
            JPG, PNG, WEBP до 5MB
          </p>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { commissionApi } from '../lib/api';
import { getCurrentUser } from '../lib/authStorage';
import './CommissionManager.css';

const CommissionManager = () => {
  const { t } = useTranslation('common');
  const [commissionSettings, setCommissionSettings] = useState(null);
  const [discountPeriods, setDiscountPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    discount_percentage: 0,
    start_date: '',
    end_date: '',
    applicable_categories: [],
    min_event_price: 0,
    is_active: true,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Загрузка настроек комиссии
      const settingsResponse = await commissionApi.get();
      setCommissionSettings(settingsResponse.data || null);

      // Загрузка периодов скидок
      const periodsResponse = await commissionApi.listDiscounts();
      setDiscountPeriods(periodsResponse.data || []);
    } catch (err) {
      console.error('Error loading commission data:', err);
      setError(t('commissionManager.errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCategoryToggle = (category) => {
    setFormData(prev => {
      const categories = prev.applicable_categories || [];
      const index = categories.indexOf(category);

      if (index > -1) {
        return {
          ...prev,
          applicable_categories: categories.filter(c => c !== category)
        };
      } else {
        return {
          ...prev,
          applicable_categories: [...categories, category]
        };
      }
    });
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError(t('commissionManager.errors.nameRequired'));
      return false;
    }

    if (formData.discount_percentage < 0 || formData.discount_percentage > 100) {
      setError(t('commissionManager.errors.discountInvalid'));
      return false;
    }

    if (!formData.start_date || !formData.end_date) {
      setError(t('commissionManager.errors.datesRequired'));
      return false;
    }

    if (new Date(formData.end_date) <= new Date(formData.start_date)) {
      setError(t('commissionManager.errors.invalidDateRange'));
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) return;

    try {
      const user = getCurrentUser();

      if (!user) {
        setError(t('commissionManager.errors.notAuthenticated'));
        return;
      }

      const periodData = new FormData();
      periodData.append('name', formData.name.trim());
      if (formData.description.trim()) {
        periodData.append('description', formData.description.trim());
      }
      periodData.append('discount_percentage', parseFloat(formData.discount_percentage));
      periodData.append('start_date', formData.start_date);
      periodData.append('end_date', formData.end_date);
      if (formData.applicable_categories.length > 0) {
        periodData.append('applicable_categories', JSON.stringify(formData.applicable_categories));
      }
      periodData.append('min_event_price', parseFloat(formData.min_event_price) || 0);
      periodData.append('is_active', formData.is_active);

      await commissionApi.createDiscount(periodData);

      setSuccess(t('commissionManager.success.created'));
      setFormData({
        name: '',
        description: '',
        discount_percentage: 0,
        start_date: '',
        end_date: '',
        applicable_categories: [],
        min_event_price: 0,
        is_active: true,
      });
      setShowCreateForm(false);
      loadData();
    } catch (err) {
      console.error('Error creating discount period:', err);
      setError(t('commissionManager.errors.createFailed'));
    }
  };

  const toggleActiveStatus = async (id, currentStatus) => {
    try {
      const formData = new FormData();
      formData.append('is_active', !currentStatus);
      await commissionApi.createDiscount(formData);

      loadData();
      setSuccess(t('commissionManager.success.updated'));
    } catch (err) {
      console.error('Error updating discount period:', err);
      setError(t('commissionManager.errors.updateFailed'));
    }
  };

  const deletePeriod = async (id) => {
    if (!confirm(t('commissionManager.confirmDelete'))) return;

    try {
      await commissionApi.deleteDiscount(id);

      loadData();
      setSuccess(t('commissionManager.success.deleted'));
    } catch (err) {
      console.error('Error deleting discount period:', err);
      setError(t('commissionManager.errors.deleteFailed'));
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isPeriodActive = (period) => {
    const now = new Date();
    const start = new Date(period.start_date);
    const end = new Date(period.end_date);
    return period.is_active && now >= start && now <= end;
  };

  const categories = [
    'board_games', 'cycling', 'hiking', 'yoga', 'cooking',
    'music_jam', 'seminar', 'picnic', 'photo_walk', 'quest',
    'dance', 'tour', 'volunteer', 'fitness', 'theater',
    'auto_tour', 'craft', 'concert', 'sports', 'eco_tour'
  ];

  if (loading) {
    return <div className="loading">{t('common.loading')}</div>;
  }

  return (
    <div className="commission-manager">
      <div className="manager-header">
        <h2>{t('commissionManager.title')}</h2>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Текущие настройки комиссии */}
      <div className="commission-settings-card">
        <h3>{t('commissionManager.currentSettings')}</h3>
        <div className="settings-content">
          <div className="setting-item">
            <span className="setting-label">{t('commissionManager.baseCommission')}:</span>
            <span className="setting-value">
              {commissionSettings?.base_commission_percentage || 10}%
            </span>
          </div>
          <p className="setting-description">
            {commissionSettings?.description || t('commissionManager.defaultDescription')}
          </p>
        </div>
      </div>

      {/* Управление периодами скидок */}
      <div className="discount-periods-section">
        <div className="section-header">
          <h3>{t('commissionManager.discountPeriods')}</h3>
          <button
            className="btn-primary"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? t('common.cancel') : t('commissionManager.createNew')}
          </button>
        </div>

        {showCreateForm && (
          <form className="discount-form" onSubmit={handleSubmit}>
            <h4>{t('commissionManager.createPeriod')}</h4>

            <div className="form-group">
              <label htmlFor="name">{t('commissionManager.periodName')}</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder={t('commissionManager.periodNamePlaceholder')}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">{t('commissionManager.description')}</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder={t('commissionManager.descriptionPlaceholder')}
                rows={3}
              />
            </div>

            <div className="form-group">
              <label htmlFor="discount_percentage">
                {t('commissionManager.discountPercentage')}
              </label>
              <input
                type="number"
                id="discount_percentage"
                name="discount_percentage"
                value={formData.discount_percentage}
                onChange={handleInputChange}
                min="0"
                max="100"
                step="0.01"
                required
              />
              <p className="field-hint">{t('commissionManager.discountHint')}</p>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="start_date">{t('commissionManager.startDate')}</label>
                <input
                  type="datetime-local"
                  id="start_date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="end_date">{t('commissionManager.endDate')}</label>
                <input
                  type="datetime-local"
                  id="end_date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>{t('commissionManager.categories')}</label>
              <div className="category-checkboxes">
                {categories.map(category => (
                  <label key={category} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.applicable_categories.includes(category)}
                      onChange={() => handleCategoryToggle(category)}
                    />
                    <span>{t(`categories.${category}`)}</span>
                  </label>
                ))}
              </div>
              <p className="field-hint">{t('commissionManager.categoriesHint')}</p>
            </div>

            <div className="form-group">
              <label htmlFor="min_event_price">{t('commissionManager.minEventPrice')}</label>
              <input
                type="number"
                id="min_event_price"
                name="min_event_price"
                value={formData.min_event_price}
                onChange={handleInputChange}
                min="0"
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                />
                <span>{t('commissionManager.isActive')}</span>
              </label>
            </div>

            <button type="submit" className="btn-primary btn-large">
              {t('commissionManager.create')}
            </button>
          </form>
        )}

        <div className="periods-list">
          {discountPeriods.length === 0 ? (
            <p className="no-periods">{t('commissionManager.noPeriods')}</p>
          ) : (
            <div className="period-cards">
              {discountPeriods.map(period => (
                <div
                  key={period.id}
                  className={`period-card ${isPeriodActive(period) ? 'active-now' : ''} ${!period.is_active ? 'inactive' : ''}`}
                >
                  <div className="period-header">
                    <div>
                      <h4 className="period-name">{period.name}</h4>
                      {period.description && (
                        <p className="period-description">{period.description}</p>
                      )}
                    </div>
                    <div className="period-badges">
                      {isPeriodActive(period) && (
                        <span className="badge badge-active-now">
                          {t('commissionManager.activeNow')}
                        </span>
                      )}
                      {period.is_active ? (
                        <span className="badge badge-success">
                          {t('commissionManager.active')}
                        </span>
                      ) : (
                        <span className="badge badge-inactive">
                          {t('commissionManager.inactive')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="period-details">
                    <div className="detail-row">
                      <span className="label">{t('commissionManager.discount')}:</span>
                      <span className="value discount-value">
                        {period.discount_percentage}%
                        {period.discount_percentage === 100 && (
                          <span className="free-badge"> ({t('commissionManager.free')})</span>
                        )}
                      </span>
                    </div>

                    <div className="detail-row">
                      <span className="label">{t('commissionManager.period')}:</span>
                      <span className="value">
                        {formatDate(period.start_date)} — {formatDate(period.end_date)}
                      </span>
                    </div>

                    {period.applicable_categories && (
                      <div className="detail-row">
                        <span className="label">{t('commissionManager.applicableTo')}:</span>
                        <span className="value">
                          {period.applicable_categories.map(cat => t(`categories.${cat}`)).join(', ')}
                        </span>
                      </div>
                    )}

                    {period.min_event_price > 0 && (
                      <div className="detail-row">
                        <span className="label">{t('commissionManager.minPrice')}:</span>
                        <span className="value">{period.min_event_price} ₽</span>
                      </div>
                    )}
                  </div>

                  <div className="period-actions">
                    <button
                      className="btn-secondary"
                      onClick={() => toggleActiveStatus(period.id, period.is_active)}
                    >
                      {period.is_active
                        ? t('commissionManager.deactivate')
                        : t('commissionManager.activate')}
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() => deletePeriod(period.id)}
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommissionManager;

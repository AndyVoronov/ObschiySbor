import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import supabase from '../lib/supabase';
import './PromoCodeManager.css';

const PromoCodeManager = () => {
  const { t } = useTranslation('common');
  const [promoCodes, setPromoCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_type: 'percentage',
    discount_value: 0,
    applicable_categories: [],
    min_event_price: 0,
    usage_limit: null,
    per_user_limit: 1,
    start_date: '',
    end_date: '',
    is_active: true,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadPromoCodes();
  }, []);

  const loadPromoCodes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromoCodes(data || []);
    } catch (err) {
      console.error('Error loading promo codes:', err);
      setError(t('promoCodeManager.errorLoading'));
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
    if (!formData.code.trim()) {
      setError(t('promoCodeManager.errors.codeRequired'));
      return false;
    }

    if (formData.discount_value <= 0) {
      setError(t('promoCodeManager.errors.discountInvalid'));
      return false;
    }

    if (formData.discount_type === 'percentage' && formData.discount_value > 100) {
      setError(t('promoCodeManager.errors.percentageTooHigh'));
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
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError(t('promoCodeManager.errors.notAuthenticated'));
        return;
      }

      const promoData = {
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim() || null,
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        applicable_categories: formData.applicable_categories.length > 0
          ? formData.applicable_categories
          : null,
        min_event_price: parseFloat(formData.min_event_price) || 0,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
        per_user_limit: parseInt(formData.per_user_limit) || 1,
        start_date: formData.start_date || new Date().toISOString(),
        end_date: formData.end_date || null,
        is_active: formData.is_active,
        created_by: user.id,
      };

      const { error: insertError } = await supabase
        .from('promo_codes')
        .insert([promoData]);

      if (insertError) throw insertError;

      setSuccess(t('promoCodeManager.success.created'));
      setFormData({
        code: '',
        description: '',
        discount_type: 'percentage',
        discount_value: 0,
        applicable_categories: [],
        min_event_price: 0,
        usage_limit: null,
        per_user_limit: 1,
        start_date: '',
        end_date: '',
        is_active: true,
      });
      setShowCreateForm(false);
      loadPromoCodes();
    } catch (err) {
      console.error('Error creating promo code:', err);
      setError(t('promoCodeManager.errors.createFailed'));
    }
  };

  const toggleActiveStatus = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('promo_codes')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      loadPromoCodes();
      setSuccess(t('promoCodeManager.success.updated'));
    } catch (err) {
      console.error('Error updating promo code:', err);
      setError(t('promoCodeManager.errors.updateFailed'));
    }
  };

  const deletePromoCode = async (id) => {
    if (!confirm(t('promoCodeManager.confirmDelete'))) return;

    try {
      const { error } = await supabase
        .from('promo_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      loadPromoCodes();
      setSuccess(t('promoCodeManager.success.deleted'));
    } catch (err) {
      console.error('Error deleting promo code:', err);
      setError(t('promoCodeManager.errors.deleteFailed'));
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return t('promoCodeManager.noExpiry');
    return new Date(dateString).toLocaleDateString();
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
    <div className="promo-code-manager">
      <div className="manager-header">
        <h2>{t('promoCodeManager.title')}</h2>
        <button
          className="btn-primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? t('common.cancel') : t('promoCodeManager.createNew')}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {showCreateForm && (
        <form className="promo-form" onSubmit={handleSubmit}>
          <h3>{t('promoCodeManager.createPromoCode')}</h3>

          <div className="form-group">
            <label htmlFor="code">{t('promoCodeManager.code')}</label>
            <input
              type="text"
              id="code"
              name="code"
              value={formData.code}
              onChange={handleInputChange}
              placeholder={t('promoCodeManager.codePlaceholder')}
              maxLength={50}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">{t('promoCodeManager.description')}</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder={t('promoCodeManager.descriptionPlaceholder')}
              rows={3}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="discount_type">{t('promoCodeManager.discountType')}</label>
              <select
                id="discount_type"
                name="discount_type"
                value={formData.discount_type}
                onChange={handleInputChange}
                required
              >
                <option value="percentage">{t('promoCodeManager.percentage')}</option>
                <option value="fixed">{t('promoCodeManager.fixed')}</option>
                <option value="free">{t('promoCodeManager.free')}</option>
              </select>
            </div>

            {formData.discount_type !== 'free' && (
              <div className="form-group">
                <label htmlFor="discount_value">
                  {formData.discount_type === 'percentage'
                    ? t('promoCodeManager.discountValuePercent')
                    : t('promoCodeManager.discountValueFixed')}
                </label>
                <input
                  type="number"
                  id="discount_value"
                  name="discount_value"
                  value={formData.discount_value}
                  onChange={handleInputChange}
                  min="0"
                  max={formData.discount_type === 'percentage' ? 100 : undefined}
                  step={formData.discount_type === 'percentage' ? 1 : 0.01}
                  required
                />
              </div>
            )}
          </div>

          <div className="form-group">
            <label>{t('promoCodeManager.categories')}</label>
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
            <p className="field-hint">{t('promoCodeManager.categoriesHint')}</p>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="min_event_price">{t('promoCodeManager.minEventPrice')}</label>
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
              <label htmlFor="usage_limit">{t('promoCodeManager.usageLimit')}</label>
              <input
                type="number"
                id="usage_limit"
                name="usage_limit"
                value={formData.usage_limit || ''}
                onChange={handleInputChange}
                min="1"
                placeholder={t('promoCodeManager.unlimited')}
              />
            </div>

            <div className="form-group">
              <label htmlFor="per_user_limit">{t('promoCodeManager.perUserLimit')}</label>
              <input
                type="number"
                id="per_user_limit"
                name="per_user_limit"
                value={formData.per_user_limit}
                onChange={handleInputChange}
                min="1"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="start_date">{t('promoCodeManager.startDate')}</label>
              <input
                type="datetime-local"
                id="start_date"
                name="start_date"
                value={formData.start_date}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="end_date">{t('promoCodeManager.endDate')}</label>
              <input
                type="datetime-local"
                id="end_date"
                name="end_date"
                value={formData.end_date}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
              />
              <span>{t('promoCodeManager.isActive')}</span>
            </label>
          </div>

          <button type="submit" className="btn-primary btn-large">
            {t('promoCodeManager.create')}
          </button>
        </form>
      )}

      <div className="promo-codes-list">
        <h3>{t('promoCodeManager.existingCodes')}</h3>
        {promoCodes.length === 0 ? (
          <p className="no-codes">{t('promoCodeManager.noCodes')}</p>
        ) : (
          <div className="promo-cards">
            {promoCodes.map(promo => (
              <div key={promo.id} className={`promo-card ${!promo.is_active ? 'inactive' : ''}`}>
                <div className="promo-card-header">
                  <div>
                    <h4 className="promo-code">{promo.code}</h4>
                    {promo.description && (
                      <p className="promo-description">{promo.description}</p>
                    )}
                  </div>
                  <div className="promo-status">
                    {promo.is_active ? (
                      <span className="badge badge-success">{t('promoCodeManager.active')}</span>
                    ) : (
                      <span className="badge badge-inactive">{t('promoCodeManager.inactive')}</span>
                    )}
                  </div>
                </div>

                <div className="promo-details">
                  <div className="detail-row">
                    <span className="label">{t('promoCodeManager.discount')}:</span>
                    <span className="value">
                      {promo.discount_type === 'percentage' && `${promo.discount_value}%`}
                      {promo.discount_type === 'fixed' && `${promo.discount_value}₽`}
                      {promo.discount_type === 'free' && t('promoCodeManager.freeEvent')}
                    </span>
                  </div>

                  {promo.applicable_categories && (
                    <div className="detail-row">
                      <span className="label">{t('promoCodeManager.applicableTo')}:</span>
                      <span className="value">
                        {promo.applicable_categories.map(cat => t(`categories.${cat}`)).join(', ')}
                      </span>
                    </div>
                  )}

                  <div className="detail-row">
                    <span className="label">{t('promoCodeManager.validity')}:</span>
                    <span className="value">
                      {formatDate(promo.start_date)} — {formatDate(promo.end_date)}
                    </span>
                  </div>

                  <div className="detail-row">
                    <span className="label">{t('promoCodeManager.usage')}:</span>
                    <span className="value">
                      {promo.usage_count || 0} / {promo.usage_limit || '∞'}
                    </span>
                  </div>
                </div>

                <div className="promo-actions">
                  <button
                    className="btn-secondary"
                    onClick={() => toggleActiveStatus(promo.id, promo.is_active)}
                  >
                    {promo.is_active
                      ? t('promoCodeManager.deactivate')
                      : t('promoCodeManager.activate')}
                  </button>
                  <button
                    className="btn-danger"
                    onClick={() => deletePromoCode(promo.id)}
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
  );
};

export default PromoCodeManager;

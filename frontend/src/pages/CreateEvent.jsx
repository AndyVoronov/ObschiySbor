import { useState, useCallback, useRef, Suspense, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import ImageUpload from '../components/ImageUpload';
import { MapPicker, MapLoadingFallback } from '../components/LazyComponents';
import BoardGameSelector from '../components/BoardGameSelector';
import DictionarySelector from '../components/DictionarySelector';
import RecurringEventSettings from '../components/RecurringEventSettings';
import RecaptchaWrapper from '../components/RecaptchaWrapper';
import BlockedUserNotice from '../components/BlockedUserNotice';
import { createRecurringEvents } from '../utils/recurringEvents';
import { getCategoryName } from '../constants/categories';
import './CreateEvent.css';

const CreateEvent = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recaptchaToken, setRecaptchaToken] = useState(null);
  const recaptchaRef = useRef(null);
  const [blockInfo, setBlockInfo] = useState(null);
  const [checkingBlock, setCheckingBlock] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'board_games',
    event_date: '',
    end_date: '',
    has_end_date: true,
    event_type: 'offline', // 'offline' или 'online'
    location: '',
    latitude: null,
    longitude: null,
    online_platform: 'zoom', // Платформа для онлайн-мероприятий
    online_link: '', // Ссылка на онлайн-мероприятие
    max_participants: 10,
    min_participants: null,
    auto_cancel_enabled: false,
    auto_cancel_deadline: '',
    auto_cancel_min_participants: null,
    min_age: 18,
    max_age: null,
    kids_allowed: false,
    image_url: null,
    gender_filter: 'all', // Фильтр по полу: male, female, all
    // Специфичные поля для категорий
    games: '',
    selectedBoardGames: [], // Для хранения выбранных настольных игр
    difficulty: '',
    route: '',
    distance: '',
    terrain: '',
    equipment: '',
  });

  // Состояние для повторяющихся событий
  const [recurrenceConfig, setRecurrenceConfig] = useState({
    isRecurring: false,
    frequency: 'weekly',
    interval: 1,
    occurrenceCount: 10,
    daysOfWeek: null,
    endDate: null,
    endType: 'count',
  });

  // Мемоизируем callback для избежания бесконечного цикла
  const handleRecurrenceChange = useCallback((config) => {
    setRecurrenceConfig(config);
  }, []);

  // Проверка блокировки при загрузке
  useEffect(() => {
    const checkBlockStatus = async () => {
      if (!user) {
        setCheckingBlock(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('is_blocked, block_reason, blocked_at, blocked_until')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        setBlockInfo(profile);
      } catch (err) {
        console.error('Ошибка проверки блокировки:', err);
      } finally {
        setCheckingBlock(false);
      }
    };

    checkBlockStatus();
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleImageUpload = (imageUrl) => {
    setFormData({
      ...formData,
      image_url: imageUrl,
    });
  };

  const handleLocationSelect = useCallback((position) => {
    setFormData((prev) => ({
      ...prev,
      latitude: position.lat,
      longitude: position.lng,
    }));
  }, []);

  const handleAddressChange = useCallback((address) => {
    setFormData((prev) => ({
      ...prev,
      location: address,
    }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Предотвращаем повторную отправку
    if (loading) {
      return;
    }

    // Проверка reCAPTCHA (только если ключ настроен)
    const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
    if (recaptchaSiteKey && !recaptchaToken) {
      setError(t('createEvent.errorRecaptcha'));
      return;
    }

    setLoading(true);

    try {
      const eventData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        event_date: formData.event_date,
        end_date: formData.has_end_date && formData.end_date ? formData.end_date : null,
        has_end_date: formData.has_end_date,
        event_type: formData.event_type,
        location: formData.event_type === 'offline' ? formData.location : null,
        latitude: formData.event_type === 'offline' ? formData.latitude : null,
        longitude: formData.event_type === 'offline' ? formData.longitude : null,
        online_platform: formData.event_type === 'online' ? formData.online_platform : null,
        online_link: formData.event_type === 'online' ? formData.online_link : null,
        max_participants: parseInt(formData.max_participants),
        min_participants: formData.min_participants ? parseInt(formData.min_participants) : null,
        auto_cancel_enabled: formData.auto_cancel_enabled,
        auto_cancel_deadline: formData.auto_cancel_enabled && formData.auto_cancel_deadline ? formData.auto_cancel_deadline : null,
        auto_cancel_min_participants: formData.auto_cancel_enabled && formData.auto_cancel_min_participants ? parseInt(formData.auto_cancel_min_participants) : null,
        min_age: parseInt(formData.min_age),
        max_age: formData.max_age ? parseInt(formData.max_age) : null,
        kids_allowed: formData.kids_allowed,
        current_participants: 1,
        creator_id: user.id,
        moderation_status: 'active',
        image_url: formData.image_url,
        gender_filter: formData.gender_filter,
      };

      // Добавляем специфичные поля в зависимости от категории
      if (formData.category === 'board_games') {
        eventData.category_data = {
          games: formData.games.split(',').map(g => g.trim()),
        };
      } else if (formData.category === 'cycling') {
        eventData.category_data = {
          difficulty: formData.difficulty,
          route: formData.route,
          equipment: formData.equipment,
        };
      } else if (formData.category === 'hiking') {
        eventData.category_data = {
          distance: formData.distance,
          terrain: formData.terrain,
          equipment: formData.equipment,
        };
      } else if (formData.category === 'yoga') {
        eventData.category_data = {
          yoga_practice_type_id: formData.yoga_practice_type?.id,
          difficulty: formData.difficulty,
          equipment_needed: formData.equipment ? formData.equipment.split(',').map(e => e.trim()) : [],
        };
      } else if (formData.category === 'cooking') {
        eventData.category_data = {
          cuisine_type_id: formData.cuisine_type?.id,
          skill_level: formData.skill_level,
        };
      } else if (formData.category === 'music_jam') {
        eventData.category_data = {
          genre_id: formData.music_genre?.id,
          performer_level: formData.performer_level,
        };
      } else if (formData.category === 'seminar') {
        eventData.category_data = {
          topic_id: formData.seminar_topic?.id,
          format: formData.format,
          knowledge_level: formData.knowledge_level,
          materials_needed: formData.materials_needed ? formData.materials_needed.split(',').map(m => m.trim()) : [],
        };
      } else if (formData.category === 'picnic') {
        eventData.category_data = {
          picnic_type_id: formData.picnic_type?.id,
          weather_dependent: formData.weather_dependent,
        };
      } else if (formData.category === 'photo_walk') {
        eventData.category_data = {
          theme_id: formData.photography_theme?.id,
          skill_level: formData.skill_level,
          route: formData.route,
        };
      } else if (formData.category === 'quest') {
        eventData.category_data = {
          theme_id: formData.quest_theme?.id,
          difficulty: formData.difficulty,
          age_restriction: formData.age_restriction ? parseInt(formData.age_restriction) : null,
        };
      } else if (formData.category === 'dance') {
        eventData.category_data = {
          style_id: formData.dance_style?.id,
          skill_level: formData.skill_level,
          partner_type: formData.partner_type,
          dress_code: formData.dress_code,
        };
      } else if (formData.category === 'tour') {
        eventData.category_data = {
          theme: formData.theme,
          duration_hours: formData.duration_hours ? parseFloat(formData.duration_hours) : null,
          pace: formData.pace,
          accessibility: formData.accessibility ? formData.accessibility.split(',').map(a => a.trim()) : [],
        };
      } else if (formData.category === 'volunteer') {
        eventData.category_data = {
          activity_type_id: formData.volunteer_activity_type?.id,
          age_min: formData.age_min ? parseInt(formData.age_min) : null,
          equipment_needed: formData.equipment ? formData.equipment.split(',').map(e => e.trim()) : [],
        };
      } else if (formData.category === 'fitness') {
        eventData.category_data = {
          workout_type_id: formData.fitness_workout_type?.id,
          fitness_level: formData.fitness_level,
          duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
          equipment_needed: formData.equipment ? formData.equipment.split(',').map(e => e.trim()) : [],
        };
      } else if (formData.category === 'theater') {
        eventData.category_data = {
          genre_id: formData.theater_genre?.id,
          age_rating: formData.age_rating,
          duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
          has_intermission: formData.has_intermission,
        };
      } else if (formData.category === 'auto_tour') {
        eventData.category_data = {
          route_type: formData.route_type,
          driving_difficulty: formData.driving_difficulty,
          required_equipment: formData.required_equipment ? formData.required_equipment.split(',').map(e => e.trim()) : [],
          car_capacity: formData.car_capacity ? parseInt(formData.car_capacity) : null,
        };
      } else if (formData.category === 'craft') {
        eventData.category_data = {
          craft_type_id: formData.craft_type?.id,
          skill_level: formData.skill_level,
          final_product: formData.final_product,
        };
      } else if (formData.category === 'concert') {
        eventData.category_data = {
          genre_id: formData.music_genre?.id,
          performer: formData.performer,
          age_restriction: formData.age_restriction,
        };
      } else if (formData.category === 'sports') {
        eventData.category_data = {
          sport_type_id: formData.sports_type?.id,
          level: formData.level,
        };
      } else if (formData.category === 'eco_tour') {
        eventData.category_data = {
          tour_type_id: formData.eco_tour_type?.id,
          equipment_needed: formData.equipment ? formData.equipment.split(',').map(e => e.trim()) : [],
        };
      }

      const { data, error } = await supabase
        .from('events')
        .insert([eventData])
        .select()
        .single();

      if (error) throw error;

      // Добавляем связи с настольными играми
      if (formData.category === 'board_games' && formData.selectedBoardGames?.length > 0) {
        const gameLinks = formData.selectedBoardGames.map(game => ({
          event_id: data.id,
          board_game_id: game.id,
        }));

        await supabase
          .from('event_board_games')
          .insert(gameLinks);
      }

      // Добавляем связи с музыкальными инструментами
      if (formData.category === 'music_jam' && formData.musical_instruments?.length > 0) {
        const instrumentLinks = formData.musical_instruments.map(instrument => ({
          event_id: data.id,
          musical_instrument_id: instrument.id,
        }));

        await supabase
          .from('event_musical_instruments')
          .insert(instrumentLinks);
      }

      // Добавляем связи с фото оборудованием
      if (formData.category === 'photo_walk' && formData.photography_equipment?.length > 0) {
        const equipmentLinks = formData.photography_equipment.map(equipment => ({
          event_id: data.id,
          photography_equipment_id: equipment.id,
        }));

        await supabase
          .from('event_photography_equipment')
          .insert(equipmentLinks);
      }

      // Добавляем связи с навыками волонтёра
      if (formData.category === 'volunteer' && formData.volunteer_skills?.length > 0) {
        const skillLinks = formData.volunteer_skills.map(skill => ({
          event_id: data.id,
          volunteer_skill_id: skill.id,
        }));

        await supabase
          .from('event_volunteer_skills')
          .insert(skillLinks);
      }

      // Добавляем связи с материалами для ремесла
      if (formData.category === 'craft' && formData.craft_materials?.length > 0) {
        const materialLinks = formData.craft_materials.map(material => ({
          event_id: data.id,
          craft_material_id: material.id,
        }));

        await supabase
          .from('event_craft_materials')
          .insert(materialLinks);
      }

      // Автоматически добавляем создателя как участника
      await supabase
        .from('event_participants')
        .insert([{
          event_id: data.id,
          user_id: user.id,
          status: 'joined',
        }]);

      // Создаём повторяющиеся события если настроено
      if (recurrenceConfig.isRecurring) {
        try {
          await createRecurringEvents(data.id, {
            frequency: recurrenceConfig.frequency,
            interval: recurrenceConfig.interval,
            occurrenceCount: recurrenceConfig.occurrenceCount,
            daysOfWeek: recurrenceConfig.daysOfWeek,
            endDate: recurrenceConfig.endDate,
          });
        } catch (recError) {
          console.error('Ошибка создания повторяющихся событий:', recError);
          // Не прерываем процесс, основное событие уже создано
        }
      }

      // Принудительный редирект через window.location для надёжности
      window.location.href = `/events/${data.id}`;
    } catch (error) {
      setError(t('createEvent.errorCreating') + error.message);
      console.error('Ошибка:', error);
      // Сбрасываем reCAPTCHA при ошибке
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
        setRecaptchaToken(null);
      }
    } finally {
      setLoading(false);
    }
  };

  // Обработчик после успешной подачи обжалования
  const handleAppealSubmitted = () => {
    alert(t('createEvent.appealSubmitted'));
  };

  if (checkingBlock) {
    return <div className="loading">{t('createEvent.checkingAccess')}</div>;
  }

  // Если пользователь заблокирован - показываем уведомление
  if (blockInfo?.is_blocked) {
    return (
      <div className="create-event-page">
        <h1>{t('createEvent.title')}</h1>
        <BlockedUserNotice blockInfo={blockInfo} onAppealSubmitted={handleAppealSubmitted} />
      </div>
    );
  }

  return (
    <div className="create-event-page">
      <h1>{t('createEvent.title')}</h1>
      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="create-event-form">
        <div className="form-group">
          <label htmlFor="title">{t('createEvent.eventNameRequired')}</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">{t('createEvent.descriptionRequired')}</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="5"
            required
          />
        </div>

        <ImageUpload
          onImageUpload={handleImageUpload}
          currentImage={formData.image_url}
        />

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="category">{t('createEvent.categoryRequired')}</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
            >
              <option value="board_games">{getCategoryName('board_games', t)}</option>
              <option value="cycling">{getCategoryName('cycling', t)}</option>
              <option value="hiking">{getCategoryName('hiking', t)}</option>
              <option value="yoga">{getCategoryName('yoga', t)}</option>
              <option value="cooking">{getCategoryName('cooking', t)}</option>
              <option value="music_jam">{getCategoryName('music_jam', t)}</option>
              <option value="seminar">{getCategoryName('seminar', t)}</option>
              <option value="picnic">{getCategoryName('picnic', t)}</option>
              <option value="photo_walk">{getCategoryName('photo_walk', t)}</option>
              <option value="quest">{getCategoryName('quest', t)}</option>
              <option value="dance">{getCategoryName('dance', t)}</option>
              <option value="tour">{getCategoryName('tour', t)}</option>
              <option value="volunteer">{getCategoryName('volunteer', t)}</option>
              <option value="fitness">{getCategoryName('fitness', t)}</option>
              <option value="theater">{getCategoryName('theater', t)}</option>
              <option value="auto_tour">{getCategoryName('auto_tour', t)}</option>
              <option value="craft">{getCategoryName('craft', t)}</option>
              <option value="concert">{getCategoryName('concert', t)}</option>
              <option value="sports">{getCategoryName('sports', t)}</option>
              <option value="eco_tour">{getCategoryName('eco_tour', t)}</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="event_date">{t('createEvent.startDateTimeRequired')}</label>
            <input
              type="datetime-local"
              id="event_date"
              name="event_date"
              value={formData.event_date}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="has_end_date"
                checked={formData.has_end_date}
                onChange={(e) => setFormData({ ...formData, has_end_date: e.target.checked })}
              />
              {t('createEvent.hasEndDate')}
            </label>
          </div>

          {formData.has_end_date && (
            <div className="form-group">
              <label htmlFor="end_date">{t('createEvent.endDateTime')}</label>
              <input
                type="datetime-local"
                id="end_date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                min={formData.event_date}
              />
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="max_participants">{t('createEvent.maxParticipantsRequired')}</label>
          <input
            type="number"
            id="max_participants"
            name="max_participants"
            value={formData.max_participants}
            onChange={handleChange}
            min="2"
            max="100"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="min_participants">{t('createEvent.minParticipants')}</label>
          <input
            type="number"
            id="min_participants"
            name="min_participants"
            value={formData.min_participants || ''}
            onChange={handleChange}
            min="1"
            max={formData.max_participants}
            placeholder={t('createEvent.minParticipantsHint')}
          />
          <p className="field-hint">{t('createEvent.minParticipantsHint')}</p>
        </div>

        {/* Настройки автоотмены */}
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="auto_cancel_enabled"
              checked={formData.auto_cancel_enabled}
              onChange={(e) => setFormData({ ...formData, auto_cancel_enabled: e.target.checked })}
            />
            <span>{t('createEvent.autoCancelEnabled')}</span>
          </label>
          <p className="field-hint">{t('createEvent.autoCancelEnabledHint')}</p>
        </div>

        {formData.auto_cancel_enabled && (
          <>
            <div className="form-group">
              <label htmlFor="auto_cancel_deadline">{t('createEvent.autoCancelDeadline')}</label>
              <input
                type="datetime-local"
                id="auto_cancel_deadline"
                name="auto_cancel_deadline"
                value={formData.auto_cancel_deadline}
                onChange={handleChange}
                min={new Date().toISOString().slice(0, 16)}
                max={formData.event_date}
                required
              />
              <p className="field-hint">{t('createEvent.autoCancelDeadlineHint')}</p>
            </div>

            <div className="form-group">
              <label htmlFor="auto_cancel_min_participants">{t('createEvent.autoCancelMinParticipants')}</label>
              <input
                type="number"
                id="auto_cancel_min_participants"
                name="auto_cancel_min_participants"
                value={formData.auto_cancel_min_participants || ''}
                onChange={handleChange}
                min="1"
                max={formData.max_participants}
                required
              />
            </div>
          </>
        )}

        {/* Возрастные ограничения */}
        <div className="form-group">
          <h3>{t('createEvent.ageRestrictions')}</h3>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="min_age">{t('createEvent.minAge')}</label>
              <select
                id="min_age"
                name="min_age"
                value={formData.min_age}
                onChange={handleChange}
              >
                <option value="0">{t('createEvent.noAgeLimit')}</option>
                <option value="6">6+</option>
                <option value="12">12+</option>
                <option value="14">14+</option>
                <option value="16">16+</option>
                <option value="18">18+</option>
                <option value="21">21+</option>
              </select>
              <p className="field-hint">{t('createEvent.minAgeHint')}</p>
            </div>

            <div className="form-group">
              <label htmlFor="max_age">{t('createEvent.maxAge')}</label>
              <input
                type="number"
                id="max_age"
                name="max_age"
                value={formData.max_age || ''}
                onChange={handleChange}
                min={formData.min_age || 0}
                max="100"
                placeholder={t('createEvent.noAgeLimit')}
              />
              <p className="field-hint">{t('createEvent.maxAgeHint')}</p>
            </div>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="kids_allowed"
                checked={formData.kids_allowed}
                onChange={(e) => setFormData({ ...formData, kids_allowed: e.target.checked })}
              />
              <span>{t('createEvent.kidsAllowed')}</span>
            </label>
            <p className="field-hint">{t('createEvent.kidsAllowedHint')}</p>
          </div>
        </div>

        {/* Переключатель типа мероприятия */}
        <div className="form-group">
          <label>{t('createEvent.eventTypeRequired')}</label>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name="event_type"
                value="offline"
                checked={formData.event_type === 'offline'}
                onChange={handleChange}
              />
              <span>📍 {t('createEvent.offlineInPerson')}</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="event_type"
                value="online"
                checked={formData.event_type === 'online'}
                onChange={handleChange}
              />
              <span>💻 {t('createEvent.onlineInternet')}</span>
            </label>
          </div>
        </div>

        {/* Поля для офлайн-мероприятий */}
        {formData.event_type === 'offline' && (
          <div className="form-group">
            <label>{t('createEvent.locationRequired')}</label>
            <Suspense fallback={<MapLoadingFallback />}>
              <MapPicker
                onLocationSelect={handleLocationSelect}
                onAddressChange={handleAddressChange}
              />
            </Suspense>
            {!formData.location && (
              <p className="field-hint">{t('createEvent.selectLocationHint')}</p>
            )}
          </div>
        )}

        {/* Поля для онлайн-мероприятий */}
        {formData.event_type === 'online' && (
          <>
            <div className="form-group">
              <label htmlFor="online_platform">{t('createEvent.onlinePlatformRequired')}</label>
              <select
                id="online_platform"
                name="online_platform"
                value={formData.online_platform}
                onChange={handleChange}
                required
              >
                <option value="zoom">{t('createEvent.platforms.zoom')}</option>
                <option value="google_meet">{t('createEvent.platforms.google_meet')}</option>
                <option value="telegram">{t('createEvent.platforms.telegram')}</option>
                <option value="discord">{t('createEvent.platforms.discord')}</option>
                <option value="skype">{t('createEvent.platforms.skype')}</option>
                <option value="other">{t('createEvent.platforms.other')}</option>
              </select>
              <p className="field-hint">{t('createEvent.onlinePlatformHint')}</p>
            </div>

            <div className="form-group">
              <label htmlFor="online_link">{t('createEvent.onlineLinkRequired')}</label>
              <input
                type="url"
                id="online_link"
                name="online_link"
                value={formData.online_link}
                onChange={handleChange}
                placeholder={t('createEvent.onlineLinkPlaceholder')}
                required
              />
              <p className="field-hint">{t('createEvent.onlineLinkHint')}</p>
            </div>
          </>
        )}

        {/* Фильтр по полу участников */}
        <div className="form-group">
          <label htmlFor="gender_filter">{t('createEvent.genderFilter')}</label>
          <select
            id="gender_filter"
            name="gender_filter"
            value={formData.gender_filter}
            onChange={handleChange}
          >
            <option value="all">{t('createEvent.genderAll')}</option>
            <option value="male">{t('createEvent.genderMale')}</option>
            <option value="female">{t('createEvent.genderFemale')}</option>
          </select>
          <p className="field-hint">{t('createEvent.genderFilterHint')}</p>
        </div>

        {/* Специфичные поля для настольных игр */}
        {formData.category === 'board_games' && (
          <BoardGameSelector
            selectedGames={formData.selectedBoardGames}
            onGamesChange={(games) => setFormData({ ...formData, selectedBoardGames: games })}
          />
        )}

        {/* Специфичные поля для велопрогулок */}
        {formData.category === 'cycling' && (
          <>
            <div className="form-group">
              <label htmlFor="difficulty">{t('createEvent.difficulty')}</label>
              <select
                id="difficulty"
                name="difficulty"
                value={formData.difficulty}
                onChange={handleChange}
              >
                <option value="">{t('createEvent.difficultySelect')}</option>
                <option value="low">{t('createEvent.difficultyLow')}</option>
                <option value="medium">{t('createEvent.difficultyMedium')}</option>
                <option value="high">{t('createEvent.difficultyHigh')}</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="route">{t('createEvent.route')}</label>
              <textarea
                id="route"
                name="route"
                value={formData.route}
                onChange={handleChange}
                rows="3"
                placeholder={t('createEvent.routePlaceholder')}
              />
            </div>
            <div className="form-group">
              <label htmlFor="equipment">{t('createEvent.equipment')}</label>
              <input
                type="text"
                id="equipment"
                name="equipment"
                value={formData.equipment}
                onChange={handleChange}
                placeholder={t('createEvent.equipmentPlaceholder')}
              />
            </div>
          </>
        )}

        {/* Специфичные поля для походов */}
        {formData.category === 'hiking' && (
          <>
            <div className="form-group">
              <label htmlFor="distance">{t('createEvent.distance')}</label>
              <input
                type="number"
                id="distance"
                name="distance"
                value={formData.distance}
                onChange={handleChange}
                placeholder={t('createEvent.distancePlaceholder')}
              />
            </div>
            <div className="form-group">
              <label htmlFor="terrain">{t('createEvent.terrain')}</label>
              <select
                id="terrain"
                name="terrain"
                value={formData.terrain}
                onChange={handleChange}
              >
                <option value="">{t('createEvent.terrainSelect')}</option>
                <option value="forest">{t('createEvent.terrainForest')}</option>
                <option value="mountains">{t('createEvent.terrainMountains')}</option>
                <option value="mixed">{t('createEvent.terrainMixed')}</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="equipment">{t('createEvent.equipmentNeeded')}</label>
              <input
                type="text"
                id="equipment"
                name="equipment"
                value={formData.equipment}
                onChange={handleChange}
                placeholder={t('createEvent.equipmentHikingPlaceholder')}
              />
            </div>
          </>
        )}

        {/* Специфичные поля для йога-сессий */}
        {formData.category === 'yoga' && (
          <>
            <DictionarySelector
              tableName="yoga_practice_types"
              selectedItems={formData.yoga_practice_type}
              onChange={(item) => setFormData({ ...formData, yoga_practice_type: item })}
              label={t('createEvent.practiceType')}
              multiple={false}
              placeholder={t('createEvent.practiceTypeSelect')}
            />
            <div className="form-group">
              <label htmlFor="difficulty">{t('createEvent.difficulty')}</label>
              <select
                id="difficulty"
                name="difficulty"
                value={formData.difficulty}
                onChange={handleChange}
              >
                <option value="">{t('createEvent.skillLevelSelect')}</option>
                <option value="beginner">{t('createEvent.skillLevelBeginner')}</option>
                <option value="intermediate">{t('createEvent.skillLevelIntermediate')}</option>
                <option value="advanced">{t('createEvent.skillLevelAdvanced')}</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="equipment">{t('createEvent.equipmentNeeded')}</label>
              <input
                type="text"
                id="equipment"
                name="equipment"
                value={formData.equipment}
                onChange={handleChange}
                placeholder={t('createEvent.equipmentYogaPlaceholder')}
              />
            </div>
          </>
        )}

        {/* Специфичные поля для кулинарных мастер-классов */}
        {formData.category === 'cooking' && (
          <>
            <DictionarySelector
              tableName="cuisine_types"
              selectedItems={formData.cuisine_type}
              onChange={(item) => setFormData({ ...formData, cuisine_type: item })}
              label="Тип кухни"
              multiple={false}
              placeholder="Выберите тип кухни"
            />
            <div className="form-group">
              <label htmlFor="skill_level">Уровень навыков</label>
              <select
                id="skill_level"
                name="skill_level"
                value={formData.skill_level}
                onChange={handleChange}
              >
                <option value="">Выберите уровень</option>
                <option value="beginner">Начинающий</option>
                <option value="experienced">Опытный</option>
              </select>
            </div>
          </>
        )}

        {/* Специфичные поля для музыкальных джемов */}
        {formData.category === 'music_jam' && (
          <>
            <DictionarySelector
              tableName="music_genres"
              selectedItems={formData.music_genre}
              onChange={(item) => setFormData({ ...formData, music_genre: item })}
              label="Жанр музыки"
              multiple={false}
              placeholder="Выберите жанр"
            />
            <DictionarySelector
              tableName="musical_instruments"
              selectedItems={formData.musical_instruments}
              onChange={(items) => setFormData({ ...formData, musical_instruments: items })}
              label="Инструменты"
              multiple={true}
              placeholder="Выберите инструменты"
            />
            <div className="form-group">
              <label htmlFor="performer_level">Уровень исполнителя</label>
              <select
                id="performer_level"
                name="performer_level"
                value={formData.performer_level}
                onChange={handleChange}
              >
                <option value="">Выберите уровень</option>
                <option value="amateur">Любитель</option>
                <option value="professional">Профессионал</option>
              </select>
            </div>
          </>
        )}

        {/* Специфичные поля для образовательных семинаров */}
        {formData.category === 'seminar' && (
          <>
            <DictionarySelector
              tableName="seminar_topics"
              selectedItems={formData.seminar_topic}
              onChange={(item) => setFormData({ ...formData, seminar_topic: item })}
              label="Тема семинара"
              multiple={false}
              placeholder="Выберите тему"
            />
            <div className="form-group">
              <label htmlFor="format">Формат</label>
              <select
                id="format"
                name="format"
                value={formData.format}
                onChange={handleChange}
              >
                <option value="">Выберите формат</option>
                <option value="lecture">Лекция</option>
                <option value="workshop">Воркшоп</option>
                <option value="discussion">Дискуссия</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="knowledge_level">Уровень знаний</label>
              <select
                id="knowledge_level"
                name="knowledge_level"
                value={formData.knowledge_level}
                onChange={handleChange}
              >
                <option value="">Выберите уровень</option>
                <option value="basic">Базовый</option>
                <option value="advanced">Продвинутый</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="materials_needed">Необходимые материалы</label>
              <input
                type="text"
                id="materials_needed"
                name="materials_needed"
                value={formData.materials_needed}
                onChange={handleChange}
                placeholder="Блокнот, ноутбук"
              />
            </div>
          </>
        )}

        {/* Специфичные поля для пикников */}
        {formData.category === 'picnic' && (
          <>
            <DictionarySelector
              tableName="picnic_types"
              selectedItems={formData.picnic_type}
              onChange={(item) => setFormData({ ...formData, picnic_type: item })}
              label="Тип пикника"
              multiple={false}
              placeholder="Выберите тип пикника"
            />
            <div className="form-group">
              <label htmlFor="weather_dependent">Зависимость от погоды</label>
              <select
                id="weather_dependent"
                name="weather_dependent"
                value={formData.weather_dependent}
                onChange={handleChange}
              >
                <option value="">Выберите тип</option>
                <option value="covered">Крытое место</option>
                <option value="outdoor">На открытом воздухе</option>
              </select>
            </div>
          </>
        )}

        {/* Специфичные поля для фотопрогулок */}
        {formData.category === 'photo_walk' && (
          <>
            <DictionarySelector
              tableName="photography_themes"
              selectedItems={formData.photography_theme}
              onChange={(item) => setFormData({ ...formData, photography_theme: item })}
              label="Тематика съёмки"
              multiple={false}
              placeholder="Выберите тематику"
            />
            <DictionarySelector
              tableName="photography_equipment"
              selectedItems={formData.photography_equipment}
              onChange={(items) => setFormData({ ...formData, photography_equipment: items })}
              label="Оборудование"
              multiple={true}
              placeholder="Выберите оборудование"
            />
            <div className="form-group">
              <label htmlFor="skill_level">Уровень навыков</label>
              <select
                id="skill_level"
                name="skill_level"
                value={formData.skill_level}
                onChange={handleChange}
              >
                <option value="">Выберите уровень</option>
                <option value="beginner">Начинающий</option>
                <option value="advanced">Продвинутый</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="route">Маршрут</label>
              <textarea
                id="route"
                name="route"
                value={formData.route}
                onChange={handleChange}
                rows="3"
                placeholder="Описание маршрута съёмки"
              />
            </div>
          </>
        )}

        {/* Специфичные поля для квестов */}
        {formData.category === 'quest' && (
          <>
            <DictionarySelector
              tableName="quest_themes"
              selectedItems={formData.quest_theme}
              onChange={(item) => setFormData({ ...formData, quest_theme: item })}
              label="Тематика квеста"
              multiple={false}
              placeholder="Выберите тематику"
            />
            <div className="form-group">
              <label htmlFor="difficulty">Сложность</label>
              <select
                id="difficulty"
                name="difficulty"
                value={formData.difficulty}
                onChange={handleChange}
              >
                <option value="">Выберите сложность</option>
                <option value="easy">Лёгкая</option>
                <option value="medium">Средняя</option>
                <option value="hardcore">Хардкор</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="age_restriction">Возрастное ограничение</label>
              <input
                type="number"
                id="age_restriction"
                name="age_restriction"
                value={formData.age_restriction}
                onChange={handleChange}
                placeholder="12"
              />
            </div>
          </>
        )}

        {/* Специфичные поля для танцевальных уроков */}
        {formData.category === 'dance' && (
          <>
            <DictionarySelector
              tableName="dance_styles"
              selectedItems={formData.dance_style}
              onChange={(item) => setFormData({ ...formData, dance_style: item })}
              label="Стиль танца"
              multiple={false}
              placeholder="Выберите стиль"
            />
            <div className="form-group">
              <label htmlFor="skill_level">Уровень навыков</label>
              <select
                id="skill_level"
                name="skill_level"
                value={formData.skill_level}
                onChange={handleChange}
              >
                <option value="">Выберите уровень</option>
                <option value="beginner">Начинающий</option>
                <option value="intermediate">Средний</option>
                <option value="advanced">Продвинутый</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="partner_type">Тип участия</label>
              <select
                id="partner_type"
                name="partner_type"
                value={formData.partner_type}
                onChange={handleChange}
              >
                <option value="">Выберите тип</option>
                <option value="partner">С партнёром</option>
                <option value="solo">Соло</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="dress_code">Дресс-код</label>
              <input
                type="text"
                id="dress_code"
                name="dress_code"
                value={formData.dress_code}
                onChange={handleChange}
                placeholder="Удобная спортивная одежда"
              />
            </div>
          </>
        )}

        {/* Специфичные поля для городских экскурсий */}
        {formData.category === 'tour' && (
          <>
            <div className="form-group">
              <label htmlFor="theme">Тематика</label>
              <select
                id="theme"
                name="theme"
                value={formData.theme}
                onChange={handleChange}
              >
                <option value="">Выберите тематику</option>
                <option value="historical">Историческая</option>
                <option value="gastronomic">Гастрономическая</option>
                <option value="street_art">Уличное искусство</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="duration_hours">Длительность (часы)</label>
              <input
                type="number"
                step="0.5"
                id="duration_hours"
                name="duration_hours"
                value={formData.duration_hours}
                onChange={handleChange}
                placeholder="2.5"
              />
            </div>
            <div className="form-group">
              <label htmlFor="pace">Темп</label>
              <select
                id="pace"
                name="pace"
                value={formData.pace}
                onChange={handleChange}
              >
                <option value="">Выберите темп</option>
                <option value="slow">Медленный</option>
                <option value="active">Активный</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="accessibility">Доступность</label>
              <input
                type="text"
                id="accessibility"
                name="accessibility"
                value={formData.accessibility}
                onChange={handleChange}
                placeholder="Доступно для колясок, с перерывами"
              />
            </div>
          </>
        )}

        {/* Специфичные поля для волонтёрских акций */}
        {formData.category === 'volunteer' && (
          <>
            <DictionarySelector
              tableName="volunteer_activity_types"
              selectedItems={formData.volunteer_activity_type}
              onChange={(item) => setFormData({ ...formData, volunteer_activity_type: item })}
              label="Тип деятельности"
              multiple={false}
              placeholder="Выберите тип деятельности"
            />
            <DictionarySelector
              tableName="volunteer_skills"
              selectedItems={formData.volunteer_skills}
              onChange={(items) => setFormData({ ...formData, volunteer_skills: items })}
              label="Требуемые навыки"
              multiple={true}
              placeholder="Выберите навыки"
            />
            <div className="form-group">
              <label htmlFor="age_min">Минимальный возраст</label>
              <input
                type="number"
                id="age_min"
                name="age_min"
                value={formData.age_min}
                onChange={handleChange}
                placeholder="16"
              />
            </div>
            <div className="form-group">
              <label htmlFor="equipment">Необходимое оборудование</label>
              <input
                type="text"
                id="equipment"
                name="equipment"
                value={formData.equipment}
                onChange={handleChange}
                placeholder="Перчатки, мешки для мусора"
              />
            </div>
          </>
        )}

        {/* Специфичные поля для фитнес-тренировок */}
        {formData.category === 'fitness' && (
          <>
            <DictionarySelector
              tableName="fitness_workout_types"
              selectedItems={formData.fitness_workout_type}
              onChange={(item) => setFormData({ ...formData, fitness_workout_type: item })}
              label="Тип тренировки"
              multiple={false}
              placeholder="Выберите тип тренировки"
            />
            <div className="form-group">
              <label htmlFor="fitness_level">Уровень подготовки</label>
              <select
                id="fitness_level"
                name="fitness_level"
                value={formData.fitness_level}
                onChange={handleChange}
              >
                <option value="">Выберите уровень</option>
                <option value="beginner">Начинающий</option>
                <option value="advanced">Продвинутый</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="duration_minutes">Длительность (минуты)</label>
              <input
                type="number"
                id="duration_minutes"
                name="duration_minutes"
                value={formData.duration_minutes}
                onChange={handleChange}
                placeholder="60"
              />
            </div>
            <div className="form-group">
              <label htmlFor="equipment">Необходимое оборудование</label>
              <input
                type="text"
                id="equipment"
                name="equipment"
                value={formData.equipment}
                onChange={handleChange}
                placeholder="Гантели, коврик"
              />
            </div>
          </>
        )}

        {/* Специфичные поля для театральных постановок */}
        {formData.category === 'theater' && (
          <>
            <DictionarySelector
              tableName="theater_genres"
              selectedItems={formData.theater_genre}
              onChange={(item) => setFormData({ ...formData, theater_genre: item })}
              label="Жанр"
              multiple={false}
              placeholder="Выберите жанр"
            />
            <div className="form-group">
              <label htmlFor="age_rating">Возрастной рейтинг</label>
              <input
                type="text"
                id="age_rating"
                name="age_rating"
                value={formData.age_rating}
                onChange={handleChange}
                placeholder="6+"
              />
            </div>
            <div className="form-group">
              <label htmlFor="duration_minutes">Длительность (минуты)</label>
              <input
                type="number"
                id="duration_minutes"
                name="duration_minutes"
                value={formData.duration_minutes}
                onChange={handleChange}
                placeholder="120"
              />
            </div>
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="has_intermission"
                  checked={formData.has_intermission}
                  onChange={(e) => setFormData({ ...formData, has_intermission: e.target.checked })}
                />
                С антрактом
              </label>
            </div>
          </>
        )}

        {/* Специфичные поля для авто-туров */}
        {formData.category === 'auto_tour' && (
          <>
            <div className="form-group">
              <label htmlFor="route_type">Тип маршрута</label>
              <select
                id="route_type"
                name="route_type"
                value={formData.route_type}
                onChange={handleChange}
              >
                <option value="">Выберите тип</option>
                <option value="city">Городской</option>
                <option value="offroad">Оффроад</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="driving_difficulty">Сложность вождения</label>
              <select
                id="driving_difficulty"
                name="driving_difficulty"
                value={formData.driving_difficulty}
                onChange={handleChange}
              >
                <option value="">Выберите сложность</option>
                <option value="easy">Лёгкая</option>
                <option value="hard">Сложная</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="required_equipment">Необходимое оборудование</label>
              <input
                type="text"
                id="required_equipment"
                name="required_equipment"
                value={formData.required_equipment}
                onChange={handleChange}
                placeholder="GPS, аптечка"
              />
            </div>
            <div className="form-group">
              <label htmlFor="car_capacity">Вместимость автомобиля</label>
              <input
                type="number"
                id="car_capacity"
                name="car_capacity"
                value={formData.car_capacity}
                onChange={handleChange}
                min="1"
                placeholder="4"
              />
            </div>
          </>
        )}

        {/* Специфичные поля для ремесленных мастер-классов */}
        {formData.category === 'craft' && (
          <>
            <DictionarySelector
              tableName="craft_types"
              selectedItems={formData.craft_type}
              onChange={(item) => setFormData({ ...formData, craft_type: item })}
              label="Тип ремесла"
              multiple={false}
              placeholder="Выберите тип ремесла"
            />
            <DictionarySelector
              tableName="craft_materials"
              selectedItems={formData.craft_materials}
              onChange={(items) => setFormData({ ...formData, craft_materials: items })}
              label="Материалы"
              multiple={true}
              placeholder="Выберите материалы"
            />
            <div className="form-group">
              <label htmlFor="skill_level">Уровень навыков</label>
              <select
                id="skill_level"
                name="skill_level"
                value={formData.skill_level}
                onChange={handleChange}
              >
                <option value="">Выберите уровень</option>
                <option value="beginner">Начинающий</option>
                <option value="intermediate">Средний</option>
                <option value="advanced">Продвинутый</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="final_product">Итоговый продукт</label>
              <input
                type="text"
                id="final_product"
                name="final_product"
                value={formData.final_product}
                onChange={handleChange}
                placeholder="Описание того, что создадут участники"
              />
            </div>
          </>
        )}

        {/* Специфичные поля для концертов */}
        {formData.category === 'concert' && (
          <>
            <DictionarySelector
              tableName="music_genres"
              selectedItems={formData.music_genre}
              onChange={(item) => setFormData({ ...formData, music_genre: item })}
              label="Жанр музыки"
              multiple={false}
              placeholder="Выберите жанр"
            />
            <div className="form-group">
              <label htmlFor="performer">Исполнитель</label>
              <input
                type="text"
                id="performer"
                name="performer"
                value={formData.performer}
                onChange={handleChange}
                placeholder="Название группы или исполнителя"
              />
            </div>
            <div className="form-group">
              <label htmlFor="age_restriction">Возрастное ограничение</label>
              <input
                type="text"
                id="age_restriction"
                name="age_restriction"
                value={formData.age_restriction}
                onChange={handleChange}
                placeholder="16+"
              />
            </div>
          </>
        )}

        {/* Специфичные поля для спортивных матчей */}
        {formData.category === 'sports' && (
          <>
            <DictionarySelector
              tableName="sports_types"
              selectedItems={formData.sports_type}
              onChange={(item) => setFormData({ ...formData, sports_type: item })}
              label="Вид спорта"
              multiple={false}
              placeholder="Выберите вид спорта"
            />
            <div className="form-group">
              <label htmlFor="level">Уровень</label>
              <select
                id="level"
                name="level"
                value={formData.level}
                onChange={handleChange}
              >
                <option value="">Выберите уровень</option>
                <option value="amateur">Любительский</option>
                <option value="professional">Профессиональный</option>
              </select>
            </div>
          </>
        )}

        {/* Специфичные поля для экологических туров */}
        {formData.category === 'eco_tour' && (
          <>
            <DictionarySelector
              tableName="eco_tour_types"
              selectedItems={formData.eco_tour_type}
              onChange={(item) => setFormData({ ...formData, eco_tour_type: item })}
              label="Тип тура"
              multiple={false}
              placeholder="Выберите тип тура"
            />
            <div className="form-group">
              <label htmlFor="equipment">Необходимое оборудование</label>
              <input
                type="text"
                id="equipment"
                name="equipment"
                value={formData.equipment}
                onChange={handleChange}
                placeholder="Бинокль, фонарик"
              />
            </div>
          </>
        )}

        {/* Настройки повторяющихся событий */}
        <RecurringEventSettings
          value={recurrenceConfig}
          onChange={handleRecurrenceChange}
        />

        {/* reCAPTCHA */}
        <div className="form-group" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <RecaptchaWrapper
            ref={recaptchaRef}
            onChange={(token) => setRecaptchaToken(token)}
            onExpired={() => setRecaptchaToken(null)}
          />
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? t('createEvent.creating') : t('createEvent.createButton')}
        </button>
      </form>
    </div>
  );
};

export default CreateEvent;

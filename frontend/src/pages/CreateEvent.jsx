import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import ImageUpload from '../components/ImageUpload';
import MapPicker from '../components/MapPicker';
import BoardGameSelector from '../components/BoardGameSelector';
import DictionarySelector from '../components/DictionarySelector';
import './CreateEvent.css';

const CreateEvent = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'board_games',
    event_date: '',
    end_date: '',
    has_end_date: true,
    location: '',
    latitude: null,
    longitude: null,
    max_participants: 10,
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
    setLoading(true);

    try {
      const eventData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        event_date: formData.event_date,
        end_date: formData.has_end_date && formData.end_date ? formData.end_date : null,
        has_end_date: formData.has_end_date,
        location: formData.location,
        latitude: formData.latitude,
        longitude: formData.longitude,
        max_participants: parseInt(formData.max_participants),
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

      navigate(`/events/${data.id}`);
    } catch (error) {
      setError('Ошибка создания события: ' + error.message);
      console.error('Ошибка:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-event-page">
      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="create-event-form">
        <div className="form-group">
          <label htmlFor="title">Название события *</label>
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
          <label htmlFor="description">Описание *</label>
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
            <label htmlFor="category">Категория *</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
            >
              <option value="board_games">🎲 Настольные игры</option>
              <option value="cycling">🚴 Велопрогулки</option>
              <option value="hiking">🏔️ Походы</option>
              <option value="yoga">🧘 Йога-сессии</option>
              <option value="cooking">👨‍🍳 Кулинарные мастер-классы</option>
              <option value="music_jam">🎸 Музыкальные джемы</option>
              <option value="seminar">📚 Образовательные семинары</option>
              <option value="picnic">🧺 Пикники в парке</option>
              <option value="photo_walk">📷 Фотопрогулки</option>
              <option value="quest">🗝️ Квесты</option>
              <option value="dance">💃 Танцевальные уроки</option>
              <option value="tour">🚶 Городские экскурсии</option>
              <option value="volunteer">🤝 Волонтёрские акции</option>
              <option value="fitness">💪 Фитнес-тренировки</option>
              <option value="theater">🎭 Театральные постановки</option>
              <option value="auto_tour">🚗 Авто-туры</option>
              <option value="craft">✂️ Ремесленные мастер-классы</option>
              <option value="concert">🎤 Концерты</option>
              <option value="sports">⚽ Спортивные матчи</option>
              <option value="eco_tour">🌿 Экологические туры</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="event_date">Дата и время начала *</label>
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
              Указать дату и время окончания
            </label>
          </div>

          {formData.has_end_date && (
            <div className="form-group">
              <label htmlFor="end_date">Дата и время окончания</label>
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
          <label htmlFor="max_participants">Макс. участников *</label>
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
          <label>Место проведения *</label>
          <MapPicker
            onLocationSelect={handleLocationSelect}
            onAddressChange={handleAddressChange}
          />
          {!formData.location && (
            <p className="field-hint">Выберите место на карте или найдите по адресу</p>
          )}
        </div>

        {/* Фильтр по полу участников */}
        <div className="form-group">
          <label htmlFor="gender_filter">Кто может участвовать</label>
          <select
            id="gender_filter"
            name="gender_filter"
            value={formData.gender_filter}
            onChange={handleChange}
          >
            <option value="all">Все</option>
            <option value="male">Только мужчины</option>
            <option value="female">Только женщины</option>
          </select>
          <p className="field-hint">По умолчанию событие доступно для всех</p>
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
              <label htmlFor="difficulty">Сложность</label>
              <select
                id="difficulty"
                name="difficulty"
                value={formData.difficulty}
                onChange={handleChange}
              >
                <option value="">Выберите сложность</option>
                <option value="low">Низкая</option>
                <option value="medium">Средняя</option>
                <option value="high">Высокая</option>
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
                placeholder="Описание маршрута"
              />
            </div>
            <div className="form-group">
              <label htmlFor="equipment">Требования к снаряжению</label>
              <input
                type="text"
                id="equipment"
                name="equipment"
                value={formData.equipment}
                onChange={handleChange}
                placeholder="Горный велосипед, шлем, вода"
              />
            </div>
          </>
        )}

        {/* Специфичные поля для походов */}
        {formData.category === 'hiking' && (
          <>
            <div className="form-group">
              <label htmlFor="distance">Дистанция (км)</label>
              <input
                type="number"
                id="distance"
                name="distance"
                value={formData.distance}
                onChange={handleChange}
                placeholder="10"
              />
            </div>
            <div className="form-group">
              <label htmlFor="terrain">Тип местности</label>
              <select
                id="terrain"
                name="terrain"
                value={formData.terrain}
                onChange={handleChange}
              >
                <option value="">Выберите тип</option>
                <option value="forest">Лес</option>
                <option value="mountains">Горы</option>
                <option value="mixed">Смешанная</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="equipment">Необходимое снаряжение</label>
              <input
                type="text"
                id="equipment"
                name="equipment"
                value={formData.equipment}
                onChange={handleChange}
                placeholder="Рюкзак, вода, трекинговые палки"
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
              label="Тип практики"
              multiple={false}
              placeholder="Выберите тип практики"
            />
            <div className="form-group">
              <label htmlFor="difficulty">Уровень сложности</label>
              <select
                id="difficulty"
                name="difficulty"
                value={formData.difficulty}
                onChange={handleChange}
              >
                <option value="">Выберите уровень</option>
                <option value="beginner">Начинающий</option>
                <option value="intermediate">Средний</option>
                <option value="advanced">Продвинутый</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="equipment">Необходимое оборудование</label>
              <input
                type="text"
                id="equipment"
                name="equipment"
                value={formData.equipment}
                onChange={handleChange}
                placeholder="Коврик, блоки, ремни"
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

        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? 'Создание...' : 'Создать событие'}
        </button>
      </form>
    </div>
  );
};

export default CreateEvent;

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CATEGORIES } from '../constants/categories';
import './CategoryFilters.css';

const CategoryFilters = ({ category, filters, onChange }) => {
  const [dictionaryData, setDictionaryData] = useState({});

  useEffect(() => {
    if (category) {
      fetchDictionaryData();
    }
  }, [category]);

  const fetchDictionaryData = async () => {
    try {
      const data = {};

      // Загружаем справочники в зависимости от категории
      if (category === CATEGORIES.BOARD_GAMES) {
        const { data: games } = await supabase
          .from('board_games')
          .select('id, name')
          .order('name');
        data.boardGames = games || [];
      }

      if (category === CATEGORIES.YOGA) {
        const { data: types } = await supabase
          .from('yoga_practice_types')
          .select('id, name')
          .order('name');
        data.practiceTypes = types || [];
      }

      if (category === CATEGORIES.COOKING) {
        const { data: types } = await supabase
          .from('cuisine_types')
          .select('id, name')
          .order('name');
        data.cuisineTypes = types || [];
      }

      if (category === CATEGORIES.MUSIC_JAM) {
        const { data: genres } = await supabase
          .from('music_genres')
          .select('id, name')
          .order('name');
        data.genres = genres || [];
      }

      if (category === CATEGORIES.SEMINAR) {
        const { data: topics } = await supabase
          .from('seminar_topics')
          .select('id, name')
          .order('name');
        data.topics = topics || [];
      }

      if (category === CATEGORIES.PICNIC) {
        const { data: types } = await supabase
          .from('picnic_types')
          .select('id, name')
          .order('name');
        data.picnicTypes = types || [];
      }

      if (category === CATEGORIES.PHOTO_WALK) {
        const { data: themes } = await supabase
          .from('photography_themes')
          .select('id, name')
          .order('name');
        data.themes = themes || [];
      }

      if (category === CATEGORIES.QUEST) {
        const { data: themes } = await supabase
          .from('quest_themes')
          .select('id, name')
          .order('name');
        data.questThemes = themes || [];
      }

      if (category === CATEGORIES.DANCE) {
        const { data: styles } = await supabase
          .from('dance_styles')
          .select('id, name')
          .order('name');
        data.danceStyles = styles || [];
      }

      if (category === CATEGORIES.VOLUNTEER) {
        const { data: types } = await supabase
          .from('volunteer_activity_types')
          .select('id, name')
          .order('name');
        data.activityTypes = types || [];
      }

      if (category === CATEGORIES.FITNESS) {
        const { data: types } = await supabase
          .from('fitness_workout_types')
          .select('id, name')
          .order('name');
        data.workoutTypes = types || [];
      }

      if (category === CATEGORIES.THEATER) {
        const { data: genres } = await supabase
          .from('theater_genres')
          .select('id, name')
          .order('name');
        data.theaterGenres = genres || [];
      }

      if (category === CATEGORIES.CRAFT) {
        const { data: types } = await supabase
          .from('craft_types')
          .select('id, name')
          .order('name');
        data.craftTypes = types || [];
      }

      if (category === CATEGORIES.CONCERT) {
        const { data: genres } = await supabase
          .from('music_genres')
          .select('id, name')
          .order('name');
        data.concertGenres = genres || [];
      }

      if (category === CATEGORIES.SPORTS) {
        const { data: types } = await supabase
          .from('sports_types')
          .select('id, name')
          .order('name');
        data.sportsTypes = types || [];
      }

      if (category === CATEGORIES.ECO_TOUR) {
        const { data: types } = await supabase
          .from('eco_tour_types')
          .select('id, name')
          .order('name');
        data.tourTypes = types || [];
      }

      setDictionaryData(data);
    } catch (error) {
      console.error('Ошибка загрузки справочников:', error);
    }
  };

  const handleChange = (e) => {
    onChange({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  // Настольные игры
  if (category === CATEGORIES.BOARD_GAMES) {
    return (
      <div className="category-filters">
        <label>Фильтр по игре:</label>
        <select
          name="boardGameId"
          value={filters.boardGameId || ''}
          onChange={handleChange}
          className="filter-select"
        >
          <option value="">Все игры</option>
          {dictionaryData.boardGames?.map(game => (
            <option key={game.id} value={game.id}>
              {game.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Велопрогулки
  if (category === CATEGORIES.CYCLING) {
    return (
      <div className="category-filters">
        <label>Сложность:</label>
        <select
          name="difficulty"
          value={filters.difficulty || ''}
          onChange={handleChange}
          className="filter-select"
        >
          <option value="">Любая</option>
          <option value="low">Низкая</option>
          <option value="medium">Средняя</option>
          <option value="high">Высокая</option>
        </select>
      </div>
    );
  }

  // Походы
  if (category === CATEGORIES.HIKING) {
    return (
      <>
        <div className="category-filters">
          <label>Местность:</label>
          <select
            name="terrain"
            value={filters.terrain || ''}
            onChange={handleChange}
            className="filter-select"
          >
            <option value="">Любая</option>
            <option value="forest">Лес</option>
            <option value="mountains">Горы</option>
            <option value="mixed">Смешанная</option>
          </select>
        </div>
        <div className="category-filters">
          <label>Дистанция (км):</label>
          <div className="distance-range">
            <input
              type="number"
              name="minDistance"
              placeholder="От"
              value={filters.minDistance || ''}
              onChange={handleChange}
              className="filter-input"
              min="0"
              step="0.1"
            />
            <span>—</span>
            <input
              type="number"
              name="maxDistance"
              placeholder="До"
              value={filters.maxDistance || ''}
              onChange={handleChange}
              className="filter-input"
              min="0"
              step="0.1"
            />
          </div>
        </div>
      </>
    );
  }

  // Йога
  if (category === CATEGORIES.YOGA) {
    return (
      <>
        <div className="category-filters">
          <label>Тип практики:</label>
          <select
            name="practiceTypeId"
            value={filters.practiceTypeId || ''}
            onChange={handleChange}
            className="filter-select"
          >
            <option value="">Все типы</option>
            {dictionaryData.practiceTypes?.map(type => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
        <div className="category-filters">
          <label>Уровень:</label>
          <select
            name="difficulty"
            value={filters.difficulty || ''}
            onChange={handleChange}
            className="filter-select"
          >
            <option value="">Любой</option>
            <option value="beginner">Начинающий</option>
            <option value="intermediate">Средний</option>
            <option value="advanced">Продвинутый</option>
          </select>
        </div>
      </>
    );
  }

  // Кулинария
  if (category === CATEGORIES.COOKING) {
    return (
      <>
        <div className="category-filters">
          <label>Тип кухни:</label>
          <select
            name="cuisineTypeId"
            value={filters.cuisineTypeId || ''}
            onChange={handleChange}
            className="filter-select"
          >
            <option value="">Все кухни</option>
            {dictionaryData.cuisineTypes?.map(type => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
        <div className="category-filters">
          <label>Уровень:</label>
          <select
            name="skillLevel"
            value={filters.skillLevel || ''}
            onChange={handleChange}
            className="filter-select"
          >
            <option value="">Любой</option>
            <option value="beginner">Начинающий</option>
            <option value="experienced">Опытный</option>
          </select>
        </div>
      </>
    );
  }

  // Музыкальные джемы
  if (category === CATEGORIES.MUSIC_JAM) {
    return (
      <>
        <div className="category-filters">
          <label>Жанр:</label>
          <select
            name="genreId"
            value={filters.genreId || ''}
            onChange={handleChange}
            className="filter-select"
          >
            <option value="">Все жанры</option>
            {dictionaryData.genres?.map(genre => (
              <option key={genre.id} value={genre.id}>
                {genre.name}
              </option>
            ))}
          </select>
        </div>
        <div className="category-filters">
          <label>Уровень:</label>
          <select
            name="performerLevel"
            value={filters.performerLevel || ''}
            onChange={handleChange}
            className="filter-select"
          >
            <option value="">Любой</option>
            <option value="amateur">Любитель</option>
            <option value="professional">Профессионал</option>
          </select>
        </div>
      </>
    );
  }

  // Семинары
  if (category === CATEGORIES.SEMINAR) {
    return (
      <>
        <div className="category-filters">
          <label>Тема:</label>
          <select
            name="topicId"
            value={filters.topicId || ''}
            onChange={handleChange}
            className="filter-select"
          >
            <option value="">Все темы</option>
            {dictionaryData.topics?.map(topic => (
              <option key={topic.id} value={topic.id}>
                {topic.name}
              </option>
            ))}
          </select>
        </div>
        <div className="category-filters">
          <label>Формат:</label>
          <select
            name="format"
            value={filters.format || ''}
            onChange={handleChange}
            className="filter-select"
          >
            <option value="">Любой</option>
            <option value="lecture">Лекция</option>
            <option value="workshop">Воркшоп</option>
            <option value="discussion">Дискуссия</option>
          </select>
        </div>
      </>
    );
  }

  // Пикники
  if (category === CATEGORIES.PICNIC) {
    return (
      <div className="category-filters">
        <label>Тип пикника:</label>
        <select
          name="picnicTypeId"
          value={filters.picnicTypeId || ''}
          onChange={handleChange}
          className="filter-select"
        >
          <option value="">Все типы</option>
          {dictionaryData.picnicTypes?.map(type => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Фотопрогулки
  if (category === CATEGORIES.PHOTO_WALK) {
    return (
      <>
        <div className="category-filters">
          <label>Тематика:</label>
          <select
            name="themeId"
            value={filters.themeId || ''}
            onChange={handleChange}
            className="filter-select"
          >
            <option value="">Все тематики</option>
            {dictionaryData.themes?.map(theme => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </select>
        </div>
        <div className="category-filters">
          <label>Уровень:</label>
          <select
            name="skillLevel"
            value={filters.skillLevel || ''}
            onChange={handleChange}
            className="filter-select"
          >
            <option value="">Любой</option>
            <option value="beginner">Начинающий</option>
            <option value="advanced">Продвинутый</option>
          </select>
        </div>
      </>
    );
  }

  // Квесты
  if (category === CATEGORIES.QUEST) {
    return (
      <>
        <div className="category-filters">
          <label>Тематика:</label>
          <select
            name="themeId"
            value={filters.themeId || ''}
            onChange={handleChange}
            className="filter-select"
          >
            <option value="">Все тематики</option>
            {dictionaryData.questThemes?.map(theme => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </select>
        </div>
        <div className="category-filters">
          <label>Сложность:</label>
          <select
            name="difficulty"
            value={filters.difficulty || ''}
            onChange={handleChange}
            className="filter-select"
          >
            <option value="">Любая</option>
            <option value="easy">Лёгкая</option>
            <option value="medium">Средняя</option>
            <option value="hardcore">Хардкор</option>
          </select>
        </div>
      </>
    );
  }

  // Танцы
  if (category === CATEGORIES.DANCE) {
    return (
      <>
        <div className="category-filters">
          <label>Стиль:</label>
          <select
            name="styleId"
            value={filters.styleId || ''}
            onChange={handleChange}
            className="filter-select"
          >
            <option value="">Все стили</option>
            {dictionaryData.danceStyles?.map(style => (
              <option key={style.id} value={style.id}>
                {style.name}
              </option>
            ))}
          </select>
        </div>
        <div className="category-filters">
          <label>Уровень:</label>
          <select
            name="skillLevel"
            value={filters.skillLevel || ''}
            onChange={handleChange}
            className="filter-select"
          >
            <option value="">Любой</option>
            <option value="beginner">Начинающий</option>
            <option value="intermediate">Средний</option>
            <option value="advanced">Продвинутый</option>
          </select>
        </div>
      </>
    );
  }

  // Экскурсии
  if (category === CATEGORIES.TOUR) {
    return (
      <>
        <div className="category-filters">
          <label>Тематика:</label>
          <select
            name="theme"
            value={filters.theme || ''}
            onChange={handleChange}
            className="filter-select"
          >
            <option value="">Все тематики</option>
            <option value="historical">Историческая</option>
            <option value="gastronomic">Гастрономическая</option>
            <option value="street_art">Уличное искусство</option>
          </select>
        </div>
        <div className="category-filters">
          <label>Темп:</label>
          <select
            name="pace"
            value={filters.pace || ''}
            onChange={handleChange}
            className="filter-select"
          >
            <option value="">Любой</option>
            <option value="slow">Медленный</option>
            <option value="active">Активный</option>
          </select>
        </div>
      </>
    );
  }

  // Волонтёрство
  if (category === CATEGORIES.VOLUNTEER) {
    return (
      <div className="category-filters">
        <label>Тип деятельности:</label>
        <select
          name="activityTypeId"
          value={filters.activityTypeId || ''}
          onChange={handleChange}
          className="filter-select"
        >
          <option value="">Все типы</option>
          {dictionaryData.activityTypes?.map(type => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Фитнес
  if (category === CATEGORIES.FITNESS) {
    return (
      <>
        <div className="category-filters">
          <label>Тип тренировки:</label>
          <select
            name="workoutTypeId"
            value={filters.workoutTypeId || ''}
            onChange={handleChange}
            className="filter-select"
          >
            <option value="">Все типы</option>
            {dictionaryData.workoutTypes?.map(type => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
        <div className="category-filters">
          <label>Уровень:</label>
          <select
            name="fitnessLevel"
            value={filters.fitnessLevel || ''}
            onChange={handleChange}
            className="filter-select"
          >
            <option value="">Любой</option>
            <option value="beginner">Начинающий</option>
            <option value="advanced">Продвинутый</option>
          </select>
        </div>
      </>
    );
  }

  // Театр
  if (category === CATEGORIES.THEATER) {
    return (
      <div className="category-filters">
        <label>Жанр:</label>
        <select
          name="genreId"
          value={filters.genreId || ''}
          onChange={handleChange}
          className="filter-select"
        >
          <option value="">Все жанры</option>
          {dictionaryData.theaterGenres?.map(genre => (
            <option key={genre.id} value={genre.id}>
              {genre.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Авто-туры
  if (category === CATEGORIES.AUTO_TOUR) {
    return (
      <>
        <div className="category-filters">
          <label>Тип маршрута:</label>
          <select
            name="routeType"
            value={filters.routeType || ''}
            onChange={handleChange}
            className="filter-select"
          >
            <option value="">Любой</option>
            <option value="city">Городской</option>
            <option value="offroad">Оффроад</option>
          </select>
        </div>
        <div className="category-filters">
          <label>Сложность:</label>
          <select
            name="drivingDifficulty"
            value={filters.drivingDifficulty || ''}
            onChange={handleChange}
            className="filter-select"
          >
            <option value="">Любая</option>
            <option value="easy">Лёгкая</option>
            <option value="hard">Сложная</option>
          </select>
        </div>
      </>
    );
  }

  // Ремесленные мастер-классы
  if (category === CATEGORIES.CRAFT) {
    return (
      <>
        <div className="category-filters">
          <label>Тип ремесла:</label>
          <select
            name="craftTypeId"
            value={filters.craftTypeId || ''}
            onChange={handleChange}
            className="filter-select"
          >
            <option value="">Все типы</option>
            {dictionaryData.craftTypes?.map(type => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
        <div className="category-filters">
          <label>Уровень:</label>
          <select
            name="skillLevel"
            value={filters.skillLevel || ''}
            onChange={handleChange}
            className="filter-select"
          >
            <option value="">Любой</option>
            <option value="beginner">Начинающий</option>
            <option value="intermediate">Средний</option>
            <option value="advanced">Продвинутый</option>
          </select>
        </div>
      </>
    );
  }

  // Концерты
  if (category === CATEGORIES.CONCERT) {
    return (
      <div className="category-filters">
        <label>Жанр:</label>
        <select
          name="genreId"
          value={filters.genreId || ''}
          onChange={handleChange}
          className="filter-select"
        >
          <option value="">Все жанры</option>
          {dictionaryData.concertGenres?.map(genre => (
            <option key={genre.id} value={genre.id}>
              {genre.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Спорт
  if (category === CATEGORIES.SPORTS) {
    return (
      <>
        <div className="category-filters">
          <label>Вид спорта:</label>
          <select
            name="sportTypeId"
            value={filters.sportTypeId || ''}
            onChange={handleChange}
            className="filter-select"
          >
            <option value="">Все виды</option>
            {dictionaryData.sportsTypes?.map(type => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
        <div className="category-filters">
          <label>Уровень:</label>
          <select
            name="level"
            value={filters.level || ''}
            onChange={handleChange}
            className="filter-select"
          >
            <option value="">Любой</option>
            <option value="amateur">Любительский</option>
            <option value="professional">Профессиональный</option>
          </select>
        </div>
      </>
    );
  }

  // Эко-туры
  if (category === CATEGORIES.ECO_TOUR) {
    return (
      <div className="category-filters">
        <label>Тип тура:</label>
        <select
          name="tourTypeId"
          value={filters.tourTypeId || ''}
          onChange={handleChange}
          className="filter-select"
        >
          <option value="">Все типы</option>
          {dictionaryData.tourTypes?.map(type => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return null;
};

export default CategoryFilters;

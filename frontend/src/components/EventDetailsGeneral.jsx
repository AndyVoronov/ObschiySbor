// Компонент для вкладки "Общее" - содержит основную информацию о событии
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Suspense } from 'react';
import { EventMap, MapLoadingFallback } from './LazyComponents';
import { generateICS, generateGoogleCalendarLink } from '../utils/calendarExport';
import { getCategoryName } from '../constants/categories';
import { EVENT_STATUS } from '../utils/eventStatus';

const EventDetailsGeneral = ({
  event,
  eventStatus,
  boardGames,
  categoryRelatedData,
  isParticipant,
  isCreator
}) => {
  const { t } = useTranslation('common');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleExportToCalendar = () => {
    generateICS(event);
  };

  const handleAddToGoogleCalendar = () => {
    const googleCalendarUrl = generateGoogleCalendarLink(event);
    window.open(googleCalendarUrl, '_blank');
  };

  return (
    <div className="event-general-tab">
      {/* Основная информация */}
      <div className="event-info">
        <div className="info-item">
          <strong>{t('eventDetails.startLabel')}:</strong>
          <span>{new Date(event.event_date).toLocaleString('ru-RU')}</span>
        </div>
        {event.end_date && (
          <div className="info-item">
            <strong>{t('eventDetails.endLabel')}:</strong>
            <span>{new Date(event.end_date).toLocaleString('ru-RU')}</span>
          </div>
        )}
        <div className="info-item">
          <strong>{t('eventDetails.locationLabel')}:</strong>
          <span>
            {event.event_type === 'online' ? (
              <>💻 {t('eventDetails.onlinePrefix')} • {t(`createEvent.platforms.${event.online_platform}`)}</>
            ) : (
              event.location
            )}
          </span>
        </div>

        {/* Ссылка на онлайн-мероприятие */}
        {event.event_type === 'online' && event.online_link && (isParticipant || isCreator) && (
          <div className="info-item online-link-item">
            <strong>{t('eventDetails.onlineLink')}:</strong>
            <a href={event.online_link} target="_blank" rel="noopener noreferrer" className="online-link">
              {event.online_link}
            </a>
          </div>
        )}

        {event.gender_filter && event.gender_filter !== 'all' && (
          <div className="info-item">
            <strong>{t('eventDetails.whoCanParticipate')}:</strong>
            <span className="gender-filter-badge">
              {event.gender_filter === 'male' && `👨 ${t('eventDetails.onlyMen')}`}
              {event.gender_filter === 'female' && `👩 ${t('eventDetails.onlyWomen')}`}
            </span>
          </div>
        )}
      </div>

      {/* Описание */}
      <div className="event-description">
        <h2>{t('eventDetails.description')}</h2>
        <p>{event.description}</p>
      </div>

      {/* Настольные игры */}
      {event.category === 'board_games' && boardGames && boardGames.length > 0 && (
        <div className="board-games-section">
          <h2>{t('eventDetails.boardGames')}</h2>
          <div className="board-games-list">
            {boardGames.map(game => (
              <Link key={game.id} to={`/board-games/${game.id}`} className="board-game-card">
                {game.image_url && (
                  <img src={game.image_url} alt={game.name} className="board-game-image" />
                )}
                <div className="board-game-info">
                  <h3>{game.name}</h3>
                  {game.description && <p className="game-description">{game.description}</p>}
                  <div className="game-meta">
                    <span>👥 {game.min_players}-{game.max_players} {t('eventDetails.players')}</span>
                    <span>⏱️ ~{game.avg_playtime_minutes} {t('eventDetails.minutes')}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Карта */}
      {event.event_type === 'offline' && event.latitude && event.longitude && (
        <div className="event-map-container">
          <h2>{t('eventDetails.locationLabel')}</h2>
          <Suspense fallback={<MapLoadingFallback />}>
            <EventMap
              latitude={event.latitude}
              longitude={event.longitude}
              address={event.location}
            />
          </Suspense>
        </div>
      )}

      {/* Детали категории */}
      {event.category_data && event.category !== 'board_games' && (
        <div className="category-details">
          <h2>{t('eventDetails.details')}</h2>

          {event.category === 'cycling' && (
            <>
              {event.category_data.difficulty && (
                <p><strong>{t('eventDetails.categoryData.difficulty')}:</strong> {event.category_data.difficulty}</p>
              )}
              {event.category_data.route && (
                <p><strong>{t('eventDetails.categoryData.route')}:</strong> {event.category_data.route}</p>
              )}
              {event.category_data.equipment && (
                <p><strong>{t('eventDetails.categoryData.equipment')}:</strong> {event.category_data.equipment}</p>
              )}
            </>
          )}

          {event.category === 'hiking' && (
            <>
              {event.category_data.distance && (
                <p><strong>{t('eventDetails.categoryData.distance')}:</strong> {event.category_data.distance} {t('eventDetails.categoryData.distanceKm')}</p>
              )}
              {event.category_data.terrain && (
                <p><strong>{t('eventDetails.categoryData.terrain')}:</strong> {event.category_data.terrain}</p>
              )}
              {event.category_data.equipment_needed?.length > 0 && (
                <p><strong>{t('eventDetails.categoryData.equipmentNeeded')}:</strong> {event.category_data.equipment_needed.join(', ')}</p>
              )}
            </>
          )}

          {event.category === 'yoga' && (
            <>
              {categoryRelatedData?.practice_type && (
                <p><strong>{t('eventDetails.categoryData.practiceType')}:</strong> {categoryRelatedData.practice_type}</p>
              )}
              {event.category_data.level && (
                <p><strong>{t('eventDetails.categoryData.level')}:</strong> {t(`eventDetails.categoryData.level${event.category_data.level.charAt(0).toUpperCase() + event.category_data.level.slice(1)}`)}</p>
              )}
              {event.category_data.mat_provided !== undefined && (
                <p><strong>{t('eventDetails.categoryData.matProvided')}:</strong> {event.category_data.mat_provided ? t('eventDetails.categoryData.matProvidedYes') : t('eventDetails.categoryData.matProvidedNo')}</p>
              )}
            </>
          )}

          {event.category === 'cooking' && (
            <>
              {categoryRelatedData?.cuisine_type && (
                <p><strong>{t('eventDetails.categoryData.cuisineType')}:</strong> {categoryRelatedData.cuisine_type}</p>
              )}
              {event.category_data.level && (
                <p><strong>{t('eventDetails.categoryData.level')}:</strong> {t(`eventDetails.categoryData.level${event.category_data.level.charAt(0).toUpperCase() + event.category_data.level.slice(1)}`)}</p>
              )}
              {event.category_data.dish_name && (
                <p><strong>{t('eventDetails.categoryData.dishName')}:</strong> {event.category_data.dish_name}</p>
              )}
            </>
          )}

          {event.category === 'movie' && (
            <>
              {categoryRelatedData?.genre && (
                <p><strong>{t('eventDetails.categoryData.genre')}:</strong> {categoryRelatedData.genre}</p>
              )}
              {event.category_data.movie_title && (
                <p><strong>{t('eventDetails.categoryData.movieTitle')}:</strong> {event.category_data.movie_title}</p>
              )}
              {event.category_data.rating && (
                <p><strong>{t('eventDetails.categoryData.rating')}:</strong> {event.category_data.rating}</p>
              )}
            </>
          )}

          {event.category === 'photo_walk' && (
            <>
              {categoryRelatedData?.theme && (
                <p><strong>{t('eventDetails.categoryData.theme')}:</strong> {categoryRelatedData.theme}</p>
              )}
              {event.category_data.camera_required !== undefined && (
                <p><strong>{t('eventDetails.categoryData.cameraRequired')}:</strong> {event.category_data.camera_required ? t('eventDetails.categoryData.cameraRequiredYes') : t('eventDetails.categoryData.cameraRequiredNo')}</p>
              )}
            </>
          )}

          {event.category === 'exhibition' && (
            <>
              {categoryRelatedData?.exhibition_type && (
                <p><strong>{t('eventDetails.categoryData.exhibitionType')}:</strong> {categoryRelatedData.exhibition_type}</p>
              )}
              {event.category_data.artist_name && (
                <p><strong>{t('eventDetails.categoryData.artistName')}:</strong> {event.category_data.artist_name}</p>
              )}
            </>
          )}

          {event.category === 'volunteer' && (
            <>
              {categoryRelatedData?.activity_type && (
                <p><strong>{t('eventDetails.categoryData.activityType')}:</strong> {categoryRelatedData.activity_type}</p>
              )}
              {event.category_data.requirements && (
                <p><strong>{t('eventDetails.categoryData.requirements')}:</strong> {event.category_data.requirements}</p>
              )}
            </>
          )}

          {event.category === 'quest' && (
            <>
              {categoryRelatedData?.quest_type && (
                <p><strong>{t('eventDetails.categoryData.questType')}:</strong> {categoryRelatedData.quest_type}</p>
              )}
              {event.category_data.difficulty && (
                <p><strong>{t('eventDetails.categoryData.difficulty')}:</strong> {t(`eventDetails.categoryData.difficulty${event.category_data.difficulty.charAt(0).toUpperCase() + event.category_data.difficulty.slice(1)}`)}</p>
              )}
              {event.category_data.team_size && (
                <p><strong>{t('eventDetails.categoryData.teamSize')}:</strong> {event.category_data.team_size} {t('eventDetails.categoryData.people')}</p>
              )}
            </>
          )}

          {event.category === 'book_club' && (
            <>
              {categoryRelatedData?.genre && (
                <p><strong>{t('eventDetails.categoryData.genre')}:</strong> {categoryRelatedData.genre}</p>
              )}
              {event.category_data.book_title && (
                <p><strong>{t('eventDetails.categoryData.bookTitle')}:</strong> {event.category_data.book_title}</p>
              )}
              {event.category_data.author && (
                <p><strong>{t('eventDetails.categoryData.author')}:</strong> {event.category_data.author}</p>
              )}
            </>
          )}

          {event.category === 'running' && (
            <>
              {event.category_data.distance && (
                <p><strong>{t('eventDetails.categoryData.distance')}:</strong> {event.category_data.distance} {t('eventDetails.categoryData.distanceKm')}</p>
              )}
              {event.category_data.pace && (
                <p><strong>{t('eventDetails.categoryData.pace')}:</strong> {event.category_data.pace}</p>
              )}
              {event.category_data.terrain && (
                <p><strong>{t('eventDetails.categoryData.terrain')}:</strong> {event.category_data.terrain}</p>
              )}
            </>
          )}

          {event.category === 'pets' && (
            <>
              {categoryRelatedData?.pet_type && (
                <p><strong>{t('eventDetails.categoryData.petType')}:</strong> {categoryRelatedData.pet_type}</p>
              )}
              {event.category_data.activity_type && (
                <p><strong>{t('eventDetails.categoryData.activityType')}:</strong> {event.category_data.activity_type}</p>
              )}
            </>
          )}

          {event.category === 'dance' && (
            <>
              {categoryRelatedData?.dance_style && (
                <p><strong>{t('eventDetails.categoryData.danceStyle')}:</strong> {categoryRelatedData.dance_style}</p>
              )}
              {event.category_data.level && (
                <p><strong>{t('eventDetails.categoryData.level')}:</strong> {t(`eventDetails.categoryData.level${event.category_data.level.charAt(0).toUpperCase() + event.category_data.level.slice(1)}`)}</p>
              )}
              {event.category_data.partner_required !== undefined && (
                <p><strong>{t('eventDetails.categoryData.partnerRequired')}:</strong> {event.category_data.partner_required ? t('eventDetails.categoryData.partnerRequiredYes') : t('eventDetails.categoryData.partnerRequiredNo')}</p>
              )}
            </>
          )}

          {event.category === 'music_jam' && (
            <>
              {categoryRelatedData?.genre && (
                <p><strong>{t('eventDetails.categoryData.genre')}:</strong> {categoryRelatedData.genre}</p>
              )}
              {event.category_data.instruments_needed?.length > 0 && (
                <p><strong>{t('eventDetails.categoryData.instrumentsNeeded')}:</strong> {event.category_data.instruments_needed.join(', ')}</p>
              )}
              {event.category_data.skill_level && (
                <p><strong>{t('eventDetails.categoryData.level')}:</strong> {t(`eventDetails.categoryData.level${event.category_data.skill_level.charAt(0).toUpperCase() + event.category_data.skill_level.slice(1)}`)}</p>
              )}
            </>
          )}

          {event.category === 'language' && (
            <>
              {categoryRelatedData?.language && (
                <p><strong>{t('eventDetails.categoryData.language')}:</strong> {categoryRelatedData.language}</p>
              )}
              {event.category_data.level && (
                <p><strong>{t('eventDetails.categoryData.level')}:</strong> {t(`eventDetails.categoryData.level${event.category_data.level.charAt(0).toUpperCase() + event.category_data.level.slice(1)}`)}</p>
              )}
              {event.category_data.topic && (
                <p><strong>{t('eventDetails.categoryData.topic')}:</strong> {event.category_data.topic}</p>
              )}
            </>
          )}

          {event.category === 'fitness' && (
            <>
              {categoryRelatedData?.workout_type && (
                <p><strong>{t('eventDetails.categoryData.workoutType')}:</strong> {categoryRelatedData.workout_type}</p>
              )}
              {event.category_data.fitness_level && (
                <p><strong>{t('eventDetails.categoryData.fitnessLevel')}:</strong> {t(`eventDetails.categoryData.fitnessLevel${event.category_data.fitness_level.charAt(0).toUpperCase() + event.category_data.fitness_level.slice(1)}`)}</p>
              )}
              {event.category_data.duration_minutes && (
                <p><strong>{t('eventDetails.categoryData.durationMinutes')}:</strong> {event.category_data.duration_minutes} {t('eventDetails.categoryData.minutes')}</p>
              )}
              {event.category_data.equipment_needed?.length > 0 && (
                <p><strong>{t('eventDetails.categoryData.equipmentNeeded')}:</strong> {event.category_data.equipment_needed.join(', ')}</p>
              )}
            </>
          )}

          {event.category === 'theater' && (
            <>
              {categoryRelatedData?.genre && (
                <p><strong>{t('eventDetails.categoryData.theaterGenre')}:</strong> {categoryRelatedData.genre}</p>
              )}
              {event.category_data.age_rating && (
                <p><strong>{t('eventDetails.categoryData.ageRating')}:</strong> {event.category_data.age_rating}</p>
              )}
              {event.category_data.duration_minutes && (
                <p><strong>{t('eventDetails.categoryData.durationMinutes')}:</strong> {event.category_data.duration_minutes} {t('eventDetails.categoryData.minutes')}</p>
              )}
              {event.category_data.has_intermission && (
                <p><strong>{t('eventDetails.categoryData.hasIntermission')}:</strong> {t('eventDetails.categoryData.hasIntermissionYes')}</p>
              )}
            </>
          )}

          {event.category === 'auto_tour' && (
            <>
              {event.category_data.route_type && (
                <p><strong>{t('eventDetails.categoryData.routeType')}:</strong> {t(`eventDetails.categoryData.routeType${event.category_data.route_type.charAt(0).toUpperCase() + event.category_data.route_type.slice(1)}`)}</p>
              )}
              {event.category_data.driving_difficulty && (
                <p><strong>{t('eventDetails.categoryData.drivingDifficulty')}:</strong> {t(`eventDetails.categoryData.driving${event.category_data.driving_difficulty.charAt(0).toUpperCase() + event.category_data.driving_difficulty.slice(1)}`)}</p>
              )}
              {event.category_data.required_equipment?.length > 0 && (
                <p><strong>{t('eventDetails.categoryData.requiredEquipment')}:</strong> {event.category_data.required_equipment.join(', ')}</p>
              )}
              {event.category_data.car_capacity && (
                <p><strong>{t('eventDetails.categoryData.carCapacity')}:</strong> {event.category_data.car_capacity} {t('eventDetails.categoryData.carCapacityPeople')}</p>
              )}
            </>
          )}

          {event.category === 'craft' && (
            <>
              {categoryRelatedData?.craft_type && (
                <p><strong>{t('eventDetails.categoryData.craftType')}:</strong> {categoryRelatedData.craft_type}</p>
              )}
              {categoryRelatedData?.materials?.length > 0 && (
                <p><strong>{t('eventDetails.categoryData.materials')}:</strong> {categoryRelatedData.materials.join(', ')}</p>
              )}
              {event.category_data.skill_level && (
                <p><strong>{t('eventDetails.categoryData.level')}:</strong> {t(`eventDetails.categoryData.level${event.category_data.skill_level.charAt(0).toUpperCase() + event.category_data.skill_level.slice(1)}`)}</p>
              )}
              {event.category_data.final_product && (
                <p><strong>{t('eventDetails.categoryData.finalProduct')}:</strong> {event.category_data.final_product}</p>
              )}
            </>
          )}

          {event.category === 'concert' && (
            <>
              {categoryRelatedData?.genre && (
                <p><strong>{t('eventDetails.categoryData.genre')}:</strong> {categoryRelatedData.genre}</p>
              )}
              {event.category_data.performer && (
                <p><strong>{t('eventDetails.categoryData.performer')}:</strong> {event.category_data.performer}</p>
              )}
              {event.category_data.age_restriction && (
                <p><strong>{t('eventDetails.categoryData.ageRestriction')}:</strong> {event.category_data.age_restriction}</p>
              )}
            </>
          )}

          {event.category === 'sports' && (
            <>
              {categoryRelatedData?.sport_type && (
                <p><strong>{t('eventDetails.categoryData.sportType')}:</strong> {categoryRelatedData.sport_type}</p>
              )}
              {event.category_data.level && (
                <p><strong>{t('eventDetails.categoryData.sportLevel')}:</strong> {t(`eventDetails.categoryData.sportLevel${event.category_data.level.charAt(0).toUpperCase() + event.category_data.level.slice(1)}`)}</p>
              )}
            </>
          )}

          {event.category === 'eco_tour' && (
            <>
              {categoryRelatedData?.tour_type && (
                <p><strong>{t('eventDetails.categoryData.tourType')}:</strong> {categoryRelatedData.tour_type}</p>
              )}
              {event.category_data.equipment_needed?.length > 0 && (
                <p><strong>{t('eventDetails.categoryData.equipmentNeeded')}:</strong> {event.category_data.equipment_needed.join(', ')}</p>
              )}
            </>
          )}
        </div>
      )}

      {/* Действия с календарём */}
      <div className="calendar-actions">
        <h3
          onClick={() => setIsCalendarOpen(!isCalendarOpen)}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          {isCalendarOpen ? '▼' : '▶'} {t('eventDetails.calendar.title')}
        </h3>
        {isCalendarOpen && (
          <div className="calendar-buttons">
            <button
              onClick={handleExportToCalendar}
              className="btn btn-secondary"
              title={t('eventDetails.calendar.downloadICSTitle')}
            >
              📅 {t('eventDetails.calendar.downloadICS')}
            </button>
            <button
              onClick={handleAddToGoogleCalendar}
              className="btn btn-secondary"
              title={t('eventDetails.calendar.googleCalendarTitle')}
            >
              📆 {t('eventDetails.calendar.googleCalendar')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventDetailsGeneral;

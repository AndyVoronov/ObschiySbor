# EventDetails.jsx Translation Update Summary

## Completed Updates

### 1. Imports and Hooks
- ✅ Added `useTranslation` import
- ✅ Added `getCategoryName` import from constants
- ✅ Added `const { t } = useTranslation('common');` hook

### 2. Functions
- ✅ Updated loading state: `{t('eventDetails.loading')}`
- ✅ Updated not found error: `{t('eventDetails.notFound')}`
- ✅ Updated handleJoinEvent alerts:
  - `t('eventDetails.genderNotSet')`
  - `t('eventDetails.genderMismatch')` + gender labels
  - `t('eventDetails.joinError')`
- ✅ Updated handleLeaveEvent: `t('eventDetails.leaveError')`
- ✅ Updated handleCancelEvent:
  - `t('eventDetails.cancelReasonEmpty')`
  - `t('eventDetails.eventCancelled')`
  - `t('eventDetails.cancelledReason')`
  - `t('eventDetails.eventCancelledNotice')`
  - `t('eventDetails.cancelError')`

### 3. JSX Header Section
- ✅ Updated category badge: `getCategoryName(event.category, t)`
- ✅ Updated cancellation notice
- ✅ Updated event info labels (Start, End, Location, Online Link, Who can participate)
- ✅ Updated online platform display
- ✅ Updated gender filter labels

### 4. Content Sections
- ✅ Updated description header
- ✅ Updated board games section
- ✅ Started category details section (cycling, hiking)

## Remaining Updates Needed

The following sections still need translation (line numbers approximate):

### Category Details Section (lines 546-810)
Update all remaining category-specific fields:

1. **Yoga** (line 546):
```javascript
<strong>{t('eventDetails.categoryData.practiceType')}:</strong>
<strong>{t('eventDetails.categoryData.level')}:</strong> {event.category_data.difficulty === 'beginner' ? t('eventDetails.categoryData.levelBeginner') : event.category_data.difficulty === 'intermediate' ? t('eventDetails.categoryData.levelIntermediate') : t('eventDetails.categoryData.levelAdvanced')}
<strong>{t('eventDetails.categoryData.equipment')}:</strong>
```

2. **Cooking** (line 559):
```javascript
<strong>{t('eventDetails.categoryData.cuisine')}:</strong>
<strong>{t('eventDetails.categoryData.skillLevel')}:</strong> {event.category_data.skill_level === 'beginner' ? t('eventDetails.categoryData.skillLevelBeginner') : t('eventDetails.categoryData.skillLevelExperienced')}
```

3. **Music Jam** (line 569):
```javascript
<strong>{t('eventDetails.categoryData.genre')}:</strong>
<strong>{t('eventDetails.categoryData.instruments')}:</strong>
<strong>{t('eventDetails.categoryData.performerLevel')}:</strong> {event.category_data.performer_level === 'amateur' ? t('eventDetails.categoryData.performerAmateur') : t('eventDetails.categoryData.performerProfessional')}
```

4. **Seminar** (line 582):
```javascript
<strong>{t('eventDetails.categoryData.topic')}:</strong>
<strong>{t('eventDetails.categoryData.format')}:</strong> {event.category_data.format === 'lecture' ? t('eventDetails.categoryData.formatLecture') : event.category_data.format === 'workshop' ? t('eventDetails.categoryData.formatWorkshop') : t('eventDetails.categoryData.formatDiscussion')}
<strong>{t('eventDetails.categoryData.knowledgeLevel')}:</strong> {event.category_data.knowledge_level === 'basic' ? t('eventDetails.categoryData.knowledgeBasic') : t('eventDetails.categoryData.knowledgeAdvanced')}
<strong>{t('eventDetails.categoryData.materials')}:</strong>
```

5. **Picnic** (line 598):
```javascript
<strong>{t('eventDetails.categoryData.picnicType')}:</strong>
<strong>{t('eventDetails.categoryData.weatherPlace')}:</strong> {event.category_data.weather_dependent === 'covered' ? t('eventDetails.categoryData.weatherCovered') : t('eventDetails.categoryData.weatherOutdoor')}
```

6. **Photo Walk** (line 608):
```javascript
<strong>{t('eventDetails.categoryData.theme')}:</strong>
<strong>{t('eventDetails.categoryData.skillLevel')}:</strong> {event.category_data.skill_level === 'beginner' ? t('eventDetails.categoryData.skillLevelBeginner') : t('eventDetails.categoryData.levelAdvanced')}
<strong>{t('eventDetails.categoryData.equipment')}:</strong>
<strong>{t('eventDetails.categoryData.photoRoute')}:</strong>
```

7. **Quest** (line 624):
```javascript
<strong>{t('eventDetails.categoryData.theme')}:</strong>
<strong>{t('eventDetails.categoryData.questDifficulty')}:</strong> {event.category_data.difficulty === 'easy' ? t('eventDetails.categoryData.questEasy') : event.category_data.difficulty === 'medium' ? t('eventDetails.categoryData.questMedium') : t('eventDetails.categoryData.questHardcore')}
<strong>{t('eventDetails.categoryData.age')}:</strong> {event.category_data.age_restriction}{t('eventDetails.categoryData.agePlus')}
```

8. **Dance** (line 637):
```javascript
<strong>{t('eventDetails.categoryData.style')}:</strong>
<strong>{t('eventDetails.categoryData.level')}:</strong> {event.category_data.skill_level === 'beginner' ? t('eventDetails.categoryData.levelBeginner') : event.category_data.skill_level === 'intermediate' ? t('eventDetails.categoryData.levelIntermediate') : t('eventDetails.categoryData.levelAdvanced')}
<strong>{t('eventDetails.categoryData.partnerType')}:</strong> {event.category_data.partner_type === 'partner' ? t('eventDetails.categoryData.partnerTypePartner') : t('eventDetails.categoryData.partnerTypeSolo')}
<strong>{t('eventDetails.categoryData.dressCode')}:</strong>
```

9. **Tour** (line 681):
```javascript
<strong>{t('eventDetails.categoryData.tourTheme')}:</strong> {event.category_data.theme === 'historical' ? t('eventDetails.categoryData.tourHistorical') : event.category_data.theme === 'gastronomic' ? t('eventDetails.categoryData.tourGastronomic') : t('eventDetails.categoryData.tourStreetArt')}
<strong>{t('eventDetails.categoryData.durationHours')}:</strong> {event.category_data.duration_hours} {t('eventDetails.categoryData.hours')}
<strong>{t('eventDetails.categoryData.pace')}:</strong> {event.category_data.pace === 'slow' ? t('eventDetails.categoryData.paceSlow') : t('eventDetails.categoryData.paceActive')}
<strong>{t('eventDetails.categoryData.accessibility')}:</strong>
```

10. **Volunteer** (line 697):
```javascript
<strong>{t('eventDetails.categoryData.activityType')}:</strong>
<strong>{t('eventDetails.categoryData.skills')}:</strong>
<strong>{t('eventDetails.categoryData.minAge')}:</strong> {event.category_data.age_min}{t('eventDetails.categoryData.agePlus')}
<strong>{t('eventDetails.categoryData.equipment')}:</strong>
```

11. **Fitness** (line 713):
```javascript
<strong>{t('eventDetails.categoryData.workoutType')}:</strong>
<strong>{t('eventDetails.categoryData.fitnessLevel')}:</strong> {event.category_data.fitness_level === 'beginner' ? t('eventDetails.categoryData.fitnessLevelBeginner') : t('eventDetails.categoryData.fitnessLevelAdvanced')}
<strong>{t('eventDetails.categoryData.durationMinutes')}:</strong> {event.category_data.duration_minutes} {t('eventDetails.categoryData.minutes')}
<strong>{t('eventDetails.categoryData.equipment')}:</strong>
```

12. **Theater** (line 729):
```javascript
<strong>{t('eventDetails.categoryData.theaterGenre')}:</strong>
<strong>{t('eventDetails.categoryData.ageRating')}:</strong>
<strong>{t('eventDetails.categoryData.durationMinutes')}:</strong> {event.category_data.duration_minutes} {t('eventDetails.categoryData.minutes')}
<strong>{t('eventDetails.categoryData.hasIntermission')}:</strong> {t('eventDetails.categoryData.hasIntermissionYes')}
```

13. **Auto Tour** (line 745):
```javascript
<strong>{t('eventDetails.categoryData.routeType')}:</strong> {event.category_data.route_type === 'city' ? t('eventDetails.categoryData.routeTypeCity') : t('eventDetails.categoryData.routeTypeOffroad')}
<strong>{t('eventDetails.categoryData.drivingDifficulty')}:</strong> {event.category_data.driving_difficulty === 'easy' ? t('eventDetails.categoryData.drivingEasy') : t('eventDetails.categoryData.drivingHard')}
<strong>{t('eventDetails.categoryData.requiredEquipment')}:</strong>
<strong>{t('eventDetails.categoryData.carCapacity')}:</strong> {event.category_data.car_capacity} {t('eventDetails.categoryData.carCapacityPeople')}
```

14. **Craft** (line 761):
```javascript
<strong>{t('eventDetails.categoryData.craftType')}:</strong>
<strong>{t('eventDetails.categoryData.materials')}:</strong>
<strong>{t('eventDetails.categoryData.level')}:</strong> {event.category_data.skill_level === 'beginner' ? t('eventDetails.categoryData.levelBeginner') : event.category_data.skill_level === 'intermediate' ? t('eventDetails.categoryData.levelIntermediate') : t('eventDetails.categoryData.levelAdvanced')}
<strong>{t('eventDetails.categoryData.finalProduct')}:</strong>
```

15. **Concert** (line 777):
```javascript
<strong>{t('eventDetails.categoryData.genre')}:</strong>
<strong>{t('eventDetails.categoryData.performer')}:</strong>
<strong>{t('eventDetails.categoryData.ageRestriction')}:</strong>
```

16. **Sports** (line 790):
```javascript
<strong>{t('eventDetails.categoryData.sportType')}:</strong>
<strong>{t('eventDetails.categoryData.sportLevel')}:</strong> {event.category_data.level === 'amateur' ? t('eventDetails.categoryData.sportLevelAmateur') : t('eventDetails.categoryData.sportLevelProfessional')}
```

17. **Eco Tour** (line 800):
```javascript
<strong>{t('eventDetails.categoryData.tourType')}:</strong>
<strong>{t('eventDetails.categoryData.equipment')}:</strong>
```

### Calendar Actions Section (lines 813-831)
```javascript
<h3>{t('eventDetails.addToCalendar')}</h3>
<button
  title={t('eventDetails.downloadICSTitle')}
>
  📅 {t('eventDetails.downloadICS')}
</button>
<button
  title={t('eventDetails.googleCalendarTitle')}
>
  📆 {t('eventDetails.googleCalendar')}
</button>
```

### Cancel Button (lines 834-842)
```javascript
❌ {t('eventDetails.cancelEvent')}
```

### Join/Leave Buttons (lines 856-873)
```javascript
{joining ? t('eventDetails.leaving') : t('eventDetails.leaveEvent')}
{joining ? t('eventDetails.joining') : isFull ? t('eventDetails.eventFull') : t('eventDetails.joinEvent')}
```

### Cancel Dialog (lines 884-920)
```javascript
<h2>{t('eventDetails.cancelEventTitle')}</h2>
<p>{t('eventDetails.cancelEventConfirm')}</p>
<label htmlFor="cancellation-reason">
  {t('eventDetails.cancellationReason')} <span className="required">*</span>
</label>
<textarea
  placeholder={t('eventDetails.cancellationReasonPlaceholder')}
/>
{t('common.cancel')}
{cancelling ? t('eventDetails.cancelling') : t('eventDetails.confirmCancel')}
```

## Notes
- All translation keys are defined in both `ru/common.json` and `en/common.json`
- The `getCategoryName` function already handles translation when `t` is passed
- Conditional translations use ternary operators for enum values like difficulty, skill level, etc.

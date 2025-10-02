# Руководство по новым категориям событий

## Обзор

В систему добавлено 17 новых категорий событий со специализированными справочниками и атрибутами.

## Список категорий

### 1. Йога-сессии (`yoga`)
**Справочники:**
- `yoga_practice_types` - типы практики (хатха, виньяса, релаксация и др.)

**Атрибуты в `category_data`:**
```json
{
  "difficulty": "beginner|intermediate|advanced",
  "practice_type_id": "uuid",
  "equipment_needed": ["коврик", "блоки", "ремни"]
}
```

### 2. Кулинарные мастер-классы (`cooking`)
**Справочники:**
- `cuisine_types` - типы кухни (итальянская, азиатская и др.)

**Атрибуты:**
```json
{
  "cuisine_type_id": "uuid",
  "skill_level": "beginner|experienced"
}
```

### 3. Музыкальные джемы (`music_jam`)
**Справочники:**
- `music_genres` - жанры музыки
- `musical_instruments` - инструменты (связь M2M через `event_musical_instruments`)

**Атрибуты:**
```json
{
  "genre_id": "uuid",
  "performer_level": "amateur|professional"
}
```

### 4. Образовательные семинары (`seminar`)
**Справочники:**
- `seminar_topics` - темы семинаров

**Атрибуты:**
```json
{
  "topic_id": "uuid",
  "format": "lecture|workshop|discussion",
  "knowledge_level": "basic|advanced",
  "materials_needed": ["блокнот", "ноутбук"]
}
```

### 5. Пикники в парке (`picnic`)
**Справочники:**
- `picnic_types` - типы пикников (семейный, романтический и др.)

**Атрибуты:**
```json
{
  "picnic_type_id": "uuid",
  "weather_dependent": "covered|outdoor"
}
```

### 6. Фотопрогулки (`photo_walk`)
**Справочники:**
- `photography_themes` - тематики съёмки
- `photography_equipment` - оборудование (связь M2M через `event_photography_equipment`)

**Атрибуты:**
```json
{
  "theme_id": "uuid",
  "skill_level": "beginner|advanced",
  "route": "описание маршрута"
}
```

### 7. Квесты (`quest`)
**Справочники:**
- `quest_themes` - тематики квестов

**Атрибуты:**
```json
{
  "theme_id": "uuid",
  "difficulty": "easy|medium|hardcore",
  "age_restriction": 12
}
```

### 8. Танцевальные уроки (`dance`)
**Справочники:**
- `dance_styles` - стили танцев

**Атрибуты:**
```json
{
  "style_id": "uuid",
  "skill_level": "beginner|intermediate|advanced",
  "partner_type": "partner|solo",
  "dress_code": "описание одежды"
}
```

### 9. Городские экскурсии (`tour`)
**Атрибуты:**
```json
{
  "theme": "historical|gastronomic|street_art",
  "duration_hours": 2.5,
  "pace": "slow|active",
  "accessibility": ["wheelchair_friendly", "with_breaks"]
}
```

### 10. Волонтёрские акции (`volunteer`)
**Справочники:**
- `volunteer_activity_types` - типы деятельности
- `volunteer_skills` - требуемые навыки (связь M2M через `event_volunteer_skills`)

**Атрибуты:**
```json
{
  "activity_type_id": "uuid",
  "age_min": 16,
  "equipment_needed": ["перчатки", "мешки"]
}
```

### 11. Фитнес-тренировки (`fitness`)
**Справочники:**
- `fitness_workout_types` - типы тренировок

**Атрибуты:**
```json
{
  "workout_type_id": "uuid",
  "fitness_level": "beginner|advanced",
  "duration_minutes": 60,
  "equipment_needed": ["гантели", "коврик"]
}
```

### 12. Театральные постановки (`theater`)
**Справочники:**
- `theater_genres` - жанры

**Атрибуты:**
```json
{
  "genre_id": "uuid",
  "age_rating": "6+",
  "duration_minutes": 120,
  "has_intermission": true
}
```

### 13. Авто-туры (`auto_tour`)
**Атрибуты:**
```json
{
  "route_type": "city|offroad",
  "driving_difficulty": "easy|hard",
  "required_equipment": ["GPS", "аптечка"],
  "car_capacity": 4
}
```

### 14. Ремесленные мастер-классы (`craft`)
**Справочники:**
- `craft_types` - типы ремесла
- `craft_materials` - материалы (связь M2M через `event_craft_materials`)

**Атрибуты:**
```json
{
  "craft_type_id": "uuid",
  "skill_level": "beginner|intermediate|advanced",
  "final_product": "описание результата"
}
```

### 15. Концерты (`concert`)
**Справочники:**
- `music_genres` - жанры музыки

**Атрибуты:**
```json
{
  "genre_id": "uuid",
  "performer": "название исполнителя",
  "age_restriction": "16+"
}
```

### 16. Спортивные матчи (`sports`)
**Справочники:**
- `sports_types` - виды спорта

**Атрибуты:**
```json
{
  "sport_type_id": "uuid",
  "level": "amateur|professional"
}
```

### 17. Экологические туры (`eco_tour`)
**Справочники:**
- `eco_tour_types` - типы туров

**Атрибуты:**
```json
{
  "tour_type_id": "uuid",
  "equipment_needed": ["бинокль", "фонарик"]
}
```

## Использование DictionarySelector

Универсальный компонент для работы со справочниками:

```jsx
import DictionarySelector from '../components/DictionarySelector';

// Одиночный выбор
<DictionarySelector
  tableName="yoga_practice_types"
  selectedItems={selectedPracticeType}
  onChange={setSelectedPracticeType}
  label="Тип практики"
  multiple={false}
  placeholder="Выберите тип практики"
/>

// Множественный выбор
<DictionarySelector
  tableName="musical_instruments"
  selectedItems={selectedInstruments}
  onChange={setSelectedInstruments}
  label="Инструменты"
  multiple={true}
  placeholder="Начните вводить название"
/>
```

## Применение миграции

1. Откройте Supabase Dashboard → SQL Editor
2. Скопируйте содержимое `database/migrations/add_new_categories.sql`
3. Выполните SQL
4. Проверьте создание таблиц и данных

## Обновление кода

После применения миграции нужно обновить:

1. **CreateEvent.jsx** - добавить формы для новых категорий
2. **EventDetails.jsx** - добавить отображение атрибутов
3. **Home.jsx** - добавить карточки новых категорий
4. **CategoryFilters.jsx** - добавить фильтры
5. **useEvents.js** - добавить логику фильтрации

## Структура данных

### Одиночные справочники
Хранятся в `category_data` как `{field}_id`:
```json
{
  "yoga_practice_type_id": "uuid-value",
  "difficulty": "beginner"
}
```

### Множественные справочники
Хранятся в отдельных таблицах M2M:
- `event_musical_instruments`
- `event_volunteer_skills`
- `event_craft_materials`
- `event_photography_equipment`

## Иконки для категорий

```
yoga: 🧘
cooking: 👨‍🍳
music_jam: 🎸
seminar: 📚
picnic: 🧺
photo_walk: 📷
quest: 🗝️
dance: 💃
tour: 🚶
volunteer: 🤝
fitness: 💪
theater: 🎭
auto_tour: 🚗
craft: ✂️
concert: 🎤
sports: ⚽
eco_tour: 🌿
```

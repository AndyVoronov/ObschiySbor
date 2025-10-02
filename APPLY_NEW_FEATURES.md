# Применение новых функций - ObschiySbor

## 📋 Что было добавлено

### 1. **Фото профиля пользователя** 👤
- Компонент `AvatarUpload` для загрузки аватаров
- Хранение в Supabase Storage bucket `avatars`
- Валидация формата (JPG, PNG, WEBP) и размера (до 2MB)
- Отображение в профиле пользователя

### 2. **Справочник настольных игр** 🎲
- Таблица `board_games` с полной информацией об играх
- Компонент `BoardGameSelector` для выбора игр
- Связь M2M через таблицу `event_board_games`
- Поиск игр с автозаполнением

### 3. **Пол пользователя** ⚧️
- Поле `gender` в профиле (male/female/other)
- Выбор пола при редактировании профиля
- Отображение в профиле

### 4. **Фильтр по полу участников** 🚻
- Поле `gender_filter` в событиях (male/female/all)
- Возможность создавать мероприятия только для мужчин или только для женщин
- По умолчанию "для всех"

---

## 🚀 Инструкция по применению

### Шаг 1: Применение SQL миграции

1. Откройте Supabase Dashboard: https://supabase.com/dashboard/project/wrfcpsljchyetbmupqgc

2. Перейдите в **SQL Editor**

3. Откройте файл `database/migrations/add_gender_and_board_games.sql`

4. Скопируйте весь SQL код и вставьте в SQL Editor

5. Нажмите **Run** для выполнения миграции

### Шаг 2: Создание Storage Bucket для аватаров

1. Перейдите в **Storage** в Supabase Dashboard

2. Нажмите **New Bucket**

3. Укажите:
   - Name: `avatars`
   - Public bucket: **YES** ✅
   - File size limit: 2MB
   - Allowed MIME types: `image/jpeg, image/png, image/webp`

4. Нажмите **Create bucket**

### Шаг 3: Настройка RLS политик для Storage

В SQL Editor выполните:

```sql
-- Политика для загрузки аватаров
CREATE POLICY "Пользователи могут загружать свои аватары"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Политика для обновления аватаров
CREATE POLICY "Пользователи могут обновлять свои аватары"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Политика для удаления аватаров
CREATE POLICY "Пользователи могут удалять свои аватары"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Политика для просмотра аватаров (все могут видеть)
CREATE POLICY "Все могут просматривать аватары"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');
```

### Шаг 4: Проверка миграции

Выполните в SQL Editor:

```sql
-- Проверка новых полей
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name IN ('gender');

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'events' AND column_name IN ('gender_filter');

-- Проверка таблицы настольных игр
SELECT * FROM board_games LIMIT 5;

-- Проверка связующей таблицы
SELECT table_name FROM information_schema.tables
WHERE table_name = 'event_board_games';
```

### Шаг 5: Запуск приложения

```bash
cd frontend
npm install  # На случай если нужны новые зависимости
npm run dev
```

---

## 🧪 Тестирование новых функций

### 1. Тест загрузки аватара

1. Перейдите в **Профиль**
2. Нажмите **Редактировать**
3. Нажмите **Загрузить фото** или перетащите изображение
4. Проверьте что аватар отобразился
5. Сохраните профиль
6. Обновите страницу - аватар должен сохраниться

### 2. Тест выбора пола

1. В режиме редактирования профиля
2. Выберите пол из выпадающего списка
3. Сохраните
4. Проверьте что пол отображается с иконкой (👨/👩/⚧️)

### 3. Тест создания события с настольными играми

1. Перейдите в **Создать событие**
2. Выберите категорию "Настольные игры"
3. В поле "Настольные игры" начните вводить название (например, "Каркассон")
4. Выберите игру из списка
5. Добавьте несколько игр
6. Удалите одну игру (кнопка ✕)
7. Создайте событие
8. Проверьте что игры отображаются на странице события

### 4. Тест фильтра по полу

1. При создании события
2. В поле "Кто может участвовать" выберите:
   - "Все" - любой может присоединиться
   - "Только мужчины" - только пользователи с полом "мужской"
   - "Только женщины" - только пользователи с полом "женский"
3. Создайте событие
4. Попробуйте присоединиться пользователем другого пола

---

## 📂 Созданные файлы

### Компоненты
- `frontend/src/components/AvatarUpload.jsx` - Загрузка аватара
- `frontend/src/components/AvatarUpload.css` - Стили аватара
- `frontend/src/components/BoardGameSelector.jsx` - Выбор настольных игр
- `frontend/src/components/BoardGameSelector.css` - Стили селектора игр

### Миграции
- `database/migrations/add_gender_and_board_games.sql` - SQL миграция

### Обновлённые файлы
- `frontend/src/pages/Profile.jsx` - Добавлен выбор пола и загрузка аватара
- `frontend/src/pages/Profile.css` - Стили для аватара
- `frontend/src/pages/CreateEvent.jsx` - Добавлен выбор игр и фильтр по полу

---

## 🔧 Следующие шаги

### TODO: Обновить EventDetails.jsx

Нужно добавить отображение:
1. **Настольных игр** из справочника с деталями
2. **Фильтра по полу** ("Только для мужчин" / "Только для женщин" / "Для всех")
3. **Проверку пола** при попытке присоединения к событию

### TODO: Добавить логику проверки пола

В `EventDetails.jsx` при присоединении проверять:
```javascript
// Проверка фильтра по полу
if (event.gender_filter !== 'all') {
  const { data: profile } = await supabase
    .from('profiles')
    .select('gender')
    .eq('id', user.id)
    .single();

  if (event.gender_filter !== profile.gender) {
    alert('Это событие не для вашего пола');
    return;
  }
}
```

---

## 📊 Структура базы данных

### Таблица `board_games`
```sql
id               UUID PRIMARY KEY
name             VARCHAR(255)    -- Название игры
description      TEXT            -- Описание
min_players      INTEGER         -- Минимум игроков
max_players      INTEGER         -- Максимум игроков
avg_playtime_minutes INTEGER     -- Среднее время партии
image_url        TEXT            -- URL изображения
created_at       TIMESTAMP
updated_at       TIMESTAMP
```

### Таблица `event_board_games` (M2M)
```sql
id               UUID PRIMARY KEY
event_id         UUID REFERENCES events(id)
board_game_id    UUID REFERENCES board_games(id)
created_at       TIMESTAMP
```

### Обновлённые поля

**profiles:**
- `gender` - VARCHAR(10): 'male', 'female', 'other'

**events:**
- `gender_filter` - VARCHAR(10): 'male', 'female', 'all' (default: 'all')

---

## ✅ Чек-лист завершения

- [x] SQL миграция создана
- [x] Компонент загрузки аватара создан
- [x] Компонент выбора настольных игр создан
- [x] Profile.jsx обновлён
- [x] CreateEvent.jsx обновлён
- [ ] Применить SQL миграцию в Supabase
- [ ] Создать Storage bucket "avatars"
- [ ] Настроить RLS для Storage
- [ ] Обновить EventDetails.jsx
- [ ] Добавить проверку пола при присоединении
- [ ] Протестировать все функции

---

## 🎉 Готово к использованию!

После выполнения всех шагов новые функции будут полностью работоспособны:
- Пользователи смогут загружать аватары
- Организаторы смогут выбирать настольные игры из справочника
- Можно создавать события с фильтром по полу участников

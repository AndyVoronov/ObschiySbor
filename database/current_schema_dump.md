# Структура базы данных Supabase - ObschiySbor

**Дата обновления:** 2025-11-05

## Таблицы (всего 49)

### Основные таблицы:
- `profiles` - профили пользователей
- `events` - события
- `event_participants` - участники событий
- `chat_rooms` - чат-комнаты
- `chat_messages` - сообщения чатов
- `reviews` - отзывы
- `reports` - жалобы
- `friendships` - дружба
- `referrals` - реферальная программа
- `promo_codes` - промокоды
- `user_achievements` - достижения пользователей
- `experience_log` - лог опыта

### Справочники:
- `board_games`, `music_genres`, `sports_types`, `dance_styles`, `yoga_practice_types`
- `craft_types`, `craft_materials`, `cuisine_types`, `photography_equipment`
- `volunteer_skills`, `volunteer_activity_types`, `fitness_workout_types`
- `theater_genres`, `seminar_topics`, `quest_themes`, `picnic_types`
- `eco_tour_types`, `musical_instruments`, `photography_themes`

### Системные таблицы:
- `account_merge_requests` - запросы на слияние аккаунтов
- `user_blocks` - блокировки пользователей
- `block_appeals` - апелляции блокировок
- `notifications` - уведомления
- `levels` - уровни геймификации
- `achievements` - достижения
- `referral_rewards` - награды за рефералов

### View таблицы:
- `account_merge_stats` - статистика слияний
- `promo_code_stats` - статистика промокодов

## Функции (всего 43)

### Основные функции:
- `handle_new_user` - создание профиля при регистрации
- `create_chat_room_for_event` - создание чата для события
- `update_event_lifecycle_status` - обновление статусов событий
- `check_and_unlock_achievement` - проверка достижений
- `add_experience_points` - добавление опыта
- `block_user` / `unblock_user` - блокировка пользователей
- `merge_user_accounts` - слияние аккаунтов

### Геймификация:
- `on_event_created_gamification` - опыт за создание события
- `on_event_participation_gamification` - опыт за участие
- `on_review_created_gamification` - опыт за отзывы
- `check_level_achievements` - проверка уровней

### Реферальная программа:
- `generate_referral_code` - генерация реферального кода
- `apply_referral_code` - применение реферального кода
- `on_profile_created_generate_referral_code` - код при создании профиля

### Промокоды:
- `validate_promo_code` - валидация промокода
- `apply_promo_code` - применение промокода
- `deactivate_expired_promo_codes` - деактивация просроченных

## Триггеры (автоматически выполняемые функции)

### Профили:
- `handle_new_user` - при создании auth.users
- `on_profile_created_generate_referral_code` - при создании профиля

### События:
- `on_event_created` - при создании события
- `create_chat_room_for_event` - создание чата
- `update_event_lifecycle_status` - обновление статусов

### Участники:
- `increment_participants` / `decrement_participants` - изменение количества
- `on_event_participation_gamification` - геймификация

## RLS политики (Row Level Security)

### Профили:
- `SELECT` - все могут просматривать
- `UPDATE` - только свои профили
- `INSERT` - только свой профиль

### События:
- `SELECT` - все могут просматривать
- `INSERT/UPDATE/DELETE` - только создатель

### Чаты:
- Доступ только участникам события и организатору

## Проблема с профилями

**Текущая проблема:** Пользователь с ID `239c2372-7429-4c2c-acf7-440ff336e0e4` существует в auth.users, но отсутствует в таблице profiles.

**Причина:** Вероятно, триггер `handle_new_user` не сработал при регистрации пользователя.

**Решение:** Создать недостающий профиль вручную и убедиться, что триггер работает корректно.
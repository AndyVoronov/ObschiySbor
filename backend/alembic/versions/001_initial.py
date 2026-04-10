"""Initial schema - all tables

Revision ID: 001_initial
Revises: None
Create Date: 2025-01-01
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Extensions
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')

    # Profiles
    op.create_table('profiles',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('full_name', sa.Text(), default=''),
        sa.Column('role', sa.String(20), nullable=False, server_default='user'),
        sa.Column('avatar_url', sa.Text()),
        sa.Column('city', sa.Text()),
        sa.Column('interests', sa.Text()),
        sa.Column('gender', sa.String(10)),
        sa.Column('bio', sa.Text()),
        sa.Column('telegram_id', sa.BigInteger(), unique=True),
        sa.Column('telegram_username', sa.String(100)),
        sa.Column('telegram_password', sa.Text()),
        sa.Column('vk_id', sa.String(50), unique=True),
        sa.Column('xp', sa.Integer(), server_default='0'),
        sa.Column('level', sa.Integer(), server_default='1'),
        sa.Column('referral_code', sa.String(20), unique=True),
        sa.Column('referred_by', UUID(as_uuid=True), sa.ForeignKey('profiles.id')),
        sa.Column('email', sa.String(255), unique=True),
        sa.Column('password_hash', sa.Text()),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
    )

    # Events
    op.create_table('events',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('title', sa.Text(), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('category', sa.Text(), nullable=False),
        sa.Column('event_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_date', sa.DateTime(timezone=True)),
        sa.Column('location', sa.Text(), nullable=False),
        sa.Column('latitude', sa.Float()),
        sa.Column('longitude', sa.Float()),
        sa.Column('event_type', sa.String(20), server_default='offline'),
        sa.Column('online_platform', sa.Text()),
        sa.Column('online_link', sa.Text()),
        sa.Column('max_participants', sa.Integer(), nullable=False, server_default='10'),
        sa.Column('current_participants', sa.Integer(), server_default='0'),
        sa.Column('price', sa.Float(), server_default='0'),
        sa.Column('lifecycle_status', sa.String(20), server_default='upcoming'),
        sa.Column('status', sa.String(20), server_default='active'),
        sa.Column('image_url', sa.Text()),
        sa.Column('category_data', JSONB()),
        sa.Column('creator_id', UUID(as_uuid=True), sa.ForeignKey('profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('age_restriction', sa.String(20)),
        sa.Column('is_recurring', sa.Boolean(), server_default='false'),
        sa.Column('recurring_pattern', JSONB()),
        sa.Column('parent_event_id', UUID(as_uuid=True), sa.ForeignKey('events.id', ondelete='SET NULL')),
        sa.Column('series_id', UUID(as_uuid=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
    )
    op.create_index('idx_events_category', 'events', ['category'])
    op.create_index('idx_events_event_date', 'events', ['event_date'])
    op.create_index('idx_events_creator_id', 'events', ['creator_id'])
    op.create_index('idx_events_lifecycle_status', 'events', ['lifecycle_status'])
    op.create_index('idx_events_status', 'events', ['status'])

    # Event Participants
    op.create_table('event_participants',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('event_id', UUID(as_uuid=True), sa.ForeignKey('events.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='joined'),
        sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
        sa.UniqueConstraint('event_id', 'user_id', name='uq_event_participant'),
    )
    op.create_index('idx_ep_event_id', 'event_participants', ['event_id'])
    op.create_index('idx_ep_user_id', 'event_participants', ['user_id'])

    # Reviews
    op.create_table('reviews',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('event_id', UUID(as_uuid=True), sa.ForeignKey('events.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('rating', sa.Integer(), nullable=False),
        sa.Column('comment', sa.Text()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
        sa.UniqueConstraint('event_id', 'user_id', name='uq_review'),
        sa.CheckConstraint('rating >= 1 AND rating <= 5', name='ck_rating_range'),
    )

    # Chat Rooms
    op.create_table('chat_rooms',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('event_id', UUID(as_uuid=True), sa.ForeignKey('events.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
    )

    # Chat Messages
    op.create_table('chat_messages',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('room_id', UUID(as_uuid=True), sa.ForeignKey('chat_rooms.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
    )
    op.create_index('idx_cm_room_id', 'chat_messages', ['room_id'])
    op.create_index('idx_cm_created_at', 'chat_messages', ['created_at'])

    # Notifications
    op.create_table('notifications',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('event_id', UUID(as_uuid=True), sa.ForeignKey('events.id', ondelete='SET NULL')),
        sa.Column('type', sa.Text(), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
    )
    op.create_index('idx_notif_user_id', 'notifications', ['user_id'])
    op.create_index('idx_notif_is_read', 'notifications', ['is_read'])

    # Event Invitations
    op.create_table('event_invitations',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('event_id', UUID(as_uuid=True), sa.ForeignKey('events.id', ondelete='CASCADE'), nullable=False),
        sa.Column('inviter_id', UUID(as_uuid=True), sa.ForeignKey('profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('invited_user_id', UUID(as_uuid=True), sa.ForeignKey('profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('status', sa.String(20), server_default='pending'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
        sa.UniqueConstraint('event_id', 'invited_user_id', name='uq_invitation'),
    )

    # Friendships
    op.create_table('friendships',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('friend_id', UUID(as_uuid=True), sa.ForeignKey('profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('status', sa.String(20), server_default='pending'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
        sa.UniqueConstraint('user_id', 'friend_id', name='uq_friendship'),
    )
    op.create_index('idx_fs_user_id', 'friendships', ['user_id'])
    op.create_index('idx_fs_friend_id', 'friendships', ['friend_id'])

    # Gamification
    op.create_table('levels',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(50), nullable=False),
        sa.Column('min_xp', sa.Integer(), nullable=False),
        sa.Column('badge_icon', sa.String(10)),
    )
    op.create_table('achievements',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('icon', sa.String(10)),
        sa.Column('condition_type', sa.String(50), nullable=False),
        sa.Column('target_value', sa.Integer(), nullable=False),
        sa.Column('xp_reward', sa.Integer(), server_default='0'),
    )
    op.create_table('user_achievements',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('achievement_id', UUID(as_uuid=True), sa.ForeignKey('achievements.id', ondelete='CASCADE'), nullable=False),
        sa.Column('unlocked_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
        sa.UniqueConstraint('user_id', 'achievement_id', name='uq_user_achievement'),
    )
    op.create_table('experience_log',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('xp_amount', sa.Integer(), nullable=False),
        sa.Column('reason', sa.String(100), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
    )

    # Moderation
    op.create_table('reports',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('event_id', UUID(as_uuid=True), sa.ForeignKey('events.id', ondelete='CASCADE')),
        sa.Column('reporter_id', UUID(as_uuid=True), sa.ForeignKey('profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('status', sa.String(20), server_default='pending'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
        sa.Column('resolved_at', sa.DateTime(timezone=True)),
        sa.Column('resolved_by', UUID(as_uuid=True), sa.ForeignKey('profiles.id')),
    )
    op.create_index('idx_reports_status', 'reports', ['status'])

    op.create_table('user_blocks',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('blocker_id', UUID(as_uuid=True), sa.ForeignKey('profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('blocked_id', UUID(as_uuid=True), sa.ForeignKey('profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('reason', sa.Text()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.UniqueConstraint('blocker_id', 'blocked_id', name='uq_user_block'),
    )
    op.create_table('block_appeals',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('block_id', UUID(as_uuid=True), sa.ForeignKey('user_blocks.id', ondelete='CASCADE'), nullable=False),
        sa.Column('appellant_id', UUID(as_uuid=True), sa.ForeignKey('profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('status', sa.String(20), server_default='pending'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
    )

    # Promo codes
    op.create_table('promo_codes',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('code', sa.String(50), unique=True, nullable=False),
        sa.Column('discount_type', sa.String(20), nullable=False),
        sa.Column('discount_value', sa.Float(), server_default='0'),
        sa.Column('categories', JSONB()),
        sa.Column('min_price', sa.Float(), server_default='0'),
        sa.Column('max_uses', sa.Integer()),
        sa.Column('current_uses', sa.Integer(), server_default='0'),
        sa.Column('max_uses_per_user', sa.Integer(), server_default='1'),
        sa.Column('valid_from', sa.DateTime(timezone=True)),
        sa.Column('valid_until', sa.DateTime(timezone=True)),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('created_by', UUID(as_uuid=True), sa.ForeignKey('profiles.id')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
    )
    op.create_table('promo_code_usages',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('promo_code_id', UUID(as_uuid=True), sa.ForeignKey('promo_codes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('event_id', UUID(as_uuid=True), sa.ForeignKey('events.id', ondelete='CASCADE')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
        sa.UniqueConstraint('promo_code_id', 'user_id', 'event_id', name='uq_promo_usage'),
    )

    # Commission
    op.create_table('service_commission_settings',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('base_commission_percent', sa.Float(), server_default='10.0'),
        sa.Column('categories', JSONB()),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
    )
    op.create_table('commission_discount_periods',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('discount_percent', sa.Float(), server_default='0'),
        sa.Column('categories', JSONB()),
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
    )

    # Account merge
    op.create_table('account_merge_requests',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('source_user_id', UUID(as_uuid=True), sa.ForeignKey('profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('target_user_id', UUID(as_uuid=True), sa.ForeignKey('profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('status', sa.String(20), server_default='pending'),
        sa.Column('merged_by', UUID(as_uuid=True), sa.ForeignKey('profiles.id')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
        sa.Column('merged_at', sa.DateTime(timezone=True)),
    )

    # Board games
    op.create_table('board_games',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('min_players', sa.Integer()),
        sa.Column('max_players', sa.Integer()),
        sa.Column('play_time_min', sa.Integer()),
        sa.Column('complexity', sa.Float()),
        sa.Column('image_url', sa.Text()),
        sa.Column('category', sa.String(100)),
    )
    op.create_table('event_board_games',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('event_id', UUID(as_uuid=True), sa.ForeignKey('events.id', ondelete='CASCADE'), nullable=False),
        sa.Column('board_game_id', UUID(as_uuid=True), sa.ForeignKey('board_games.id', ondelete='CASCADE'), nullable=False),
        sa.UniqueConstraint('event_id', 'board_game_id', name='uq_event_board_game'),
    )

    # Dictionary tables
    dict_tables = [
        "yoga_practice_types", "cuisine_types", "music_genres", "seminar_topics",
        "picnic_types", "photography_themes", "quest_themes", "dance_styles",
        "volunteer_activity_types", "fitness_workout_types", "theater_genres",
        "craft_types", "sports_types", "eco_tour_types",
    ]
    for table in dict_tables:
        op.create_table(table,
            sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
            sa.Column('name', sa.String(200), nullable=False),
        )

    # Seed levels
    levels_data = [
        (1, 'Новичок', 0, '🌱'),
        (2, 'Любитель', 100, '🌿'),
        (3, 'Энтузиаст', 300, '🌳'),
        (4, 'Эксперт', 600, '⭐'),
        (5, 'Мастер', 1000, '🏆'),
        (6, 'Легенда', 2000, '👑'),
        (7, 'Миф', 5000, '🌟'),
    ]
    op.execute("INSERT INTO levels (id, name, min_xp, badge_icon) VALUES " +
               ",".join(f"({l[0]}, '{l[1]}', {l[2]}, '{l[3]}')" for l in levels_data))

    # Seed achievements
    achievements_data = [
        ("Первое событие", "Создайте своё первое событие", "🎯", "events_created", 1, 20),
        ("Пять событий", "Создайте 5 событий", "🎪", "events_created", 5, 50),
        ("Десять событий", "Создайте 10 событий", "🎊", "events_created", 10, 100),
        ("Первое участие", "Участвуйте в первом событии", "🤝", "events_joined", 1, 10),
        ("Пять участие", "Участвуйте в 5 событиях", "🌟", "events_joined", 5, 30),
        ("Двадцать участие", "Участвуйте в 20 событиях", "🏅", "events_joined", 20, 80),
        ("Первый отзыв", "Оставьте первый отзыв", "✍️", "reviews_written", 1, 5),
        ("Пять отзывов", "Оставьте 5 отзывов", "📝", "reviews_written", 5, 25),
        ("Первый друг", "Добавьте первого друга", "👋", "friends_count", 1, 10),
        ("Десять друзей", "Добавьте 10 друзей", "👥", "friends_count", 10, 50),
        ("100 XP", "Наберите 100 XP", "💯", "xp_total", 100, 0),
        ("500 XP", "Наберите 500 XP", "🔥", "xp_total", 500, 0),
        ("1000 XP", "Наберите 1000 XP", "⚡", "xp_total", 1000, 0),
        ("5000 XP", "Наберите 5000 XP", "🌈", "xp_total", 5000, 0),
    ]
    for name, desc, icon, cond, target, xp in achievements_data:
        op.execute(f"""INSERT INTO achievements (name, description, icon, condition_type, target_value, xp_reward)
                      VALUES ('{name}', '{desc}', '{icon}', '{cond}', {target}, {xp})""")


def downgrade() -> None:
    dict_tables = [
        "eco_tour_types", "sports_types", "craft_types", "theater_genres",
        "fitness_workout_types", "volunteer_activity_types", "dance_styles",
        "quest_themes", "photography_themes", "picnic_types", "seminar_topics",
        "music_genres", "cuisine_types", "yoga_practice_types",
    ]
    for t in reversed(dict_tables):
        op.drop_table(t)

    tables = [
        "event_board_games", "board_games", "account_merge_requests",
        "commission_discount_periods", "service_commission_settings",
        "promo_code_usages", "promo_codes",
        "block_appeals", "user_blocks", "reports",
        "experience_log", "user_achievements", "achievements", "levels",
        "friendships", "event_invitations", "notifications",
        "chat_messages", "chat_rooms", "reviews", "event_participants",
        "events", "profiles",
    ]
    for t in tables:
        op.drop_table(t)

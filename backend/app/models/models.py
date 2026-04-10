import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, DateTime, ForeignKey,
    CheckConstraint, UniqueConstraint, Index, Enum as SAEnum, JSON, BigInteger
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(Text, default="")
    role = Column(String(20), nullable=False, default="user")
    avatar_url = Column(Text, nullable=True)
    city = Column(Text, nullable=True)
    interests = Column(Text, nullable=True)
    gender = Column(String(10), nullable=True)
    bio = Column(Text, nullable=True)
    telegram_id = Column(BigInteger, unique=True, nullable=True)
    telegram_username = Column(String(100), nullable=True)
    telegram_password = Column(Text, nullable=True)
    vk_id = Column(String(50), unique=True, nullable=True)
    xp = Column(Integer, default=0)
    level = Column(Integer, default=1)
    referral_code = Column(String(20), unique=True, nullable=True)
    referred_by = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=True)
    email = Column(String(255), unique=True, nullable=True)
    password_hash = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    events = relationship("Event", back_populates="creator", foreign_keys="[Event.creator_id]")
    reviews = relationship("Review", back_populates="user")
    sent_invitations = relationship("EventInvitation", back_populates="inviter", foreign_keys="[EventInvitation.inviter_id]")
    received_invitations = relationship("EventInvitation", back_populates="invited_user", foreign_keys="[EventInvitation.invited_user_id]")
    achievements = relationship("UserAchievement", back_populates="user")
    experience_log = relationship("ExperienceLog", back_populates="user")
    sent_blocks = relationship("UserBlock", back_populates="blocker", foreign_keys="[UserBlock.blocker_id]")
    received_blocks = relationship("UserBlock", back_populates="blocked", foreign_keys="[UserBlock.blocked_id]")


class Event(Base):
    __tablename__ = "events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(Text, nullable=False)
    description = Column(Text, nullable=False)
    category = Column(Text, nullable=False)
    event_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=True)
    location = Column(Text, nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    event_type = Column(String(20), default="offline")  # offline, online, hybrid
    online_platform = Column(Text, nullable=True)
    online_link = Column(Text, nullable=True)
    max_participants = Column(Integer, nullable=False, default=10)
    current_participants = Column(Integer, nullable=False, default=0)
    price = Column(Float, default=0)
    lifecycle_status = Column(String(20), default="upcoming")  # upcoming, ongoing, completed, cancelled
    status = Column(String(20), default="active")  # active, cancelled, completed
    image_url = Column(Text, nullable=True)
    category_data = Column(JSONB, default=dict)
    creator_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    age_restriction = Column(String(20), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Recurring event fields
    is_recurring = Column(Boolean, default=False)
    recurring_pattern = Column(JSONB, nullable=True)
    parent_event_id = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="SET NULL"), nullable=True)
    series_id = Column(UUID(as_uuid=True), nullable=True)

    # Relationships
    creator = relationship("Profile", back_populates="events", foreign_keys=[creator_id])
    participants = relationship("EventParticipant", back_populates="event")
    reviews = relationship("Review", back_populates="event")
    chat_room = relationship("ChatRoom", back_populates="event", uselist=False)
    notifications = relationship("Notification", back_populates="event")
    invitations = relationship("EventInvitation", back_populates="event")
    board_games = relationship("EventBoardGame", back_populates="event")

    __table_args__ = (
        Index("idx_events_category", "category"),
        Index("idx_events_event_date", "event_date"),
        Index("idx_events_creator_id", "creator_id"),
        Index("idx_events_lifecycle_status", "lifecycle_status"),
        Index("idx_events_status", "status"),
    )


class EventParticipant(Base):
    __tablename__ = "event_participants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(20), nullable=False, default="joined")  # joined, left, banned
    joined_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    event = relationship("Event", back_populates="participants")
    user = relationship("Profile")

    __table_args__ = (
        UniqueConstraint("event_id", "user_id", name="uq_event_participant"),
        Index("idx_ep_event_id", "event_id"),
        Index("idx_ep_user_id", "user_id"),
    )


class Review(Base):
    __tablename__ = "reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    rating = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    event = relationship("Event", back_populates="reviews")
    user = relationship("Profile", back_populates="reviews")

    __table_args__ = (
        UniqueConstraint("event_id", "user_id", name="uq_review"),
        CheckConstraint("rating >= 1 AND rating <= 5", name="ck_rating_range"),
    )


class ChatRoom(Base):
    __tablename__ = "chat_rooms"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, unique=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    event = relationship("Event", back_populates="chat_room")
    messages = relationship("ChatMessage", back_populates="room")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_id = Column(UUID(as_uuid=True), ForeignKey("chat_rooms.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    room = relationship("ChatRoom", back_populates="messages")
    user = relationship("Profile")

    __table_args__ = (
        Index("idx_cm_room_id", "room_id"),
        Index("idx_cm_created_at", "created_at"),
    )


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="SET NULL"), nullable=True)
    type = Column(Text, nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    user = relationship("Profile")
    event = relationship("Event", back_populates="notifications")

    __table_args__ = (
        Index("idx_notif_user_id", "user_id"),
        Index("idx_notif_is_read", "is_read"),
    )


class EventInvitation(Base):
    __tablename__ = "event_invitations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    inviter_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    invited_user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(20), default="pending")  # pending, accepted, rejected
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    event = relationship("Event", back_populates="invitations")
    inviter = relationship("Profile", back_populates="sent_invitations", foreign_keys=[inviter_id])
    invited_user = relationship("Profile", back_populates="received_invitations", foreign_keys=[invited_user_id])

    __table_args__ = (
        UniqueConstraint("event_id", "invited_user_id", name="uq_invitation"),
    )


class Friendship(Base):
    __tablename__ = "friendships"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    friend_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(20), default="pending")  # pending, accepted, rejected, blocked
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("user_id", "friend_id", name="uq_friendship"),
        Index("idx_fs_user_id", "user_id"),
        Index("idx_fs_friend_id", "friend_id"),
    )


# === Gamification ===

class Level(Base):
    __tablename__ = "levels"

    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False)
    min_xp = Column(Integer, nullable=False)
    badge_icon = Column(String(10), nullable=True)


class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    icon = Column(String(10), nullable=True)
    condition_type = Column(String(50), nullable=False)  # events_created, events_joined, etc.
    target_value = Column(Integer, nullable=False)
    xp_reward = Column(Integer, default=0)


class UserAchievement(Base):
    __tablename__ = "user_achievements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    achievement_id = Column(UUID(as_uuid=True), ForeignKey("achievements.id", ondelete="CASCADE"), nullable=False)
    unlocked_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    user = relationship("Profile", back_populates="achievements")

    __table_args__ = (
        UniqueConstraint("user_id", "achievement_id", name="uq_user_achievement"),
    )


class ExperienceLog(Base):
    __tablename__ = "experience_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    xp_amount = Column(Integer, nullable=False)
    reason = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    user = relationship("Profile", back_populates="experience_log")


# === Moderation ===

class Report(Base):
    __tablename__ = "reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=True)
    reporter_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(String(20), default="pending")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=True)

    __table_args__ = (
        Index("idx_reports_status", "status"),
    )


class UserBlock(Base):
    __tablename__ = "user_blocks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    blocker_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    blocked_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    blocker = relationship("Profile", back_populates="sent_blocks", foreign_keys=[blocker_id])
    blocked = relationship("Profile", back_populates="received_blocks", foreign_keys=[blocked_id])

    __table_args__ = (
        UniqueConstraint("blocker_id", "blocked_id", name="uq_user_block"),
    )


class BlockAppeal(Base):
    __tablename__ = "block_appeals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    block_id = Column(UUID(as_uuid=True), ForeignKey("user_blocks.id", ondelete="CASCADE"), nullable=False)
    appellant_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String(20), default="pending")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


# === Promo codes ===

class PromoCode(Base):
    __tablename__ = "promo_codes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(50), unique=True, nullable=False)
    discount_type = Column(String(20), nullable=False)  # percentage, fixed, free
    discount_value = Column(Float, default=0)
    categories = Column(JSONB, nullable=True)  # null = all categories
    min_price = Column(Float, default=0)
    max_uses = Column(Integer, nullable=True)
    current_uses = Column(Integer, default=0)
    max_uses_per_user = Column(Integer, default=1)
    valid_from = Column(DateTime(timezone=True), nullable=True)
    valid_until = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


class PromoCodeUsage(Base):
    __tablename__ = "promo_code_usages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    promo_code_id = Column(UUID(as_uuid=True), ForeignKey("promo_codes.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("promo_code_id", "user_id", "event_id", name="uq_promo_usage"),
    )


# === Commission ===

class ServiceCommissionSetting(Base):
    __tablename__ = "service_commission_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    base_commission_percent = Column(Float, default=10.0)
    categories = Column(JSONB, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class CommissionDiscountPeriod(Base):
    __tablename__ = "commission_discount_periods"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    discount_percent = Column(Float, default=0)
    categories = Column(JSONB, nullable=True)
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


# === Account merging ===

class AccountMergeRequest(Base):
    __tablename__ = "account_merge_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    target_user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(20), default="pending")
    merged_by = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    merged_at = Column(DateTime(timezone=True), nullable=True)


# === Board games ===

class BoardGame(Base):
    __tablename__ = "board_games"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    min_players = Column(Integer, nullable=True)
    max_players = Column(Integer, nullable=True)
    play_time_min = Column(Integer, nullable=True)
    complexity = Column(Float, nullable=True)
    image_url = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)


class EventBoardGame(Base):
    __tablename__ = "event_board_games"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    board_game_id = Column(UUID(as_uuid=True), ForeignKey("board_games.id", ondelete="CASCADE"), nullable=False)

    event = relationship("Event", back_populates="board_games")
    board_game = relationship("BoardGame")

    __table_args__ = (
        UniqueConstraint("event_id", "board_game_id", name="uq_event_board_game"),
    )


# === Dictionary tables (reference data) ===

DICTIONARY_TABLES = [
    "yoga_practice_types", "cuisine_types", "music_genres", "seminar_topics",
    "picnic_types", "photography_themes", "quest_themes", "dance_styles",
    "volunteer_activity_types", "fitness_workout_types", "theater_genres",
    "craft_types", "sports_types", "eco_tour_types",
]

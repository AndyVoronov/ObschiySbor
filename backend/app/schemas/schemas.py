from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any
from datetime import datetime
import uuid


# === Auth ===

class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str = ""
    city: str = ""
    interests: str = ""
    gender: Optional[str] = None
    referral_code: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "ProfileResponse"


class RefreshRequest(BaseModel):
    refresh_token: str


# === Profile ===

class ProfileResponse(BaseModel):
    id: str
    full_name: str
    role: str
    avatar_url: Optional[str] = None
    city: Optional[str] = None
    interests: Optional[str] = None
    gender: Optional[str] = None
    bio: Optional[str] = None
    telegram_username: Optional[str] = None
    xp: int = 0
    level: int = 1
    referral_code: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, obj):
        data = {
            "id": str(obj.id),
            "full_name": obj.full_name or "",
            "role": obj.role or "user",
            "avatar_url": obj.avatar_url,
            "city": obj.city,
            "interests": obj.interests,
            "gender": obj.gender,
            "bio": obj.bio,
            "telegram_username": obj.telegram_username,
            "xp": obj.xp or 0,
            "level": obj.level or 1,
            "referral_code": obj.referral_code,
            "created_at": obj.created_at,
        }
        return cls(**data)


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    city: Optional[str] = None
    interests: Optional[str] = None
    gender: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None


# === Events ===

class EventCreate(BaseModel):
    title: str
    description: str
    category: str
    event_date: datetime
    end_date: Optional[datetime] = None
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    event_type: str = "offline"
    online_platform: Optional[str] = None
    online_link: Optional[str] = None
    max_participants: int = 10
    price: float = 0
    image_url: Optional[str] = None
    category_data: Optional[dict] = None
    age_restriction: Optional[str] = None
    promo_code: Optional[str] = None
    is_recurring: bool = False
    recurring_pattern: Optional[dict] = None


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    event_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    event_type: Optional[str] = None
    online_platform: Optional[str] = None
    online_link: Optional[str] = None
    max_participants: Optional[int] = None
    price: Optional[float] = None
    image_url: Optional[str] = None
    category_data: Optional[dict] = None
    age_restriction: Optional[str] = None
    status: Optional[str] = None
    cancel_reason: Optional[str] = None


class EventResponse(BaseModel):
    id: str
    title: str
    description: str
    category: str
    event_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    event_type: str = "offline"
    online_platform: Optional[str] = None
    online_link: Optional[str] = None
    max_participants: int
    current_participants: int
    price: float
    lifecycle_status: str
    status: str
    image_url: Optional[str] = None
    category_data: Optional[dict] = None
    creator_id: str
    age_restriction: Optional[str] = None
    is_recurring: bool = False
    created_at: Optional[datetime] = None
    creator: Optional[ProfileResponse] = None

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, obj, creator=None):
        data = {
            "id": str(obj.id),
            "title": obj.title,
            "description": obj.description,
            "category": obj.category,
            "event_date": obj.event_date,
            "end_date": obj.end_date,
            "location": obj.location,
            "latitude": obj.latitude,
            "longitude": obj.longitude,
            "event_type": obj.event_type or "offline",
            "online_platform": obj.online_platform,
            "online_link": obj.online_link,
            "max_participants": obj.max_participants,
            "current_participants": obj.current_participants,
            "price": obj.price,
            "lifecycle_status": obj.lifecycle_status or "upcoming",
            "status": obj.status or "active",
            "image_url": obj.image_url,
            "category_data": obj.category_data,
            "creator_id": str(obj.creator_id),
            "age_restriction": obj.age_restriction,
            "is_recurring": obj.is_recurring or False,
            "created_at": obj.created_at,
            "creator": creator,
        }
        return cls(**data)


# === Chat ===

class ChatMessageResponse(BaseModel):
    id: str
    room_id: str
    user_id: str
    message: str
    created_at: Optional[datetime] = None
    user: Optional[ProfileResponse] = None

    @classmethod
    def from_orm(cls, obj, user=None):
        return cls(
            id=str(obj.id),
            room_id=str(obj.room_id),
            user_id=str(obj.user_id),
            message=obj.message,
            created_at=obj.created_at,
            user=user,
        )


# === Reviews ===

class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None


class ReviewResponse(BaseModel):
    id: str
    event_id: str
    user_id: str
    rating: int
    comment: Optional[str] = None
    created_at: Optional[datetime] = None
    user: Optional[ProfileResponse] = None

    @classmethod
    def from_orm(cls, obj, user=None):
        return cls(
            id=str(obj.id),
            event_id=str(obj.event_id),
            user_id=str(obj.user_id),
            rating=obj.rating,
            comment=obj.comment,
            created_at=obj.created_at,
            user=user,
        )


# === Notifications ===

class NotificationResponse(BaseModel):
    id: str
    user_id: str
    event_id: Optional[str] = None
    type: str
    message: str
    is_read: bool
    created_at: Optional[datetime] = None

    @classmethod
    def from_orm(cls, obj):
        return cls(
            id=str(obj.id),
            user_id=str(obj.user_id),
            event_id=str(obj.event_id) if obj.event_id else None,
            type=obj.type,
            message=obj.message,
            is_read=obj.is_read,
            created_at=obj.created_at,
        )


# === Friends ===

class FriendRequest(BaseModel):
    friend_id: str


class FriendshipResponse(BaseModel):
    id: str
    user_id: str
    friend_id: str
    status: str
    friend: Optional[ProfileResponse] = None

    @classmethod
    def from_orm(cls, obj, friend=None):
        return cls(
            id=str(obj.id),
            user_id=str(obj.user_id),
            friend_id=str(obj.friend_id),
            status=obj.status,
            friend=friend,
        )


# === Reports ===

class ReportCreate(BaseModel):
    event_id: str
    reason: str


# === Generic ===

class MessageResponse(BaseModel):
    message: str
    success: bool = True


class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    per_page: int

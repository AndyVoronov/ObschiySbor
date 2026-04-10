import json
import uuid
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, update, delete
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.auth import (
    get_current_user, get_optional_user, require_admin,
    verify_password, get_password_hash, create_access_token, create_refresh_token,
    decode_token
)
from app.models.models import *
from app.models.dictionaries import DICTIONARY_MODELS
from app.schemas.schemas import (
    LoginRequest, RegisterRequest, TokenResponse, RefreshRequest,
    ProfileResponse, ProfileUpdate, EventCreate, EventUpdate, EventResponse,
    ChatMessageResponse, ReviewCreate, ReviewResponse,
    NotificationResponse, FriendRequest, FriendshipResponse,
    ReportCreate, MessageResponse, PaginatedResponse,
)
from app.services.gamification import award_xp, check_achievements
from app.services.notifications import create_notification, notify_event_participants

router = APIRouter()


# ============================================================
# AUTH
# ============================================================

@router.post("/auth/register", response_model=TokenResponse)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check email exists
    result = await db.execute(select(Profile).where(Profile.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(400, "Email already registered")

    user_id = uuid.uuid4()
    referral_code = f"REF{user_id.hex[:8].upper()}"

    # Handle referral
    referred_by = None
    if data.referral_code:
        ref_result = await db.execute(
            select(Profile).where(Profile.referral_code == data.referral_code.upper())
        )
        referrer = ref_result.scalar_one_or_none()
        if referrer:
            referred_by = referrer.id

    profile = Profile(
        id=user_id,
        email=data.email,
        password_hash=get_password_hash(data.password),
        full_name=data.full_name,
        city=data.city,
        interests=data.interests,
        gender=data.gender if data.gender in ("male", "female", "other") else None,
        referral_code=referral_code,
        referred_by=referred_by,
    )
    db.add(profile)
    await db.flush()

    # XP for referral
    if referred_by:
        await award_xp(db, referred_by, 50, "referral_invite")

    tokens = _create_tokens(profile)
    return TokenResponse(
        access_token=tokens["access"],
        refresh_token=tokens["refresh"],
        user=ProfileResponse.from_orm(profile),
    )


@router.post("/auth/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Profile).where(Profile.email == data.email))
    profile = result.scalar_one_or_none()
    if not profile or not profile.password_hash:
        raise HTTPException(401, "Invalid credentials")
    if not verify_password(data.password, profile.password_hash):
        raise HTTPException(401, "Invalid credentials")
    if not profile.is_active:
        raise HTTPException(403, "Account is deactivated")

    tokens = _create_tokens(profile)
    return TokenResponse(
        access_token=tokens["access"],
        refresh_token=tokens["refresh"],
        user=ProfileResponse.from_orm(profile),
    )


@router.post("/auth/refresh", response_model=TokenResponse)
async def refresh_token(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(data.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(401, "Invalid refresh token")

    user_id = payload.get("sub")
    result = await db.execute(select(Profile).where(Profile.id == user_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(401, "User not found")

    tokens = _create_tokens(profile)
    return TokenResponse(
        access_token=tokens["access"],
        refresh_token=tokens["refresh"],
        user=ProfileResponse.from_orm(profile),
    )


@router.post("/auth/telegram")
async def telegram_auth(telegram_id: int = Form(...), first_name: str = Form(""),
                        last_name: str = Form(""), username: str = Form(""),
                        photo_url: str = Form(None), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Profile).where(Profile.telegram_id == telegram_id))
    profile = result.scalar_one_or_none()

    if profile:
        if not profile.is_active:
            raise HTTPException(403, "Account is deactivated")
        tokens = _create_tokens(profile)
        return TokenResponse(
            access_token=tokens["access"],
            refresh_token=tokens["refresh"],
            user=ProfileResponse.from_orm(profile),
        )

    # New user
    user_id = uuid.uuid4()
    email = f"tg{telegram_id}@obschiysbor.local"
    password = uuid.uuid4().hex + uuid.uuid4().hex
    full_name = f"{first_name} {last_name}".strip() or f"Telegram User {telegram_id}"

    profile = Profile(
        id=user_id,
        email=email,
        password_hash=get_password_hash(password),
        full_name=full_name,
        telegram_id=telegram_id,
        telegram_username=username,
        telegram_password=password,
        avatar_url=photo_url,
        referral_code=f"REF{user_id.hex[:8].upper()}",
    )
    db.add(profile)
    await db.flush()

    tokens = _create_tokens(profile)
    return TokenResponse(
        access_token=tokens["access"],
        refresh_token=tokens["refresh"],
        user=ProfileResponse.from_orm(profile),
    )


def _create_tokens(profile: Profile) -> dict:
    return {
        "access": create_access_token({"sub": str(profile.id), "email": profile.email, "role": profile.role}),
        "refresh": create_refresh_token({"sub": str(profile.id)}),
    }


# ============================================================
# PROFILES
# ============================================================

@router.get("/profiles/me", response_model=ProfileResponse)
async def get_my_profile(user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Profile).where(Profile.id == user["user_id"]))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Profile not found")
    return ProfileResponse.from_orm(profile)


@router.put("/profiles/me", response_model=ProfileResponse)
async def update_my_profile(data: ProfileUpdate, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Profile).where(Profile.id == user["user_id"]))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Profile not found")

    update_data = data.model_dump(exclude_unset=True)
    if update_data:
        for key, value in update_data.items():
            setattr(profile, key, value)
        profile.updated_at = datetime.utcnow()
        await db.flush()

    return ProfileResponse.from_orm(profile)


@router.get("/profiles/{user_id}", response_model=ProfileResponse)
async def get_profile(user_id: str, db: AsyncSession = Depends(get_db), _user=Depends(get_optional_user)):
    result = await db.execute(select(Profile).where(Profile.id == user_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Profile not found")
    return ProfileResponse.from_orm(profile)


# ============================================================
# EVENTS
# ============================================================

@router.get("/events", response_model=List[EventResponse])
async def list_events(
    category: Optional[str] = None,
    search: Optional[str] = None,
    status: Optional[str] = None,
    price_type: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    # Update lifecycle statuses first
    await _update_lifecycle_statuses(db)

    query = (
        select(Event)
        .options(selectinload(Event.creator))
        .order_by(Event.created_at.desc())
    )

    if category:
        query = query.where(Event.category == category)
    if search:
        like = f"%{search}%"
        query = query.where(or_(
            Event.title.ilike(like),
            Event.description.ilike(like),
            Event.location.ilike(like),
        ))
    if status == "active":
        query = query.where(Event.lifecycle_status.in_(["upcoming", "ongoing"]))
    elif status:
        query = query.where(Event.lifecycle_status == status)
    if price_type == "free":
        query = query.where(Event.price == 0)
    elif price_type == "paid":
        query = query.where(Event.price > 0)
    if min_price is not None:
        query = query.where(Event.price >= min_price)
    if max_price is not None:
        query = query.where(Event.price <= max_price)

    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    events = result.scalars().all()

    return [_event_to_response(e) for e in events]


@router.get("/events/{event_id}", response_model=EventResponse)
async def get_event(event_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Event).options(selectinload(Event.creator)).where(Event.id == event_id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(404, "Event not found")
    return _event_to_response(event)


@router.post("/events", response_model=EventResponse)
async def create_event(data: EventCreate, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    event = Event(
        id=uuid.uuid4(),
        title=data.title,
        description=data.description,
        category=data.category,
        event_date=data.event_date,
        end_date=data.end_date,
        location=data.location,
        latitude=data.latitude,
        longitude=data.longitude,
        event_type=data.event_type,
        online_platform=data.online_platform,
        online_link=data.online_link,
        max_participants=data.max_participants,
        price=data.price,
        image_url=data.image_url,
        category_data=data.category_data,
        creator_id=user["user_id"],
        age_restriction=data.age_restriction,
        is_recurring=data.is_recurring,
        recurring_pattern=data.recurring_pattern,
    )

    # Validate promo code
    if data.promo_code:
        event.price = await _apply_promo_code(db, data.promo_code, event.price, data.category, user["user_id"])

    db.add(event)
    await db.flush()

    # Create chat room
    chat_room = ChatRoom(event_id=event.id)
    db.add(chat_room)
    await db.flush()

    # XP for creating event
    await award_xp(db, user["user_id"], 20, "event_created")
    await check_achievements(db, user["user_id"])

    # Refresh event with creator
    await db.refresh(event)
    return _event_to_response(event)


@router.put("/events/{event_id}", response_model=EventResponse)
async def update_event(event_id: str, data: EventUpdate, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Event).options(selectinload(Event.creator)).where(Event.id == event_id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(404, "Event not found")
    if str(event.creator_id) != user["user_id"] and user["role"] != "admin":
        raise HTTPException(403, "Not authorized")

    update_data = data.model_dump(exclude_unset=True)

    # Handle cancellation
    if data.status == "cancelled":
        event.status = "cancelled"
        event.lifecycle_status = "cancelled"
        if "cancel_reason" in update_data:
            event.category_data = event.category_data or {}
            event.category_data["cancel_reason"] = update_data.pop("cancel_reason")
        # Notify participants
        await notify_event_participants(db, event_id, "event_cancelled",
                                         f'Событие "{event.title}" было отменено организатором',
                                         exclude_user=user["user_id"])

    for key, value in update_data.items():
        if hasattr(event, key):
            setattr(event, key, value)
    event.updated_at = datetime.utcnow()
    await db.flush()

    return _event_to_response(event)


@router.post("/events/{event_id}/join")
async def join_event(event_id: str, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(404, "Event not found")
    if event.lifecycle_status not in ("upcoming", "ongoing"):
        raise HTTPException(400, "Cannot join this event")
    if event.max_participants > 0 and event.current_participants >= event.max_participants:
        raise HTTPException(400, "Event is full")

    # Check already joined
    existing = await db.execute(
        select(EventParticipant).where(
            EventParticipant.event_id == event_id,
            EventParticipant.user_id == user["user_id"],
            EventParticipant.status == "joined"
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Already joined")

    participant = EventParticipant(event_id=event_id, user_id=user["user_id"])
    db.add(participant)
    event.current_participants = (event.current_participants or 0) + 1
    await db.flush()

    # Notify creator
    await create_notification(db, event.creator_id, event_id, "new_participant",
                              f"Новый участник присоединился к вашему событию")

    # XP for joining
    await award_xp(db, user["user_id"], 10, "event_joined")
    await check_achievements(db, user["user_id"])

    return MessageResponse(message="Joined successfully")


@router.post("/events/{event_id}/leave")
async def leave_event(event_id: str, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(EventParticipant).where(
            EventParticipant.event_id == event_id,
            EventParticipant.user_id == user["user_id"],
            EventParticipant.status == "joined"
        )
    )
    participant = result.scalar_one_or_none()
    if not participant:
        raise HTTPException(400, "Not a participant")

    participant.status = "left"

    event_result = await db.execute(select(Event).where(Event.id == event_id))
    event = event_result.scalar_one()
    event.current_participants = max(0, (event.current_participants or 1) - 1)
    await db.flush()

    return MessageResponse(message="Left successfully")


# ============================================================
# EVENT PARTICIPANTS
# ============================================================

@router.get("/events/{event_id}/participants", response_model=List[ProfileResponse])
async def get_event_participants(event_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(EventParticipant)
        .options(selectinload(EventParticipant.user))
        .where(EventParticipant.event_id == event_id, EventParticipant.status == "joined")
    )
    participants = result.scalars().all()
    return [ProfileResponse.from_orm(p.user) for p in participants if p.user]


# ============================================================
# CHAT
# ============================================================

@router.get("/events/{event_id}/chat", response_model=List[ChatMessageResponse])
async def get_chat_messages(event_id: str, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await _check_chat_access(db, event_id, user["user_id"])

    result = await db.execute(
        select(ChatRoom).where(ChatRoom.event_id == event_id)
    )
    room = result.scalar_one_or_none()
    if not room:
        return []

    msgs = await db.execute(
        select(ChatMessage)
        .options(selectinload(ChatMessage.user))
        .where(ChatMessage.room_id == room.id)
        .order_by(ChatMessage.created_at.asc())
    )
    messages = msgs.scalars().all()
    return [ChatMessageResponse.from_orm(m, ProfileResponse.from_orm(m.user)) for m in messages]


@router.post("/events/{event_id}/chat", response_model=ChatMessageResponse)
async def send_chat_message(
    event_id: str, message: str = Form(..., max_length=500),
    user=Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    await _check_chat_access(db, event_id, user["user_id"])

    result = await db.execute(select(ChatRoom).where(ChatRoom.event_id == event_id))
    room = result.scalar_one_or_none()
    if not room:
        room = ChatRoom(event_id=event_id)
        db.add(room)
        await db.flush()

    chat_msg = ChatMessage(room_id=room.id, user_id=user["user_id"], message=message)
    db.add(chat_msg)
    await db.flush()
    await db.refresh(chat_msg)

    await db.refresh(chat_msg)
    return ChatMessageResponse.from_orm(chat_msg)


async def _check_chat_access(db, event_id, user_id):
    # Check if creator
    ev = await db.execute(select(Event).where(Event.id == event_id))
    event = ev.scalar_one_or_none()
    if not event:
        raise HTTPException(404, "Event not found")
    if str(event.creator_id) == user_id:
        return

    # Check if participant
    part = await db.execute(
        select(EventParticipant).where(
            EventParticipant.event_id == event_id,
            EventParticipant.user_id == user_id,
            EventParticipant.status == "joined"
        )
    )
    if not part.scalar_one_or_none():
        raise HTTPException(403, "Access denied")


# ============================================================
# REVIEWS
# ============================================================

@router.get("/events/{event_id}/reviews", response_model=List[ReviewResponse])
async def get_reviews(event_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Review)
        .options(selectinload(Review.user))
        .where(Review.event_id == event_id)
        .order_by(Review.created_at.desc())
    )
    return [ReviewResponse.from_orm(r, ProfileResponse.from_orm(r.user)) for r in result.scalars().all()]


@router.post("/events/{event_id}/reviews", response_model=ReviewResponse)
async def create_review(event_id: str, data: ReviewCreate, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Check participation
    part = await db.execute(
        select(EventParticipant).where(
            EventParticipant.event_id == event_id,
            EventParticipant.user_id == user["user_id"],
            EventParticipant.status == "joined"
        )
    )
    if not part.scalar_one_or_none() and str((await db.execute(select(Event).where(Event.id == event_id))).scalar_one().creator_id) != user["user_id"]:
        raise HTTPException(403, "Must be participant to review")

    # Check existing review
    existing = await db.execute(
        select(Review).where(Review.event_id == event_id, Review.user_id == user["user_id"])
    )
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Already reviewed")

    review = Review(event_id=event_id, user_id=user["user_id"], rating=data.rating, comment=data.comment)
    db.add(review)
    await db.flush()
    await db.refresh(review)

    await award_xp(db, user["user_id"], 5, "review_left")
    return ReviewResponse.from_orm(review)


# ============================================================
# NOTIFICATIONS
# ============================================================

@router.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == user["user_id"])
        .order_by(Notification.created_at.desc())
        .limit(20)
    )
    return [NotificationResponse.from_orm(n) for n in result.scalars().all()]


@router.put("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        update(Notification)
        .where(Notification.id == notif_id, Notification.user_id == user["user_id"])
        .values(is_read=True)
    )
    await db.flush()
    return MessageResponse(message="Marked as read")


@router.put("/notifications/read-all")
async def mark_all_read(user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(
        update(Notification)
        .where(Notification.user_id == user["user_id"], Notification.is_read == False)
        .values(is_read=True)
    )
    await db.flush()
    return MessageResponse(message="All marked as read")


@router.delete("/notifications/{notif_id}")
async def delete_notification(notif_id: str, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(
        delete(Notification).where(Notification.id == notif_id, Notification.user_id == user["user_id"])
    )
    await db.flush()
    return MessageResponse(message="Deleted")


# ============================================================
# FRIENDS
# ============================================================

@router.get("/friends", response_model=List[FriendshipResponse])
async def get_friends(user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Friendship)
        .options(selectinload(Friendship.friend))
        .where(
            or_(
                and_(Friendship.user_id == user["user_id"], Friendship.status == "accepted"),
                and_(Friendship.friend_id == user["user_id"], Friendship.status == "accepted"),
            )
        )
    )
    items = []
    for f in result.scalars().all():
        friend = f.friend if str(f.user_id) == user["user_id"] else f.user
        items.append(FriendshipResponse(
            id=str(f.id), user_id=str(f.user_id), friend_id=str(f.friend_id),
            status=f.status, friend=ProfileResponse.from_orm(friend)
        ))
    return items


@router.post("/friends/request", response_model=FriendshipResponse)
async def send_friend_request(data: FriendRequest, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Check existing
    existing = await db.execute(
        select(Friendship).where(
            or_(
                and_(Friendship.user_id == user["user_id"], Friendship.friend_id == data.friend_id),
                and_(Friendship.user_id == data.friend_id, Friendship.friend_id == user["user_id"]),
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Request already exists")

    friendship = Friendship(user_id=user["user_id"], friend_id=data.friend_id)
    db.add(friendship)
    await db.flush()
    await db.refresh(friendship)
    return FriendshipResponse(
        id=str(friendship.id), user_id=str(friendship.user_id),
        friend_id=str(friendship.friend_id), status=friendship.status
    )


@router.put("/friends/{friendship_id}/accept")
async def accept_friend(friendship_id: str, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Friendship).where(Friendship.id == friendship_id))
    f = result.scalar_one_or_none()
    if not f or str(f.friend_id) != user["user_id"]:
        raise HTTPException(403, "Cannot accept")
    f.status = "accepted"
    await db.flush()
    return MessageResponse(message="Friend request accepted")


@router.delete("/friends/{friendship_id}")
async def remove_friend(friendship_id: str, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(
        delete(Friendship).where(
            Friendship.id == friendship_id,
            or_(Friendship.user_id == user["user_id"], Friendship.friend_id == user["user_id"])
        )
    )
    await db.flush()
    return MessageResponse(message="Friend removed")


# ============================================================
# REPORTS
# ============================================================

@router.post("/reports")
async def create_report(data: ReportCreate, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    report = Report(event_id=data.event_id, reporter_id=user["user_id"], reason=data.reason)
    db.add(report)
    await db.flush()
    return MessageResponse(message="Report created")


# ============================================================
# USER STATS
# ============================================================

@router.get("/users/{user_id}/stats")
async def get_user_stats(user_id: str, db: AsyncSession = Depends(get_db)):
    created = await db.execute(
        select(func.count()).select_from(Event).where(Event.creator_id == user_id)
    )
    participated = await db.execute(
        select(func.count()).select_from(EventParticipant).where(
            EventParticipant.user_id == user_id, EventParticipant.status == "joined"
        )
    )
    return {
        "events_created": created.scalar() or 0,
        "events_participated": participated.scalar() or 0,
    }


# ============================================================
# INVITATIONS
# ============================================================

@router.post("/events/{event_id}/invite")
async def invite_to_event(event_id: str, user_ids: List[str] = Form(...), user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    for uid in user_ids:
        inv = EventInvitation(event_id=event_id, inviter_id=user["user_id"], invited_user_id=uid)
        db.add(inv)
    await db.flush()
    return MessageResponse(message=f"Invited {len(user_ids)} users")


@router.get("/invitations")
async def get_invitations(user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(EventInvitation)
        .options(selectinload(EventInvitation.event))
        .where(EventInvitation.invited_user_id == user["user_id"], EventInvitation.status == "pending")
    )
    items = []
    for inv in result.scalars().all():
        items.append({
            "id": str(inv.id),
            "event_id": str(inv.event_id),
            "event_title": inv.event.title if inv.event else None,
            "status": inv.status,
            "created_at": inv.created_at.isoformat() if inv.created_at else None,
        })
    return items


@router.put("/invitations/{inv_id}/accept")
async def accept_invitation(inv_id: str, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(EventInvitation).where(EventInvitation.id == inv_id))
    inv = result.scalar_one_or_none()
    if not inv or str(inv.invited_user_id) != user["user_id"]:
        raise HTTPException(403, "Cannot accept")
    inv.status = "accepted"

    # Auto-join event
    existing = await db.execute(
        select(EventParticipant).where(
            EventParticipant.event_id == inv.event_id,
            EventParticipant.user_id == user["user_id"],
            EventParticipant.status == "joined"
        )
    )
    if not existing.scalar_one_or_none():
        part = EventParticipant(event_id=inv.event_id, user_id=user["user_id"])
        db.add(part)
        ev = await db.execute(select(Event).where(Event.id == inv.event_id))
        event = ev.scalar_one()
        if event:
            event.current_participants = (event.current_participants or 0) + 1

    await db.flush()
    return MessageResponse(message="Invitation accepted")


@router.put("/invitations/{inv_id}/reject")
async def reject_invitation(inv_id: str, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(EventInvitation).where(EventInvitation.id == inv_id))
    inv = result.scalar_one_or_none()
    if not inv or str(inv.invited_user_id) != user["user_id"]:
        raise HTTPException(403)
    inv.status = "rejected"
    await db.flush()
    return MessageResponse(message="Invitation rejected")


# ============================================================
# FILE UPLOAD
# ============================================================

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    type: str = Form("event"),  # "event" or "avatar"
    user=Depends(get_current_user),
):
    import os
    from app.core.config import get_settings
    settings = get_settings()

    if file.content_type not in settings.ALLOWED_IMAGE_TYPES:
        raise HTTPException(400, f"Unsupported type: {file.content_type}")

    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(400, "File too large (max 5MB)")

    ext = file.filename.rsplit(".", 1)[-1] if file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    folder = "events" if type == "event" else "avatars"
    path = os.path.join(settings.UPLOAD_DIR, folder, filename)
    os.makedirs(os.path.dirname(path), exist_ok=True)

    with open(path, "wb") as f:
        f.write(content)

    url = f"/uploads/{folder}/{filename}"
    return {"url": url}


# ============================================================
# DICTIONARY TABLES
# ============================================================

@router.get("/dictionaries/{table_name}")
async def get_dictionary(table_name: str, db: AsyncSession = Depends(get_db)):
    if table_name not in DICTIONARY_MODELS:
        raise HTTPException(404, "Dictionary not found")
    model = DICTIONARY_MODELS[table_name]
    result = await db.execute(select(model))
    return [{"id": str(m.id), "name": m.name} for m in result.scalars().all()]


# ============================================================
# CHAT ROOMS (for Chats.jsx)
# ============================================================

@router.get("/chat-rooms")
async def list_chat_rooms(user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Return chat rooms for events where user is participant or creator."""
    # Events user created
    created_events = await db.execute(
        select(Event.id).where(Event.creator_id == user["user_id"], Event.lifecycle_status.in_(["upcoming", "ongoing"]))
    )
    created_ids = [r[0] for r in created_events.all()]

    # Events user joined
    joined_events = await db.execute(
        select(EventParticipant.event_id).where(
            EventParticipant.user_id == user["user_id"], EventParticipant.status == "joined"
        )
    )
    joined_ids = [r[0] for r in joined_events.all()]

    event_ids = list(set(created_ids + joined_ids))
    if not event_ids:
        return []

    # Get rooms with events
    rooms_result = await db.execute(
        select(ChatRoom).options(selectinload(ChatRoom.event).selectinload(Event.creator))
        .where(ChatRoom.event_id.in_(event_ids))
    )
    rooms = rooms_result.scalars().all()

    # Get last message and unread count per room
    result = []
    for room in rooms:
        # Last message
        last_msg = await db.execute(
            select(ChatMessage).where(ChatMessage.room_id == room.id).order_by(ChatMessage.created_at.desc()).limit(1)
        )
        msg = last_msg.scalar_one_or_none()

        # Unread count (simple: count all messages - we don't track read status per room)
        msg_count = await db.execute(
            select(func.count()).select_from(ChatMessage).where(ChatMessage.room_id == room.id)
        )

        result.append({
            "id": str(room.id),
            "event_id": str(room.event_id),
            "event_title": room.event.title if room.event else None,
            "event_category": room.event.category if room.event else None,
            "creator_name": room.event.creator.full_name if room.event and room.event.creator else None,
            "creator_avatar": room.event.creator.avatar_url if room.event and room.event.creator else None,
            "last_message": msg.message if msg else None,
            "last_message_at": msg.created_at.isoformat() if msg else None,
            "message_count": msg_count.scalar() or 0,
            "created_at": room.created_at.isoformat() if room.created_at else None,
        })

    result.sort(key=lambda x: x.get("last_message_at") or "", reverse=True)
    return result


# ============================================================
# NOTIFICATIONS (client-initiated)
# ============================================================

@router.post("/notifications")
async def create_notification_endpoint(event_id: Optional[str] = None, user_id: Optional[str] = None,
                                        type: str = "custom", message: str = Form(""),
                                        _user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    target_id = user_id or _user["user_id"]
    notif = Notification(user_id=target_id, event_id=event_id, type=type, message=message)
    db.add(notif)
    await db.flush()
    return {"id": str(notif.id), "message": "Notification created"}


# ============================================================
# ADMIN REPORTS
# ============================================================

@router.get("/admin/reports")
async def admin_list_reports(status: Optional[str] = None, user=Depends(require_admin), db: AsyncSession = Depends(get_db)):
    query = select(Report).options(selectinload(Report.reporter)).order_by(Report.created_at.desc())
    if status:
        query = query.where(Report.status == status)
    result = await db.execute(query)
    return [{"id": str(r.id), "event_id": str(r.event_id) if r.event_id else None,
             "reporter_id": str(r.reporter_id), "reporter_name": r.reporter.full_name if r.reporter else None,
             "reason": r.reason, "status": r.status,
             "created_at": r.created_at.isoformat() if r.created_at else None} for r in result.scalars().all()]


@router.put("/admin/reports/{report_id}")
async def admin_update_report(report_id: str, status: str = Form("resolved"),
                               user=Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(update(Report).where(Report.id == report_id).values(status=status, resolved_by=user["user_id"], resolved_at=datetime.utcnow()))
    await db.flush()
    return MessageResponse(message=f"Report {status}")


@router.post("/admin/events/{event_id}/block")
async def admin_block_event(event_id: str, user=Depends(require_admin), db: AsyncSession = Depends(get_db)):
    event = (await db.execute(select(Event).where(Event.id == event_id))).scalar_one_or_none()
    if not event:
        raise HTTPException(404, "Event not found")
    event.lifecycle_status = "cancelled"
    event.status = "cancelled"
    await db.flush()
    return MessageResponse(message="Event blocked")


# ============================================================
# LIFECYCLE (RPC replacement)
# ============================================================

@router.post("/rpc/update_event_lifecycle_status")
async def update_lifecycle_status(db: AsyncSession = Depends(get_db)):
    await _update_lifecycle_statuses(db)
    return MessageResponse(message="Lifecycle statuses updated")


# ============================================================
# VK OAUTH
# ============================================================

@router.post("/auth/vk", response_model=TokenResponse)
async def vk_auth(
    vk_user_id: int = Form(...),
    access_token: str = Form(...),
    first_name: str = Form(""),
    last_name: str = Form(""),
    photo_url: str = Form(None),
    gender: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Profile).where(Profile.vk_id == vk_user_id))
    profile = result.scalar_one_or_none()

    if profile:
        if not profile.is_active:
            raise HTTPException(403, "Account is deactivated")
        # Update VK profile data
        full_name = f"{first_name} {last_name}".strip() or profile.full_name
        profile.full_name = full_name
        if photo_url:
            profile.avatar_url = photo_url
        if gender:
            profile.gender = gender if gender in ("male", "female", "other") else None
        profile.updated_at = datetime.utcnow()
        await db.flush()

        tokens = _create_tokens(profile)
        return TokenResponse(
            access_token=tokens["access"],
            refresh_token=tokens["refresh"],
            user=ProfileResponse.from_orm(profile),
        )

    # New VK user
    user_id = uuid.uuid4()
    email = f"vk{vk_user_id}@obschiysbor.local"
    password = uuid.uuid4().hex + uuid.uuid4().hex
    full_name = f"{first_name} {last_name}".strip() or f"VK User {vk_user_id}"

    profile = Profile(
        id=user_id,
        email=email,
        password_hash=get_password_hash(password),
        full_name=full_name,
        vk_id=vk_user_id,
        vk_access_token=access_token,
        avatar_url=photo_url,
        gender=gender if gender in ("male", "female", "other") else None,
        referral_code=f"REF{user_id.hex[:8].upper()}",
    )
    db.add(profile)
    await db.flush()

    tokens = _create_tokens(profile)
    return TokenResponse(
        access_token=tokens["access"],
        refresh_token=tokens["refresh"],
        user=ProfileResponse.from_orm(profile),
    )


# ============================================================
# EVENT BOARD GAMES
# ============================================================

@router.get("/events/{event_id}/board-games")
async def get_event_board_games(event_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(EventBoardGame)
        .options(selectinload(EventBoardGame.board_game))
        .where(EventBoardGame.event_id == event_id)
    )
    items = result.scalars().all()
    games = []
    for item in items:
        bg = item.board_game
        if bg:
            games.append({
                "id": str(bg.id),
                "name": bg.name,
                "description": bg.description,
                "min_players": bg.min_players,
                "max_players": bg.max_players,
                "avg_playtime_minutes": bg.avg_playtime_minutes,
                "image_url": bg.image_url,
            })
    return games


# ============================================================
# BLOCK / UNBLOCK USER (ADMIN)
# ============================================================

@router.post("/admin/users/{user_id}/block")
async def block_user(
    user_id: str,
    reason: str = Form(""),
    _admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Profile).where(Profile.id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(404, "User not found")

    target.is_active = False
    block = UserBlock(blocked_id=user_id, blocked_by=_admin["user_id"], reason=reason)
    db.add(block)
    await db.flush()
    return MessageResponse(message="User blocked")


@router.post("/admin/users/{user_id}/unblock")
async def unblock_user(
    user_id: str,
    _admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Profile).where(Profile.id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(404, "User not found")

    target.is_active = True
    await db.execute(
        update(UserBlock)
        .where(UserBlock.blocked_id == user_id, UserBlock.is_active == True)
        .values(is_active=False)
    )
    await db.flush()
    return MessageResponse(message="User unblocked")


# ============================================================
# PROMO CODE VALIDATION
# ============================================================

@router.get("/promo-codes/validate/{code}")
async def validate_promo_code(code: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PromoCode).where(PromoCode.code == code.upper(), PromoCode.is_active == True)
    )
    promo = result.scalar_one_or_none()
    if not promo:
        raise HTTPException(404, "Promo code not found")

    now = datetime.utcnow()
    if promo.valid_from and now < promo.valid_from:
        raise HTTPException(400, "Promo code not yet active")
    if promo.valid_until and now > promo.valid_until:
        raise HTTPException(400, "Promo code expired")
    if promo.max_uses and promo.current_uses >= promo.max_uses:
        raise HTTPException(400, "Promo code usage limit reached")

    return {
        "id": str(promo.id),
        "code": promo.code,
        "discount_type": promo.discount_type,
        "discount_value": promo.discount_value,
        "min_price": promo.min_price,
        "categories": promo.categories,
        "max_uses": promo.max_uses,
        "current_uses": promo.current_uses,
        "max_uses_per_user": promo.max_uses_per_user,
        "valid_from": promo.valid_from.isoformat() if promo.valid_from else None,
        "valid_until": promo.valid_until.isoformat() if promo.valid_until else None,
    }


# ============================================================
# BLOCK STATUS
# ============================================================

@router.get("/users/{user_id}/block-status")
async def get_block_status(user_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(UserBlock)
        .where(UserBlock.blocked_id == user_id, UserBlock.is_active == True)
        .order_by(UserBlock.created_at.desc())
        .limit(1)
    )
    block = result.scalar_one_or_none()
    return {
        "is_blocked": block is not None,
        "reason": block.reason if block else None,
    }


# ============================================================
# BLOCK APPEALS (ADMIN)
# ============================================================

@router.get("/admin/block-appeals")
async def list_block_appeals(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    _admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(BlockAppeal)
        .options(selectinload(BlockAppeal.appellant))
        .order_by(BlockAppeal.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    result = await db.execute(query)
    appeals = result.scalars().all()
    return [
        {
            "id": str(a.id),
            "user_id": str(a.appellant_id),
            "user_name": a.appellant.full_name if a.appellant else None,
            "message": a.message,
            "status": a.status,
            "admin_response": a.admin_response,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "resolved_at": a.resolved_at.isoformat() if a.resolved_at else None,
        }
        for a in appeals
    ]


@router.post("/admin/block-appeals")
async def create_block_appeal(
    message: str = Form(...),
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    appeal = BlockAppeal(appellant_id=user["user_id"], message=message)
    db.add(appeal)
    await db.flush()
    return MessageResponse(message="Appeal submitted")


@router.post("/admin/block-appeals/{appeal_id}/approve")
async def approve_block_appeal(
    appeal_id: str,
    _admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(BlockAppeal).where(BlockAppeal.id == appeal_id))
    appeal = result.scalar_one_or_none()
    if not appeal:
        raise HTTPException(404, "Appeal not found")
    if appeal.status != "pending":
        raise HTTPException(400, "Appeal already resolved")

    appeal.status = "approved"
    appeal.resolved_by = _admin["user_id"]
    appeal.resolved_at = datetime.utcnow()

    # Deactivate block and reactivate profile
    await db.execute(
        update(UserBlock)
        .where(UserBlock.blocked_id == appeal.appellant_id, UserBlock.is_active == True)
        .values(is_active=False)
    )
    profile_result = await db.execute(select(Profile).where(Profile.id == appeal.appellant_id))
    profile = profile_result.scalar_one_or_none()
    if profile:
        profile.is_active = True

    await db.flush()
    return MessageResponse(message="Appeal approved, user unblocked")


@router.post("/admin/block-appeals/{appeal_id}/reject")
async def reject_block_appeal(
    appeal_id: str,
    admin_response: str = Form(""),
    _admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(BlockAppeal).where(BlockAppeal.id == appeal_id))
    appeal = result.scalar_one_or_none()
    if not appeal:
        raise HTTPException(404, "Appeal not found")
    if appeal.status != "pending":
        raise HTTPException(400, "Appeal already resolved")

    appeal.status = "rejected"
    appeal.admin_response = admin_response
    appeal.resolved_by = _admin["user_id"]
    appeal.resolved_at = datetime.utcnow()
    await db.flush()
    return MessageResponse(message="Appeal rejected")


# ============================================================
# ADMIN PROMO CODES CRUD
# ============================================================

@router.get("/admin/promo-codes")
async def list_promo_codes(
    _admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(PromoCode).order_by(PromoCode.created_at.desc()))
    return [
        {
            "id": str(p.id),
            "code": p.code,
            "discount_type": p.discount_type,
            "discount_value": p.discount_value,
            "min_price": p.min_price,
            "categories": p.categories,
            "max_uses": p.max_uses,
            "current_uses": p.current_uses,
            "max_uses_per_user": p.max_uses_per_user,
            "is_active": p.is_active,
            "valid_from": p.valid_from.isoformat() if p.valid_from else None,
            "valid_until": p.valid_until.isoformat() if p.valid_until else None,
        }
        for p in result.scalars().all()
    ]


@router.post("/admin/promo-codes")
async def create_promo_code(
    code: str = Form(...),
    discount_type: str = Form(...),
    discount_value: float = Form(...),
    min_price: Optional[float] = Form(None),
    categories: Optional[str] = Form(None),
    max_uses: Optional[int] = Form(None),
    max_uses_per_user: Optional[int] = Form(None),
    valid_from: Optional[str] = Form(None),
    valid_until: Optional[str] = Form(None),
    _admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    parsed_categories = None
    if categories:
        try:
            parsed_categories = json.loads(categories)
        except (json.JSONDecodeError, TypeError):
            parsed_categories = [c.strip() for c in categories.split(",") if c.strip()]

    promo = PromoCode(
        code=code.upper(),
        discount_type=discount_type,
        discount_value=discount_value,
        min_price=min_price,
        categories=parsed_categories,
        max_uses=max_uses,
        max_uses_per_user=max_uses_per_user,
        valid_from=datetime.fromisoformat(valid_from) if valid_from else None,
        valid_until=datetime.fromisoformat(valid_until) if valid_until else None,
    )
    db.add(promo)
    await db.flush()
    return MessageResponse(message="Promo code created")


@router.delete("/admin/promo-codes/{promo_id}")
async def delete_promo_code(
    promo_id: str,
    _admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(PromoCode).where(PromoCode.id == promo_id))
    promo = result.scalar_one_or_none()
    if not promo:
        raise HTTPException(404, "Promo code not found")
    await db.execute(delete(PromoCode).where(PromoCode.id == promo_id))
    await db.flush()
    return MessageResponse(message="Promo code deleted")


# ============================================================
# COMMISSION SETTINGS (ADMIN)
# ============================================================

@router.get("/admin/commission")
async def get_commission(
    _admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ServiceCommissionSetting)
        .where(ServiceCommissionSetting.is_active == True)
        .order_by(ServiceCommissionSetting.created_at.desc())
        .limit(1)
    )
    setting = result.scalar_one_or_none()
    if setting:
        return {
            "id": str(setting.id),
            "commission_percent": setting.commission_percent,
            "is_active": setting.is_active,
            "created_at": setting.created_at.isoformat() if setting.created_at else None,
        }
    return {"id": None, "commission_percent": 10.0, "is_active": True, "created_at": None}


@router.put("/admin/commission")
async def update_commission(
    commission_percent: float = Form(...),
    _admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    # Deactivate old settings
    await db.execute(
        update(ServiceCommissionSetting)
        .where(ServiceCommissionSetting.is_active == True)
        .values(is_active=False)
    )
    setting = ServiceCommissionSetting(
        commission_percent=commission_percent,
        created_by=_admin["user_id"],
    )
    db.add(setting)
    await db.flush()
    return MessageResponse(message="Commission updated")


# ============================================================
# COMMISSION DISCOUNT PERIODS (ADMIN)
# ============================================================

@router.get("/admin/commission-discounts")
async def list_commission_discounts(
    _admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CommissionDiscountPeriod).order_by(CommissionDiscountPeriod.created_at.desc())
    )
    return [
        {
            "id": str(d.id),
            "name": d.name,
            "discount_percent": d.discount_percent,
            "start_date": d.start_date.isoformat() if d.start_date else None,
            "end_date": d.end_date.isoformat() if d.end_date else None,
            "category": d.category,
            "is_active": d.is_active,
        }
        for d in result.scalars().all()
    ]


@router.post("/admin/commission-discounts")
async def create_commission_discount(
    name: str = Form(...),
    discount_percent: float = Form(...),
    start_date: str = Form(...),
    end_date: str = Form(...),
    category: Optional[str] = Form(None),
    _admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    period = CommissionDiscountPeriod(
        name=name,
        discount_percent=discount_percent,
        start_date=datetime.fromisoformat(start_date),
        end_date=datetime.fromisoformat(end_date),
        category=category,
    )
    db.add(period)
    await db.flush()
    return MessageResponse(message="Commission discount period created")


@router.delete("/admin/commission-discounts/{discount_id}")
async def delete_commission_discount(
    discount_id: str,
    _admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(CommissionDiscountPeriod).where(CommissionDiscountPeriod.id == discount_id))
    period = result.scalar_one_or_none()
    if not period:
        raise HTTPException(404, "Discount period not found")
    await db.execute(delete(CommissionDiscountPeriod).where(CommissionDiscountPeriod.id == discount_id))
    await db.flush()
    return MessageResponse(message="Commission discount period deleted")


# ============================================================
# GAMIFICATION
# ============================================================

@router.get("/users/{user_id}/gamification")
async def get_gamification(user_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Profile).where(Profile.id == user_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "User not found")

    # Get all achievements
    achievements_result = await db.execute(select(Achievement).order_by(Achievement.created_at.asc()))
    all_achievements = achievements_result.scalars().all()

    # Get unlocked achievements for this user
    unlocked_result = await db.execute(
        select(UserAchievement)
        .where(UserAchievement.user_id == user_id)
    )
    unlocked_ids = {str(ua.achievement_id) for ua in unlocked_result.scalars().all()}

    achievements_list = [
        {
            "id": str(a.id),
            "name": a.name,
            "description": a.description,
            "icon": a.icon,
            "xp_reward": a.xp_reward,
            "condition_type": a.condition_type,
            "condition_value": a.condition_value,
            "is_unlocked": str(a.id) in unlocked_ids,
        }
        for a in all_achievements
    ]

    # Get recent XP log
    xp_log_result = await db.execute(
        select(ExperienceLog)
        .where(ExperienceLog.user_id == user_id)
        .order_by(ExperienceLog.created_at.desc())
        .limit(20)
    )
    xp_log = [
        {
            "id": str(x.id),
            "amount": x.amount,
            "source": x.source,
            "description": x.description,
            "created_at": x.created_at.isoformat() if x.created_at else None,
        }
        for x in xp_log_result.scalars().all()
    ]

    return {
        "xp": profile.xp or 0,
        "level": profile.level or 1,
        "referral_code": profile.referral_code,
        "achievements": achievements_list,
        "recent_xp_log": xp_log,
    }


# ============================================================
# SEARCH USERS
# ============================================================

@router.get("/users/search", response_model=List[ProfileResponse])
async def search_users(
    q: str = Query(..., min_length=1),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Profile)
        .where(
            or_(
                Profile.full_name.ilike(f"%{q}%"),
                Profile.email.ilike(f"%{q}%"),
            )
        )
        .order_by(Profile.full_name.asc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    result = await db.execute(query)
    return [ProfileResponse.from_orm(p) for p in result.scalars().all()]


# ============================================================
# PARTICIPATION CHECK
# ============================================================

@router.get("/events/{event_id}/participation/{user_id}")
async def check_participation(event_id: str, user_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(EventParticipant).where(
            EventParticipant.event_id == event_id,
            EventParticipant.user_id == user_id,
            EventParticipant.status == "joined",
        )
    )
    participant = result.scalar_one_or_none()
    return {"is_participating": participant is not None}


# ============================================================
# ADMIN LIST USERS
# ============================================================

@router.get("/admin/users")
async def list_admin_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    _admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(Profile).order_by(Profile.created_at.desc())
    total_result = await db.execute(select(func.count()).select_from(Profile))
    total = total_result.scalar() or 0

    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    users = result.scalars().all()

    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
        "items": [
            {
                "id": str(u.id),
                "email": u.email,
                "full_name": u.full_name,
                "city": u.city,
                "role": u.role,
                "is_active": u.is_active,
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "last_login": u.last_login.isoformat() if u.last_login else None,
            }
            for u in users
        ],
    }


# ============================================================
# HELPERS
# ============================================================

def _event_to_response(event: Event) -> EventResponse:
    creator = None
    if event.creator:
        creator = ProfileResponse.from_orm(event.creator)
    return EventResponse.from_orm(event, creator)


async def _update_lifecycle_statuses(db: AsyncSession):
    now = datetime.utcnow()
    # Mark ongoing
    await db.execute(
        update(Event)
        .where(Event.lifecycle_status == "upcoming", Event.event_date <= now)
        .values(lifecycle_status="ongoing")
    )
    # Mark completed (check end_date or event_date + 24h)
    await db.execute(
        update(Event)
        .where(
            Event.lifecycle_status.in_(["ongoing", "upcoming"]),
            Event.end_date != None,
            Event.end_date <= now
        )
        .values(lifecycle_status="completed")
    )
    await db.flush()


async def _apply_promo_code(db, code: str, price: float, category: str, user_id: str) -> float:
    result = await db.execute(select(PromoCode).where(PromoCode.code == code.upper(), PromoCode.is_active == True))
    promo = result.scalar_one_or_none()
    if not promo:
        raise HTTPException(404, "Invalid promo code")

    now = datetime.utcnow()
    if promo.valid_from and now < promo.valid_from:
        raise HTTPException(400, "Promo code not yet active")
    if promo.valid_until and now > promo.valid_until:
        raise HTTPException(400, "Promo code expired")
    if promo.max_uses and promo.current_uses >= promo.max_uses:
        raise HTTPException(400, "Promo code usage limit reached")
    if promo.min_price and price < promo.min_price:
        raise HTTPException(400, f"Minimum price for this promo: {promo.min_price}")

    # Check per-user limit
    usage = await db.execute(
        select(func.count()).select_from(PromoCodeUsage)
        .where(PromoCodeUsage.promo_code_id == promo.id, PromoCodeUsage.user_id == user_id)
    )
    if promo.max_uses_per_user and usage.scalar() >= promo.max_uses_per_user:
        raise HTTPException(400, "You already used this promo code")

    # Apply discount
    if promo.discount_type == "percentage":
        price = price * (1 - promo.discount_value / 100)
    elif promo.discount_type == "fixed":
        price = max(0, price - promo.discount_value)
    elif promo.discount_type == "free":
        price = 0

    # Record usage
    promo.current_uses = (promo.current_uses or 0) + 1
    db.add(PromoCodeUsage(promo_code_id=promo.id, user_id=user_id))
    await db.flush()

    return round(price, 2)

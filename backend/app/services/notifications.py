from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import Notification, EventParticipant, Profile
import uuid


async def create_notification(
    db: AsyncSession,
    user_id: str,
    event_id: str,
    type: str,
    message: str,
):
    """Create a notification for a user."""
    notif = Notification(
        id=uuid.uuid4(),
        user_id=user_id,
        event_id=event_id,
        type=type,
        message=message,
        is_read=False,
    )
    db.add(notif)
    await db.flush()
    return notif


async def notify_event_participants(
    db: AsyncSession,
    event_id: str,
    type: str,
    message: str,
    exclude_user: str = None,
):
    """Notify all participants of an event."""
    result = await db.execute(
        select(EventParticipant.user_id)
        .where(EventParticipant.event_id == event_id, EventParticipant.status == "joined")
    )
    user_ids = [row[0] for row in result.all()]
    if exclude_user:
        user_ids = [uid for uid in user_ids if str(uid) != exclude_user]

    for uid in user_ids:
        await create_notification(db, uid, event_id, type, message)

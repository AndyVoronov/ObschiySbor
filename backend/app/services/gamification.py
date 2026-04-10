from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import Profile, ExperienceLog, UserAchievement, Achievement, Level


async def award_xp(db: AsyncSession, user_id: str, amount: int, reason: str):
    """Award XP to a user and update their level."""
    profile = await db.execute(select(Profile).where(Profile.id == user_id))
    p = profile.scalar_one_or_none()
    if not p:
        return

    p.xp = (p.xp or 0) + amount

    # Log experience
    log = ExperienceLog(user_id=user_id, xp_amount=amount, reason=reason)
    db.add(log)

    # Update level
    await _update_level(db, p)
    await db.flush()


async def _update_level(db: AsyncSession, profile: Profile):
    """Update user level based on XP."""
    levels = await db.execute(select(Level).order_by(Level.min_xp.asc()))
    all_levels = levels.scalars().all()
    new_level = 1
    for lvl in all_levels:
        if (profile.xp or 0) >= lvl.min_xp:
            new_level = lvl.id
    profile.level = new_level


async def check_achievements(db: AsyncSession, user_id: str):
    """Check and unlock achievements for a user."""
    profile = await db.execute(select(Profile).where(Profile.id == user_id))
    p = profile.scalar_one_or_none()
    if not p:
        return []

    # Get existing achievements
    existing = await db.execute(
        select(UserAchievement.achievement_id).where(UserAchievement.user_id == user_id)
    )
    unlocked = {row[0] for row in existing.all()}

    # Get all achievements
    all_ach = await db.execute(select(Achievement))
    achievements = all_ach.scalars().all()

    newly_unlocked = []
    for ach in achievements:
        if ach.id in unlocked:
            continue
        if await _check_achievement_condition(db, user_id, ach.condition_type, ach.target_value):
            ua = UserAchievement(user_id=user_id, achievement_id=ach.id)
            db.add(ua)
            newly_unlocked.append(ach)
            if ach.xp_reward:
                await award_xp(db, user_id, ach.xp_reward, f"achievement_{ach.name}")

    return newly_unlocked


async def _check_achievement_condition(db: AsyncSession, user_id: str, condition: str, target: int) -> bool:
    """Check if a user meets an achievement condition."""
    from app.models.models import Event, EventParticipant, Review

    if condition == "events_created":
        r = await db.execute(select(func.count()).select_from(Event).where(Event.creator_id == user_id))
        return r.scalar() >= target
    elif condition == "events_joined":
        r = await db.execute(
            select(func.count()).select_from(EventParticipant)
            .where(EventParticipant.user_id == user_id, EventParticipant.status == "joined")
        )
        return r.scalar() >= target
    elif condition == "reviews_written":
        r = await db.execute(select(func.count()).select_from(Review).where(Review.user_id == user_id))
        return r.scalar() >= target
    elif condition == "friends_count":
        from app.models.models import Friendship
        r = await db.execute(
            select(func.count()).select_from(Friendship)
            .where(Friendship.status == "accepted", (
                (Friendship.user_id == user_id) | (Friendship.friend_id == user_id)
            ))
        )
        return r.scalar() >= target
    elif condition == "xp_total":
        p = await db.execute(select(Profile).where(Profile.id == user_id))
        profile = p.scalar_one()
        return (profile.xp or 0) >= target
    return False

"""Database helper functions used by the FastAPI routes.

This module abstracts common CRUD operations such as creating users,
recording review history and maintaining favorites.  The logic is kept
framework agnostic so it can be tested independently of the API layer.
"""

from sqlmodel import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func
from datetime import datetime, timedelta, date
import json
import os
from .models import User, Word, ReviewLog, DeletionRequest, Favorite
from .database import get_session
from .security import get_password_hash, verify_password


def create_user(username: str, password: str, role: str = "user"):
    """Create a new user and persist it to the database and a JSON file."""
    with get_session() as session:
        user = User(
            username=username, hashed_password=get_password_hash(password), role=role
        )
        session.add(user)
        try:
            session.commit()
            session.refresh(user)

            # also store basic user info in users.json for simple persistence
            try:
                with open("users.json", "r", encoding="utf-8") as f:
                    data = json.load(f)
            except FileNotFoundError:
                data = []
            data.append({"id": user.id, "username": user.username, "role": user.role})
            with open("users.json", "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)

            return user
        except IntegrityError:
            session.rollback()
            return None


def authenticate_user(username: str, password: str):
    """Return the user if the credentials are valid, otherwise ``None``."""
    with get_session() as session:
        statement = select(User).where(User.username == username)
        user = session.exec(statement).first()
        if user and verify_password(password, user.hashed_password):
            return user
        return None


def get_due_words(user_id: int, limit: int | None = None):
    """Return words due for review. If *limit* is provided, only that many words
    are returned."""
    today = date.today()
    with get_session() as session:
        statement = select(Word, ReviewLog).join(
            ReviewLog,
            (Word.id == ReviewLog.word_id) & (ReviewLog.user_id == user_id),
            isouter=True,
        )
        words = []
        for word, review in session.exec(statement).all():
            if not review or review.next_review <= today:
                words.append(word)
        if limit is not None:
            words = words[:limit]
        return words


def record_review(user_id: int, word_id: int, quality: int):
    """Update the spaced repetition log for a word review."""
    with get_session() as session:
        log = session.exec(
            select(ReviewLog).where(
                ReviewLog.user_id == user_id, ReviewLog.word_id == word_id
            )
        ).first()
        interval = 1
        if log:
            interval = log.last_interval
        # simple spaced repetition: if quality >=3 double interval else reset
        if quality >= 3:
            interval = interval * 2
        else:
            interval = 1
        next_review = date.today() + timedelta(days=interval)
        if log:
            log.quality = quality
            log.last_interval = interval
            log.next_review = next_review
            log.reviewed_at = datetime.utcnow()
        else:
            log = ReviewLog(
                user_id=user_id,
                word_id=word_id,
                quality=quality,
                last_interval=interval,
                next_review=next_review,
            )
            session.add(log)
        session.commit()
        session.refresh(log)
        return log


def search_words(query: str):
    """Search words case-insensitively and return ones starting with the query
    first."""
    q = query.lower()
    with get_session() as session:
        starts = select(Word).where(func.lower(Word.word).like(f"{q}%"))
        others = (
            select(Word)
            .where(
                (func.lower(Word.word).contains(q))
                | (func.lower(Word.translations).contains(q))
            )
            .where(func.lower(Word.word).not_like(f"{q}%"))
        )
        words = session.exec(starts).all()
        words += session.exec(others).all()
        return words


def get_review_logs(user_id: int):
    """Return all review log entries for the given user."""
    with get_session() as session:
        statement = select(ReviewLog).where(ReviewLog.user_id == user_id)
        return session.exec(statement).all()


def list_users():
    """Return all user objects."""
    with get_session() as session:
        return session.exec(select(User)).all()


def reset_password(user_id: int, new_password: str):
    """Update the stored password hash for the user."""
    with get_session() as session:
        user = session.get(User, user_id)
        if not user:
            return None
        user.hashed_password = get_password_hash(new_password)
        session.add(user)
        session.commit()
        return user


def ensure_default_admin():
    """Create the initial admin account if it doesn't exist."""
    with get_session() as session:
        exists = session.exec(select(User).where(User.username == "Admin")).first()
        if not exists:
            admin = User(
                username="Admin",
                hashed_password=get_password_hash("88888888"),
                role="admin",
            )
            session.add(admin)
            session.commit()
            session.refresh(admin)
            return admin
    return None


def create_deletion_request(user_id: int):
    """Record that a user wants their account removed."""
    with get_session() as session:
        exists = session.exec(
            select(DeletionRequest).where(DeletionRequest.user_id == user_id)
        ).first()
        if exists:
            return exists
        req = DeletionRequest(user_id=user_id)
        session.add(req)
        session.commit()
        session.refresh(req)
        return req


def list_deletion_requests():
    """Return all outstanding deletion requests."""
    with get_session() as session:
        return session.exec(select(DeletionRequest)).all()


def delete_user(user_id: int):
    """Fully remove a user and all related data."""
    with get_session() as session:
        user = session.get(User, user_id)
        if not user:
            return False
        session.query(ReviewLog).filter(ReviewLog.user_id == user_id).delete()
        session.query(DeletionRequest).filter(
            DeletionRequest.user_id == user_id
        ).delete()
        session.delete(user)
        session.commit()

        # remove from users.json if present
        try:
            with open("users.json", "r", encoding="utf-8") as f:
                data = json.load(f)
        except FileNotFoundError:
            data = []
        data = [u for u in data if u.get("id") != user_id]
        with open("users.json", "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True


def add_favorite(user_id: int, word_id: int):
    """Mark a word as a favorite for the user."""
    with get_session() as session:
        exists = session.exec(
            select(Favorite).where(
                Favorite.user_id == user_id, Favorite.word_id == word_id
            )
        ).first()
        if exists:
            return exists
        fav = Favorite(user_id=user_id, word_id=word_id)
        session.add(fav)
        session.commit()
        session.refresh(fav)
        return fav


def remove_favorite(user_id: int, word_id: int) -> bool:
    """Delete a favorite mapping."""
    with get_session() as session:
        fav = session.exec(
            select(Favorite).where(
                Favorite.user_id == user_id, Favorite.word_id == word_id
            )
        ).first()
        if not fav:
            return False
        session.delete(fav)
        session.commit()
        return True


def list_favorites(user_id: int, q: str | None = None):
    """Return a user's favorites, optionally filtered by ``q``."""
    with get_session() as session:
        statement = (
            select(Word, Favorite.added_at)
            .join(Favorite, Favorite.word_id == Word.id)
            .where(Favorite.user_id == user_id)
        )
        if q:
            ql = q.lower()
            statement = statement.where(
                (func.lower(Word.word).contains(ql))
                | (func.lower(Word.translations).contains(ql))
            )
        statement = statement.order_by(Favorite.added_at.desc())
        return session.exec(statement).all()


def sync_wordbooks(directory: str):
    """Add any words found in *directory* that are missing from the database."""
    if not directory or not os.path.exists(directory):
        return

    with get_session() as session:
        existing = {w.word.lower(): w.id for w in session.exec(select(Word)).all()}

        for fn in os.listdir(directory):
            if not fn.startswith("wordBook_") or not fn.endswith(".json"):
                continue
            path = os.path.join(directory, fn)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
            except Exception:
                continue
            for w in data:
                key = w.get("word", "").lower()
                if not key or key in existing:
                    continue
                word = Word(
                    word=w["word"],
                    translations=json.dumps(
                        w.get("translations", []), ensure_ascii=False
                    ),
                    phrases=json.dumps(w.get("phrases", []), ensure_ascii=False),
                )
                session.add(word)
                existing[key] = True
        session.commit()

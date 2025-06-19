from sqlmodel import select
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timedelta, date
import json
from .models import User, Word, ReviewLog, DeletionRequest, Favorite
from .database import get_session
from .security import get_password_hash, verify_password


def create_user(username: str, password: str, role: str = "user"):
    """Create a new user and persist it to the database and a JSON file."""
    with get_session() as session:
        user = User(username=username, hashed_password=get_password_hash(password), role=role)
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
    with get_session() as session:
        log = session.exec(select(ReviewLog).where(ReviewLog.user_id == user_id, ReviewLog.word_id == word_id)).first()
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
            log = ReviewLog(user_id=user_id, word_id=word_id, quality=quality, last_interval=interval, next_review=next_review)
            session.add(log)
        session.commit()
        session.refresh(log)
        return log


def search_words(query: str):
    q = query.lower()
    with get_session() as session:
        statement = select(Word).where(
            (Word.word.contains(q)) | (Word.translations.contains(q))
        )
        return session.exec(statement).all()


def get_review_logs(user_id: int):
    with get_session() as session:
        statement = select(ReviewLog).where(ReviewLog.user_id == user_id)
        return session.exec(statement).all()


def list_users():
    with get_session() as session:
        return session.exec(select(User)).all()


def reset_password(user_id: int, new_password: str):
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
    with get_session() as session:
        return session.exec(select(DeletionRequest)).all()


def delete_user(user_id: int):
    with get_session() as session:
        user = session.get(User, user_id)
        if not user:
            return False
        session.query(ReviewLog).filter(ReviewLog.user_id == user_id).delete()
        session.query(DeletionRequest).filter(DeletionRequest.user_id == user_id).delete()
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


def list_favorites(user_id: int):
    with get_session() as session:
        statement = (
            select(Word)
            .join(Favorite, Favorite.word_id == Word.id)
            .where(Favorite.user_id == user_id)
        )
        return session.exec(statement).all()

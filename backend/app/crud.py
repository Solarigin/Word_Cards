from sqlmodel import select
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timedelta, date
from .models import User, Word, ReviewLog
from .database import get_session
from .security import get_password_hash, verify_password


def create_user(username: str, password: str, role: str = "user"):
    with get_session() as session:
        user = User(username=username, hashed_password=get_password_hash(password), role=role)
        session.add(user)
        try:
            session.commit()
            session.refresh(user)
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


def get_due_words(user_id: int):
    today = date.today()
    with get_session() as session:
        statement = select(Word, ReviewLog).join(ReviewLog, Word.id == ReviewLog.word_id, isouter=True).where(
            (ReviewLog.user_id == user_id) | (ReviewLog.user_id.is_(None))
        )
        words = []
        for word, review in session.exec(statement).all():
            if not review or review.next_review <= today:
                words.append(word)
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

"""SQLModel table definitions for the application."""

from typing import Optional
from datetime import datetime, date
from sqlmodel import SQLModel, Field


class User(SQLModel, table=True):
    """Application user stored with a hashed password."""

    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    hashed_password: str
    role: str = Field(default="user")


class Word(SQLModel, table=True):
    """Vocabulary word along with translations and example phrases."""

    id: Optional[int] = Field(default=None, primary_key=True)
    word: str = Field(index=True)
    translations: str  # JSON string
    phrases: Optional[str] = None  # JSON string


class ReviewLog(SQLModel, table=True):
    """Spaced repetition history for each user/word pair."""

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    word_id: int = Field(foreign_key="word.id")
    quality: int
    last_interval: int
    next_review: date
    reviewed_at: datetime = Field(default_factory=datetime.utcnow)


class DeletionRequest(SQLModel, table=True):
    """Record of a user requesting account deletion."""

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    requested_at: datetime = Field(default_factory=datetime.utcnow)


class Favorite(SQLModel, table=True):
    """A word bookmarked by a user for later reference."""

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    word_id: int = Field(foreign_key="word.id")
    added_at: datetime = Field(default_factory=datetime.utcnow)

from typing import Optional
from datetime import datetime, date
from sqlmodel import SQLModel, Field

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    hashed_password: str
    role: str = Field(default="user")

class Word(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    word: str = Field(index=True)
    translations: str  # JSON string
    phrases: Optional[str] = None  # JSON string

class ReviewLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    word_id: int = Field(foreign_key="word.id")
    quality: int
    last_interval: int
    next_review: date
    reviewed_at: datetime = Field(default_factory=datetime.utcnow)

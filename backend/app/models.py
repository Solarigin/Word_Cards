"""SQLModel table definitions for the application."""

from typing import Optional
from datetime import datetime, date
from sqlmodel import SQLModel, Field


class User(SQLModel, table=True):
    """应用用户，密码以哈希形式存储。"""

    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    hashed_password: str
    role: str = Field(default="user")


class Word(SQLModel, table=True):
    """词汇条目及其翻译和例句。"""

    id: Optional[int] = Field(default=None, primary_key=True)
    word: str = Field(index=True)
    translations: str  # JSON 字符串
    phrases: Optional[str] = None  # JSON 字符串


class ReviewLog(SQLModel, table=True):
    """每个用户/单词对的间隔重复历史。"""

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    word_id: int = Field(foreign_key="word.id")
    quality: int
    last_interval: int
    next_review: date
    reviewed_at: datetime = Field(default_factory=datetime.utcnow)


class DeletionRequest(SQLModel, table=True):
    """用户请求删除账户的记录。"""

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    requested_at: datetime = Field(default_factory=datetime.utcnow)


class Favorite(SQLModel, table=True):
    """用户收藏以便日后查阅的单词。"""

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    word_id: int = Field(foreign_key="word.id")
    added_at: datetime = Field(default_factory=datetime.utcnow)

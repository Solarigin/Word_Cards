"""Pydantic models used for request and response bodies."""

from typing import Optional, List
from datetime import date, datetime
from pydantic import BaseModel


class UserCreate(BaseModel):
    """Data required to register a new user."""

    username: str
    password: str


class Token(BaseModel):
    """JWT access token returned after authentication."""

    access_token: str
    token_type: str = "bearer"


class WordOut(BaseModel):
    """Word information sent to the frontend."""

    id: int
    word: str
    translations: list
    phrases: Optional[list] = None
    added_at: Optional[datetime] = None


class ReviewIn(BaseModel):
    """Quality score sent when reviewing a word."""

    quality: int


class StatsOut(BaseModel):
    """Aggregated statistics for the current user."""

    reviewed: int
    due: int
    next_due: Optional[date] = None


class UserOut(BaseModel):
    """Public user information."""

    id: int
    username: str
    role: str


class UserUpdate(BaseModel):
    """Payload for updating a username."""

    username: str


class PasswordUpdate(BaseModel):
    """Payload for changing a password."""

    old_password: str
    new_password: str


class TranslationRequest(BaseModel):
    """Request body for the /translate endpoint."""

    text: str
    lang: str


class ArticleRequest(BaseModel):
    """Request body for generating an article from favorite words."""

    word_ids: List[int]

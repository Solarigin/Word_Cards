from typing import Optional, List
from datetime import date
from pydantic import BaseModel

class UserCreate(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class WordOut(BaseModel):
    id: int
    word: str
    translations: list
    phrases: Optional[list] = None

class ReviewIn(BaseModel):
    quality: int

class StatsOut(BaseModel):
    reviewed: int
    due: int
    next_due: Optional[date] = None


class UserOut(BaseModel):
    id: int
    username: str
    role: str


class UserUpdate(BaseModel):
    username: str


class PasswordUpdate(BaseModel):
    old_password: str
    new_password: str


class TranslationRequest(BaseModel):
    text: str
    lang: str


class ArticleRequest(BaseModel):
    word_ids: List[int]

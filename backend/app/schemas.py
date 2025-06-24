"""用于请求和响应数据的 Pydantic 模型。"""

from typing import Optional, List
from datetime import date, datetime
from pydantic import BaseModel


class UserCreate(BaseModel):
    """注册新用户所需的数据。"""

    username: str
    password: str


class Token(BaseModel):
    """认证后返回的 JWT 访问令牌。"""

    access_token: str
    token_type: str = "bearer"


class WordOut(BaseModel):
    """发送给前端的单词信息。"""

    id: int
    word: str
    translations: list
    phrases: Optional[list] = None
    added_at: Optional[datetime] = None


class ReviewIn(BaseModel):
    """复习单词时提交的质量评分。"""

    quality: int


class StatsOut(BaseModel):
    """当前用户的汇总统计数据。"""

    reviewed: int
    due: int
    next_due: Optional[date] = None


class UserOut(BaseModel):
    """公开的用户信息。"""

    id: int
    username: str
    role: str


class UserUpdate(BaseModel):
    """更新用户名的请求体。"""

    username: str


class PasswordUpdate(BaseModel):
    """修改密码的请求体。"""

    old_password: str
    new_password: str


class TranslationRequest(BaseModel):
    """/translate 接口的请求体。"""

    text: str
    lang: str


class ArticleRequest(BaseModel):
    """根据收藏单词生成文章的请求体。"""

    word_ids: List[int]

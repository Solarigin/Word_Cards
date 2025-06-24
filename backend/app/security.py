"""密码哈希与 JWT 辅助工具。"""

from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta, UTC
import os

# SECRET_KEY 控制 JWT 的签名密钥，生产环境应通过环境变量提供；
# 如果未设置则随机生成，使每次开发运行的值都唯一。
import secrets

SECRET_KEY = os.getenv("SECRET_KEY") or secrets.token_urlsafe(32)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 120

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password: str) -> str:
    """返回给定明文密码的 bcrypt 哈希值。"""
    return pwd_context.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    """将 *password* 与已有的 bcrypt 哈希进行比对。"""
    return pwd_context.verify(password, hashed)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """创建包含 *data* 的签名 JWT。"""
    to_encode = data.copy()
    expire = datetime.now(UTC) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str):
    """解码 JWT 并返回其中的负载。"""
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

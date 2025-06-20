from sqlmodel import SQLModel, create_engine, Session
import os
from .models import User

DATABASE_URL = "sqlite:///./wordcards.db"
engine = create_engine(DATABASE_URL, echo=False)

# Optional MySQL configuration for user data
MYSQL_ENABLED = os.environ.get("MYSQL_ENABLED") == "1"
if MYSQL_ENABLED:
    MYSQL_USER = os.environ.get("MYSQL_USER", "root")
    MYSQL_PASSWORD = os.environ.get("MYSQL_PASSWORD", "111111")
    MYSQL_HOST = os.environ.get("MYSQL_HOST", "localhost")
    MYSQL_DB = os.environ.get("MYSQL_DB", "Word_Cards")
    MYSQL_URL = (
        f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}/{MYSQL_DB}"
    )
    user_engine = create_engine(MYSQL_URL, echo=False)
else:
    user_engine = engine


def init_db():
    global user_engine
    SQLModel.metadata.create_all(engine)
    if user_engine is not engine:
        try:
            User.__table__.create(user_engine, checkfirst=True)
        except Exception as exc:
            # Fallback to SQLite if MySQL initialization fails
            print("Warning: MySQL init failed", exc)
            user_engine = engine


def get_session():
    return Session(engine)


def get_user_session():
    return Session(user_engine)

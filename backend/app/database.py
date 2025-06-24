"""与数据库引擎交互的辅助函数。"""

from sqlmodel import SQLModel, create_engine, Session

DATABASE_URL = "sqlite:///./wordcards.db"
engine = create_engine(DATABASE_URL, echo=False)


def init_db():
    """根据 SQLModel 元数据创建表。"""
    SQLModel.metadata.create_all(engine)


def get_session():
    """生成新的数据库会话。"""
    return Session(engine)

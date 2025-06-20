import os
from sqlmodel import SQLModel, create_engine, Session

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "mysql+pymysql://root:111111@127.0.0.1:3306/Word_Cards?charset=utf8mb4",
)
engine = create_engine(DATABASE_URL, echo=False)

def init_db():
    SQLModel.metadata.create_all(engine)


def get_session():
    return Session(engine)

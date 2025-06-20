import os
from sqlmodel import SQLModel, create_engine, Session

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "mysql+pymysql://root:111111@/Word_Cards?unix_socket=/tmp/mysql.sock",
)
engine = create_engine(DATABASE_URL, echo=False)

def init_db():
    SQLModel.metadata.create_all(engine)


def get_session():
    return Session(engine)

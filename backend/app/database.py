"""Utility functions for interacting with the database engine."""

from sqlmodel import SQLModel, create_engine, Session

DATABASE_URL = "sqlite:///./wordcards.db"
engine = create_engine(DATABASE_URL, echo=False)


def init_db():
    """Create tables based on the SQLModel metadata."""
    SQLModel.metadata.create_all(engine)


def get_session():
    """Yield a new database session."""
    return Session(engine)

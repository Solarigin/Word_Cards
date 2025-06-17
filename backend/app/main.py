from fastapi import FastAPI, Depends, HTTPException, status, Response
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from jose import JWTError
import json
import os
import csv
import io
from sqlmodel import select
from sqlalchemy import func

from .database import init_db, get_session
from .models import User, Word
from .schemas import (
    UserCreate,
    Token,
    WordOut,
    ReviewIn,
    StatsOut,
    UserOut,
    UserUpdate,
    PasswordUpdate,
)
from . import crud
from .security import create_access_token, decode_token

app = FastAPI(title="Word Cards")

# Allow frontend development server to access the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

init_db()

# import words from json on first run

if not os.path.exists("wordcards.db"):
    init_db()

with get_session() as session:
    if not session.exec(select(Word)).first():
        with open(os.path.join(os.path.dirname(__file__), "..", "..", "TEST_Words.json"), "r", encoding="utf-8") as f:
            data = json.load(f)
            for w in data:
                word = Word(word=w["word"], translations=json.dumps(w["translations"], ensure_ascii=False),
                            phrases=json.dumps(w.get("phrases", []), ensure_ascii=False))
                session.add(word)
            session.commit()

    # ensure default admin account exists
    crud.ensure_default_admin()

@app.post("/auth/register", response_model=Token)
def register(user: UserCreate):
    u = crud.create_user(user.username, user.password)
    if not u:
        raise HTTPException(status_code=400, detail="Username taken")
    access = create_access_token({"sub": str(u.id)})
    return Token(access_token=access)

@app.post("/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = crud.authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    access = create_access_token({"sub": str(user.id)})
    return Token(access_token=access)


@app.post("/auth/refresh", response_model=Token)
def refresh(token: str = Depends(oauth2_scheme)):
    try:
        payload = decode_token(token)
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    access = create_access_token({"sub": user_id})
    return Token(access_token=access)

def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(status_code=401, detail="Could not validate credentials")
    try:
        payload = decode_token(token)
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    with get_session() as session:
        user = session.get(User, int(user_id))
        if user is None:
            raise credentials_exception
        return user

@app.get("/words/today", response_model=List[WordOut])
def words_today(limit: int | None = None, current_user: User = Depends(get_current_user)):
    words = crud.get_due_words(current_user.id, limit)
    result = []
    for w in words:
        result.append(WordOut(id=w.id, word=w.word, translations=json.loads(w.translations), phrases=json.loads(w.phrases) if w.phrases else []))
    return result

@app.post("/review/{word_id}")
def review_word(word_id: int, info: ReviewIn, current_user: User = Depends(get_current_user)):
    crud.record_review(current_user.id, word_id, info.quality)
    return {"status": "ok"}

@app.get("/search", response_model=List[WordOut])
def search(q: str, current_user: User = Depends(get_current_user)):
    words = crud.search_words(q)
    result = []
    for w in words:
        result.append(WordOut(id=w.id, word=w.word, translations=json.loads(w.translations), phrases=json.loads(w.phrases) if w.phrases else []))
    return result

@app.get("/stats/overview", response_model=StatsOut)
def stats_overview(current_user: User = Depends(get_current_user)):
    with get_session() as session:
        result = session.exec(
            select(func.count()).select_from(crud.ReviewLog).where(
                crud.ReviewLog.user_id == current_user.id
            )
        )
        reviewed = result.one()

        due_words = crud.get_due_words(current_user.id)

        next_due_result = session.exec(
            select(func.min(crud.ReviewLog.next_review)).where(
                crud.ReviewLog.user_id == current_user.id
            )
        )
        next_due = next_due_result.one()

        return StatsOut(reviewed=reviewed, due=len(due_words), next_due=next_due)


@app.get("/stats/export")
def stats_export(current_user: User = Depends(get_current_user)):
    logs = crud.get_review_logs(current_user.id)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["word_id", "quality", "last_interval", "next_review", "reviewed_at"])
    for log in logs:
        writer.writerow([
            log.word_id,
            log.quality,
            log.last_interval,
            log.next_review.isoformat(),
            log.reviewed_at.isoformat(),
        ])
    return Response(content=output.getvalue(), media_type="text/csv")

@app.get("/admin/users")
def admin_users(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    users = crud.list_users()
    return [{"id": u.id, "username": u.username, "role": u.role} for u in users]

@app.put("/admin/users/{user_id}/reset_pwd")
def admin_reset(user_id: int, password: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    crud.reset_password(user_id, password)
    return {"status": "ok"}


@app.get("/users/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return UserOut(id=current_user.id, username=current_user.username, role=current_user.role)


@app.put("/users/me", response_model=UserOut)
def update_me(info: UserUpdate, current_user: User = Depends(get_current_user)):
    with get_session() as session:
        user = session.get(User, current_user.id)
        user.username = info.username
        session.add(user)
        session.commit()
        session.refresh(user)
        return UserOut(id=user.id, username=user.username, role=user.role)


@app.put("/users/me/password")
def change_password(info: PasswordUpdate, current_user: User = Depends(get_current_user)):
    crud.reset_password(current_user.id, info.password)
    return {"status": "ok"}


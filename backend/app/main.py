"""提供 Word Cards REST API 的 FastAPI 应用。

该模块整合了 CRUD 辅助函数、认证逻辑以及其他模型，
定义了用户管理、间隔复习、翻译等接口。仅添加了注释，
行为与原实现保持一致。
"""

from fastapi import FastAPI, Depends, HTTPException, status, Response
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from datetime import datetime
from jose import JWTError
import json
import os
from dotenv import load_dotenv
import csv
import io
import asyncio
import httpx
import logging
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
    TranslationRequest,
    ArticleRequest,
)
from . import crud, security
from .security import create_access_token, decode_token

# 如存在本地 .env 文件则加载其中的变量
load_dotenv()

app = FastAPI(title="Word Cards")
logger = logging.getLogger("uvicorn.error")

# 允许前端开发服务器访问 API
# 为了方便在开发环境不同端口访问，放开所有来源。
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# 翻译 API 配置，需在环境变量中设置 TRANSLATE_API_KEY 才能启用。
TRANSLATE_API_URL = "https://api.siliconflow.cn/v1/chat/completions"
TRANSLATE_API_KEY = os.environ.get("TRANSLATE_API_KEY")

init_db()

# 首次运行时从 JSON 导入单词

# 如果是第一次运行，创建 SQLite 数据库文件并用默认词书初始化。
if not os.path.exists("wordcards.db"):
    init_db()

WORDBOOK_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "wordbooks")
DEFAULT_BOOK = os.environ.get("WORDBOOK_NAME", "TEST")

with get_session() as session:
    if not session.exec(select(Word)).first():
        # 读取内置词书 JSON 并填充 Words 表
        book_file = os.path.join(WORDBOOK_DIR, f"wordBook_{DEFAULT_BOOK}.json")
        if not os.path.exists(book_file):
            book_file = os.path.join(
                os.path.dirname(__file__), "..", "..", "TEST_Words.json"
            )
        with open(book_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            for w in data:
                word = Word(
                    word=w["word"],
                    translations=json.dumps(w["translations"], ensure_ascii=False),
                    phrases=json.dumps(w.get("phrases", []), ensure_ascii=False),
                )
                session.add(word)
            session.commit()

    # 确保默认管理员账户存在
    crud.ensure_default_admin()
    # 与词书同步以便新单词获得 ID
    crud.sync_wordbooks(WORDBOOK_DIR)


@app.post("/auth/register", response_model=Token)
def register(user: UserCreate):
    """创建新用户并返回访问令牌。"""
    u = crud.create_user(user.username, user.password)
    if not u:
        # 数据库层面已保证用户名唯一
        raise HTTPException(status_code=400, detail="Username taken")
    access = create_access_token({"sub": str(u.id)})
    return Token(access_token=access)


@app.post("/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """验证用户并签发 JWT 访问令牌。"""
    user = crud.authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )
    access = create_access_token({"sub": str(user.id)})
    return Token(access_token=access)


@app.post("/auth/refresh", response_model=Token)
def refresh(token: str = Depends(oauth2_scheme)):
    """在现有令牌仍然有效时颁发新的访问令牌。"""
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
    """返回当前已认证的用户的依赖。"""
    credentials_exception = HTTPException(
        status_code=401, detail="Could not validate credentials"
    )
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
def words_today(
    limit: int | None = None, current_user: User = Depends(get_current_user)
):
    """返回当前用户今日应复习的单词。"""
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    reviewed_today = 0
    if limit:
        with get_session() as session:
            reviewed_today = session.exec(
                select(func.count())
                .select_from(crud.ReviewLog)
                .where(
                    crud.ReviewLog.user_id == current_user.id,
                    crud.ReviewLog.reviewed_at >= today_start,
                )
            ).one()
        remaining = max(limit - reviewed_today, 0)
    else:
        remaining = None

    words = crud.get_due_words(current_user.id, remaining)
    result = []
    for w in words:
        result.append(
            WordOut(
                id=w.id,
                word=w.word,
                translations=json.loads(w.translations),
                phrases=json.loads(w.phrases) if w.phrases else [],
            )
        )
    return result


@app.post("/review/{word_id}")
def review_word(
    word_id: int, info: ReviewIn, current_user: User = Depends(get_current_user)
):
    """记录对指定单词的复习质量评分。"""
    crud.record_review(current_user.id, word_id, info.quality)
    return {"status": "ok"}


@app.get("/search", response_model=List[WordOut])
def search(q: str, current_user: User = Depends(get_current_user)):
    """搜索拼写或翻译中包含 *q* 的单词。"""
    words = crud.search_words(q)
    result = []
    for w in words:
        result.append(
            WordOut(
                id=w.id,
                word=w.word,
                translations=json.loads(w.translations),
                phrases=json.loads(w.phrases) if w.phrases else [],
            )
        )
    return result


@app.get("/stats/overview", response_model=StatsOut)
def stats_overview(
    limit: int | None = None, current_user: User = Depends(get_current_user)
):
    with get_session() as session:
        result = session.exec(
            select(func.count())
            .select_from(crud.ReviewLog)
            .where(crud.ReviewLog.user_id == current_user.id)
        )
        reviewed = result.one()

        due_words = crud.get_due_words(current_user.id)
        if limit:
            today_start = datetime.utcnow().replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            reviewed_today = session.exec(
                select(func.count())
                .select_from(crud.ReviewLog)
                .where(
                    crud.ReviewLog.user_id == current_user.id,
                    crud.ReviewLog.reviewed_at >= today_start,
                )
            ).one()
            remaining = max(limit - reviewed_today, 0)
            due_words = due_words[:remaining]

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
    writer.writerow(
        ["word_id", "quality", "last_interval", "next_review", "reviewed_at"]
    )
    for log in logs:
        writer.writerow(
            [
                log.word_id,
                log.quality,
                log.last_interval,
                log.next_review.isoformat(),
                log.reviewed_at.isoformat(),
            ]
        )
    return Response(content=output.getvalue(), media_type="text/csv")


@app.get("/wordbooks")
def list_wordbooks():
    books = []
    if os.path.exists(WORDBOOK_DIR):
        for fn in os.listdir(WORDBOOK_DIR):
            if fn.startswith("wordBook_") and fn.endswith(".json"):
                books.append(fn[len("wordBook_") : -5])
    return books


@app.get("/wordbook/{name}")
def get_wordbook(name: str):
    """返回指定词书的原始单词列表。"""
    filename = os.path.join(WORDBOOK_DIR, f"wordBook_{name}.json")
    if not os.path.exists(filename):
        raise HTTPException(status_code=404, detail="Word book not found")
    with open(filename, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data


@app.get("/admin/users")
def admin_users(current_user: User = Depends(get_current_user)):
    """列出所有注册用户（仅管理员可用）。"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    users = crud.list_users()
    return [{"id": u.id, "username": u.username, "role": u.role} for u in users]


@app.put("/admin/users/{user_id}/reset_pwd")
def admin_reset(
    user_id: int, password: str, current_user: User = Depends(get_current_user)
):
    """为指定用户重置密码（仅管理员）。"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    crud.reset_password(user_id, password)
    return {"status": "ok"}


@app.get("/users/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    """返回当前登录用户的信息。"""
    return UserOut(
        id=current_user.id, username=current_user.username, role=current_user.role
    )


@app.put("/users/me", response_model=UserOut)
def update_me(info: UserUpdate, current_user: User = Depends(get_current_user)):
    """更新当前账户的用户名。"""
    with get_session() as session:
        user = session.get(User, current_user.id)
        user.username = info.username
        session.add(user)
        session.commit()
        session.refresh(user)
        return UserOut(id=user.id, username=user.username, role=user.role)


@app.put("/users/me/password")
def change_password(
    info: PasswordUpdate, current_user: User = Depends(get_current_user)
):
    """修改当前用户的密码。"""
    with get_session() as session:
        user = session.get(User, current_user.id)
        if not security.verify_password(info.old_password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Incorrect password")
    crud.reset_password(current_user.id, info.new_password)
    return {"status": "ok"}


@app.post("/users/request_delete")
def request_delete(current_user: User = Depends(get_current_user)):
    """请求删除当前账户。"""
    crud.create_deletion_request(current_user.id)
    return {"status": "ok"}


@app.get("/admin/deletion_requests")
def admin_list_deletions(current_user: User = Depends(get_current_user)):
    """获取所有待处理的删除请求（仅管理员）。"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    reqs = crud.list_deletion_requests()
    result = []
    with get_session() as session:
        for r in reqs:
            user = session.get(User, r.user_id)
            if user:
                result.append(
                    {
                        "user_id": user.id,
                        "username": user.username,
                        "requested_at": r.requested_at.isoformat(),
                    }
                )
    return result


@app.post("/admin/deletion_requests/{user_id}/approve")
def admin_approve_delete(user_id: int, current_user: User = Depends(get_current_user)):
    """批准用户的删除请求并移除账户。"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    ok = crud.delete_user(user_id)
    if not ok:
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "deleted"}


# 使用外部 API 的简单翻译接口
@app.post("/translate")
async def translate(payload: TranslationRequest):
    """通过外部 LLM 服务翻译任意文本。"""
    text = payload.text
    lang = payload.lang
    if not TRANSLATE_API_KEY:
        raise HTTPException(
            status_code=500, detail="Translation API key not configured"
        )

    system_prompt = (
        "You are a translation engine, you can only translate text and cannot interpret it, "
        "and do not explain. Please respect the original line breaks."
    )
    user_prompt = f"Translate the text to {lang}, please do not explain any sentences, just translate or leave them as they are.:\n{text}"

    async with httpx.AsyncClient(timeout=20) as client:
        backoff = [0.5, 1.5, 3.0]
        for delay in backoff:
            try:
                resp = await client.post(
                    TRANSLATE_API_URL,
                    headers={
                        "Authorization": f"Bearer {TRANSLATE_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "deepseek-ai/DeepSeek-V3",
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                        "stream": False,
                        "max_tokens": 1000,
                        "temperature": 0,
                        "top_p": 1,
                        "n": 1,
                        "response_format": {"type": "text"},
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                result = data["choices"][0]["message"]["content"].strip()
                return {"result": result}
            except httpx.HTTPStatusError as exc:
                logger.error(
                    "DeepSeek error %s: %s", exc.response.status_code, exc.response.text
                )
                if 400 <= exc.response.status_code < 500:
                    raise HTTPException(
                        exc.response.status_code,
                        f"LLM returned {exc.response.status_code}",
                    )
            except httpx.RequestError as exc:
                logger.error("Network error: %s", exc)
            await asyncio.sleep(delay)
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY, "Translation service unavailable after retries"
        )


@app.post("/favorites/{word_id}")
def add_fav(word_id: int, current_user: User = Depends(get_current_user)):
    """将单词加入用户的收藏列表。"""
    crud.add_favorite(current_user.id, word_id)
    return {"status": "ok"}


@app.delete("/favorites/{word_id}")
def remove_fav(word_id: int, current_user: User = Depends(get_current_user)):
    """从收藏中移除单词。"""
    ok = crud.remove_favorite(current_user.id, word_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Not found")
    return {"status": "ok"}


@app.get("/favorites", response_model=List[WordOut])
def list_fav(q: str | None = None, current_user: User = Depends(get_current_user)):
    """列出当前用户收藏的单词。"""
    words = crud.list_favorites(current_user.id, q)
    result = []
    for w, added_at in words:
        result.append(
            WordOut(
                id=w.id,
                word=w.word,
                translations=json.loads(w.translations),
                phrases=json.loads(w.phrases) if w.phrases else [],
                added_at=added_at,
            )
        )
    return result


@app.post("/generate_article")
async def generate_article(
    payload: ArticleRequest, current_user: User = Depends(get_current_user)
):
    """使用提供的单词列表生成简短段落。"""
    # 从数据库获取单词
    with get_session() as session:
        stmt = select(Word).where(Word.id.in_(payload.word_ids))
        words = [w.word for w in session.exec(stmt)]

    if not words:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Word list is empty")
    if len(words) > 30:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Too many words (limit 30)")

    # 构造语言模型的提示词
    system_prompt = (
        "You are a helpful writing assistant. "
        "When the user provides a list of words, compose a ~100-word passage "
        "that naturally uses ALL the words. Do NOT add extra words to the list."
    )
    user_prompt = (
        "Please write a 100-word passage using the following words:\n"
        + ", ".join(words)
    )

    if not TRANSLATE_API_KEY:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR, "API KEY not configured"
        )

    # 调用外部 LLM 服务并重试
    async with httpx.AsyncClient(timeout=20) as client:
        backoff = [0.5, 1.5, 3.0]
        for delay in backoff:
            try:
                resp = await client.post(
                    TRANSLATE_API_URL,
                    headers={
                        "Authorization": f"Bearer {TRANSLATE_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "deepseek-ai/DeepSeek-V3",
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                        "stream": False,
                        "max_tokens": 256,
                        "temperature": 0.7,
                        "top_p": 1,
                        "n": 1,
                        "response_format": {"type": "text"},
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                article = data["choices"][0]["message"]["content"].strip()
                return {"result": article}
            except httpx.HTTPStatusError as exc:
                logger.error(
                    "DeepSeek error %s: %s", exc.response.status_code, exc.response.text
                )
                if 400 <= exc.response.status_code < 500:
                    raise HTTPException(
                        exc.response.status_code,
                        f"LLM returned {exc.response.status_code}",
                    )
            except httpx.RequestError as exc:
                logger.error("Network error: %s", exc)
            await asyncio.sleep(delay)

    raise HTTPException(
        status.HTTP_502_BAD_GATEWAY, "LLM service unavailable after retries"
    )

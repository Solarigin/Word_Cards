"""FastAPI 路由使用的数据库辅助函数。

该模块封装创建用户、记录复习历史和维护收藏等常见 CRUD 操作，
逻辑与框架无关，便于独立于 API 层进行测试。
"""

from sqlmodel import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func
from datetime import datetime, timedelta, date
import json
import os
from .models import User, Word, ReviewLog, DeletionRequest, Favorite
from .database import get_session
from .security import get_password_hash, verify_password


def create_user(username: str, password: str, role: str = "user"):
    """创建新用户并保存到数据库和 JSON 文件。"""
    with get_session() as session:
        user = User(
            username=username, hashed_password=get_password_hash(password), role=role
        )
        session.add(user)
        try:
            session.commit()
            session.refresh(user)

            # 同时将基本用户信息写入 users.json 便于简单持久化
            try:
                with open("users.json", "r", encoding="utf-8") as f:
                    data = json.load(f)
            except FileNotFoundError:
                data = []
            data.append({"id": user.id, "username": user.username, "role": user.role})
            with open("users.json", "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)

            return user
        except IntegrityError:
            session.rollback()
            return None


def authenticate_user(username: str, password: str):
    """凭据正确时返回用户对象，否则返回 ``None``。"""
    with get_session() as session:
        statement = select(User).where(User.username == username)
        user = session.exec(statement).first()
        if user and verify_password(password, user.hashed_password):
            return user
        return None


def get_due_words(user_id: int, limit: int | None = None):
    """获取需要复习的单词，若提供 *limit* 则只返回相应数量。"""
    today = date.today()
    with get_session() as session:
        statement = select(Word, ReviewLog).join(
            ReviewLog,
            (Word.id == ReviewLog.word_id) & (ReviewLog.user_id == user_id),
            isouter=True,
        )
        words = []
        for word, review in session.exec(statement).all():
            if not review or review.next_review <= today:
                words.append(word)
        if limit is not None:
            words = words[:limit]
        return words


def record_review(user_id: int, word_id: int, quality: int):
    """更新单词复习的间隔重复记录。"""
    with get_session() as session:
        log = session.exec(
            select(ReviewLog).where(
                ReviewLog.user_id == user_id, ReviewLog.word_id == word_id
            )
        ).first()
        interval = 1
        if log:
            interval = log.last_interval
        # 简单的间隔重复：quality>=3 时间隔翻倍，否则重置
        if quality >= 3:
            interval = interval * 2
        else:
            interval = 1
        next_review = date.today() + timedelta(days=interval)
        if log:
            log.quality = quality
            log.last_interval = interval
            log.next_review = next_review
            log.reviewed_at = datetime.utcnow()
        else:
            log = ReviewLog(
                user_id=user_id,
                word_id=word_id,
                quality=quality,
                last_interval=interval,
                next_review=next_review,
            )
            session.add(log)
        session.commit()
        session.refresh(log)
        return log


def search_words(query: str):
    """不区分大小写搜索单词，优先返回以查询开头的结果。"""
    q = query.lower()
    with get_session() as session:
        starts = select(Word).where(func.lower(Word.word).like(f"{q}%"))
        others = (
            select(Word)
            .where(
                (func.lower(Word.word).contains(q))
                | (func.lower(Word.translations).contains(q))
            )
            .where(func.lower(Word.word).not_like(f"{q}%"))
        )
        words = session.exec(starts).all()
        words += session.exec(others).all()
        return words


def get_review_logs(user_id: int):
    """返回指定用户的所有复习记录。"""
    with get_session() as session:
        statement = select(ReviewLog).where(ReviewLog.user_id == user_id)
        return session.exec(statement).all()


def list_users():
    """返回所有用户对象。"""
    with get_session() as session:
        return session.exec(select(User)).all()


def reset_password(user_id: int, new_password: str):
    """更新用户的密码哈希。"""
    with get_session() as session:
        user = session.get(User, user_id)
        if not user:
            return None
        user.hashed_password = get_password_hash(new_password)
        session.add(user)
        session.commit()
        return user


def ensure_default_admin():
    """如不存在则创建初始管理员账户。"""
    with get_session() as session:
        exists = session.exec(select(User).where(User.username == "Admin")).first()
        if not exists:
            admin = User(
                username="Admin",
                hashed_password=get_password_hash("88888888"),
                role="admin",
            )
            session.add(admin)
            session.commit()
            session.refresh(admin)
            return admin
    return None


def create_deletion_request(user_id: int):
    """记录用户希望删除账户的请求。"""
    with get_session() as session:
        exists = session.exec(
            select(DeletionRequest).where(DeletionRequest.user_id == user_id)
        ).first()
        if exists:
            return exists
        req = DeletionRequest(user_id=user_id)
        session.add(req)
        session.commit()
        session.refresh(req)
        return req


def list_deletion_requests():
    """返回所有未处理的删除请求。"""
    with get_session() as session:
        return session.exec(select(DeletionRequest)).all()


def delete_user(user_id: int):
    """彻底删除用户及其所有相关数据。"""
    with get_session() as session:
        user = session.get(User, user_id)
        if not user:
            return False
        session.query(ReviewLog).filter(ReviewLog.user_id == user_id).delete()
        session.query(DeletionRequest).filter(
            DeletionRequest.user_id == user_id
        ).delete()
        session.delete(user)
        session.commit()

        # 如果存在则从 users.json 中移除
        try:
            with open("users.json", "r", encoding="utf-8") as f:
                data = json.load(f)
        except FileNotFoundError:
            data = []
        data = [u for u in data if u.get("id") != user_id]
        with open("users.json", "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True


def add_favorite(user_id: int, word_id: int):
    """将单词标记为用户的收藏。"""
    with get_session() as session:
        exists = session.exec(
            select(Favorite).where(
                Favorite.user_id == user_id, Favorite.word_id == word_id
            )
        ).first()
        if exists:
            return exists
        fav = Favorite(user_id=user_id, word_id=word_id)
        session.add(fav)
        session.commit()
        session.refresh(fav)
        return fav


def remove_favorite(user_id: int, word_id: int) -> bool:
    """删除收藏关系。"""
    with get_session() as session:
        fav = session.exec(
            select(Favorite).where(
                Favorite.user_id == user_id, Favorite.word_id == word_id
            )
        ).first()
        if not fav:
            return False
        session.delete(fav)
        session.commit()
        return True


def list_favorites(user_id: int, q: str | None = None):
    """返回用户的收藏列表，可按 ``q`` 过滤。"""
    with get_session() as session:
        statement = (
            select(Word, Favorite.added_at)
            .join(Favorite, Favorite.word_id == Word.id)
            .where(Favorite.user_id == user_id)
        )
        if q:
            ql = q.lower()
            statement = statement.where(
                (func.lower(Word.word).contains(ql))
                | (func.lower(Word.translations).contains(ql))
            )
        statement = statement.order_by(Favorite.added_at.desc())
        return session.exec(statement).all()


def sync_wordbooks(directory: str):
    """将 *directory* 中缺失的单词补充进数据库。"""
    if not directory or not os.path.exists(directory):
        return

    with get_session() as session:
        existing = {w.word.lower(): w.id for w in session.exec(select(Word)).all()}

        for fn in os.listdir(directory):
            if not fn.startswith("wordBook_") or not fn.endswith(".json"):
                continue
            path = os.path.join(directory, fn)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
            except Exception:
                continue
            for w in data:
                key = w.get("word", "").lower()
                if not key or key in existing:
                    continue
                word = Word(
                    word=w["word"],
                    translations=json.dumps(
                        w.get("translations", []), ensure_ascii=False
                    ),
                    phrases=json.dumps(w.get("phrases", []), ensure_ascii=False),
                )
                session.add(word)
                existing[key] = True
        session.commit()

"""Basic API tests exercising the main user flows."""

import os, sys

sys.path.append(os.path.join(os.path.dirname(__file__), "..", ".."))
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_register_and_login():
    """Users can register and subsequently log in."""
    r = client.post("/auth/register", json={"username": "alice", "password": "pwd"})
    if r.status_code == 400:
        r = client.post("/auth/login", data={"username": "alice", "password": "pwd"})
    assert r.status_code == 200
    token = r.json()["access_token"]
    assert token
    r2 = client.post("/auth/login", data={"username": "alice", "password": "pwd"})
    assert r2.status_code == 200
    assert r2.json()["access_token"]


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


def test_refresh_and_search():
    """Refresh token and search functionality."""
    r = client.post("/auth/register", json={"username": "bob", "password": "pwd"})
    if r.status_code == 400:
        r = client.post("/auth/login", data={"username": "bob", "password": "pwd"})
    token = r.json()["access_token"]
    r_refresh = client.post("/auth/refresh", headers=auth_header(token))
    assert r_refresh.status_code == 200
    new_token = r_refresh.json()["access_token"]
    assert new_token

    # search by Chinese translation
    headers = auth_header(new_token)
    r_search = client.get("/search", params={"q": "吸收"}, headers=headers)
    assert r_search.status_code == 200
    data = r_search.json()
    assert any("absorb" == w["word"] for w in data)


def test_stats_overview():
    """Stats endpoint returns expected keys."""
    r = client.post("/auth/register", json={"username": "carol", "password": "pwd"})
    if r.status_code == 400:
        r = client.post("/auth/login", data={"username": "carol", "password": "pwd"})
    token = r.json()["access_token"]
    headers = auth_header(token)
    r_stats = client.get("/stats/overview", headers=headers)
    assert r_stats.status_code == 200
    data = r_stats.json()
    assert {"reviewed", "due", "next_due"} <= data.keys()


def test_default_admin_login():
    """Admin account exists and can access admin-only endpoint."""
    r = client.post("/auth/login", data={"username": "Admin", "password": "88888888"})
    assert r.status_code == 200
    token = r.json()["access_token"]
    assert token
    headers = auth_header(token)
    r_admin = client.get("/admin/users", headers=headers)
    assert r_admin.status_code == 200
    assert any(u["username"] == "Admin" for u in r_admin.json())


def test_daily_limit_respected():
    """Daily study limit prevents more reviews after threshold."""
    import uuid

    username = "user" + uuid.uuid4().hex[:8]
    r = client.post("/auth/register", json={"username": username, "password": "pwd"})
    if r.status_code == 400:
        r = client.post("/auth/login", data={"username": username, "password": "pwd"})
    token = r.json()["access_token"]
    headers = auth_header(token)

    r_today = client.get("/words/today", params={"limit": 1}, headers=headers)
    assert r_today.status_code == 200
    data = r_today.json()
    assert len(data) == 1
    word_id = data[0]["id"]

    r_review = client.post(f"/review/{word_id}", json={"quality": 5}, headers=headers)
    assert r_review.status_code == 200

    r_today2 = client.get("/words/today", params={"limit": 1}, headers=headers)
    assert r_today2.status_code == 200
    assert r_today2.json() == []

    r_stats = client.get("/stats/overview", params={"limit": 1}, headers=headers)
    assert r_stats.status_code == 200
    assert r_stats.json()["due"] == 0


def test_account_deletion_flow():
    """Users can request deletion and admin can approve it."""
    r = client.post("/auth/register", json={"username": "deluser", "password": "pwd"})
    if r.status_code == 400:
        r = client.post("/auth/login", data={"username": "deluser", "password": "pwd"})
    token = r.json()["access_token"]
    headers = auth_header(token)

    r_req = client.post("/users/request_delete", headers=headers)
    assert r_req.status_code == 200

    admin_token = client.post(
        "/auth/login", data={"username": "Admin", "password": "88888888"}
    ).json()["access_token"]
    admin_headers = auth_header(admin_token)

    r_list = client.get("/admin/deletion_requests", headers=admin_headers)
    assert r_list.status_code == 200
    data = r_list.json()
    user_id = None
    for d in data:
        if d["username"] == "deluser":
            user_id = d["user_id"]
    assert user_id is not None

    r_appr = client.post(
        f"/admin/deletion_requests/{user_id}/approve", headers=admin_headers
    )
    assert r_appr.status_code == 200

    r_login = client.post(
        "/auth/login", data={"username": "deluser", "password": "pwd"}
    )
    assert r_login.status_code == 401

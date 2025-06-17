from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_register_and_login():
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
    r = client.post("/auth/register", json={"username": "carol", "password": "pwd"})
    if r.status_code == 400:
        r = client.post("/auth/login", data={"username": "carol", "password": "pwd"})
    token = r.json()["access_token"]
    headers = auth_header(token)
    r_stats = client.get("/stats/overview", headers=headers)
    assert r_stats.status_code == 200
    data = r_stats.json()
    assert {"reviewed", "due", "next_due", "total_words", "studied_words"} <= data.keys()


def test_default_admin_login():
    r = client.post("/auth/login", data={"username": "Admin", "password": "88888888"})
    assert r.status_code == 200
    token = r.json()["access_token"]
    assert token
    headers = auth_header(token)
    r_admin = client.get("/admin/users", headers=headers)
    assert r_admin.status_code == 200
    assert any(u["username"] == "Admin" for u in r_admin.json())

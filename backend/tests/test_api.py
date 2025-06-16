from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_register_and_login():
    r = client.post("/auth/register", json={"username": "alice", "password": "pwd"})
    assert r.status_code == 200
    token = r.json()["access_token"]
    assert token
    r2 = client.post("/auth/login", data={"username": "alice", "password": "pwd"})
    assert r2.status_code == 200
    assert r2.json()["access_token"]

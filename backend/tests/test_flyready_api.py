"""FlyReady backend API tests — pytest

Covers: auth (register/login/me), seeded users, built-in templates, checklists CRUD,
flight logs (create + list + get), weather 503 fallback, stats, and ObjectId/password leakage.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or "https://flight-ops-16.preview.emergentagent.com"
API = BASE_URL.rstrip("/") + "/api"

ADMIN = {"email": "admin@flyready.app", "password": "Admin@123"}
PILOT = {"email": "pilot@flyready.app", "password": "Pilot@123"}


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _auth(session, email, password):
    r = session.post(f"{API}/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    data = r.json()
    return data["access_token"], data["user"]


# ---------- Auth ----------
class TestAuth:
    def test_root(self, session):
        r = session.get(f"{API}/")
        assert r.status_code == 200
        assert r.json().get("app") == "FlyReady"

    def test_admin_login(self, session):
        token, user = _auth(session, **ADMIN)
        assert token
        assert user["email"] == ADMIN["email"]
        assert "password_hash" not in user
        assert "_id" not in user

    def test_pilot_login(self, session):
        token, user = _auth(session, **PILOT)
        assert token
        assert user["email"] == PILOT["email"]
        assert user.get("role") == "pilot"

    def test_login_invalid(self, session):
        r = session.post(f"{API}/auth/login", json={"email": PILOT["email"], "password": "wrong"})
        assert r.status_code == 401

    def test_me_requires_bearer(self, session):
        r = session.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_with_token(self, session):
        token, _ = _auth(session, **PILOT)
        r = session.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        body = r.json()
        assert body["email"] == PILOT["email"]
        assert "password_hash" not in body
        assert "_id" not in body

    def test_register_new_user_seeds_templates(self, session):
        email = f"TEST_user_{uuid.uuid4().hex[:8]}@flyready.app"
        r = session.post(f"{API}/auth/register", json={"email": email, "password": "Test@123", "name": "Tester"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "access_token" in data
        token = data["access_token"]
        # GET checklists — should have 3 built-in templates
        rc = session.get(f"{API}/checklists", headers={"Authorization": f"Bearer {token}"})
        assert rc.status_code == 200
        names = [c["name"] for c in rc.json()]
        assert any("Multirotor" in n for n in names), names
        assert any("Fixed Wing" in n for n in names), names
        assert any("VTOL" in n for n in names), names
        assert len([c for c in rc.json() if c.get("source") == "built_in"]) == 3

    def test_register_duplicate(self, session):
        r = session.post(f"{API}/auth/register",
                         json={"email": PILOT["email"], "password": "x", "name": "x"})
        assert r.status_code == 400


# ---------- Checklists ----------
class TestChecklists:
    def test_list_built_ins_for_pilot(self, session):
        token, _ = _auth(session, **PILOT)
        r = session.get(f"{API}/checklists", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        items = r.json()
        built_in = [c for c in items if c.get("source") == "built_in"]
        assert len(built_in) >= 3
        for c in built_in:
            assert "_id" not in c
            assert c["qr_code_url"].startswith("flyready://checklist/")
            assert isinstance(c.get("items"), list) and len(c["items"]) > 0

    def test_create_custom_checklist_and_get(self, session):
        token, _ = _auth(session, **PILOT)
        H = {"Authorization": f"Bearer {token}"}
        payload = {
            "name": "TEST_Custom_Manual",
            "drone_type": "multirotor",
            "phase": "preflight",
            "source": "manual",
            "items": [
                {"label": "Battery check", "is_required": True, "order_index": 0},
                {"label": "Props inspect", "is_required": True, "order_index": 1},
            ],
        }
        r = session.post(f"{API}/checklists", json=payload, headers=H)
        assert r.status_code == 200, r.text
        c = r.json()
        assert c["id"]
        assert c["qr_code_url"] == f"flyready://checklist/{c['id']}"
        assert c["flight_count"] == 0
        assert len(c["items"]) == 2
        # GET it back
        r2 = session.get(f"{API}/checklists/{c['id']}", headers=H)
        assert r2.status_code == 200
        c2 = r2.json()
        assert c2["name"] == "TEST_Custom_Manual"
        assert c2["flight_count"] == 0
        # cleanup
        session.delete(f"{API}/checklists/{c['id']}", headers=H)


# ---------- Flight logs ----------
class TestFlightLogs:
    def test_create_flight_log_and_serial(self, session):
        token, _ = _auth(session, **PILOT)
        H = {"Authorization": f"Bearer {token}"}
        # create a checklist
        cl = session.post(f"{API}/checklists", json={
            "name": "TEST_Flight_CL",
            "drone_type": "multirotor",
            "phase": "preflight",
            "source": "manual",
            "items": [{"label": "A", "is_required": True}, {"label": "B", "is_required": True}],
        }, headers=H).json()
        cid = cl["id"]
        item_ids = [i["id"] for i in cl["items"]]

        body = {
            "checklist_id": cid,
            "operator_name": "TEST Pilot",
            "executions": [
                {"item_id": item_ids[0], "state": "pass"},
                {"item_id": item_ids[1], "state": "pass"},
            ],
            "weather_source": "manual",
            "damage_severity": "none",
        }
        r = session.post(f"{API}/flight_logs", json=body, headers=H)
        assert r.status_code == 200, r.text
        f1 = r.json()
        assert f1["serial_number"] == 1
        assert f1["flight_id"]
        assert "_id" not in f1

        r2 = session.post(f"{API}/flight_logs", json=body, headers=H)
        assert r2.json()["serial_number"] == 2

        # list by checklist
        rl = session.get(f"{API}/flight_logs/by_checklist/{cid}", headers=H)
        assert rl.status_code == 200
        assert len(rl.json()) == 2

        # get
        rg = session.get(f"{API}/flight_logs/{f1['id']}", headers=H)
        assert rg.status_code == 200
        assert rg.json()["operator_name"] == "TEST Pilot"

        # checklist flight_count should now be 2
        rc = session.get(f"{API}/checklists/{cid}", headers=H)
        assert rc.json()["flight_count"] == 2

        # cleanup
        session.delete(f"{API}/checklists/{cid}", headers=H)


# ---------- Weather ----------
class TestWeather:
    def test_weather_returns_503_without_key(self, session):
        token, _ = _auth(session, **PILOT)
        r = session.get(f"{API}/weather?lat=12.97&lon=77.59",
                        headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 503
        assert "not configured" in r.json().get("detail", "").lower()

    def test_weather_requires_auth(self, session):
        r = session.get(f"{API}/weather?lat=12.97&lon=77.59")
        assert r.status_code == 401


# ---------- Stats ----------
class TestStats:
    def test_stats_overview(self, session):
        token, _ = _auth(session, **PILOT)
        r = session.get(f"{API}/stats/overview",
                        headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        body = r.json()
        for k in ("flights", "checklists", "aircraft"):
            assert k in body and isinstance(body[k], int)

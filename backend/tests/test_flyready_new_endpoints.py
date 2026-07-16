"""FlyReady backend tests for NEW endpoints:
- POST /api/checklists/parse-pdf
- GET  /api/checklists/search
- GET  /api/stats/detailed
- GET  /api/maintenance/overview
- POST /api/maintenance/log
- GET  /api/public/checklist/{id}
- ACCESS_TOKEN_DAYS = 30
- Existing endpoints still work (login with seeded admin creds, checklist CRUD)
"""
import io
import os
import time
import uuid
import jwt
import pytest
import requests
from reportlab.pdfgen import canvas

# Backend runs locally on 8001 per review request
BASE_URL = os.environ.get("BACKEND_TEST_URL", "http://localhost:8001")
API = BASE_URL.rstrip("/") + "/api"

ADMIN = {"email": "yashikaachari7135@gmail.com", "password": "Flyready@Admin#2026!"}
PILOT = {"email": "pilot@flyready.com", "password": "Pilot@1234"}


@pytest.fixture(scope="module")
def session():
    return requests.Session()


def _login(session, creds):
    r = session.post(f"{API}/auth/login", json=creds)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()


@pytest.fixture(scope="module")
def pilot_auth(session):
    data = _login(session, PILOT)
    return data["access_token"], data["user"]


@pytest.fixture(scope="module")
def admin_auth(session):
    data = _login(session, ADMIN)
    return data["access_token"], data["user"]


def _headers(token):
    return {"Authorization": f"Bearer {token}"}


def _make_pdf(lines):
    buf = io.BytesIO()
    c = canvas.Canvas(buf)
    y = 800
    for ln in lines:
        c.drawString(50, y, ln)
        y -= 20
        if y < 50:
            c.showPage()
            y = 800
    c.save()
    return buf.getvalue()


# -------------------- Existing endpoints still work --------------------
class TestExistingEndpoints:
    def test_admin_login(self, session):
        data = _login(session, ADMIN)
        assert data["access_token"]
        assert data["user"]["email"] == ADMIN["email"].lower()
        assert "password_hash" not in data["user"]
        assert "_id" not in data["user"]

    def test_pilot_login(self, session):
        data = _login(session, PILOT)
        assert data["user"]["role"] == "pilot"

    def test_access_token_days_is_30(self, session):
        data = _login(session, PILOT)
        token = data["access_token"]
        payload = jwt.decode(token, options={"verify_signature": False})
        # exp should be ~30 days from now
        now = time.time()
        delta_days = (payload["exp"] - now) / 86400
        assert 29 <= delta_days <= 31, f"expected ~30 days, got {delta_days:.2f}"

    def test_list_checklists(self, session, pilot_auth):
        token, _ = pilot_auth
        r = session.get(f"{API}/checklists", headers=_headers(token))
        assert r.status_code == 200
        cls = r.json()
        assert isinstance(cls, list) and len(cls) >= 3

    def test_create_and_get_checklist(self, session, pilot_auth):
        token, _ = pilot_auth
        r = session.post(f"{API}/checklists", json={
            "name": "TEST_existing_endpoints_cl",
            "drone_type": "multirotor",
            "phase": "preflight",
            "source": "manual",
            "items": [{"label": "X", "is_required": True}],
        }, headers=_headers(token))
        assert r.status_code == 200, r.text
        cid = r.json()["id"]
        r2 = session.get(f"{API}/checklists/{cid}", headers=_headers(token))
        assert r2.status_code == 200
        assert r2.json()["name"] == "TEST_existing_endpoints_cl"
        # cleanup
        session.delete(f"{API}/checklists/{cid}", headers=_headers(token))


# -------------------- /checklists/search --------------------
class TestSearch:
    def test_search_requires_auth(self, session):
        r = session.get(f"{API}/checklists/search?q=multi")
        assert r.status_code == 401

    def test_search_matches_case_insensitive(self, session, pilot_auth):
        token, _ = pilot_auth
        # Multirotor built-in exists
        r = session.get(f"{API}/checklists/search?q=multirotor", headers=_headers(token))
        assert r.status_code == 200, r.text
        results = r.json()
        assert isinstance(results, list)
        assert any("multirotor" in c["name"].lower() for c in results)

        # case-insensitive
        r2 = session.get(f"{API}/checklists/search?q=MULTI", headers=_headers(token))
        assert r2.status_code == 200
        assert any("multi" in c["name"].lower() for c in r2.json())

    def test_search_route_not_shadowed_by_id_route(self, session, pilot_auth):
        # If /checklists/{id} caught 'search', we'd get 404. Instead we must get a 200 list.
        token, _ = pilot_auth
        r = session.get(f"{API}/checklists/search?q=zzz_no_match", headers=_headers(token))
        assert r.status_code == 200
        assert r.json() == []


# -------------------- /checklists/parse-pdf --------------------
class TestParsePDF:
    def test_parse_pdf_requires_auth(self, session):
        pdf = _make_pdf(["1. Check battery", "- Verify GPS lock"])
        r = session.post(
            f"{API}/checklists/parse-pdf",
            files={"file": ("test.pdf", pdf, "application/pdf")},
        )
        assert r.status_code == 401

    def test_parse_pdf_returns_items(self, session, pilot_auth):
        token, _ = pilot_auth
        pdf = _make_pdf([
            "Preflight Checklist",
            "1. Check battery voltage",
            "2. Inspect propellers",
            "- Verify GPS lock",
            "Compass calibrated?",
            "* Payload secured",
        ])
        r = session.post(
            f"{API}/checklists/parse-pdf",
            files={"file": ("test.pdf", pdf, "application/pdf")},
            headers=_headers(token),
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert "items" in body and "count" in body
        assert body["count"] == len(body["items"])
        assert body["count"] >= 3
        for it in body["items"]:
            assert "label" in it and "required" in it
            assert isinstance(it["required"], bool)

    def test_parse_pdf_empty_returns_422(self, session, pilot_auth):
        token, _ = pilot_auth
        pdf = _make_pdf(["Just some free text.", "No bullets or numbers here."])
        r = session.post(
            f"{API}/checklists/parse-pdf",
            files={"file": ("empty.pdf", pdf, "application/pdf")},
            headers=_headers(token),
        )
        assert r.status_code == 422, f"expected 422 got {r.status_code}: {r.text}"


# -------------------- /stats/detailed --------------------
class TestDetailedStats:
    def test_detailed_stats_requires_auth(self, session):
        r = session.get(f"{API}/stats/detailed")
        assert r.status_code == 401

    def test_detailed_stats_shape(self, session, pilot_auth):
        token, _ = pilot_auth
        r = session.get(f"{API}/stats/detailed", headers=_headers(token))
        assert r.status_code == 200, r.text
        body = r.json()
        for k in ("total_flights", "flights_this_week", "total_checklists", "most_used_checklist"):
            assert k in body, f"missing key {k}"
        assert isinstance(body["total_flights"], int)
        assert isinstance(body["flights_this_week"], int)
        assert isinstance(body["total_checklists"], int)


# -------------------- /maintenance/overview and /maintenance/log --------------------
class TestMaintenance:
    def test_maintenance_flow(self, session, pilot_auth):
        token, _ = pilot_auth
        H = _headers(token)

        # Create a fresh checklist
        cl = session.post(f"{API}/checklists", json={
            "name": f"TEST_maint_{uuid.uuid4().hex[:6]}",
            "drone_type": "multirotor",
            "phase": "preflight",
            "source": "manual",
            "items": [{"label": "A", "is_required": True}],
        }, headers=H).json()
        cid = cl["id"]
        iid = cl["items"][0]["id"]

        # 2 flights
        body = {
            "checklist_id": cid,
            "operator_name": "TEST",
            "executions": [{"item_id": iid, "state": "pass"}],
            "weather_source": "manual",
            "damage_severity": "none",
        }
        for _ in range(2):
            r = session.post(f"{API}/flight_logs", json=body, headers=H)
            assert r.status_code == 200

        # /maintenance/overview shape + flight_count
        r = session.get(f"{API}/maintenance/overview", headers=H)
        assert r.status_code == 200
        overview = r.json()
        assert isinstance(overview, list)
        row = next((x for x in overview if x["checklist_id"] == cid), None)
        assert row is not None, "created checklist missing from overview"
        for k in ("checklist_id", "name", "drone_type", "flight_count",
                  "maintenance_due", "due_soon", "last_maintenance_at"):
            assert k in row
        assert row["flight_count"] == 2
        assert row["maintenance_due"] is False
        assert row["due_soon"] is False
        assert row["last_maintenance_at"] is None

        # Log maintenance
        rm = session.post(f"{API}/maintenance/log",
                          json={"checklist_id": cid, "notes": "test maint"},
                          headers=H)
        assert rm.status_code == 200, rm.text
        assert rm.json()["checklist_id"] == cid

        # Overview flight_count should now be 0 for that checklist
        r2 = session.get(f"{API}/maintenance/overview", headers=H)
        row2 = next((x for x in r2.json() if x["checklist_id"] == cid), None)
        assert row2 is not None
        assert row2["flight_count"] == 0, f"expected reset to 0, got {row2['flight_count']}"
        assert row2["last_maintenance_at"] is not None

        # A subsequent flight after maintenance -> counts as 1
        session.post(f"{API}/flight_logs", json=body, headers=H)
        r3 = session.get(f"{API}/maintenance/overview", headers=H)
        row3 = next((x for x in r3.json() if x["checklist_id"] == cid), None)
        assert row3["flight_count"] == 1

        # cleanup
        session.delete(f"{API}/checklists/{cid}", headers=H)

    def test_maintenance_log_requires_checklist_id(self, session, pilot_auth):
        token, _ = pilot_auth
        r = session.post(f"{API}/maintenance/log", json={}, headers=_headers(token))
        assert r.status_code == 400

    def test_maintenance_log_bad_checklist_404(self, session, pilot_auth):
        token, _ = pilot_auth
        r = session.post(f"{API}/maintenance/log",
                         json={"checklist_id": "does-not-exist"},
                         headers=_headers(token))
        assert r.status_code == 404


# -------------------- /public/checklist/{id} --------------------
class TestPublicChecklist:
    def test_public_checklist_no_auth(self, session, pilot_auth):
        token, _ = pilot_auth
        # Pick any pilot checklist
        cls = session.get(f"{API}/checklists", headers=_headers(token)).json()
        cid = cls[0]["id"]

        # NO auth header
        r = requests.get(f"{API}/public/checklist/{cid}")
        assert r.status_code == 200, r.text
        body = r.json()
        for k in ("name", "drone_type", "item_count"):
            assert k in body
        assert isinstance(body["item_count"], int)
        assert body["item_count"] >= 0

    def test_public_checklist_404(self):
        r = requests.get(f"{API}/public/checklist/does-not-exist-xyz")
        assert r.status_code == 404

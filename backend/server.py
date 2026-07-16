from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, UploadFile, File
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
import httpx
import re

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("flyready")

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_DAYS = 30

app = FastAPI(title="FlyReady API")
api = APIRouter(prefix="/api")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": now_utc() + timedelta(days=ACCESS_TOKEN_DAYS),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def serialize(doc: dict) -> dict:
    if not doc:
        return doc
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    for k, v in list(doc.items()):
        if isinstance(v, datetime):
            doc[k] = iso(v)
    return doc


async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return serialize(user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class AircraftIn(BaseModel):
    name: str
    model: Optional[str] = None
    serial_number: str
    drone_photo_url: Optional[str] = None
    type: Literal["multirotor", "heavy_lift", "fixed_wing", "vtol", "custom"] = "multirotor"
    all_up_weight: Optional[float] = None
    payload_capacity: Optional[float] = None
    battery_count: int = 1
    maintenance_due_at_flights: int = 50


class ChecklistItemIn(BaseModel):
    label: str
    is_required: bool = True
    section_heading: Optional[str] = None
    order_index: int = 0


class ChecklistIn(BaseModel):
    name: str
    aircraft_id: Optional[str] = None
    drone_type: Literal["multirotor", "heavy_lift", "fixed_wing", "vtol", "custom"] = "multirotor"
    phase: Literal["preflight", "inflight", "postflight"] = "preflight"
    source: Literal["built_in", "pdf_upload", "photo_upload", "voice", "manual"] = "manual"
    drone_photo_url: Optional[str] = None
    items: List[ChecklistItemIn] = []


class ExecutionIn(BaseModel):
    item_id: str
    state: Literal["empty", "pass", "fail"] = "empty"
    notes: Optional[str] = None
    photo_url: Optional[str] = None


class FlightLogIn(BaseModel):
    checklist_id: str
    aircraft_id: Optional[str] = None
    operator_name: str
    gcs_operator: Optional[str] = None
    flight_id: Optional[str] = None
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    wind_speed: Optional[float] = None
    wind_direction: Optional[str] = None
    temperature: Optional[float] = None
    weather_conditions: Optional[str] = None
    weather_source: Literal["auto", "manual", "none"] = "manual"
    airspace_status: Literal["clear", "warning", "red_zone", "unknown"] = "unknown"
    battery_used_label: Optional[str] = None
    flight_start_time: Optional[str] = None
    flight_end_time: Optional[str] = None
    flight_duration_seconds: Optional[int] = None
    serial_number_drone: Optional[str] = None
    test_objective: Optional[str] = None
    changes_since_last: Optional[str] = None
    all_up_weight: Optional[float] = None
    payload_description: Optional[str] = None
    remarks: Optional[str] = None
    damage_report_description: Optional[str] = None
    damage_severity: Literal["none", "minor", "moderate", "critical"] = "none"
    pilot_signature_url: Optional[str] = None
    gcs_signature_url: Optional[str] = None
    executions: List[ExecutionIn] = []
    media: List[dict] = []  # [{type, file_url, caption}]


# ---------------------------------------------------------------------------
# Built-in templates (generic — no brand names)
# ---------------------------------------------------------------------------
def _items(labels):
    return [{"id": str(uuid.uuid4()), "label": l, "is_required": True, "section_heading": None, "order_index": i}
            for i, l in enumerate(labels)]


def _grouped_items(groups):
    out = []
    idx = 0
    for heading, labels in groups:
        for l in labels:
            out.append({"id": str(uuid.uuid4()), "label": l, "is_required": True,
                        "section_heading": heading, "order_index": idx})
            idx += 1
    return out


BUILTIN_TEMPLATES = [
    {
        "name": "Multirotor — Preflight",
        "drone_type": "multirotor",
        "phase": "preflight",
        "items": _grouped_items([
            ("Pre-flight documentation", [
                "Pilot licence and authorizations — valid and on person",
                "Flight permission / airspace authorization — confirmed",
                "Insurance documents — valid",
                "Flight area risk assessment — completed",
                "Mission briefing — all crew informed",
            ]),
            ("Airframe inspection", [
                "Airframe — inspect for cracks, dents, or damage",
                "Arms — all locked and secured",
                "Landing gear — inspect and secure",
                "Vibration dampeners — intact and fitted",
                "Body screws and fasteners — all tight",
            ]),
            ("Propulsion", [
                "Propellers — inspect for chips, cracks, or delamination",
                "Propellers — all secured and correctly torqued",
                "Motors — no obstructions, spin freely by hand",
                "Motor mounts — secure, no play or wobble",
                "ESCs — no damage, heat marks, or loose wiring",
            ]),
            ("Power", [
                "Battery — fully charged to required level",
                "Battery — secured, connector tight, no swelling or damage",
                "Battery voltage — checked and within limits",
                "Battery cycle count — within acceptable range",
                "Redundant battery (if fitted) — checked and secured",
            ]),
            ("Electronics and avionics", [
                "Flight controller — powered on, no error flags",
                "GPS module — acquiring signal, minimum 8 satellites",
                "Compass — calibrated, no interference warnings",
                "IMU — calibrated, no errors",
                "Barometer — reading correct altitude",
                "Remote controller — fully charged and linked",
                "Remote controller — all switches in correct pre-flight position",
                "Telemetry link — confirmed and signal strong",
                "FPV camera and video link — checked (if fitted)",
            ]),
            ("Software and settings", [
                "Firmware — up to date on FC, ESCs, and RC",
                "Flight modes — verified and correct",
                "Return to home altitude — set and confirmed",
                "Return to home trigger — battery failsafe configured",
                "Geofence — set if required",
                "Waypoints / mission — uploaded and verified (if autonomous)",
            ]),
            ("Final pre-launch", [
                "Payload — secured, balanced, connector tight",
                "Camera and gimbal — secured and calibrated",
                "Weather — wind speed, temperature, visibility within limits",
                "Airspace — checked for restrictions or NOTAMs",
                "Flight area — clear of bystanders and obstacles",
                "Pre-arm checks — all passed on GCS",
                "Crew positions — all crew in position and ready",
            ]),
        ]),
    },
    {
        "name": "Fixed Wing — Preflight",
        "drone_type": "fixed_wing",
        "phase": "preflight",
        "items": _grouped_items([
            ("Documentation", [
                "Pilot licence and authorizations — valid",
                "Airspace authorization and NOTAMs — checked",
                "Risk assessment — completed",
                "Mission plan — uploaded and verified",
            ]),
            ("Airframe", [
                "Fuselage — inspect for cracks or damage",
                "Wings — inspect skin, spars, and attachment points",
                "Tail section — elevator, rudder, fin — inspect and secure",
                "Wing attachment bolts — tight and locked",
                "Control surface hinges — no play or looseness",
            ]),
            ("Control surfaces", [
                "Ailerons — correct direction and full travel",
                "Elevator — correct direction and full travel",
                "Rudder — correct direction and full travel",
                "Flaps — correct operation (if fitted)",
                "Control linkages — secure, no slop or binding",
            ]),
            ("Propulsion", [
                "Motor or engine — secure, clear of debris",
                "Propeller — inspect for chips or cracks",
                "Propeller — secure and correctly torqued",
                "Fuel or battery — sufficient for mission plus reserve",
                "Throttle response — checked on ground",
            ]),
            ("Electronics", [
                "Flight controller — powered on, no errors",
                "GPS — acquiring signal, minimum 8 satellites",
                "Pitot tube — clear and unobstructed",
                "Airspeed sensor — reading correctly",
                "Remote controller — charged and linked",
                "Telemetry — connected and transmitting",
            ]),
            ("Settings", [
                "Control surface throws — verified per configuration",
                "Failsafe — RTL or loiter configured",
                "Launch mode — hand launch or runway as planned",
                "Stall speed — known and respected in mission planning",
            ]),
            ("Pre-launch", [
                "Launch area — clear of obstacles and bystanders",
                "Wind speed and direction — within fixed wing limits",
                "Launch crew — briefed and in position",
                "GCS — operator ready and monitoring",
            ]),
        ]),
    },
    {
        "name": "VTOL — Preflight",
        "drone_type": "vtol",
        "phase": "preflight",
        "items": _grouped_items([
            ("Documentation", [
                "Pilot licence and VTOL endorsement — valid",
                "Airspace authorization — confirmed",
                "Risk assessment — completed for both VTOL and fixed wing flight phases",
                "Mission plan — uploaded, transition altitudes set",
            ]),
            ("Airframe", [
                "Fuselage — inspect for cracks or damage",
                "Wings — inspect skin, spars, and wing attachment",
                "Tail section — inspect and secure",
                "VTOL motor arms — all locked and secured",
                "Transition mechanism — inspect for wear or damage (if mechanical)",
            ]),
            ("VTOL propulsion (lift motors)", [
                "VTOL propellers — all inspected for chips or damage",
                "VTOL propellers — secured and correctly torqued",
                "VTOL motors — no obstructions, spin freely by hand",
                "VTOL motor mounts — secure, no play",
                "VTOL ESCs — no damage or heat marks",
            ]),
            ("Forward propulsion", [
                "Forward motor or engine — secured, clear of debris",
                "Forward propeller — inspected and secured",
                "Forward throttle — responding correctly on ground check",
            ]),
            ("Control surfaces", [
                "Ailerons — correct direction and full travel",
                "Elevator — correct direction and full travel",
                "Rudder — correct direction and full travel",
                "All control linkages — secure and no binding",
            ]),
            ("Power", [
                "Battery — fully charged, secured, no swelling",
                "Battery voltage — checked, within limits",
                "Power distribution — all connections secure",
                "Redundant power (if fitted) — checked",
            ]),
            ("Electronics and avionics", [
                "Flight controller — powered on, VTOL firmware confirmed",
                "GPS — minimum 8 satellites acquired",
                "Compass — calibrated, no interference",
                "Airspeed sensor — reading correctly",
                "Pitot tube — clear and unobstructed",
                "Remote controller — charged, linked, in correct mode",
                "Telemetry — connected and transmitting",
            ]),
            ("Settings and modes", [
                "VTOL hover mode — tested and stable on ground",
                "Transition airspeed — set and confirmed in mission planner",
                "Transition altitude — set and confirmed",
                "Forward flight mode — configured and verified",
                "Failsafe — RTL with VTOL landing configured",
                "Mission waypoints — uploaded including transition waypoints",
            ]),
            ("Final pre-launch", [
                "Payload — secured and balanced",
                "Weather — wind speed within both VTOL and fixed wing limits",
                "Airspace — clear for full mission altitude range",
                "Launch area — clear of bystanders and obstacles",
                "Pre-arm checks — all passed on GCS",
                "Crew — fully briefed on both VTOL and transition phases of flight",
            ]),
        ]),
    },
]


# ---------------------------------------------------------------------------
# Auth Endpoints
# ---------------------------------------------------------------------------
@api.post("/auth/register")
async def register(body: RegisterIn):
    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": email,
        "name": body.name,
        "password_hash": hash_password(body.password),
        "role": "pilot",
        "subscription_tier": "free",
        "subscription_expiry": None,
        "profile_photo_url": None,
        "created_at": now_utc(),
    }
    await db.users.insert_one(user_doc)
    await seed_user_templates(user_id)
    token = create_token(user_id, email)
    return {"access_token": token, "user": serialize({**user_doc})}


@api.post("/auth/login")
async def login(body: LoginIn):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user["id"], email)
    return {"access_token": token, "user": serialize(dict(user))}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


# ---------------------------------------------------------------------------
# Aircraft
# ---------------------------------------------------------------------------
@api.get("/aircraft")
async def list_aircraft(user: dict = Depends(get_current_user)):
    docs = await db.aircraft.find({"user_id": user["id"]}).to_list(500)
    return [serialize(d) for d in docs]


@api.post("/aircraft")
async def create_aircraft(body: AircraftIn, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc.update({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "total_flight_count": 0,
        "created_at": now_utc(),
    })
    await db.aircraft.insert_one(doc)
    return serialize(dict(doc))


@api.get("/aircraft/{aircraft_id}")
async def get_aircraft(aircraft_id: str, user: dict = Depends(get_current_user)):
    doc = await db.aircraft.find_one({"id": aircraft_id, "user_id": user["id"]})
    if not doc:
        raise HTTPException(404, "Not found")
    return serialize(doc)


# ---------------------------------------------------------------------------
# Checklists
# ---------------------------------------------------------------------------
@api.get("/checklists")
async def list_checklists(user: dict = Depends(get_current_user)):
    docs = await db.checklists.find({"user_id": user["id"]}).to_list(1000)
    out = []
    for d in docs:
        d = serialize(d)
        # attach flight count
        d["flight_count"] = await db.flight_logs.count_documents({"checklist_id": d["id"]})
        out.append(d)
    return out


@api.get("/checklists/search")
async def search_checklists(q: str, current_user: dict = Depends(get_current_user)):
    docs = await db.checklists.find(
        {"user_id": current_user["id"], "name": {"$regex": q, "$options": "i"}}
    ).to_list(50)
    out = []
    for d in docs:
        d = serialize(d)
        d["flight_count"] = await db.flight_logs.count_documents({"checklist_id": d["id"]})
        out.append(d)
    return out


@api.post("/checklists/parse-pdf")
async def parse_pdf(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    import fitz
    pdf_bytes = await file.read()
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    items = []
    seen = set()
    SKIP = {"go", "no-go", "yes", "no", "pass", "fail", "please print", "signature",
            "date", "time", "am / pm", "street address", "city, state, zip", "am", "pm"}
    for page in doc:
        blocks = page.get_text("blocks")
        blocks.sort(key=lambda b: (round(b[1] / 5) * 5, b[0]))
        for block in blocks:
            for line in block[4].split("\n"):
                line = line.strip()
                if not line or len(line) < 4:
                    continue
                low = line.lower().strip()
                if re.search(r"get the digital|fulcrum|check us out|^http|^\d+$|mobile app|automate", low):
                    continue
                low_clean = re.sub(r"[☐☑□\[\]xX]", " ", low).strip()
                if all(w.strip() in SKIP for w in low_clean.split() if w.strip()):
                    continue
                if re.fullmatch(r"[\s:/]*am\s*/\s*pm[\s:/]*", low):
                    continue
                is_item = (line.endswith("?") or bool(re.search(r"\(required", low, re.I))
                           or bool(re.match(r"^\d{1,2}[\.\)]", line))
                           or bool(re.match(r"^[-*•▶►]", line))
                           or bool(re.match(r"^\[\s?\]|^☐|^☑|^□", line)))
                if is_item:
                    clean = re.sub(r"\([^)]*required[^)]*\)", "", line, flags=re.I)
                    clean = clean.rstrip("?").strip()
                    clean = re.sub(r"^[\d\.\)\-\*•▶►\[\]xX☐☑□]\s*", "", clean).strip(" .:-")
                    if clean and clean.lower() not in seen and len(clean) > 3:
                        seen.add(clean.lower())
                        items.append({"label": clean, "required": bool(re.search(r"\(required", line, re.I))})
    doc.close()
    if not items:
        raise HTTPException(422, "No checklist items found in this PDF. Try manual entry instead.")
    return {"items": items, "count": len(items)}


@api.post("/checklists")
async def create_checklist(body: ChecklistIn, user: dict = Depends(get_current_user)):
    cid = str(uuid.uuid4())
    items = []
    for i, it in enumerate(body.items):
        items.append({
            "id": str(uuid.uuid4()),
            "label": it.label,
            "is_required": it.is_required,
            "section_heading": it.section_heading,
            "order_index": it.order_index if it.order_index else i,
        })
    doc = {
        "id": cid,
        "user_id": user["id"],
        "name": body.name,
        "aircraft_id": body.aircraft_id,
        "drone_type": body.drone_type,
        "phase": body.phase,
        "source": body.source,
        "drone_photo_url": body.drone_photo_url,
        "is_locked": True,
        "qr_code_url": f"flyready://checklist/{cid}",
        "items": items,
        "created_at": now_utc(),
    }
    await db.checklists.insert_one(doc)
    out = serialize(dict(doc))
    out["flight_count"] = 0
    return out


@api.get("/checklists/{checklist_id}")
async def get_checklist(checklist_id: str, user: dict = Depends(get_current_user)):
    doc = await db.checklists.find_one({"id": checklist_id, "user_id": user["id"]})
    if not doc:
        raise HTTPException(404, "Checklist not found")
    out = serialize(doc)
    out["flight_count"] = await db.flight_logs.count_documents({"checklist_id": checklist_id})
    return out


@api.put("/checklists/{checklist_id}")
async def update_checklist(checklist_id: str, body: ChecklistIn, user: dict = Depends(get_current_user)):
    existing = await db.checklists.find_one({"id": checklist_id, "user_id": user["id"]})
    if not existing:
        raise HTTPException(404, "Checklist not found")
    items = []
    for i, it in enumerate(body.items):
        items.append({
            "id": str(uuid.uuid4()),
            "label": it.label,
            "is_required": it.is_required,
            "section_heading": it.section_heading,
            "order_index": it.order_index if it.order_index else i,
        })
    update = {
        "name": body.name,
        "aircraft_id": body.aircraft_id,
        "drone_type": body.drone_type,
        "phase": body.phase,
        "drone_photo_url": body.drone_photo_url,
        "items": items,
    }
    await db.checklists.update_one({"id": checklist_id}, {"$set": update})
    return await get_checklist(checklist_id, user)


@api.delete("/checklists/{checklist_id}")
async def delete_checklist(checklist_id: str, user: dict = Depends(get_current_user)):
    res = await db.checklists.delete_one({"id": checklist_id, "user_id": user["id"]})
    return {"deleted": res.deleted_count}


# ---------------------------------------------------------------------------
# Flight Logs
# ---------------------------------------------------------------------------
@api.post("/flight_logs")
async def create_flight_log(body: FlightLogIn, user: dict = Depends(get_current_user)):
    cl = await db.checklists.find_one({"id": body.checklist_id, "user_id": user["id"]})
    if not cl:
        raise HTTPException(404, "Checklist not found")
    serial = await db.flight_logs.count_documents({"checklist_id": body.checklist_id}) + 1
    fid = str(uuid.uuid4())
    flight_id = body.flight_id or f"{now_utc().strftime('%Y%m%d')}-{serial:03d}"
    doc = body.model_dump()
    doc.update({
        "id": fid,
        "user_id": user["id"],
        "serial_number": serial,
        "flight_id": flight_id,
        "completed_at": now_utc(),
        "created_at": now_utc(),
    })
    await db.flight_logs.insert_one(doc)
    if body.aircraft_id:
        await db.aircraft.update_one({"id": body.aircraft_id, "user_id": user["id"]},
                                     {"$inc": {"total_flight_count": 1}})
    out = serialize(dict(doc))
    out["serial_number"] = serial
    out["flight_id"] = flight_id
    return out


@api.get("/flight_logs/by_checklist/{checklist_id}")
async def list_flight_logs_for_checklist(checklist_id: str, user: dict = Depends(get_current_user)):
    docs = await db.flight_logs.find({"checklist_id": checklist_id, "user_id": user["id"]}).sort("created_at", -1).to_list(1000)
    return [serialize(d) for d in docs]


@api.get("/flight_logs/{flight_id}")
async def get_flight_log(flight_id: str, user: dict = Depends(get_current_user)):
    doc = await db.flight_logs.find_one({"id": flight_id, "user_id": user["id"]})
    if not doc:
        raise HTTPException(404, "Not found")
    return serialize(doc)


@api.put("/flight_logs/{flight_id}")
async def update_flight_log(flight_id: str, body: dict, user: dict = Depends(get_current_user)):
    doc = await db.flight_logs.find_one({"id": flight_id, "user_id": user["id"]})
    if not doc:
        raise HTTPException(404, "Not found")
    allowed = {"remarks", "media", "damage_report_description", "damage_severity"}
    update = {k: v for k, v in body.items() if k in allowed}
    update["updated_at"] = now_utc()
    await db.flight_logs.update_one({"id": flight_id}, {"$set": update})
    return await get_flight_log(flight_id, user)


# ---------------------------------------------------------------------------
# Weather (OpenWeatherMap proxy)
# ---------------------------------------------------------------------------
@api.get("/weather")
async def weather(lat: float, lon: float, units: str = "metric", _: dict = Depends(get_current_user)):
    api_key = os.environ.get("OPENWEATHER_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=503, detail="Weather service not configured. Use manual entry.")
    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {"lat": lat, "lon": lon, "units": units, "appid": api_key}
    try:
        async with httpx.AsyncClient(timeout=10.0) as cx:
            r = await cx.get(url, params=params)
            if r.status_code != 200:
                raise HTTPException(status_code=502, detail="Weather provider error")
            data = r.json()
            return {
                "temperature": data.get("main", {}).get("temp"),
                "wind_speed": data.get("wind", {}).get("speed"),
                "wind_direction": data.get("wind", {}).get("deg"),
                "conditions": (data.get("weather") or [{}])[0].get("main", "Unknown"),
                "description": (data.get("weather") or [{}])[0].get("description", ""),
                "raw": data,
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Weather fetch failed: {e}")
        raise HTTPException(status_code=502, detail="Weather fetch failed")


# ---------------------------------------------------------------------------
# Stats / Dashboard
# ---------------------------------------------------------------------------
@api.get("/stats/overview")
async def stats(user: dict = Depends(get_current_user)):
    flights = await db.flight_logs.count_documents({"user_id": user["id"]})
    checklists = await db.checklists.count_documents({"user_id": user["id"]})
    aircraft = await db.aircraft.count_documents({"user_id": user["id"]})
    return {"flights": flights, "checklists": checklists, "aircraft": aircraft}


@api.get("/")
async def root():
    return {"app": "FlyReady", "status": "ok"}


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------
@api.get("/stats/detailed")
async def detailed_stats(current_user: dict = Depends(get_current_user)):
    uid = current_user["id"]
    total = await db.flight_logs.count_documents({"user_id": uid})
    week_ago = now_utc() - timedelta(days=7)
    week = await db.flight_logs.count_documents({"user_id": uid, "created_at": {"$gte": week_ago}})
    total_cl = await db.checklists.count_documents({"user_id": uid})
    pipeline = [
        {"$match": {"user_id": uid}},
        {"$group": {"_id": "$checklist_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 1},
    ]
    most_used = await db.flight_logs.aggregate(pipeline).to_list(1)
    most_used_name = None
    if most_used:
        cl = await db.checklists.find_one({"id": most_used[0]["_id"]})
        most_used_name = cl["name"] if cl else None
    return {
        "total_flights": total,
        "flights_this_week": week,
        "total_checklists": total_cl,
        "most_used_checklist": most_used_name,
    }


# ---------------------------------------------------------------------------
# Maintenance overview
# ---------------------------------------------------------------------------
@api.get("/maintenance/overview")
async def maintenance_overview(current_user: dict = Depends(get_current_user)):
    checklists = await db.checklists.find({"user_id": current_user["id"]}).to_list(None)
    result = []
    for cl in checklists:
        cl = serialize(cl)
        logs = await db.flight_logs.count_documents({"checklist_id": cl["id"]})
        maint = await db.maintenance_logs.find_one(
            {"checklist_id": cl["id"], "user_id": current_user["id"]},
            sort=[("created_at", -1)],
        )
        last_maint_at = None
        flights_since_maint = logs
        if maint:
            last_maint_at = iso(maint["created_at"]) if isinstance(maint.get("created_at"), datetime) else maint.get("created_at")
            flights_since_maint = await db.flight_logs.count_documents({
                "checklist_id": cl["id"],
                "created_at": {"$gt": maint["created_at"]},
            })
        result.append({
            "checklist_id": cl["id"],
            "name": cl["name"],
            "drone_type": cl.get("drone_type"),
            "drone_photo_url": cl.get("drone_photo_url"),
            "flight_count": flights_since_maint,
            "total_flight_count": logs,
            "maintenance_due": flights_since_maint >= 50,
            "due_soon": flights_since_maint >= 40 and flights_since_maint < 50,
            "last_maintenance_at": last_maint_at,
        })
    return result


@api.post("/maintenance/log")
async def log_maintenance(body: dict, current_user: dict = Depends(get_current_user)):
    checklist_id = body.get("checklist_id")
    if not checklist_id:
        raise HTTPException(400, "checklist_id required")
    cl = await db.checklists.find_one({"id": checklist_id, "user_id": current_user["id"]})
    if not cl:
        raise HTTPException(404, "Checklist not found")
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "checklist_id": checklist_id,
        "notes": body.get("notes", ""),
        "created_at": now_utc(),
    }
    await db.maintenance_logs.insert_one(doc)
    return serialize(dict(doc))


# ---------------------------------------------------------------------------
# Public scan endpoint (no auth) — used by /checklist/{id}/scan landing page
# ---------------------------------------------------------------------------
@api.get("/public/checklist/{checklist_id}")
async def public_checklist(checklist_id: str):
    doc = await db.checklists.find_one({"id": checklist_id})
    if not doc:
        raise HTTPException(404, "Checklist not found")
    return {
        "id": doc["id"],
        "name": doc.get("name"),
        "drone_type": doc.get("drone_type"),
        "phase": doc.get("phase"),
        "drone_photo_url": doc.get("drone_photo_url"),
        "item_count": len(doc.get("items", [])),
    }


@api.post("/checklists/parse-image")
async def parse_image(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """
    Extract checklist items from an image using the Claude API.
    Works the same way as parse-pdf but for photos of paper checklists.
    """
    import base64
    import json as json_lib

    image_bytes = await file.read()
    image_b64 = base64.b64encode(image_bytes).decode("utf-8")

    # Determine media type
    content_type = file.content_type or "image/jpeg"
    if content_type not in ("image/jpeg", "image/png", "image/gif", "image/webp"):
        content_type = "image/jpeg"

    anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not anthropic_key:
        raise HTTPException(500, "Image reading is not configured on this server.")

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": anthropic_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-opus-4-5",
                    "max_tokens": 1024,
                    "messages": [{
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": content_type,
                                    "data": image_b64,
                                }
                            },
                            {
                                "type": "text",
                                "text": (
                                    "This is a photo of a drone checklist. "
                                    "Extract every checklist item from the image. "
                                    "Return ONLY a JSON array of strings, each string being one checklist item. "
                                    "Remove checkbox symbols (☐ □ [ ]), leading numbers, bullet points. "
                                    "Do not include section headings, page numbers, footers, or instructions. "
                                    "Example: [\"Battery fully charged\", \"Propellers secured\", \"GPS signal acquired\"]. "
                                    "Return ONLY the JSON array, nothing else, no markdown."
                                )
                            }
                        ]
                    }]
                }
            )
    except Exception as e:
        raise HTTPException(500, f"Could not read image: {str(e)}")

    if response.status_code != 200:
        raise HTTPException(500, "Image reading service unavailable. Try manual entry.")

    result = response.json()
    text = result.get("content", [{}])[0].get("text", "").strip()

    # Strip any markdown fences Claude might add
    text = text.strip("` \n")
    if text.startswith("json"):
        text = text[4:].strip()

    try:
        extracted = json_lib.loads(text)
        if not isinstance(extracted, list):
            raise ValueError("Not a list")
        items = [{"label": str(item).strip(), "required": False}
                 for item in extracted if str(item).strip()]
    except Exception:
        raise HTTPException(422, "Could not extract checklist items from this image. Try manual entry.")

    if not items:
        raise HTTPException(422, "No checklist items found in this image. Try manual entry.")

    return {"items": items, "count": len(items)}



app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Startup: indexes + seed admin/pilot + ensure their built-in templates
# ---------------------------------------------------------------------------
async def seed_user_templates(user_id: str):
    """Insert built-in templates for the user if they don't have any built_in checklists yet."""
    existing = await db.checklists.count_documents({"user_id": user_id, "source": "built_in"})
    if existing > 0:
        return
    for tpl in BUILTIN_TEMPLATES:
        cid = str(uuid.uuid4())
        doc = {
            "id": cid,
            "user_id": user_id,
            "name": tpl["name"],
            "aircraft_id": None,
            "drone_type": tpl["drone_type"],
            "phase": tpl["phase"],
            "source": "built_in",
            "drone_photo_url": None,
            "is_locked": True,
            "qr_code_url": f"flyready://checklist/{cid}",
            "items": tpl["items"],
            "created_at": now_utc(),
        }
        await db.checklists.insert_one(doc)


async def seed_user(email: str, password: str, name: str, role: str):
    existing = await db.users.find_one({"email": email})
    if existing is None:
        uid = str(uuid.uuid4())
        await db.users.insert_one({
            "id": uid,
            "email": email,
            "name": name,
            "password_hash": hash_password(password),
            "role": role,
            "subscription_tier": "free",
            "subscription_expiry": None,
            "profile_photo_url": None,
            "created_at": now_utc(),
        })
        await seed_user_templates(uid)
        logger.info(f"Seeded user {email}")
    else:
        # ensure password matches env
        if not verify_password(password, existing["password_hash"]):
            await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_password(password)}})
        await seed_user_templates(existing["id"])


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.aircraft.create_index([("user_id", 1)])
    await db.checklists.create_index([("user_id", 1)])
    await db.flight_logs.create_index([("user_id", 1), ("checklist_id", 1)])
    await seed_user(os.environ["ADMIN_EMAIL"], os.environ["ADMIN_PASSWORD"], "Admin", "admin")
    await seed_user(os.environ["TEST_PILOT_EMAIL"], os.environ["TEST_PILOT_PASSWORD"], "Test Pilot", "pilot")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
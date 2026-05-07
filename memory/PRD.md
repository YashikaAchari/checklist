# FlyReady — PRD (v1 MVP)

## Vision
Production-ready cross-platform Expo mobile app for drone operators that manages preflight, inflight and postflight checklists with QR codes, GPS/weather, three-state checks, flight logging, signatures, photos, and PDF reporting.

## Tagline
Preflight · Inflight · Postflight

## v1 MVP scope (delivered)
- **Auth** — JWT email/password (register, login, /me) with Bearer tokens (`expo-secure-store` on native, `AsyncStorage` fallback on web)
- **Splash + onboarding** (3 slides) → login/register
- **Home** — top bar with FlyReady wordmark + connectivity dot + avatar; teal QR scan card; stats row; "Your checklists" cards (drone photo/icon left, name + type + phase + flight-count right); floating + button; bottom nav (Home / History / Fleet map / Profile)
- **Add new checklist flow** (4 steps) — choose method (Built-in template / PDF / Photo / Voice / Manual) → details (name, drone type chips, phase chips, drone photo) → review/edit items (inline edit, reorder, add, delete) → QR generated full screen with share button
- **QR scanner** — full-screen viewfinder via `expo-camera`, manual-ID fallback, deep link `flyready://checklist/{id}`
- **Operator details form** — pilot, GCS, flight ID auto-gen, aircraft, serial, battery, location with map pin (`react-native-maps` on native + web fallback), GPS auto-fill, weather (OpenWeatherMap auto-fetch + manual fallback), airspace check, mission objective, payload, AUW
- **Checklist execution** — sticky teal progress bar, live pass/fail/pending pills, side-by-side green tick + red cross 3-state buttons, haptic feedback, section grouping, flight start/stop timer, "Complete" or "Save with Issues ⚠" with confirmation
- **Post-flight summary** — failed items panel, damage report (severity chips + description), photos gallery (camera/gallery), remarks, two signature captures (pilot + GCS), Save flight record
- **History** — Level 1: checklist groups with flight count badges; Level 2: date-wise flight log list; Level 3: full flight record with all data + photos + signatures; PDF generate & native share via `expo-print` + `expo-sharing`
- **Profile** — user info, plan badge, role badge, log out, settings entry points

## Tech stack (delivered)
- **Frontend**: Expo SDK 54, expo-router, React 19, TypeScript, Zustand, axios
- **Native modules**: expo-camera (QR scan + permissions), expo-image-picker, expo-location, expo-secure-store, expo-haptics, expo-print, expo-sharing, expo-file-system, react-native-maps, react-native-qrcode-svg, @react-native-community/netinfo
- **Backend**: FastAPI + Motor + MongoDB, JWT (PyJWT), bcrypt, httpx for OpenWeatherMap proxy
- **Seed data**: 3 built-in templates per user (Multirotor / Fixed Wing / VTOL preflight) on registration + admin and pilot demo users
- **Drone-type names are GENERIC** — Multirotor, Heavy Lift, Fixed Wing, VTOL, Custom (no manufacturer brands anywhere)

## v2 roadmap (deferred from spec)
- Supabase migration (URL+anon key pending)
- Fleet Map (live drone pins, airspace overlay)
- Maintenance & Battery tracker with thresholds and push notifications
- Team management (admin invites, pilot roles, locked checklists)
- RevenueCat subscriptions (weekly/monthly/yearly tiers)
- Voice dictation, OCR PDF/photo import (Tesseract or Google Vision)
- Analytics dashboard, CSV export
- Multi-language (Hindi as 2nd locale)
- Biometric login (Face ID / Touch ID)
- Live Airspace API
- Full draw-on-canvas signatures (currently text-confirm)
- Offline-first WatermelonDB sync layer

## Auth credentials (seeded)
- Admin: admin@flyready.app / Admin@123
- Pilot: pilot@flyready.app / Pilot@123

## Environment variables
- `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `TEST_PILOT_EMAIL`, `TEST_PILOT_PASSWORD`, `OPENWEATHER_API_KEY` (optional — manual fallback used when empty)

## Key endpoints
- `POST /api/auth/register|login`, `GET /api/auth/me`
- `GET|POST /api/checklists`, `GET|PUT|DELETE /api/checklists/{id}`
- `POST /api/flight_logs`, `GET /api/flight_logs/{id}`, `GET /api/flight_logs/by_checklist/{checklist_id}`, `PUT /api/flight_logs/{id}`
- `GET /api/aircraft`, `POST /api/aircraft`
- `GET /api/weather?lat=&lon=` (proxies OpenWeatherMap; 503 if key missing)
- `GET /api/stats/overview`

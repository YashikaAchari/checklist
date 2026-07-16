# FlyReady — Product Requirements

## Overview
FlyReady is a **free & open-source** preflight / inflight / postflight checklist app for drone pilots.
- Backend: FastAPI + MongoDB (deployed on Render at https://flyready-backend.onrender.com)
- Frontend: React Native + Expo (deployed on Vercel at https://flyready-iota.vercel.app)
- Repo: https://github.com/YashikaAchari/checklist

## User Personas
1. **Solo drone pilot** — needs quick preflight, safety-first checklists, and history for compliance.
2. **Test pilot / R&D** — logs every flight for the same airframe, tracks changes since last flight, damage reports.
3. **Fleet operator** — multiple drones, needs QR-based check-in and maintenance tracking.

## Core (static) requirements
- Everything is FREE — no subscriptions, paywalls, or payment logic anywhere.
- Drone types are generic: Multirotor, Fixed Wing, Heavy Lift, VTOL — no brand names.
- Works on web, iOS, Android — no native-only imports at top level.
- No `Alert.alert` — always use Modals / inline error text (works on web).
- No hardcoded API keys in frontend — use env vars only.

## What's implemented (2026-07-16)
### Backend (FastAPI)
- **PDF import**: `POST /api/checklists/parse-pdf` (PyMuPDF) — parses PDF blocks into `{items:[{label, required}], count}`; returns 422 on empty PDFs.
- **Search**: `GET /api/checklists/search?q=` — case-insensitive; correctly ordered before `/checklists/{id}` route.
- **Detailed stats**: `GET /api/stats/detailed` — total_flights, flights_this_week, total_checklists, most_used_checklist.
- **Maintenance overview**: `GET /api/maintenance/overview` — per drone: flights since last maintenance, `maintenance_due` (>=50), `due_soon` (>=40), `last_maintenance_at`.
- **Log maintenance**: `POST /api/maintenance/log` — resets flight counter.
- **Public scan**: `GET /api/public/checklist/{id}` — no auth, exposes name / drone_type / item_count for scan landing.
- **Session length**: `ACCESS_TOKEN_DAYS = 30`.

### Frontend (Expo React Native)
- Onboarding: added Skip button; persists `flyready_onboarding_done` in AsyncStorage; splash routes intelligently (`onboarding` → `login` → `home`).
- Login: empty fields, show/hide password eye, inline error text (red under password field), improved `formatApiError` (401 / 500 / network).
- Home: personalised greeting "Welcome back, {FirstName}", QR scan card, search bar to filter checklists, empty-state with big drone icon + "Create your first checklist" CTA, quick stats row (total flights / total checklists / this week), QR icon per checklist card (opens QR without starting flight).
- History: total flight count at top, filter tabs (Week / Month / All time), each row shows date + operator + location + pass/fail count + duration, pull-to-refresh.
- Profile: subscription UI removed. Dark mode switch (`AppThemeProvider`) persisted to AsyncStorage. "About FlyReady" row with version + Free & open source badge. Logout confirmation modal with red Log out button.
- Execute: percentage next to progress bar, section headings grouped, 44×44px pass/fail buttons, per-item notes with edit icon, green Complete button when all items passed.
- Summary: color-coded damage severity cards (None/Minor/Moderate/Critical). All `Alert.alert` replaced with Modals. Post-save navigates to `/flight/success` (big green check + Flight ID + pass/fail + View record & Back to home buttons).
- Operator details: auto-generates Flight ID `YYYYMMDD-001`, section labels (OPERATOR / AIRCRAFT / LOCATION / WEATHER / MISSION), Begin button disabled+grey until Pilot name filled, ActivityIndicator spinner during weather / GPS fetch, all Alerts replaced with Modals.
- QR screen: uses public URL `https://flyready-iota.vercel.app/checklist/{id}/scan`, size 280, Copy Link (expo-clipboard), Print (web), checklist name + drone type above QR, sticker text below.
- Scan landing page (`/checklist/[id]/scan`): fetches via public endpoint, shows drone icon/name/type/items, "Start preflight" button.
- Maintenance tab: new tab with wrench icon; per-drone card with flight count, progress to 50, status badge (OK / Due soon / Overdue), red banner if any overdue, "Log maintenance" button.
- Fleet map: lists all drones with their last flight location, embedded Google Maps iframe (web) + "Open in Google Maps" link.
- Global: `AppThemeProvider` applies light/dark theme immediately via `useAppTheme()`; no hardcoded credentials remain.

## Testing status
- 18/18 backend tests passing (`/app/backend/tests/test_flyready_new_endpoints.py`).
- Frontend static export verified via `expo export --platform web` — all 30 routes compile cleanly.

## Backlog / next tasks
- P1: Dark mode support across every screen (light theme is default; only Profile fully consumes `useAppTheme` — other screens still import `lightTheme as t`; wire them up gradually).
- P1: Push notifications for maintenance overdue (Expo notifications).
- P2: PDF export of maintenance history.
- P2: Multi-user roles (organisation / team).
- P2: Offline queue for flight logs.

## Deployment
- Push to `main` on GitHub → Render deploys backend, Vercel deploys frontend.
- Environment vars: backend needs `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `OPENWEATHER_API_KEY`. Frontend needs `EXPO_PUBLIC_BACKEND_URL`.

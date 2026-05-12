# FlyReady Auth Testing Playbook

## Credentials
- Admin: `admin@flyready.app` / `Admin@123`
- Pilot: `pilot@flyready.app` / `Pilot@123`

## Auth model
- Bearer-token based JWT (NOT httpOnly cookies — this is a mobile app).
- Token returned in `access_token` field of `/api/auth/login` response.
- Subsequent requests must include header `Authorization: Bearer <token>`.

## Endpoints
- `POST /api/auth/register` body: `{email, password, name}` → `{access_token, user}`
- `POST /api/auth/login` body: `{email, password}` → `{access_token, user}`
- `GET /api/auth/me` headers: `Authorization: Bearer <token>` → user object

## Curl Tests
```bash
# 1. Login as seeded admin
TOKEN=$(curl -s -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@flyready.app","password":"Admin@123"}' | jq -r .access_token)
echo "Token: $TOKEN"

# 2. /me
curl -s http://localhost:8001/api/auth/me -H "Authorization: Bearer $TOKEN" | jq

# 3. Register new user
curl -s -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"newpilot@test.com","password":"Test@123","name":"New Pilot"}' | jq
```

## Verifications
- bcrypt hash starts with `$2b$`
- `users.email` has unique index
- 401 returned when token missing or invalid
- Password is never returned in responses

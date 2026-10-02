# MediXAI backend services

`express/` is the browser-facing API gateway. It verifies Firebase ID tokens,
enforces MongoDB-backed `USER` / `ADMIN` permissions, stores private user
profiles and analysis history, and forwards validated analysis requests to
`ml-service/`. FastAPI owns symptom normalization, model prediction, SHAP and
emergency-risk rules. The frontend does not call FastAPI directly.

## Run locally

Configure MongoDB and Firebase first using the [account platform setup](../docs/ACCOUNT_SETUP.md).
Authenticated features require a MongoDB replica set (Atlas is supported);
Express keeps protected routes closed when the account services are unavailable.
The Firebase Admin SDK is backend-only. Never place its credentials in frontend
environment variables or commit credential files.

Start FastAPI from the repository root:

```powershell
.\.venv\Scripts\python.exe -m uvicorn main:app --app-dir backend/ml-service --host 127.0.0.1 --port 8000 --no-access-log
```

In another terminal:

```powershell
cd backend/express
npm ci
Copy-Item .env.example .env
# Fill the Firebase Admin and MongoDB variables documented in ACCOUNT_SETUP.md.
npm run dev
```

Start Next.js in a third terminal after setting `frontend/.env.local`; setup steps
and supported public Firebase Web configuration are in the
[root README](../README.md).

## APIs and behavior

FastAPI exposes GET `/health`, `/model-info` and POST `/predict`, `/explain`,
`/risk`, `/analyze`. Express exposes GET `/api/health`, `/api/model-info`,
`/api/content` and POST `/api/analyze`. Authenticated user APIs cover session
sync, profile/preferences, analyses and browser-PDF report preparation. `/api/admin/*`
requires a verified Firebase identity whose MongoDB user role is `ADMIN`.

Analysis requests require explicit disclaimer acceptance. Successful results are
saved with the verified user's UID and an audit event; failed ML results are not
persisted. History, details, deletion and reports are scoped to the owning user.
Admin analysis monitoring excludes raw symptom text and user IDs. The analysis
rate limit is 30 requests per minute per connection IP, local to one gateway
process; proxy trust is not enabled. See the setup guide for exact endpoints,
schemas, privacy, bootstrap and deployment notes.

## Tests

```powershell
cd backend/express
npm test
```

The platform tests use an isolated MongoDB in-memory replica set and mocked
Firebase token verification. They validate contracts but do not prove connection
to a live Firebase project or production MongoDB. From the repository root, run
Python tests with `.\.venv\Scripts\python.exe -m pytest -q` and integration smoke
with `.\.venv\Scripts\python.exe backend/integration_smoke.py` when services run.
The smoke exercises FastAPI directly plus Express health/anonymous rejection by
default. Export `NEXT_PUBLIC_FIREBASE_API_KEY`, `E2E_TEST_EMAIL` and
`E2E_TEST_PASSWORD` to run its authenticated gateway/persistence checks too.
After building the frontend, `.\.venv\Scripts\python.exe backend/run_e2e.py`
starts missing local services and runs the integration/browser checks.

See the [root README](../README.md) and [account setup](../docs/ACCOUNT_SETUP.md).

# MediXAI account platform setup

The existing Next.js → Express → FastAPI pipeline remains intact. Firebase handles passwords and identity; MongoDB is authoritative for application roles and saved records. Python remains the source of truth for preprocessing, model inference, confidence, SHAP and risk. The model has not been retrained or replaced.

## Firebase

1. Create a Firebase project and register a Web app. Enable Email/Password under Authentication → Sign-in method. Enable email enumeration protection and a password policy (minimum 12 characters, uppercase, lowercase, number and symbol). The browser form enforces these rules too; the Firebase policy must enforce them against direct SDK calls. Require multi-factor authentication for administrators where supported.
2. Add only your deployment host and local development host to Authentication authorized domains. Leave unused sign-in providers disabled. Enable Google only if needed and tested, then set `NEXT_PUBLIC_FIREBASE_GOOGLE_ENABLED=true`.
3. Copy `frontend/.env.example` to `frontend/.env.local` and enter the Firebase Web app configuration from Firebase Console → Project settings → Your apps. Keep the real configuration in the ignored local `.env.local`, not in source files or committed examples. The Web API key is public client configuration, not an Admin credential; restrict it in Google Cloud to the required Firebase APIs and application origins. Analytics is not initialized by the current app; no analytics collection is enabled.
4. Set the password-reset email template's custom action URL to `https://YOUR-HOST/reset-password` (local testing: `http://localhost:3000/reset-password`). Firebase supplies the one-time `oobCode`; the page validates and consumes it. Never log or share reset links.
5. Configure `backend/express/.env` with the Firebase project ID and prefer workload identity for hosted deployments or Application Default Credentials for local development (`gcloud auth application-default login`). If a service-account key is unavoidable, provision it directly to a protected secret manager or a file outside the repository; never paste it into chat, source code, a tracked `.env.example`, or any `NEXT_PUBLIC_` variable. The backend supports the `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` pair, but long-lived private keys should be avoided where keyless identity is available.

If a Firebase private key or MongoDB password has been shared in chat, logs, or source control, treat it as compromised: revoke/rotate it in Google Cloud IAM or MongoDB Atlas before configuring the app. Clearing a local `.env` does not revoke a credential in the provider.

## MongoDB

Set `MONGODB_URI` and `MONGODB_DB_NAME=medixai` in the ignored `backend/express/.env`. Use Atlas or an authenticated replica set; standalone MongoDB is intentionally rejected because saved results and their audit entries use transactions. Create a dedicated database user with only the required read/write privileges on this database, use Atlas network access restrictions, and never reuse or commit a database password. Store the rotated URI only in a secret manager or ignored local `.env`; tracked examples intentionally leave it blank. Production should use TLS and a private/restricted network. Indexes are created once on startup, including unique Firebase UID/email, owner/date history and owner/analysis reports.

Collections: `users`, `analyses`, `reports`, `auditLogs`, `settings`, `content`, and a `systemLogs` collection with a 30-day TTL index reserved for operational records. The application does not currently write documents to `systemLogs`; gateway request logs go to stdout and omit symptom text. Passwords, Firebase tokens and service account secrets are never stored in MongoDB. Report documents describe browser-PDF preparation and have no fabricated file URL.

## Run

Start the existing FastAPI service, then `npm start` in `backend/express` and `npm run dev` in `frontend`. Restart Express after changing server env; restart/rebuild Next.js after changing public env. Missing configuration leaves protected routes closed with a controlled 503; public product pages and ML information remain available.

Create an ordinary account through `/register`, then from a trusted terminal in `backend/express`:

```powershell
npm run create-admin -- --email your-real-account@example.com
# Alternatively: npm run create-admin -- --uid YOUR_FIREBASE_UID
```

The script looks up the existing Firebase identity, synchronizes a MongoDB profile and records an `ADMIN_SEEDED` audit. It does not create a password, expose a public promotion endpoint or accept a role from registration. Refresh the browser session after seeding. Roles are exactly `USER` and `ADMIN` and are read from MongoDB on every protected request. Administrators cannot change their own role/status or remove the last active administrator. Concurrent administrator changes are serialized transactionally.

For authenticated Playwright scenarios, create a separate non-admin Firebase test user and use a disposable MongoDB database. Set `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD` in the shell that runs `backend/run_e2e.py`; do not place these credentials in source control or public frontend variables. If you also export the public `NEXT_PUBLIC_FIREBASE_API_KEY` to that shell, the integration smoke checks authenticated gateway persistence using Firebase's password sign-in endpoint. The tests use synthetic symptoms, save successful results as normal, and delete the records they create. Do not run them against production or a real user's account.

## API contract

Send `Authorization: Bearer <Firebase ID token>`; Express verifies signature, audience, issuer, expiry and revocation through the Admin SDK. The client refreshes the token once after a 401. If the refreshed token is also rejected, the client signs out and protected pages redirect to `/login` with a sanitized return path. Database failure never downgrades an authenticated request to anonymous access. Firebase account creation and profile sync can be retried independently if MongoDB is temporarily unavailable.

- Public: `GET /api/health`, `/api/model-info`, `/api/content` (published operational notices).
- Identity: `GET /api/auth/me`, `POST /api/auth/session`, `/api/auth/logout`.
- User: `GET /api/users/me`, `/api/users/me/overview`; `PATCH /api/users/me/profile`, `/api/users/me/settings`.
- Analyses: `POST /api/analyze` (preserved) or `/api/analyses`; `GET /api/analyses`, `GET/DELETE /api/analyses/:id`.
- Reports: `GET/POST /api/reports`, `GET /api/reports/:id` (owner only).
- Admin: `GET /api/admin/overview`, `/users`, `/analyses`, `/analytics`, `/model`, `/system`, `/audit-logs`, `/content`, `/settings`; `PATCH /users/:uid`, `/settings`; `PUT /content/:id` (`platform-notice` or `help`).

Analysis now requires `{symptoms, language: "en"|"bn", disclaimerAccepted: true}` and a signed-in user. Successful output preserves the ML payload and adds `analysisId` and `createdAt`. Failed inference is never saved as a completed analysis. If persistence fails after inference, the API returns a controlled failure and retains any actual emergency guidance; it does not claim a record was saved. Account endpoints use `{success, data, requestId}`; errors use `{success:false, error:{code,message}, requestId}`.

Lists accept `page`, `limit` (max 50), `sort=newest|oldest`. History/monitoring accept `search` (possible condition), `from`/`to` (inclusive UTC calendar dates). User lists accept `search`, `role`, `active`; audit lists accept `action`. Unknown fields are rejected. History/detail/report/delete queries always include the verified owner's UID; admin monitoring explicitly excludes symptom text and owner IDs.

## Privacy and operation

Users explicitly accept saving symptoms and completed results before submitting. Analysis history persists until the owner deletes each record; related report references are removed atomically. Audit entries contain IDs/actions and minimal metadata, never symptom text or passwords. Minimal audit records remain after analysis deletion. Configure an operator-approved audit retention and backup-deletion policy before deploying with real health data. Deactivation blocks app access; it does not delete the Firebase identity or existing records. Account deletion requests require the deployment operator until a verified self-service deletion workflow is implemented.

Firebase persists browser login; sign out on shared devices. Voice uses the browser's recognition service only after explicit activation and never auto-submits. PDF export uses Print / Save as PDF and does not upload generated files. The UI does not claim a PDF was downloaded merely because its preparation was recorded.

Use HTTPS in deployment, configure the exact `CORS_ORIGIN`, keep FastAPI private, and set `NODE_ENV=production`. A single-process in-memory write-rate limit is provided; deployments with multiple gateway instances need a shared limiter and correctly configured trusted proxy handling. Auth emulators must never be enabled in production. Google provider setup and real email delivery require manual verification in your Firebase project.

Official references: [Firebase token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens), [email/password](https://firebase.google.com/docs/auth/web/password-auth), [Google](https://firebase.google.com/docs/auth/web/google-signin), [MongoDB transactions](https://www.mongodb.com/docs/drivers/node/current/crud/transactions/).

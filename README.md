# HealthChain

HealthChain is a **Vite** frontend plus **Express** API for the federated health-record demo. The old single-file `federate.html` prototype was replaced by the SPA under [`frontend/`](frontend/) and is no longer in this repo.

## Run Locally

**Prerequisites:** MongoDB reachable at `MONGO_URI` (see below). The API exits on startup if it cannot connect.

Terminal 1 — backend:

```powershell
cd "C:\Projects\INUNITY PROJECT\backend"
node server.js
```

Terminal 2 — frontend dev server:

```powershell
cd "C:\Projects\INUNITY PROJECT\frontend"
node .\node_modules\vite\bin\vite.js --host 127.0.0.1
```

Open `http://localhost:5173`.

Demo logins (after seed):

```text
patient@healthchain.io / health123
doctor@healthchain.io / health123
insurer@healthchain.io / health123
```

## MongoDB

Set `MONGO_URI` in [`backend/.env`](backend/.env) (see [`backend/.env.example`](backend/.env.example)). Example:

```text
MONGO_URI=mongodb://localhost:27017/healthchain
```

If the database is unreachable at startup, the process logs an error and **exits** (`process.exit(1)`). Start Mongo first (e.g. `docker compose up -d mongo`).

Use `AUTO_SEED=false` to skip automatic demo seeding when Mongo is connected.

## Real-time updates (SSE)

Live vitals, insurance step progress, and federated training progress use **Server-Sent Events** (`EventSource`), not Socket.io. Clients call:

- `GET /api/vitals/stream`
- `GET /api/insurance/steps/:id`
- `GET /api/federated/stream/:roundId`

(Authenticated SSE passes `?token=` because browsers do not send custom headers on `EventSource`.)

## Docker

```powershell
docker compose up --build
```

This runs MongoDB, the API, and the **production-built** frontend behind nginx on port **5173** (see [`frontend/nginx.conf`](frontend/nginx.conf)).

## Deploy (Vercel)

The repo includes [`vercel.json`](vercel.json) and [`api/index.js`](api/index.js). Use a hosted MongoDB (e.g. Atlas), set `MONGO_URI`, `JWT_SECRET`, and `FRONTEND_URL` in the Vercel project environment.

## API highlights

Auth and core resources:

- `POST /api/auth/login`, `POST /api/auth/register`
- `GET /api/patients/me`, `GET /api/patients`
- `GET|POST /api/records`
- `GET /api/vitals`, `GET /api/vitals/stream`

Doctor and insurance:

- `GET /api/doctor/patients`, `GET|POST /api/doctor/uploads`
- `POST /api/insurance/request`
- `GET /api/insurance/steps/:id` (SSE)

Federated AI:

- `GET /api/federated/status`
- `POST /api/federated/start` (alias: `POST /api/federated/start-round`)

Activity log:

- `GET|POST /api/activity` (alias: `GET|POST /api/activity-log`)

Health:

- `GET /api/health`

**QR access:** QR tokens are generated in the browser (canvas); the UI logs activity via `POST /api/activity` — there is no separate QR minting endpoint.

## Smoke check

With the API running on port 3001:

```powershell
node scripts/smoke-api.mjs
```

## Project layout

- [`frontend/`](frontend/) — Vite SPA (`src/pages`, `src/components`, `src/api/client.js`)
- [`backend/`](backend/) — Express API (`server.js`, `src/routes`, `src/models`, `src/config/db.js`)

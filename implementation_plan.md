# HealthChain — Scalable Full-Stack Architecture

## Overview

Transform the single monolithic `federate.html` into a production-ready, scalable full-stack project. The frontend will be a **Vite + Vanilla JS** multi-page SPA with a clean component/module architecture. The backend will be an **Express.js REST API** (Node.js) with a **MongoDB** data store — giving you a real data layer, authentication, and API endpoints the UI can consume. Everything lives in a clean monorepo structure.

---

## User Review Required

> [!IMPORTANT]
> **Backend Tech Choices** — The plan defaults to:
> - **Node.js + Express** for the API server
> - **MongoDB + Mongoose** for the database (great for health record JSON docs)
> - **JWT** for auth (stateless, scalable)
> - **Socket.io** for live vitals / federated AI updates (real-time)
>
> If you prefer a different stack (Python/FastAPI, PostgreSQL, etc.), let me know before I start.

> [!WARNING]
> **No live blockchain/IPFS** in this phase — those are simulated with realistic API calls and mock data. A real blockchain layer can be added in Phase 2.

---

## Open Questions

> [!IMPORTANT]
> 1. **Auth**: Should login be real (JWT + DB users) or kept as a demo bypass for now?
> 2. **Deployment target**: Local dev only, or should I also add Docker + `.env` configuration?
> 3. **Database**: Should I seed the DB with the existing mock data, or start fresh?

I'll proceed with: **real auth**, **local dev + Docker-ready**, **seeded with mock data** — unless you say otherwise.

---

## Proposed Architecture

```
INUNITY PROJECT/
├── frontend/                  # Vite + Vanilla JS SPA
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── main.js            # App entry, router
│       ├── api/               # API client layer
│       │   └── client.js      # fetch wrapper + auth headers
│       ├── components/        # Reusable UI components
│       │   ├── nav.js
│       │   ├── starfield.js
│       │   └── toast.js
│       ├── pages/             # One file per panel
│       │   ├── patient.js
│       │   ├── doctor.js
│       │   ├── insurance.js
│       │   └── federated.js
│       └── styles/
│           ├── base.css       # Variables, resets
│           ├── components.css # Buttons, badges, cards
│           └── animations.css # Keyframes
│
├── backend/                   # Express REST API
│   ├── package.json
│   ├── server.js              # App entry
│   ├── .env.example
│   └── src/
│       ├── config/
│       │   └── db.js          # MongoDB connection
│       ├── middleware/
│       │   └── auth.js        # JWT verify
│       ├── models/            # Mongoose schemas
│       │   ├── Patient.js
│       │   ├── Doctor.js
│       │   ├── Record.js
│       │   └── AccessLog.js
│       ├── routes/            # REST endpoints
│       │   ├── auth.js        # POST /login, /register
│       │   ├── patients.js    # GET/POST /patients
│       │   ├── records.js     # GET/POST /records
│       │   ├── vitals.js      # GET /vitals (WebSocket)
│       │   ├── insurance.js   # POST /access-request
│       │   └── federated.js   # GET /model-status
│       └── seed/
│           └── seed.js        # Seed script with existing mock data
│
├── docker-compose.yml         # MongoDB + API + Frontend
└── README.md
```

---

## Proposed Changes

### Frontend

#### [NEW] `frontend/` (Vite project)

- **`src/styles/base.css`** — All CSS variables, resets, grid helpers extracted from the monolith
- **`src/styles/components.css`** — Button, badge, glass card, stat-card styles
- **`src/styles/animations.css`** — All `@keyframes` (pulse-dot, qrReveal, scan, etc.)
- **`src/components/nav.js`** — Nav bar component with live clock and system status
- **`src/components/starfield.js`** — Canvas star animation (extracted, self-contained)
- **`src/components/toast.js`** — Notification toasts for API success/error feedback
- **`src/api/client.js`** — `apiFetch()` wrapper: base URL from env, auth token injection, error handling
- **`src/pages/patient.js`** — Patient panel: fetches `/api/patients/me`, `/api/records`, `/api/vitals`
- **`src/pages/doctor.js`** — Doctor panel: fetches `/api/patients`, upload via `POST /api/records`
- **`src/pages/insurance.js`** — Insurance panel: `POST /api/insurance/access-request`, SSE progress
- **`src/pages/federated.js`** — Federated AI panel: `GET /api/federated/status`, `POST /api/federated/start-round`
- **`src/main.js`** — Router: maps nav tabs to page modules, handles init

---

### Backend

#### [NEW] `backend/src/models/`

| Model | Fields |
|---|---|
| `Patient` | id, name, bloodType, healthScore, patientId |
| `Doctor` | id, name, specialty, hospital, licenseNo |
| `Record` | id, patientId, type, date, doctorId, status, icon |
| `AccessLog` | id, actor, action, timestamp, color |
| `InsuranceRequest` | id, patientId, insurerId, status, steps[] |
| `FederatedRound` | id, round, accuracy, nodeStatus[] |

#### [NEW] `backend/src/routes/`

| Route | Methods | Description |
|---|---|---|
| `/api/auth/login` | POST | Returns JWT |
| `/api/patients/me` | GET | Current patient profile |
| `/api/records` | GET, POST | Patient records |
| `/api/vitals` | GET | Live vitals (simulated) |
| `/api/vitals/stream` | GET (SSE) | Server-Sent Events for real-time vitals |
| `/api/doctor/patients` | GET | Doctor's patient queue |
| `/api/doctor/uploads` | GET, POST | Upload clinical report |
| `/api/insurance/request` | POST | Start access request flow |
| `/api/insurance/steps/:id` | GET (SSE) | Real-time step progress |
| `/api/federated/status` | GET | Model accuracy, node count |
| `/api/federated/start` | POST | Kick off a training round |
| `/api/activity-log` | GET | Access timeline |

---

### DevOps

#### [NEW] `docker-compose.yml`
- `mongo` service (port 27017)
- `backend` service (port 3001), env-injected
- `frontend` service (Vite dev server, port 5173)

#### [NEW] `README.md`
- Quick-start instructions (npm, Docker)
- API reference table
- Project structure overview

---

## Verification Plan

### Automated Tests
- Run `npm run dev` in both `frontend/` and `backend/`
- Verify all 4 panels load with live API data
- Verify QR token generation endpoint
- Verify insurance flow SSE steps stream correctly

### Manual Verification
- Open browser at `http://localhost:5173`
- Click through all 4 tabs: Patient, Doctor, Insurance, Federated AI
- Upload a report in Doctor tab → counter increments via API
- Run insurance flow → steps animate via SSE
- Start Federated round → accuracy updates via API polling

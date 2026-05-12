# HealthChain

HealthChain is a Vite frontend plus Express API for the federated health-record demo in `federate.html`.

## Run Locally

The installed global `npm` shim on this machine is currently broken, so these commands use the local Node entrypoints directly.

Terminal 1:

```powershell
cd "C:\Projects\INUNITY PROJECT\backend"
node server.js
```

Terminal 2:

```powershell
cd "C:\Projects\INUNITY PROJECT\frontend"
node .\node_modules\vite\bin\vite.js --host 127.0.0.1
```

Open `http://localhost:5173`.

Demo logins:

```text
patient@healthchain.io / health123
doctor@healthchain.io  / health123
insurer@healthchain.io / health123
```

## MongoDB Integration

MongoDB remains the primary data path. The backend tries `MONGO_URI` first:

```text
MONGO_URI=mongodb://localhost:27017/healthchain
```

If MongoDB is unavailable, the API falls back to in-memory seeded demo data so local development still works. Set `AUTO_SEED=false` to disable automatic seed data when Mongo is connected.

## Docker

When Docker is installed:

```powershell
docker compose up --build
```

The compose stack runs MongoDB, the API, and the built frontend. The nginx config in `frontend/nginx.conf` proxies `/api` to the backend service.

## API Highlights

- `POST /api/auth/login`
- `GET /api/patients/me`
- `GET /api/records`
- `GET /api/vitals`
- `GET /api/vitals/stream`
- `GET /api/doctor/patients`
- `POST /api/doctor/uploads`
- `POST /api/insurance/request`
- `GET /api/insurance/steps/:id`
- `GET /api/federated/status`
- `POST /api/federated/start`

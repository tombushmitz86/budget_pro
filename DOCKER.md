# BudgetPro – Docker setup

## Stack

- **app** – Frontend (Vite/React), served as static files
- **api** – Backend (Node + Express) on port 3001
- **database** – SQLite file in volume `budgetpro_data` (used by `api`)

## Quick start (dev-style: two ports)

```bash
docker compose up -d
```

Or use the helper script (builds, starts, waits for API, runs a quick health/transactions test):

```bash
./scripts/run-local.sh           # start + test
./scripts/run-local.sh --no-test  # start only
./scripts/run-local.sh down       # stop
```

- App: http://localhost:3000  
- API: http://localhost:3001  

The frontend is built with `VITE_API_URL=http://localhost:3001` so the browser talks to the API on the same host.

## Production (single entrypoint on port 80)

Uses nginx to serve the app and proxy `/api` to the backend. One URL, no CORS.

```bash
./scripts/deploy-production.sh
# or
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Then open **http://localhost** (or your server’s IP). The API is at **http://localhost/api/...**.

### Deploy script commands

| Command | Description |
|--------|-------------|
| `./scripts/deploy-production.sh` or `up` | Build and start (production mode) |
| `./scripts/deploy-production.sh down` | Stop and remove containers (keeps volume) |
| `./scripts/deploy-production.sh logs` | Follow logs |
| `./scripts/deploy-production.sh restart` | Restart services |

Data is stored in the Docker volume `budgetpro_data`. To wipe data and start clean:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml down -v
```

## Run without Docker (e.g. Ultra.cc)

If you can’t run Docker (e.g. on Ultra.cc), run the API and app on a single port:

```bash
./scripts/run-without-docker.sh
```

This installs deps, builds the frontend (with same-origin `/api`), then starts the server on **http://0.0.0.0:3000**. Open **http://localhost:3000** locally or **http://YOUR_ULTRA_CC_HOST:3000** from elsewhere.

To use another port:

```bash
PORT=8080 ./scripts/run-without-docker.sh
```

Or build once and start manually:

```bash
npm ci && VITE_API_URL= npm run build
SERVE_APP=1 HOST=0.0.0.0 PORT=3000 npm start
```

## Optional env

- **VITE_API_URL** – Set when building the default (non-nginx) app image if the API is at another URL (e.g. `https://api.example.com`). Not used in prod stack (nginx proxies `/api`).

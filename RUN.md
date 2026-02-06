# Running BudgetPro

## NPM commands

- **Development** (hot reload on port 3000):
  ```bash
  npm install
  npm run dev
  ```
- **Production build**:
  ```bash
  npm run build
  ```
- **Run production build locally**:
  ```bash
  npm run start
  ```
  Serves the built app at http://localhost:3000.

## Docker

**Build the image:**
```bash
docker build -t budgetpro .
```

**Run the container:**
```bash
docker run -p 3000:3000 budgetpro
```

Then open http://localhost:3000.

## N26 connection (OAuth) – full backend

The app includes a small **API server** that exchanges the authorization code for tokens and stores them. The frontend proxies `/api` to this server in development.

### 1. Run backend and frontend

**Terminal 1 – API server (port 3001):**
```bash
npm run server
```

**Terminal 2 – Frontend (port 3000, proxies /api to 3001):**
```bash
npm run dev
```

Open http://localhost:3000. In Settings → N26 Account you can:
- **Demo:** If the backend is not configured, "Connect N26" shows an in-app consent modal; Authorize marks N26 as connected (localStorage). Sync N26 on Transactions uses mock data.
- **Real N26:** If backend and frontend env vars are set, "Connect N26" redirects to N26; after login, N26 redirects to your callback; the **backend** exchanges the code for tokens and stores them in `server/.n26-tokens.json` (gitignored). Connection status is synced from the backend.

### 2. Backend env vars (for real N26 token exchange)

Set these when running the API server (e.g. in `.env` in project root, or export before `npm run server`):

| Env var | Description |
|--------|-------------|
| `N26_TOKEN_URL` | N26 token endpoint (from N26 PSD2 TPP docs, e.g. sandbox or production) |
| `N26_CLIENT_ID` | Your TPP client id (from N26 / regulator) |
| `N26_CLIENT_SECRET` | Your TPP client secret (never in frontend) |

Example `.env` (do not commit secrets):
```
N26_TOKEN_URL=https://api.n26.com/oauth/token
N26_CLIENT_ID=your_client_id
N26_CLIENT_SECRET=your_client_secret
```

The server does **not** load `.env` by default; use `dotenv` or export vars manually. Example with Node:
```bash
export N26_TOKEN_URL=... N26_CLIENT_ID=... N26_CLIENT_SECRET=...
npm run server
```

### 3. Frontend env vars (for redirect to N26)

For Vite, use `.env` or `.env.local` (prefix with `VITE_` so they are exposed to the client):

| Env var | Description |
|--------|-------------|
| `VITE_N26_AUTH_URL` | N26 authorization endpoint (where the user is sent to log in) |
| `VITE_N26_CLIENT_ID` | Same as backend (or frontend-only client id if N26 uses separate) |
| `VITE_N26_REDIRECT_URI` | Your callback URL, e.g. `http://localhost:3000/#/connect/n26/callback` (dev) or `https://yourdomain.com/#/connect/n26/callback` (prod). Must match exactly what is registered with N26. |
| `VITE_N26_SCOPE` | (optional) e.g. `AIS` |

### 4. API endpoints (backend)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/connect/n26/token` | Body: `{ code, redirect_uri }`. Exchanges code with N26, stores tokens, returns `{ success, expiresIn? }` or `{ success: false, error }`. |
| GET | `/api/connect/n26/status` | Returns `{ connected: boolean }` (true if tokens are stored). |
| POST | `/api/connect/n26/disconnect` | Clears stored tokens. Returns `{ success: true }`. |
| GET | `/api/connect/n26/config` | Returns `{ configured: boolean }` (true if N26 env vars are set). |

### 5. Token storage

Tokens are stored in memory and optionally persisted to `server/.n26-tokens.json` (gitignored) so they survive server restarts. Use a proper secret store in production.

### 6. Registration

Real N26 PSD2 access requires TPP registration with a national regulator (e.g. BaFin) and a qualified certificate (QWAC). See N26’s PSD2 TPP docs and your regulator for registration; this backend only performs the OAuth code exchange once you have credentials.

**Optional:** Pass `GEMINI_API_KEY` at build time if your app needs it for the image:
```bash
docker build --build-arg GEMINI_API_KEY=your_key -t budgetpro .
```

Or at runtime (if your app reads env at runtime):
```bash
docker run -p 3000:3000 -e GEMINI_API_KEY=your_key budgetpro
```

# Zamanla

**Group availability scheduling without the friction.**

Zamanla lets friends, teams, or small groups find common free times — no account required. Create a session, share a link, and see when everyone is available through a clean heatmap view.

The key differentiator is the hybrid availability input: participants can set recurring patterns ("I'm free on Mondays and Wednesdays after 18:00") which auto-fill the calendar grid, then fine-tune individual slots. No tedious slot-by-slot clicking.

---

## Product Concept

1. **Creator** sets up a scheduling session with a date range, time window, and slot size
2. **Shareable links** are generated — a public link for participants and a private admin link for the creator
3. **Participants** open the public link, enter their name, and mark availability using recurring rules or manual grid selection
4. **Results** show a heatmap of group availability with the best matching time slots highlighted

---

## Architecture

```
zamanla/
├── client/          React + Vite frontend
├── server/          Node.js + Express backend
├── docker-compose.yml
├── .env.example
└── README.md
```

### Backend (server/)

Layered architecture:

```
server/
├── index.js                    Entry point
├── migrations/
│   ├── 001_initial_schema.sql  Database schema
│   └── migrate.js              Migration runner
└── src/
    ├── config/                 Environment + database config
    ├── controllers/            HTTP request handlers
    ├── middleware/              Error handling, rate limiting, logging
    ├── repositories/           Database access layer (raw SQL via pg)
    ├── routes/                 Route definitions
    ├── services/               Business logic
    ├── utils/                  Tokens, time utilities, response helpers
    └── validators/             Zod input schemas
```

### Frontend (client/)

```
client/src/
├── components/
│   ├── availability/           AvailabilityGrid, RecurringRuleForm, ParticipantEditor
│   ├── common/                 Button, Input, Select, Modal, Toast, etc.
│   └── results/                ResultsHeatmap, BestTimesPanel
├── hooks/                      useSession, useParticipant (TanStack Query)
├── pages/                      HomePage, CreateSessionPage, SessionPage, AdminPage
├── services/                   Axios API client
└── utils/                      Slot generation, timezone, heatmap colors
```

---

## Local Development

### Prerequisites

- Docker + Docker Compose
- Node.js 20+ (for running outside Docker)

### Quick Start with Docker Compose

```bash
# Clone and enter the project
cd zamanla

# Copy environment config
cp .env.example .env

# Start everything
docker compose up --build

# Run migrations (first time only)
docker compose exec server npm run migrate
```

- **Frontend:** http://localhost:9050
- **Backend API:** http://localhost:9051/api
- **PostgreSQL:** localhost:9052

### Local Development (without Docker)

**1. Start PostgreSQL**
```bash
# Using Docker for just the database
docker compose up postgres -d
```

**2. Set up the server**
```bash
cd server
cp ../.env.example .env   # edit as needed
npm install
npm run migrate
npm run dev
```

**3. Set up the client**
```bash
cd client
cp ../.env.example .env   # edit as needed
npm install
npm run dev
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `9052` | PostgreSQL port |
| `DB_NAME` | `zamanla` | Database name |
| `DB_USER` | `zamanla` | Database user |
| `DB_PASSWORD` | *(required)* | Database password |
| `NODE_ENV` | `development` | `development` or `production` |
| `PORT` | `9051` | Backend server port |
| `CORS_ORIGIN` | `http://localhost:9050` | Allowed CORS origin(s) |
| `TURNSTILE_SECRET_KEY` | *(optional)* | Cloudflare Turnstile secret key |
| `AUTH_JWT_SECRET` | `dev-only-change-me` | JWT signing secret for optional account auth |
| `AUTH_JWT_EXPIRES_IN` | `7d` | JWT expiration (e.g. `7d`, `12h`) |
| `AUTH_COOKIE_NAME` | `zamanla_auth` | Auth cookie name |
| `AUTH_COOKIE_MAX_AGE_MS` | `604800000` | Auth cookie max age in milliseconds |
| `VITE_API_URL` | `http://localhost:9051/api` | Frontend API base URL |
| `VITE_TURNSTILE_SITE_KEY` | *(optional)* | Cloudflare Turnstile site key |

---

## Database Migrations

Migrations live in `server/migrations/`. The runner tracks applied migrations in a `schema_migrations` table.

```bash
# Run all pending migrations
npm run migrate        # from server/ directory

# Or via Docker
docker compose exec server npm run migrate
```

---

## Ports

| Service | Port | Notes |
|---|---|---|
| Frontend | 9050 | Vite dev server / Nginx in Docker |
| Backend API | 9051 | Express server |
| PostgreSQL | 9052 | Exposed on host for development |

These ports were chosen to avoid conflicts with other projects on this host.

---

## API Overview

### Sessions

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/sessions` | Create a new session |
| `GET` | `/api/sessions/:publicToken` | Get public session details |
| `GET` | `/api/sessions/admin/:adminToken` | Get admin view (includes participants + results) |
| `PATCH` | `/api/sessions/admin/:adminToken` | Update session settings |
| `DELETE` | `/api/sessions/admin/:adminToken` | Delete session |
| `POST` | `/api/sessions/admin/:adminToken/close` | Close session to new responses |
| `POST` | `/api/sessions/admin/:adminToken/claim` | Claim this session for the logged-in account |
| `GET` | `/api/sessions/admin/:adminToken/export` | Export results (`?format=json\|csv`) |

### Auth (Optional)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create account and start auth session |
| `POST` | `/api/auth/login` | Login and start auth session |
| `POST` | `/api/auth/logout` | Logout and clear auth cookie |
| `GET` | `/api/auth/me` | Get current authenticated user (or `null`) |

### My Account

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/my/schedules` | List schedules owned by authenticated user |

### Participants

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/sessions/:publicToken/participants` | Join a session (creates participant) |
| `GET` | `/api/sessions/:publicToken/participants/:editToken` | Get participant + their availability |
| `PUT` | `/api/sessions/:publicToken/participants/:editToken` | Save availability (rules + slots) |

### Results

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/sessions/:publicToken/results` | Get aggregated availability results |

**Response format:**
```json
{ "success": true, "data": { ... } }
{ "success": false, "error": { "code": "NOT_FOUND", "message": "Session not found" } }
```

---

## Availability Logic

The system supports three input modes, all of which compose:

1. **Recurring rules** — "Free on Mon/Wed after 18:00" — stored in `availability_rules` and expanded across the session date range
2. **Manual slot selection** — direct click/drag on the grid — stored as explicit `availability_slots`
3. **Manual overrides** — clicking a rule-filled slot to remove it — stored as `status='unavailable'` in `availability_slots`

Priority: manual overrides > rule-derived slots.

**Aggregation** counts available participants per slot, then ranks by count descending.

---

## Security

- **Public tokens:** 21-char nanoid (URL-safe, ~126 bits of randomness)
- **Admin tokens:** 32-char nanoid (~192 bits)
- **Edit tokens:** 21-char nanoid per participant
- **Rate limiting:** create session (30/15min), participant join (60/15min), general (200/15min), export (50/hr)
- **Input validation:** all payloads validated with Zod schemas server-side
- **Turnstile:** optional Cloudflare Turnstile on session creation and participant join forms
- **Optional auth:** JWT in HttpOnly cookie (`SameSite=Lax`, `Secure` in production)
- **CORS:** locked to configured origin(s)
- **Helmet:** standard security headers on all responses

---

## Production Deployment (scheduler.yildizsalih.com)

Set these environment variables in production:

```env
NODE_ENV=production
CORS_ORIGIN=https://scheduler.yildizsalih.com
VITE_API_URL=https://scheduler.yildizsalih.com/api
DB_PASSWORD=<strong-random-password>
AUTH_JWT_SECRET=<strong-random-secret>
AUTH_JWT_EXPIRES_IN=7d
TURNSTILE_SECRET_KEY=<from-cloudflare>
VITE_TURNSTILE_SITE_KEY=<from-cloudflare>
```

A reverse proxy (nginx, Caddy) should:
- Terminate SSL
- Route `/api/*` → backend on port 9051
- Route `/*` → frontend static files (or proxy to port 9050)

---

## Future Roadmap

The codebase is designed for SaaS evolution without a rewrite:

- **Authentication** — The `sessions` table has no required user FK; add optional `owner_id` for user-owned sessions
- **User accounts + dashboards** — Participants already have persistent edit tokens; extend with optional auth
- **Multiple sessions per user** — Already supported by schema (session → user FK)
- **Subscription tiers + billing** — Add `plans` table, usage limits as middleware
- **Team/workspace support** — Add `workspaces` table, workspace-scoped sessions
- **Branded scheduling pages** — Add `slug` + `branding` config to sessions
- **Audit logs** — Add `activity_log` table, populated via service layer hooks
- **Calendar integrations** — Export to `.ics`, Google Calendar sync
- **Notifications** — Email participants when session is finalized

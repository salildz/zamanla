# Zamanla — Deployment Guide

Three environments. Same codebase.

| Environment | URL | How to run |
|---|---|---|
| Local dev | http://localhost:9050 | `docker compose up` |
| Server dev | https://zamanla-dev.yildizsalih.com | `./scripts/dev-start.sh` |
| Production | https://zamanla.yildizsalih.com | `./scripts/deploy-prod.sh` |

---

## Ports

| Service | Port | Notes |
|---|---|---|
| Frontend (Vite / nginx) | 9050 | Vite dev server or Docker nginx |
| Backend (Express) | 9051 | Bound to localhost in server/prod |
| PostgreSQL | 9052 | Bound to localhost in server/prod |

These ports are intentionally chosen to avoid conflicts with other projects on this host.

---

## Prerequisites

- Docker + Docker Compose (v2)
- Node.js 20+ (for running builds outside Docker)
- `rsync` (for frontend deployment)
- `sudo` access (for writing to `/var/www/zamanla/`)
- nginx (already configured on this server)

---

## 1. Initial Setup (all environments)

```bash
# Clone the repo
git clone https://github.com/yildizsalih/zamanla.git
cd zamanla

# Create your env file
cp .env.example .env
# Edit .env with the correct values for your environment
```

---

## 2. Local Development

Full stack in Docker — postgres, server (nodemon), client (nginx serving built app).

```bash
# Start everything
docker compose up -d

# First time: run migrations
make migrate

# Follow logs
make logs

# Stop
make down
```

Frontend: http://localhost:9050
API: http://localhost:9051/api
DB (direct): localhost:9052

**Env file for local dev:**
```env
NODE_ENV=development
CORS_ORIGIN=http://localhost:9050
VITE_API_URL=http://localhost:9051/api
DB_PASSWORD=zamanla_dev_password
AUTH_JWT_SECRET=change_me_auth_jwt_secret
```

The server uses `Dockerfile.dev` (includes nodemon). Source is volume-mounted at `./server:/app`, so changes to server code restart automatically.

---

## 3. Server Dev Environment (zamanla-dev.yildizsalih.com)

Runs on the server with hot reload. nginx proxies the dev domain to the Vite dev server.

### First-time setup

**Step 1: Configure nginx**
```bash
sudo cp nginx/zamanla-dev.conf /etc/nginx/sites-available/zamanla-dev
sudo ln -s /etc/nginx/sites-available/zamanla-dev /etc/nginx/sites-enabled/zamanla-dev
sudo nginx -t
sudo systemctl reload nginx
```

**Step 2: Set env for server dev**

Edit `.env`:
```env
NODE_ENV=development
CORS_ORIGIN=https://zamanla-dev.yildizsalih.com
VITE_API_URL=/api
DB_PASSWORD=your_dev_password
AUTH_JWT_SECRET=change_me_auth_jwt_secret
HMR_HOST=zamanla-dev.yildizsalih.com
HMR_CLIENT_PORT=443
HMR_PROTOCOL=wss
```

**Step 3: Start the dev environment**
```bash
./scripts/dev-start.sh

# First time: run migrations
make dev-migrate
```

`docker-compose.dev.yml` is a **standalone file** (not an overlay of docker-compose.yml).
This avoids Docker's port list merge behavior, which would create conflicting bindings.

The Vite dev server runs in Docker on `127.0.0.1:9050`. nginx proxies `zamanla-dev.yildizsalih.com` to it. Hot reload (HMR) works through the domain via WebSocket.

### Updating during development

Code changes to `client/src/` are picked up automatically by Vite hot reload — no container restart needed.

For `server/src/` changes: nodemon restarts the server automatically — no container restart needed.

For `package.json` changes (new dependencies):
```bash
make dev-stop
make dev
```

### Logs
```bash
make dev-logs
# or
./scripts/logs.sh dev
```

---

## 4. Production Deployment (zamanla.yildizsalih.com)

### Architecture

```
Browser → Cloudflare → cloudflared → nginx (port 80)
                                         ├── /api/ → Docker: server (127.0.0.1:9051)
                                         └── /    → /var/www/zamanla/dist (static files)
```

The frontend is a pre-built static bundle served directly by nginx.
The backend is a Docker container bound to localhost.

### First-time setup

**Step 1: Configure nginx**
```bash
sudo cp nginx/zamanla.conf /etc/nginx/sites-available/zamanla
sudo ln -s /etc/nginx/sites-available/zamanla /etc/nginx/sites-enabled/zamanla
sudo nginx -t
sudo systemctl reload nginx
```

**Step 2: Create the web root**
```bash
sudo mkdir -p /var/www/zamanla/dist
```

**Step 3: Set production env**

Edit `.env` (on the server, this is the production `.env`):
```env
NODE_ENV=production
CORS_ORIGIN=https://zamanla.yildizsalih.com
VITE_API_URL=/api
DB_NAME=zamanla
DB_USER=zamanla
DB_PASSWORD=your_strong_production_password
AUTH_JWT_SECRET=your_strong_random_auth_secret
AUTH_JWT_EXPIRES_IN=7d
TURNSTILE_SECRET_KEY=your_cloudflare_turnstile_secret
VITE_TURNSTILE_SITE_KEY=your_cloudflare_turnstile_site_key
```

**Step 4: Full deploy**
```bash
./scripts/deploy-prod.sh
```

This runs:
1. `git pull origin main`
2. `npm ci && npm run build` (in client/)
3. `rsync` built files to `/var/www/zamanla/dist/`
4. `docker compose -f docker-compose.prod.yml up -d --build --force-recreate`
5. `npm run migrate`

### Subsequent deploys

```bash
# Full deploy (pull + build + frontend + backend + migrate)
./scripts/deploy-prod.sh

# Backend only (no frontend rebuild)
./scripts/deploy-prod.sh --skip-frontend

# Frontend only (no backend restart)
make build && make deploy-frontend

# Just restart containers (no rebuild)
make restart
```

### Logs
```bash
./scripts/logs.sh prod
# or
docker compose -f docker-compose.prod.yml logs -f
```

---

## 5. GitHub Setup

Initialize the repo and push:

```bash
cd /home/salih/projects/zamanla

# Initialize git
git init
git branch -M main

# Stage everything (node_modules and .env are excluded by .gitignore)
git add .

# Initial commit
git commit -m "feat: initial MVP — Zamanla group scheduling app"

# Add GitHub remote (replace with your actual repo URL)
git remote add origin https://github.com/yildizsalih/zamanla.git

# Push
git push -u origin main
```

Verify `.gitignore` is working before pushing:
```bash
# These should NOT appear in git status:
git status | grep node_modules   # should be empty
git status | grep ".env"         # should be empty (only .env.example is tracked)
git status | grep "dist/"        # should be empty
```

---

## 6. Nginx Commands Reference

```bash
# Test configuration syntax
sudo nginx -t

# Reload configuration (no downtime)
sudo systemctl reload nginx

# Full restart (causes brief downtime)
sudo systemctl restart nginx

# View nginx error log
sudo tail -f /var/log/nginx/error.log

# View access log
sudo tail -f /var/log/nginx/access.log

# List enabled sites
ls -la /etc/nginx/sites-enabled/
```

---

## 7. Database

### Migrations

Migrations run automatically during `deploy-prod.sh`. To run manually:

```bash
# Local dev
make migrate

# Server dev
make dev-migrate

# Production
docker compose -f docker-compose.prod.yml exec server npm run migrate
```

### Direct DB access

```bash
# Local dev
psql -h localhost -p 9052 -U zamanla -d zamanla

# Production (if port 9052 is exposed)
psql -h 127.0.0.1 -p 9052 -U zamanla -d zamanla

# Via Docker exec (always works)
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U zamanla -d zamanla
```

### Backup

```bash
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U zamanla zamanla > backup-$(date +%Y%m%d-%H%M%S).sql
```

---

## 8. Environment Variable Reference

| Variable | Local dev | Server dev | Production |
|---|---|---|---|
| `NODE_ENV` | `development` | `development` | `production` |
| `CORS_ORIGIN` | `http://localhost:9050` | `https://zamanla-dev.yildizsalih.com` | `https://zamanla.yildizsalih.com` |
| `VITE_API_URL` | `http://localhost:9051/api` | `/api` | `/api` |
| `AUTH_JWT_SECRET` | `change_me_auth_jwt_secret` | `change_me_auth_jwt_secret` | *(required)* |
| `AUTH_JWT_EXPIRES_IN` | `7d` | `7d` | `7d` |
| `HMR_HOST` | *(not set)* | `zamanla-dev.yildizsalih.com` | *(not set)* |
| `HMR_CLIENT_PORT` | *(not set)* | `443` | *(not set)* |
| `HMR_PROTOCOL` | *(not set)* | `wss` | *(not set)* |

---

## 9. Troubleshooting

**Containers won't start:**
```bash
docker compose -f docker-compose.prod.yml logs server
docker compose -f docker-compose.prod.yml logs postgres
```

**502 Bad Gateway from nginx:**
- Backend container is not running or not ready yet
- Check: `docker compose -f docker-compose.prod.yml ps`
- Check: `curl http://127.0.0.1:9051/health`

**HMR not working on dev domain:**
- Verify `HMR_HOST`, `HMR_CLIENT_PORT`, `HMR_PROTOCOL` are set in `.env`
- Verify nginx dev config has `Upgrade` and `Connection` headers
- Restart the client container: `docker compose -f docker-compose.yml -f docker-compose.dev.yml restart client`

**Frontend shows old version after deploy:**
- Vite's `dist/assets/` files are content-hashed — hard to cache
- The issue is usually `index.html` being cached: add `Cache-Control: no-cache` for `location /` in nginx

**Migration fails:**
- Check DB is running: `docker compose -f docker-compose.prod.yml ps postgres`
- Check credentials match between `.env` and what postgres was initialized with
- If schema is corrupted: connect directly and inspect `schema_migrations` table

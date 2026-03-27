#!/usr/bin/env bash
# Full production deployment:
#   1. Pull latest code
#   2. Build the frontend
#   3. Deploy built assets to /var/www/zamanla/dist
#   4. Rebuild and restart backend + postgres containers
#   5. Run pending migrations
#
# Usage: ./scripts/deploy-prod.sh [--skip-pull] [--skip-frontend]
#
# Flags:
#   --skip-pull      Skip git pull (useful when running from CI or after manual pull)
#   --skip-frontend  Skip frontend build + copy (deploy backend only)

set -euo pipefail

SKIP_PULL=false
SKIP_FRONTEND=false

for arg in "$@"; do
  case $arg in
    --skip-pull)      SKIP_PULL=true ;;
    --skip-frontend)  SKIP_FRONTEND=true ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DIST_TARGET="/var/www/zamanla/dist"

cd "$PROJECT_DIR"

echo "=== Zamanla Production Deployment ==="
echo "Project: $PROJECT_DIR"
echo "Frontend target: $DIST_TARGET"
echo ""

# ── 1. Pull latest ────────────────────────────────────────────────────────────
if [ "$SKIP_PULL" = false ]; then
  echo "[1/5] Pulling latest code..."
  git pull origin main
else
  echo "[1/5] Skipping git pull."
fi

# ── 2. Validate env ───────────────────────────────────────────────────────────
echo "[2/5] Checking environment..."
if [ ! -f .env ]; then
  echo "ERROR: .env not found. Copy .env.example and fill in production values."
  exit 1
fi

# Require production-critical vars
source .env
: "${DB_PASSWORD:?DB_PASSWORD must be set in .env}"
: "${CORS_ORIGIN:?CORS_ORIGIN must be set in .env}"

# ── 3. Build frontend ─────────────────────────────────────────────────────────
if [ "$SKIP_FRONTEND" = false ]; then
  echo "[3/5] Building frontend..."

  # Load frontend env vars (VITE_* only)
  VITE_API_URL="${VITE_API_URL:-/api}"
  VITE_TURNSTILE_SITE_KEY="${VITE_TURNSTILE_SITE_KEY:-}"

  cd client
  npm ci --silent
  VITE_API_URL="$VITE_API_URL" \
  VITE_TURNSTILE_SITE_KEY="$VITE_TURNSTILE_SITE_KEY" \
  npm run build
  cd "$PROJECT_DIR"

  echo "[3/5] Deploying frontend to $DIST_TARGET..."
  sudo mkdir -p "$DIST_TARGET"
  sudo rsync -a --delete client/dist/ "$DIST_TARGET/"
  echo "      Frontend deployed."
else
  echo "[3/5] Skipping frontend build."
fi

# ── 4. Rebuild and restart backend containers ─────────────────────────────────
echo "[4/5] Rebuilding and restarting backend..."
docker compose -f docker-compose.prod.yml up -d --build --force-recreate server postgres
echo "      Containers up."

# ── 5. Run migrations ─────────────────────────────────────────────────────────
echo "[5/5] Running database migrations..."
# Wait a moment for the server container to be healthy
sleep 3
docker compose -f docker-compose.prod.yml exec server npm run migrate
echo "      Migrations complete."

echo ""
echo "=== Deployment complete ==="
echo "  Site:  https://zamanla.yildizsalih.com"
echo "  API:   https://zamanla.yildizsalih.com/api"
echo ""
echo "Check logs:"
echo "  ./scripts/logs.sh prod"

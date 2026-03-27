#!/usr/bin/env bash
# Start the server-side development environment (hot reload).
# Accessible at zamanla-dev.yildizsalih.com once nginx is configured.
#
# Usage: ./scripts/dev-start.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

if [ ! -f .env ]; then
  echo "ERROR: .env file not found. Copy .env.example and fill in values:"
  echo "  cp .env.example .env"
  exit 1
fi

echo "Starting Zamanla dev environment..."
docker compose \
  -f docker-compose.yml \
  -f docker-compose.dev.yml \
  up -d --build

echo ""
echo "Dev environment is up."
echo "  Frontend (Vite):  http://127.0.0.1:9050"
echo "  Backend (API):    http://127.0.0.1:9051"
echo "  PostgreSQL:       127.0.0.1:9052"
echo ""
echo "Public URL (once nginx is configured):"
echo "  https://zamanla-dev.yildizsalih.com"
echo ""
echo "Run migrations if this is a fresh database:"
echo "  docker compose -f docker-compose.yml -f docker-compose.dev.yml exec server npm run migrate"
echo ""
echo "Tail logs:"
echo "  ./scripts/logs.sh dev"

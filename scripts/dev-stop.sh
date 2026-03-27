#!/usr/bin/env bash
# Stop the server-side development environment.
#
# Usage: ./scripts/dev-stop.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "Stopping Zamanla dev environment..."
docker compose -f docker-compose.dev.yml down

echo "Dev environment stopped."

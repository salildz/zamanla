#!/usr/bin/env bash
# Tail logs for a given environment.
#
# Usage:
#   ./scripts/logs.sh          # local dev (base docker-compose.yml)
#   ./scripts/logs.sh dev      # server dev environment
#   ./scripts/logs.sh prod     # production

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

ENV="${1:-local}"

case "$ENV" in
  dev)
    docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f
    ;;
  prod)
    docker compose -f docker-compose.prod.yml logs -f
    ;;
  *)
    docker compose logs -f
    ;;
esac

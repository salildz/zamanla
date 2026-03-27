.PHONY: help \
        up down logs migrate \
        dev dev-stop dev-logs dev-migrate \
        build deploy-frontend deploy restart deploy-prod \
        git-status

# ─── Default target ───────────────────────────────────────────────────────────

help:
	@echo ""
	@echo "Zamanla — available make targets"
	@echo ""
	@echo "LOCAL DEVELOPMENT (laptop / docker-compose.yml)"
	@echo "  make up            Start all services (postgres + server + client)"
	@echo "  make down          Stop all services"
	@echo "  make logs          Follow logs for all services"
	@echo "  make migrate       Run pending database migrations"
	@echo ""
	@echo "SERVER DEV (zamanla-dev.yildizsalih.com)"
	@echo "  make dev           Start dev environment with hot reload"
	@echo "  make dev-stop      Stop dev environment"
	@echo "  make dev-logs      Follow dev environment logs"
	@echo "  make dev-migrate   Run migrations in dev environment"
	@echo ""
	@echo "PRODUCTION (zamanla.yildizsalih.com)"
	@echo "  make build         Build frontend for production"
	@echo "  make deploy-frontend  Copy built frontend to /var/www/zamanla/dist"
	@echo "  make deploy        deploy-frontend + restart backend"
	@echo "  make restart       Rebuild and restart production backend only"
	@echo "  make deploy-prod   Full deploy: pull + build + deploy + restart"
	@echo ""

# ─── Local development ────────────────────────────────────────────────────────

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

migrate:
	docker compose exec server npm run migrate

# ─── Server dev environment ───────────────────────────────────────────────────

dev:
	./scripts/dev-start.sh

dev-stop:
	./scripts/dev-stop.sh

dev-logs:
	./scripts/logs.sh dev

dev-migrate:
	docker compose -f docker-compose.dev.yml exec server npm run migrate

# ─── Production ───────────────────────────────────────────────────────────────

build:
	cd client && VITE_API_URL=/api npm run build

deploy-frontend:
	@echo "Deploying frontend to /var/www/zamanla/dist..."
	sudo mkdir -p /var/www/zamanla/dist
	sudo rsync -a --delete client/dist/ /var/www/zamanla/dist/
	@echo "Frontend deployed."

deploy: deploy-frontend restart

restart:
	docker compose -f docker-compose.prod.yml up -d --build --force-recreate server

deploy-prod:
	./scripts/deploy-prod.sh

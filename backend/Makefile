.PHONY: dev redis up down build logs install setup test-search clean

# ─── Quick start ────────────────────────────────────────────────────

## Start Redis only + FastAPI dev server (fastest for local dev)
dev:
	docker-compose up -d redis
	@echo "Redis up. Starting FastAPI..."
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

## Start Redis container only
redis:
	docker-compose up -d redis
	@echo "Redis running on localhost:6379"

## Full Docker stack (API + Redis)
up:
	docker-compose up -d
	@echo "Stack up. API on http://localhost:8000"

## Shut down all containers
down:
	docker-compose down

# ─── Build ──────────────────────────────────────────────────────────

## Rebuild Docker images (after requirements.txt changes)
build:
	docker-compose build --no-cache

## Stream API logs
logs:
	docker-compose logs -f api

# ─── Setup ──────────────────────────────────────────────────────────

## Install Python deps + Playwright browser (run once after clone)
install:
	pip install -r requirements.txt
	playwright install chromium --with-deps

## Full first-run setup
setup:
	$(MAKE) install
	mkdir -p browser_profiles
	@if [ ! -f .env ]; then cp .env.example .env && echo "Created .env — fill in your credentials"; fi

## Run Alembic migrations (requires DATABASE_URL in .env)
migrate:
	alembic upgrade head
	@echo "Database migrations applied."

## Create a new migration (after changing models.py)
## Usage: make migration MSG="add column xyz"
migration:
	alembic revision --autogenerate -m "$(MSG)"

## Start with PostgreSQL + Redis + FastAPI
dev-full:
	docker-compose up -d redis postgres
	@echo "Redis + Postgres up. Waiting 3s for Postgres to start..."
	sleep 3
	$(MAKE) migrate
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# ─── Testing ────────────────────────────────────────────────────────

## Quick smoke-test: search for a product (requires running backend)
test-search:
	curl -s -X POST http://localhost:8000/api/search/ \
	  -H "Content-Type: application/json" \
	  -d '{"query":"samsung galaxy s25","currency":"AED"}' | python -m json.tool

## Health check
health:
	curl -s http://localhost:8000/health | python -m json.tool

# ─── Cleanup ────────────────────────────────────────────────────────

## Remove all containers + volumes (destructive!)
clean:
	docker-compose down -v
	@echo "All containers and volumes removed."

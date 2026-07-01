# YMI Roofing stack — Makefile
# Usage: make <target>
# Run from: stacks/ymiroofing/

DIR := $(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))
COMPOSE := docker compose -f $(DIR)/docker-compose.yml --env-file $(DIR)/.env

.PHONY: up down restart logs backup restore update status

up:
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

restart:
	$(COMPOSE) restart

logs:
	$(COMPOSE) logs -f --tail=150

backup:
	@echo "[backup] Running pg_dump..."
	@mkdir -p /opt/backups/ymiroofing
	@$(COMPOSE) exec -T postgres pg_dump \
		-U $$(grep ^POSTGRES_USER $(DIR)/.env | cut -d= -f2) \
		$$(grep ^POSTGRES_DB $(DIR)/.env | cut -d= -f2) \
		| gzip > /opt/backups/ymiroofing/n8n-$$(date +%Y%m%d-%H%M%S).sql.gz
	@echo "[backup] Exporting n8n workflows..."
	@$(COMPOSE) exec -T n8n n8n export:workflow --all \
		--output=/home/node/.n8n/exports/
	@echo "[backup] Done. Files in /opt/backups/ymiroofing/"

## Usage: make restore FILE=/opt/backups/ymiroofing/n8n-20260701-020000.sql.gz
restore:
	@test -n "$(FILE)" || (echo "ERROR: specify FILE=/path/to/dump.sql.gz"; exit 1)
	@echo "[restore] Restoring from $(FILE)..."
	@zcat $(FILE) | $(COMPOSE) exec -T postgres psql \
		-U $$(grep ^POSTGRES_USER $(DIR)/.env | cut -d= -f2) \
		-d $$(grep ^POSTGRES_DB $(DIR)/.env | cut -d= -f2)
	@echo "[restore] Done."

update:
	@echo "[update] Pulling latest images..."
	$(COMPOSE) pull
	@echo "[update] Rolling restart of n8n..."
	$(COMPOSE) up -d --no-deps n8n
	$(COMPOSE) up -d --no-deps n8n-worker
	@echo "[update] Restarting caddy..."
	$(COMPOSE) up -d --no-deps caddy
	@echo "[update] Update complete."

status:
	@echo "=== Containers ==="
	$(COMPOSE) ps
	@echo ""
	@echo "=== Disk Usage ==="
	docker system df
	@echo ""
	@echo "=== Volume Sizes ==="
	docker volume ls --filter name=ymiroofing

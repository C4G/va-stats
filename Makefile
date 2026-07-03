# Makefile helpers for common tasks

SHELL := /bin/sh
NPM ?= npm

.PHONY: help install dev build start lint format format-fix type-check check test docker-up docker-down docker-logs ci

help:
	@echo "Available targets:"
	@echo "  install       - npm ci"
	@echo "  dev           - next dev"
	@echo "  build         - next build"
	@echo "  start         - next start"
	@echo "  lint          - eslint via npm run lint"
	@echo "  format        - prettier --check"
	@echo "  format-fix    - prettier --write"
	@echo "  type-check    - tsc --noEmit"
	@echo "  check         - lint + type-check + format + build"
	@echo "  docker-up     - docker compose up -d"
	@echo "  docker-down   - docker compose down"
	@echo "  docker-logs   - docker compose logs -f"
	@echo "  ci            - same checks as CI (lint, type-check, format, build)"

install:
	$(NPM) ci

dev:
	$(NPM) run dev

build:
	$(NPM) run build

start:
	$(NPM) run start

lint:
	$(NPM) run lint

format:
	$(NPM) run format

format-fix:
	$(NPM) run format:fix

type-check:
	$(NPM) run type-check

check: format-fix lint type-check build

ci: check

docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f


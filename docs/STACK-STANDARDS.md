# Infrastructure Stack Standards (2025/2026)

This document defines the community best practices applied to all stacks in this project.
All operators and contributors must follow these standards.

---

## Security

### Secrets Management
- All secrets in `.env` files only. `.env` is always in `.gitignore`.
- Provide `.env.example` with every variable documented but no real values.
- For Docker Swarm: use `docker secret` instead of environment variables.
- Rotate secrets at least every 90 days. Log rotations in the credential registry.
- Never log secrets. Ensure `N8N_LOG_LEVEL=info` (not `debug`) in production.

### TLS
- Caddy manages all TLS via ACME (Let's Encrypt or ZeroSSL).
- DNS challenge preferred over HTTP challenge — works behind any firewall.
- No self-signed certificates anywhere.
- HSTS header on every HTTPS response: `max-age=31536000; includeSubDomains; preload`.

### SSH
- ed25519 keys only (`ssh-keygen -t ed25519`).
- `PasswordAuthentication no` and `PermitRootLogin no` in sshd_config.
- SSH access restricted to Tailscale subnet where possible.
- Rotate SSH keys annually or on personnel changes.

### Firewall
- UFW default-deny-incoming on all nodes.
- Only expose 22/tcp (from Tailscale range), 80/tcp, 443/tcp publicly.
- Backend Docker network uses `internal: true` to prevent DB/Redis internet exposure.
- No direct database port exposure (Postgres: 5432, Redis: 6379 never in `ports:`).

### Container Security
- Non-root user where the image supports it (n8n runs as `node`, postgres as `postgres`).
- Read-only config mounts: `./Caddyfile:/etc/caddy/Caddyfile:ro`.
- No `privileged: true` unless strictly necessary (document why).
- Image scanning: `docker scout cves <image>:<tag>` before promoting to production.

---

## Reliability

### Health Checks
- Every stateful service has a `healthcheck` in docker-compose.
- Use `depends_on` with `condition: service_healthy` for service ordering.
- Minimum 5 retries with 30s start_period for slow-starting services.

### Backups
- Nightly `pg_dump` via pgbackup container. Retention: 7 days minimum.
- Secondary offsite copy: GitHub Actions artifact (7 days) or Oracle Object Storage / B2.
- `make backup` is the single command to run a manual backup.
- **Restore drill:** monthly. Procedure in `HANDBOOK.md` §9.

### Recovery Targets
- **RTO (Recovery Time Objective):** 2 hours — full stack restored from backup.
- **RPO (Recovery Point Objective):** 24 hours — max data loss = 1 day.

### Monitoring
- **Uptime Kuma** (self-hosted): HTTP checks on n8n, autoboros API, Caddy.
- Telegram or email alerts on downtime >2 minutes.
- Instance: optionally run on `aurora-dev` alongside the main stack.

---

## Operations

### Image Pinning
- Pin every image to a semver tag: `image: n8nio/n8n:1.94.1`
- Never use `latest` in production.
- Update via `make update` (pulls new tags + rolling restart).
- Review changelogs before updating major versions.
- Audit image tags monthly; automate with Dependabot if the repo has a `docker-compose.yml` at root.

### Rolling Updates
```bash
docker compose pull
docker compose up -d --no-deps <service>   # update one service at a time
```

### Log Management
- All services use `json-file` driver with `max-size: 10m, max-file: 3`.
- Backend network services (DB, Redis): logs only accessible from host, not exposed.
- Review logs via `make logs`; escalate to Loki + Grafana if log volume exceeds manual review.

### Makefile as Single Interface
- Operators never run raw `docker compose` commands. Always use `make <target>`.
- Targets: `up, down, restart, logs, backup, restore, update, status`.
- Document any new `make` target in `HANDBOOK.md` §3.

---

## n8n Workflow Standards

- All credentials stored in n8n credential store (encrypted at rest in Postgres).
- Never put API keys in workflow parameters — always use n8n Credentials.
- Workflow JSON exports committed to `n8n-workflows/` in this repo after any change.
- Export command: `n8n export:workflow --all --output=./n8n-workflows/`
- Every workflow has an **Error Handler** node (using n8n's error output pin) that sends a Telegram or email alert.
- Test with `n8n execute --id <workflow-id>` or via n8n UI **Test Workflow** before activating.
- Use n8n **Variables** (Settings → Variables) for non-secret config like Sheet IDs and phone numbers.
- Document each workflow's purpose, trigger, and external dependencies in the workflow's **Description** field.

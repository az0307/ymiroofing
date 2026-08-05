# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

**`ymiroofing`** is the **infrastructure / automation-backend** repo for the Y.M.I Roofing client
(client: Ben Breheny). It is *not* the marketing website — there is no `index.html`, CSS, or
front-end source here. Several docs (`docs/N8N-SETUP.md`, `HANDBOOK.md`) reference a sibling
`ymi-roofing/site/index.html` living in the separate **Aurora-AI-Agency** monorepo (path
`ymi-roofing/site/`) — that's where the actual Cloudflare Pages static site and its ops docs
(privacy policy, invoices, Google Sheets setup, etc.) live. Do not assume the two repos are
identical; this one is scoped to n8n workflows, the Cloudflare Worker lead-proxy, and the VPS
stacks that run them.

This repo has **no application source code, no build step, and no package.json**. It is:
bash scripts + Docker Compose stacks + n8n workflow JSON exports + Markdown runbooks.

### Known stub files — do not trust their contents

A handful of files in this repo were left as broken artifacts of a prior export and contain only
a leftover path string (e.g. `/mnt/user-data/outputs/GAP-ANALYSIS.md`) instead of real content:

- `docs/GAP-ANALYSIS.md`
- `docs/MASTER-DELIVERY.md`
- `docs/manychat-spec.md`
- `scripts/push-to-github.sh`
- `sitemap.xml`
- `static/404.html`
- `static/robots.txt`

If a task depends on any of these, flag it to the user rather than assuming the filename reflects
real content — they need to be regenerated/re-exported from source.

## High-level architecture

Two independent Docker Compose stacks, each with its own domain, deployed on separate VPS boxes,
tied together over a Tailscale mesh:

```
Cloudflare Pages (ymiroofing.com.au, static site — lives in Aurora-AI-Agency repo)
        │ POST lead
        ▼
Cloudflare Worker (worker/cf-worker-proxy.js)   — hides n8n URL, CORS lock, 3 req/min/IP
        │
        ▼
Hetzner CX22 "ymi-n8n"  (stacks/ymiroofing/)
  Caddy (TLS) → n8n → Postgres + Redis
        │ Tailscale mesh
        ▼
Oracle "aurora-prod" / "aurora-dev"  (stacks/aurora/)
  Caddy (TLS) → AutoBoros API/UI + n8n (agency) + Postgres + Redis + MCP bridge :3001
```

- **`stacks/ymiroofing/`** — the client stack: n8n + Postgres + Redis + Caddy, bootstrapped via
  `scripts/bootstrap-vps.sh ymiroofing`. Runs the lead-capture and review-machine workflows.
- **`stacks/aurora/`** — the agency's own stack (AutoBoros API/UI, its own n8n, Portainer agent),
  bootstrapped via `scripts/bootstrap-vps.sh aurora`. Not client-specific.
- **`worker/`** — a Cloudflare Worker that sits between the public site and the self-hosted n8n
  webhook, so the n8n URL is never exposed to the browser. Deployed independently via `wrangler`.
- **`n8n-workflows/`** — exported n8n workflow JSON (source of truth for workflow definitions;
  re-export here after every change per `docs/STACK-STANDARDS.md`). Two overlapping sets exist:
  `lead-capture.json`/`review-machine.json` (older) and `ymi-lead-qualifier.json`/
  `ymi-review-machine.json` (current, per `HANDBOOK.md` §2.6) plus `missed-call.json`,
  `sms-optout.json`, `maintenance-reminder.json`.
- **`mcp/ymi-tools.json`** — tool manifest (lookup_lead, update_job_status, send_sms, …) exposed
  by the AutoBoros MCP HTTP bridge at `aurora-dev:3001`, used from n8n via the `n8n-nodes-mcp`
  community node (see `docs/n8n-mcp-setup.md`).
- **`HANDBOOK.md`** — the single source of truth for day-0 setup, day-1/weekly/monthly ops,
  incident response, scaling, security hardening checklist, and backup/restore procedures. Read
  this first for anything operational.
- **`docs/STACK-STANDARDS.md`** — the house rules both stacks must follow (secrets in `.env` only,
  image pinning, `make` as the operator interface, health checks, backup retention, etc.).
- **`docs/VPS-BUILD-SIMPLE.md`** — the fast path to stand up either stack with one bootstrap
  command; `docs/hetzner-setup.md` / `docs/oracle-setup.md` / `docs/tailscale-setup.md` are the
  detailed, step-by-step provisioning guides those simplify.
- **`docs/ai-setup.md`** — how the three AI providers used in workflows (Gemini Flash primary,
  xAI Grok fallback, Anthropic Claude for complex reasoning) are wired into n8n credentials.

## Commands

There is no build/lint/test tooling — this repo is validated by running it. All routine operator
tasks go through the per-stack `Makefile` (`stacks/<stack>/Makefile`), run from that directory:

```bash
cd stacks/ymiroofing        # or stacks/aurora
make up          # docker compose up -d
make down        # docker compose down
make restart     # docker compose restart
make logs        # follow logs, tail 150
make status      # container status + docker system df + volume sizes
make backup       # pg_dump + n8n workflow export → /opt/backups/ymiroofing/
make restore FILE=/opt/backups/ymiroofing/n8n-<timestamp>.sql.gz
make update      # pull new image tags, rolling restart (n8n → n8n-worker → caddy)
```

Provisioning a fresh VPS (either stack) from scratch:

```bash
curl -fsSL https://raw.githubusercontent.com/az0307/ymiroofing/main/scripts/bootstrap-vps.sh \
  | sudo bash -s ymiroofing   # or: aurora
```

Deploying the Cloudflare Worker (from `worker/`):

```bash
wrangler secret put N8N_WEBHOOK_URL   # one-time, sets the real n8n URL as a secret
wrangler deploy
```

Validate a shell script without running it: `bash -n scripts/<script>.sh`.

Exporting n8n workflow changes back into this repo (required by `docs/STACK-STANDARDS.md` after
any workflow edit made in the n8n UI):

```bash
n8n export:workflow --all --output=./n8n-workflows/
```

## Conventions

- **Secrets never committed.** Only `.env.example` per stack is tracked; real `.env` files, `*.sql`/
  `*.sql.gz` dumps, and backups are gitignored. Every credential's storage location and rotation
  period is tracked in `HANDBOOK.md` §10 (Credential Registry) — no real values there either.
- **Images pinned to semver**, never `latest`; update via `make update`, not manual `docker compose pull`.
- **`make` is the operator interface** for the two stacks — reach for raw `docker compose` only for
  break-glass steps not covered by a target (documented inline in `HANDBOOK.md` §6/§9).
- **Backend Docker networks use `internal: true`**; Postgres/Redis ports are never published.
- Workflow JSON in `n8n-workflows/` should stay in sync with what's actually active in the n8n UI —
  treat the repo copy as the backup/deployment source, not a live mirror.

# YMI Roofing + Aurora AI Agency — Operations Handbook

**Version:** 1.0 | **Last updated:** 2026-07-01 | **Owner:** Aurora AI Agency

This is the single source of truth for all operations. Non-technical operators: read Sections 3–4.
Technical operators: read all sections. Every procedure is numbered and self-contained.

---

## 1. Architecture Overview

### 1.1 System Diagram

```mermaid
graph TB
    subgraph Edge ["Edge (Cloudflare)"] 
        CF[Cloudflare DNS / WAF]
        Pages[Cloudflare Pages\nymiroofing.com.au]
        FN[Pages Function\n/api/lead.js]
    end

    subgraph Hetzner ["Hetzner CX22 — ymi-n8n (€4/mo)"]
        Caddy_YMI[Caddy\nTLS Termination]
        N8N_YMI[n8n\nWorkflow Engine]
        PG_YMI[PostgreSQL]
        Redis_YMI[Redis]
        Worker_YMI[n8n Worker]
    end

    subgraph Oracle ["Oracle Always Free ARM64 — aurora-prod"]
        Caddy_AU[Caddy\nTLS Termination]
        API[AutoBoros API\nFastAPI :8000]
        UI[AutoBoros UI\nReact :80]
        N8N_AU[n8n\nAurora instance]
        PG_AU[PostgreSQL]
        Redis_AU[Redis]
        MCP[MCP Server :3001]
    end

    subgraph Mesh ["Tailscale Mesh"]
        TS[WireGuard\nMagicDNS]
    end

    User -->|HTTPS| CF
    CF --> Pages
    Pages --> FN
    FN -->|POST webhook| N8N_YMI
    CF -->|DNS only| Caddy_YMI
    Caddy_YMI --> N8N_YMI
    N8N_YMI --> PG_YMI
    N8N_YMI --> Redis_YMI
    N8N_YMI -.->|Tailscale| MCP
    Hetzner -.-> TS
    Oracle -.-> TS
```

### 1.2 Service Inventory

| Service | Host | Port | Purpose | URL |
|---------|------|------|---------|-----|
| n8n (YMI) | ymi-n8n (Hetzner) | 5678 | Lead qualifier, review machine | https://n8n.ymiroofing.com.au |
| PostgreSQL (YMI) | ymi-n8n | 5432 | n8n database | internal only |
| Redis (YMI) | ymi-n8n | 6379 | n8n queue | internal only |
| Caddy (YMI) | ymi-n8n | 80/443 | TLS termination | — |
| AutoBoros API | aurora-prod | 8000 | Agency backend | https://api.auroraaiagency.com.au |
| AutoBoros UI | aurora-prod | 80 | Operator cockpit | https://app.auroraaiagency.com.au |
| n8n (Aurora) | aurora-prod | 5678 | Agency workflows | https://n8n.auroraaiagency.com.au |
| MCP Bridge | aurora-dev | 3001 | Tool access for n8n | http://aurora-dev:3001 (Tailscale) |
| Cloudflare Pages | CDN edge | 443 | Static site | https://ymiroofing.com.au |
| Tailscale | all nodes | — | WireGuard mesh | tailscale.com/admin |

### 1.3 Credential Locations

| Credential | Where Stored | Notes |
|------------|-------------|-------|
| VPS SSH keys | `~/.ssh/id_ed25519` (local dev) | ed25519 only |
| Hetzner account | 1Password / Bitwarden vault | 2FA enabled |
| Oracle Cloud | 1Password vault | API key file separately |
| Cloudflare account | 1Password vault | 2FA enabled |
| CF API Token | `.env` on ymi-n8n + GitHub Secret | Zone.DNS:Edit |
| n8n Encryption Key | `.env` on each server | 32-char hex |
| Postgres passwords | `.env` on each server | 1 per stack |
| Redis passwords | `.env` on each server | 1 per stack |
| Resend API Key | n8n Credentials store (SMTP) | |
| Gemini API Key | n8n Credentials store | |
| Twilio API Key | n8n Credentials store | |
| Google Sheets OAuth | n8n Credentials store | |
| Tailscale auth key | 1Password vault | Rotate 90 days |

---

## 2. Day-0 Setup (First Time Ever)

Follow these steps in order when provisioning from scratch.

### 2.1 Hetzner VPS

1. Follow `docs/hetzner-setup.md` Steps 1–7.
2. Verify: `ssh aurora@<VPS_IP>` works, `docker ps` returns empty table.
3. Verify: `make status` shows all containers running.
4. Verify: `https://n8n.ymiroofing.com.au` loads the n8n login page.

### 2.2 Oracle VMs

1. Follow `docs/oracle-setup.md` Steps 1–7.
2. Verify: Both `aurora-dev` and `aurora-prod` appear in Oracle console as Running.
3. Verify: Docker is running on both: `ssh aurora@<IP> 'docker ps'`.
4. Verify: AutoBoros API responds: `curl https://api.auroraaiagency.com.au/health`.

### 2.3 Tailscale Mesh

1. Follow `docs/tailscale-setup.md` Steps 1–7.
2. Verify all nodes are connected: `tailscale status` shows all three nodes.
3. Verify cross-node connectivity: from `ymi-n8n`, run `tailscale ping aurora-dev`.
4. Verify MagicDNS works: `curl http://aurora-dev:3001/tools` from `ymi-n8n`.

### 2.4 DNS Records Checklist (Cloudflare)

Navigate to Cloudflare DNS for `ymiroofing.com.au` and verify:

- [ ] `A ymiroofing.com.au → Cloudflare Pages` (proxied)
- [ ] `CNAME www → ymiroofing.com.au` (proxied)
- [ ] `A n8n → <Hetzner VPS IP>` (DNS only, grey cloud)
- [ ] SPF record for Resend: `TXT @ v=spf1 include:resend.com ~all`
- [ ] DKIM record from Resend dashboard (CNAME)
- [ ] DMARC: `TXT _dmarc v=DMARC1; p=quarantine; rua=mailto:ops@auroraaiagency.com.au`

### 2.5 Resend Domain Verification

1. Log in to [resend.com](https://resend.com).
2. **Domains → Add Domain →** `ymiroofing.com.au`.
3. Add the SPF, DKIM, and DMARC records shown by Resend to Cloudflare DNS.
4. Click **Verify DNS Records** in Resend — all three must show green.
5. Create API key: **API Keys → Create API Key** → copy `re_...` value.
6. Add to `.env`: `SMTP_PASS=re_<your-key>`.

### 2.6 n8n First Boot

1. Browse to `https://n8n.ymiroofing.com.au`.
2. Create owner account (email + strong password, store in 1Password).
3. **Settings → Variables**: add `GOOGLE_SHEET_ID`, `BEN_PHONE_NUMBER`, `BEN_EMAIL`, `TWILIO_FROM_NUMBER`, `GOOGLE_REVIEW_LINK`.
4. **Credentials → New**: create credentials for Google Sheets (OAuth2), Twilio, Gemini API Key (HTTP Header Auth), SMTP (Resend).
5. **Import workflows**: Settings → Import Workflow → upload `n8n-workflows/ymi-lead-qualifier.json` and `n8n-workflows/ymi-review-machine.json`.
6. In each imported workflow: click each credential-linked node and select the correct credential.
7. Test lead qualifier: use **Test Workflow** button with sample data.
8. Activate both workflows using the toggle.

### 2.7 Google Sheets CRM Setup

See `Aurora-AI-Agency/ymi-roofing/ops/GOOGLE-SHEETS-SETUP.md` for the full setup.

Quick summary:
- Create a Google Sheet named `YMI Roofing CRM`.
- Tab 1 `Leads`: columns in order: Name, Phone, Suburb, Service, Message, Score, Urgency, Summary, Timestamp.
- Tab 2 `Jobs`: columns: Job ID, Customer Name, Customer Phone, Suburb, Service, Status, Review Requested, Review Date, Notes.
- Share the sheet with the Google service account email used for n8n OAuth2.

### 2.8 Twilio Number Setup

1. Create account at [twilio.com](https://twilio.com).
2. Purchase an Australian mobile number (+61...).
3. Note Account SID and Auth Token from Twilio console.
4. In n8n Credentials: create **Twilio** credential with Account SID + Auth Token.
5. Set `TWILIO_FROM_NUMBER` in n8n Variables.

---

## 3. Day-1 Operations (Daily)

These checks take ~5 minutes each morning.

### 3.1 Morning Health Check

```bash
# SSH to Hetzner and check status
ssh aurora@<ymi-n8n-ip>
cd /opt/ymiroofing/stacks/ymiroofing
make status
```

All containers should show `Up` status. If any show `Restarting` or `Exited`, run `make logs` and investigate.

### 3.2 Review n8n Execution Log

1. Log in to `https://n8n.ymiroofing.com.au`.
2. Click **Executions** in the left sidebar.
3. Filter to last 24 hours.
4. Any red (failed) executions: click to see the error. Common causes:
   - Google Sheets: token expired — re-authenticate credential.
   - Twilio: number not approved for SMS — check Twilio console.
   - Gemini: quota exceeded — wait or switch to Grok fallback.

### 3.3 Triage Leads in Google Sheets

1. Open Google Sheets CRM.
2. Review `Leads` tab for any new entries.
3. Follow up on any Score ≥ 7 leads that Ben hasn't responded to.

---

## 4. Weekly Tasks

### 4.1 Review AI Lead Scores (Monday)

1. Open Google Sheets CRM → `Leads` tab.
2. Sort by `Timestamp` descending, review last 7 days.
3. Spot-check 3–5 Gemini scores against actual lead quality (ask Ben for feedback).
4. If scores seem off, adjust the system prompt in the `Qualify with Gemini Flash` n8n node.

### 4.2 Review Machine Check (Friday)

1. The workflow runs automatically at 4 PM AEST Friday.
2. After it runs: check n8n Executions for the `YMI Review Machine` workflow.
3. If it failed to trigger: in n8n, open the workflow → click **Execute Workflow** manually.
4. Check Google Sheets `Jobs` tab — `Review Requested` column should show `Yes` for processed rows.

### 4.3 Disk Usage Check

```bash
ssh aurora@<ymi-n8n-ip>
cd /opt/ymiroofing/stacks/ymiroofing
make status   # shows docker system df
```

If total disk usage exceeds 70% of 40 GB: prune old Docker images:
```bash
docker image prune -a --filter "until=720h"   # images older than 30 days
```

---

## 5. Monthly Tasks

### 5.1 Update Docker Images

```bash
ssh aurora@<ymi-n8n-ip>
cd /opt/ymiroofing/stacks/ymiroofing

# Check n8n release notes at github.com/n8n-io/n8n/releases
# Update image tag in docker-compose.yml, then:
make update
make status   # verify all containers came back up

# Repeat on aurora-prod:
ssh aurora@<aurora-prod-ip>
cd /opt/ymiroofing/stacks/aurora
make update
```

### 5.2 Backup Restore Drill

1. Take a manual backup: `make backup`.
2. Identify the dump file: `ls /opt/backups/ymiroofing/ | tail -5`.
3. Create a test database:
   ```bash
   docker compose exec postgres createdb -U n8n n8n_test
   ```
4. Restore into test DB:
   ```bash
   zcat /opt/backups/ymiroofing/<latest>.sql.gz | \
     docker compose exec -T postgres psql -U n8n -d n8n_test
   ```
5. Verify row count: `docker compose exec postgres psql -U n8n -d n8n_test -c "\dt"`
6. Drop test DB: `docker compose exec postgres dropdb -U n8n n8n_test`
7. Log the drill result in `04_Docs_Knowledge/reports/restore-drills.md`.

### 5.3 Rotate Tailscale Auth Key

1. Generate a new auth key at tailscale.com/admin/settings/keys.
2. Update the key in 1Password.
3. Re-authenticate each node:
   ```bash
   sudo tailscale up --authkey=tskey-auth-NEWKEY --force-reauth
   ```
4. Revoke the old key in the Tailscale admin console.

### 5.4 Audit n8n Credentials

1. In n8n: **Credentials** → review all listed credentials.
2. Remove any unused credentials.
3. Check last-used timestamps — any credential unused for >90 days: investigate.
4. Rotate API keys that are approaching their expiry.

---

## 6. Incident Response

### 6.1 n8n Is Down / Not Responding

1. **SSH to server:**
   ```bash
   ssh aurora@<ymi-n8n-ip>
   cd /opt/ymiroofing/stacks/ymiroofing
   make status
   ```
2. **If containers are running** but n8n is unreachable: check Caddy logs:
   ```bash
   make logs   # filter for caddy lines
   ```
3. **If n8n container is crashed:**
   ```bash
   make restart
   # Wait 60s, then:
   make status
   ```
4. **If restart fails:** check n8n logs for errors:
   ```bash
   docker compose logs n8n --tail=100
   ```
5. **If database connection error:** check postgres:
   ```bash
   docker compose exec postgres pg_isready -U n8n
   ```
6. **Escalate** if unresolved after 30 minutes: contact Aurora AI Agency (Aaron).

### 6.2 Postgres Corrupt / Data Loss

1. Stop n8n to prevent further writes:
   ```bash
   docker compose stop n8n n8n-worker
   ```
2. Identify the latest clean backup:
   ```bash
   ls -lh /opt/backups/ymiroofing/
   ```
3. Restore from backup (see `§9.2`).
4. Restart n8n:
   ```bash
   docker compose start n8n n8n-worker
   ```
5. Verify: check n8n UI and run a test workflow execution.

### 6.3 VPS Unreachable

1. **Try Tailscale:** `tailscale ping ymi-n8n` from another node.
   - If Tailscale responds, SSH via Tailscale IP: `ssh aurora@100.x.x.x`
2. **Hetzner console:** log in at console.hetzner.cloud → select `ymi-n8n` → **Console**.
   - Check system logs for boot errors.
   - If UFW locked you out: in Hetzner console, `sudo ufw allow 22/tcp` then investigate.
3. **If server is unresponsive:** in Hetzner console → **Power** → **Power cycle**.
4. **After recovery:** review `/var/log/syslog` for root cause.

### 6.4 Lead Not Delivered

Follow this chain to diagnose a missing lead:

1. **Cloudflare Pages Function:** Console.cloudflare.com → Pages → `ymi-roofing` → Functions → View logs.
   - Look for the POST request and any error.
2. **n8n webhook received?** n8n UI → Executions → filter by `YMI Lead Qualifier`.
   - If no execution: the webhook URL in the Pages Function is wrong. Check `index.html` webhook URL.
3. **Gemini API failed?** In n8n execution log, check the `Qualify with Gemini Flash` node.
   - `429 Too Many Requests`: quota hit. Switch to Grok fallback temporarily.
   - `401 Unauthorized`: API key expired. Update credential in n8n.
4. **Google Sheets failed?** Check the `Save to Google Sheets` node in the execution.
   - `403 Forbidden`: re-authenticate the Google Sheets OAuth2 credential.
5. **Twilio SMS failed?** Check `SMS to Ben` node.
   - `21614 Invalid Phone Number`: verify `BEN_PHONE_NUMBER` variable format (+61...).

---

## 7. Scaling

### 7.1 Hetzner Upgrade

When CX22 (4 GB RAM) is insufficient (n8n running >80% memory):

1. In Hetzner console: **Servers → ymi-n8n → Resize**.
2. Select **CX32** (4 vCPU, 8 GB RAM, ~€7/mo).
3. Click **Resize — Rescale Now** (causes ~60 second downtime).
4. After resize: `make status` to verify all containers restarted.

No data is lost. Volumes persist across resizes.

### 7.2 Add n8n Worker Replicas

When workflows queue up (n8n execution queue length > 50):

In `stacks/ymiroofing/docker-compose.yml`, change:
```yaml
  n8n-worker:
    deploy:
      replicas: 2   # add this line; was 1 implicit
```

Then:
```bash
make up   # docker compose picks up the replica change
make status
```

### 7.3 Postgres Scaling

When Postgres exceeds 70% of available RAM consistently:

**Option A (recommended):** Hetzner Managed Database.
- Create a Managed PostgreSQL 16 instance in Hetzner console.
- Update `DB_POSTGRESDB_HOST` in `.env` to the managed instance hostname.
- Run `pg_dump` from the old instance and restore into the managed instance.
- Remove the `postgres` and `pgbackup` services from docker-compose.

**Option B:** Migrate to Supabase (managed Postgres, free tier 500 MB).
- Create project at supabase.com.
- Get connection string from Project Settings → Database.
- Update `DATABASE_URL` in n8n and autoboros.

---

## 8. Security Hardening Checklist

Run this checklist when provisioning new servers and quarterly thereafter.

### SSH
- [ ] ed25519 key used (not RSA or ECDSA)
- [ ] `PasswordAuthentication no` in sshd_config
- [ ] `PermitRootLogin no` in sshd_config
- [ ] `AllowUsers aurora` (or your non-root user)
- [ ] sshd restarted after config change
- [ ] SSH access verified from new terminal before closing root session

### Firewall (UFW)
- [ ] `ufw default deny incoming` enabled
- [ ] SSH restricted to trusted IPs (or Tailscale subnet only)
- [ ] 80 and 443 open
- [ ] No other ports open
- [ ] `ufw status verbose` reviewed

### Docker
- [ ] No `privileged: true` containers
- [ ] No externally exposed DB ports (5432, 6379 not in `ports:`)
- [ ] Backend network has `internal: true`
- [ ] All images pinned to semver (no `latest`)
- [ ] `docker scout cves` run on all images before promoting to prod

### Caddy
- [ ] HSTS header present and correct
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-Frame-Options: DENY`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] TLS certificate valid: `curl -vI https://n8n.ymiroofing.com.au`

### n8n
- [ ] Owner account created (not using default)
- [ ] `N8N_LOG_LEVEL=info` (not debug — debug may log credentials)
- [ ] All credentials stored in n8n Credentials (not hardcoded in workflows)
- [ ] Webhook URLs use HTTPS only
- [ ] n8n version updated monthly

### Resend / Email
- [ ] DKIM record verified in Resend dashboard
- [ ] SPF record in Cloudflare DNS
- [ ] DMARC policy set to `quarantine` or `reject`

### Tailscale
- [ ] ACL policy applied (no default-allow between nodes)
- [ ] MagicDNS enabled
- [ ] Auth key stored securely (not in repo)
- [ ] All nodes appear in tailscale.com/admin/machines

---

## 9. Backup & Restore Procedures

### 9.1 Where Backups Live

| Location | Path | Retention |
|----------|------|----------|
| Hetzner VPS local | `/opt/backups/ymiroofing/` | 7 days (manual) |
| GitHub Actions artifact | Actions → n8n Backup workflow | 7 days |
| n8n workflow exports | `n8n-workflows/` in this repo | indefinite |
| Oracle Object Storage | `aurora-backups` bucket | configure lifecycle rule |

### 9.2 Restore Postgres

**Prerequisites:** you have a `.sql.gz` dump file and the stack is accessible.

```bash
# Step 1: SSH to the server
ssh aurora@<ymi-n8n-ip>
cd /opt/ymiroofing/stacks/ymiroofing

# Step 2: Stop n8n (prevent writes during restore)
docker compose stop n8n n8n-worker

# Step 3: Drop and recreate the database
docker compose exec postgres psql -U n8n -c "DROP DATABASE n8n;"
docker compose exec postgres psql -U n8n -c "CREATE DATABASE n8n;"

# Step 4: Restore from dump
make restore FILE=/opt/backups/ymiroofing/n8n-20260701-020000.sql.gz

# Step 5: Restart n8n
docker compose start n8n n8n-worker

# Step 6: Verify
curl -s https://n8n.ymiroofing.com.au/healthz
# Should return: {"status":"ok"}
```

### 9.3 Restore n8n Workflows

If the DB is restored from an older backup and workflows are missing:

1. Log in to n8n UI.
2. **Settings → Import Workflow**.
3. Upload each JSON from `n8n-workflows/` in this repo.
4. After import: reassign credentials in each workflow node.
5. Activate workflows using the toggle.

### 9.4 Manual Backup

```bash
ssh aurora@<ymi-n8n-ip>
cd /opt/ymiroofing/stacks/ymiroofing
make backup
ls -lh /opt/backups/ymiroofing/
```

---

## 10. Credential Registry

This table tracks where each credential lives. **No actual values here.** Retrieve values from the secure vault or `.env` files on the relevant server.

| Service | Credential Type | Where Stored | Rotation Period | Owner |
|---------|----------------|-------------|-----------------|-------|
| Hetzner | Account password + 2FA | 1Password vault | Annually | Aaron |
| Hetzner | SSH private key | `~/.ssh/id_ed25519` (local) | On personnel change | Aaron |
| Oracle Cloud | Account password + MFA | 1Password vault | Annually | Aaron |
| Oracle Cloud | API signing key | `~/.oci/oci_api_key.pem` | Annually | Aaron |
| Cloudflare | Account password + 2FA | 1Password vault | Annually | Aaron |
| Cloudflare | API Token (Zone.DNS) | `.env` on ymi-n8n + GitHub Secret | 90 days | Aaron |
| n8n Encryption Key | 32-char hex | `.env` on ymi-n8n | Never (rotate = data loss) | Aaron |
| Postgres (YMI) | Password | `.env` on ymi-n8n | 90 days | Aaron |
| Redis (YMI) | Password | `.env` on ymi-n8n | 90 days | Aaron |
| Resend | API Key | n8n Credentials (SMTP) | 90 days | Aaron |
| Google | OAuth2 refresh token | n8n Credentials | Auto-refreshed | Aaron |
| Gemini | API Key | n8n Credentials | On compromise | Aaron |
| xAI Grok | API Key | n8n Credentials | On compromise | Aaron |
| Anthropic | API Key | n8n Credentials | On compromise | Aaron |
| Twilio | Account SID + Auth Token | n8n Credentials | On compromise | Aaron |
| Tailscale | Auth Key | 1Password vault | 90 days | Aaron |
| GitHub | PAT (for Actions) | GitHub Secrets (repo settings) | 90 days | Aaron |

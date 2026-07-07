#!/usr/bin/env bash
#
# One-command VPS bootstrap for the Y.M.I Roofing / Aurora stacks.
#
# On a FRESH Ubuntu 22.04 / 24.04 server, run:
#
#   curl -fsSL https://raw.githubusercontent.com/az0307/ymiroofing/main/scripts/bootstrap-vps.sh | sudo bash -s ymiroofing
#
# ...or clone the repo and run:  sudo bash scripts/bootstrap-vps.sh [ymiroofing|aurora]
#
# It installs Docker, sets up the firewall, clones this repo, generates strong
# secrets, and (once you paste your Cloudflare + Resend keys) starts the stack.
# Safe to re-run — every step is idempotent.
#
set -euo pipefail

STACK="${1:-ymiroofing}"
REPO_URL="https://github.com/az0307/ymiroofing.git"
DEST="/opt/ymiroofing"

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run with sudo:  sudo bash scripts/bootstrap-vps.sh $STACK" >&2
  exit 1
fi
case "$STACK" in
  ymiroofing|aurora) ;;
  *) echo "Unknown stack '$STACK'. Use: ymiroofing OR aurora" >&2; exit 1 ;;
esac

log() { echo -e "\n==> $*"; }

log "Y.M.I VPS bootstrap — stack: $STACK"

# ── 1. Base packages ──────────────────────────────────────────────────────────
log "Installing base packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl gnupg git ufw openssl

# ── 2. Docker Engine + Compose plugin (official repo, idempotent) ─────────────
if ! command -v docker >/dev/null 2>&1; then
  log "Installing Docker Engine"
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
else
  log "Docker already installed — skipping"
fi
systemctl enable --now docker

# ── 3. Firewall — allow SSH + web only ────────────────────────────────────────
log "Configuring firewall (SSH, HTTP, HTTPS)"
ufw allow OpenSSH >/dev/null 2>&1 || ufw allow 22/tcp >/dev/null 2>&1 || true
ufw allow 80/tcp  >/dev/null 2>&1 || true
ufw allow 443/tcp >/dev/null 2>&1 || true
ufw --force enable >/dev/null 2>&1 || true

# ── 4. Optional: Tailscale (cross-node mesh; set TAILSCALE=1 to install) ───────
if [ "${TAILSCALE:-0}" = "1" ] && ! command -v tailscale >/dev/null 2>&1; then
  log "Installing Tailscale (run 'sudo tailscale up --advertise-tags=tag:server' afterwards)"
  curl -fsSL https://tailscale.com/install.sh | sh
fi

# ── 5. Clone or update the repo ───────────────────────────────────────────────
if [ -d "$DEST/.git" ]; then
  log "Updating existing checkout at $DEST"
  git -C "$DEST" pull --ff-only || true
else
  log "Cloning repo to $DEST"
  git clone --depth 1 "$REPO_URL" "$DEST"
fi

STACK_DIR="$DEST/stacks/$STACK"
cd "$STACK_DIR"

# ── 6. .env — generate machine secrets, keep the two you must supply ──────────
if [ ! -f .env ]; then
  log "Creating .env with strong random secrets"
  cp .env.example .env
  sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 24)|" .env
  sed -i "s|^REDIS_PASSWORD=.*|REDIS_PASSWORD=$(openssl rand -hex 24)|"       .env
  sed -i "s|^N8N_ENCRYPTION_KEY=.*|N8N_ENCRYPTION_KEY=$(openssl rand -hex 32)|" .env
  # aurora stack has extra app secrets
  grep -q '^AUTOBOROS_SECRET_KEY='   .env && sed -i "s|^AUTOBOROS_SECRET_KEY=.*|AUTOBOROS_SECRET_KEY=$(openssl rand -hex 32)|" .env || true
  grep -q '^AUTOBOROS_PASSWORD='     .env && sed -i "s|^AUTOBOROS_PASSWORD=.*|AUTOBOROS_PASSWORD=$(openssl rand -hex 16)|" .env || true
  grep -q '^PORTAINER_AGENT_SECRET=' .env && sed -i "s|^PORTAINER_AGENT_SECRET=.*|PORTAINER_AGENT_SECRET=$(openssl rand -hex 16)|" .env || true
  chmod 600 .env
else
  log ".env already exists — leaving it untouched"
fi

# ── 7. Start (only if the account keys are filled in) ─────────────────────────
if grep -qE 'your-cloudflare-api-token-here|re_your-resend-api-key' .env; then
  cat <<EOF

────────────────────────────────────────────────────────────────────────────
  ✅ Server is ready. Two values still need YOUR accounts before starting:

    Edit:  nano $STACK_DIR/.env

      CF_API_TOKEN   → Cloudflare API token (Zone.DNS:Edit for ymiroofing.com.au)
                       https://dash.cloudflare.com/profile/api-tokens
      SMTP_PASS      → Resend API key (re_...)  https://resend.com/api-keys

  Then start the stack:

      cd $STACK_DIR && make up && make status

  (Point your DNS 'n8n' record at this server's IP first — see docs/hetzner-setup.md)
────────────────────────────────────────────────────────────────────────────
EOF
else
  log "Secrets look complete — starting the stack"
  make up
  make status
  log "Done. Check 'make logs' if anything isn't healthy."
fi

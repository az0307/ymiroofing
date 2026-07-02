# Hetzner CX22 VPS — YMI Roofing Client Stack

Step-by-step provisioning guide for the YMI Roofing n8n automation server.

**Spec:** CX22 — 2 vCPU / 4 GB RAM / 40 GB SSD / Ubuntu 24.04 LTS / Falkenstein (nbg1)
**Monthly cost:** ~€4/mo (~AU$7)
**Hostname:** `ymi-n8n`
**Purpose:** n8n + Postgres + Redis + Caddy (TLS) + nightly backups

---

## 1. Create the VPS

1. Log in to [console.hetzner.cloud](https://console.hetzner.cloud).
2. Click **+ New Server**.
3. Configure:
   - **Location:** Falkenstein (nbg1)
   - **Image:** Ubuntu 24.04 LTS
   - **Type:** Shared CPU → **CX22** (2 vCPU, 4 GB RAM, 40 GB SSD)
   - **Networking:** IPv4 + IPv6
   - **SSH keys:** Paste your ed25519 public key
   - **Name:** `ymi-n8n`
4. Click **Create & Buy Now**.
5. Note the server's public IPv4 (called `<VPS_IP>` below).

---

## 2. Harden the Server

### 2a. First root login

```bash
ssh root@<VPS_IP>
```

### 2b. Create a non-root admin user

```bash
adduser aurora
usermod -aG sudo aurora
mkdir -p /home/aurora/.ssh
cp ~/.ssh/authorized_keys /home/aurora/.ssh/
chown -R aurora:aurora /home/aurora/.ssh
chmod 700 /home/aurora/.ssh && chmod 600 /home/aurora/.ssh/authorized_keys
```

### 2c. Harden SSH

```bash
nano /etc/ssh/sshd_config
```

Set/uncomment these lines:

```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
X11Forwarding no
AllowUsers aurora
```

Restart and verify in a **new terminal** before closing root session:

```bash
# Ubuntu 24.04's OpenSSH unit is named ssh.service (sshd is only an alias
# that is not always present). Use ssh to avoid "unit not found" errors.
systemctl restart ssh
# In new terminal:
ssh aurora@<VPS_IP>
```

### 2d. Configure UFW

```bash
sudo apt update && sudo apt install -y ufw

sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH — restrict to your trusted IPs only (replace with actual IPs)
sudo ufw allow from <YOUR_HOME_IP> to any port 22 proto tcp
sudo ufw allow from <YOUR_OFFICE_IP> to any port 22 proto tcp

# HTTP/HTTPS — public (Caddy needs 80 for ACME HTTP redirect, 443 for TLS)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

sudo ufw enable
sudo ufw status verbose
```

> **Tailscale alternative:** After Step 4, you can restrict SSH to the Tailscale subnet:
> `sudo ufw allow from 100.64.0.0/10 to any port 22 proto tcp`
> and remove the public SSH rules for maximum security.

---

## 3. Install Docker Engine (apt repo, not snap)

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg

# Docker GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Docker apt repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine + Compose plugin v2
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin

# Add aurora to docker group (re-login required)
sudo usermod -aG docker aurora

# Verify
docker --version          # e.g. Docker version 27.x.x
docker compose version    # e.g. Docker Compose version v2.x.x
```

Log out and back in:

```bash
exit
ssh aurora@<VPS_IP>
docker ps   # should work without sudo
```

---

## 4. Install Tailscale

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
# Follow the authentication URL

# Set hostname for mesh DNS
sudo tailscale set --hostname=ymi-n8n

# Verify
tailscale ip -4    # e.g. 100.x.x.x
tailscale status
```

Other nodes in the tailnet can now reach this server as `ymi-n8n`.

---

## 5. DNS — Point n8n Subdomain to VPS

In **Cloudflare DNS** for `ymiroofing.com.au`:

| Type | Name | Content | Proxy | TTL |
|------|------|---------|-------|-----|
| A | `n8n` | `<VPS_IP>` | DNS only (grey cloud) | Auto |

> Set proxy to **DNS only** (grey cloud). Caddy manages TLS directly using the Cloudflare DNS challenge — no Cloudflare proxy needed.

Verify propagation (~1–5 min):

```bash
dig n8n.ymiroofing.com.au +short   # should return <VPS_IP>
```

---

## 6. Clone the Ops Repo

The Caddy image is built from files in this repo, so clone it first:

```bash
sudo mkdir -p /opt/ymiroofing
sudo chown aurora:aurora /opt/ymiroofing
git clone https://github.com/az0307/ymiroofing.git /opt/ymiroofing
```

---

## 7. Build Caddy, Configure Secrets & Deploy

```bash
cd /opt/ymiroofing/stacks/ymiroofing

# Build the custom Caddy image (Cloudflare DNS plugin for ACME).
# Only needed once; rebuild when upgrading Caddy. Takes ~2–3 minutes.
docker build -t ymi_caddy:2.9.1 -f Dockerfile.caddy .

# Configure secrets
cp .env.example .env
nano .env   # Fill in all values

# Start
make up

# Verify
make status
```

---

## 8. n8n First Boot

1. Browse to `https://n8n.ymiroofing.com.au`.
2. Complete owner account setup (email + password).
3. Import workflows: **Settings → Import Workflow** → upload files from `n8n-workflows/`.
4. Configure credentials: **Credentials → New** for Google Sheets, Twilio, Gemini API.
5. Activate each workflow using the toggle.

---

## Reference Commands

```bash
make up       # Start all services
make down     # Stop all services
make restart  # Restart all services
make logs     # Tail logs
make status   # Container status + disk usage
make backup   # pg_dump + workflow export
make update   # Pull images + rolling restart
```

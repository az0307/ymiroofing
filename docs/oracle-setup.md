# Oracle Always Free — Aurora Agency Stack

Provisioning guide for two ARM64 Ampere A1 instances on Oracle Cloud.
These run the Aurora AI Agency tools, autoboros, and dev/staging environments.

**Cost:** Free (Always Free tier — 4 OCPU + 24 GB RAM total shared across A1 instances)
**Architecture:** ARM64 (aarch64) — use ARM Docker images

---

## 1. Create Oracle Cloud Account

1. Go to [cloud.oracle.com](https://cloud.oracle.com) → **Start for free**.
2. Choose **Home Region** → **Australia East (Sydney)** (ap-sydney-1).
3. Complete identity verification (credit card required but not charged for Always Free).

---

## 2. Create the Two VM Instances

Create both VMs in the same **VCN** (Virtual Cloud Network).

### 2a. Create VCN first

1. **Networking → Virtual Cloud Networks → Create VCN**.
2. Name: `aurora-vcn`, CIDR: `10.0.0.0/16`.
3. Use **VCN Wizard** → Create VCN with Internet Connectivity.
   - Public Subnet: `10.0.0.0/24`
   - Private Subnet: `10.0.1.0/24`

### 2b. Security List — open ports

In the **public subnet's Security List**, add ingress rules:

| Protocol | Source | Dest Port | Purpose |
|----------|--------|-----------|----------|
| TCP | 0.0.0.0/0 | 22 | SSH |
| TCP | 0.0.0.0/0 | 80 | HTTP |
| TCP | 0.0.0.0/0 | 443 | HTTPS |
| ICMP | 0.0.0.0/0 | — | Ping |

### 2c. Create aurora-dev instance

1. **Compute → Instances → Create Instance**.
2. **Name:** `aurora-dev`
3. **Image:** Ubuntu 22.04 LTS (Canonical)
4. **Shape:** VM.Standard.A1.Flex
   - OCPU: **2**, Memory: **12 GB**
5. **Networking:** Select `aurora-vcn`, public subnet, assign public IP.
6. **SSH key:** Paste your ed25519 public key.
7. **Boot volume:** 100 GB.
8. Click **Create**.

### 2d. Create aurora-prod instance

Repeat 2c with name `aurora-prod`, same specs, same VCN.

---

## 3. Harden Both Instances

SSH into each (replace `<IP>` with the instance's public IP):

```bash
ssh ubuntu@<IP>
```

Run on **both** instances:

```bash
# Create non-root user
sudo adduser aurora
sudo usermod -aG sudo aurora
sudo mkdir -p /home/aurora/.ssh
sudo cp ~/.ssh/authorized_keys /home/aurora/.ssh/
sudo chown -R aurora:aurora /home/aurora/.ssh
sudo chmod 700 /home/aurora/.ssh && sudo chmod 600 /home/aurora/.ssh/authorized_keys

# Harden SSH
sudo sed -i 's/^#PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/^#PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
# Ubuntu's OpenSSH server unit is ssh.service (sshd is only an alias). Use ssh.
sudo systemctl restart ssh

# UFW
sudo apt update && sudo apt install -y ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from <YOUR_IP> to any port 22 proto tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Log out and back in as `aurora`:
```bash
ssh aurora@<IP>
```

---

## 4. Install Docker Engine (ARM64)

Run on **both** instances:

```bash
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=arm64 signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin

sudo usermod -aG docker aurora
```

Log out and back in, then verify:
```bash
docker --version && docker compose version
```

---

## 5. Install Tailscale

Run on **both** instances:

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
# Follow auth URL
```

Set hostnames:
```bash
# On aurora-dev:
sudo tailscale set --hostname=aurora-dev

# On aurora-prod:
sudo tailscale set --hostname=aurora-prod
```

Verify connectivity from Hetzner node:
```bash
# On ymi-n8n:
ping -c2 aurora-dev   # uses Tailscale MagicDNS
```

---

## 6. Oracle Object Storage (backup offsite)

1. **Storage → Object Storage → Create Bucket**.
2. Name: `aurora-backups`, Visibility: **Private**.
3. Create an API key:
   - **Profile → API Keys → Add API Key** → Download private key.
   - Note the tenancy OCID, user OCID, fingerprint, and region.
4. Install OCI CLI:
   ```bash
   bash -c "$(curl -fsSL https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)"
   oci setup config
   ```
5. Test upload:
   ```bash
   printf 'oracle object storage test\n' > /tmp/test.txt
   oci os object put --bucket-name aurora-backups --file /tmp/test.txt
   ```

---

## 7. Deploy the Stack

```bash
git clone https://github.com/az0307/ymiroofing.git /opt/ymiroofing
cd /opt/ymiroofing/stacks/aurora
cp .env.example .env
nano .env   # Fill in all values

# Build custom Caddy image
docker build -t aurora_caddy:2.9.1 -f Dockerfile.caddy .

# Start
make up
make status
```

---

## DNS Records for Aurora Subdomains

Add to Cloudflare DNS (or your agency domain's DNS):

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `api` | `<aurora-prod public IP>` | DNS only |
| A | `app` | `<aurora-prod public IP>` | DNS only |
| A | `n8n` | `<aurora-prod public IP>` | DNS only |

---

## Notes on Always Free Limits

- Total Ampere A1 pool: 4 OCPU + 24 GB RAM shared across all A1 instances.
- If 2 instances × (2 OCPU + 12 GB) = 4 OCPU + 24 GB — this uses the full allocation.
- Boot volumes: 2 × 100 GB = 200 GB total (limit is 200 GB free storage).
- Outbound data: 10 TB/month free (Sydney region).
- Instances may be **reclaimed** if the account is inactive — keep at least one service running.

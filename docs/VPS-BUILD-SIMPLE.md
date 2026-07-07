# Build the VPS — the simple version

This is the **easy path** to stand up the automation server (n8n + Postgres +
Redis + Caddy). The long, detailed version is in `docs/hetzner-setup.md`
(Hetzner) and `docs/oracle-setup.md` (Oracle). Follow whichever you like — this
one gets you running in ~15 minutes with a single command.

> **Do you even need this?** The website works and captures leads by **email**
> without any server. You only need the VPS if you want the automated backend
> (leads → Google Sheets, SMS, the weekly review-machine). It's optional.

---

## What you need first (5 min)

1. **A server.** Cheapest good option: a **Hetzner CX22** (~€4/mo) running
   **Ubuntu 24.04**. (Oracle's Always-Free ARM tier also works — see `oracle-setup.md`.)
   When you create it, add your SSH key and note the server's **IP address**.
2. **A Cloudflare API token** — [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)
   → "Edit zone DNS" template for `ymiroofing.com.au`. (Caddy uses it to get the HTTPS certificate.)
3. **A Resend API key** — [resend.com/api-keys](https://resend.com/api-keys) (for n8n's emails).
4. **One DNS record:** in Cloudflare, add an **A record** `n8n` → your server's IP
   (grey cloud / "DNS only").

---

## Build it (one command)

> **One-time note:** the command below pulls from this repo's `main` branch, so
> make sure the infra pull request has been **merged to `main`** first (or clone
> the branch manually). After that it's always just the one line.

SSH into the server, then paste this **one line**:

```bash
curl -fsSL https://raw.githubusercontent.com/az0307/ymiroofing/main/scripts/bootstrap-vps.sh | sudo bash -s ymiroofing
```

That script does everything: installs Docker, sets up the firewall, downloads the
project, and generates all the strong passwords for you. It's safe to run again if
anything hiccups.

When it finishes it will tell you the **two keys you need to paste in**:

```bash
sudo nano /opt/ymiroofing/stacks/ymiroofing/.env
```
Fill in:
- `CF_API_TOKEN=` your Cloudflare token
- `SMTP_PASS=` your Resend API key (`re_...`)

Save (`Ctrl+O`, `Enter`), exit (`Ctrl+X`).

---

## Start it

```bash
cd /opt/ymiroofing/stacks/ymiroofing
make up          # start everything
make status      # check it's healthy
```

Then open **https://n8n.ymiroofing.com.au** in your browser — you should see the
n8n login. Create your owner account, and import the two workflows from
`n8n-workflows/` (lead-qualifier + review-machine). Full walkthrough:
`HANDBOOK.md` §2.6.

---

## Day-to-day (all from that folder)

```bash
make status      # what's running
make logs        # live logs
make backup      # back up the database + workflows
make update      # pull newer images and restart
make restart     # restart everything
```

---

## Running the Aurora (agency) stack instead

Same steps, on its own server, just swap the stack name:

```bash
curl -fsSL https://raw.githubusercontent.com/az0307/ymiroofing/main/scripts/bootstrap-vps.sh | sudo bash -s aurora
```

---

## If you get stuck

- `make logs` shows what's wrong; most issues are a wrong value in `.env` or the
  `n8n` DNS record not pointing at the server yet.
- The detailed guides (`hetzner-setup.md`, `oracle-setup.md`) cover hardening,
  Tailscale, and backups.
- Or send Aaron the output of `make status` + `make logs`.

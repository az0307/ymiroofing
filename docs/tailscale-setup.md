# Tailscale Mesh Network Setup

Tailscale creates a zero-config WireGuard mesh between all nodes.
All cross-node traffic (n8n → MCP, aurora-dev → aurora-prod) routes through Tailscale.

---

## 1. Create a Tailscale Account

1. Go to [tailscale.com](https://tailscale.com) → **Get started free**.
2. Sign in with Google, GitHub, or Microsoft SSO.
3. The free plan supports up to 3 users and 100 devices.

---

## 2. Generate a Reusable Auth Key

1. Go to [tailscale.com/admin/settings/keys](https://tailscale.com/admin/settings/keys).
2. Click **Generate auth key**.
3. Settings:
   - **Reusable:** Yes (so multiple nodes can use the same key)
   - **Ephemeral:** No (nodes stay in the tailnet permanently)
   - **Tags:** optionally add `tag:server`
4. Copy the key (starts with `tskey-auth-...`).
5. Store it securely — you'll use it when joining each node.

---

## 3. Join All Nodes

Run on each server (substituting the auth key):

```bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Join the tailnet (non-interactive, using auth key)
sudo tailscale up --authkey=tskey-auth-YOURKEY --hostname=<NODE_NAME>
```

| Node | Hostname | Location |
|------|----------|----------|
| Hetzner CX22 | `ymi-n8n` | Falkenstein |
| Oracle aurora-dev | `aurora-dev` | Sydney |
| Oracle aurora-prod | `aurora-prod` | Sydney |
| Your dev machine | `dev-laptop` | Local |

Verify each node appears in [tailscale.com/admin/machines](https://tailscale.com/admin/machines).

---

## 4. Enable MagicDNS

1. In admin console: **DNS → MagicDNS → Enable**.
2. Also enable **Override local DNS** to ensure Tailscale hostnames resolve everywhere.

After enabling, nodes reference each other by short hostname:

```bash
# From ymi-n8n, reach aurora-dev's MCP server:
curl http://aurora-dev:3001/tools

# Ping aurora-prod:
ping -c2 aurora-prod
```

---

## 5. Configure ACLs

In admin console: **Access Controls**, replace with this JSON:

```json
{
  "tagOwners": {
    "tag:server": ["autogroups:owner"]
  },
  "acls": [
    {
      "action": "accept",
      "src": ["tag:server"],
      "dst": ["tag:server:*"]
    },
    {
      "action": "accept",
      "src": ["autogroups:owner"],
      "dst": ["*:*"]
    }
  ],
  "nodeAttrs": [
    {
      "target": ["aurora-dev"],
      "attr": ["tag:server"]
    },
    {
      "target": ["aurora-prod"],
      "attr": ["tag:server"]
    },
    {
      "target": ["ymi-n8n"],
      "attr": ["tag:server"]
    }
  ]
}
```

This policy:
- Allows all `tag:server` nodes to reach each other on all ports.
- Allows account owners to reach all nodes.
- Blocks direct device-to-device traffic by default.

---

## 6. Verify the Mesh

From `ymi-n8n`:

```bash
tailscale ping aurora-dev    # should show pong in <10ms
tailscale ping aurora-prod
curl http://aurora-dev:3001/tools   # AutoBoros MCP
```

From `aurora-dev`:

```bash
tailscale ping ymi-n8n
curl http://ymi-n8n:5678/healthz    # n8n health check
```

---

## 7. Maintenance

**Rotate auth key** (every 90 days recommended):
1. Generate a new auth key in admin console.
2. Update the key in your secrets store.
3. Re-authenticate each node: `sudo tailscale up --authkey=tskey-auth-NEWKEY --force-reauth`

**Remove a node:**
```bash
# On the node:
sudo tailscale logout

# In admin console: Machines → select node → Delete
```

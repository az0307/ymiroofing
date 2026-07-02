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
   - **Tags:** set **`tag:server`** — **required, not optional**. The ACL in §5
     only permits traffic between `tag:server` nodes, so a node that joins
     untagged is blocked from the mesh. A key can only carry a tag its owner is
     allowed to assign (see `tagOwners` in the ACL — apply §5 **before**
     generating the key).
4. Copy the key (starts with `tskey-auth-...`).
5. Store it securely — you'll use it when joining each node.

---

## 3. Join All Nodes

Run on each server (substituting the auth key):

```bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Join the tailnet (non-interactive, using auth key).
# --advertise-tags applies tag:server to the node so the §5 ACL admits it.
sudo tailscale up \
  --authkey=tskey-auth-YOURKEY \
  --hostname=<NODE_NAME> \
  --advertise-tags=tag:server
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

Apply this **before** generating the auth key in §2 (the key can only assign a
tag that `tagOwners` permits). In admin console: **Access Controls**, replace
with this JSON:

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
  ]
}
```

This policy:
- Allows all `tag:server` nodes to reach each other on all ports.
- Allows account owners to reach all nodes.
- Blocks direct device-to-device traffic by default.

> **How nodes get `tag:server`:** tags are assigned when a node joins — via a
> tagged auth key or `--advertise-tags=tag:server` (§3) — **not** through a
> `nodeAttrs` block. `nodeAttrs` sets node *attributes*, not ownership tags, and
> cannot make a node a member of `tag:server`; using it for that silently leaves
> nodes untagged and blocked. Confirm assignment with `tailscale status` (tagged
> nodes show `tag:server`) or the **Machines** page in the admin console.

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

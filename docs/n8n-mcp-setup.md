# n8n MCP Integration Setup

This guide explains how to install the `n8n-nodes-mcp` community package and connect it to the AutoBoros MCP server.

---

## 1. Install the MCP Community Node

The `n8n-nodes-mcp` package is in `az0307/n8n-nodes-mcp`.

### Method: Mount custom extensions in Docker Compose

Add to `stacks/ymiroofing/docker-compose.yml` under the `n8n` service:

```yaml
volumes:
  - n8n_data:/home/node/.n8n
  - n8n_custom:/home/node/.n8n/custom
environment:
  N8N_CUSTOM_EXTENSIONS: /home/node/.n8n/custom
```

Add volume:
```yaml
volumes:
  n8n_custom:
```

Then install the package into the custom volume:

```bash
# One-time setup: install package into the custom extensions volume
docker compose run --rm --entrypoint sh n8n -c "
  cd /home/node/.n8n/custom && \
  npm init -y && \
  npm install n8n-nodes-mcp
"

# Restart n8n to load the new node type
docker compose restart n8n n8n-worker
```

Verify the node appeared: in n8n UI, search for **MCP** in the node selector.

---

## 2. Configure MCP Server Credential

1. In n8n: **Credentials → New → MCP Server** (appears after installing the package).
2. Name: `AutoBoros MCP`
3. **URL:** `http://aurora-dev:3001`
   - This uses the Tailscale hostname `aurora-dev` (reachable from `ymi-n8n` via the Tailscale mesh).
   - Port 3001 is the AutoBoros MCP HTTP bridge (`mcp_http_bridge.py`).
4. Save and test the connection.

> **Tailscale requirement:** The `ymi-n8n` and `aurora-dev` nodes must both be on the same Tailscale tailnet. See `docs/tailscale-setup.md`.

---

## 3. Use MCP Tools in n8n Workflows

After installing the package, you can use MCP tool calls as workflow steps.

### Example: Look up a lead by phone number

1. Add a **MCP Tool** node to your workflow.
2. Credential: `AutoBoros MCP`
3. Tool name: `lookup_lead`
4. Parameters:
   ```json
   { "phone": "{{ $json.phone }}" }
   ```
5. The response contains the lead record from Google Sheets.

### Example: Update job status

1. Add a **MCP Tool** node.
2. Tool name: `update_job_status`
3. Parameters:
   ```json
   { "job_id": "{{ $json.job_id }}", "status": "Complete" }
   ```

### Available YMI tools

See `mcp/ymi-tools.json` for the full manifest. Tools are documented in the AutoBoros MCP server at `http://aurora-dev:3001`.

---

## 4. Test the Connection

From `ymi-n8n` server (via Tailscale):

```bash
curl http://aurora-dev:3001/tools
```

Expected response: JSON array of available MCP tools.

If connection fails:
1. Check Tailscale is running on both nodes: `tailscale status`
2. Check AutoBoros MCP bridge is running on `aurora-dev`: `docker compose ps`
3. Verify port 3001 is not blocked by Oracle security list rules for the private subnet.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ymiroofing** is the delivery package for the **Y.M.I Roofing** engagement (Aurora AI Agency client). It holds the automation and operations source-of-truth behind the live site: n8n workflow exports for lead capture and follow-up, a Cloudflare Worker proxy, deployment/ops documentation, and static assets.

The public production website lives in the separate `ymiroofing.com.au` repo. This repo is the agency-internal build/ops layer for the same client.

## Repository Structure

```text
docs/
├── MASTER-DELIVERY.md      # end-to-end delivery / launch checklist
├── N8N-SETUP.md            # how to import + configure the n8n workflows
├── GAP-ANALYSIS.md         # site/automation gap analysis
└── manychat-spec.md        # ManyChat chatbot flow spec
n8n-workflows/              # importable n8n workflow JSON
├── lead-capture.json       # quote form → SMS/Sheets lead capture
├── review-machine.json     # post-job automated review requests
├── maintenance-reminder.json  # annual maintenance SMS to past clients
├── missed-call.json        # missed-call text-back
└── sms-optout.json         # SMS opt-out handling (compliance)
worker/
├── cf-worker-proxy.js      # Cloudflare Worker — proxies/hides the n8n webhook, CORS, rate-limit
└── wrangler.toml           # Worker deploy config
static/
├── 404.html
└── robots.txt
scripts/push-to-github.sh   # repo push helper
sitemap.xml
```

## Working With This Repo

There is no build system, package manager, or test suite — the deliverables are JSON workflow exports, a single Worker script, and Markdown docs.

- **n8n workflows** (`n8n-workflows/*.json`) are importable into an n8n instance. Before go-live, placeholders must be filled: Google Sheet ID, Twilio number, and the webhook URL. See `docs/N8N-SETUP.md` for the exact steps and `docs/MASTER-DELIVERY.md` for the launch sequence.
- **Cloudflare Worker** (`worker/cf-worker-proxy.js`) hides the real n8n webhook from the browser and enforces CORS + rate limiting. Deploy with `wrangler` using `worker/wrangler.toml`.
- Keep SMS flows compliant — `sms-optout.json` handles opt-out; don't remove opt-out handling from outbound SMS workflows.

## Conventions

- Never commit secrets (Twilio keys, webhook URLs with tokens, API keys) — configure them in n8n credentials and Cloudflare env vars.
- When editing a workflow, export the updated JSON from n8n rather than hand-editing node IDs, to keep the export importable.
- Keep `docs/MASTER-DELIVERY.md` current — it is the checklist the launch is tracked against.

## Related Repos

- `ymiroofing.com.au` — the production static site + Cloudflare Pages Function (lead email via Resend).
- `Aurora-AI-Agency` (`ymi-roofing/`) — earlier client deliverable snapshot.
- `meta-automation-hub` — hosts the shared n8n stack these client workflows run on.

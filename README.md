# Y.M.I Roofing — Aurora AI Agency Delivery

**Client:** Ben Breheny — Y.M.I Roofing · ACN 695 710 055  
**Agency:** Aurora AI Agency (AutoBoros.ai)  
**Stack:** React · n8n · Twilio · ManyChat · Cloudflare Pages · Claude API

---

## Repo Structure

```
ymiroofing/
├── index.html                    ← Deploy this to Cloudflare Pages
├── sitemap.xml                   ← SEO sitemap
├── robots.txt                    ← Search engine directives
├── 404.html                      ← Branded error page
├── .github/workflows/deploy.yml  ← Auto-deploy to Cloudflare Pages
├── src/
│   └── ymi-roofing-final.jsx     ← React source (production build → index.html)
├── worker/
│   ├── cf-worker-proxy.js        ← Cloudflare Worker: rate-limit + hide n8n URL
│   └── wrangler.toml             ← Worker deploy config
├── n8n-workflows/
│   ├── lead-capture.json         ← Website form → Sheets → SMS to Ben + customer
│   ├── review-machine.json       ← Job done → 24hr wait → review SMS → follow-up
│   ├── missed-call.json          ← Missed call → text-back + Ben alert
│   ├── maintenance-reminder.json ← Annual Sept SMS to past clients
│   └── sms-optout.json           ← STOP handler + reply relay to Ben
└── docs/
    ├── MASTER-DELIVERY.md        ← Full deployment guide
    ├── DEPLOY.md                 ← Backend/n8n config reference
    ├── manychat-spec.md          ← 5 ManyChat flow specs
    └── GAP-ANALYSIS.md           ← Security audit + reflection
```

---

## Quick Start

1. **Set endpoint in `index.html`:** `LEAD_ENDPOINT` (already points at `/api/lead` via Worker route)
2. **GitHub Secrets (for Pages deploy):** `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`
3. **Push to main** → auto-deploys to Cloudflare Pages
4. **Deploy the Worker (reliable delivery):**
   ```
   cd worker
   wrangler secret put RESEND_API_KEY          # required for email delivery to inbox
   # optional: wrangler secret put N8N_WEBHOOK_URL
   wrangler deploy
   ```
   (First create KV namespace + update ID in wrangler.toml)
5. **(Optional) Import n8n workflows** for SMS/Sheets automations. The Worker will forward if secret is set.
6. Verify form posts to Worker, Worker sends email, visitor sees success without mail client.

Full step-by-step: see `docs/MASTER-DELIVERY.md`

---

## n8n Replacements Required

| File | Find | Replace With |
|---|---|---|
| All workflows | `REPLACE_SHEET_ID` | Google Sheet ID from URL |
| All workflows | `REPLACE_TWILIO_NUMBER` | Twilio virtual number (+614...) |
| `review-machine.json` | `REPLACE_GOOGLE_PLACE_ID` | GBP Place ID |
| `worker/wrangler.toml` | `REPLACE_WITH_KV_NAMESPACE_ID` | Cloudflare KV (rate limiting) |
| Worker secrets         | `RESEND_API_KEY`               | Resend key for email leads (single place for delivery config) |

---

## Monthly Running Cost

| Item | Cost |
|---|---|
| Cloudflare Pages hosting | $0 |
| Cloudflare Worker (proxy) | $0 (free tier) |
| Domain `ymiroofing.com.au` | ~$1.20/mo |
| n8n self-hosted | $0 |
| Twilio (~40 SMS/mo) | ~$0.80/mo |
| ManyChat Pro | ~$22 AUD/mo |
| **Total** | **~$24/mo** |

Aurora Ignite retainer: $350/mo → **93% net margin**

---

*Aurora AI Agency · Built with Claude Sonnet · June 2025*

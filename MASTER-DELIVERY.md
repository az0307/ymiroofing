# YMI Roofing — Aurora AI Agency · Master Delivery Guide
**Client:** Ben Breheny — Y.M.I Roofing  
**ACN:** 695 710 055 · **Email:** y.m.iroofing@outlook.com  
**Primary:** 0422 093 241 · **Secondary:** 0423 858 503

---

## Delivery Status

| # | Deliverable | Status | File |
|---|---|---|---|
| 1 | Website (React JSX) | ✅ Complete | `ymi-roofing-final.jsx` |
| 2 | Production HTML | ✅ Complete | `index.html` |
| 3 | GitHub Actions Deploy | ✅ Complete | `github/deploy.yml` |
| 4 | n8n Lead Capture Workflow | ✅ Complete | `n8n/lead-capture.json` |
| 5 | n8n Review Machine Workflow | ✅ Complete | `n8n/review-machine.json` |
| 6 | ManyChat Chatbot Spec | ✅ Complete | `manychat/chatbot-spec.md` |

---

## Step 1 — Website: LEAD_ENDPOINT + reliable Worker delivery

In `index.html` (self-contained, no build) the constants are:

```js
const LEAD_ENDPOINT = 'https://ymiroofing.com.au/api/lead'; // Worker route
const LEAD_EMAIL    = 'y.m.iroofing@outlook.com';           // mailto fallback only
```

Primary flow: browser `fetch(LEAD_ENDPOINT)` → Worker (rate limit + CORS) → Resend email to inbox.  
Visitor never needs a mail client. On any total failure we surface an inline mailto link with pre-filled body.

n8n is optional (set `N8N_WEBHOOK_URL` secret and Worker will forward too).

---

## Step 2 — GitHub: Upload to Private Repo

```bash
# Create repo locally
mkdir ymi-roofing-frontend && cd ymi-roofing-frontend
git init
git branch -M main

# Copy in the production file
cp /path/to/index.html .
mkdir -p .github/workflows
cp /path/to/deploy.yml .github/workflows/

# Push to GitHub
git add .
git commit -m "feat: initial YMI Roofing site"
git remote add origin https://github.com/YOUR_ORG/ymi-roofing-frontend.git
git push -u origin main
```

---

## Step 3 — Cloudflare Pages: Connect & Deploy

1. Login → **dash.cloudflare.com**
2. **Workers & Pages → Pages → Create → Connect to Git**
3. Select `ymi-roofing-frontend` repo
4. Build settings:
   - Framework preset: **None**
   - Build command: *(leave blank)*
   - Output directory: `/` (root)
5. **Save and Deploy** → you get `ymi-roofing-frontend.pages.dev`

### Add GitHub Secrets for auto-deploy

Go to GitHub repo → **Settings → Secrets → Actions**:

| Secret name | Where to find |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens → Create Token (use "Edit Cloudflare Pages" template) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → right sidebar |

---

## Step 4 — Domain: Point ymiroofing.com.au → Cloudflare

1. Buy `ymiroofing.com.au` at VentraIP or Hostmate (~$14 AUD/year)
2. In Cloudflare: **Add a Site → Enter** `ymiroofing.com.au`
3. Cloudflare gives you 2 nameservers — copy both
4. In VentraIP/Hostmate: replace existing nameservers with Cloudflare's
5. Back in Cloudflare Pages → **Custom Domains → Set Up** `ymiroofing.com.au`
6. SSL is automatic. Allow 1–24hr for DNS propagation.

---

## Step 5 — n8n: Import and Configure Workflows

### Import Lead Capture workflow

1. n8n → **Settings → Import workflow**
2. Upload `n8n/lead-capture.json`
3. Update these values in the nodes:

| Node | Field | Replace With |
|---|---|---|
| Log to Google Sheets | Document ID | Your Google Sheet ID (from URL) |
| SMS to Ben Primary | From number | Your Twilio virtual number |
| SMS to Ben Secondary | From number | Your Twilio virtual number |

4. Add credentials: **Settings → Credentials**
   - Google Sheets OAuth2
   - Twilio Account SID + Auth Token

5. **Activate workflow** (toggle in top right)

6. Test: POST to `https://YOUR-N8N/webhook/ymi-roofing-lead` with:
```json
{
  "name": "Test User",
  "phone": "0400 000 000",
  "suburb": "Test Suburb",
  "service": "Roof Repairs",
  "message": "Test submission"
}
```
→ Ben should receive SMS within 10 seconds. Google Sheet should log a row.

### Import Review Machine workflow

1. Import `n8n/review-machine.json`
2. Update: Google Sheet ID, Twilio number, Google Review URL  
   → Get Google Review URL: Google Business Profile → Get more reviews → Copy link
3. Activate workflow
4. Give Ben his job-done URL:
```
https://YOUR-N8N/webhook/ymi-review-done?name=John+Smith&phone=0412345678&suburb=Croydon
```
5. Ben bookmarks this on his phone. After each job, he opens it, edits the URL with the customer's name and phone, and hits Go. Customer gets an SMS 24hrs later.

---

## Step 6 — ManyChat: Build Chatbot

Refer to `manychat/chatbot-spec.md` for full flow specs.

Quick start:
1. ManyChat → Connect Facebook Page + Instagram
2. Build flows from spec (Welcome, Get a Quote, Repairs, FAQ, Fallback)
3. Set up Custom Action webhook → n8n lead capture URL
4. Set keyword triggers
5. Test each flow

---

## Monthly Running Cost

| Item | Cost |
|---|---|
| Cloudflare Pages hosting | $0 |
| Domain (ymiroofing.com.au) | ~$1.20/mo |
| n8n (self-hosted, existing) | $0 |
| Twilio (~30 SMS/mo) | ~$0.60/mo |
| ManyChat Pro | ~$22 AUD/mo |
| **Total** | **~$24 AUD/mo** |

**Agency margin on Ignite ($350/mo): ~$326/mo net (~93%)**

---

## Aurora Trades Stack — Reusable Framework
*(Framework Extractor output — apply to next trades client in <2hrs)*

### Stage 1: Discovery (30 min)
- Input: Business card / logo / 10-question onboarding form
- Process: Extract contact info, brand colours, services, USPs
- Output: Brand token file, content data objects

### Stage 2: Website Build (4–6 hrs)
- Input: Brand tokens, content data, logo
- Process: Clone `ymi-roofing-final.jsx`, swap tokens + content
- Output: Production JSX + static HTML

### Stage 3: Automations (3–4 hrs)
- Input: n8n instance, Twilio creds, Google Sheet
- Process: Import workflows, update REPLACE_ values, test
- Output: Live lead capture + review machine

### Stage 4: Chatbot (3–4 hrs)
- Input: Client FAQ answers (10 questions), ManyChat account
- Process: Clone flow spec, update for new client's services/areas
- Output: Live Facebook + Instagram chatbot

### Stage 5: Deploy + Handover (1–2 hrs)
- Input: GitHub repo, Cloudflare account, domain
- Process: Deploy workflow, domain setup, client walkthrough
- Output: Live site + trained client

**Total for next client: ~12–16 hrs (vs 40+ hrs for Client 1)**


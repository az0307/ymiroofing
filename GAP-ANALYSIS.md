# YMI Roofing Delivery — Gap Analysis, Security Audit & Reflection
**Aurora AI Agency · Internal document · June 2026**

---

## TL;DR

12 files delivered. 4 categories of problems found. 1 significant external input (OKComputer/Kimi scaffold) that changes the deployment architecture. Action items follow each section.

---

## 1. SECURITY ISSUES

### CRITICAL

**API key exposed client-side in `ymi-ai-tools.jsx`**
All Claude API calls go directly from the browser. In the Claude.ai artifact sandbox this is handled transparently. In any production deployment this exposes the Anthropic key to anyone who opens DevTools. Every request is attributable to Aurora's account — cost, rate limits, and abuse all land on us.
Fix: All Anthropic API calls must route through a backend proxy. The OKComputer Hono server is the right place for this. Add a `/api/ai` endpoint that holds the key server-side and forwards requests.

**n8n webhook URL exposed in `index.html`**
`const WEBHOOK_URL = "https://..."` sits in plain HTML. Anyone who views source gets the endpoint and can spam it — fake leads, Google Sheets rows, SMS charges on the Twilio account.
Fix: Add a Cloudflare Worker as a thin proxy. Rate-limit to 5 requests per IP per hour. The Worker holds the real n8n URL in an environment variable, not the HTML.

**No CSRF protection beyond honeypot**
Honeypot stops dumb bots. It doesn't stop targeted form spam. A human or a headless browser can bypass it in 30 seconds.
Fix: Add Cloudflare Turnstile (free, invisible to real users) or a time-based HMAC token.

### HIGH

**SMS opt-out missing — Australian Spam Act exposure**
The review machine and maintenance reminder send unsolicited marketing SMS with no unsubscribe mechanism. Under the Australian Spam Act 2003, commercial electronic messages must include a functional unsubscribe. A STOP reply that goes nowhere is a breach. Fine up to $782,500 per day for a body corporate.
Fix: Every outbound marketing SMS must end with "Reply STOP to unsubscribe". Add a Twilio inbound webhook that catches STOP replies and logs the number to a blocklist sheet. Both workflows must check that blocklist before sending.

**Review machine uses GET with PII in URL**
`/ymi-review-done?name=John+Smith&phone=0412345678` — the customer's full name and phone number appear in Ben's browser history, n8n server logs, CDN logs, and any analytics tool installed.
Fix: Use POST with a short-lived job token. Ben's bookmark opens a tiny form, not a raw URL with PII in the querystring.

**No deduplication on missed-call text-back**
Twilio can fire the statusCallback webhook more than once for the same call (retry on non-200, network flap). A caller could receive 2–3 automatic text-backs within seconds.
Fix: Add a CallSid check in the Code node — if this CallSid is already in the Missed Calls sheet, return early and skip.

### MEDIUM

**n8n webhook has no rate limiting**
Nothing stops 10,000 POST requests to `/webhook/ymi-roofing-lead`. Each one creates a Sheets row and fires two Twilio SMS. At $0.08/SMS that's $1,600 in charges for 10,000 requests.
Fix: Cloudflare Worker proxy with rate limiting (5 req/IP/hour) sitting in front of the n8n URL.

**CORS set to `*` on n8n webhook**
Any domain can POST to the lead capture endpoint.
Fix: Once live on ymiroofing.com.au, restrict CORS to that origin only in the n8n webhook node.

**Input length not bounded**
Message field has no `maxLength`. A 50MB POST body will be processed, logged to Sheets, and attempted in an SMS.
Fix: `maxLength={1000}` on the textarea. Trim + slice in the n8n Code node.

---

## 2. GAPS — THINGS NOT BUILT

### Compliance

**Privacy Policy — missing**
The website collects names and phone numbers. Under the Australian Privacy Act 1988 (APP 1), any business with a website collecting personal information must have a clearly accessible Privacy Policy. Also required for Google Ads approval.

**Terms of Service — missing**
No ToS means no protection if a customer claims the quote was a binding contract.

**SMS unsubscribe — missing** (see Security above)

### Technical

**No email confirmation to the lead**
Customer submits form → sees success screen → nothing else. If they close the tab before Ben calls, they have no record of their enquiry.
Fix: Node 5 in lead capture: confirmation SMS or email to the customer. "Hi [name], your enquiry for [service] in [suburb] has been received. Ben will call you back within 1 hour."

**No fallback if n8n is down**
If the webhook is unreachable, the lead is lost permanently. The error state does show Ben's number but the form data is gone.
Fix: Formspree or Netlify Forms as a fallback URL. On primary webhook failure, silently retry to fallback.

**No `sitemap.xml` or `robots.txt`**
Google can't efficiently crawl without them.

**No `404.html`**
Cloudflare Pages serves a generic 404 for any path other than `/`. Add a branded `404.html` at repo root.

**GA4 still commented out**
No traffic data = can't prove value in the monthly report.

**`REPLACE_GOOGLE_PLACE_ID` is still a placeholder**
Review machine SMS links are broken until GBP is set up and verified (5–14 day postcard wait). This should block workflow activation.

**Two-way SMS not handled**
Customers reply to text-backs and review requests. Those replies go to the Twilio number and disappear. Ben never sees them.
Fix: Twilio inbound SMS webhook → n8n → SMS relay to Ben's mobile. "Reply from 0412xxx: [text]"

**Twilio number not procured**
This is the single biggest real-world blocker. Four workflows built, zero work without a real number.

**No business hours logic**
A missed call at 11PM triggers "Ben will call you back within 30 minutes." That's a false promise and an unwelcome 2AM SMS to Ben.
Fix: Time-of-day check in Code nodes. Outside 7AM–7PM Mon–Sat: change SMS text to "first thing tomorrow morning" and suppress Ben's alert until 7AM using a Wait node.

**No n8n monitoring**
n8n goes down → everything silently stops. No alerting.
Fix: UptimeRobot free tier monitoring on the n8n URL with SMS alert to Az's mobile.

### Content

**Testimonials are fabricated**
Dave M. (Croydon), Sarah K. (Doncaster), Mike T. (Ringwood) are AI-generated. Acceptable pre-launch placeholder but must be replaced with real testimonials before scaling advertising.

**Service areas not defined**
"Melbourne" is vague. A customer from Geelong or Ballarat could submit a lead Ben can't service.

---

## 3. OKComputer — What This Changes

The Kimi-produced scaffold is a full-stack TypeScript app:

| | Claude Artifacts | OKComputer (Kimi) |
|---|---|---|
| Auth | None | Kimi OAuth (JWT + tRPC) |
| Backend | None | Hono + tRPC |
| Database | None | MySQL + Drizzle ORM |
| History | None | localStorage (100 items, favourites, delete) |
| API key | Browser-exposed | Server-side (correct) |
| Type safety | None | Full TypeScript |
| Components | Inline CSS | shadcn/ui + Tailwind |
| Tool logic | Complete | Skeleton (empty components) |
| Deployment | Claude.ai only | Vite build → Node server |

**The synthesis:** OKComputer's architecture + Claude's tool logic = deployable production app.

OKComputer already has the correct pattern for API proxying (Hono backend holds secrets), the history system (useLocalHistory hook — localStorage, 100 items, favourites, timestamps), and the component structure (lazy-loaded tabs). What it's missing is everything inside the components.

**Integration plan (6–8 hrs):**

1. Strip Kimi OAuth → replace with simple PIN gate or remove entirely (Ben is sole user)
2. Add `/api/ai` POST route to Hono server → holds `ANTHROPIC_API_KEY` in env, proxies to Anthropic
3. Port system prompts + form logic from `ymi-ai-tools.jsx` into the TypeScript tool components
4. Replace `fetch(ANTHROPIC_URL)` calls with `fetch('/api/ai')`
5. Wire `useLocalHistory` hook to save each generation automatically
6. Add YMI brand tokens to Tailwind config, swap in logo PNG (not base64)
7. Deploy: Cloudflare Pages (frontend) + Cloudflare Worker (API proxy) — or Railway for the full Node server

Result: Typed, secure, history-enabled, brand-consistent tool suite that Ben can bookmark and use daily.

---

## 4. REFLECTION

**Biggest architectural mistake:** Building `ymi-ai-tools.jsx` as a client-side-only artifact with direct Anthropic API calls. This is fine for the Claude.ai sandbox and worthless in production. The proxy pattern should have been the starting assumption, not an afterthought. OKComputer surfaced this — it was built API-proxy-first.

**Biggest process mistake:** Not provisioning the Twilio number before building the workflows. The correct sequence was: Twilio account → number → credentials → then write the JSONs with real values, not REPLACE_ placeholders. Same for Google Business Profile — 5–14 day verification wait means it needed to start on day one, not be left as a step 6 item.

**What worked well:** The n8n workflow JSONs are clean, importable, and logically correct. The website is production-quality design with real SEO schema, real accessibility, and real validation. The ManyChat spec is complete enough to build from without referring back to us. The Aurora Trades Stack framework is genuinely reusable — the second client should take 12–16 hours.

**What the OKComputer scaffold tells us about Kimi vs Claude:** Kimi built the correct infrastructure but empty tools. Claude built the correct tools but wrong infrastructure. Neither is complete alone. The right workflow going forward: use Claude for logic/content/copy, use an established scaffold (OKComputer or similar) for the deployment architecture. Don't build deployment infrastructure inside an artifact.

---

## 5. PRIORITY ACTION LIST

### P0 — Before going live
- [ ] Procure Twilio AU number — replace all `REPLACE_TWILIO_NUMBER`
- [ ] Start GBP verification immediately (postcard = 14 day wait)
- [ ] Add Cloudflare Worker proxy in front of n8n webhook (rate limit + hide URL)
- [ ] Add SMS opt-out ("Reply STOP") to review machine + maintenance reminder
- [ ] Add STOP reply handler n8n workflow (inbound Twilio → blocklist sheet)
- [ ] Add business hours check to missed-call and review workflows
- [ ] Add CallSid deduplication to missed-call workflow
- [ ] Add Privacy Policy page to website

### P1 — Week 1
- [ ] GA4 property → uncomment tracking block → verify in GA4 real-time
- [ ] Add `sitemap.xml`, `robots.txt`, `404.html` to repo
- [ ] Add lead confirmation SMS/email to customer (n8n node 5)
- [ ] Add inbound SMS relay workflow (replies forwarded to Ben)
- [ ] Restrict n8n CORS to `https://ymiroofing.com.au`
- [ ] UptimeRobot on n8n URL → SMS alert to Az

### P2 — Month 1
- [ ] Port tool logic into OKComputer TypeScript components
- [ ] Add Hono `/api/ai` proxy route (Anthropic key off client)
- [ ] Replace fabricated testimonials with real ones
- [ ] Add service area section/suburbs to website
- [ ] Build ManyChat flows (4hrs in platform)

### P3 — Month 2
- [ ] Jobber API integration (auto-create customer on lead receipt)
- [ ] Cloudflare Turnstile (replace honeypot)
- [ ] Two-way SMS dashboard
- [ ] Staging branch workflow in Cloudflare Pages

---

*Aurora AI Agency · Skills applied: AssumptionRevealer · RiskAnalyzer · ContrarianAnalysis · StrategicInsights*

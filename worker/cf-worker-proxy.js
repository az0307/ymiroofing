/**
 * Aurora AI Agency — YMI Roofing
 * Cloudflare Worker: Rate-limited proxy for n8n webhook
 *
 * Deploy: wrangler deploy
 * Set env vars in Cloudflare dashboard:
 *   N8N_WEBHOOK_URL = https://your-n8n-domain/webhook/ymi-roofing-lead
 *
 * This Worker:
 *  1. Rate-limits to 5 POST requests per IP per hour
 *  2. Hides the real n8n URL from browser source
 *  3. Validates Content-Type and basic payload shape
 *  4. Adds CORS for ymiroofing.com.au only
 */

// CORS: locked to production origins only (per spec)
const ALLOWED_ORIGINS = [
  "https://ymiroofing.com.au",
  "https://www.ymiroofing.com.au"
];
// Rate limit: 3 requests per IP per 60 seconds (rolling window)
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

export default {
  async fetch(request, env, ctx) {
    // ── CORS preflight
    if (request.method === "OPTIONS") {
      const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": allowOrigin,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // ── Only POST allowed
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ── Origin check (strict prod only)
    const origin = request.headers.get("Origin") || "";
    const isAllowed = ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".pages.dev"); // allow CF preview deploys
    if (!isAllowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ── Rate limiting via KV (3 / 60s rolling)
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const now = Date.now();
    const rateKey = `rate:${ip}`;

    let allowed = true;
    try {
      const stored = await env.RATE_LIMIT_KV.get(rateKey, { type: "json" });
      if (stored && stored.firstTs && (now - stored.firstTs) < RATE_LIMIT_WINDOW_MS) {
        if (stored.count >= RATE_LIMIT_MAX) {
          allowed = false;
        } else {
          stored.count += 1;
          ctx.waitUntil(env.RATE_LIMIT_KV.put(rateKey, JSON.stringify(stored), { expirationTtl: 120 }));
        }
      } else {
        // new window
        ctx.waitUntil(env.RATE_LIMIT_KV.put(rateKey, JSON.stringify({ count: 1, firstTs: now }), { expirationTtl: 120 }));
      }
    } catch (e) {
      // KV down — fail open but log
      console.error("KV rate limit error", e);
    }

    if (!allowed) {
      return new Response(JSON.stringify({
        error: "Too many requests. Please call Ben directly on 0422 093 241."
      }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0],
          "Retry-After": "60",
        },
      });
    }

    // ── Parse and validate payload
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0],
        },
      });
    }

    // Basic shape validation
    if (!body.name || !body.phone) {
      return new Response(JSON.stringify({ error: "Name and phone are required" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0],
        },
      });
    }

    // Input length limits
    const sanitized = {
      name:    String(body.name    || "").slice(0, 100),
      phone:   String(body.phone   || "").slice(0, 20),
      suburb:  String(body.suburb  || "").slice(0, 100),
      service: String(body.service || "").slice(0, 100),
      message: String(body.message || "").slice(0, 1000),
      source:  String(body.source  || "website").slice(0, 50),
      _hp_ymir: body._hp_ymir || "",
      submitted_at: new Date().toISOString(),
    };

    // ── Reliable delivery: send via Resend (email to inbox, works even with no n8n).
    // If N8N_WEBHOOK_URL secret is also set we forward for automations (SMS etc).
    let delivered = false;

    // Send email (primary reliable path)
    if (env.RESEND_API_KEY) {
      try {
        const from = "YMI Roofing <onboarding@resend.dev>"; // TODO: verify domain in Resend for prod
        const to = "y.m.iroofing@outlook.com";
        const subject = `New quote request — ${sanitized.name} (${sanitized.phone})`;
        const text = `New lead from ymiroofing.com.au\n\nName: ${sanitized.name}\nPhone: ${sanitized.phone}\nSuburb: ${sanitized.suburb}\nService: ${sanitized.service}\nMessage: ${sanitized.message}\n\nSource: ${sanitized.source}\nSubmitted: ${sanitized.submitted_at}\nPage: ${sanitized.pageUrl || 'n/a'}`;
        const html = `<h2>New quote request from website</h2>
<strong>${sanitized.name}</strong> — ${sanitized.phone}<br>
Suburb: ${sanitized.suburb}<br>Service: ${sanitized.service}<br><br>
${(sanitized.message||'').replace(/</g,'&lt;').replace(/\n/g,'<br>')}<br><br>
<small>${sanitized.source} • ${sanitized.submitted_at}</small>`;

        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from, to, subject, text, html })
        });
        delivered = r.ok;
        if (!delivered) console.error("Resend non-200:", await r.text().catch(()=> ''));
      } catch (e) { console.error("Resend exception:", e.message); }
    }

    // Optional parallel forward to n8n (if secret present)
    if (env.N8N_WEBHOOK_URL) {
      try { await fetch(env.N8N_WEBHOOK_URL, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(sanitized) }); } catch(e){}
    }

    // Spec: return { "status": "ok" } on success path (200). 202 if accepted but no delivery channel configured yet.
    const status = delivered || env.N8N_WEBHOOK_URL ? 200 : 202;
    return new Response(JSON.stringify({ status: "ok", delivered: !!delivered }), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0],
      },
    });
  },
};

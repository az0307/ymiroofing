/**
 * Cloudflare Worker — YMI Roofing lead proxy
 *
 * Sits between ymiroofing.com.au and the self-hosted n8n webhook.
 * - Keeps the real n8n URL secret (stored as CF secret N8N_WEBHOOK_URL)
 * - Enforces CORS so only ymiroofing.com.au can POST
 * - Rate-limits by IP: 3 submissions per 60 s
 *
 * Deploy: wrangler deploy  (from worker/ directory)
 * Secret: wrangler secret put N8N_WEBHOOK_URL
 */

const ALLOWED_ORIGINS = [
  'https://ymiroofing.com.au',
  'https://www.ymiroofing.com.au',
];

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX      = 3;       // max submissions per IP per window

// In-memory store — resets on isolate cold-start (acceptable for rate limiting)
const rateLimitStore = new Map();

function isRateLimited(ip) {
  const now   = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, { count: 1, windowStart: now });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX) return true;

  entry.count++;
  return false;
}

function corsHeaders(origin) {
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin':  allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age':       '86400',
  };
}

function jsonResponse(body, status, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

export default {
  async fetch(request, env) {
    const origin  = request.headers.get('Origin') || '';
    const cors    = corsHeaders(origin);

    // ── CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // ── Only POST allowed
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405, cors);
    }

    // ── Rate limit by IP
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (isRateLimited(ip)) {
      return jsonResponse(
        { error: 'Too many requests. Please wait a minute before trying again.' },
        429,
        { ...cors, 'Retry-After': '60' },
      );
    }

    // ── Validate Content-Type
    const ct = request.headers.get('Content-Type') || '';
    if (!ct.includes('application/json')) {
      return jsonResponse({ error: 'Content-Type must be application/json' }, 400, cors);
    }

    // ── Parse payload
    let payload;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400, cors);
    }

    // ── Basic required-field guard
    if (!payload.name || !payload.phone) {
      return jsonResponse({ error: 'name and phone are required' }, 400, cors);
    }

    // ── Check secret is configured
    const n8nUrl = env.N8N_WEBHOOK_URL;
    if (!n8nUrl) {
      console.error('[ymi-worker] N8N_WEBHOOK_URL secret is not set');
      return jsonResponse({ error: 'Service configuration error' }, 503, cors);
    }

    // ── Forward to n8n
    try {
      const upstream = await fetch(n8nUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });

      if (!upstream.ok) {
        console.error('[ymi-worker] n8n returned', upstream.status);
        return jsonResponse({ error: 'Upstream error — try again shortly' }, 502, cors);
      }

      return jsonResponse({ status: 'ok', message: 'Lead received' }, 200, cors);
    } catch (err) {
      console.error('[ymi-worker] fetch error:', err.message);
      return jsonResponse({ error: 'Service temporarily unavailable' }, 503, cors);
    }
  },
};

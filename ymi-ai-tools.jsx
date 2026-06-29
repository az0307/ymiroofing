import { useState } from "react";

// ─── TOKENS ───────────────────────────────────────────────
const C = {
  bg: "#06101E", navy: "#0A1628", navyLight: "#0F2040",
  blue: "#1B68B4", bright: "#2E8AF6", silver: "#B8C8D8",
  white: "#FFFFFF", muted: "#6B829A", dark: "#030810",
  green: "#10B981", amber: "#F59E0B", red: "#EF4444",
};

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL   = "claude-sonnet-4-20250514";

// ─── SHARED HELPERS ───────────────────────────────────────
const call = async (systemPrompt, userPrompt) => {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  return data.content?.[0]?.text || "";
};

const Card = ({ children, style = {} }) => (
  <div style={{ background: `linear-gradient(160deg,${C.navyLight},${C.navy})`, border: `1px solid ${C.blue}28`, borderRadius: 12, padding: 20, ...style }}>
    {children}
  </div>
);

const Label = ({ children }) => (
  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".16em", color: C.blue, textTransform: "uppercase", marginBottom: 8 }}>{children}</div>
);

const Field = ({ label, children }) => (
  <div style={{ marginBottom: 14 }}>
    <Label>{label}</Label>
    {children}
  </div>
);

const inputStyle = {
  width: "100%", background: `${C.dark}AA`, border: `1px solid ${C.blue}33`,
  borderRadius: 8, padding: "10px 13px", fontSize: 14, color: C.white,
  fontFamily: "inherit", outline: "none",
};

const Btn = ({ onClick, loading, children, color = C.blue, disabled = false }) => (
  <button onClick={onClick} disabled={loading || disabled}
    style={{ background: color, color: C.white, border: "none", borderRadius: 8, padding: "11px 22px", fontSize: 14, fontWeight: 700, cursor: loading || disabled ? "not-allowed" : "pointer", opacity: loading || disabled ? .7 : 1, display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "inherit" }}>
    {loading && <span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", animation: "spin .7s linear infinite", display: "inline-block" }} />}
    {children}
  </button>
);

const CopyBtn = ({ text }) => {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000); } catch {}
  };
  return (
    <button onClick={copy} style={{ background: done ? `${C.green}22` : "transparent", border: `1px solid ${done ? C.green : C.blue + "44"}`, borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontSize: 11, fontWeight: 600, color: done ? C.green : C.muted, fontFamily: "inherit" }}>
      {done ? "✓ Copied" : "Copy"}
    </button>
  );
};

const Output = ({ text, label = "Result" }) => (
  <div style={{ marginTop: 16 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
      <Label>{label}</Label>
      <CopyBtn text={text} />
    </div>
    <div style={{ background: C.dark, border: `1px solid ${C.blue}22`, borderRadius: 8, padding: 16, fontSize: 13, color: C.silver, lineHeight: 1.7, whiteSpace: "pre-wrap", maxHeight: 360, overflowY: "auto" }}>
      {text}
    </div>
  </div>
);

const Spinner = () => (
  <div style={{ textAlign: "center", padding: 40 }}>
    <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${C.blue}33`, borderTopColor: C.blue, animation: "spin .8s linear infinite", margin: "0 auto 12px" }} />
    <div style={{ fontSize: 13, color: C.muted }}>Claude is working…</div>
  </div>
);

// ─── TAB 1: SOCIAL CONTENT ENGINE ─────────────────────────
function SocialTool() {
  const [form, setForm] = useState({ jobType: "", suburb: "", tileType: "", extra: "", tone: "professional" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const generate = async () => {
    if (!form.jobType || !form.suburb) { setError("Job type and suburb are required."); return; }
    setError(""); setLoading(true); setResult("");
    try {
      const system = `You are a social media copywriter for Y.M.I Roofing, a Melbourne roof tiling business run by Ben Breheny. 
Ben has 20+ years experience, 100% workmanship guarantee, and is known for turning up on time and doing the job right the first time.
Write exactly 3 Instagram/Facebook caption options. Each must:
- Be punchy and human-sounding (not corporate)
- Include 1–2 relevant hashtags inline or at the end
- Be under 150 words
- Have a clear call-to-action (call, DM, or visit website)
- Reflect the ${form.tone} tone
Number them 1. 2. 3. and separate with a blank line.`;

      const user = `Job completed today:
- Service: ${form.jobType}
- Suburb: ${form.suburb}
- Tile type: ${form.tileType || "standard concrete tiles"}
- Extra details: ${form.extra || "standard job, client happy"}

Write 3 caption options for the before/after photos from this job.`;

      const out = await call(system, user);
      setResult(out);
    } catch (e) {
      setError("API error — check your connection and try again.");
    }
    setLoading(false);
  };

  const TONES = ["professional", "friendly/casual", "bold/confident", "local/community"];
  const JOB_TYPES = ["New Roof Tiling", "Re-Bedding & Re-Pointing", "Roof Repairs", "Tile Replacement", "Ridge Capping", "Roof Inspection"];

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: C.silver, lineHeight: 1.7 }}>
          📸 <strong style={{ color: C.white }}>How to use:</strong> After a job, fill in the details below. Claude writes 3 ready-to-post Instagram/Facebook captions. Copy the one you like, post with your before/after photo. Done.
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Job Type *">
          <select value={form.jobType} onChange={e => setForm(f => ({ ...f, jobType: e.target.value }))} style={{ ...inputStyle, background: C.navyLight }}>
            <option value="">Select job type…</option>
            {JOB_TYPES.map(j => <option key={j}>{j}</option>)}
          </select>
        </Field>
        <Field label="Suburb *">
          <input value={form.suburb} onChange={e => setForm(f => ({ ...f, suburb: e.target.value }))} placeholder="e.g. Croydon" style={inputStyle} />
        </Field>
        <Field label="Tile Type">
          <input value={form.tileType} onChange={e => setForm(f => ({ ...f, tileType: e.target.value }))} placeholder="e.g. terracotta, concrete, slate" style={inputStyle} />
        </Field>
        <Field label="Tone">
          <select value={form.tone} onChange={e => setForm(f => ({ ...f, tone: e.target.value }))} style={{ ...inputStyle, background: C.navyLight }}>
            {TONES.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Extra Details (optional)">
        <input value={form.extra} onChange={e => setForm(f => ({ ...f, extra: e.target.value }))} placeholder="e.g. 30-year-old home, tricky access, client loved the result" style={inputStyle} />
      </Field>

      {error && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>⚠️ {error}</div>}

      <Btn onClick={generate} loading={loading}>✨ Generate 3 Captions</Btn>

      {loading && <Spinner />}
      {result && <Output text={result} label="3 Caption Options — Pick Your Favourite" />}
    </div>
  );
}

// ─── TAB 2: QUOTE ESTIMATOR ───────────────────────────────
function QuoteTool() {
  const [form, setForm] = useState({ service: "", tileType: "", area: "", suburb: "", access: "standard", condition: "", extras: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const generate = async () => {
    if (!form.service || !form.suburb) { setError("Service and suburb are required."); return; }
    setError(""); setLoading(true); setResult("");
    try {
      const system = `You are an expert quoting assistant for Y.M.I Roofing, a Melbourne roof tiling business.
Ben Breheny has 20+ years experience and provides 100% guaranteed workmanship.
Generate a professional, structured quote DRAFT for Ben to review and adjust.
Include:
1. A brief scope of works description
2. Key line items with estimated hours/materials where relevant  
3. A realistic price range (not exact — Ben will firm up on inspection)
4. Important notes/caveats
5. Terms: payment on completion, free quote, written guarantee

Use Australian English. Be concise and professional. This is a draft starting point, not a final quote.
Format clearly with sections. Do NOT invent specific prices you aren't confident in — use ranges.`;

      const user = `Quote request:
Service: ${form.service}
Tile type: ${form.tileType || "to be confirmed on inspection"}
Approximate area: ${form.area ? form.area + " m²" : "to be confirmed on inspection"}
Suburb: ${form.suburb}
Roof access: ${form.access}
Current condition: ${form.condition || "to be confirmed on inspection"}
Additional work: ${form.extras || "none specified"}

Generate a draft quote for Ben to review and send to the client.`;

      const out = await call(system, user);
      setResult(out);
    } catch (e) {
      setError("API error — check your connection and try again.");
    }
    setLoading(false);
  };

  const SERVICES = ["New Roof Tiling", "Re-Bedding & Re-Pointing", "Roof Repairs", "Tile Replacement", "Ridge Capping", "Roof Inspection"];
  const ACCESS = ["standard", "single-storey easy access", "two-storey", "steep pitch", "very difficult access"];

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: C.silver, lineHeight: 1.7 }}>
          📋 <strong style={{ color: C.white }}>How to use:</strong> Fill in what you know from the initial enquiry. Claude drafts a structured quote for you to review, adjust, and send. Saves 20–30 min per quote.
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Service *">
          <select value={form.service} onChange={e => setForm(f => ({ ...f, service: e.target.value }))} style={{ ...inputStyle, background: C.navyLight }}>
            <option value="">Select service…</option>
            {SERVICES.map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Suburb *">
          <input value={form.suburb} onChange={e => setForm(f => ({ ...f, suburb: e.target.value }))} placeholder="e.g. Ringwood" style={inputStyle} />
        </Field>
        <Field label="Tile Type">
          <input value={form.tileType} onChange={e => setForm(f => ({ ...f, tileType: e.target.value }))} placeholder="e.g. concrete, terracotta, slate" style={inputStyle} />
        </Field>
        <Field label="Approximate Area (m²)">
          <input type="number" value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} placeholder="e.g. 180" style={inputStyle} />
        </Field>
        <Field label="Roof Access">
          <select value={form.access} onChange={e => setForm(f => ({ ...f, access: e.target.value }))} style={{ ...inputStyle, background: C.navyLight }}>
            {ACCESS.map(a => <option key={a}>{a}</option>)}
          </select>
        </Field>
        <Field label="Current Condition">
          <input value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))} placeholder="e.g. 30yr old, multiple broken tiles, leaking" style={inputStyle} />
        </Field>
      </div>

      <Field label="Additional Works / Notes">
        <input value={form.extras} onChange={e => setForm(f => ({ ...f, extras: e.target.value }))} placeholder="e.g. replace guttering, gutter guard, barge capping" style={inputStyle} />
      </Field>

      {error && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>⚠️ {error}</div>}

      <Btn onClick={generate} loading={loading}>📄 Draft Quote</Btn>

      {loading && <Spinner />}
      {result && <Output text={result} label="Draft Quote — Review & Adjust Before Sending" />}
    </div>
  );
}

// ─── TAB 3: EMAIL WRITER ──────────────────────────────────
function EmailTool() {
  const [form, setForm] = useState({ type: "quote_followup", customerName: "", context: "", tone: "friendly professional" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const EMAIL_TYPES = [
    { val: "quote_followup",    label: "Quote Follow-Up" },
    { val: "job_complete",      label: "Job Completion Thank You" },
    { val: "delay_notice",      label: "Job Delay Notice" },
    { val: "inspection_report", label: "Inspection Report Cover" },
    { val: "storm_alert",       label: "Storm Alert to Past Clients" },
    { val: "referral_request",  label: "Referral Request" },
  ];

  const generate = async () => {
    if (!form.customerName) { setError("Customer name is required."); return; }
    setError(""); setLoading(true); setResult("");
    try {
      const system = `You are writing emails for Ben Breheny, Director of Y.M.I Roofing in Melbourne.
Ben is a straight-talking, experienced tradesperson. He's professional but not corporate. Emails should sound like him — warm, direct, trustworthy.
Include subject line and body. Keep it concise. Australian English.
Signature: Ben Breheny | Y.M.I Roofing | 0422 093 241 | y.m.iroofing@outlook.com | ymiroofing.com.au`;

      const user = `Write a ${form.type.replace(/_/g, " ")} email.
Customer name: ${form.customerName}
Context/Details: ${form.context || "standard situation"}
Tone: ${form.tone}`;

      const out = await call(system, user);
      setResult(out);
    } catch (e) {
      setError("API error — check your connection and try again.");
    }
    setLoading(false);
  };

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: C.silver, lineHeight: 1.7 }}>
          ✉️ <strong style={{ color: C.white }}>How to use:</strong> Pick an email type, add the customer name and any relevant context. Claude writes a ready-to-send email in Ben's voice.
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Email Type *">
          <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ ...inputStyle, background: C.navyLight }}>
            {EMAIL_TYPES.map(t => <option key={t.val} value={t.val}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Customer Name *">
          <input value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} placeholder="e.g. John Smith" style={inputStyle} />
        </Field>
      </div>

      <Field label="Context / Details">
        <textarea value={form.context} onChange={e => setForm(f => ({ ...f, context: e.target.value }))} rows={3}
          placeholder="e.g. Quoted $3,200 for re-bedding last Tuesday, sent quote but no reply yet. Job was in Croydon."
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
      </Field>

      {error && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>⚠️ {error}</div>}

      <Btn onClick={generate} loading={loading}>✉️ Write Email</Btn>

      {loading && <Spinner />}
      {result && <Output text={result} label="Email Draft — Copy into Outlook" />}
    </div>
  );
}

// ─── TAB 4: MONTHLY VALUE REPORT ──────────────────────────
function ReportTool() {
  const [data, setData] = useState({
    month: new Date().toLocaleString("en-AU", { month: "long", year: "numeric" }),
    leads: "", reviewRequests: "", reviewsReceived: "", missedCalls: "", textBacks: "",
    chatbotConvos: "", websiteViews: "", newReviews: "", retainer: "350",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  const generate = async () => {
    setLoading(true); setResult("");
    try {
      const system = `You are Aurora AI Agency writing a monthly performance report for YMI Roofing client Ben Breheny.
Be concise, positive, and specific. Show the value delivered. Use bullet points.
Include: what was delivered, key numbers, what this means in plain English (e.g. "3 leads from chatbot = ~$X in potential jobs"), and what's coming next month.
Keep total length under 400 words. Warm but professional tone.`;

      const user = `Monthly report for ${data.month}:
- Website enquiry leads: ${data.leads || 0}
- Review requests sent: ${data.reviewRequests || 0}
- Reviews received: ${data.reviewsReceived || 0}
- Missed calls intercepted (text-back sent): ${data.missedCalls || 0}
- Chatbot conversations: ${data.chatbotConvos || 0}
- Website visitors (approx): ${data.websiteViews || "not tracked yet"}
- New Google reviews this month: ${data.newReviews || 0}
- Monthly retainer: $${data.retainer}

Write the monthly value report email from Aurora AI Agency to Ben.`;

      const out = await call(system, user);
      setResult(out);
    } catch (e) {
      setResult("Error generating report — check API connection.");
    }
    setLoading(false);
  };

  const metrics = [
    { key: "leads",          label: "Website Leads",        placeholder: "e.g. 7" },
    { key: "reviewRequests", label: "Review Requests Sent", placeholder: "e.g. 12" },
    { key: "reviewsReceived",label: "Reviews Received",     placeholder: "e.g. 4" },
    { key: "missedCalls",    label: "Missed Calls Caught",  placeholder: "e.g. 3" },
    { key: "textBacks",      label: "Text-Backs Sent",      placeholder: "e.g. 3" },
    { key: "chatbotConvos",  label: "Chatbot Conversations",placeholder: "e.g. 15" },
    { key: "websiteViews",   label: "Website Visitors",     placeholder: "e.g. 180" },
    { key: "newReviews",     label: "New Google Reviews",   placeholder: "e.g. 2" },
  ];

  const totalLeads = (parseInt(data.leads) || 0) + (parseInt(data.chatbotConvos) || 0) + (parseInt(data.missedCalls) || 0);
  const estimatedJobs = Math.floor(totalLeads * 0.3);
  const estimatedValue = estimatedJobs * 1800;

  return (
    <div>
      <Card style={{ marginBottom: 16, background: `${C.green}10`, border: `1px solid ${C.green}33` }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          {[
            ["Total Leads", totalLeads, C.blue],
            ["Est. Jobs Won (~30%)", estimatedJobs, C.green],
            ["Est. Revenue", `$${estimatedValue.toLocaleString()}`, C.amber],
          ].map(([label, val, color]) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 26, fontWeight: 700, color, fontFamily: "monospace" }}>{val}</div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </Card>

      <Field label="Reporting Month">
        <input value={data.month} onChange={e => setData(d => ({ ...d, month: e.target.value }))} style={inputStyle} />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        {metrics.map(m => (
          <div key={m.key}>
            <Label>{m.label}</Label>
            <input type="number" value={data[m.key]} onChange={e => setData(d => ({ ...d, [m.key]: e.target.value }))} placeholder={m.placeholder} style={inputStyle} />
          </div>
        ))}
      </div>

      <Btn onClick={generate} loading={loading}>📊 Generate Report Email</Btn>

      {loading && <Spinner />}
      {result && <Output text={result} label="Monthly Report — Send to Ben" />}
    </div>
  );
}

// ─── TAB 5: OPPORTUNITY MAP ───────────────────────────────
function OpportunityMap() {
  const leverage = [
    {
      rank: 1, name: "Missed Call Text-Back", mechanism: "Bottleneck Removal",
      effort: "2 hrs (n8n + Twilio)", ratio: "25:1",
      small: "One n8n workflow wired to Twilio's callStatus webhook. Runs forever.",
      big: "Ben misses ~30% of calls on the roof. First to respond wins. This makes him always first.",
      impact: "Capture an extra 3–5 jobs/month that currently go to competitors",
      file: "n8n-missed-call.json ✅ Built",
    },
    {
      rank: 2, name: "Social Content Engine", mechanism: "Force Multiplier",
      effort: "Built (this tool)", ratio: "20:1",
      small: "Ben types 3 fields. Claude writes 3 captions. One minute per post.",
      big: "Every job becomes a marketing asset. 4 posts/week = 200+ posts/year with zero writing effort.",
      impact: "Instagram/Facebook presence that builds trust and generates inbound enquiries",
      file: "Social Content tab ✅ This tool",
    },
    {
      rank: 3, name: "Maintenance Reminder Campaign", mechanism: "Compounding Return",
      effort: "3 hrs (n8n scheduled)", ratio: "30:1",
      small: "Annual SMS to every past client. Spring timing = storm preparation hook.",
      big: "Past clients are the warmest possible leads — they already trust Ben. 10–20% re-engagement rate.",
      impact: "5–10 re-engagement jobs per campaign × $1,500 avg = $7,500–$15,000 per year",
      file: "n8n-maintenance-reminder.json ✅ Built",
    },
  ];

  const opportunities = [
    {
      name: "Scale to 5 Melbourne Trades Clients",
      type: "Business Model", priority: "HIGH", timeline: "90 days",
      revenue: "$1,750/mo", effort: "60 hrs total",
      desc: "Each client uses the same Aurora Trades Stack. Plumber, electrician, painter, landscaper are immediate targets. Client 2 takes 12hrs vs 40hrs for Client 1.",
      win: "Second client revenue covers all agency running costs. Everything after is profit.",
    },
    {
      name: "Google Ads Management Add-On",
      type: "Product", priority: "HIGH", timeline: "60 days",
      revenue: "$150–300/mo per client", effort: "2 hrs/mo per client",
      desc: "Ben spends $500–1,000/mo on Google Ads (or should be). Aurora manages the campaign for $150–300/mo. The website is already conversion-optimised.",
      win: "Ads work 3× better with Aurora's site vs a generic one. Easy proof of value.",
    },
    {
      name: "Jobber + Twilio Affiliate Revenue",
      type: "Partnership", priority: "MED", timeline: "30 days",
      revenue: "Recurring commission per referral", effort: "< 1 hr",
      desc: "Sign up for Jobber affiliate program. Add affiliate link to all client handovers. Same for Twilio. Each referral earns recurring commission.",
      win: "Passive income layer on top of retainers. Zero ongoing effort.",
    },
    {
      name: "Aurora Roofer Stack SaaS",
      type: "Product Platform", priority: "MED", timeline: "6 months",
      revenue: "$49–99/mo × N roofing companies", effort: "80 hrs to productise",
      desc: "Package the entire YMI Roofing stack as a self-serve product for roofing companies nationally. Website + automations + chatbot in a box. RooferClaw charges $200+/mo. Aurora charges $79/mo.",
      win: "AU tiling market is massively underserved by current platforms (all US-focused). First mover advantage.",
    },
    {
      name: "Seasonal Storm Campaign",
      type: "Product", priority: "MED", timeline: "Next storm season",
      revenue: "Included in Blaze tier", effort: "2 hrs to build",
      desc: "n8n workflow: when BOM issues storm warning for Melbourne → SMS goes to all past clients in affected suburbs offering free post-storm inspection. Hyper-relevant, perfectly timed.",
      win: "Storm damage is the single highest-urgency roofing trigger. Being first to offer inspection = jobs.",
    },
    {
      name: "Content → GBP Auto-Poster",
      type: "Technology", priority: "LOW", timeline: "Month 3",
      revenue: "Included in Blaze tier", effort: "3 hrs (n8n + Meta API)",
      desc: "When Ben approves a caption in the Social Content tool, n8n auto-posts to Facebook + Instagram AND uploads the same post to Google Business Profile. One approval = 3 platforms.",
      win: "GBP posts directly boost local search ranking. Most tilers never post to GBP.",
    },
  ];

  const PCOLORS = { HIGH: C.green, MED: C.amber, LOW: C.muted };
  const TCOLORS = { "Business Model": C.blue, "Product": "#8B5CF6", "Partnership": C.green, "Technology": C.amber, "Product Platform": "#EC4899" };

  return (
    <div>
      {/* Leverage Points */}
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".16em", color: C.blue, textTransform: "uppercase", marginBottom: 14 }}>Top 3 Leverage Points (LeveragePointFinder)</div>
      {leverage.map((lp) => (
        <Card key={lp.rank} style={{ borderLeft: `3px solid ${C.amber}`, marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.amber, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: C.dark, flexShrink: 0 }}>{lp.rank}</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.white, marginBottom: 4 }}>{lp.name}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={{ background: `${C.amber}22`, color: C.amber, border: `1px solid ${C.amber}44`, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, letterSpacing: ".06em" }}>{lp.mechanism}</span>
                <span style={{ background: `${C.muted}22`, color: C.muted, border: `1px solid ${C.muted}44`, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, fontFamily: "monospace" }}>{lp.effort}</span>
                <span style={{ background: `${C.green}22`, color: C.green, border: `1px solid ${C.green}44`, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, fontFamily: "monospace" }}>{lp.ratio} leverage</span>
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div style={{ background: `${C.green}12`, border: `1px solid ${C.green}22`, borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ fontSize: 9, color: C.green, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 4 }}>Small Effort</div>
              <div style={{ fontSize: 12, color: C.silver }}>{lp.small}</div>
            </div>
            <div style={{ background: `${C.amber}12`, border: `1px solid ${C.amber}22`, borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ fontSize: 9, color: C.amber, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 4 }}>Big Result</div>
              <div style={{ fontSize: 12, color: C.silver }}>{lp.big}</div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 12, color: C.white }}>→ {lp.impact}</div>
            <div style={{ fontSize: 11, color: C.green, fontFamily: "monospace" }}>{lp.file}</div>
          </div>
        </Card>
      ))}

      {/* Opportunities */}
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".16em", color: C.blue, textTransform: "uppercase", marginBottom: 14, marginTop: 24 }}>Opportunity Map (OpportunityMapper)</div>
      {opportunities.map((opp) => (
        <Card key={opp.name} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.white, marginBottom: 6 }}>{opp.name}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span style={{ background: `${PCOLORS[opp.priority]}22`, color: PCOLORS[opp.priority], border: `1px solid ${PCOLORS[opp.priority]}44`, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4 }}>{opp.priority}</span>
                <span style={{ background: `${TCOLORS[opp.type] || C.blue}22`, color: TCOLORS[opp.type] || C.blue, border: `1px solid ${(TCOLORS[opp.type] || C.blue)}44`, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4 }}>{opp.type}</span>
                <span style={{ background: `${C.muted}22`, color: C.muted, border: `1px solid ${C.muted}44`, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, fontFamily: "monospace" }}>{opp.timeline}</span>
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.green, fontFamily: "monospace" }}>{opp.revenue}</div>
              <div style={{ fontSize: 10, color: C.muted }}>{opp.effort}</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: C.silver, lineHeight: 1.6, marginBottom: 8 }}>{opp.desc}</div>
          <div style={{ fontSize: 12, color: C.amber }}>⚡ {opp.win}</div>
        </Card>
      ))}
    </div>
  );
}

// ─── TABS ─────────────────────────────────────────────────
const TABS = [
  { id: "social",  label: "📸 Social Content",   component: SocialTool },
  { id: "quote",   label: "📋 Quote Estimator",   component: QuoteTool },
  { id: "email",   label: "✉️ Email Writer",       component: EmailTool },
  { id: "report",  label: "📊 Monthly Report",     component: ReportTool },
  { id: "opps",    label: "🗺️ Opportunities",      component: OpportunityMap },
];

// ─── APP ──────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("social");
  const Active = TABS.find(t => t.id === tab)?.component || (() => null);

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'Inter',sans-serif", color: C.white }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input, textarea, select { color: #fff; }
        input:focus, textarea:focus, select:focus { outline: none; border-color: ${C.blue} !important; box-shadow: 0 0 0 3px ${C.blue}22; }
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: ${C.dark}; } ::-webkit-scrollbar-thumb { background: ${C.blue}66; border-radius: 3px; }
      `}</style>

      {/* Header */}
      <div style={{ background: C.navyLight, borderBottom: `1px solid ${C.blue}33`, padding: "14px 20px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 9, color: C.blue, fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", marginBottom: 2 }}>Aurora AI Agency · YMI Roofing</div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 17, fontWeight: 800, letterSpacing: "-.02em" }}>AI Tools Suite</div>
          </div>
          <div style={{ fontSize: 10, color: C.muted, textAlign: "right" }}>
            <div>Claude Sonnet · Live API</div>
            <div style={{ color: C.green, marginTop: 2 }}>● Active</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: C.navyLight, borderBottom: `1px solid ${C.blue}22`, padding: "0 20px", display: "flex", gap: 0, overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: "none", border: "none", padding: "10px 16px", cursor: "pointer",
            fontSize: 12, fontWeight: 600, color: tab === t.id ? C.bright : C.muted,
            borderBottom: tab === t.id ? `2px solid ${C.bright}` : "2px solid transparent",
            whiteSpace: "nowrap", fontFamily: "inherit",
          }}>{t.label}</button>
        ))}
      </div>

      {/* Body */}
      <div style={{ padding: 20, maxWidth: 860, margin: "0 auto" }}>
        <Active />
      </div>
    </div>
  );
}

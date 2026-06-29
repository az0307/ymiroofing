import { useState } from "react";

const AMBER = "#F59E0B";
const AMBER_DIM = "#92400E";
const BG = "#0A0F1E";
const SURFACE = "#111827";
const SURFACE2 = "#1F2937";
const BORDER = "#1F2937";
const TEXT = "#F9FAFB";
const MUTED = "#6B7280";
const GREEN = "#10B981";
const RED = "#EF4444";
const BLUE = "#3B82F6";

// ── CURATOR METADATA ──────────────────────────────────────
const CURATOR = {
  workflow_id: "wf_aurora_roofing_001",
  client: "Roofing Tiler Co.",
  agency: "Aurora AI Agency",
  playbook: [
    { step: 1, skill: "OpportunityMapper", status: "complete" },
    { step: 2, skill: "LeveragePointFinder", status: "complete" },
    { step: 3, skill: "ActionPlanGenerator", status: "complete" },
    { step: 4, skill: "RooferClawAnalysis", status: "complete" },
  ],
};

// ── OPPORTUNITY MAP DATA ───────────────────────────────────
const OPPS = [
  {
    id: 1,
    name: "Digital Foundation",
    type: "Technology",
    oneliner: "Wix site + Google Business Profile + Facebook — go from invisible to findable",
    deliver: 10,
    strategic: 8,
    market: 8,
    priority: "HIGH",
    stack: ["Wix", "GBP", "Meta Business"],
    effort: "8–12 hrs",
    revenue: "One-time $800–1,200 + $199/mo",
    whyNow: "No digital presence = invisible to 85% of searchers. Starting point for everything else.",
    what: [
      "5–7 page Wix site (Home, Services, Gallery, Areas, Contact, Quote)",
      "Google Business Profile — categories, photos, Q&A, service areas",
      "Facebook Business Page — CTA button, services, website link",
      "Click-to-call on mobile, embedded map, review widget",
    ],
  },
  {
    id: 2,
    name: "Instant Lead Response",
    type: "Technology",
    oneliner: "Auto-SMS owner the second a form lands. Auto-reply to enquirer. Never miss a lead.",
    deliver: 9,
    strategic: 10,
    market: 9,
    priority: "HIGH",
    stack: ["n8n", "Twilio", "Webhook"],
    effort: "3–5 hrs",
    revenue: "Bundled into Ignite retainer",
    whyNow: "Roofers are on a roof. They miss calls constantly. First caller back wins the job.",
    what: [
      "Form submit → instant SMS to owner with lead name, number, job type",
      "Auto-reply SMS/email to enquirer: 'We'll call within the hour'",
      "Missed-call text-back via Twilio webhook",
      "n8n flow with error retry + daily missed-lead digest",
    ],
  },
  {
    id: 3,
    name: "Google Review Machine",
    type: "Technology",
    oneliner: "Owner marks job done → 24hr SMS to customer → Google review link — automated.",
    deliver: 9,
    strategic: 10,
    market: 10,
    priority: "HIGH",
    stack: ["n8n", "Twilio", "Google API"],
    effort: "4–6 hrs",
    revenue: "Bundled into Ignite retainer",
    whyNow: "Roofing is a trust purchase. 5-star reviews are the #1 conversion driver. Most tilers have 3–8 reviews.",
    what: [
      "Trigger: owner sends SMS keyword 'done [customer name]' or form tick",
      "24hr delay → SMS to customer with direct Google review link",
      "3-day follow-up if no review (softer second ask)",
      "Weekly digest email to owner: new reviews summary",
    ],
  },
  {
    id: 4,
    name: "AI Lead Qualification Chatbot",
    type: "Product",
    oneliner: "ManyChat bot on FB/IG — qualifies leads 24/7, captures details, notifies owner.",
    deliver: 9,
    strategic: 8,
    market: 8,
    priority: "HIGH",
    stack: ["ManyChat", "Claude API", "Meta"],
    effort: "6–8 hrs",
    revenue: "Bundled into Ignite retainer",
    whyNow: "Instagram enquiries get zero response from most tilers. First to reply wins.",
    what: [
      "DM greeting → 4 qualifying questions (suburb, tile type, scope, timeline)",
      "Captures: name, phone, email, job description",
      "FAQ flows: pricing range, service area, tile types, warranty",
      "Lead summary SMS to owner with all captured details",
    ],
  },
  {
    id: 5,
    name: "Social Content Engine",
    type: "Product",
    oneliner: "Claude API generates captions from job notes the owner texts in. Post. Done.",
    deliver: 8,
    strategic: 7,
    market: 7,
    priority: "MED",
    stack: ["Claude API", "n8n", "Meta API"],
    effort: "5–8 hrs setup",
    revenue: "Included in Blaze or $150/mo add-on",
    whyNow: "Before/after shots are gold for roofing. Most tilers have the photos, zero captions.",
    what: [
      "Simple tool: owner types job details → Claude generates 3 caption options",
      "Monthly content calendar template (AI-drafted, owner approves in 20 min)",
      "Hashtag bank + posting schedule",
      "Optional: n8n auto-post approved content to FB/IG on schedule",
    ],
  },
  {
    id: 6,
    name: "AI Quote Estimator",
    type: "Product",
    oneliner: "Owner inputs job details → Claude drafts a structured quote → PDF ready to send.",
    deliver: 7,
    strategic: 8,
    market: 8,
    priority: "MED",
    stack: ["Claude API", "Wix embed", "PDF gen"],
    effort: "8–12 hrs",
    revenue: "Included in Blaze",
    whyNow: "Quoting is the biggest time sink for sole-trader tilers. Each quote takes 30–45 min.",
    what: [
      "Web tool: input size (m²), tile type, suburb, access difficulty, extras",
      "Claude API → structured quote draft with line items",
      "Owner reviews + tweaks → PDF download with branding",
      "Not a full estimating platform — a 20-min starting point",
    ],
  },
  {
    id: 7,
    name: "Jobber CRM Setup",
    type: "Partnership",
    oneliner: "Set up Jobber for scheduling, quotes, invoicing. Train the owner. Earn referral.",
    deliver: 9,
    strategic: 7,
    market: 7,
    priority: "MED",
    stack: ["Jobber", "Consulting"],
    effort: "4–6 hrs",
    revenue: "Setup fee $300–500 + Jobber affiliate",
    whyNow: "Sole-trader tilers track everything in their head or a notebook. One CRM solves scheduling, invoicing, client history.",
    what: [
      "Jobber account setup and configuration",
      "Import existing contacts/job history",
      "Configure job stages, quote templates, invoice branding",
      "1-hr walkthrough session + written SOP doc",
    ],
  },
  {
    id: 8,
    name: "Maintenance Reminder System",
    type: "Technology",
    oneliner: "Annual SMS to past clients: 'Your roof is due for inspection' — recurring revenue trigger.",
    deliver: 8,
    strategic: 9,
    market: 7,
    priority: "MED",
    stack: ["n8n", "Twilio", "Airtable"],
    effort: "4–5 hrs",
    revenue: "Bundled into Blaze or $99/mo add-on",
    whyNow: "Recurring maintenance is untapped revenue. Most tilers never follow up past clients.",
    what: [
      "Airtable: past client list with job date and tile type",
      "n8n annual trigger: SMS reminder 12 months after job",
      "Seasonal triggers: post-storm alert to past clients in affected suburb",
      "Upsell script: 're-bed and point' inspection offer",
    ],
  },
];

// ── LEVERAGE POINTS ────────────────────────────────────────
const LEVERAGES = [
  {
    rank: 1,
    name: "Google Business Profile + Review Machine",
    mechanism: "Compounding Return",
    effort: "~6 hrs total",
    ratio: "25:1",
    smallEffort: "GBP setup takes 2 hrs. Review machine takes 4 hrs to build in n8n.",
    bigResult: "Each new 5-star review compounds GBP ranking → more organic calls → more jobs. Self-reinforcing loop.",
    primary: "20–40% more inbound calls within 90 days as reviews accumulate",
    secondary: ["Higher GBP rank = free leads forever", "Social proof converts price-shoppers", "Outranks competitors with 3–8 reviews"],
    timeline: "Results start Week 3, compound monthly",
    execute: [
      "Build and verify GBP profile — all fields, photos, services, suburb areas",
      "Wire n8n: 'job done' trigger → 24hr Twilio SMS → Google review link",
      "Set 3-day follow-up for non-responders",
      "Coach owner: text 'done [name]' after every job",
    ],
    risk: "Owner forgets to trigger → build dead-simple SMS keyword workflow so it's one tap",
  },
  {
    rank: 2,
    name: "Instant Lead Response System",
    mechanism: "Bottleneck Removal",
    effort: "~3 hrs",
    ratio: "20:1",
    smallEffort: "3 hours to wire n8n + Twilio + form webhook. Runs forever with zero maintenance.",
    bigResult: "Roofers physically can't answer calls on the roof. First business to call back within 5 min wins. This makes them that business.",
    primary: "Capture 30–50% more inbound leads that would otherwise go cold",
    secondary: ["Auto-reply buys time + sets professional expectation", "Owner gets structured lead info, not a missed call", "Works 24/7 including weekends"],
    timeline: "Live within Week 2. Results from day one.",
    execute: [
      "Set up Twilio number (or wire to existing mobile via forwarding)",
      "Build n8n webhook: form submit → format lead → SMS to owner",
      "Build auto-reply: SMS + email to enquirer within 60 sec",
      "Test: submit 3 test forms, confirm owner receives in <30 sec",
    ],
    risk: "Twilio cost — minimal (~$0.02/SMS), owner pays or Aurora absorbs in retainer",
  },
  {
    rank: 3,
    name: "ManyChat Chatbot on Instagram",
    mechanism: "Force Multiplier",
    effort: "~6–8 hrs",
    ratio: "15:1",
    smallEffort: "Build once using proven Evermystic template. Roofing FAQs simpler than DTF printing.",
    bigResult: "Qualifies and captures leads 24/7 without owner involvement. One build serves all future DMs.",
    primary: "100% of IG DM enquiries get an instant response and are qualified automatically",
    secondary: ["Owner gets structured lead summary, not a half-conversation to decode", "FAQ deflection saves 10–15 phone calls/week", "Builds IG page credibility"],
    timeline: "Live Week 3. Leads from day one on Instagram.",
    execute: [
      "Clone Evermystic ManyChat structure, adapt FAQ bank for roofing",
      "Build 4 qualifying questions: suburb, tile type, job scope, timeline",
      "Set owner notification: SMS with full lead summary",
      "Install keyword triggers: 'quote', 'price', 'cost', 'tiling'",
    ],
    risk: "Meta API changes — ManyChat handles this. Low risk.",
  },
];

// ── ACTION PLAN ────────────────────────────────────────────
const STEPS = [
  {
    step: 1,
    name: "Discovery & Asset Collection",
    phase: "Quick Win",
    timeline: "Day 1–3",
    owner: "Az + Client",
    actions: [
      "Send client onboarding form: service areas, tile types, 10 FAQ answers, 15–20 job photos",
      "Confirm Wix or domain preference",
      "Get Google account access for GBP",
      "Get Facebook login or Business Manager access",
      "Confirm Twilio number setup (or forward to mobile)",
    ],
    success: "All assets received. Login access confirmed. Kickoff call done.",
    deps: "None — can start immediately",
    resources: "Onboarding form template (30 min to build)",
  },
  {
    step: 2,
    name: "Digital Foundation Live",
    phase: "Foundation",
    timeline: "Day 4–10",
    owner: "Az",
    actions: [
      "Build Wix site: Home, Services, Gallery, Areas, Contact, Quote form",
      "Configure GBP: all categories, photos, service areas, Q&A, hours",
      "Set up Facebook Business Page with CTA, services, linked site",
      "Basic on-page SEO: meta titles, descriptions, alt tags",
    ],
    success: "Site indexed by Google. GBP verified. Click-to-call working on mobile.",
    deps: "Step 1 assets received",
    resources: "Wix subscription (~$30 AUD/mo billed to client)",
  },
  {
    step: 3,
    name: "Lead Response + Review Machine",
    phase: "Automation",
    timeline: "Week 2",
    owner: "Az",
    actions: [
      "Wire n8n: contact form webhook → format → Twilio SMS to owner",
      "Build auto-reply: SMS + email to enquirer within 60 sec",
      "Build review sequence: 'done [name]' keyword → 24hr SMS → Google link → 3-day follow-up",
      "Test all flows end-to-end (3 test submissions)",
      "Train owner: show them the one-tap 'done' trigger",
    ],
    success: "Test form → owner SMS in <30 sec. First real review within 2 weeks.",
    deps: "Twilio account live, GBP verified",
    resources: "n8n instance (existing), Twilio (~$5/mo)",
  },
  {
    step: 4,
    name: "ManyChat Chatbot",
    phase: "AI Automation",
    timeline: "Week 3",
    owner: "Az",
    actions: [
      "Clone Evermystic ManyChat base, rename for roofing client",
      "Build 10–12 FAQ flows from client's answers",
      "Build qualifying flow: suburb → tile type → scope → timeline → capture",
      "Set keyword triggers: quote, price, cost, tiles, repair, inspect",
      "Connect lead summary → Twilio SMS to owner",
    ],
    success: "First chatbot-captured lead within 5 days of go-live.",
    deps: "Client Facebook/IG page ready",
    resources: "ManyChat Pro (~$15 USD/mo billed to client)",
  },
  {
    step: 5,
    name: "Content Engine + CRM + Quote Tool",
    phase: "Growth Layer",
    timeline: "Month 2",
    owner: "Az",
    actions: [
      "Build Claude API caption generator: job details → 3 caption options",
      "Draft Month 1 content calendar (8 posts, AI-generated, client approves)",
      "Set up Jobber: contacts, job stages, quote template, invoice branding",
      "Build quote estimator tool (Claude API web embed on Wix)",
      "Optional: n8n auto-post approved content on schedule",
    ],
    success: "8 posts live in Month 1. Owner using Jobber for at least 2 jobs. Quote tool tested on 1 real job.",
    deps: "Steps 1–4 stable",
    resources: "Jobber Core (~$60 AUD/mo), Claude API (~$5/mo)",
  },
];

// ── ROOFER CLAW ANALYSIS ───────────────────────────────────
const CLAW = {
  verdict: "Don't build for Client 1. Use Jobber + Aurora automations.",
  productPlay: "Real play once 3+ roofing clients signed. White-label 'Aurora Roofer Stack'.",
  comparison: [
    { feature: "Lead capture & chatbot", rooferClaw: true, auroraStack: true },
    { feature: "Instant lead response", rooferClaw: true, auroraStack: true },
    { feature: "Review automation", rooferClaw: true, auroraStack: true },
    { feature: "AI quote estimator", rooferClaw: true, auroraStack: true },
    { feature: "Job scheduling & CRM", rooferClaw: true, auroraStack: "Jobber" },
    { feature: "Insurance/storm claims", rooferClaw: true, auroraStack: false },
    { feature: "Aerial measurement", rooferClaw: true, auroraStack: false },
    { feature: "Invoice & payments", rooferClaw: true, auroraStack: "Jobber" },
    { feature: "White-label resellable", rooferClaw: false, auroraStack: true },
    { feature: "AU trade market fit", rooferClaw: "US-first", auroraStack: true },
  ],
  timeline: "Build Aurora Roofer Stack at Month 4–6 if 2+ more roofing clients signed.",
  whitespace: "RooferClaw + RoofClaw both skew heavily US storm restoration / insurance. AU tiling market is underserved.",
};

// ── TIER PRICING ───────────────────────────────────────────
const TIERS = [
  {
    name: "Spark",
    price: "$800 setup + $199/mo",
    includes: ["Wix website", "Google Business Profile", "Facebook Page", "Basic SEO"],
    notIncluded: ["Automations", "Chatbot", "Review machine"],
  },
  {
    name: "Ignite",
    price: "$300–400/mo retainer",
    includes: ["Everything in Spark", "Lead response system", "Review machine", "ManyChat chatbot"],
    notIncluded: ["Content engine", "Quote tool", "Jobber setup"],
  },
  {
    name: "Blaze",
    price: "$650–800/mo retainer",
    includes: ["Everything in Ignite", "Social content engine", "AI quote estimator", "Jobber setup", "Monthly AI training"],
    notIncluded: [],
  },
];

// ── COMPONENTS ─────────────────────────────────────────────
const Score = ({ val, max = 10 }) => {
  const pct = (val / max) * 100;
  const color = pct >= 80 ? GREEN : pct >= 60 ? AMBER : RED;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ flex: 1, height: 4, background: SURFACE2, borderRadius: 2 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.5s" }} />
      </div>
      <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color, minWidth: 24 }}>{val}</span>
    </div>
  );
};

const Tag = ({ label, color = AMBER }) => (
  <span style={{
    display: "inline-block", padding: "2px 8px", borderRadius: 4,
    fontSize: 10, fontWeight: 700, letterSpacing: "0.05em",
    background: `${color}22`, color, border: `1px solid ${color}44`,
    fontFamily: "'JetBrains Mono',monospace",
  }}>{label}</span>
);

const Section = ({ title, children, accent = AMBER }) => (
  <div style={{ marginBottom: 28 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <div style={{ width: 3, height: 18, background: accent, borderRadius: 2, flexShrink: 0 }} />
      <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: accent, fontFamily: "'Syne',sans-serif" }}>{title}</h3>
    </div>
    {children}
  </div>
);

const Card = ({ children, style = {} }) => (
  <div style={{
    background: SURFACE, border: `1px solid ${BORDER}`,
    borderRadius: 8, padding: "16px 18px", marginBottom: 10, ...style
  }}>{children}</div>
);

// ── TABS ───────────────────────────────────────────────────
const TABS = [
  { id: "curator", label: "Curator" },
  { id: "opps", label: "Opportunity Map" },
  { id: "leverage", label: "Leverage Points" },
  { id: "plan", label: "Action Plan" },
  { id: "tiers", label: "Tiers & Pricing" },
  { id: "claw", label: "RooferClaw" },
];

// ── VIEWS ──────────────────────────────────────────────────
function CuratorView() {
  return (
    <div>
      <Section title="Workflow">
        <Card>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {CURATOR.playbook.map(s => (
              <div key={s.step} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: `${GREEN}22`, border: `1px solid ${GREEN}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: GREEN, fontFamily: "'JetBrains Mono',monospace", flexShrink: 0 }}>{s.step}</div>
                <div>
                  <div style={{ fontSize: 12, color: TEXT, fontWeight: 600 }}>{s.skill}</div>
                  <div style={{ fontSize: 10, color: GREEN }}>{s.status}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </Section>
      <Section title="Context">
        <Card>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              ["Agency", CURATOR.agency],
              ["Client Type", CURATOR.client],
              ["Stack", "n8n · Twilio · ManyChat · Claude API · Wix · Jobber"],
              ["Constraint", "Solo operator, 90-min blocks, carer responsibilities"],
              ["Operator", "Az Baker — AutoBoros / Aurora AI"],
              ["Confidence", "Deliver 7–10/10 across all services"],
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{k}</div>
                <div style={{ fontSize: 12, color: TEXT }}>{v}</div>
              </div>
            ))}
          </div>
        </Card>
      </Section>
      <Section title="Decision: What We're NOT Building">
        <Card style={{ borderColor: `${RED}33` }}>
          {[
            "❌ Custom CRM from scratch — Jobber does it already",
            "❌ Insurance/storm claims module — US niche, not AU tiling",
            "❌ Aerial measurement — irrelevant to tiler",
            "❌ RooferClaw clone for one client — product-company build, not agency work",
          ].map(item => (
            <div key={item} style={{ fontSize: 12, color: MUTED, padding: "4px 0", borderBottom: `1px solid ${BORDER}` }}>{item}</div>
          ))}
          <div style={{ fontSize: 12, color: GREEN, paddingTop: 8 }}>✓ Aurora Roofer Stack = Month 4–6 product play if 3+ roofing clients sign</div>
        </Card>
      </Section>
    </div>
  );
}

function OppsView() {
  const [active, setActive] = useState(0);
  const opp = OPPS[active];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 14 }}>
      <div>
        {OPPS.map((o, i) => (
          <div key={o.id} onClick={() => setActive(i)} style={{
            padding: "10px 12px", borderRadius: 6, marginBottom: 4, cursor: "pointer",
            background: i === active ? `${AMBER}15` : SURFACE,
            border: `1px solid ${i === active ? AMBER : BORDER}`,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: i === active ? AMBER : TEXT, marginBottom: 2 }}>{o.name}</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              <Tag label={o.priority} color={o.priority === "HIGH" ? GREEN : AMBER} />
              <Tag label={`${o.effort}`} color={MUTED} />
            </div>
          </div>
        ))}
      </div>
      <div>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <h2 style={{ margin: "0 0 4px", fontSize: 18, color: TEXT, fontFamily: "'Syne',sans-serif" }}>{opp.name}</h2>
              <p style={{ margin: 0, fontSize: 13, color: MUTED }}>{opp.oneliner}</p>
            </div>
            <Tag label={opp.type} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
            {[["Deliverability", opp.deliver], ["Strategic Fit", opp.strategic], ["Market Need", opp.market]].map(([label, val]) => (
              <div key={label} style={{ background: SURFACE2, borderRadius: 6, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, color: MUTED, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
                <Score val={val} />
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div style={{ background: SURFACE2, borderRadius: 6, padding: "10px 12px" }}>
              <div style={{ fontSize: 10, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Stack</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {opp.stack.map(s => <Tag key={s} label={s} color={BLUE} />)}
              </div>
            </div>
            <div style={{ background: SURFACE2, borderRadius: 6, padding: "10px 12px" }}>
              <div style={{ fontSize: 10, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Revenue</div>
              <div style={{ fontSize: 12, color: AMBER, fontWeight: 700 }}>{opp.revenue}</div>
            </div>
          </div>
          <div style={{ background: `${AMBER}10`, borderRadius: 6, padding: "10px 12px", marginBottom: 14, border: `1px solid ${AMBER}22` }}>
            <div style={{ fontSize: 10, color: AMBER, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Why Now</div>
            <div style={{ fontSize: 12, color: TEXT }}>{opp.whyNow}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>What We Build</div>
            {opp.what.map(item => (
              <div key={item} style={{ display: "flex", gap: 8, padding: "5px 0", borderBottom: `1px solid ${BORDER}` }}>
                <span style={{ color: GREEN, fontSize: 12, flexShrink: 0 }}>→</span>
                <span style={{ fontSize: 12, color: TEXT }}>{item}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function LeverageView() {
  return (
    <div>
      {LEVERAGES.map((lp, i) => (
        <Card key={i} style={{ borderLeft: `3px solid ${AMBER}`, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: AMBER, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: BG }}>{lp.rank}</div>
                <h3 style={{ margin: 0, fontSize: 15, color: TEXT, fontFamily: "'Syne',sans-serif" }}>{lp.name}</h3>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <Tag label={lp.mechanism} color={BLUE} />
                <Tag label={lp.effort} color={GREEN} />
                <Tag label={`${lp.ratio} leverage`} color={AMBER} />
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div style={{ background: SURFACE2, borderRadius: 6, padding: "10px 12px" }}>
              <div style={{ fontSize: 10, color: GREEN, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Small Effort</div>
              <div style={{ fontSize: 12, color: TEXT }}>{lp.smallEffort}</div>
            </div>
            <div style={{ background: SURFACE2, borderRadius: 6, padding: "10px 12px" }}>
              <div style={{ fontSize: 10, color: AMBER, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Big Result</div>
              <div style={{ fontSize: 12, color: TEXT }}>{lp.bigResult}</div>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Expected Impact</div>
            <div style={{ fontSize: 12, color: TEXT, fontWeight: 700, marginBottom: 4 }}>→ {lp.primary}</div>
            {lp.secondary.map(s => (
              <div key={s} style={{ fontSize: 12, color: MUTED, padding: "2px 0 2px 12px" }}>· {s}</div>
            ))}
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>How to Execute</div>
            {lp.execute.map((e, idx) => (
              <div key={idx} style={{ display: "flex", gap: 8, padding: "4px 0", borderBottom: `1px solid ${BORDER}` }}>
                <span style={{ color: AMBER, fontSize: 11, fontFamily: "'JetBrains Mono',monospace", minWidth: 16 }}>{idx + 1}.</span>
                <span style={{ fontSize: 12, color: TEXT }}>{e}</span>
              </div>
            ))}
          </div>
          <div style={{ background: `${RED}10`, borderRadius: 6, padding: "8px 12px", border: `1px solid ${RED}22` }}>
            <span style={{ fontSize: 10, color: RED, textTransform: "uppercase", letterSpacing: "0.06em" }}>Risk: </span>
            <span style={{ fontSize: 12, color: MUTED }}>{lp.risk}</span>
          </div>
        </Card>
      ))}
      <Card style={{ background: `${GREEN}10`, border: `1px solid ${GREEN}33` }}>
        <div style={{ fontSize: 12, color: GREEN, fontWeight: 700, marginBottom: 4 }}>Combined Impact if All 3 Executed</div>
        <div style={{ fontSize: 12, color: TEXT }}>Client goes from invisible → discoverable → instantly responsive → self-filling review funnel. This is the foundation that makes everything else (content, quote tool, CRM) actually worth building on top of.</div>
        <div style={{ marginTop: 8, fontSize: 12, color: MUTED }}>Recommended sequence: GBP + Review Machine first (compounding) → Lead Response (immediate) → Chatbot (sustained 24/7 capture)</div>
      </Card>
    </div>
  );
}

function PlanView() {
  const [open, setOpen] = useState(0);
  return (
    <div>
      <Card style={{ background: `${AMBER}10`, border: `1px solid ${AMBER}33`, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          {[
            ["Total Horizon", "8 weeks to full stack"],
            ["Quick Win", "Day 10 — site + GBP live"],
            ["First Lead", "Week 2 — automation live"],
          ].map(([k, v]) => (
            <div key={k}>
              <div style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em" }}>{k}</div>
              <div style={{ fontSize: 13, color: AMBER, fontWeight: 700, marginTop: 2 }}>{v}</div>
            </div>
          ))}
        </div>
      </Card>
      {STEPS.map((s, i) => (
        <div key={s.step} style={{ marginBottom: 8 }}>
          <div onClick={() => setOpen(open === i ? -1 : i)} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: SURFACE, border: `1px solid ${open === i ? AMBER : BORDER}`,
            borderRadius: open === i ? "8px 8px 0 0" : 8, padding: "12px 16px", cursor: "pointer",
          }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: `${AMBER}22`, border: `1px solid ${AMBER}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: AMBER, fontFamily: "'JetBrains Mono',monospace", flexShrink: 0 }}>{s.step}</div>
              <div>
                <div style={{ fontSize: 13, color: TEXT, fontWeight: 700 }}>{s.name}</div>
                <div style={{ fontSize: 11, color: MUTED }}>{s.timeline}</div>
              </div>
            </div>
            <Tag label={s.phase} color={s.phase === "Quick Win" ? GREEN : s.phase === "Foundation" ? BLUE : AMBER} />
          </div>
          {open === i && (
            <div style={{ background: SURFACE, border: `1px solid ${AMBER}`, borderTop: "none", borderRadius: "0 0 8px 8px", padding: "14px 16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                {[["Owner", s.owner], ["Dependencies", s.deps], ["Resources", s.resources], ["Success Criteria", s.success]].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{k}</div>
                    <div style={{ fontSize: 12, color: TEXT }}>{v}</div>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Actions</div>
                {s.actions.map((a, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 8, padding: "4px 0", borderBottom: `1px solid ${BORDER}` }}>
                    <span style={{ color: AMBER, fontSize: 11, fontFamily: "'JetBrains Mono',monospace", minWidth: 16 }}>{idx + 1}.</span>
                    <span style={{ fontSize: 12, color: TEXT }}>{a}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function TiersView() {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
        {TIERS.map((t, i) => (
          <Card key={t.name} style={{ border: `1px solid ${i === 1 ? AMBER : BORDER}`, position: "relative" }}>
            {i === 1 && <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: AMBER, color: BG, fontSize: 9, fontWeight: 900, padding: "2px 8px", borderRadius: 10, letterSpacing: "0.1em" }}>RECOMMENDED</div>}
            <h3 style={{ margin: "0 0 4px", fontSize: 16, color: i === 1 ? AMBER : TEXT, fontFamily: "'Syne',sans-serif" }}>{t.name}</h3>
            <div style={{ fontSize: 13, color: AMBER, fontWeight: 700, marginBottom: 12 }}>{t.price}</div>
            {t.includes.map(item => (
              <div key={item} style={{ display: "flex", gap: 6, padding: "3px 0", fontSize: 11, color: TEXT }}>
                <span style={{ color: GREEN }}>✓</span> {item}
              </div>
            ))}
            {t.notIncluded.map(item => (
              <div key={item} style={{ display: "flex", gap: 6, padding: "3px 0", fontSize: 11, color: MUTED }}>
                <span style={{ color: MUTED }}>–</span> {item}
              </div>
            ))}
          </Card>
        ))}
      </div>
      <Card>
        <div style={{ fontSize: 12, color: AMBER, fontWeight: 700, marginBottom: 6 }}>Pitch Hook (Lead with this)</div>
        <div style={{ fontSize: 13, color: TEXT, lineHeight: 1.6 }}>
          "78% of customers book the first business that calls them back — regardless of price. Right now, your competitors are losing those leads too. We can make you the business that always responds first, automatically, even when you're on the roof. Your Google reviews then do the rest of the selling. That's the core of what we build."
        </div>
      </Card>
      <Card style={{ marginTop: 10 }}>
        <div style={{ fontSize: 12, color: MUTED, fontWeight: 700, marginBottom: 8 }}>Upsell Path</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Tag label="Spark" color={BLUE} />
          <span style={{ color: MUTED, fontSize: 12 }}>→ prove results in 30 days →</span>
          <Tag label="Ignite" color={AMBER} />
          <span style={{ color: MUTED, fontSize: 12 }}>→ 60 days of reviews + leads →</span>
          <Tag label="Blaze" color={GREEN} />
        </div>
        <div style={{ fontSize: 11, color: MUTED, marginTop: 8 }}>Start Spark. Let results do the upselling. Don't pitch Blaze cold — they don't trust the value yet.</div>
      </Card>
    </div>
  );
}

function ClawView() {
  return (
    <div>
      <Card style={{ borderLeft: `3px solid ${RED}`, marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: RED, fontWeight: 700, marginBottom: 4 }}>Client 1 Verdict</div>
        <div style={{ fontSize: 13, color: TEXT }}>{CLAW.verdict}</div>
      </Card>
      <Card style={{ borderLeft: `3px solid ${GREEN}`, marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: GREEN, fontWeight: 700, marginBottom: 4 }}>Future Product Play</div>
        <div style={{ fontSize: 13, color: TEXT, marginBottom: 6 }}>{CLAW.productPlay}</div>
        <div style={{ fontSize: 12, color: MUTED }}>{CLAW.timeline}</div>
        <div style={{ marginTop: 8, background: `${GREEN}10`, borderRadius: 6, padding: "8px 12px", border: `1px solid ${GREEN}22` }}>
          <div style={{ fontSize: 11, color: GREEN, marginBottom: 2 }}>White Space Opportunity</div>
          <div style={{ fontSize: 12, color: TEXT }}>{CLAW.whitespace}</div>
        </div>
      </Card>
      <Card>
        <div style={{ fontSize: 12, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Feature Comparison</div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 0 }}>
          {["Feature", "RooferClaw", "Aurora Stack"].map(h => (
            <div key={h} style={{ padding: "6px 8px", fontSize: 10, color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${BORDER}` }}>{h}</div>
          ))}
          {CLAW.comparison.map(row => (
            [
              <div key={`f-${row.feature}`} style={{ padding: "7px 8px", fontSize: 12, color: TEXT, borderBottom: `1px solid ${BORDER}` }}>{row.feature}</div>,
              <div key={`rc-${row.feature}`} style={{ padding: "7px 8px", fontSize: 12, borderBottom: `1px solid ${BORDER}`, color: row.rooferClaw === true ? GREEN : typeof row.rooferClaw === "string" ? AMBER : RED }}>
                {row.rooferClaw === true ? "✓" : row.rooferClaw === false ? "✗" : row.rooferClaw}
              </div>,
              <div key={`as-${row.feature}`} style={{ padding: "7px 8px", fontSize: 12, borderBottom: `1px solid ${BORDER}`, color: row.auroraStack === true ? GREEN : row.auroraStack === false ? RED : AMBER }}>
                {row.auroraStack === true ? "✓" : row.auroraStack === false ? "✗" : row.auroraStack}
              </div>,
            ]
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── APP ────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("curator");

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "'Inter',sans-serif", color: TEXT }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=JetBrains+Mono:wght@400;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, padding: "14px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: AMBER, fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.12em", textTransform: "uppercase" }}>Aurora AI Agency</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: TEXT, fontFamily: "'Syne',sans-serif", letterSpacing: "-0.02em" }}>Roofing Tiler — Service Map</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: MUTED }}>Skills Used</div>
            <div style={{ fontSize: 10, color: AMBER, fontFamily: "'JetBrains Mono',monospace" }}>OpportunityMapper · LeveragePointFinder · ActionPlanGenerator</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, padding: "0 20px", display: "flex", gap: 2, overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: "none", border: "none", padding: "10px 14px", cursor: "pointer",
            fontSize: 12, fontWeight: 600, color: tab === t.id ? AMBER : MUTED,
            borderBottom: tab === t.id ? `2px solid ${AMBER}` : "2px solid transparent",
            whiteSpace: "nowrap", transition: "color 0.2s",
          }}>{t.label}</button>
        ))}
      </div>

      {/* Body */}
      <div style={{ padding: "20px", maxWidth: 960, margin: "0 auto" }}>
        {tab === "curator" && <CuratorView />}
        {tab === "opps" && <OppsView />}
        {tab === "leverage" && <LeverageView />}
        {tab === "plan" && <PlanView />}
        {tab === "tiers" && <TiersView />}
        {tab === "claw" && <ClawView />}
      </div>
    </div>
  );
}

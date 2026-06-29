#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
# Aurora AI Agency — YMI Roofing
# One-shot script: create private GitHub repo + push all files
#
# REQUIREMENTS:
#   gh (GitHub CLI) — install: https://cli.github.com
#   gh auth login  — run once before this script
#
# USAGE:
#   chmod +x push-to-github.sh
#   ./push-to-github.sh
# ─────────────────────────────────────────────────────────

set -e  # exit on any error

REPO_NAME="ymiroofing"
GITHUB_USER="az0307"
REPO_FULL="${GITHUB_USER}/${REPO_NAME}"

echo "🚀 Aurora AI Agency — YMI Roofing GitHub Push"
echo "================================================"

# ── 1. Create private repo (skip if exists)
echo ""
echo "1️⃣  Creating private repo ${REPO_FULL}..."
gh repo create "${REPO_FULL}" \
  --private \
  --description "Y.M.I Roofing — Aurora AI Agency client delivery" \
  2>/dev/null || echo "   (repo may already exist — continuing)"

# ── 2. Build local directory
echo ""
echo "2️⃣  Setting up local repo..."
BUILD_DIR="/tmp/ymi-roofing-push"
rm -rf "${BUILD_DIR}" && mkdir -p "${BUILD_DIR}"
cd "${BUILD_DIR}"
git init -b main
git remote add origin "https://github.com/${REPO_FULL}.git"

# ── 3. Copy files into correct repo structure
echo ""
echo "3️⃣  Copying deliverables into repo structure..."

OUTPUT_DIR="/mnt/user-data/outputs"

# Root files (site deployment)
cp "${OUTPUT_DIR}/ymi-roofing-production/index.html" .
cp "${OUTPUT_DIR}/sitemap.xml" .
cp "${OUTPUT_DIR}/robots.txt" .
cp "${OUTPUT_DIR}/404.html" .
cp "/home/claude/ymi-delivery/README.md" README.md

# GitHub Actions
mkdir -p .github/workflows
cp "${OUTPUT_DIR}/deploy.yml" .github/workflows/deploy.yml

# React source
mkdir -p src
cp "${OUTPUT_DIR}/ymi-roofing-final.jsx" src/ymi-roofing-final.jsx

# Cloudflare Worker
mkdir -p worker
cp "${OUTPUT_DIR}/cf-worker-proxy.js" worker/cf-worker-proxy.js
cp "${OUTPUT_DIR}/wrangler.toml" worker/wrangler.toml

# n8n workflows
mkdir -p n8n-workflows
cp "${OUTPUT_DIR}/n8n-lead-capture.json"         n8n-workflows/lead-capture.json
cp "${OUTPUT_DIR}/n8n-review-machine.json"        n8n-workflows/review-machine.json
cp "${OUTPUT_DIR}/n8n-missed-call.json"           n8n-workflows/missed-call.json
cp "${OUTPUT_DIR}/n8n-maintenance-reminder.json"  n8n-workflows/maintenance-reminder.json
cp "${OUTPUT_DIR}/n8n-sms-optout.json"            n8n-workflows/sms-optout.json

# Docs
mkdir -p docs
cp "${OUTPUT_DIR}/MASTER-DELIVERY.md" docs/MASTER-DELIVERY.md
cp "${OUTPUT_DIR}/manychat-spec.md"   docs/manychat-spec.md
cp "${OUTPUT_DIR}/GAP-ANALYSIS.md"    docs/GAP-ANALYSIS.md

# AI tools (agency reference — not deployed to site)
mkdir -p agency
cp "${OUTPUT_DIR}/ymi-ai-tools.jsx"          agency/ymi-ai-tools.jsx
cp "${OUTPUT_DIR}/aurora-ymi-dashboard.jsx"  agency/aurora-ymi-dashboard.jsx

# ── 4. Write .gitignore
cat > .gitignore << 'EOF'
node_modules/
.env
.env.*
*.log
.DS_Store
dist/
.wrangler/
EOF

# ── 5. Commit and push
echo ""
echo "4️⃣  Committing..."
git add .
git status --short

git config user.email "aurora@autoboros.ai" 2>/dev/null || true
git config user.name  "Aurora AI Agency"    2>/dev/null || true

git commit -m "feat: Aurora AI Agency — YMI Roofing full delivery

Website:
- Production index.html (Cloudflare Pages ready)
- React source with logo, SEO schema, ARIA, n8n webhook
- sitemap.xml, robots.txt, 404.html

Automation (n8n workflows — all importable JSON):
- Lead capture v2: form → sanitize → sheets → SMS ×2 + customer confirm
- Review machine v2: opt-out check → 24hr wait → SMS review → follow-up
- Missed call v2: business hours + CallSid dedup → text-back + Ben alert
- Maintenance reminder v2: annual Sept SMS to past clients (opt-out aware)
- SMS opt-out handler: STOP → blocklist + reply relay

Infrastructure:
- GitHub Actions → Cloudflare Pages auto-deploy
- Cloudflare Worker proxy (rate-limit, CORS lock, hide n8n URL)

Docs:
- MASTER-DELIVERY.md: full step-by-step deployment guide
- manychat-spec.md: 5 chatbot flows with all copy + webhook spec
- GAP-ANALYSIS.md: security audit, reflection, OKComputer synthesis

Aurora Trades Stack v1.0 — reusable for next trades client in 12-16hrs"

echo ""
echo "5️⃣  Pushing to GitHub..."
git push -u origin main --force

echo ""
echo "✅ Done! Repo live at: https://github.com/${REPO_FULL}"
echo ""
echo "📋 Next steps:"
echo "   1. Add GitHub Secrets: CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID"
echo "   2. Connect repo to Cloudflare Pages (Workers & Pages → Connect to Git)"
echo "   3. Deploy CF Worker: cd worker && wrangler deploy"
echo "   4. Import n8n-workflows/*.json into n8n, replace REPLACE_ values"

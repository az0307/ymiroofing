#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
# Aurora AI Agency — YMI Roofing
# Update files that already exist in az0307/ymiroofing
# (requires their SHA to overwrite via GitHub API)
#
# USAGE:
#   export GITHUB_PAT="ghp_your_token_here"
#   ./update-existing-files.sh
# ─────────────────────────────────────────────────────────

set -e

REPO="az0307/ymiroofing"
API="https://api.github.com/repos/${REPO}/contents"
BRANCH="main"
OUTPUT_DIR="/mnt/user-data/outputs"

if [ -z "$GITHUB_PAT" ]; then
  echo "❌ Set GITHUB_PAT first:  export GITHUB_PAT=ghp_..."
  exit 1
fi

AUTH="Authorization: token $GITHUB_PAT"

update_file() {
  local path="$1"
  local local_file="$2"
  local message="$3"

  echo ""
  echo "→ Updating: ${path}"

  # Get current SHA
  SHA=$(curl -sf -H "$AUTH" \
    "${API}/${path}?ref=${BRANCH}" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['sha'])" 2>/dev/null)

  if [ -z "$SHA" ]; then
    echo "  ⚠️  File not found in repo — creating new instead"
    SHA_PARAM=""
  else
    echo "  SHA: ${SHA:0:12}..."
    SHA_PARAM=", \"sha\": \"$SHA\""
  fi

  # Base64 encode file content
  CONTENT=$(base64 -w 0 "$local_file" 2>/dev/null || base64 "$local_file")

  # Push update
  RESULT=$(curl -sf -X PUT \
    -H "$AUTH" \
    -H "Content-Type: application/json" \
    "${API}/${path}" \
    -d "{\"message\": \"${message}\", \"content\": \"${CONTENT}\", \"branch\": \"${BRANCH}\"${SHA_PARAM}}")

  COMMIT=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['commit']['sha'][:12])" 2>/dev/null || echo "unknown")
  echo "  ✅ Done — commit: ${COMMIT}"
}

echo "🔄 Updating existing files in ${REPO}..."

# sitemap.xml
update_file "sitemap.xml" \
  "${OUTPUT_DIR}/sitemap.xml" \
  "feat(seo): sitemap.xml — ymiroofing.com.au"

# README.md
update_file "README.md" \
  "/home/claude/ymi-delivery/README.md" \
  "docs: complete README with repo structure and quick start"

# .github/workflows/deploy.yml
update_file ".github/workflows/deploy.yml" \
  "${OUTPUT_DIR}/deploy.yml" \
  "ci: GitHub Actions auto-deploy to Cloudflare Pages"

echo ""
echo "✅ All done. Check: https://github.com/${REPO}"

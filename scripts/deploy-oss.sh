#!/usr/bin/env bash
# Deploy the production build of www.linkxcap.com to Alibaba Cloud OSS.
# See docs/16-阿里云OSS部署与上线.md and .claude/skills/deploy-oss/SKILL.md.
#
#   scripts/deploy-oss.sh                 build, back up, upload, verify
#   scripts/deploy-oss.sh --dry-run       build and show what would be uploaded
#   scripts/deploy-oss.sh --verify-only   only check the live site
#   scripts/deploy-oss.sh --prune --dry-run   list old files that would be removed
#   scripts/deploy-oss.sh --prune --yes       remove them (after a verified upload)
#
# Credentials are never handled here: run `ossutil config` yourself once.
set -euo pipefail

BUCKET="${OSS_BUCKET:-linkxcapital}"
SITE="${SITE_URL_PRODUCTION:-https://www.linkxcap.com}"
GOOGLE_FILE="googlea0e97b0ecf2a0a58.html"
EDITOR_PREFIX="a4f9c2e71b6d4830c5a8e2f94d7b136c"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"

DRY_RUN=0 VERIFY_ONLY=0 PRUNE=0 YES=0 SKIP_BUILD=0 SKIP_BACKUP=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --verify-only) VERIFY_ONLY=1 ;;
    --prune) PRUNE=1 ;;
    --yes) YES=1 ;;
    --skip-build) SKIP_BUILD=1 ;;
    --skip-backup) SKIP_BACKUP=1 ;;
    -h | --help) sed -n '2,11p' "$0"; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done

step() { printf '\n\033[1m== %s\033[0m\n' "$*"; }
fail() { printf '\033[31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }
oss() {
  if [ "$DRY_RUN" = 1 ]; then ossutil "$@" -n; else ossutil "$@"; fi
}

preflight() {
  step "Preflight"
  command -v ossutil >/dev/null || fail "ossutil is not installed (see SKILL.md)."
  ossutil version 2>&1 | grep -Eq '(^|[^0-9])2\.[0-9]+' ||
    fail "ossutil 2.x is required: $(ossutil version 2>&1 | head -1)"
  ossutil stat "oss://$BUCKET" >/dev/null 2>&1 ||
    fail "Cannot read oss://$BUCKET. Run 'ossutil config' (region cn-beijing) with a RAM user that can read/write this bucket."
  echo "ossutil $(ossutil version 2>&1 | head -1), bucket oss://$BUCKET reachable."
  if [ -n "$(git -C "$ROOT" status --porcelain)" ]; then
    echo "WARNING: uncommitted changes will be deployed:"
    git -C "$ROOT" status --short
  fi
  echo "Deploying commit $(git -C "$ROOT" log --oneline -1)"
}

build() {
  step "Production build"
  if [ "$SKIP_BUILD" = 0 ]; then (cd "$ROOT" && npm run build:production); fi
  [ -f "$DIST/index.html" ] || fail "dist/ is missing; build first."
  [ -f "$DIST/$GOOGLE_FILE" ] || fail "dist/$GOOGLE_FILE is missing (Search Console verification)."
  for file in 404.html robots.txt sitemap.xml llms.txt llms-full.txt; do
    [ -f "$DIST/$file" ] || fail "dist/$file is missing."
  done
  if find "$DIST" -name "$EDITOR_PREFIX*" | grep -q .; then
    fail "dist/ contains the content editor; this is not a production build."
  fi
  if grep -rlq --include='*.html' -e '/linkxcap/' -e 'github\.io' "$DIST/zh" "$DIST/en"; then
    fail "dist/ still points at the GitHub preview; run npm run build:production."
  fi
  grep -q "Sitemap: $SITE/sitemap.xml" "$DIST/robots.txt" ||
    fail "robots.txt does not point at $SITE."
  echo "dist/ is a production build for $SITE ($(find "$DIST" -type f | wc -l | tr -d ' ') files)."
}

backup() {
  if [ "$SKIP_BACKUP" = 1 ] || [ "$DRY_RUN" = 1 ]; then return 0; fi
  local dir="$ROOT/.cache/oss-backups/$(date +%Y%m%d-%H%M%S)"
  step "Backup oss://$BUCKET -> ${dir#$ROOT/}"
  mkdir -p "$dir"
  ossutil cp -r "oss://$BUCKET/" "$dir/" -f
  echo "Backup: $(find "$dir" -type f | wc -l | tr -d ' ') files. Versioning also keeps overwritten files for 30 days."
}

upload() {
  step "Upload to oss://$BUCKET$([ "$DRY_RUN" = 1 ] && echo ' (dry run)')"
  local long='public, max-age=31536000, immutable' day='public, max-age=86400'
  # Assets first, pages last: live pages never reference a file not yet there.
  for dir in _astro fonts; do
    if [ -d "$DIST/$dir" ]; then
      oss cp -r "$DIST/$dir/" "oss://$BUCKET/$dir/" -f --cache-control "$long"
    fi
  done
  for dir in assets company licenses; do
    if [ -d "$DIST/$dir" ]; then
      oss cp -r "$DIST/$dir/" "oss://$BUCKET/$dir/" -f --cache-control "$day"
    fi
  done
  for file in favicon.svg apple-touch-icon.png; do
    if [ -f "$DIST/$file" ]; then
      oss cp "$DIST/$file" "oss://$BUCKET/$file" -f --cache-control "$day"
    fi
  done
  for file in robots.txt llms.txt llms-full.txt; do
    oss cp "$DIST/$file" "oss://$BUCKET/$file" -f --cache-control no-cache \
      --content-type 'text/plain; charset=utf-8'
  done
  oss cp "$DIST/sitemap.xml" "oss://$BUCKET/sitemap.xml" -f --cache-control no-cache \
    --content-type 'application/xml; charset=utf-8'
  oss cp -r "$DIST/" "oss://$BUCKET/" --include '*.html' -f --cache-control no-cache \
    --content-type 'text/html; charset=utf-8'
}

# Live checks against the public site. Returns non-zero if any fails.
verify() {
  step "Verify $SITE"
  local failures=0 body=/tmp/deploy-oss-body
  ok() { printf '  \033[32mok\033[0m   %s\n' "$1"; }
  bad() { printf '  \033[31mFAIL\033[0m %s\n' "$1"; failures=$((failures + 1)); }
  # Status of a GET; the body is kept in $body.
  status() { curl -s --max-time 20 -o "$body" -w '%{http_code}' "$SITE$1" || true; }
  # The live file is byte-identical to the one in dist/.
  same() { [ -f "$DIST/$2" ] && curl -s --max-time 20 "$SITE$1" | cmp -s - "$DIST/$2"; }
  for page in zh/index.html en/index.html zh/portfolio.html en/team.html zh/fellowship.html en/insights.html; do
    if same "/$page" "$page"; then ok "/$page is the new build"; else bad "/$page is the new build"; fi
  done
  if same / index.html; then ok "/ is the new redirect page"; else bad "/ is the new redirect page"; fi
  if same /zh/ zh/index.html; then ok "/zh/ opens the Chinese home"
  else bad "/zh/ opens the Chinese home (static website: turn on sub-directory index)"; fi
  if same /en/ en/index.html; then ok "/en/ opens the English home"
  else bad "/en/ opens the English home (static website: turn on sub-directory index)"; fi
  if [ "$(status /zh/contact.html)" = 200 ] && grep -q 'url=/zh/fellowship.html' "$body"; then
    ok "/zh/contact.html forwards to Fellowship"
  else bad "/zh/contact.html forwards to Fellowship"; fi
  if [ "$(status /zh/deploy-check-missing.html)" = 404 ] && cmp -s "$body" "$DIST/404.html"; then
    ok "unknown pages return 404.html with status 404"
  else bad "unknown pages return 404.html with status 404 (static website: default 404 page 404.html)"; fi
  for file in robots.txt sitemap.xml llms.txt llms-full.txt "$GOOGLE_FILE"; do
    if same "/$file" "$file"; then ok "/$file is current"; else bad "/$file is current"; fi
  done
  if [ "$(status "/$EDITOR_PREFIX.html")" = 404 ]; then ok "content editor is not public"
  else bad "content editor is not public"; fi
  if curl -sI --max-time 20 "$SITE/zh/index.html" | grep -qi '^cache-control: no-cache'; then
    ok "HTML is served with Cache-Control: no-cache"
  else bad "HTML is served with Cache-Control: no-cache"; fi
  local asset
  asset=$(cd "$DIST" && ls _astro/*.css 2>/dev/null | head -1 || true)
  if [ -n "$asset" ] && curl -sI --max-time 20 "$SITE/$asset" | grep -qi 'immutable'; then
    ok "hashed assets are cached as immutable"
  else bad "hashed assets are cached as immutable"; fi
  if [ "$failures" -gt 0 ]; then
    echo "$failures check(s) failed."
    return 1
  fi
  echo "All checks passed."
}

prune() {
  step "Remove old files not in dist/$([ "$DRY_RUN" = 1 ] && echo ' (dry run)')"
  if [ "$DRY_RUN" = 0 ] && [ "$YES" = 0 ]; then
    fail "Pruning deletes files from oss://$BUCKET. Review '--prune --dry-run' first, then re-run with '--prune --yes'."
  fi
  oss sync "$DIST/" "oss://$BUCKET/" --delete -f
}

if [ "$VERIFY_ONLY" = 1 ]; then
  [ -f "$DIST/index.html" ] || fail "dist/ is missing; run npm run build:production first."
  verify
  exit $?
fi
preflight
build
if [ "$PRUNE" = 1 ]; then
  if [ "$DRY_RUN" = 0 ]; then verify || fail "Live checks failed; not removing anything."; fi
  prune
  if [ "$DRY_RUN" = 0 ]; then verify; fi
  exit 0
fi
backup
upload
if [ "$DRY_RUN" = 1 ]; then
  echo
  echo "Dry run complete; nothing was changed."
  exit 0
fi
verify

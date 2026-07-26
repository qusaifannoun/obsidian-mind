#!/usr/bin/env bash
# setup-agents.sh — install the CLI agents + supporting tools for the Loom.
# Usage:
#   ./setup-agents.sh                  # interactive picker
#   ./setup-agents.sh claude codex     # non-interactive
#   ./setup-agents.sh all
set -euo pipefail

PKG_CLAUDE="@anthropic-ai/claude-code"
PKG_CODEX="@openai/codex"
PKG_GEMINI="@google/gemini-cli"

info()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn()  { printf '\033[1;33m!!\033[0m %s\n' "$*"; }
die()   { printf '\033[1;31mxx\033[0m %s\n' "$*" >&2; exit 1; }

# ---------- prerequisites ----------
command -v node >/dev/null || die "Node.js not found. Install Node 18+ first (https://nodejs.org)."
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 18 ] || die "Node 18+ required, found $(node -v)."

command -v git >/dev/null || die "git not found. Required for worktree isolation."
command -v jq  >/dev/null || warn "jq not found — needed to parse 'codex exec --json' output. brew/apt install jq."

# Pick a package manager. pnpm is fine but global installs of CLIs are simplest with npm.
PM="npm"
command -v pnpm >/dev/null && PM="${AGENT_PM:-npm}"   # set AGENT_PM=pnpm to override

# Never sudo a global install — it creates root-owned files in your npm tree.
if [ "$PM" = "npm" ] && [ -z "$(npm config get prefix | grep -v '^/usr' || true)" ]; then
  warn "npm global prefix is system-owned. Recommended:"
  warn "  npm config set prefix ~/.npm-global && export PATH=\"\$HOME/.npm-global/bin:\$PATH\""
fi

install_pkg() {
  local pkg="$1"
  info "Installing $pkg via $PM"
  case "$PM" in
    npm)  npm install -g "$pkg" ;;
    pnpm) pnpm add -g "$pkg" ;;
    *)    die "Unsupported package manager: $PM" ;;
  esac
}

# ---------- selection ----------
SELECTED=()
if [ "$#" -gt 0 ]; then
  if [ "$1" = "all" ]; then SELECTED=(claude codex gemini); else SELECTED=("$@"); fi
else
  echo "Which agents do you want? (space-separated numbers, e.g. '1 2')"
  echo "  1) claude   2) codex   3) gemini"
  read -r -p "> " picks
  for p in $picks; do
    case "$p" in
      1) SELECTED+=(claude) ;;
      2) SELECTED+=(codex) ;;
      3) SELECTED+=(gemini) ;;
      *) warn "ignoring '$p'" ;;
    esac
  done
fi

[ "${#SELECTED[@]}" -gt 0 ] || die "Nothing selected."

for agent in "${SELECTED[@]}"; do
  case "$agent" in
    claude) install_pkg "$PKG_CLAUDE" ;;
    codex)  install_pkg "$PKG_CODEX" ;;
    gemini) install_pkg "$PKG_GEMINI" ;;
    *)      warn "unknown agent: $agent" ;;
  esac
done

# ---------- verify ----------
info "Verifying binaries on PATH"
for agent in "${SELECTED[@]}"; do
  case "$agent" in
    claude) command -v claude >/dev/null && claude --version || warn "claude not on PATH" ;;
    codex)  command -v codex  >/dev/null && codex  --version || warn "codex not on PATH" ;;
    gemini) command -v gemini >/dev/null && gemini --version || warn "gemini not on PATH" ;;
  esac
done

# ---------- auth: MANUAL, cannot be scripted ----------
cat <<'EOF'

------------------------------------------------------------
Installed. Authentication is interactive — run these yourself:

  claude          # first run opens a browser to link your Anthropic account
  codex           # first run prompts sign-in (ChatGPT plan or OPENAI_API_KEY)
  gemini          # first run starts Google OAuth

Then sanity-check the delegation loop:

  git worktree add ../wt-test -b feat/test
  cd ../wt-test
  codex -a never -s workspace-write exec "Print the repo structure." -o report.md
------------------------------------------------------------
EOF

#!/usr/bin/env bash
# Shared helpers sourced by the other scripts — do not run directly.

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*"; }
die()     { error "$*"; exit 1; }
header()  { echo -e "\n${BOLD}${CYAN}$*${RESET}"; }

# ── Resolve project root (directory that contains this scripts/ folder) ───────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# ── Require a command to exist ────────────────────────────────────────────────
require_cmd() {
    command -v "$1" &>/dev/null || die "'$1' is required but not found. $2"
}

# ── Read a value from .env (returns empty string if missing) ──────────────────
read_env() {
    local key="$1"
    local default="${2:-}"
    local val
    val=$(grep -E "^${key}=" "${PROJECT_ROOT}/.env" 2>/dev/null | cut -d= -f2- | tr -d '[:space:]')
    echo "${val:-$default}"
}

# ── Check Node.js version >= N ────────────────────────────────────────────────
check_node_version() {
    local required="${1:-16}"
    require_cmd node "Install Node.js >= ${required} from https://nodejs.org or via nvm: https://github.com/nvm-sh/nvm"
    local node_ver
    node_ver=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
    if (( node_ver < required )); then
        die "Node.js v${required}+ is required, but found v$(node -v). Update via nvm or https://nodejs.org"
    fi
    success "Node.js $(node -v)"
}

# ── Open a URL in the default browser (macOS / Linux) ─────────────────────────
open_browser() {
    local url="$1"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open "$url" 2>/dev/null || true
    else
        xdg-open "$url" 2>/dev/null || true
    fi
}

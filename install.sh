#!/usr/bin/env bash
# install.sh — Install all dependencies and create .env for pm2-admin.
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/scripts/_common.sh"

header "pm2-admin — Install"

# ── 1. Prerequisites ──────────────────────────────────────────────────────────
info "Checking prerequisites..."
check_node_version 16
require_cmd npm "Comes with Node.js — see https://nodejs.org"
require_cmd git "Install Git from https://git-scm.com"

if ! command -v pm2 &>/dev/null; then
    warn "PM2 not found. Installing globally..."
    npm install -g pm2
    success "PM2 installed: $(pm2 -v)"
else
    success "PM2 $(pm2 -v)"
fi

# build-essentials check (needed by better-sqlite3 native addon)
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    if ! command -v make &>/dev/null || ! command -v g++ &>/dev/null; then
        warn "Native build tools (make, g++) not found."
        warn "On Debian/Ubuntu:  sudo apt install -y build-essential python3"
        warn "On RHEL/CentOS:    sudo yum groupinstall 'Development Tools'"
        warn "Installation may fail without them. Press Ctrl-C to abort or Enter to continue."
        read -r
    fi
fi

# ── 2. Backend dependencies ───────────────────────────────────────────────────
header "Installing backend dependencies..."
cd "${PROJECT_ROOT}"
npm install
success "Backend dependencies installed."

# ── 3. Frontend dependencies ──────────────────────────────────────────────────
header "Installing frontend dependencies..."
cd "${PROJECT_ROOT}/src/frontend"
npm install
success "Frontend dependencies installed."

# ── 4. Environment file ───────────────────────────────────────────────────────
cd "${PROJECT_ROOT}"
if [[ ! -f ".env" ]]; then
    cp .env.example .env
    success ".env created from .env.example — edit it to configure HOST, PORT, and APP_SESSION_SECRET."
else
    info ".env already exists — skipping."
fi

echo ""
success "Installation complete!"
echo -e "  Next steps:"
echo -e "  1. Edit ${BOLD}.env${RESET} if needed"
echo -e "  2. Run ${BOLD}./build.sh${RESET} to build the frontend"
echo -e "  3. Run ${BOLD}./start.sh${RESET} (dev) or ${BOLD}./install-pm2-prd.sh${RESET} (production)"
echo ""
